/*
  # Add Facebook Test Event Code

  1. Changes
    - Add `facebook_test_event_code` column to `funnels` table
    - This field is used for testing Facebook Pixel events in Test Events tool
    - Optional field, only used during development/testing phase
  
  2. Notes
    - Test event codes are provided by Facebook Events Manager
    - Used to validate events are being sent correctly before going live
    - Example format: TEST44574
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funnels' AND column_name = 'facebook_test_event_code'
  ) THEN
    ALTER TABLE funnels ADD COLUMN facebook_test_event_code text;
  END IF;
END $$;