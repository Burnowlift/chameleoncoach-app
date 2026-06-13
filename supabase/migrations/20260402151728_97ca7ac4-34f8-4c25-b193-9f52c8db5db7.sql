
CREATE TABLE public.completed_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.training_blocks(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, block_id, week_number)
);

ALTER TABLE public.completed_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own completed weeks"
  ON public.completed_weeks
  FOR ALL
  TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
