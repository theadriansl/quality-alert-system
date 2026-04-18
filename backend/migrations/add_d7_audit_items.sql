-- Create table for dynamic D7 audit items

CREATE TABLE IF NOT EXISTS d7_audit_items (
  id SERIAL PRIMARY KEY,
  d7_validation_id INTEGER NOT NULL REFERENCES d7_validations(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_icon VARCHAR(10) DEFAULT '📎',
  comments TEXT,
  audit_judgment VARCHAR(10) CHECK (audit_judgment IN ('C', 'NC', 'NA', 'OBS', '')),
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_d7_audit_items_validation ON d7_audit_items(d7_validation_id);

COMMENT ON TABLE d7_audit_items IS 'Dynamic audit checklist items for D7 validation';
COMMENT ON COLUMN d7_audit_items.item_name IS 'Name of the audit item (SPC, AMEF, Reporte Dimensional, etc.)';
COMMENT ON COLUMN d7_audit_items.item_icon IS 'Emoji icon for the item';
COMMENT ON COLUMN d7_audit_items.audit_judgment IS 'C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_audit_items.is_default IS 'Whether this is a default item (true) or user-added (false)';
COMMENT ON COLUMN d7_audit_items.display_order IS 'Order for displaying items';


-- Create table for audit item files
CREATE TABLE IF NOT EXISTS d7_audit_item_files (
  id SERIAL PRIMARY KEY,
  d7_audit_item_id INTEGER NOT NULL REFERENCES d7_audit_items(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_d7_audit_item_files_item ON d7_audit_item_files(d7_audit_item_id);

COMMENT ON TABLE d7_audit_item_files IS 'Files attached to audit items';
