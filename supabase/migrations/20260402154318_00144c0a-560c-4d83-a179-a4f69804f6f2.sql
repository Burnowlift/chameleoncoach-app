
CREATE OR REPLACE FUNCTION public.update_student_1rm_on_new_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_max numeric;
BEGIN
  -- Get the current max estimated_1rm for this student and sbd_type
  SELECT COALESCE(MAX(estimated_1rm), 0) INTO current_max
  FROM rm_history
  WHERE student_id = NEW.student_id AND sbd_type = NEW.sbd_type;

  -- Only update if the new record is >= current max (i.e. it's a PR or equal)
  IF NEW.estimated_1rm >= current_max THEN
    IF NEW.sbd_type = 'squat' THEN
      UPDATE students SET squat_1rm = NEW.estimated_1rm WHERE id = NEW.student_id;
    ELSIF NEW.sbd_type = 'bench' THEN
      UPDATE students SET bench_1rm = NEW.estimated_1rm WHERE id = NEW.student_id;
    ELSIF NEW.sbd_type = 'deadlift' THEN
      UPDATE students SET deadlift_1rm = NEW.estimated_1rm WHERE id = NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_student_1rm
AFTER INSERT ON public.rm_history
FOR EACH ROW
EXECUTE FUNCTION public.update_student_1rm_on_new_record();
