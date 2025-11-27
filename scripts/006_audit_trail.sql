-- Create audit trail table for letter reviews
CREATE TABLE IF NOT EXISTS letter_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'submitted', 'review_started', 'approved', 'rejected'
    performed_by UUID REFERENCES profiles(id),
    old_status TEXT,
    new_status TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_letter ON letter_audit_trail(letter_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON letter_audit_trail(performed_by);

-- Enable RLS
ALTER TABLE letter_audit_trail ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins view all audit logs"
ON letter_audit_trail FOR SELECT
USING (public.get_user_role() = 'admin');

-- Users can view audit logs for their own letters
CREATE POLICY "Users view own letter audit"
ON letter_audit_trail FOR SELECT
USING (
    letter_id IN (
        SELECT id FROM letters WHERE user_id = auth.uid()
    )
);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_letter_audit(
    p_letter_id UUID,
    p_action TEXT,
    p_old_status TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO letter_audit_trail (
        letter_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes,
        metadata
    ) VALUES (
        p_letter_id,
        p_action,
        auth.uid(),
        p_old_status,
        p_new_status,
        p_notes,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
