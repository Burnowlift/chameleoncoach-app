-- Permitir que o coach delete e atualize anamneses (para funcionalidade "Solicitar Nova Anamnese")
CREATE POLICY "Coach can delete anamneses"
  ON anamneses FOR DELETE
  USING (is_coach());

CREATE POLICY "Coach can update anamneses"
  ON anamneses FOR UPDATE
  USING (is_coach())
  WITH CHECK (is_coach());
