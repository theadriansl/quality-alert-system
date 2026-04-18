const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'quality_alert_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234'
});

async function checkReport() {
  try {
    console.log('\n=== CHECKING REPORT ID 1 ===\n');

    // Check main report
    const reportResult = await pool.query(`
      SELECT id, title, supplier_name, current_step,
             d3_detection_points, d3_non_detection_reasons
      FROM eightd_reports
      WHERE id = 1
    `);

    console.log('Report Data:');
    console.log(JSON.stringify(reportResult.rows[0], null, 2));

    // Check parts
    const partsResult = await pool.query(`
      SELECT * FROM eightd_parts WHERE report_id = 1
    `);

    console.log('\nParts Count:', partsResult.rows.length);
    if (partsResult.rows.length > 0) {
      console.log('Parts:', JSON.stringify(partsResult.rows, null, 2));
    }

    // Check attachments
    const attachmentsResult = await pool.query(`
      SELECT id, filename, original_filename, attachment_type
      FROM eightd_attachments
      WHERE report_id = 1
    `);

    console.log('\nAttachments Count:', attachmentsResult.rows.length);
    if (attachmentsResult.rows.length > 0) {
      console.log('Attachments:', JSON.stringify(attachmentsResult.rows, null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkReport();
