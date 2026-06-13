ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('M','F')),
  ADD COLUMN IF NOT EXISTS body_weight_kg numeric;

DROP FUNCTION IF EXISTS public.get_strength_ranking();

CREATE OR REPLACE FUNCTION public.get_strength_ranking()
 RETURNS TABLE(student_id uuid, name text, avatar text, squat numeric, bench numeric, deadlift numeric, sex text, body_weight_kg numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.name, s.avatar,
         COALESCE(s.squat_1rm, 0),
         COALESCE(s.bench_1rm, 0),
         COALESCE(s.deadlift_1rm, 0),
         s.sex,
         s.body_weight_kg
  FROM public.students s
  WHERE s.status = 'active';
$function$;