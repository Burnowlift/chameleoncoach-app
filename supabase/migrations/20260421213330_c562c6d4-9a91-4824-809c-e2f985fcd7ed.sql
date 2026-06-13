-- Catálogo de exercícios de mobilidade (banco separado)
CREATE TABLE public.mobility_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mobility_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to mobility_exercises" ON public.mobility_exercises FOR ALL USING (true) WITH CHECK (true);

-- Plano de mobilidade do aluno (lista única por aluno)
CREATE TABLE public.student_mobility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  mobility_exercise_id uuid,
  name text NOT NULL,
  area text,
  video_url text,
  prescription text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_mobility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to student_mobility" ON public.student_mobility FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_student_mobility_student ON public.student_mobility(student_id);

-- Logs de execução do aluno (marcar como feito por dia)
CREATE TABLE public.mobility_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_mobility_id uuid NOT NULL,
  done_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_mobility_id, done_date)
);
ALTER TABLE public.mobility_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to mobility_logs" ON public.mobility_logs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_mobility_logs_student ON public.mobility_logs(student_id);