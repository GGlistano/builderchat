/*
  # Add Facebook Tracking Configuration to Funnels

  1. Changes to `funnels` table
    - Add `facebook_pixel_id` (text) - Facebook Pixel ID for CAPI events
    - Add `facebook_capi_token` (text) - Facebook Conversions API Access Token
    
  2. Notes
    - These fields allow funnel owners to configure Facebook CAPI integration
    - Required for sending Purchase events to Facebook Ads Manager
    - Both fields are nullable as not all funnels may use Facebook tracking
*/

-- Add Facebook tracking fields
ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text,
  ADD COLUMN IF NOT EXISTS facebook_capi_token text;