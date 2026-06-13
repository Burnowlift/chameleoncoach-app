-- Enable RLS on realtime.messages (Supabase Realtime Authorization)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop our policies if they already exist so this migration is idempotent
DROP POLICY IF EXISTS "Authenticated can read own-scoped realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write own-scoped realtime topics" ON realtime.messages;

-- Helper: returns true if the topic is scoped to the caller (student) or caller is coach/admin.
-- Our channels are named e.g. `rm_history_<studentId>`, `students-block-end`, `strength-ranking-students`.
-- We allow:
--   * coaches / super admin → any topic
--   * students             → only topics that contain their own student.id
CREATE POLICY "Authenticated can read own-scoped realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_coach()
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.user_id = auth.uid()
      AND (realtime.topic() LIKE '%' || s.id::text || '%')
  )
);

CREATE POLICY "Authenticated can write own-scoped realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coach()
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.user_id = auth.uid()
      AND (realtime.topic() LIKE '%' || s.id::text || '%')
  )
);
