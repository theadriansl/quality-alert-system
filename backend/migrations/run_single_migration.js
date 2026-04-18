const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runSingleMigration(migrationFile) {
  const client = await pool.connect();

  try {
    console.log(`🔄 Running migration: ${migrationFile}\n`);

    const sql = fs.readFileSync(
      path.join(__dirname, migrationFile),
      'utf8'
    );

    await client.query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully!\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run_single_migration.js <migration_file.sql>');
  process.exit(1);
}

runSingleMigration(migrationFile)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
