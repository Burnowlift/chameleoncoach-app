
-- Add user_id column to students
ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_students_user_id ON public.students(user_id);
