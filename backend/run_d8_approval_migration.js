const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    const sqlFile = path.join(__dirname, 'migrations', 'add_d8_approval_columns.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📊 Running D8 approval columns migration...');

    await client.query(sql);

    console.log('✅ D8 approval columns migration completed successfully');

    // Verify columns were created
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name LIKE 'd8_%approval%'
      OR column_name = 'd8_status'
      ORDER BY column_name
    `);

    console.log('\n📋 D8 Approval Columns Created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
