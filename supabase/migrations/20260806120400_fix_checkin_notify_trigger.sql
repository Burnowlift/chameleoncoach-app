-- ═══════════════════════════════════════════════════════════════════
-- Segurança/correção: trigger de notificação do check-in (M-3)
-- Antes: usava coaches.id como user_id da notificação — mas coaches.id
-- não é o auth.users.id (o coach nunca recebia a notificação).
-- Agora: resolve o auth user id via find_auth_user_id_by_email.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_notify_checkin_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_coach_email text;
  v_coach_user_id uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;

    -- Notifica todos os coaches vinculados ao aluno, resolvendo o auth user id
    FOR v_coach_email IN
      SELECT c.email
      FROM public.coaches c
      INNER JOIN public.students s ON s.coach_id = c.id
      WHERE s.id = NEW.student_id
    LOOP
      SELECT public.find_auth_user_id_by_email(v_coach_email) INTO v_coach_user_id;
      IF v_coach_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
          v_coach_user_id,
          'checkin_response',
          'Check-in respondido',
          v_student_name || ' respondeu o check-in semanal',
          jsonb_build_object('student_id', NEW.student_id, 'checkin_id', NEW.id)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_checkin_response ON weekly_checkins;
CREATE TRIGGER trg_notify_checkin_response
  AFTER UPDATE ON weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_checkin_response();
