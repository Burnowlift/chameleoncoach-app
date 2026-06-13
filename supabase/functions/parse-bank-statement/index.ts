import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { requireCoach } from "../_shared/coach-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Inter -> pessoal | Nubank -> empresa
const BANK_SCOPE: Record<string, "empresa" | "pessoal"> = {
  inter: "pessoal",
  nubank: "empresa",
};

const DATE_PATTERN = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)\b/;
const MONEY_PATTERN = /(?:R\$\s*)?-?\d{1,3}(?:\.\d{3})*,\d{2}\b|(?:R\$\s*)?-?\d+,\d{2}\b/;
const TRANSACTION_HINT_PATTERN = /pix|ted|doc|boleto|cart[aã]o|compra|pagamento|transfer|transf|dep[oó]sito|saque|receb|envio|agendamento|estorno|tarifa|investimento|aplica[cç][aã]o|resgate/i;
const NOISE_LINE_PATTERN = /saldo(?:\s+anterior|\s+do\s+dia|\s+dispon[ií]vel|\s+em\s+conta)?|total(?:\s+de)?\s+(?:entradas|sa[ií]das)|extrato|per[ií]odo|ag[êe]ncia|conta|cliente|p[aá]gina|cpf|cnpj|canal|data\s+lan[çc]amento|descri[çc][aã]o|valor/i;
const DEFAULT_CHUNK_SIZE = 3200;
const MIN_CHUNK_SIZE = 1200;
const MAX_TOTAL_TEXT_FOR_AI = 18000;

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id?: string | null;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function extractPdfText(b64: string): Promise<string> {
  try {
    const data = base64ToUint8Array(b64);
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    const result = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    return result.trim();
  } catch (e) {
    console.error("pdf extract failed:", e);
    return "";
  }
}

function normalizeStatementText(text: string): string {
  return String(text)
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lineHasDate(line: string): boolean {
  return DATE_PATTERN.test(line);
}

function lineHasAmount(line: string): boolean {
  return MONEY_PATTERN.test(line);
}

function isNoiseLine(line: string): boolean {
  return NOISE_LINE_PATTERN.test(line.toLowerCase());
}

function prepareTextForAi(text: string): { text: string; originalLength: number; preparedLength: number; mode: "filtered" | "full" } {
  const normalized = normalizeStatementText(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;

    const prev = lines[i - 1] ?? "";
    const next = lines[i + 1] ?? "";
    const next2 = lines[i + 2] ?? "";

    const hasDateNear = [prev, line, next, next2].some(lineHasDate);
    const hasAmountNear = [prev, line, next, next2].some(lineHasAmount);
    const hasHint = TRANSACTION_HINT_PATTERN.test(line);

    if ((hasDateNear && hasAmountNear) || (lineHasDate(line) && hasHint) || (lineHasAmount(line) && hasHint)) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
        if (!isNoiseLine(lines[j])) keep.add(j);
      }
    }
  }

  const filtered = Array.from(keep)
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .join("\n")
    .trim();

  if (filtered.length >= 500 && filtered.length < normalized.length) {
    return {
      text: filtered,
      originalLength: normalized.length,
      preparedLength: filtered.length,
      mode: "filtered",
    };
  }

  return {
    text: normalized,
    originalLength: normalized.length,
    preparedLength: normalized.length,
    mode: "full",
  };
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (line.length <= maxChars) {
      current = line;
      continue;
    }

    for (let i = 0; i < line.length; i += maxChars) {
      chunks.push(line.slice(i, i + maxChars));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}

function clampPreparedText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  let result = "";

  for (const line of lines) {
    const candidate = result ? `${result}\n${line}` : line;
    if (candidate.length > maxChars) break;
    result = candidate;
  }

  return result || text.slice(0, maxChars);
}

function dedupeTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return transactions.filter((tx) => {
    const key = [
      tx.date,
      Math.abs(Number(tx.amount || 0)).toFixed(2),
      tx.type,
      String(tx.description ?? "").toLowerCase().replace(/\s+/g, " ").trim(),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function callAiChunk(params: {
  apiKey: string;
  systemPrompt: string;
  chunkText: string;
  fileName: string;
  chunkIndex: number;
  chunkCount: number;
}): Promise<ParsedTransaction[]> {
  const { apiKey, systemPrompt, chunkText, fileName, chunkIndex, chunkCount } = params;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Trecho ${chunkIndex + 1} de ${chunkCount} do extrato (${fileName}). Extraia TODAS as transações reais visíveis neste trecho.\n\n${chunkText}`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_transactions",
            description: "Envia a lista completa de transações extraídas do trecho do extrato.",
            parameters: {
              type: "object",
              properties: {
                transactions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", description: "AAAA-MM-DD" },
                      description: { type: "string" },
                      amount: { type: "number" },
                      type: { type: "string", enum: ["income", "expense"] },
                      category_id: { type: ["string", "null"] },
                    },
                    required: ["date", "description", "amount", "type"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["transactions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_transactions" } },
    }),
  });

  if (!aiResp.ok) {
    if (aiResp.status === 429) throw new HttpError(429, "Limite de requisições atingido.");
    if (aiResp.status === 402) throw new HttpError(402, "Créditos esgotados. Adicione fundos em Settings > Workspace > Usage.");
    const t = await aiResp.text();
    console.error("AI error:", aiResp.status, t);
    throw new HttpError(500, "Erro no AI Gateway");
  }

  const aiData = await aiResp.json();
  if (aiData?.error?.code === 524) {
    throw new HttpError(504, "A IA demorou demais para processar este trecho do extrato.");
  }

  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("IA não retornou tool_call. Resposta:", JSON.stringify(aiData).slice(0, 800));
    throw new HttpError(422, "A IA não conseguiu extrair transações deste trecho do arquivo.");
  }

  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    return (parsed.transactions ?? []) as ParsedTransaction[];
  } catch (e) {
    console.error("Erro ao parsear arguments:", e, toolCall.function.arguments?.slice(0, 500));
    throw new HttpError(500, "Resposta inválida da IA. Tente novamente.");
  }
}

async function extractTransactionsFromText(params: {
  apiKey: string;
  systemPrompt: string;
  preparedText: string;
  fileName: string;
  chunkSize?: number;
}): Promise<ParsedTransaction[]> {
  const { apiKey, systemPrompt, preparedText, fileName, chunkSize = DEFAULT_CHUNK_SIZE } = params;
  const chunks = splitTextIntoChunks(preparedText, chunkSize);
  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const extracted = await callAiChunk({
        apiKey,
        systemPrompt,
        chunkText: chunk,
        fileName,
        chunkIndex: i,
        chunkCount: chunks.length,
      });
      transactions.push(...extracted);
    } catch (error) {
      const canRetrySmaller = error instanceof HttpError && error.status === 504 && chunk.length > MIN_CHUNK_SIZE && chunkSize > MIN_CHUNK_SIZE;
      if (!canRetrySmaller) throw error;

      console.log(`[parse-bank-statement] retry chunk ${i + 1}/${chunks.length} com tamanho menor (${chunk.length} chars)`);
      const smaller = await extractTransactionsFromText({
        apiKey,
        systemPrompt,
        preparedText: chunk,
        fileName,
        chunkSize: Math.max(MIN_CHUNK_SIZE, Math.floor(chunkSize / 2)),
      });
      transactions.push(...smaller);
    }
  }

  return dedupeTransactions(transactions);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Somente treinadores podem importar extratos.
    const auth = await requireCoach(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new HttpError(500, "LOVABLE_API_KEY não configurado");

    let payload: any;
    try {
      const raw = await req.text();
      if (!raw) throw new Error("empty body");
      payload = JSON.parse(raw);
    } catch (e) {
      console.error("Invalid JSON body:", e);
      throw new HttpError(400, "Corpo da requisição inválido ou vazio.");
    }
    const { bank, fileName, fileBase64, mimeType, textContent } = payload;

    const scope = BANK_SCOPE[bank];
    if (!scope) {
      throw new HttpError(400, "Banco não suportado. Use 'inter' ou 'nubank'.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar categorias do escopo (income e expense)
    const { data: cats } = await supabase
      .from("finance_categories")
      .select("id, name, type, scope")
      .eq("scope", scope);

    const categoryList = (cats ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    }));

    const systemPrompt = `Você é um extrator preciso de transações bancárias de extratos brasileiros (banco ${bank.toUpperCase()}).

Extraia TODAS as transações reais do extrato (ignore saldo, totais, cabeçalhos).

Para cada transação, devolva:
- date: AAAA-MM-DD
- description: descrição limpa, curta
- amount: valor positivo absoluto (number)
- type: "income" (entrada/crédito) ou "expense" (saída/débito)
- category_id: escolha o id MAIS adequado da lista de categorias abaixo (do tipo correspondente). Se nenhuma servir, use null.

CATEGORIAS DISPONÍVEIS (escopo: ${scope}):
${JSON.stringify(categoryList, null, 2)}

Retorne APENAS via tool call, sem texto extra.`;

    const userParts: any[] = [];
    let effectiveText = textContent as string | undefined;

    // Se for PDF, extrai texto server-side antes (muito mais rápido que OCR via vision)
    if (!effectiveText && fileBase64 && (mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf"))) {
      console.log(`[parse-bank-statement] extraindo texto do PDF ${fileName}...`);
      const extracted = await extractPdfText(fileBase64);
      const letters = (extracted.match(/[a-zA-Z]/g) || []).length;
      if (extracted && letters > 100) {
        effectiveText = extracted;
        console.log(`[parse-bank-statement] PDF texto extraído: ${extracted.length} chars, ${letters} letras`);
      } else {
        console.log(`[parse-bank-statement] PDF parece escaneado (${extracted.length} chars, ${letters} letras)`);
        throw new HttpError(422, "Não foi possível extrair texto deste PDF (parece ser escaneado/imagem). Exporte o extrato em CSV ou OFX no app do banco e tente novamente.");
      }
    }

    let preparedText = "";
    if (effectiveText) {
      const prepared = prepareTextForAi(String(effectiveText).slice(0, 200_000));
      preparedText = clampPreparedText(prepared.text, MAX_TOTAL_TEXT_FOR_AI);
      console.log(
        `[parse-bank-statement] texto preparado (${prepared.mode}): ${preparedText.length}/${prepared.originalLength} chars`,
      );
    } else if (fileBase64 && mimeType) {
      userParts.push({ type: "text", text: `Extrato em anexo (${fileName}). Extraia TODAS as transações reais.` });
      userParts.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    } else {
      throw new HttpError(400, "Nenhum conteúdo enviado.");
    }

    console.log(`[parse-bank-statement] bank=${bank} file=${fileName} mode=${effectiveText ? "text" : "binary"} size=${preparedText ? preparedText.length : (fileBase64?.length ?? 0)}`);

    const transactions = (effectiveText
      ? await extractTransactionsFromText({
          apiKey: LOVABLE_API_KEY,
          systemPrompt,
          preparedText,
          fileName,
        })
      : await callAiChunk({
          apiKey: LOVABLE_API_KEY,
          systemPrompt,
          chunkText: userParts.map((part) => part.text ?? "").join("\n\n"),
          fileName,
          chunkIndex: 0,
          chunkCount: 1,
        })
    )
      .map((t: any) => {
        const rawDate = String(t.date ?? "").trim();
        // Pega apenas o primeiro YYYY-MM-DD encontrado, descartando lixo concatenado pela IA
        const isoMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
        let date = isoMatch ? isoMatch[0] : "";
        if (!date) {
          // Tenta DD/MM/YYYY
          const br = rawDate.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
          if (br) {
            const d = br[1].padStart(2, "0");
            const m = br[2].padStart(2, "0");
            const y = br[3].length === 2 ? `20${br[3]}` : br[3];
            date = `${y}-${m}-${d}`;
          }
        }
        return {
          ...t,
          date,
          scope,
          amount: Math.abs(Number(t.amount)),
        };
      })
      .filter((t: any) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && Number.isFinite(t.amount) && t.amount > 0);

    console.log(`[parse-bank-statement] ok: ${transactions.length} transações (${scope})`);

    return new Response(JSON.stringify({ scope, transactions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-bank-statement error:", e);
    if (e instanceof HttpError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
