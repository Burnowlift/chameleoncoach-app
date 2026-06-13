CREATE TABLE public.podium_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_avatar TEXT,
  position INTEGER NOT NULL,
  score NUMERIC NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT podium_events_unique UNIQUE (student_id, position, year, semester)
);

ALTER TABLE public.podium_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to podium_events"
ON public.podium_events
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_podium_events_recent ON public.podium_events(detected_at DESC);