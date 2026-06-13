CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to coaches" ON public.coaches FOR ALL TO public USING (true) WITH CHECK (true);