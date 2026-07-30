import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);

async function run() {
  const testEmail = 'brunorodriguesconsul@gmail.com';
  
  // We can test the is_coach logic directly via raw sql if we had it, but we don't.
  // Instead, let's just query the coaches table to see if his email exists EXACTLY.
  const { data: coaches, error } = await adminClient
    .from('coaches')
    .select('*')
    .ilike('email', `%bruno%`);
    
  console.log("Coaches matching bruno:", coaches);

  const { data: allCoaches } = await adminClient.from('coaches').select('*');
  console.log("All coaches:");
  allCoaches.forEach(c => {
    console.log(`'${c.email}' (length: ${c.email.length})`);
  });
}
run();
