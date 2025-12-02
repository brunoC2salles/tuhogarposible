-- Create bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Policy to allow authenticated users to upload chat files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow anyone to view chat files
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Policy to allow users to delete their own chat files
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);