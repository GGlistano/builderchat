/*
  # Add Missing Public Policies for Development
  
  ## Changes
  - Add INSERT, UPDATE, DELETE policies for conversations
  - Add INSERT, UPDATE, DELETE policies for lead_responses
  - This allows the chat interface to work without authentication
  
  ## Security Note
  - These are temporary development policies
  - Should be restricted when authentication is implemented
*/

-- Add missing policies for conversations
CREATE POLICY "Public can create conversations"
  ON conversations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update conversations"
  ON conversations FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete conversations"
  ON conversations FOR DELETE
  TO public
  USING (true);

-- Add missing policies for lead_responses
CREATE POLICY "Public can create lead responses"
  ON lead_responses FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update lead responses"
  ON lead_responses FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete lead responses"
  ON lead_responses FOR DELETE
  TO public
  USING (true);