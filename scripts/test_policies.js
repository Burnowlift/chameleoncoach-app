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
  const { data, error } = await adminClient.rpc('exec_sql', { query: `
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'training_blocks'
  `});
  
  if (error) {
    // maybe there's no exec_sql, try just pg_policies via REST if exposed (probably not).
    console.error("RPC Error:", error);
  } else {
    console.log("Policies:", data);
  }
}
run();
