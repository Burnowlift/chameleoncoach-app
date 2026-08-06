-- ═══════════════════════════════════════════════════════════════════
-- Segurança: corrigir vazamento do get_strength_ranking (H-2)
-- Antes: qualquer usuário autenticado via peso/sexo/1RM de TODOS os alunos.
-- Agora: treinador/admin vê tudo; aluno vê a própria linha + top 4.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_strength_ranking()
 RETURNS TABLE(student_id uuid, name text, avatar text, squat numeric, bench numeric, deadlift numeric, sex text, body_weight_kg numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT
      s.id AS student_id,
      s.name,
      s.avatar,
      COALESCE(s.squat_1rm, 0) AS squat,
      COALESCE(s.bench_1rm, 0) AS bench,
      COALESCE(s.deadlift_1rm, 0) AS deadlift,
      s.sex,
      COALESCE(latest.weight_kg, s.body_weight_kg) AS body_weight_kg,
      s.user_id,
      ROW_NUMBER() OVER (
        ORDER BY (COALESCE(s.squat_1rm, 0) + COALESCE(s.bench_1rm, 0) + COALESCE(s.deadlift_1rm, 0)) DESC,
                 s.name ASC
      )::int AS pos
    FROM public.students s
    LEFT JOIN LATERAL (
      SELECT bwh.weight_kg
      FROM public.body_weight_history bwh
      WHERE bwh.student_id = s.id
      ORDER BY bwh.measured_at DESC, bwh.created_at DESC
      LIMIT 1
    ) latest ON true
    WHERE s.status = 'active'
  )
  SELECT student_id, name, avatar, squat, bench, deadlift, sex, body_weight_kg
  FROM ranked
  WHERE public.is_coach()
     OR public.is_super_admin()
     OR pos <= 4
     OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  ORDER BY (squat + bench + deadlift) DESC, name ASC;
$function$;
