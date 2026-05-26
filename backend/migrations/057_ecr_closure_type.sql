-- Migration: Add closure_type and rejection_reason to ECR
-- Date: 2026-05-25
-- Description: Support for "Close as Rejected" flow with separate approval cycle

-- Add closure_type column to track type of closure (approved vs rejected)
ALTER TABLE ecr_reports
ADD COLUMN IF NOT EXISTS closure_type VARCHAR(20) DEFAULT NULL;
-- Values: 'approved' (normal closure), 'rejected' (close as rejected)

-- Add rejection_reason column to store reason when closing as rejected
ALTER TABLE ecr_reports
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ecr_reports.closure_type IS 'Type of closure being requested: approved (normal) or rejected (close as rejected)';
COMMENT ON COLUMN ecr_reports.rejection_reason IS 'Reason for closing the ECR as rejected (required when closure_type=rejected)';

-- Note: status 'pending_rejected_closure' is used when closure_type='rejected' and awaiting approvals
-- Final status will be 'closed_rejected' when all approvers sign off on the rejection
