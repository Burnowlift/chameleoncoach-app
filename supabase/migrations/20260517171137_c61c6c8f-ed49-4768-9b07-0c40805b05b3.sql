
CREATE TABLE public.mobility_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  session_count integer NOT NULL DEFAULT 1,
  session_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.mobility_template_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.mobility_templates(id) ON DELETE CASCADE,
  mobility_exercise_id uuid REFERENCES public.mobility_exercises(id) ON DELETE SET NULL,
  name text NOT NULL,
  area text,
  video_url text,
  prescription text,
  position integer NOT NULL DEFAULT 0,
  session_index integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobility_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to mobility_templates" ON public.mobility_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to mobility_template_items" ON public.mobility_template_items FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_mobility_templates_updated_at
BEFORE UPDATE ON public.mobility_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mobility_template_items_template ON public.mobility_template_items(template_id);
