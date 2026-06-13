import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type CoachAuthResult =
  | { ok: true; userId: string; email: string; isSuperAdmin: boolean }
  | { ok: false; status: number; error: string };

/**
 * Verifica que o chamador é um treinador autenticado (linha em public.coaches
 * com e-mail igual ao do JWT). Retorna 401 se não houver JWT válido e 403 se
 * o usuário autenticado não for treinador.
 */
export async function requireCoach(req: Request): Promise<CoachAuthResult> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Não autenticado." };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Não autenticado." };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient: SupabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Sessão inválida." };
  }
  const email = (userData.user.email || "").toLowerCase();
  if (!email) {
    return { ok: false, status: 403, error: "Sem permissão." };
  }

  // Usa service-role só pra checar a tabela coaches (lookup mínimo).
  const adminClient: SupabaseClient = createClient(supabaseUrl, serviceKey);
  const { data: coach, error: coachErr } = await adminClient
    .from("coaches")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (coachErr) {
    return { ok: false, status: 500, error: "Erro ao verificar permissão." };
  }
  if (!coach) {
    return { ok: false, status: 403, error: "Acesso restrito a treinadores." };
  }

  const isSuperAdmin = email === "brunorodriguesconsul@gmail.com";
  return { ok: true, userId: userData.user.id, email, isSuperAdmin };
}
