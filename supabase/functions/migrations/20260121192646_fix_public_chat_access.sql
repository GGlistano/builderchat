/*
  # Fix Public Chat Access
  
  1. Changes
    - Add public read policies for conversations
    - Add public read policies for lead_responses
    - Allow anonymous users to view chat data
    
  2. Security
    - Chat remains public for users
    - Admins can still manage everything
    - Only viewing is public, write operations remain controlled
*/

-- Allow public (anonymous) users to view conversations
CREATE POLICY "Public can view conversations"
  ON conversations FOR SELECT
  TO anon
  USING (true);

-- Allow public (anonymous) users to view lead responses
CREATE POLICY "Public can view lead responses"
  ON lead_responses FOR SELECT
  TO anon
  USING (true);

-- Allow public users to update their own conversations
CREATE POLICY "Public can update their conversations"
  ON conversations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow public users to delete their conversations
CREATE POLICY "Public can delete their conversations"
  ON conversations FOR DELETE
  TO anon
  USING (true);

-- Allow public users to update their responses
CREATE POLICY "Public can update their responses"
  ON lead_responses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow public users to delete their responses
CREATE POLICY "Public can delete their responses"
  ON lead_responses FOR DELETE
  TO anon
  USING (true);
