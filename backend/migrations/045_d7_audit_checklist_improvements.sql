-- Migration: D7 Audit Checklist Improvements
-- Adds check_item, due_date, assigned_auditors, and auditor feedback fields

-- =============================================
-- 1. Modify d7_audit_items table
-- =============================================

-- Check item description (what the auditor needs to verify)
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS check_item TEXT;

-- Due date for verification
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS due_date DATE;

-- Assigned auditors (array of user IDs)
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS assigned_auditors INTEGER[];

-- Sent to audit flag
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS sent_to_audit BOOLEAN DEFAULT false;

-- Link to audit_requests
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS audit_request_id INTEGER;

-- Auditor feedback fields
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS auditor_comments TEXT;
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS auditor_judgment VARCHAR(10);
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS auditor_completed BOOLEAN DEFAULT false;
ALTER TABLE d7_audit_items ADD COLUMN IF NOT EXISTS audited_by INTEGER REFERENCES users(id);

-- =============================================
-- 2. Modify audit_requests table
-- =============================================

-- Check item description
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS check_item TEXT;

-- Due date
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS due_date DATE;

-- Assigned auditors
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS assigned_auditors INTEGER[];

-- Link back to d7_audit_items
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS d7_audit_item_id INTEGER;

-- Verification date
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;

-- Auditor completed flag
ALTER TABLE audit_requests ADD COLUMN IF NOT EXISTS auditor_completed BOOLEAN DEFAULT false;

-- =============================================
-- 3. Add indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_d7_audit_items_sent ON d7_audit_items(sent_to_audit);
CREATE INDEX IF NOT EXISTS idx_d7_audit_items_due_date ON d7_audit_items(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_requests_d7_item ON audit_requests(d7_audit_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_requests_due_date ON audit_requests(due_date);

-- =============================================
-- 4. Comments
-- =============================================

COMMENT ON COLUMN d7_audit_items.check_item IS 'Description of what the auditor needs to verify';
COMMENT ON COLUMN d7_audit_items.due_date IS 'Deadline for completing the audit check';
COMMENT ON COLUMN d7_audit_items.assigned_auditors IS 'Array of user IDs assigned to audit this item';
COMMENT ON COLUMN d7_audit_items.sent_to_audit IS 'Whether this item has been sent to audit requests';
COMMENT ON COLUMN d7_audit_items.audit_request_id IS 'Link to the audit_requests record';
COMMENT ON COLUMN d7_audit_items.auditor_comments IS 'Comments from the auditor';
COMMENT ON COLUMN d7_audit_items.auditor_judgment IS 'Judgment from the auditor (OK, NOK, etc.)';
COMMENT ON COLUMN d7_audit_items.verification_date IS 'Date when the auditor verified this item';
COMMENT ON COLUMN d7_audit_items.auditor_completed IS 'Whether the auditor has confirmed completion';
COMMENT ON COLUMN d7_audit_items.audited_by IS 'User ID of the auditor who completed verification';
