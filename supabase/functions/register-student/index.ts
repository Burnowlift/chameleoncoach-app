import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Edge Function PÚBLICA (sem requireCoach) para autocadastro de alunos.
 * O aluno se registra via link exclusivo do treinador: ?coach=<coach_id>
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { name, email, password, phone, cpf, coachId, acceptedTerms, sex } = await req.json();

    // ── Validações ──────────────────────────────────────────
    if (!name?.trim()) return json({ error: "Nome é obrigatório." }, 400);
    if (!email?.trim()) return json({ error: "E-mail é obrigatório." }, 400);
    if (!password || password.length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres, com letras e números." }, 400);
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return json({ error: "A senha precisa ter letras e números." }, 400);
    }
    if (!cpf?.trim()) return json({ error: "CPF é obrigatório." }, 400);
    if (!phone?.trim()) return json({ error: "Telefone é obrigatório." }, 400);
    if (!sex || (sex !== "M" && sex !== "F")) return json({ error: "Sexo biológico é obrigatório." }, 400);
    if (!coachId?.trim()) return json({ error: "Link de cadastro inválido (treinador não identificado)." }, 400);
    if (!acceptedTerms) return json({ error: "Você precisa aceitar os termos para continuar." }, 400);

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCpf = cpf.replace(/\D/g, "");

    // CPF: 11 dígitos
    if (cleanCpf.length !== 11) {
      return json({ error: "CPF deve conter 11 dígitos." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Verificar se o coach existe ─────────────────────────
    const { data: coach, error: coachErr } = await supabaseAdmin
      .from("coaches")
      .select("id, name")
      .eq("id", coachId)
      .maybeSingle();

    if (coachErr || !coach) {
      return json({ error: "Treinador não encontrado. Verifique o link de cadastro." }, 400);
    }

    // ── Proteção: não permitir e-mail de treinador ──────────
    const { data: coachWithEmail } = await supabaseAdmin
      .from("coaches")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (coachWithEmail) {
      return json({
        error: "Este e-mail pertence a uma conta de treinador. Use um e-mail diferente.",
        code: "coach_email",
      });
    }

    // ── Verificar se já existe aluno com esse CPF ───────────
    const { data: existingByCpf } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("cpf", cleanCpf)
      .maybeSingle();

    if (existingByCpf) {
      return json({
        error: "Já existe um cadastro com este CPF. Faça login ou entre em contato com seu treinador.",
        code: "cpf_exists",
      });
    }

    // ── Verificar se já existe aluno com esse e-mail ────────
    const { data: existingByEmail } = await supabaseAdmin
      .from("students")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingByEmail) {
      return json({
        error: "Já existe um cadastro com este e-mail. Faça login ou entre em contato com seu treinador.",
        code: "email_exists",
      });
    }

    // ── Criar auth user ─────────────────────────────────────
    let userId: string;

    // Verificar se já existe auth user com esse e-mail (reuso)
    const { data: rpcData } = await supabaseAdmin.rpc("find_auth_user_id_by_email", {
      _email: normalizedEmail,
    });

    if (rpcData) {
      // Auth user já existe — redefine senha e reusa
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(rpcData as string, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        const msg = (updErr.message || "").toLowerCase();
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("breach") || msg.includes("compromis")) {
          return json({
            error: "Essa senha é muito fraca ou aparece em vazamentos conhecidos. Escolha outra.",
            code: "weak_password",
          });
        }
        return json({ error: `Erro ao configurar conta: ${updErr.message}` }, 500);
      }
      userId = rpcData as string;
    } else {
      // Criar novo auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        const msg = (authError.message || "").toLowerCase();
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("breach")) {
          return json({
            error: "Essa senha é muito fraca ou aparece em vazamentos conhecidos. Escolha outra.",
            code: "weak_password",
          });
        }
        return json({ error: authError.message || "Erro ao criar conta." }, 400);
      }

      if (!authData?.user?.id) {
        return json({ error: "Erro inesperado ao criar conta." }, 500);
      }
      userId = authData.user.id;
    }

    // ── Criar registro na tabela students ────────────────────
    const { data: newStudent, error: studentErr } = await supabaseAdmin.from("students").insert({
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      phone: phone.trim().slice(0, 20),
      cpf: cleanCpf,
      sex: sex,
      plan: "Pendente",
      plan_value: 0,
      status: "active",
      joined_at: new Date().toISOString().split("T")[0],
      squat_1rm: 0,
      bench_1rm: 0,
      deadlift_1rm: 0,
      user_id: userId,
      self_registered: true,
      anamnese_completed: false,
      coach_id: coachId,
    }).select("id").maybeSingle();

    if (studentErr) {
      // Se já inseriu o auth user mas falhou no student, pelo menos não perdemos
      return json({ error: `Erro ao criar perfil: ${studentErr.message}` }, 500);
    }

    // ── Notificar o treinador ───────────────────────────────
    // Busca o auth user_id do coach para a notificação
    // Nota: coaches.id não é necessariamente o auth user id.
    // Precisamos encontrar o auth user por email do coach.
    const { data: coachAuthId } = await supabaseAdmin.rpc("find_auth_user_id_by_email", {
      _email: coach.name ? undefined : undefined, // fallback
    });

    // Busca o email do coach para encontrar o auth user
    const { data: coachFull } = await supabaseAdmin
      .from("coaches")
      .select("email")
      .eq("id", coachId)
      .maybeSingle();

    if (coachFull?.email) {
      const { data: coachUserId } = await supabaseAdmin.rpc("find_auth_user_id_by_email", {
        _email: coachFull.email,
      });

      if (coachUserId) {
        await supabaseAdmin.from("notifications").insert({
          user_id: coachUserId,
          type: "new_student",
          title: "Novo aluno cadastrado!",
          body: `${name.trim()} se cadastrou na plataforma e está aguardando definição de plano.`,
          metadata: { student_id: newStudent?.id, student_name: name.trim() },
        });
      }
    }

    return json({ success: true, userId, studentId: newStudent?.id }, 200);
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
