/*
  # Add Tracking and Attribution Fields to Lead Tickets

  1. Changes to `lead_tickets` table
    - Add `attribution_id` (uuid) - Unique ID for attribution tracking persistence
    - Add `utm_source` (text) - Marketing source parameter
    - Add `utm_medium` (text) - Marketing medium parameter
    - Add `utm_campaign` (text) - Marketing campaign parameter
    - Add `utm_content` (text) - Marketing content parameter
    - Add `utm_term` (text) - Marketing term parameter
    - Add `fbclid` (text) - Facebook Click ID
    - Add `fbp` (text) - Facebook Browser ID cookie (_fbp)
    - Add `fbc` (text) - Facebook Click ID cookie (_fbc)
    - Add `first_landing_page` (text) - First page user landed on
    - Add `first_referrer` (text) - First referrer URL
    - Add `last_landing_page` (text) - Last page user landed on
    - Add `last_referrer` (text) - Last referrer URL
    - Add `user_agent` (text) - Browser user agent string
    - Add `is_paid` (boolean) - Whether this lead converted to paid customer
    - Add `paid_amount` (numeric) - Amount paid by customer
    - Add `paid_at` (timestamptz) - When the payment was made
    - Add `conversion_sent_to_facebook` (boolean) - Whether Purchase event was sent to Facebook CAPI
    
  2. Notes
    - All tracking fields are nullable as they may not always be present
    - Attribution ID helps with cross-session tracking
    - FBC/FBP are required for Facebook CAPI
    - is_paid defaults to false
    - conversion_sent_to_facebook defaults to false
*/

-- Add tracking and attribution columns
ALTER TABLE lead_tickets 
  ADD COLUMN IF NOT EXISTS attribution_id uuid,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS first_landing_page text,
  ADD COLUMN IF NOT EXISTS first_referrer text,
  ADD COLUMN IF NOT EXISTS last_landing_page text,
  ADD COLUMN IF NOT EXISTS last_referrer text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Add conversion tracking columns
ALTER TABLE lead_tickets
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_sent_to_facebook boolean DEFAULT false;

-- Create index on attribution_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_tickets_attribution_id ON lead_tickets(attribution_id);

-- Create index on utm fields for analytics queries
CREATE INDEX IF NOT EXISTS idx_lead_tickets_utm_source ON lead_tickets(utm_source);
CREATE INDEX IF NOT EXISTS idx_lead_tickets_utm_campaign ON lead_tickets(utm_campaign);

-- Create index on conversion tracking for analytics
CREATE INDEX IF NOT EXISTS idx_lead_tickets_is_paid ON lead_tickets(is_paid);
CREATE INDEX IF NOT EXISTS idx_lead_tickets_paid_at ON lead_tickets(paid_at);