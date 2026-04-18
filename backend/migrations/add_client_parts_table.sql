-- ============================================================================
-- Migration: Add client_parts table for Bill of Materials (BOM)
-- Date: 2026-01-07
-- Description: Create table to store parts/materials at client level
-- ============================================================================

-- Create client_parts table
CREATE TABLE IF NOT EXISTS client_parts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  client_part_number VARCHAR(100),
  part_name VARCHAR(255) NOT NULL,
  description TEXT,
  revision VARCHAR(50),
  specifications TEXT,
  weight DECIMAL(10, 3),
  snp_quantity INTEGER,
  snp_volume DECIMAL(10, 3),
  unit_cost DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  active BOOLEAN DEFAULT true,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, part_number)
);

-- Create index for faster queries
CREATE INDEX idx_client_parts_client_id ON client_parts(client_id);
CREATE INDEX idx_client_parts_active ON client_parts(active);
CREATE INDEX idx_client_parts_client_active ON client_parts(client_id, active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_parts_timestamp
BEFORE UPDATE ON client_parts
FOR EACH ROW
EXECUTE FUNCTION update_client_parts_updated_at();

COMMENT ON TABLE client_parts IS 'Bill of Materials (BOM) for each client';
COMMENT ON COLUMN client_parts.active IS 'Whether the part is currently active (true) or obsolete/discontinued (false)';
COMMENT ON COLUMN client_parts.custom_fields IS 'Additional custom fields defined by the client (e.g., ECR#, Drawing#, Supplier)';
