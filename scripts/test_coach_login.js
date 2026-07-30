import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);
const publicClient = createClient(supabaseUrl, anonKey);

async function run() {
  const email = 'testcoach_xyz123@example.com';
  const password = 'password123';

  console.log("1. Creating user in auth...");
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (authErr && authErr.message !== 'User already registered') {
    console.error("Error creating user:", authErr);
  }
  
  console.log("2. Inserting into coaches...");
  const { error: coachErr } = await adminClient.from('coaches').insert({
    email,
    name: 'Test Coach'
  });
  if (coachErr && coachErr.code !== '23505') { // ignore unique violation
    console.error("Error inserting coach:", coachErr);
  }

  console.log("3. Logging in as coach...");
  const { data: sessionData, error: loginErr } = await publicClient.auth.signInWithPassword({
    email,
    password
  });
  if (loginErr) {
    console.error("Login error:", loginErr);
    return;
  }
  console.log("Logged in:", sessionData.user.id);

  console.log("4. Querying training_blocks...");
  const { data: blocks, error: blocksErr } = await publicClient.from('training_blocks').select('*');
  console.log("Blocks returned:", blocks?.length, blocksErr);

  console.log("5. Checking is_coach()...");
  const { data: coaches, error: coErr } = await publicClient.from('coaches').select('id');
  console.log("Can query coaches? (coaches length):", coaches?.length);

  console.log("Cleaning up...");
  await adminClient.from('coaches').delete().eq('email', email);
  if (authData?.user) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
  }
}
run();
