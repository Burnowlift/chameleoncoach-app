import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const anonClient = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("=== Teste de login do aluno Lucas Akihito ===\n");
  
  const email = "l.hirakava@gmail.com";
  const password = "teste123";
  
  console.log(`Tentando login com: ${email} / ${password}`);
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  
  if (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    console.log("Status:", error.status);
    console.log("Full error:", JSON.stringify(error, null, 2));
  } else {
    console.log(`✅ Login OK!`);
    console.log(`User ID: ${data.user?.id}`);
    console.log(`Email: ${data.user?.email}`);
    await anonClient.auth.signOut();
  }
}

run().catch(console.error);
