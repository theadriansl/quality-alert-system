/**
 * Migration Runner Script for D6 Countermeasure Description
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
    'add_d6_countermeasure_description.sql'
  ];

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('Migration failed, stopping...');
      process.exit(1);
    }
  }

  console.log('\n All migrations completed successfully!');

  // Verify the column exists
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'eightd_reports'
    AND column_name = 'd6_countermeasure_description'
  `);

  if (result.rows.length > 0) {
    console.log(`Column verified: ${result.rows[0].column_name} (${result.rows[0].data_type})`);
  } else {
    console.log('Warning: Column was not found after migration');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
