const { query } = require('./config/database');

async function run() {
  console.log('Running QAR migration...\n');

  // Create quality_alerts table
  await query(`
    CREATE TABLE IF NOT EXISTS quality_alerts (
      id SERIAL PRIMARY KEY,
      alert_number VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      project_id INTEGER REFERENCES projects(id),
      part_id INTEGER REFERENCES client_parts(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      severity_id INTEGER REFERENCES inspection_severities(id),
      trigger_type VARCHAR(50) DEFAULT 'manual',
      trigger_defect_count INTEGER,
      trigger_period_hours INTEGER,
      status VARCHAR(50) DEFAULT 'DRAFT',
      photo_ok_path VARCHAR(500),
      photo_nok_path VARCHAR(500),
      assigned_to INTEGER REFERENCES users(id),
      reported_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      resolution_notes TEXT,
      root_cause TEXT,
      corrective_action TEXT
    )
  `);
  console.log('✅ quality_alerts table');

  // Create qar_defects table
  await query(`
    CREATE TABLE IF NOT EXISTS qar_defects (
      id SERIAL PRIMARY KEY,
      qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
      defect_entry_id INTEGER REFERENCES defect_entries(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ qar_defects table');

  // Create qar_recipients table
  await query(`
    CREATE TABLE IF NOT EXISTS qar_recipients (
      id SERIAL PRIMARY KEY,
      qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      notified_at TIMESTAMP,
      acknowledged_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ qar_recipients table');

  // Create qar_comments table
  await query(`
    CREATE TABLE IF NOT EXISTS qar_comments (
      id SERIAL PRIMARY KEY,
      qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      comment TEXT NOT NULL,
      comment_type VARCHAR(50) DEFAULT 'note',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ qar_comments table');

  // Create indexes
  try {
    await query('CREATE INDEX IF NOT EXISTS idx_quality_alerts_client ON quality_alerts(client_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quality_alerts_part ON quality_alerts(part_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quality_alerts_status ON quality_alerts(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_qar_defects_qar ON qar_defects(qar_id)');
    console.log('✅ Indexes created');
  } catch (e) {
    console.log('⚠️ Indexes may already exist');
  }

  // Update severities with default thresholds
  await query("UPDATE inspection_severities SET qar_threshold_count = 5, qar_threshold_hours = 8 WHERE code = 'MINOR'");
  await query("UPDATE inspection_severities SET qar_threshold_count = 3, qar_threshold_hours = 4 WHERE code = 'MAJOR'");
  await query("UPDATE inspection_severities SET qar_threshold_count = 1, qar_threshold_hours = 1 WHERE code = 'CRITICAL'");
  await query("UPDATE inspection_severities SET qar_threshold_count = 1, qar_threshold_hours = 1 WHERE code = 'ALTA'");
  console.log('✅ Severities updated with QAR thresholds');

  // Create function to generate QAR number
  await query(`
    CREATE OR REPLACE FUNCTION generate_qar_number()
    RETURNS VARCHAR(50) AS $$
    DECLARE
      year_part VARCHAR(4);
      seq_num INTEGER;
      new_number VARCHAR(50);
    BEGIN
      year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
      SELECT COALESCE(MAX(
        CAST(SUBSTRING(alert_number FROM 'QAR-' || year_part || '-(\\d+)') AS INTEGER)
      ), 0) + 1
      INTO seq_num
      FROM quality_alerts
      WHERE alert_number LIKE 'QAR-' || year_part || '-%';
      new_number := 'QAR-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
      RETURN new_number;
    END;
    $$ LANGUAGE plpgsql
  `);
  console.log('✅ QAR number generator function');

  console.log('\n🎉 QAR System migration complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
