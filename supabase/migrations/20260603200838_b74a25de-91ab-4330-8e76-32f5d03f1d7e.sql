CREATE OR REPLACE FUNCTION public.get_strength_ranking()
RETURNS TABLE(
  student_id uuid,
  name text,
  avatar text,
  squat numeric,
  bench numeric,
  deadlift numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.avatar,
         COALESCE(s.squat_1rm, 0),
         COALESCE(s.bench_1rm, 0),
         COALESCE(s.deadlift_1rm, 0)
  FROM public.students s
  WHERE s.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_strength_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_strength_ranking() TO authenticated;