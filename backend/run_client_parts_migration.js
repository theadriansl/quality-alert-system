// Run migration to add client_parts table
const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running client_parts migration...');

    const migrationPath = path.join(__dirname, 'migrations', 'add_client_parts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('✅ client_parts table created with active field and custom_fields support');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
