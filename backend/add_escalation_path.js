require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function addEscalationPathColumn() {
  try {
    console.log('=== ADDING ESCALATION_PATH COLUMN ===\n');

    // Add escalation_path column if it doesn't exist
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS escalation_path JSONB DEFAULT '{}'::jsonb
    `);

    console.log('✅ Column escalation_path added successfully');

    // Verify the column exists
    const checkResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports' AND column_name = 'escalation_path'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Verified: escalation_path column exists');
      console.log('   Type:', checkResult.rows[0].data_type);
    }

    await pool.end();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addEscalationPathColumn();
