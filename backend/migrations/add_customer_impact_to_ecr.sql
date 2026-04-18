-- ============================================================================
-- Migration: Add Customer Impact to ECR
-- Date: 2026-01-09
-- Description: Add customer impact assessment field (ISO 9001 requirement)
-- ============================================================================

-- Add customer_impact column to ecr_reports
ALTER TABLE ecr_reports ADD COLUMN IF NOT EXISTS customer_impact JSONB DEFAULT '{}';

COMMENT ON COLUMN ecr_reports.customer_impact IS
'Customer impact assessment (ISO 9001 requirement). Structure:
{
  "affectsCustomer": true/false,
  "requiresNotification": true/false,
  "impactDescription": "Descripción del impacto al cliente",
  "notificationMethod": "email|formal_letter|meeting|portal|none",
  "notificationDate": "2026-01-09T10:00:00Z",
  "notifiedBy": 123,  // user_id
  "evidenceFiles": [
    {
      "name": "customer_notification.pdf",
      "url": "/uploads/ecr/123/customer/...",
      "uploadedAt": "2026-01-09T10:30:00Z"
    }
  ],
  "customerApprovalRequired": true/false,
  "customerApprovalStatus": "pending|approved|rejected|not_required",
  "customerApprovalDate": "2026-01-10T14:00:00Z",
  "customerComments": "Cliente aprueba el cambio",
  "internalNotes": "Notas internas sobre la comunicación"
}';

-- Index for quick searches
CREATE INDEX IF NOT EXISTS idx_ecr_customer_impact ON ecr_reports USING GIN (customer_impact);

-- Index for customer-affecting ECRs
CREATE INDEX IF NOT EXISTS idx_ecr_affects_customer
ON ecr_reports ((customer_impact->>'affectsCustomer'))
WHERE customer_impact->>'affectsCustomer' = 'true';

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ecr_reports' AND column_name = 'customer_impact';
