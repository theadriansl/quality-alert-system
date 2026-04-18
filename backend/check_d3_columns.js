const { pool } = require('./config/database');

async function checkD3Columns() {
  try {
    // Check current columns in eightd_reports
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name LIKE '%d3%'
      ORDER BY ordinal_position
    `);

    console.log('=== D3 Related Columns in eightd_reports ===');
    if (result.rows.length === 0) {
      console.log('❌ NO D3 columns found!');
      console.log('\nAdding missing D3 columns...');

      // Add the missing columns
      await pool.query(`
        ALTER TABLE eightd_reports
        ADD COLUMN IF NOT EXISTS d3_detection_points JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS d3_non_detection_reasons JSONB DEFAULT '[]'::jsonb
      `);

      console.log('✅ D3 columns added successfully!');

      // Verify
      const verifyResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name LIKE '%d3%'
        ORDER BY ordinal_position
      `);
      console.log('\n=== Verification ===');
      verifyResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    } else {
      result.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkD3Columns();
