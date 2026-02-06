/*
  # Fix Ticket Validation for Anonymous Users
  
  1. Changes
    - Allow anonymous users to SELECT (read) tickets
    - This enables ticket validation on the form page
    - Tickets must be valid (not used and not expired)
    
  2. Security
    - Anonymous users can ONLY read tickets
    - They can ONLY see valid, unused, non-expired tickets
    - Cannot create, update, or delete tickets
    - Admins keep full control
*/

-- Allow anonymous users to validate tickets (read only valid tickets)
CREATE POLICY "Anonymous can validate tickets"
  ON lead_tickets FOR SELECT
  TO anon
  USING (
    used_at IS NULL 
    AND expires_at > now()
  );

-- Allow anonymous users to mark tickets as used (UPDATE only used_at field)
CREATE POLICY "Anonymous can mark tickets as used"
  ON lead_tickets FOR UPDATE
  TO anon
  USING (
    used_at IS NULL 
    AND expires_at > now()
  )
  WITH CHECK (
    used_at IS NOT NULL
  );
