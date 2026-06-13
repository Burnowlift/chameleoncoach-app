
-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coaches c
    WHERE lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student_owner(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.user_id = auth.uid()
  );
$$;

-- Permitir que essas funções sejam usadas em RLS por usuários autenticados
REVOKE ALL ON FUNCTION public.is_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated, anon, service_role;
REVOKE ALL ON FUNCTION public.is_student_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_owner(uuid) TO authenticated, anon, service_role;

-- Revogar execução pública das funções de gatilho financeiras
REVOKE EXECUTE ON FUNCTION public.update_goal_current_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_contribute_to_goals() FROM PUBLIC, anon, authenticated;

-- ============ COACHES ============
DROP POLICY IF EXISTS "Allow all access to coaches" ON public.coaches;
REVOKE ALL ON public.coaches FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;

CREATE POLICY "Authenticated users can read coaches (self-check)"
  ON public.coaches FOR SELECT TO authenticated
  USING (
    lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    OR public.is_coach()
  );

CREATE POLICY "Coaches can insert coaches"
  ON public.coaches FOR INSERT TO authenticated
  WITH CHECK (public.is_coach());

CREATE POLICY "Coaches can update coaches"
  ON public.coaches FOR UPDATE TO authenticated
  USING (public.is_coach()) WITH CHECK (public.is_coach());

CREATE POLICY "Coaches can delete coaches"
  ON public.coaches FOR DELETE TO authenticated
  USING (public.is_coach());

-- ============ STUDENTS ============
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
REVOKE ALL ON public.students FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

CREATE POLICY "Students see own row, coaches see all"
  ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coach());

CREATE POLICY "Coaches manage students - insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.is_coach());

CREATE POLICY "Coaches and student-self update"
  ON public.students FOR UPDATE TO authenticated
  USING (public.is_coach() OR user_id = auth.uid())
  WITH CHECK (public.is_coach() OR user_id = auth.uid());

CREATE POLICY "Coaches delete students"
  ON public.students FOR DELETE TO authenticated
  USING (public.is_coach());

-- ============ TRAINING_BLOCKS ============
DROP POLICY IF EXISTS "Allow all access to training_blocks" ON public.training_blocks;
REVOKE ALL ON public.training_blocks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_blocks TO authenticated;
GRANT ALL ON public.training_blocks TO service_role;

CREATE POLICY "Student or coach can read training_blocks"
  ON public.training_blocks FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

CREATE POLICY "Coach manage training_blocks - insert"
  ON public.training_blocks FOR INSERT TO authenticated
  WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage training_blocks - update"
  ON public.training_blocks FOR UPDATE TO authenticated
  USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage training_blocks - delete"
  ON public.training_blocks FOR DELETE TO authenticated
  USING (public.is_coach());

-- ============ EXERCISE_LOGS ============
DROP POLICY IF EXISTS "Allow all access to exercise_logs" ON public.exercise_logs;
REVOKE ALL ON public.exercise_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs TO authenticated;
GRANT ALL ON public.exercise_logs TO service_role;

CREATE POLICY "Owner or coach read exercise_logs"
  ON public.exercise_logs FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert exercise_logs"
  ON public.exercise_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update exercise_logs"
  ON public.exercise_logs FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete exercise_logs"
  ON public.exercise_logs FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ SESSION_NOTES ============
DROP POLICY IF EXISTS "Allow all access to session_notes" ON public.session_notes;
REVOKE ALL ON public.session_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;
GRANT ALL ON public.session_notes TO service_role;

CREATE POLICY "Owner or coach read session_notes"
  ON public.session_notes FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert session_notes"
  ON public.session_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update session_notes"
  ON public.session_notes FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete session_notes"
  ON public.session_notes FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ BLOCK_NOTES ============
DROP POLICY IF EXISTS "Allow all access to block_notes" ON public.block_notes;
REVOKE ALL ON public.block_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_notes TO authenticated;
GRANT ALL ON public.block_notes TO service_role;

CREATE POLICY "Owner or coach read block_notes"
  ON public.block_notes FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert block_notes"
  ON public.block_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update block_notes"
  ON public.block_notes FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete block_notes"
  ON public.block_notes FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ WEEK_NOTES ============
DROP POLICY IF EXISTS "Allow all access to week_notes" ON public.week_notes;
REVOKE ALL ON public.week_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.week_notes TO authenticated;
GRANT ALL ON public.week_notes TO service_role;

CREATE POLICY "Owner or coach read week_notes"
  ON public.week_notes FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert week_notes"
  ON public.week_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update week_notes"
  ON public.week_notes FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete week_notes"
  ON public.week_notes FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ RM_HISTORY ============
DROP POLICY IF EXISTS "Allow all access to rm_history" ON public.rm_history;
REVOKE ALL ON public.rm_history FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rm_history TO authenticated;
GRANT ALL ON public.rm_history TO service_role;

CREATE POLICY "Owner or coach read rm_history"
  ON public.rm_history FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert rm_history"
  ON public.rm_history FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update rm_history"
  ON public.rm_history FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete rm_history"
  ON public.rm_history FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ COMPLETED_WEEKS (já existe policy do aluno; adicionar coach) ============
REVOKE ALL ON public.completed_weeks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.completed_weeks TO authenticated;
GRANT ALL ON public.completed_weeks TO service_role;

CREATE POLICY "Coaches can read completed_weeks"
  ON public.completed_weeks FOR SELECT TO authenticated
  USING (public.is_coach());
CREATE POLICY "Coaches can manage completed_weeks - insert"
  ON public.completed_weeks FOR INSERT TO authenticated
  WITH CHECK (public.is_coach());
CREATE POLICY "Coaches can manage completed_weeks - update"
  ON public.completed_weeks FOR UPDATE TO authenticated
  USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coaches can manage completed_weeks - delete"
  ON public.completed_weeks FOR DELETE TO authenticated
  USING (public.is_coach());

-- ============ MOBILITY_LOGS ============
DROP POLICY IF EXISTS "Allow all access to mobility_logs" ON public.mobility_logs;
REVOKE ALL ON public.mobility_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobility_logs TO authenticated;
GRANT ALL ON public.mobility_logs TO service_role;

CREATE POLICY "Owner or coach read mobility_logs"
  ON public.mobility_logs FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach insert mobility_logs"
  ON public.mobility_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach update mobility_logs"
  ON public.mobility_logs FOR UPDATE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id))
  WITH CHECK (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Owner or coach delete mobility_logs"
  ON public.mobility_logs FOR DELETE TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));

-- ============ STUDENT_MOBILITY ============
DROP POLICY IF EXISTS "Allow all access to student_mobility" ON public.student_mobility;
REVOKE ALL ON public.student_mobility FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_mobility TO authenticated;
GRANT ALL ON public.student_mobility TO service_role;

CREATE POLICY "Owner or coach read student_mobility"
  ON public.student_mobility FOR SELECT TO authenticated
  USING (public.is_coach() OR public.is_student_owner(student_id));
CREATE POLICY "Coach insert student_mobility"
  ON public.student_mobility FOR INSERT TO authenticated
  WITH CHECK (public.is_coach());
CREATE POLICY "Coach update student_mobility"
  ON public.student_mobility FOR UPDATE TO authenticated
  USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach delete student_mobility"
  ON public.student_mobility FOR DELETE TO authenticated
  USING (public.is_coach());

-- ============ EXERCISES (catálogo) ============
DROP POLICY IF EXISTS "Allow all access to exercises" ON public.exercises;
REVOKE ALL ON public.exercises FROM anon;
GRANT SELECT ON public.exercises TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;

CREATE POLICY "Authenticated read exercises"
  ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach manage exercises - insert"
  ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage exercises - update"
  ON public.exercises FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage exercises - delete"
  ON public.exercises FOR DELETE TO authenticated USING (public.is_coach());

-- ============ WORKOUT_TEMPLATES ============
DROP POLICY IF EXISTS "Allow all access to workout_templates" ON public.workout_templates;
REVOKE ALL ON public.workout_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;

CREATE POLICY "Authenticated read workout_templates"
  ON public.workout_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach manage workout_templates - insert"
  ON public.workout_templates FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage workout_templates - update"
  ON public.workout_templates FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage workout_templates - delete"
  ON public.workout_templates FOR DELETE TO authenticated USING (public.is_coach());

-- ============ MOBILITY_EXERCISES ============
DROP POLICY IF EXISTS "Allow all access to mobility_exercises" ON public.mobility_exercises;
REVOKE ALL ON public.mobility_exercises FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobility_exercises TO authenticated;
GRANT ALL ON public.mobility_exercises TO service_role;

CREATE POLICY "Authenticated read mobility_exercises"
  ON public.mobility_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach manage mobility_exercises - insert"
  ON public.mobility_exercises FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_exercises - update"
  ON public.mobility_exercises FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_exercises - delete"
  ON public.mobility_exercises FOR DELETE TO authenticated USING (public.is_coach());

-- ============ MOBILITY_TEMPLATES ============
DROP POLICY IF EXISTS "Allow all access to mobility_templates" ON public.mobility_templates;
REVOKE ALL ON public.mobility_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobility_templates TO authenticated;
GRANT ALL ON public.mobility_templates TO service_role;

CREATE POLICY "Authenticated read mobility_templates"
  ON public.mobility_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach manage mobility_templates - insert"
  ON public.mobility_templates FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_templates - update"
  ON public.mobility_templates FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_templates - delete"
  ON public.mobility_templates FOR DELETE TO authenticated USING (public.is_coach());

-- ============ MOBILITY_TEMPLATE_ITEMS ============
DROP POLICY IF EXISTS "Allow all access to mobility_template_items" ON public.mobility_template_items;
REVOKE ALL ON public.mobility_template_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobility_template_items TO authenticated;
GRANT ALL ON public.mobility_template_items TO service_role;

CREATE POLICY "Authenticated read mobility_template_items"
  ON public.mobility_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach manage mobility_template_items - insert"
  ON public.mobility_template_items FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_template_items - update"
  ON public.mobility_template_items FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage mobility_template_items - delete"
  ON public.mobility_template_items FOR DELETE TO authenticated USING (public.is_coach());

-- ============ FINANCE_* (coach only) ============
DROP POLICY IF EXISTS "Allow all access to finance_categories" ON public.finance_categories;
DROP POLICY IF EXISTS "Allow all access to finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Allow all access to finance_recurrences" ON public.finance_recurrences;
DROP POLICY IF EXISTS "Allow all access to finance_goals" ON public.finance_goals;
DROP POLICY IF EXISTS "Allow all access to finance_goal_contributions" ON public.finance_goal_contributions;

REVOKE ALL ON public.finance_categories, public.finance_transactions, public.finance_recurrences, public.finance_goals, public.finance_goal_contributions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories, public.finance_transactions, public.finance_recurrences, public.finance_goals, public.finance_goal_contributions TO authenticated;
GRANT ALL ON public.finance_categories, public.finance_transactions, public.finance_recurrences, public.finance_goals, public.finance_goal_contributions TO service_role;

CREATE POLICY "Coach manage finance_categories"
  ON public.finance_categories FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage finance_transactions"
  ON public.finance_transactions FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage finance_recurrences"
  ON public.finance_recurrences FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage finance_goals"
  ON public.finance_goals FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage finance_goal_contributions"
  ON public.finance_goal_contributions FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());

-- ============ STUDENT_FEEDBACK_* (coach only) ============
DROP POLICY IF EXISTS "Authenticated can manage feedback marks" ON public.student_feedback_marks;
DROP POLICY IF EXISTS "Authenticated can manage feedback notes" ON public.student_feedback_notes;

REVOKE ALL ON public.student_feedback_marks, public.student_feedback_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_feedback_marks, public.student_feedback_notes TO authenticated;
GRANT ALL ON public.student_feedback_marks, public.student_feedback_notes TO service_role;

CREATE POLICY "Coach manage student_feedback_marks"
  ON public.student_feedback_marks FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach manage student_feedback_notes"
  ON public.student_feedback_notes FOR ALL TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());

-- ============ PODIUM_EVENTS (leitura pública, escrita coach) ============
DROP POLICY IF EXISTS "Allow all access to podium_events" ON public.podium_events;
GRANT SELECT ON public.podium_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.podium_events TO authenticated;
GRANT ALL ON public.podium_events TO service_role;

CREATE POLICY "Public read podium_events"
  ON public.podium_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Coach insert podium_events"
  ON public.podium_events FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach update podium_events"
  ON public.podium_events FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach delete podium_events"
  ON public.podium_events FOR DELETE TO authenticated USING (public.is_coach());

-- ============ RANKING_ARCHIVE (leitura pública, escrita coach) ============
DROP POLICY IF EXISTS "Allow all access to ranking_archive" ON public.ranking_archive;
GRANT SELECT ON public.ranking_archive TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ranking_archive TO authenticated;
GRANT ALL ON public.ranking_archive TO service_role;

CREATE POLICY "Public read ranking_archive"
  ON public.ranking_archive FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Coach insert ranking_archive"
  ON public.ranking_archive FOR INSERT TO authenticated WITH CHECK (public.is_coach());
CREATE POLICY "Coach update ranking_archive"
  ON public.ranking_archive FOR UPDATE TO authenticated USING (public.is_coach()) WITH CHECK (public.is_coach());
CREATE POLICY "Coach delete ranking_archive"
  ON public.ranking_archive FOR DELETE TO authenticated USING (public.is_coach());

-- ============ STORAGE.OBJECTS - avatars bucket ============
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars owner or coach insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatars owner or coach update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars owner or coach delete" ON storage.objects;

CREATE POLICY "Avatars public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatars owner or coach insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_coach()
      OR public.is_student_owner( (storage.foldername(name))[1]::uuid )
    )
  );

CREATE POLICY "Avatars owner or coach update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_coach()
      OR public.is_student_owner( (storage.foldername(name))[1]::uuid )
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_coach()
      OR public.is_student_owner( (storage.foldername(name))[1]::uuid )
    )
  );

CREATE POLICY "Avatars owner or coach delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_coach()
      OR public.is_student_owner( (storage.foldername(name))[1]::uuid )
    )
  );
