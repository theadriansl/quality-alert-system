-- Migration: QAR Recipient Types
-- Add recipient_type to distinguish between response and validation recipients

-- Add recipient_type column
ALTER TABLE qar_recipients
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(20) DEFAULT 'response';
-- Types: 'response' (must solve the issue), 'validation' (must approve closure)

-- Add department_id to quality_alerts (responsible department)
ALTER TABLE quality_alerts
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);

-- Add response fields to quality_alerts
ALTER TABLE quality_alerts
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS responded_by INTEGER REFERENCES users(id);

-- Add validation fields
ALTER TABLE quality_alerts
ADD COLUMN IF NOT EXISTS validation_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20); -- 'approved', 'rejected'

-- Update comment types to include more options
-- comment_type: 'note', 'status_change', 'assignment', 'response', 'validation', 'rejection'

-- Index for recipient type
CREATE INDEX IF NOT EXISTS idx_qar_recipients_type ON qar_recipients(recipient_type);

COMMENT ON COLUMN qar_recipients.recipient_type IS 'response = must solve, validation = must approve closure';
