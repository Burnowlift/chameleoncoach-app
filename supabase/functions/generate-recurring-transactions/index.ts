import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCoach } from "../_shared/coach-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Apenas treinadores autenticados podem disparar a geração de recorrências.
    const auth = await requireCoach(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDay = today.getDate();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    const { data: recurrences, error } = await supabase
      .from("finance_recurrences")
      .select("*")
      .eq("active", true)
      .lte("start_date", todayStr);

    if (error) throw error;

    let created = 0;
    for (const r of recurrences ?? []) {
      if (r.end_date && r.end_date < todayStr) continue;
      if (r.day_of_month > currentDay) continue;
      // já gerou neste mês?
      if (r.last_generated_date && r.last_generated_date >= monthStart) continue;

      // Data alvo: usa o dia da recorrência no mês atual (ou último dia do mês se exceder)
      const targetDay = Math.min(r.day_of_month, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
      const targetDate = new Date(today.getFullYear(), today.getMonth(), targetDay).toISOString().split("T")[0];

      const { error: insErr } = await supabase.from("finance_transactions").insert({
        scope: r.scope,
        type: r.type,
        category_id: r.category_id,
        amount: r.amount,
        description: r.description,
        date: targetDate,
        recurrence_id: r.id,
      });
      if (insErr) {
        console.error("insert error", insErr);
        continue;
      }
      await supabase.from("finance_recurrences").update({ last_generated_date: todayStr }).eq("id", r.id);
      created++;
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
