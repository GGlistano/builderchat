/*
  # Add Profile Image to Funnels

  1. Changes
    - Add `profile_image_url` column to `funnels` table to store custom profile pictures
    - This allows each funnel to have a personalized WhatsApp-like profile image
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funnels' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE funnels ADD COLUMN profile_image_url text;
  END IF;
END $$;