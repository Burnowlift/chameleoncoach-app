-- Duração do plano contratada por cada aluno (Mensal, Semestral, etc.)
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_duration TEXT;
