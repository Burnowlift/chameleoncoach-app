CREATE TABLE public.ranking_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_avatar TEXT,
  score NUMERIC NOT NULL,
  position INTEGER NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ranking_archive"
ON public.ranking_archive
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_ranking_archive_period ON public.ranking_archive(year, semester, position);