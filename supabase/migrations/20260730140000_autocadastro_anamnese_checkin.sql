-- ═══════════════════════════════════════════════════════════════════
-- Migration: Autocadastro, Anamnese, Check-in Semanal
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Alterações na tabela students ──────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES coaches(id),
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS anamnese_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_registered boolean DEFAULT false;

-- ─── 2. Tabela de notificações in-app ─────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  metadata    jsonb DEFAULT '{}',
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read) WHERE read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role / triggers can insert (no user-level INSERT policy needed)
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ─── 3. Tabela de anamnese ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anamneses (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status                 text NOT NULL DEFAULT 'draft',

  -- Sexo (para condicionar modelos de foto)
  sexo                   text CHECK (sexo IN ('M', 'F')),

  -- Dados Pessoais extras (nome, email, telefone, cpf já estão em students)
  rg                     text,
  cep                    text,
  endereco               text,
  profissao              text,
  data_nascimento        date,

  -- Saúde e Limitações
  limitacao_cirurgia     text,
  limitacao_arquivo_url  text,
  comorbidades           text,

  -- Rotina
  horas_trabalho         text,
  horas_sono             text,

  -- Disponibilidade de Treino
  dias_treino_semana     text,
  tempo_treino_dia       text,
  disponibilidade_cardio text,

  -- Objetivos e Preferências
  objetivo               text,
  exercicios_preferidos  text,

  -- Fotos (URLs do Supabase Storage)
  fotos                  jsonb DEFAULT '[]',

  -- Aceites
  aceite_compromisso     boolean DEFAULT false,
  aceite_sinceridade     boolean DEFAULT false,

  -- Controle multi-step
  current_step           int DEFAULT 1,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anamneses_student 
  ON anamneses(student_id);

-- RLS
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view anamneses"
  ON anamneses FOR SELECT
  USING (is_coach());

CREATE POLICY "Student can view own anamnese"
  ON anamneses FOR SELECT
  USING (is_student_owner(student_id));

CREATE POLICY "Student can insert own anamnese"
  ON anamneses FOR INSERT
  WITH CHECK (is_student_owner(student_id));

CREATE POLICY "Student can update own anamnese"
  ON anamneses FOR UPDATE
  USING (is_student_owner(student_id))
  WITH CHECK (is_student_owner(student_id));

-- Trigger: ao completar anamnese, marca students.anamnese_completed = true
CREATE OR REPLACE FUNCTION fn_anamnese_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE students SET anamnese_completed = true WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_anamnese_completed ON anamneses;
CREATE TRIGGER trg_anamnese_completed
  AFTER UPDATE ON anamneses
  FOR EACH ROW
  EXECUTE FUNCTION fn_anamnese_completed();

-- ─── 4. Tabela de check-in semanal ────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start              date NOT NULL,
  status                  text NOT NULL DEFAULT 'pending',
  available_at            timestamptz NOT NULL,
  expires_at              timestamptz NOT NULL,

  -- Respostas do aluno
  treinos_perdidos        int,
  motivo_falta            text,
  avaliacao_execucao      int CHECK (avaliacao_execucao BETWEEN 1 AND 10),
  rpe_medio               int CHECK (rpe_medio BETWEEN 1 AND 10),
  peso_corporal           numeric(5,1),
  qualidade_sono          int CHECK (qualidade_sono BETWEEN 1 AND 5),
  horas_sono_media        numeric(3,1),
  nivel_estresse          int CHECK (nivel_estresse BETWEEN 1 AND 5),
  aderencia_alimentacao   int CHECK (aderencia_alimentacao BETWEEN 1 AND 5),
  dor_desconforto         text,
  pr_progressao           text,
  avaliacao_consultoria   int CHECK (avaliacao_consultoria BETWEEN 1 AND 5),
  duvidas_sugestoes       text,
  responded_at            timestamptz,

  -- Comentário do treinador
  coach_comment           text,
  coach_commented_at      timestamptz,

  created_at              timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_student_week 
  ON weekly_checkins(student_id, week_start);

-- RLS
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view checkins"
  ON weekly_checkins FOR SELECT
  USING (is_coach());

CREATE POLICY "Student can view own checkins"
  ON weekly_checkins FOR SELECT
  USING (is_student_owner(student_id));

CREATE POLICY "Student can update own checkin responses"
  ON weekly_checkins FOR UPDATE
  USING (is_student_owner(student_id))
  WITH CHECK (is_student_owner(student_id));

CREATE POLICY "Coach can update checkins (comment)"
  ON weekly_checkins FOR UPDATE
  USING (is_coach());

CREATE POLICY "Service can insert checkins"
  ON weekly_checkins FOR INSERT
  WITH CHECK (true);

-- ─── 5. pg_cron: Gerar check-ins todo sábado ──────────────────────
-- Nota: pg_cron precisa estar habilitado no Supabase Dashboard
-- (Database > Extensions > pg_cron)

-- Job: gera check-ins para alunos ativos cujo sábado local >= 08:00
-- (COMENTADO POIS EXTENSÃO PG_CRON PRECISA SER ATIVADA NO DASHBOARD)
/*
SELECT cron.schedule(
  'generate-weekly-checkins',
  '0 * * * *',
  $$
  INSERT INTO public.weekly_checkins (student_id, week_start, available_at, expires_at)
  SELECT 
    s.id,
    date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'))::date AS ws,
    (date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo')) 
      + interval '5 days 8 hours') AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'),
    (date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo')) 
      + interval '7 days 23 hours 59 minutes') AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo')
  FROM public.students s
  WHERE s.status = 'active'
    AND s.anamnese_completed = true
    AND EXTRACT(dow FROM now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo')) = 6
    AND (now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'))::time >= '08:00:00'
  ON CONFLICT (student_id, week_start) DO NOTHING;
  $$
);

-- Job: expira check-ins não respondidos após segunda-feira
SELECT cron.schedule(
  'expire-weekly-checkins',
  '0 * * * *',
  $$
  UPDATE public.weekly_checkins 
  SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < now();
  $$
);
*/

-- ─── 6. Trigger: notificar treinador quando aluno responde check-in
CREATE OR REPLACE FUNCTION fn_notify_checkin_response()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name text;
  v_coach_user_id uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Busca nome do aluno
    SELECT name INTO v_student_name FROM students WHERE id = NEW.student_id;
    
    -- Busca user_id do(s) coach(es) vinculado(s) ao aluno
    -- Notifica todos os coaches (ou o coach vinculado)
    INSERT INTO notifications (user_id, type, title, body, metadata)
    SELECT 
      c.id,  -- coach id é o mesmo que auth user id pois coaches.id é o PK
      'checkin_response',
      'Check-in respondido',
      v_student_name || ' respondeu o check-in semanal',
      jsonb_build_object('student_id', NEW.student_id, 'checkin_id', NEW.id)
    FROM coaches c
    INNER JOIN students s ON s.coach_id = c.id
    WHERE s.id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_checkin_response ON weekly_checkins;
CREATE TRIGGER trg_notify_checkin_response
  AFTER UPDATE ON weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_checkin_response();

-- ─── 7. Storage bucket para arquivos de anamnese ──────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('anamnese-files', 'anamnese-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: alunos podem fazer upload de seus arquivos
CREATE POLICY "Students can upload anamnese files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'anamnese-files' 
    AND auth.uid() IS NOT NULL
  );

-- Policy: coaches e o próprio aluno podem ler
CREATE POLICY "Authorized users can read anamnese files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'anamnese-files' 
    AND auth.uid() IS NOT NULL
  );
