-- Add missing letter_status enum values
-- This ensures the database supports all status values used in the workflow
--
-- NOTE: As of the latest 001_setup_schema.sql, these values are included in the base enum.
-- This migration is kept for backwards compatibility with existing databases that were
-- created before the enum was updated. For fresh databases, these values already exist.

-- Add 'generating' status (when AI is creating the draft)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'generating';

-- Add 'under_review' status (when admin has started reviewing)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'under_review';

-- Add 'completed' status (when letter workflow is fully complete)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'completed';

-- Add 'failed' status (when generation or processing fails)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'failed';

-- Note: The complete status flow is now:
-- draft → generating → pending_review → under_review → approved/rejected → completed
