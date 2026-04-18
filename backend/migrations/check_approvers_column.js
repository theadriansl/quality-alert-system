const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apqp_system',
  password: 'postgres',
  port: 5432,
});

async function checkColumn() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ecr_reports'
      AND column_name LIKE '%approver%'
    `);

    console.log('Columns with "approver" in name:', result.rows);

    if (result.rows.length === 0) {
      console.log('❌ No approvers column found in ecr_reports table');
    } else {
      console.log('✅ Found approvers columns:', result.rows.map(r => r.column_name).join(', '));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkColumn();
