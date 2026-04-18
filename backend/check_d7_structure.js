require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkStructure() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking d7_validations table structure...\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'd7_validations'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Columns in d7_validations table:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStructure();
