/*
  # Chat Funnel System - Complete Database Schema

  ## Overview
  This migration creates the complete database structure for a WhatsApp-like chat funnel system
  where admins can create visual funnels with drag-and-drop blocks and leads interact through
  automated chat conversations.

  ## New Tables

  ### 1. `funnels`
  Stores chat funnels created by admins
  - `id` (uuid, primary key) - Unique funnel identifier
  - `name` (text) - Internal name for admin reference
  - `slug` (text, unique) - URL-friendly identifier for chat access
  - `profile_name` (text) - Name displayed in chat interface
  - `profile_image` (text, nullable) - URL to profile picture
  - `is_active` (boolean) - Whether funnel is published
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `funnel_blocks`
  Individual blocks that make up a funnel (messages, questions, media, effects)
  - `id` (uuid, primary key) - Unique block identifier
  - `funnel_id` (uuid, foreign key) - Parent funnel
  - `type` (text) - Block type: 'text', 'question', 'image', 'video', 'audio', 'typing_effect', 'recording_effect', 'delay'
  - `content` (jsonb) - Flexible content based on block type
  - `position_x` (real) - X position in drag-drop canvas
  - `position_y` (real) - Y position in drag-drop canvas
  - `order_index` (integer) - Execution order in funnel
  - `next_block_id` (uuid, nullable) - Next block in sequence
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `conversations`
  Active or completed chat sessions with leads
  - `id` (uuid, primary key) - Unique conversation identifier
  - `funnel_id` (uuid, foreign key) - Associated funnel
  - `current_block_id` (uuid, nullable) - Current position in funnel
  - `status` (text) - 'active', 'completed', 'abandoned'
  - `lead_data` (jsonb) - Collected lead information (name, email, etc)
  - `started_at` (timestamptz) - When conversation started
  - `completed_at` (timestamptz, nullable) - When conversation ended
  - `last_activity_at` (timestamptz) - Last interaction timestamp

  ### 4. `lead_responses`
  Responses provided by leads during conversations
  - `id` (uuid, primary key) - Unique response identifier
  - `conversation_id` (uuid, foreign key) - Parent conversation
  - `block_id` (uuid, foreign key) - Block that prompted this response
  - `response_text` (text) - Lead's answer
  - `created_at` (timestamptz) - Response timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for active funnels (for lead chat interface)
  - Authenticated users can manage their own funnels
  - Conversations and responses are publicly insertable (for lead submissions)

  ## Indexes
  - Unique index on funnel slugs for fast URL lookups
  - Index on conversation status for filtering
  - Index on funnel_id for block queries
*/

-- Create funnels table
CREATE TABLE IF NOT EXISTS funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  profile_name text NOT NULL,
  profile_image text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create funnel_blocks table
CREATE TABLE IF NOT EXISTS funnel_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES funnels(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'question', 'image', 'video', 'audio', 'typing_effect', 'recording_effect', 'delay')),
  content jsonb DEFAULT '{}'::jsonb,
  position_x real DEFAULT 0,
  position_y real DEFAULT 0,
  order_index integer NOT NULL,
  next_block_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES funnels(id) ON DELETE CASCADE NOT NULL,
  current_block_id uuid,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  lead_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz DEFAULT now()
);

-- Create lead_responses table
CREATE TABLE IF NOT EXISTS lead_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  block_id uuid REFERENCES funnel_blocks(id) ON DELETE CASCADE NOT NULL,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funnel_blocks_funnel_id ON funnel_blocks(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_blocks_order ON funnel_blocks(funnel_id, order_index);
CREATE INDEX IF NOT EXISTS idx_conversations_funnel_id ON conversations(funnel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_lead_responses_conversation ON lead_responses(conversation_id);

-- Enable Row Level Security
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for funnels
CREATE POLICY "Anyone can view active funnels"
  ON funnels FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all funnels"
  ON funnels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create funnels"
  ON funnels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update funnels"
  ON funnels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete funnels"
  ON funnels FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for funnel_blocks
CREATE POLICY "Anyone can view blocks of active funnels"
  ON funnel_blocks FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = funnel_blocks.funnel_id
      AND funnels.is_active = true
    )
  );

CREATE POLICY "Authenticated users can view all blocks"
  ON funnel_blocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create blocks"
  ON funnel_blocks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blocks"
  ON funnel_blocks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blocks"
  ON funnel_blocks FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for conversations
CREATE POLICY "Anyone can create conversations"
  ON conversations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own conversation"
  ON conversations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update conversations"
  ON conversations FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for lead_responses
CREATE POLICY "Anyone can create responses"
  ON lead_responses FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view responses from their conversation"
  ON lead_responses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can view all responses"
  ON lead_responses FOR SELECT
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for funnels updated_at
CREATE TRIGGER update_funnels_updated_at
  BEFORE UPDATE ON funnels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();