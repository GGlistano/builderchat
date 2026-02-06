/*
  # Add 'end' Block Type

  ## Changes
  - Drops the existing check constraint on funnel_blocks.type
  - Creates a new check constraint that includes 'end' type
  
  ## Block Types Now Supported
  - text
  - question
  - image
  - video
  - audio
  - typing_effect
  - recording_effect
  - delay
  - **end** (NEW)
  
  ## Purpose
  The 'end' block type allows funnel creators to explicitly terminate a funnel
  without showing any completion message to the lead. When a lead reaches this block,
  the funnel stops processing but the lead can still send messages.
*/

-- Drop the old constraint
ALTER TABLE funnel_blocks
DROP CONSTRAINT IF EXISTS funnel_blocks_type_check;

-- Add new constraint with 'end' type
ALTER TABLE funnel_blocks
ADD CONSTRAINT funnel_blocks_type_check
CHECK (type IN ('text', 'question', 'image', 'video', 'audio', 'typing_effect', 'recording_effect', 'delay', 'end'));
