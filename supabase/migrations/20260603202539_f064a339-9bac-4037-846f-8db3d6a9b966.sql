CREATE OR REPLACE FUNCTION public.get_ranking()
 RETURNS TABLE(student_id uuid, name text, avatar text, score numeric, base_score numeric, penalty numeric, penalties jsonb, load_fill_rate numeric, mobility_rate numeric, message_rate numeric, expected_load_logs integer, actual_load_logs integer, expected_mobility integer, actual_mobility integer, expected_messages integer, actual_messages integer, rank_position integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  WINDOW_DAYS constant int := 7;
  MESSAGE_GOAL constant int := 5;
  PENALTY_PER_DAY constant numeric := 0.3;
  PENALTY_CAP constant numeric := 1.5;
  INACTIVITY_TOLERANCE constant int := 2;
  MOBILITY_MULTIPLIER constant numeric := 1.3;
  LOAD_MULTIPLIER constant numeric := 1.2;
  since_ts timestamptz := now() - (WINDOW_DAYS || ' days')::interval;
  since_date date := (current_date - WINDOW_DAYS + 1);
  caller_is_privileged boolean := public.is_coach() OR public.is_super_admin();
  caller_uid uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  base AS (
    SELECT s.id AS sid, s.name AS sname, s.avatar AS savatar, s.user_id AS suser
    FROM public.students s
    WHERE s.status = 'active'
  ),
  block_agg AS (
    SELECT
      tb.student_id AS sid,
      MAX(COALESCE(tb.frequency, 0)) AS expected_sessions_per_week,
      COALESCE(AVG(NULLIF(sess_ex.ex_count, 0)), 0) AS avg_ex_per_session
    FROM public.training_blocks tb
    LEFT JOIN LATERAL (
      SELECT jsonb_array_length(COALESCE(sess->'exercises','[]'::jsonb)) AS ex_count
      FROM jsonb_array_elements(COALESCE(tb.sessions, '[]'::jsonb)) sess
    ) sess_ex ON true
    GROUP BY tb.student_id
  ),
  load_logs AS (
    SELECT
      el.student_id AS sid,
      COUNT(DISTINCT (el.block_id::text || '|' || el.week_number::text || '|' || el.session_id || '|' || el.exercise_id))
        FILTER (WHERE el.weight > 0) AS actual_loads,
      array_agg(DISTINCT (el.created_at AT TIME ZONE 'UTC')::date) AS active_days
    FROM public.exercise_logs el
    WHERE el.created_at >= since_ts
    GROUP BY el.student_id
  ),
  mob_items AS (
    SELECT sm.student_id AS sid, COUNT(*)::int AS items
    FROM public.student_mobility sm
    GROUP BY sm.student_id
  ),
  mob_logs AS (
    SELECT
      ml.student_id AS sid,
      COUNT(*)::int AS actual_mob,
      array_agg(DISTINCT ml.done_date) AS done_dates
    FROM public.mobility_logs ml
    WHERE ml.done_date >= since_date
    GROUP BY ml.student_id
  ),
  msg_days AS (
    SELECT
      sn.student_id AS sid,
      COUNT(DISTINCT (sn.created_at AT TIME ZONE 'UTC')::date)::int AS unique_msg_days,
      array_agg(DISTINCT (sn.created_at AT TIME ZONE 'UTC')::date) AS msg_dates
    FROM public.session_notes sn
    WHERE sn.sender = 'student' AND sn.created_at >= since_ts
    GROUP BY sn.student_id
  ),
  computed AS (
    SELECT
      b.sid, b.sname, b.savatar, b.suser,
      GREATEST(0, CEIL(COALESCE(ba.expected_sessions_per_week,0) * COALESCE(ba.avg_ex_per_session,0) * LOAD_MULTIPLIER))::int AS expected_loads,
      COALESCE(ll.actual_loads, 0)::int AS actual_loads,
      CEIL(COALESCE(mi.items, 0) * WINDOW_DAYS * MOBILITY_MULTIPLIER)::int AS expected_mob,
      COALESCE(mlg.actual_mob, 0) AS actual_mob,
      MESSAGE_GOAL AS expected_msgs,
      COALESCE(md.unique_msg_days, 0) AS actual_msgs,
      COALESCE(mi.items, 0) AS mob_items_count,
      COALESCE(mlg.done_dates, ARRAY[]::date[]) AS mob_done_dates,
      COALESCE(ll.active_days, ARRAY[]::date[]) AS load_active_days,
      COALESCE(md.msg_dates, ARRAY[]::date[]) AS msg_active_dates
    FROM base b
    LEFT JOIN block_agg ba ON ba.sid = b.sid
    LEFT JOIN load_logs ll ON ll.sid = b.sid
    LEFT JOIN mob_items mi ON mi.sid = b.sid
    LEFT JOIN mob_logs mlg ON mlg.sid = b.sid
    LEFT JOIN msg_days md ON md.sid = b.sid
  ),
  rates AS (
    SELECT c.*,
      CASE WHEN c.expected_loads > 0 THEN LEAST(1.0, c.actual_loads::numeric / c.expected_loads) ELSE 0 END AS load_rate,
      CASE WHEN c.expected_mob > 0 THEN LEAST(1.0, c.actual_mob::numeric / c.expected_mob) ELSE 0 END AS mob_rate,
      LEAST(1.0, c.actual_msgs::numeric / c.expected_msgs) AS msg_rate
    FROM computed c
  ),
  scored AS (
    SELECT r.*,
      (
        (CASE WHEN r.expected_loads > 0 THEN r.load_rate * 0.425 ELSE 0 END)
        + (CASE WHEN r.expected_mob > 0 THEN r.mob_rate * 0.425 ELSE 0 END)
        + (r.msg_rate * 0.15)
      ) / NULLIF(
        (CASE WHEN r.expected_loads > 0 THEN 0.425 ELSE 0 END)
        + (CASE WHEN r.expected_mob > 0 THEN 0.425 ELSE 0 END)
        + 0.15,
      0) AS combined
    FROM rates r
  ),
  pen_calc AS (
    SELECT s.*,
      ROUND((1 + LEAST(1, GREATEST(0, COALESCE(s.combined, 0))) * 4)::numeric, 1) AS base_score_calc,
      CASE WHEN s.mob_items_count > 0 THEN (
        SELECT COUNT(*)::int FROM generate_series(0, WINDOW_DAYS - 1) gs
        WHERE NOT ( (current_date - gs) = ANY(s.mob_done_dates) )
      ) ELSE 0 END AS missed_mob_days,
      (
        SELECT COALESCE(MIN(gs), WINDOW_DAYS)::int FROM generate_series(0, WINDOW_DAYS - 1) gs
        WHERE (current_date - gs) = ANY(s.load_active_days)
           OR (current_date - gs) = ANY(s.mob_done_dates)
           OR (current_date - gs) = ANY(s.msg_active_dates)
      ) AS inactive_streak
    FROM scored s
  ),
  penalties_calc AS (
    SELECT p.*,
      LEAST(PENALTY_CAP, p.missed_mob_days * PENALTY_PER_DAY) AS mob_penalty,
      GREATEST(0, p.inactive_streak - INACTIVITY_TOLERANCE) AS inactive_pen_days,
      LEAST(PENALTY_CAP, GREATEST(0, p.inactive_streak - INACTIVITY_TOLERANCE) * PENALTY_PER_DAY) AS inactive_penalty
    FROM pen_calc p
  ),
  finalc AS (
    SELECT pc.*,
      ROUND((pc.mob_penalty + pc.inactive_penalty)::numeric, 1) AS total_penalty,
      (
        CASE WHEN pc.mob_items_count > 0 AND pc.missed_mob_days > 0 THEN
          jsonb_build_array(jsonb_build_object(
            'reason', pc.missed_mob_days || (CASE WHEN pc.missed_mob_days = 1 THEN ' dia sem mobilidade' ELSE ' dias sem mobilidade' END),
            'days', pc.missed_mob_days,
            'points', ROUND(pc.mob_penalty::numeric, 1)
          ))
        ELSE '[]'::jsonb END
        ||
        CASE WHEN pc.inactive_pen_days > 0 THEN
          jsonb_build_array(jsonb_build_object(
            'reason', pc.inactive_streak || (CASE WHEN pc.inactive_streak = 1 THEN ' dia inativo' ELSE ' dias inativo' END) || ' (sem treinos, mobilidade ou mensagens)',
            'days', pc.inactive_pen_days,
            'points', ROUND(pc.inactive_penalty::numeric, 1)
          ))
        ELSE '[]'::jsonb END
      ) AS penalties_jsonb
    FROM penalties_calc pc
  ),
  ranked AS (
    SELECT
      f.sid, f.sname, f.savatar, f.suser,
      GREATEST(1.0, ROUND((f.base_score_calc - f.total_penalty)::numeric, 1)) AS final_score,
      f.base_score_calc, f.total_penalty, f.penalties_jsonb,
      f.load_rate, f.mob_rate, f.msg_rate,
      f.expected_loads, f.actual_loads,
      f.expected_mob, f.actual_mob,
      f.expected_msgs, f.actual_msgs,
      ROW_NUMBER() OVER (ORDER BY GREATEST(1.0, ROUND((f.base_score_calc - f.total_penalty)::numeric, 1)) DESC, f.sname ASC)::int AS pos
    FROM finalc f
  )
  SELECT
    r.sid, r.sname, r.savatar, r.final_score, r.base_score_calc, r.total_penalty, r.penalties_jsonb,
    r.load_rate, r.mob_rate, r.msg_rate,
    r.expected_loads, r.actual_loads, r.expected_mob, r.actual_mob, r.expected_msgs, r.actual_msgs,
    r.pos
  FROM ranked r
  WHERE caller_is_privileged
     OR r.pos <= 4
     OR (caller_uid IS NOT NULL AND r.suser = caller_uid)
  ORDER BY r.pos ASC;
END;
$function$;