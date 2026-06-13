
-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  muscle_group_2 TEXT,
  muscle_group_3 TEXT,
  sbd TEXT CHECK (sbd IN ('squat', 'bench', 'deadlift')),
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  state TEXT,
  avatar TEXT,
  plan TEXT NOT NULL,
  plan_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expiring')),
  joined_at DATE NOT NULL DEFAULT now(),
  payment_due_date DATE,
  squat_1rm NUMERIC NOT NULL DEFAULT 0,
  bench_1rm NUMERIC NOT NULL DEFAULT 0,
  deadlift_1rm NUMERIC NOT NULL DEFAULT 0,
  renewal_day TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- For now, allow all access (no auth yet)
CREATE POLICY "Allow all access to exercises" ON public.exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
