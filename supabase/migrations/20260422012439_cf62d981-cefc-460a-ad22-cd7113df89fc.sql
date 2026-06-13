DROP TRIGGER IF EXISTS trg_update_student_1rm ON public.rm_history;
DROP FUNCTION IF EXISTS public.update_student_1rm_on_new_record() CASCADE;