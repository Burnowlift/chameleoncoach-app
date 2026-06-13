CREATE TABLE public.workout_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  category TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to workout_templates"
ON public.workout_templates
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_workout_templates_updated_at
BEFORE UPDATE ON public.workout_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();