-- Migration: Add D3 (Immediate Containment Actions) fields to eightd_reports
-- Created: November 15, 2025
-- Description: Adds fields to support D3 section data including detection points,
--              5 Why's analysis, material disposal, rework information, and costs

DO $$
BEGIN
    -- D3 Detection Points (JSON structure with yes/no for each detection point)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_detection_points'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_detection_points JSONB DEFAULT '{
            "duringProcess": {"yes": false, "no": false},
            "afterManufacture": {"yes": false, "no": false},
            "priorDespatch": {"yes": false, "no": false}
        }';

        COMMENT ON COLUMN eightd_reports.d3_detection_points IS 'Detection points where non-conforming parts should have been detected';
    END IF;

    -- D3 Non-Detection Reasons (5 Why's Analysis)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_non_detection_reasons'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_non_detection_reasons JSONB DEFAULT '[]';

        COMMENT ON COLUMN eightd_reports.d3_non_detection_reasons IS '5 Why analysis - array of reasons for non-detection';
    END IF;

    -- D3 Suspect Material Disposal
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_suspect_material_disposal'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_suspect_material_disposal TEXT;

        COMMENT ON COLUMN eightd_reports.d3_suspect_material_disposal IS 'How suspect material will be disposed';
    END IF;

    -- D3 Conformance Material Guarantee
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_conformance_guarantee'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_conformance_guarantee TEXT;

        COMMENT ON COLUMN eightd_reports.d3_conformance_guarantee IS 'How conformance of material will be guaranteed';
    END IF;

    -- D3 Requires Rework
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_requires_rework'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_requires_rework BOOLEAN DEFAULT NULL;

        COMMENT ON COLUMN eightd_reports.d3_requires_rework IS 'Whether the issue requires rework (true/false/null)';
    END IF;

    -- D3 Rework Unit Cost
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_rework_unit_cost'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_rework_unit_cost DECIMAL(12,2) DEFAULT 0;

        COMMENT ON COLUMN eightd_reports.d3_rework_unit_cost IS 'Cost per unit for rework operations';
    END IF;

    -- D3 Real Impact Cost (calculated field)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd3_real_impact_cost'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_real_impact_cost DECIMAL(12,2) DEFAULT 0;

        COMMENT ON COLUMN eightd_reports.d3_real_impact_cost IS 'Actual cost impact - either parts cost or rework cost';
    END IF;

END $$;

-- Add attachment_type column to eightd_attachments if not exists
-- This helps categorize attachments (photo_no_good, photo_ok, document)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_attachments'
        AND column_name = 'attachment_type'
    ) THEN
        ALTER TABLE eightd_attachments
        ADD COLUMN attachment_type VARCHAR(50) DEFAULT 'document'
        CHECK (attachment_type IN ('photo_no_good', 'photo_ok', 'document'));

        COMMENT ON COLUMN eightd_attachments.attachment_type IS 'Type of attachment: photo_no_good, photo_ok, or document';
    END IF;
END $$;

-- Create indexes for efficient queries on D3 fields
CREATE INDEX IF NOT EXISTS idx_eightd_reports_d3_detection_points
ON eightd_reports USING GIN (d3_detection_points);

CREATE INDEX IF NOT EXISTS idx_eightd_reports_d3_non_detection_reasons
ON eightd_reports USING GIN (d3_non_detection_reasons);

CREATE INDEX IF NOT EXISTS idx_eightd_attachments_type
ON eightd_attachments(attachment_type);

-- Add comments
COMMENT ON INDEX idx_eightd_reports_d3_detection_points IS 'GIN index for efficient JSONB queries on D3 detection points';
COMMENT ON INDEX idx_eightd_reports_d3_non_detection_reasons IS 'GIN index for efficient JSONB queries on D3 non-detection reasons';
COMMENT ON INDEX idx_eightd_attachments_type IS 'Index for filtering attachments by type';
