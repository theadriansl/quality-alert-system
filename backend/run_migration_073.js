const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running migration 073_update_pending_release_view...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '073_update_pending_release_view.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('Migration 073 completed successfully!\n');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
