import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("=== Diagnóstico: Login do aluno Lucas Akihito ===\n");

  // 1. Buscar aluno na tabela students
  const { data: students, error: studentsErr } = await adminClient
    .from("students")
    .select("id, name, email, user_id, status")
    .ilike("name", "%lucas%akihito%");

  if (studentsErr) {
    console.error("Erro ao buscar aluno:", studentsErr.message);
    return;
  }

  if (!students || students.length === 0) {
    // Tenta busca mais ampla
    const { data: allStudents } = await adminClient
      .from("students")
      .select("id, name, email, user_id, status")
      .ilike("name", "%lucas%");
    
    console.log("Nenhum aluno 'Lucas Akihito' encontrado. Alunos com 'Lucas':");
    console.table(allStudents || []);
    return;
  }

  console.log("Aluno(s) encontrado(s) na tabela students:");
  console.table(students);

  for (const student of students) {
    console.log(`\n--- Verificando: ${student.name} (email: ${student.email}) ---`);

    if (!student.user_id) {
      console.log("❌ PROBLEMA: Aluno NÃO tem user_id vinculado! Não existe conta de autenticação.");
      console.log("   Solução: Precisa criar o login via 'Criar acesso' no painel do treinador.");
      continue;
    }

    console.log(`✅ user_id encontrado: ${student.user_id}`);

    // 2. Verificar se o auth user existe
    const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById(student.user_id);

    if (authErr || !authUser?.user) {
      console.log(`❌ PROBLEMA: user_id ${student.user_id} NÃO existe no Auth!`);
      console.log("   O registro auth pode ter sido deletado manualmente.");
      continue;
    }

    const user = authUser.user;
    console.log(`✅ Auth user existe:`);
    console.log(`   Email no Auth: ${user.email}`);
    console.log(`   Email confirmado: ${user.email_confirmed_at ? "SIM" : "NÃO"}`);
    console.log(`   Último login: ${user.last_sign_in_at || "nunca"}`);
    console.log(`   Criado em: ${user.created_at}`);
    console.log(`   Banned: ${user.banned_until || "não"}`);

    // 3. Verificar se o email do auth bate com o email do student
    if (user.email?.toLowerCase() !== student.email?.toLowerCase()) {
      console.log(`\n⚠️ PROBLEMA: Email divergente!`);
      console.log(`   Students table: ${student.email}`);
      console.log(`   Auth table:     ${user.email}`);
      console.log("   O aluno precisa usar o email do Auth para logar.");
    }

    // 4. Verificar se o email está confirmado
    if (!user.email_confirmed_at) {
      console.log(`\n❌ PROBLEMA: Email NÃO está confirmado no Auth!`);
      console.log("   Confirmando agora...");
      const { error: confirmErr } = await adminClient.auth.admin.updateUserById(student.user_id, {
        email_confirm: true,
      });
      if (confirmErr) {
        console.log("   Falha ao confirmar:", confirmErr.message);
      } else {
        console.log("   ✅ Email confirmado com sucesso!");
      }
    }

    // 5. Tentar redefinir a senha para "teste123" e testar o login
    const testPassword = "teste123";
    console.log(`\n🔑 Redefinindo senha para "${testPassword}"...`);
    const { error: resetErr } = await adminClient.auth.admin.updateUserById(student.user_id, {
      password: testPassword,
      email_confirm: true,
    });

    if (resetErr) {
      console.log(`❌ Erro ao redefinir senha: ${resetErr.message}`);
      const msg = resetErr.message?.toLowerCase() || "";
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("breach")) {
        console.log("   A senha foi rejeitada por ser fraca/vazada. Tentando com senha mais forte...");
        const strongPassword = "ChameleonLogin2026!";
        const { error: resetErr2 } = await adminClient.auth.admin.updateUserById(student.user_id, {
          password: strongPassword,
          email_confirm: true,
        });
        if (resetErr2) {
          console.log(`   ❌ Também falhou: ${resetErr2.message}`);
        } else {
          console.log(`   ✅ Senha redefinida para "${strongPassword}"`);
          // Tenta logar
          const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
            email: user.email,
            password: strongPassword,
          });
          if (loginErr) {
            console.log(`   ❌ Login falhou mesmo após reset: ${loginErr.message}`);
          } else {
            console.log(`   ✅ Login FUNCIONOU! Token: ${loginData.session?.access_token?.slice(0, 20)}...`);
            await anonClient.auth.signOut();
          }
        }
      }
    } else {
      console.log(`✅ Senha redefinida com sucesso!`);
      
      // 6. Tentar logar com a nova senha
      console.log(`\n🔐 Testando login com email="${user.email}" e senha="${testPassword}"...`);
      const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
        email: user.email,
        password: testPassword,
      });

      if (loginErr) {
        console.log(`❌ Login FALHOU: ${loginErr.message}`);
        console.log("   Isso indica um problema no nível do Supabase Auth (possível bug ou configuração).");
      } else {
        console.log(`✅ Login FUNCIONOU!`);
        console.log(`   O aluno pode logar com:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Senha: ${testPassword}`);
        await anonClient.auth.signOut();
      }
    }
  }
}

run().catch(console.error);
