
CREATE TABLE public.rm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  sbd_type TEXT NOT NULL CHECK (sbd_type IN ('squat', 'bench', 'deadlift')),
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  estimated_1rm NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rm_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to rm_history"
  ON public.rm_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
