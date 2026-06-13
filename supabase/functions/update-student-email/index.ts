import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCoach } from "../_shared/coach-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireCoach(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const { studentId, email } = await req.json();
    if (!studentId || !email) {
      return json({ error: "studentId e email são obrigatórios" }, 400);
    }
    const newEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return json({ error: "E-mail inválido." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, email")
      .eq("id", studentId)
      .maybeSingle();

    if (studentErr) return json({ error: `Erro ao buscar aluno: ${studentErr.message}` }, 400);
    if (!student) return json({ error: "Aluno não encontrado." }, 404);
    if (!student.user_id) {
      return json({ success: false, error: "Aluno sem login.", code: "no_login" });
    }

    // Atualiza e-mail de login (já confirmado).
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      student.user_id as string,
      { email: newEmail, email_confirm: true }
    );

    if (updErr) {
      const msg = (updErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return json({
          success: false,
          error: "Esse e-mail já está em uso por outra conta.",
          code: "email_in_use",
        }, 409);
      }
      return json({ error: `Falha ao atualizar e-mail: ${updErr.message}` }, 500);
    }

    // Sincroniza o cadastro do aluno também.
    await supabaseAdmin
      .from("students")
      .update({ email: newEmail })
      .eq("id", studentId);

    return json({ success: true }, 200);
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
