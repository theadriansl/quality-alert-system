const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running objectives migration...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '005_workload_objectives.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('✅ Objectives migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
