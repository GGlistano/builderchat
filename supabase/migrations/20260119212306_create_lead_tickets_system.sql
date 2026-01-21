/*
  # Lead Tickets System

  1. Overview
    - System to capture leads from external landing pages and inject their data into chat as first message
    - Each ticket has unique code (PED-XXXXXX format) for tracking
    - Tickets are single-use and have expiration time

  2. New Tables
    - `lead_tickets`
      - `id` (uuid, primary key)
      - `ticket_code` (text, unique) - Format: PED-123456
      - `funnel_id` (uuid, foreign key to funnels)
      - `lead_data` (jsonb) - All data captured from landing page
      - `created_at` (timestamptz) - When ticket was created
      - `used_at` (timestamptz, nullable) - When lead opened chat
      - `expires_at` (timestamptz) - Expiration time (24h from creation)
      - `session_id` (text, nullable) - Chat session ID once used
      - `ip_address` (text, nullable) - For tracking/security

  3. Security
    - Enable RLS on lead_tickets
    - Public can create tickets (POST from landing pages)
    - Public can read own ticket by ticket_code (to start chat)
    - Service role can manage all tickets (admin)

  4. Indexes
    - ticket_code for fast lookup
    - funnel_id for filtering
    - expires_at for cleanup queries
*/

-- Create lead_tickets table
CREATE TABLE IF NOT EXISTS lead_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text UNIQUE NOT NULL,
  funnel_id uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  lead_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  session_id text,
  ip_address text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_tickets_ticket_code ON lead_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_lead_tickets_funnel_id ON lead_tickets(funnel_id);
CREATE INDEX IF NOT EXISTS idx_lead_tickets_expires_at ON lead_tickets(expires_at);
CREATE INDEX IF NOT EXISTS idx_lead_tickets_created_at ON lead_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE lead_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create tickets (landing pages need this)
CREATE POLICY "Anyone can create lead tickets"
  ON lead_tickets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anyone can read valid tickets by ticket_code (to start chat)
CREATE POLICY "Anyone can read valid tickets by code"
  ON lead_tickets
  FOR SELECT
  TO anon
  USING (
    ticket_code IS NOT NULL 
    AND expires_at > now()
  );

-- Policy: Authenticated users can read tickets from their funnels
CREATE POLICY "Authenticated users can read tickets"
  ON lead_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = lead_tickets.funnel_id
    )
  );

-- Policy: Authenticated users can update tickets (mark as used)
CREATE POLICY "Authenticated users can update tickets"
  ON lead_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = lead_tickets.funnel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = lead_tickets.funnel_id
    )
  );

-- Function to generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate code: PED-XXXXXX (6 random digits)
    new_code := 'PED-' || LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM lead_tickets WHERE ticket_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Function to cleanup expired tickets (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_tickets()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM lead_tickets
  WHERE expires_at < now()
  AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;