-- Migration 011: Add financial_impact column to ecr_reports
-- This field stores the financial impact of the ECR (costs, savings, net impact)

ALTER TABLE ecr_reports
ADD COLUMN IF NOT EXISTS financial_impact JSONB DEFAULT '{"items": [], "totalCost": 0, "totalSavings": 0, "netImpact": 0}';

COMMENT ON COLUMN ecr_reports.financial_impact IS 'Financial impact of the ECR: {items: [{type, description, amount}], totalCost, totalSavings, netImpact}';
