CREATE TABLE public.week_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL,
  student_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (block_id, week_number)
);

ALTER TABLE public.week_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to week_notes"
ON public.week_notes
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_week_notes_updated_at
BEFORE UPDATE ON public.week_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_week_notes_block ON public.week_notes(block_id);