import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCoach } from "../_shared/coach-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Apenas treinadores podem usar o consultor financeiro.
    const auth = await requireCoach(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar contexto financeiro dos últimos 90 dias
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().split("T")[0];

    const [{ data: txs }, { data: cats }, { data: goals }] = await Promise.all([
      supabase.from("finance_transactions").select("*").gte("date", sinceStr),
      supabase.from("finance_categories").select("*"),
      supabase.from("finance_goals").select("*"),
    ]);

    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c]));

    const summarize = (scope: string) => {
      const filtered = (txs ?? []).filter((t: any) => t.scope === scope);
      const income = filtered.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const expense = filtered.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const byCategory: Record<string, number> = {};
      filtered.filter((t: any) => t.type === "expense").forEach((t: any) => {
        const name = catMap.get(t.category_id)?.name ?? "Sem categoria";
        byCategory[name] = (byCategory[name] || 0) + Number(t.amount);
      });
      return { income, expense, balance: income - expense, byCategory };
    };

    const context = {
      periodo: "últimos 90 dias",
      empresa: summarize("empresa"),
      pessoal: summarize("pessoal"),
      metas: (goals ?? []).map((g: any) => ({
        nome: g.name,
        progresso: `${((g.current_amount / g.target_amount) * 100).toFixed(1)}%`,
        atual: g.current_amount,
        meta: g.target_amount,
        prazo: g.deadline,
      })),
    };

    const systemPrompt = `Você é um consultor financeiro especializado em ajudar treinadores autônomos a separar finanças da empresa e pessoais, controlar gastos e atingir metas de economia.

Use SEMPRE os dados reais abaixo do usuário para dar conselhos personalizados em português brasileiro. Seja direto, prático e amigável. Quando sugerir economia, mencione valores e categorias específicas dos dados.

DADOS FINANCEIROS DO USUÁRIO:
${JSON.stringify(context, null, 2)}

Formate respostas com markdown leve (negrito, listas) quando ajudar a leitura.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos em Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no AI Gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("finance-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
