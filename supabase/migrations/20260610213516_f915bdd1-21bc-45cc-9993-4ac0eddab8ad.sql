ALTER TABLE public.students ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS students_request_id_key ON public.students(request_id) WHERE request_id IS NOT NULL;