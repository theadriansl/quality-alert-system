const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function debugD8Actions() {
  const client = await pool.connect();

  try {
    // Get all reports with D8 data
    const result = await client.query(`
      SELECT
        id,
        report_id,
        title,
        d8_followup_actions,
        d8_completed,
        d8_status
      FROM eightd_reports
      WHERE id IN (SELECT MAX(id) FROM eightd_reports GROUP BY report_id)
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('\n========== D8 FOLLOWUP ACTIONS DEBUG ==========\n');

    for (const row of result.rows) {
      console.log(`Report ID: ${row.report_id} (DB ID: ${row.id})`);
      console.log(`Title: ${row.title}`);
      console.log(`D8 Status: ${row.d8_status}`);
      console.log(`D8 Completed: ${row.d8_completed}`);
      console.log(`D8 Followup Actions:`, JSON.stringify(row.d8_followup_actions, null, 2));
      console.log('-------------------------------------------\n');
    }

    // Check column type
    const columnInfo = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name = 'd8_followup_actions'
    `);

    console.log('Column Info:', columnInfo.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

debugD8Actions();
