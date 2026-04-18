/**
 * Migration Runner Script
 * Run specific migrations for BOM Field Config
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'migrations', filename);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`\n========================================`);
  console.log(`Running migration: ${filename}`);
  console.log(`========================================`);

  try {
    await pool.query(sql);
    console.log(`Migration ${filename} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`Error running migration ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  const migrations = [
    '015_bom_field_config.sql',
    '016_seed_bom_field_config.sql'
  ];

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('Migration failed, stopping...');
      process.exit(1);
    }
  }

  console.log('\n All migrations completed successfully!');

  // Verify the data
  const result = await pool.query('SELECT COUNT(*) as count FROM bom_field_config');
  console.log(`Total field configurations: ${result.rows[0].count}`);

  const fields = await pool.query('SELECT field_name, field_type FROM bom_field_config ORDER BY display_order');
  console.log('\nConfigured fields:');
  fields.rows.forEach((f, i) => console.log(`  ${i + 1}. ${f.field_name} (${f.field_type})`));

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
