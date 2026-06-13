
-- Training blocks table (stores block metadata + sessions as JSONB)
CREATE TABLE public.training_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 3,
  duration INTEGER NOT NULL DEFAULT 4,
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  week_sessions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exercise logs (student records their weights)
CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.training_blocks(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session notes (student leaves messages for coach)
CREATE TABLE public.session_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.training_blocks(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for training_blocks
ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to training_blocks" ON public.training_blocks FOR ALL USING (true) WITH CHECK (true);

-- RLS for exercise_logs
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exercise_logs" ON public.exercise_logs FOR ALL USING (true) WITH CHECK (true);

-- RLS for session_notes
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to session_notes" ON public.session_notes FOR ALL USING (true) WITH CHECK (true);

-- Update trigger for training_blocks
CREATE TRIGGER update_training_blocks_updated_at
  BEFORE UPDATE ON public.training_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
