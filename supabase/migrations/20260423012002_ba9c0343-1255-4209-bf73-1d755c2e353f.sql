ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS is_squat_rm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bench_rm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deadlift_rm boolean NOT NULL DEFAULT false;

UPDATE public.exercises SET is_squat_rm = true WHERE sbd = 'squat';
UPDATE public.exercises SET is_bench_rm = true WHERE sbd = 'bench';
UPDATE public.exercises SET is_deadlift_rm = true WHERE sbd = 'deadlift';