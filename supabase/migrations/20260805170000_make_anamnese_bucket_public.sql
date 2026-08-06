-- Tornar o bucket anamnese-files público para que getPublicUrl() funcione
UPDATE storage.buckets
SET public = true
WHERE id = 'anamnese-files';

-- Remover policy de SELECT restrita (exigia auth.uid() IS NOT NULL)
DROP POLICY IF EXISTS "Authorized users can read anamnese files" ON storage.objects;

-- Adicionar policy de leitura pública (mesmo padrão do bucket avatars)
DROP POLICY IF EXISTS "Anamnese files public read" ON storage.objects;
CREATE POLICY "Anamnese files public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'anamnese-files');
