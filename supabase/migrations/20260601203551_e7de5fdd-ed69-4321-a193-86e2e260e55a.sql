CREATE TABLE public.coach_permission_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  old_allowed boolean,
  new_allowed boolean NOT NULL,
  changed_by_email text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_permission_audit_coach ON public.coach_permission_audit(coach_id, changed_at DESC);

GRANT SELECT, INSERT, DELETE ON public.coach_permission_audit TO authenticated;
GRANT ALL ON public.coach_permission_audit TO service_role;

ALTER TABLE public.coach_permission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads audit"
ON public.coach_permission_audit
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin inserts audit"
ON public.coach_permission_audit
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin deletes audit"
ON public.coach_permission_audit
FOR DELETE
TO authenticated
USING (public.is_super_admin());