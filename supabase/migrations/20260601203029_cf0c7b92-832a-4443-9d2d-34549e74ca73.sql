-- ACL: coach permissions matrix
CREATE TABLE public.coach_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (coach_id, menu_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_permissions TO authenticated;
GRANT ALL ON public.coach_permissions TO service_role;

ALTER TABLE public.coach_permissions ENABLE ROW LEVEL SECURITY;

-- Super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = 'brunorodriguesconsul@gmail.com';
$$;

-- Has menu access (super admin always true)
CREATE OR REPLACE FUNCTION public.has_menu_access(_menu text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.coach_permissions cp
    JOIN public.coaches c ON c.id = cp.coach_id
    WHERE lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      AND cp.menu_key = _menu
      AND cp.allowed = true
  );
$$;

-- RLS: coach can read own permissions; super admin reads/writes all
CREATE POLICY "Coach reads own permissions"
ON public.coach_permissions
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR coach_id IN (
    SELECT id FROM public.coaches
    WHERE lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
);

CREATE POLICY "Super admin inserts permissions"
ON public.coach_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin updates permissions"
ON public.coach_permissions
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin deletes permissions"
ON public.coach_permissions
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- updated_at trigger
CREATE TRIGGER update_coach_permissions_updated_at
BEFORE UPDATE ON public.coach_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed finance viewer: ensure coach row + grant finances
INSERT INTO public.coaches (email)
SELECT 'pedro04vitorrodrigues@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.coaches WHERE lower(email) = 'pedro04vitorrodrigues@gmail.com'
);

INSERT INTO public.coach_permissions (coach_id, menu_key, allowed)
SELECT c.id, 'finances', true
FROM public.coaches c
WHERE lower(c.email) = 'pedro04vitorrodrigues@gmail.com'
ON CONFLICT (coach_id, menu_key) DO UPDATE SET allowed = true;