const { pool } = require('./config/database');

async function checkLatestAudit() {
  try {
    console.log('🔍 Checking latest audit log entries...\n');

    const result = await pool.query(`
      SELECT
        id,
        report_id,
        action_type,
        section_name,
        user_name,
        description,
        created_at
      FROM eightd_audit_log
      WHERE report_id = 4
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No audit log entries found for report 4\n');
    } else {
      console.log(`✅ Found ${result.rows.length} audit log entries:\n`);
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. [${row.created_at.toISOString()}] ${row.action_type} - ${row.section_name || 'N/A'}`);
        console.log(`   User: ${row.user_name}`);
        console.log(`   Description: ${row.description}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLatestAudit();
