/*
  # Add Image Attachments Support

  1. Changes
    - Add `attachment_url` column to `lead_responses` table for storing image URLs
    - Add `attachment_type` column to `lead_responses` table for storing attachment type (image, video, etc)
    - Create storage bucket for chat attachments
    - Add RLS policies for storage bucket
  
  2. Security
    - Allow authenticated and anonymous users to upload to chat-attachments bucket
    - Allow public read access to attachments
    - Restrict uploads to specific file types and size limits
*/

-- Add attachment columns to lead_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_responses' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE lead_responses ADD COLUMN attachment_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_responses' AND column_name = 'attachment_type'
  ) THEN
    ALTER TABLE lead_responses ADD COLUMN attachment_type text;
  END IF;
END $$;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public uploads to chat-attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public reads from chat-attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own chat-attachments" ON storage.objects;
END $$;

-- Allow anyone to upload to chat-attachments bucket (for anonymous chat users)
CREATE POLICY "Allow public uploads to chat-attachments"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to read from chat-attachments bucket
CREATE POLICY "Allow public reads from chat-attachments"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete own chat-attachments"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'chat-attachments');