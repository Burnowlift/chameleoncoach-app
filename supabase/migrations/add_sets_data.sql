ALTER TABLE public.exercise_logs
ADD COLUMN sets_data JSONB DEFAULT '[]'::jsonb;
