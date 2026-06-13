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

    const { studentId, password } = await req.json();

    if (!studentId || !password) {
      return json({ error: "studentId e password são obrigatórios" }, 400);
    }
    if (typeof password !== "string" || password.length < 6) {
      return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
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
      return json({
        success: false,
        error: "Este aluno ainda não tem login. Use 'Criar acesso' antes.",
        code: "no_login",
      });
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      student.user_id as string,
      { password, email_confirm: true }
    );

    if (updErr) {
      const msg = (updErr.message || "").toLowerCase();
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("breach") || msg.includes("compromis")) {
        return json({
          success: false,
          error: "Essa senha aparece em vazamentos conhecidos ou é muito fraca. Escolha uma senha mais forte.",
          code: "weak_password",
        });
      }
      return json({ error: `Falha ao redefinir senha: ${updErr.message}` }, 500);
    }

    // Auditoria: registra quem redefiniu e quando (não bloqueia em caso de falha).
    try {
      const { data: coachRow } = await supabaseAdmin
        .from("coaches")
        .select("id")
        .ilike("email", auth.email)
        .maybeSingle();

      await supabaseAdmin.from("student_password_reset_audit").insert({
        student_id: studentId,
        coach_id: coachRow?.id ?? null,
        coach_email: auth.email,
      });
    } catch (auditErr) {
      console.error("[reset-student-password] Falha ao registrar auditoria:", auditErr);
    }

    return json({ success: true }, 200);
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
