
CREATE TABLE public.block_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.training_blocks(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.block_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to block_notes" ON public.block_notes FOR ALL TO public USING (true) WITH CHECK (true);
