-- ═══════════════════════════════════════════════════════════════════
-- Janela de check-in (sábado 08:00 → segunda-feira 23:59) + notificação
-- de fichas de treino próximas do vencimento (M-10)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Sincronização automática de check-ins ──────────────────────
-- Disponibiliza o check-in da semana no sábado às 08:00 (fuso do aluno)
-- e encerra automaticamente ao final da segunda-feira (23:59).
-- Idempotente (ON CONFLICT) e seguro para rodar a qualquer momento:
-- funciona sem pg_cron, sendo chamada pelo app (best-effort).
CREATE OR REPLACE FUNCTION public.fn_sync_weekly_checkins(p_student_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Autorização: aluno apenas para si mesmo; treinador para todos.
  -- (auth.uid() é nulo apenas em contexto de serviço, ex.: pg_cron.)
  IF p_student_id IS NULL THEN
    IF NOT (auth.uid() IS NULL OR public.is_coach()) THEN
      RAISE EXCEPTION 'Sem permissão para sincronizar check-ins.';
    END IF;
  ELSE
    IF NOT (auth.uid() IS NULL OR public.is_student_owner(p_student_id) OR public.is_coach()) THEN
      RAISE EXCEPTION 'Sem permissão para sincronizar o check-in deste aluno.';
    END IF;
  END IF;

  -- 1) Encerra check-ins pendentes vencidos (após segunda-feira 23:59)
  UPDATE public.weekly_checkins
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  -- 2) Disponibiliza o check-in da semana atual (sábado 08:00 → segunda 23:59)
  INSERT INTO public.weekly_checkins (student_id, week_start, available_at, expires_at)
  SELECT
    s.id,
    ws.week_start,
    ws.saturday_0800,
    ws.monday_2359
  FROM public.students s
  CROSS JOIN LATERAL (
    SELECT
      date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'))::date AS week_start,
      (date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'))
        + interval '5 days 8 hours') AS saturday_0800,
      (date_trunc('week', now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo'))
        + interval '7 days 23 hours 59 minutes') AS monday_2359
  ) ws
  WHERE s.status = 'active'
    AND s.anamnese_completed = true
    AND (p_student_id IS NULL OR s.id = p_student_id)
    AND now() AT TIME ZONE COALESCE(s.timezone, 'America/Sao_Paulo')
        BETWEEN ws.saturday_0800 AND ws.monday_2359
  ON CONFLICT (student_id, week_start) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_sync_weekly_checkins(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sync_weekly_checkins(uuid) TO authenticated;

-- ─── 2. Notificação de ficha de treino próxima do vencimento ───────
-- Para cada aluno ativo, considera a ficha mais recente (training_blocks
-- com maior created_at) e notifica o(s) treinador(es) quando faltam 0–3
-- dias para o vencimento (created_at + semanas montadas * 7 dias).
-- Evita duplicatas: no máximo uma notificação por (treinador, aluno, data).
CREATE OR REPLACE FUNCTION public.fn_notify_training_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_coach_email text;
  v_coach_user_id uuid;
  v_weeks int;
  v_end_date date;
  v_days int;
  v_plan_label text;
  v_body text;
  v_duplicate boolean;
BEGIN
  IF NOT (auth.uid() IS NULL OR public.is_coach()) THEN
    RAISE EXCEPTION 'Sem permissão para gerar notificações.';
  END IF;

  FOR v_student IN
    SELECT DISTINCT ON (t.student_id)
      t.student_id,
      t.created_at::date AS start_date,
      t.week_sessions,
      s.name AS student_name,
      s.plan,
      s.plan_duration
    FROM public.training_blocks t
    INNER JOIN public.students s ON s.id = t.student_id
    WHERE s.status = 'active'
    ORDER BY t.student_id, t.created_at DESC
  LOOP
    v_weeks := jsonb_object_length(COALESCE(v_student.week_sessions, '{}'::jsonb));
    IF v_weeks = 0 THEN CONTINUE; END IF;

    v_end_date := v_student.start_date + v_weeks * 7; -- date + integer = dias
    v_days := v_end_date - CURRENT_DATE;

    -- Avisa apenas fichas que vencem em até 3 dias (inclui hoje); ignora vencidas
    IF v_days < 0 OR v_days > 3 THEN CONTINUE; END IF;

    v_plan_label := v_student.plan;
    IF v_student.plan_duration IS NOT NULL AND v_student.plan_duration <> '' THEN
      v_plan_label := v_plan_label || ' · ' || v_student.plan_duration;
    END IF;

    IF v_days = 0 THEN
      v_body := '⚠️ A ficha de treino de ' || v_student.student_name
        || ' (Plano: ' || v_plan_label || ') expira hoje.';
    ELSE
      v_body := '⚠️ A ficha de treino de ' || v_student.student_name
        || ' (Plano: ' || v_plan_label || ') expira em ' || v_days
        || CASE WHEN v_days = 1 THEN ' dia' ELSE ' dias' END || '.';
    END IF;

    FOR v_coach_email IN
      SELECT c.email
      FROM public.coaches c
      INNER JOIN public.students s ON s.coach_id = c.id
      WHERE s.id = v_student.student_id
    LOOP
      SELECT public.find_auth_user_id_by_email(v_coach_email) INTO v_coach_user_id;
      IF v_coach_user_id IS NULL THEN CONTINUE; END IF;

      -- Evita duplicatas para o mesmo treinador + aluno + data de vencimento
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_coach_user_id
          AND type = 'training_expiry'
          AND metadata->>'student_id' = v_student.student_id::text
          AND metadata->>'end_date' = v_end_date::text
      ) INTO v_duplicate;
      IF v_duplicate THEN CONTINUE; END IF;

      INSERT INTO public.notifications (user_id, type, title, body, metadata)
      VALUES (
        v_coach_user_id,
        'training_expiry',
        'Ficha de treino próxima do vencimento',
        v_body,
        jsonb_build_object('student_id', v_student.student_id, 'end_date', v_end_date::text)
      );
    END LOOP;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_notify_training_expiry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_notify_training_expiry() TO authenticated;

-- ─── 3. pg_cron (best-effort) ──────────────────────────────────────
-- Se a extensão estiver disponível, agenda os jobs em horário fixo.
-- Mesmo sem pg_cron o comportamento é garantido pelo app (RPC acima).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível; sincronização via cliente ativa.';
END $$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('sync-weekly-checkins', '0 * * * *',
      $$SELECT public.fn_sync_weekly_checkins();$$);
    PERFORM cron.schedule('notify-training-expiry', '0 8 * * *',
      $$SELECT public.fn_notify_training_expiry();$$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Falha ao agendar jobs no pg_cron: %', SQLERRM;
END $do$;
