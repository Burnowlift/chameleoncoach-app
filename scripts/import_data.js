import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Parse .env manually to find the raw sb_secret key if the user pasted it without the variable name
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ ERRO: supabaseUrl ou serviceRoleKey não encontrados. Verifique o arquivo .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const tablesOrder = [
  'coaches',
  'students',
  'exercises',
  'finance_categories',
  'finance_goals',
  'finance_recurrences',
  'mobility_exercises',
  'coach_permissions',
  'training_blocks',
  'mobility_templates',
  'podium_events',
  'completed_weeks',
  'workout_templates',
  'student_mobility',
  'finance_transactions',
  'finance_goal_contributions',
  'week_notes',
  'exercise_logs',
  'rm_history',
  'session_notes',
  'student_feedback_marks',
  'student_feedback_notes',
  'block_notes',
  'mobility_logs',
  'mobility_template_items',
  'body_weight_history',
  'ranking_archive',
  'coach_permission_audit',
  'student_password_reset_audit'
];

// Helper to format rows (handle empty strings -> null, convert specific formats if needed)
function formatRow(tableName, row) {
  const formatted = { ...row };
  for (const [key, value] of Object.entries(formatted)) {
    // If the string is empty, convert to null
    if (value === '' || value === 'null' || value === undefined) {
      formatted[key] = null;
    }
  }

  // Nullify user_id because we do not have auth.users
  if ('user_id' in formatted) {
    formatted['user_id'] = null;
  }

  // For students table: 'avatar' should map to 'avatars' storage bucket path if needed, but it's usually just a filename.
  
  return formatted;
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Arquivo não encontrado: ${filePath} (Pulando...)`);
      resolve(results);
      return;
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function runImport() {
  console.log("🚀 Iniciando importação...");
  console.log(`URL: ${supabaseUrl}`);

  const tablesDir = path.join(__dirname, '../export_data/tables');

  for (const tableName of tablesOrder) {
    const filePath = path.join(tablesDir, `${tableName}.csv`);
    const rows = await parseCSV(filePath);

    if (rows.length === 0) continue;

    console.log(`\n⏳ Importando tabela: ${tableName} (${rows.length} registros)...`);

    // Format rows
    const formattedRows = rows.map(r => formatRow(tableName, r));

    // Upload in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < formattedRows.length; i += chunkSize) {
      const chunk = formattedRows.slice(i, i + chunkSize);
      
      const { data, error } = await supabase
        .from(tableName)
        .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Erro ao importar ${tableName} no chunk ${i}:`, error.message);
        // Continue but warn
      } else {
        process.stdout.write(`✅ ${i + chunk.length}/${formattedRows.length} `);
      }
    }
    console.log(); // new line
  }

  console.log("\n✅ Importação de tabelas finalizada!");
  
  console.log("\n⏳ Fazendo upload dos avatares...");
  const avatarsDir = path.join(__dirname, '../export_data/avatars');
  if (fs.existsSync(avatarsDir)) {
    const files = fs.readdirSync(avatarsDir, { recursive: true });
    
    for (const file of files) {
      const fullPath = path.join(avatarsDir, file);
      if (fs.statSync(fullPath).isFile()) {
        const fileContent = fs.readFileSync(fullPath);
        const relativePath = file.replace(/\\/g, '/');
        
        console.log(`Subindo: ${relativePath}`);
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(relativePath, fileContent, {
            upsert: true,
            contentType: 'image/jpeg' // Default
          });
          
        if (error) {
          console.error(`❌ Erro upload ${relativePath}:`, error.message);
        }
      }
    }
    console.log("\n✅ Upload de avatares finalizado!");
  }

  console.log("\n🎉 PROCESSO COMPLETO! Todos os dados foram importados.");
}

runImport().catch(err => {
  console.error("Fatal error:", err);
});
