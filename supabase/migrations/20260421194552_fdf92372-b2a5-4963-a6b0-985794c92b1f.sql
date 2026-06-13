
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_students_asaas_customer ON public.students(asaas_customer_id);
