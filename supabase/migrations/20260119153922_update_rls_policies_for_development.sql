/*
  # Update RLS Policies for Development
  
  ## Changes
  - Allow public (anon) users to perform admin operations temporarily
  - This is for development purposes only
  - In production, these should be restricted to authenticated users only
  
  ## Security Note
  - These policies should be reverted when authentication is implemented
*/

-- Drop existing restrictive policies for funnels
DROP POLICY IF EXISTS "Authenticated users can view all funnels" ON funnels;
DROP POLICY IF EXISTS "Authenticated users can create funnels" ON funnels;
DROP POLICY IF EXISTS "Authenticated users can update funnels" ON funnels;
DROP POLICY IF EXISTS "Authenticated users can delete funnels" ON funnels;

-- Create more permissive policies for development
CREATE POLICY "Public can view all funnels"
  ON funnels FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create funnels"
  ON funnels FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update funnels"
  ON funnels FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete funnels"
  ON funnels FOR DELETE
  TO public
  USING (true);

-- Drop existing restrictive policies for funnel_blocks
DROP POLICY IF EXISTS "Authenticated users can view all blocks" ON funnel_blocks;
DROP POLICY IF EXISTS "Authenticated users can create blocks" ON funnel_blocks;
DROP POLICY IF EXISTS "Authenticated users can update blocks" ON funnel_blocks;
DROP POLICY IF EXISTS "Authenticated users can delete blocks" ON funnel_blocks;

-- Create more permissive policies for development
CREATE POLICY "Public can view all blocks"
  ON funnel_blocks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create blocks"
  ON funnel_blocks FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update blocks"
  ON funnel_blocks FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete blocks"
  ON funnel_blocks FOR DELETE
  TO public
  USING (true);

-- Drop existing restrictive policies for conversations
DROP POLICY IF EXISTS "Authenticated users can view all conversations" ON conversations;

-- Create more permissive policy
CREATE POLICY "Public can view all conversations"
  ON conversations FOR SELECT
  TO public
  USING (true);

-- Drop existing restrictive policies for lead_responses
DROP POLICY IF EXISTS "Authenticated users can view all responses" ON lead_responses;

-- Create more permissive policy
CREATE POLICY "Public can view all responses"
  ON lead_responses FOR SELECT
  TO public
  USING (true);