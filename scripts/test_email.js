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
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('sb_secret_')) {
      serviceRoleKey = line.trim().replace(/['"]/g, '');
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const email = 'alvessilval075@gmail.com';
  console.log(`Verificando o aluno: ${email}`);
  
  const { data: student, error } = await supabase.from('students').select('*').eq('email', email).maybeSingle();
  console.log("Dados em students:", student || error || "Não encontrado");

  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  console.log("Usuário em auth.users:", authUser ? "Sim" : "Não encontrado");
}
run();
