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
  const email = 'brunorodriguesconsul@gmail.com';
  const newPassword = 'Chameleon2026!'; // Senha padrão para ele acessar

  console.log(`Buscando usuários...`);
  // O Supabase não tem uma forma direta de buscar 1 usuário por e-mail na API admin no JS, exceto listar.
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Erro ao listar:", usersError);
    return;
  }

  let user = usersData.users.find(u => u.email === email);

  if (user) {
    console.log(`✅ Usuário ${email} já existe no auth.users. ID: ${user.id}`);
    console.log(`⏳ Atualizando a senha para: ${newPassword}`);
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword, email_confirm: true }
    );

    if (updateError) {
      console.error("❌ Erro ao atualizar senha:", updateError);
    } else {
      console.log(`✅ Senha atualizada com sucesso!`);
    }

  } else {
    console.log(`⚠️ Usuário não encontrado no auth.users. Criando agora...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: newPassword,
      email_confirm: true
    });

    if (createError) {
      console.error("❌ Erro ao criar:", createError);
    } else {
      user = createData.user;
      console.log(`✅ Usuário criado com sucesso no auth.users! ID: ${user.id}`);
    }
  }

  // Garantir que a tabela coaches tenha esse user_id
  if (user && user.id) {
     await supabase.from('coaches').update({ user_id: user.id }).eq('email', email);
     console.log(`✅ Tabela coaches vinculada ao ID do auth.users!`);
  }
}

run();
