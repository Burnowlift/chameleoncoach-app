
CREATE TABLE public.student_password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  coach_email text NOT NULL,
  reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.student_password_reset_audit TO authenticated;
GRANT ALL ON public.student_password_reset_audit TO service_role;

ALTER TABLE public.student_password_reset_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view password reset audit"
ON public.student_password_reset_audit
FOR SELECT
TO authenticated
USING (public.is_coach() OR public.is_super_admin());

CREATE INDEX idx_student_password_reset_audit_student ON public.student_password_reset_audit(student_id, reset_at DESC);
