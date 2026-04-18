const { pool } = require('./config/database');

async function addD6ApprovalColumns() {
  try {
    console.log('Adding D6 Quality Approval columns to eightd_reports...\n');

    // Add columns for D6 Quality Approval
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS d6_quality_approval_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS d6_quality_approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS d6_quality_approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS d6_quality_approval_comments TEXT
    `);

    console.log('✅ D6 Quality Approval columns added successfully!');

    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name LIKE '%d6%approval%'
      ORDER BY column_name
    `);

    console.log('\n=== Verification - D6 Approval Columns ===');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addD6ApprovalColumns();
