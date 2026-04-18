const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runMigration(migrationNumber, migrationName) {
  const client = await pool.connect();

  try {
    console.log(`🚀 Starting Migration ${migrationNumber}: ${migrationName}...\n`);

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', `${migrationNumber}_${migrationName}.sql`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log(`✅ Migration ${migrationNumber} completed successfully!\n`);

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get migration details from command line or use default
const migrationNumber = process.argv[2] || '002';
const migrationName = process.argv[3] || 'complete_missing_modules';

runMigration(migrationNumber, migrationName);
