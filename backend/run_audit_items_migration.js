require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running D7 audit items migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_d7_audit_items.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('Migration completed successfully!');
    console.log('Created tables: d7_audit_items, d7_audit_item_files');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
