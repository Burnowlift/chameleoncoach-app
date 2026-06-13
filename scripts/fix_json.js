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
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTable(tableName) {
  console.log(`Verificando tabela: ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`Erro ao ler ${tableName}:`, error);
    return;
  }
  
  let fixedCount = 0;
  for (const row of data) {
    let needsUpdate = false;
    const updates = {};
    
    // Lista de colunas JSON que podem estar armazenadas como string literal
    const jsonColumns = ['sessions', 'week_sessions', 'weekSessions', 'content', 'metadata'];
    
    for (const col of jsonColumns) {
      if (row[col] && typeof row[col] === 'string') {
        try {
          // Tenta parsear a string para ver se vira objeto/array
          const parsed = JSON.parse(row[col]);
          if (typeof parsed === 'object' && parsed !== null) {
            updates[col] = parsed;
            needsUpdate = true;
          }
        } catch (e) {
          // não é JSON válido, ignora
        }
      }
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase.from(tableName).update(updates).eq('id', row.id);
      if (updateError) {
        console.error(`Erro ao atualizar linha ${row.id} na tabela ${tableName}:`, updateError);
      } else {
        fixedCount++;
      }
    }
  }
  
  console.log(`Tabela ${tableName}: ${fixedCount} linhas corrigidas.`);
}

async function run() {
  await fixTable('training_blocks');
  await fixTable('workout_templates');
  await fixTable('completed_weeks');
  await fixTable('mobility_templates');
  await fixTable('student_mobility');
  console.log("Fim da correção!");
}

run();
