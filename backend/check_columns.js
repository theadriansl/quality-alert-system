require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkColumns() {
  try {
    // List all columns
    console.log('=== COLUMNS IN eightd_reports ===\n');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      ORDER BY ordinal_position
    `);

    columnsResult.rows.forEach(c => {
      console.log(`${c.column_name}: ${c.data_type}`);
    });

    // Check user assignment columns
    console.log('\n=== USER ASSIGNMENTS IN REPORT 1 ===\n');
    const reportResult = await pool.query(`
      SELECT issue_assigned_to, countermeasure_assigned_to,
             confirmation_assigned_to, d1_team_members, d1_champion_id
      FROM eightd_reports
      WHERE id = 1
    `);

    if (reportResult.rows[0]) {
      console.log('issue_assigned_to:', reportResult.rows[0].issue_assigned_to);
      console.log('countermeasure_assigned_to:', reportResult.rows[0].countermeasure_assigned_to);
      console.log('confirmation_assigned_to:', reportResult.rows[0].confirmation_assigned_to);
      console.log('d1_team_members:', reportResult.rows[0].d1_team_members);
      console.log('d1_champion_id:', reportResult.rows[0].d1_champion_id);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkColumns();
