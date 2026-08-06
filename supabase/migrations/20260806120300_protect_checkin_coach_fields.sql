-- ═══════════════════════════════════════════════════════════════════
-- Segurança: proteger campos do treinador em weekly_checkins (M-2)
-- Aluno não pode sobrescrever coach_comment / coach_commented_at.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_protect_checkin_coach_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando quem está atualizando é o aluno dono do check-in,
  -- restaura os campos que pertencem ao treinador.
  IF public.is_student_owner(NEW.student_id) AND NOT public.is_coach() THEN
    NEW.coach_comment := OLD.coach_comment;
    NEW.coach_commented_at := OLD.coach_commented_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_checkin_coach_fields ON weekly_checkins;
CREATE TRIGGER trg_protect_checkin_coach_fields
  BEFORE UPDATE ON weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_checkin_coach_fields();
