/**
 * Script para corrigir a conta do treinador:
 * 1. Apaga o aluno falso "Richard tavares" vinculado ao email do coach
 * 2. Reseta a senha do treinador para Chameleon2026!
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygkuaftdjgzpfjdzfrjm.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY não definida. Rode com:");
  console.error('   node --env-file=.env scripts/fix-coach-account.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FAKE_STUDENT_ID = "58c34519-ad4e-4541-af91-099417b2aedb";
const COACH_AUTH_USER_ID = "bb7dec2a-ef3d-42c7-9df2-9d7173ed55cf";
const NEW_PASSWORD = "Chameleon2026!";

async function main() {
  console.log("🔧 Iniciando correção da conta do treinador...\n");

  // 1. Apagar o aluno falso
  console.log(`1️⃣  Apagando aluno falso (id: ${FAKE_STUDENT_ID})...`);
  const { error: deleteError } = await supabase
    .from("students")
    .delete()
    .eq("id", FAKE_STUDENT_ID);

  if (deleteError) {
    console.error("   ❌ Erro ao apagar:", deleteError.message);
  } else {
    console.log("   ✅ Aluno falso 'Richard tavares' apagado com sucesso!");
  }

  // 2. Resetar a senha do treinador
  console.log(`\n2️⃣  Resetando senha do treinador (user: ${COACH_AUTH_USER_ID})...`);
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    COACH_AUTH_USER_ID,
    { password: NEW_PASSWORD, email_confirm: true }
  );

  if (updateError) {
    console.error("   ❌ Erro ao resetar senha:", updateError.message);
  } else {
    console.log("   ✅ Senha resetada para: " + NEW_PASSWORD);
    console.log("   📧 Email:", data.user.email);
  }

  console.log("\n🎉 Pronto! Tente logar agora com:");
  console.log("   Email: brunorodriguesconsul@gmail.com");
  console.log("   Senha: " + NEW_PASSWORD);
}

main().catch(console.error);
