-- Adiciona coluna para guardar o número de sessões e os nomes das sessões de mobilidade do aluno
ALTER TABLE students ADD COLUMN IF NOT EXISTS mobility_info JSONB DEFAULT '{}'::jsonb;
