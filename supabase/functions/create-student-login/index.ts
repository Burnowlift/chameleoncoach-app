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

interface AuthAdminError {
  message?: string;
  code?: string;
}

async function findAuthUserIdByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  // Busca rápida via função SQL (security definer) — evita paginar listUsers.
  const { data, error } = await supabaseAdmin.rpc("find_auth_user_id_by_email", {
    _email: email,
  });
  if (!error && data) return data as string;

  // Fallback: paginação.
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (listErr) return null;
    const existing = list.users.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (existing) return existing.id;
    if (list.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

async function linkOrphanAuthUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  authUserId: string,
  studentId: string,
  password: string
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  // Verifica se o auth user já está vinculado a outro aluno.
  const { data: linked, error: linkedErr } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("user_id", authUserId);

  if (linkedErr) {
    return { ok: false, status: 500, body: { error: `Falha ao verificar vínculo: ${linkedErr.message}` } };
  }
  const otherLink = (linked ?? []).find((s: { id: string }) => s.id !== studentId);
  if (otherLink) {
    return {
      ok: false,
      status: 200,
      body: {
        success: false,
        error: "Este e-mail já está em uso por outra conta de aluno. Use um e-mail diferente.",
        code: "email_exists",
      },
    };
  }

  // Redefine a senha (caso o coach esteja redefinindo) e confirma o e-mail.
  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    const um = (updErr.message || "").toLowerCase();
    if (um.includes("weak") || um.includes("pwned") || um.includes("breach") || um.includes("compromis")) {
      return {
        ok: false,
        status: 200,
        body: {
          success: false,
          error: "Essa senha aparece em vazamentos conhecidos ou é muito fraca. Escolha uma senha mais forte.",
          code: "weak_password",
        },
      };
    }
    return { ok: false, status: 500, body: { error: `Falha ao redefinir senha do usuário existente: ${updErr.message}` } };
  }

  // Vincula no aluno (idempotente).
  const { error: linkUpdErr } = await supabaseAdmin
    .from("students")
    .update({ user_id: authUserId })
    .eq("id", studentId);
  if (linkUpdErr) {
    return { ok: false, status: 500, body: { error: `Não foi possível vincular o login ao aluno: ${linkUpdErr.message}` } };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // SOMENTE treinadores podem criar/redefinir logins de alunos.
    const auth = await requireCoach(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const { email, password, studentId } = await req.json();

    if (!email || !password || !studentId) {
      return json({ error: "email, password e studentId são obrigatórios" }, 400);
    }
    if (typeof password !== "string" || password.length < 6) {
      return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pre-check: aluno já tem login?
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, email")
      .eq("id", studentId)
      .maybeSingle();

    if (studentErr) return json({ error: `Erro ao buscar aluno: ${studentErr.message}` }, 400);
    if (!student) return json({ error: "Aluno não encontrado." }, 404);
    if (student.user_id) {
      return json({ success: false, error: "Este aluno já possui login vinculado.", code: "already_linked" });
    }

    // SELF-HEAL: se já existe auth user com esse e-mail (órfão de tentativa anterior interrompida),
    // apenas vincula em vez de tentar criar — evita 422 email_exists e contas penduradas.
    const preExistingId = await findAuthUserIdByEmail(supabaseAdmin, String(email));
    if (preExistingId) {
      const result = await linkOrphanAuthUser(supabaseAdmin, preExistingId, studentId, password);
      if (!result.ok) return json(result.body, result.status);
      return json({ success: true, userId: preExistingId, reused: true }, 200);
    }

    // Cria o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId: string | undefined = authData?.user?.id;
    let reused = false;

    if (authError) {
      const msg = (authError.message || "").toLowerCase();
      const code = (authError as AuthAdminError).code;

      if (code === "email_exists" || msg.includes("already") || msg.includes("registered")) {
        // Corrida: outro request criou no meio do caminho. Reaproveita.
        const existingId = await findAuthUserIdByEmail(supabaseAdmin, String(email));
        if (!existingId) {
          return json({
            success: false,
            error: "Este e-mail já está em uso por outra conta. Use um e-mail diferente para o aluno.",
            code: "email_exists",
          });
        }
        const result = await linkOrphanAuthUser(supabaseAdmin, existingId, studentId, password);
        if (!result.ok) return json(result.body, result.status);
        return json({ success: true, userId: existingId, reused: true }, 200);
      } else if (code === "weak_password" || (msg.includes("password") && (msg.includes("weak") || msg.includes("compromis") || msg.includes("breach") || msg.includes("pwned")))) {
        return json({
          success: false,
          error: "Essa senha aparece em vazamentos conhecidos ou é muito fraca. Escolha uma senha mais forte (evite '123456', 'senha123', etc.).",
          code: "weak_password",
        });
      } else {
        return json({ error: authError.message || "Erro ao criar usuário no Auth." }, 400);
      }
    }

    if (!userId) return json({ error: "Auth não retornou o ID do usuário." }, 500);

    // Vincula ao aluno
    const { error: updateError } = await supabaseAdmin
      .from("students")
      .update({ user_id: userId })
      .eq("id", studentId);

    if (updateError) {
      // Não deleta o auth user: deixa como órfão recuperável pelo self-heal na próxima tentativa.
      return json(
        { error: `Login criado, mas falhou ao vincular ao aluno. Tente novamente em alguns segundos: ${updateError.message}` },
        500
      );
    }

    return json({ success: true, userId, reused }, 200);
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
