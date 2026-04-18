const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      ORDER BY ordinal_position
    `);
    console.log('Columns in eightd_reports:');
    result.rows.forEach(row => console.log('  -', row.column_name));

    // Check specific columns
    const checkCols = ['team_leader', 'customer_impact', 'd4_root_causes', 'd5_corrective_actions'];
    console.log('\nChecking specific columns:');
    for (const col of checkCols) {
      const exists = result.rows.some(r => r.column_name === col);
      console.log(`  ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkColumns();
