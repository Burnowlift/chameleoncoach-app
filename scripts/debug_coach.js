import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sClient = createClient(supabaseUrl, publishableKey);

async function run() {
  console.log("Tentando enviar email de reset...");
  const { data, error } = await sClient.auth.resetPasswordForEmail('brunorodriguesconsul@gmail.com');
  console.log("Resultado:", data, error);
}
run();
