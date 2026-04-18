const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running D3 fields migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_d3_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ D3 fields migration completed successfully!\n');
    console.log('Added fields to eightd_reports:');
    console.log('  - d3_detection_points (JSONB)');
    console.log('  - d3_non_detection_reasons (JSONB)');
    console.log('  - d3_suspect_material_disposal (TEXT)');
    console.log('  - d3_conformance_guarantee (TEXT)');
    console.log('  - d3_requires_rework (BOOLEAN)');
    console.log('  - d3_rework_unit_cost (DECIMAL)');
    console.log('  - d3_real_impact_cost (DECIMAL)');
    console.log('\nAdded fields to eightd_attachments:');
    console.log('  - attachment_type (VARCHAR)');
    console.log('\n✅ All indexes created successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration script completed. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
