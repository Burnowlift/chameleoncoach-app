
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS frequency integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS week_sessions jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.workout_templates
SET
  week_sessions = jsonb_build_object('1', sessions),
  frequency = GREATEST(1, COALESCE(jsonb_array_length(sessions), 1)),
  duration = 1
WHERE week_sessions = '{}'::jsonb OR week_sessions IS NULL;
