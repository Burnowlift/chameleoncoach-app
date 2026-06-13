ALTER TABLE public.students DISABLE TRIGGER USER;
UPDATE public.students SET user_id = '74e08644-1f59-4ab0-b9ac-c50b5f03509e' WHERE id = 'd920a073-219e-4fe7-8b5a-914470dcfd46';
ALTER TABLE public.students ENABLE TRIGGER USER;