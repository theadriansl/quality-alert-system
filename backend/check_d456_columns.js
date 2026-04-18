const { pool } = require('./config/database');

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND (column_name LIKE '%d4%' OR column_name LIKE '%d5%' OR column_name LIKE '%d6%')
      ORDER BY column_name
    `);

    console.log('=== D4/D5/D6 Columns in eightd_reports ===');
    if (result.rows.length === 0) {
      console.log('❌ NO D4/D5/D6 columns found!');
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

checkColumns();
