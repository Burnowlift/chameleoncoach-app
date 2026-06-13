import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('sb_secret_') || trimmed.includes('sb_secret_')) {
      serviceRoleKey = trimmed.replace(/['"]/g, '');
      break;
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("🔍 Buscando alunos ATIVOS sem conta de login...");

  // Buscar alunos que estão ativos (ou expirando) e que o user_id está nulo
  const { data: students, error } = await supabase
    .from('students')
    .select('id, email, name, status, user_id')
    .in('status', ['active', 'expiring'])
    .is('user_id', null);

  if (error) {
    console.error("❌ Erro ao buscar alunos:", error);
    return;
  }

  console.log(`✅ Encontrados ${students.length} alunos prontos para criação de login.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const student of students) {
    if (!student.email || !student.email.includes('@')) {
      console.log(`⚠️ Ignorando ${student.name} (e-mail inválido: ${student.email})`);
      continue;
    }

    try {
      console.log(`⏳ Criando login para: ${student.email}`);
      
      // Cria o usuário via Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: 'ChangeMe123!@', // Senha temporária, eles vão redefinir
        email_confirm: true // Já entra verificado
      });

      if (authError) {
        // Se o erro for que o usuário já existe, vamos tentar buscar o ID dele e vincular
        if (authError.message.includes("User already registered") || authError.message.includes("email address is already in use")) {
            console.log(`   ℹ️ O e-mail já existe no auth.users, tentando vincular...`);
            // Infelizmente a API admin list users é a melhor forma, mas é demorada.
            // Para ser simples, ignoramos, pois o erro é claro.
            console.error(`   ❌ Falha: O e-mail já tem uma conta no Supabase. Edite o aluno manualmente.`);
            errorCount++;
            continue;
        } else {
            console.error(`   ❌ Erro Auth: ${authError.message}`);
            errorCount++;
            continue;
        }
      }

      if (authData?.user?.id) {
        // Vincula o user_id gerado ao aluno na tabela public.students
        const { error: updateError } = await supabase
          .from('students')
          .update({ user_id: authData.user.id })
          .eq('id', student.id);

        if (updateError) {
          console.error(`   ❌ Erro ao vincular aluno: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Sucesso!`);
          successCount++;
        }
      }

    } catch (err) {
      console.error(`   ❌ Erro fatal:`, err);
      errorCount++;
    }
  }

  console.log(`\n🎉 PROCESSO CONCLUÍDO!`);
  console.log(`✅ Criados e vinculados: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
}

run();
