-- ═══════════════════════════════════════════════════════════════════
-- Segurança: tornar o bucket de anamnese privado (H-1)
-- Fotos e documentos de saúde (RG, cirurgias) não podem ser públicos.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Remove o acesso público do bucket
UPDATE storage.buckets
SET public = false
WHERE id = 'anamnese-files';

-- 2) Remove as policies permissivas
DROP POLICY IF EXISTS "Anamnese files public read" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload anamnese files" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read anamnese files" ON storage.objects;

-- 3) Leitura: o próprio aluno (pasta com o id dele) e treinadores
CREATE POLICY "Anamnese owner can read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'anamnese-files'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid()
        AND (name LIKE s.id::text || '/%' OR name LIKE 'fotos/' || s.id::text || '/%')
    )
  );

CREATE POLICY "Anamnese coach can read student files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anamnese-files' AND public.is_coach());

-- 4) Upload: somente o próprio aluno, na própria pasta
CREATE POLICY "Anamnese owner can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anamnese-files'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid()
        AND (name LIKE s.id::text || '/%' OR name LIKE 'fotos/' || s.id::text || '/%')
    )
  );

-- 5) Limpeza: converte URLs públicas antigas armazenadas em caminhos relativos
-- (o frontend passa a resolver via signed URL a partir do caminho)
UPDATE public.anamneses
SET limitacao_arquivo_url = regexp_replace(
      limitacao_arquivo_url,
      '^https?://[^/]+/storage/v1/object/public/anamnese-files/',
      ''
    )
WHERE limitacao_arquivo_url LIKE '%/storage/v1/object/public/anamnese-files/%';

UPDATE public.anamneses
SET fotos = (
  SELECT COALESCE(jsonb_agg(
      regexp_replace(
        f,
        '^https?://[^/]+/storage/v1/object/public/anamnese-files/',
        ''
      )
    ), '[]'::jsonb)
  FROM jsonb_array_elements_text(fotos) AS f
)
WHERE jsonb_typeof(fotos) = 'array'
  AND fotos::text LIKE '%/storage/v1/object/public/anamnese-files/%';
