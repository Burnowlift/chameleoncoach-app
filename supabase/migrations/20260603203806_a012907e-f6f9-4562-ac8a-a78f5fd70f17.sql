CREATE TABLE IF NOT EXISTS public.body_weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS body_weight_history_student_measured_idx
  ON public.body_weight_history (student_id, measured_at DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_weight_history TO authenticated;
GRANT ALL ON public.body_weight_history TO service_role;

ALTER TABLE public.body_weight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or coach read body_weight_history"
  ON public.body_weight_history FOR SELECT
  TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

CREATE POLICY "Owner or coach insert body_weight_history"
  ON public.body_weight_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));

CREATE POLICY "Owner or coach update body_weight_history"
  ON public.body_weight_history FOR UPDATE
  TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));

CREATE POLICY "Owner or coach delete body_weight_history"
  ON public.body_weight_history FOR DELETE
  TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

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
         COALESCE(latest.weight_kg, s.body_weight_kg)
  FROM public.students s
  LEFT JOIN LATERAL (
    SELECT bwh.weight_kg
    FROM public.body_weight_history bwh
    WHERE bwh.student_id = s.id
    ORDER BY bwh.measured_at DESC, bwh.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE s.status = 'active';
$function$;