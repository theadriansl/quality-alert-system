const { Pool } = require('pg');
require('dotenv').config();

async function debugD7() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'apqp_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🔍 Debugging D7 validation save for report_id = 4\n');

    // Check if d7_validations record exists
    const d7Result = await pool.query(`
      SELECT * FROM d7_validations WHERE report_id = 4
    `);

    console.log('📋 D7 Validations Table:');
    console.log('─'.repeat(70));
    if (d7Result.rows.length === 0) {
      console.log('❌ NO RECORD FOUND for report_id = 4');
      console.log('   This means the POST endpoint is NOT creating/updating the record!\n');
    } else {
      console.log('✅ Record found:');
      const record = d7Result.rows[0];
      console.log(JSON.stringify(record, null, 2));
    }
    console.log('─'.repeat(70));

    // Check eightd_reports
    const reportResult = await pool.query(`
      SELECT id, report_id, d7_completed, updated_at
      FROM eightd_reports
      WHERE id = 4
    `);

    console.log('\n📊 EightD Reports (d7_completed flag):');
    console.log('─'.repeat(70));
    if (reportResult.rows.length > 0) {
      console.log(JSON.stringify(reportResult.rows[0], null, 2));
    }
    console.log('─'.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

debugD7();
