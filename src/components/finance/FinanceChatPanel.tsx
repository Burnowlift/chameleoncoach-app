import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Send, Sparkles, Paperclip, Loader2, Building2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceCategories } from "@/hooks/useFinances";

type Msg = { role: "user" | "assistant"; content: string };
type ParsedTx = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  scope: "empresa" | "pessoal";
  duplicate?: boolean;
  duplicateReason?: "db" | "file";
};

// Normaliza descrição p/ comparar (minúsculas, sem acentos, sem pontuação, espaços colapsados)
const normDesc = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const dedupeKey = (t: { date: string; amount: number; type: string; scope: string; description: string }) =>
  `${t.scope}|${t.type}|${t.date}|${Number(t.amount).toFixed(2)}|${normDesc(t.description)}`;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finance-chat`;

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export function FinanceChatPanel() {
  const { data: categories = [] } = useFinanceCategories();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou seu consultor financeiro. Posso analisar seus gastos e também **ler extratos bancários**: anexe um PDF/CSV/OFX do **Inter** (vai pra aba Pessoal) ou do **Nubank** (vai pra aba Empresa) usando o ícone 📎 abaixo.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bankToUpload, setBankToUpload] = useState<"inter" | "nubank" | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTxs, setPreviewTxs] = useState<ParsedTx[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [previewBank, setPreviewBank] = useState<"inter" | "nubank">("inter");
  const [importing, setImporting] = useState(false);
  const [dupMode, setDupMode] = useState<"ignore" | "force">("ignore");

  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > next.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) { toast.error("Muitas requisições. Aguarde alguns segundos."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("Créditos esgotados na workspace."); setLoading(false); return; }
      if (!resp.ok || !resp.body) { toast.error("Erro ao conversar com a IA."); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = (bank: "inter" | "nubank") => {
    setBankToUpload(bank);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !bankToUpload) return;

    const bank = bankToUpload;
    const targetScope = bank === "inter" ? "pessoal" : "empresa";
    setBankToUpload(null);
    setParsing(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📎 Anexei o extrato **${bank.toUpperCase()}** (${file.name}) — escopo **${targetScope}**.` },
    ]);

    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isText = ["csv", "ofx", "txt"].includes(ext) || file.type.startsWith("text/");

      const body: any = { bank, fileName: file.name };
      if (isText) {
        body.textContent = await file.text();
      } else {
        body.fileBase64 = await fileToBase64(file);
        body.mimeType = file.type || "application/pdf";
      }

      const { data, error } = await supabase.functions.invoke("parse-bank-statement", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const txs: ParsedTx[] = data.transactions ?? [];
      if (txs.length === 0) {
        toast.warning("Nenhuma transação foi identificada no extrato.");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Não consegui identificar transações nesse arquivo. Tente outro formato ou um arquivo mais legível." },
        ]);
        return;
      }

      // Buscar lançamentos existentes do mesmo escopo no intervalo de datas do extrato
      const dates = txs.map((t) => t.date).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      const { data: existing } = await supabase
        .from("finance_transactions")
        .select("date, amount, type, scope, description")
        .eq("scope", targetScope)
        .gte("date", minDate)
        .lte("date", maxDate);

      const existingKeys = new Set((existing ?? []).map((e: any) => dedupeKey(e)));

      // Marcar duplicatas (BD ou repetidas dentro do próprio arquivo)
      const seenInFile = new Set<string>();
      const flagged: ParsedTx[] = txs.map((t) => {
        const key = dedupeKey(t);
        let duplicate = false;
        let reason: "db" | "file" | undefined;
        if (existingKeys.has(key)) { duplicate = true; reason = "db"; }
        else if (seenInFile.has(key)) { duplicate = true; reason = "file"; }
        seenInFile.add(key);
        return { ...t, duplicate, duplicateReason: reason };
      });

      const dupCount = flagged.filter((t) => t.duplicate).length;

      setPreviewTxs(flagged);
      setPreviewBank(bank);
      // Desmarcar duplicatas por padrão
      setSelected(Object.fromEntries(flagged.map((t, i) => [i, !t.duplicate])));
      setPreviewOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `Identifiquei **${flagged.length} transações** no extrato` +
            (dupCount > 0
              ? `, sendo **${dupCount} possíveis duplicatas** (já desmarcadas).`
              : ".") +
            ` Revise a prévia e confirme as que devem ser lançadas em **${targetScope}**.`,
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao ler o extrato.");
    } finally {
      setParsing(false);
    }
  };

  const importSelected = async () => {
    const toImport = previewTxs.filter((_, i) => selected[i]);
    if (toImport.length === 0) {
      toast.warning("Selecione ao menos uma transação.");
      return;
    }
    setImporting(true);
    try {
      let finalRows: typeof toImport = toImport;
      let skipped = 0;

      if (dupMode === "ignore") {
        // Re-checagem contra duplicatas no momento do envio
        const dates = toImport.map((t) => t.date).sort();
        const { data: existing } = await supabase
          .from("finance_transactions")
          .select("date, amount, type, scope, description")
          .eq("scope", previewBank === "inter" ? "pessoal" : "empresa")
          .gte("date", dates[0])
          .lte("date", dates[dates.length - 1]);
        const existingKeys = new Set((existing ?? []).map((e: any) => dedupeKey(e)));

        const seen = new Set<string>();
        const filtered: typeof toImport = [];
        for (const t of toImport) {
          const key = dedupeKey(t);
          if (existingKeys.has(key) || seen.has(key)) { skipped++; continue; }
          seen.add(key);
          filtered.push(t);
        }
        finalRows = filtered;
      }

      if (finalRows.length === 0) {
        toast.warning("Todas as selecionadas já estavam lançadas. Nada foi importado.");
        setImporting(false);
        return;
      }

      const rows = finalRows.map((t) => ({
        scope: t.scope,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date,
        category_id: t.category_id,
      }));
      const { error } = await supabase.from("finance_transactions").insert(rows);
      if (error) throw error;
      toast.success(
        `${rows.length} lançamento(s) importado(s)` +
          (dupMode === "ignore" && skipped > 0 ? ` — ${skipped} duplicata(s) ignorada(s).` : ".") +
          (dupMode === "force" ? " (modo forçar duplicatas)" : "")
      );
      setPreviewOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `✅ Importei **${rows.length} lançamentos** do ${previewBank.toUpperCase()} para a aba **${previewBank === "inter" ? "Pessoal" : "Empresa"}**` +
            (dupMode === "ignore" && skipped > 0 ? ` (ignorei **${skipped} duplicata(s)**).` : ".") +
            (dupMode === "force" ? " — modo **forçar duplicatas** ativo." : ""),
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar.");
    } finally {
      setImporting(false);
    }
  };

  const catName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? "Sem categoria" : "Sem categoria";

  const totalSelected = previewTxs.reduce(
    (acc, t, i) => {
      if (!selected[i]) return acc;
      if (t.type === "income") acc.inc += t.amount;
      else acc.exp += t.amount;
      return acc;
    },
    { inc: 0, exp: 0 }
  );

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Assistente Financeiro IA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1">
                  <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {parsing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Lendo extrato com IA...
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("inter")} disabled={parsing}>
            <Paperclip className="h-3.5 w-3.5 mr-1" /> Extrato Inter
            <Badge variant="secondary" className="ml-2 text-[10px]"><User className="h-3 w-3 mr-0.5" />Pessoal</Badge>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("nubank")} disabled={parsing}>
            <Paperclip className="h-3.5 w-3.5 mr-1" /> Extrato Nubank
            <Badge variant="secondary" className="ml-2 text-[10px]"><Building2 className="h-3 w-3 mr-0.5" />Empresa</Badge>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.ofx,.txt,application/pdf,text/csv,text/plain"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex gap-2 mt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Pergunte sobre suas finanças..."
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Prévia das transações — {previewBank.toUpperCase()}
              <Badge variant={previewBank === "inter" ? "default" : "secondary"}>
                {previewBank === "inter" ? "Pessoal" : "Empresa"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr className="text-left">
                  <th className="p-2 w-8">
                    <Checkbox
                      checked={previewTxs.length > 0 && previewTxs.every((_, i) => selected[i])}
                      onCheckedChange={(v) => {
                        const all = !!v;
                        setSelected(Object.fromEntries(previewTxs.map((_, i) => [i, all])));
                      }}
                    />
                  </th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2">Categoria</th>
                  <th className="p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {previewTxs.map((t, i) => (
                  <tr key={i} className={`border-t ${t.duplicate ? "bg-amber-500/10" : ""}`}>
                    <td className="p-2">
                      <Checkbox
                        checked={!!selected[i]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))}
                      />
                    </td>
                    <td className="p-2 tabular-nums whitespace-nowrap">{t.date}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span>{t.description}</span>
                        {t.duplicate && (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                            {t.duplicateReason === "db" ? "Já lançada" : "Repetida no arquivo"}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{catName(t.category_id)}</td>
                    <td className={`p-2 text-right font-mono tabular-nums ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                      {t.type === "income" ? "+" : "-"}{fmtBRL(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm pt-2">
            <span className="text-muted-foreground">
              {Object.values(selected).filter(Boolean).length} de {previewTxs.length} selecionadas
            </span>
            <span className="space-x-3">
              <span className="text-emerald-500 font-mono">+{fmtBRL(totalSelected.inc)}</span>
              <span className="text-rose-500 font-mono">-{fmtBRL(totalSelected.exp)}</span>
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Duplicatas:</span>
              <Select value={dupMode} onValueChange={(v) => setDupMode(v as "ignore" | "force")}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ignore">Ignorar duplicatas</SelectItem>
                  <SelectItem value="force">Forçar importar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={importSelected} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Lançar selecionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
