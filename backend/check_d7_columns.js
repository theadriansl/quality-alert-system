const { Pool } = require('pg');
require('dotenv').config();

async function checkColumns() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'apqp_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('📋 Checking d7_validations table structure...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'd7_validations'
      ORDER BY ordinal_position
    `);

    console.log('✅ Columns in d7_validations:');
    console.log('─'.repeat(70));
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`);
    });
    console.log('─'.repeat(70));
    console.log(`Total columns: ${result.rows.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkColumns();
