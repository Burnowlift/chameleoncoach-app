
CREATE TABLE public.student_feedback_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('orange','green')),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by_email text,
  week_start date NOT NULL,
  UNIQUE (student_id, card_type, weekday, week_start)
);

CREATE INDEX idx_sfm_student ON public.student_feedback_marks(student_id);
CREATE INDEX idx_sfm_marked_at ON public.student_feedback_marks(marked_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_feedback_marks TO authenticated;
GRANT ALL ON public.student_feedback_marks TO service_role;

ALTER TABLE public.student_feedback_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage feedback marks"
ON public.student_feedback_marks FOR ALL TO authenticated
USING (true) WITH CHECK (true);


CREATE TABLE public.student_feedback_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('orange','green')),
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_email text,
  UNIQUE (student_id, card_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_feedback_notes TO authenticated;
GRANT ALL ON public.student_feedback_notes TO service_role;

ALTER TABLE public.student_feedback_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage feedback notes"
ON public.student_feedback_notes FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_sfn_updated_at
BEFORE UPDATE ON public.student_feedback_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
