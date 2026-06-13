-- Add session support to mobility and reset existing rows
DELETE FROM public.mobility_logs;
DELETE FROM public.student_mobility;

ALTER TABLE public.student_mobility
  ADD COLUMN IF NOT EXISTS session_index integer NOT NULL DEFAULT 1;

ALTER TABLE public.student_mobility
  ADD CONSTRAINT student_mobility_session_index_range
  CHECK (session_index BETWEEN 1 AND 7);

CREATE INDEX IF NOT EXISTS idx_student_mobility_student_session
  ON public.student_mobility (student_id, session_index, position);