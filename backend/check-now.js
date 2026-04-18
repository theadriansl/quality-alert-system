require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function check() {
  try {
    const res = await pool.query(
      'SELECT id, d4_4m_evaluation FROM eightd_reports WHERE report_id = $1',
      ['8D-2025-0316']
    );
    console.log('ID:', res.rows[0].id);
    console.log('d4_4m_evaluation:', JSON.stringify(res.rows[0].d4_4m_evaluation, null, 2));
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    pool.end();
  }
}

check();
