/*
  # Add Utmify API Token

  1. Changes
    - Add `utmify_api_token` column to `funnels` table
    - This field stores the Utmify API token for sending conversion events
  
  2. Notes
    - Optional field
    - Used for integrating with Utmify tracking platform
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funnels' AND column_name = 'utmify_api_token'
  ) THEN
    ALTER TABLE funnels ADD COLUMN utmify_api_token text;
  END IF;
END $$;