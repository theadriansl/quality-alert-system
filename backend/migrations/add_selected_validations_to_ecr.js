/**
 * Migration: Add selected_validations to ecr_reports
 * Date: 2026-01-13
 * Purpose: Store validation actions selected in ECR-2B Impact Analysis
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apqp_system',
  password: 'postgres',
  port: 5432,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration: add_selected_validations_to_ecr');

    // Add selected_validations column
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS selected_validations JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Column selected_validations added successfully');

    // Add comment for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.selected_validations IS
      'Array of validation actions selected in ECR-2B Impact Analysis';
    `);

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
