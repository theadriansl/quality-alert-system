const { pool } = require('./config/database');

async function addD123ApprovalStatus() {
  try {
    console.log('Adding D1-D2-D3 approval status column...\n');

    // Add column for D1-D2-D3 approval status
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS d1_d2_d3_approval_status VARCHAR(50) DEFAULT 'draft'
    `);

    console.log('✅ D1-D2-D3 approval status column added successfully!');

    // Add comment to explain values
    await pool.query(`
      COMMENT ON COLUMN eightd_reports.d1_d2_d3_approval_status IS
      'Status: draft (editable by creator), pending_approval (only approvers can edit), approved (locked), rejected (creator can edit again)'
    `);

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name = 'd1_d2_d3_approval_status'
    `);

    console.log('\n=== Verification ===');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addD123ApprovalStatus();
