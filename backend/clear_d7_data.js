require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function clearD7Data() {
  const client = await pool.connect();

  try {
    console.log('🔄 Clearing old D7 validation data...');

    // Delete all d7_validations records
    const result = await client.query('DELETE FROM d7_validations');

    console.log(`✅ Deleted ${result.rowCount} old D7 validation records`);
    console.log('📊 D7 validations table is now clean and ready for new structure');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearD7Data();
