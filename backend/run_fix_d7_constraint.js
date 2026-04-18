const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'apqp_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🔧 Running D7 constraint fix migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'fix_d7_audit_item_constraint.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('📋 Constraint updated to allow: before_photo, after_photo, validation_evidence, spc_chart, audit_item');

    // Verify
    const result = await pool.query(`
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'd7_validation_files'::regclass
        AND conname = 'd7_validation_files_file_type_check'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Constraint verification:');
      console.log('   Name:', result.rows[0].constraint_name);
      console.log('   Definition:', result.rows[0].constraint_definition);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
