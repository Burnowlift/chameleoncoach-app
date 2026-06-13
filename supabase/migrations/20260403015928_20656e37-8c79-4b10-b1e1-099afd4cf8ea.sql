
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update their avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete their avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
