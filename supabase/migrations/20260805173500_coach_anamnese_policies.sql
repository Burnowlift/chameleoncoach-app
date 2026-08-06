-- Permitir que o coach delete e atualize anamneses (para funcionalidade "Solicitar Nova Anamnese")
DROP POLICY IF EXISTS "Coach can delete anamneses" ON anamneses;
CREATE POLICY "Coach can delete anamneses"
  ON anamneses FOR DELETE
  USING (is_coach());

DROP POLICY IF EXISTS "Coach can update anamneses" ON anamneses;
CREATE POLICY "Coach can update anamneses"
  ON anamneses FOR UPDATE
  USING (is_coach())
  WITH CHECK (is_coach());
