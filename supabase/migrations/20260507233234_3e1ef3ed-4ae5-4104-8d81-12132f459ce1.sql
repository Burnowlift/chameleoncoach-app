ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS sessions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.workout_templates
SET sessions = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', 'Treino A',
    'exercises', exercises
  )
)
WHERE jsonb_array_length(sessions) = 0 AND jsonb_array_length(exercises) > 0;

ALTER TABLE public.workout_templates DROP COLUMN IF EXISTS exercises;