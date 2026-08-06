-- ═══════════════════════════════════════════════════════════════════
-- Segurança: fechar INSERT aberto em notifications/weekly_checkins (M-1)
-- Antes: políticas de INSERT sem TO valiam para anon.
-- Agora: notifications só via service_role; weekly_checkins via
-- treinador (recurso "Forçar check-in") ou service_role.
-- ═══════════════════════════════════════════════════════════════════

-- ─── notifications ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ─── weekly_checkins ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Service can insert checkins" ON weekly_checkins;

CREATE POLICY "Coach can insert checkins"
  ON weekly_checkins FOR INSERT TO authenticated
  WITH CHECK (is_coach());

CREATE POLICY "Service can insert checkins"
  ON weekly_checkins FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON public.weekly_checkins FROM anon;
GRANT SELECT, UPDATE ON public.weekly_checkins TO authenticated;
GRANT ALL ON public.weekly_checkins TO service_role;
