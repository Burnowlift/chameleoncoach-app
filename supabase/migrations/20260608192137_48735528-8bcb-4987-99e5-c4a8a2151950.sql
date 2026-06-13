CREATE OR REPLACE FUNCTION public.prevent_student_sensitive_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Funções internas confiáveis usam service_role e precisam vincular auth.users ao aluno.
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Treinadores podem tudo.
  IF public.is_coach() THEN
    RETURN NEW;
  END IF;

  -- Aluno mexendo no próprio registro: bloqueia campos sensíveis.
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_value IS DISTINCT FROM OLD.plan_value
     OR NEW.payment_due_date IS DISTINCT FROM OLD.payment_due_date
     OR NEW.payment_note IS DISTINCT FROM OLD.payment_note
     OR NEW.renewal_day IS DISTINCT FROM OLD.renewal_day
     OR NEW.renewal_note IS DISTINCT FROM OLD.renewal_note
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.has_nutritionist IS DISTINCT FROM OLD.has_nutritionist
     OR NEW.coach_name IS DISTINCT FROM OLD.coach_name
     OR NEW.service_type IS DISTINCT FROM OLD.service_type
     OR NEW.periodicity IS DISTINCT FROM OLD.periodicity
     OR NEW.team IS DISTINCT FROM OLD.team
     OR NEW.joined_at IS DISTINCT FROM OLD.joined_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.cpf IS DISTINCT FROM OLD.cpf
  THEN
    RAISE EXCEPTION 'Alunos não podem alterar campos administrativos do próprio cadastro.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;