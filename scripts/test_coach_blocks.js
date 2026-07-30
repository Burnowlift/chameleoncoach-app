import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sClient = createClient(supabaseUrl, publishableKey);

async function run() {
  // We need the coach's credentials. We don't have the password.
  // Instead of a full login, we can just call an RPC or bypass.
  // Wait, I don't know the password. I can't login directly unless I use service_role.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log("No service key.");
    return;
  }
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  // Get coach info
  const { data: coaches } = await adminClient.from('coaches').select('*');
  console.log("Coaches:", coaches);
  
  if (coaches && coaches.length > 0) {
    const coachEmail = coaches[0].email;
    // Check if the user exists in auth.users
    const { data: users, error: userError } = await adminClient.auth.admin.listUsers();
    const user = users.users.find(u => u.email === coachEmail);
    console.log("Coach user auth:", user ? user.id : "Not found", userError);
  }

  // Get a training block to see its student
  const { data: blocks } = await adminClient.from('training_blocks').select('*').limit(1);
  console.log("A training block:", blocks);
}
run();
