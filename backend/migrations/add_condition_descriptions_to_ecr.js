/**
 * Migration: Add before_condition_description and after_condition_description to ecr_reports
 * Date: 2026-01-13
 * Purpose: Store detailed descriptions for Before and After conditions
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
    console.log('🚀 Starting migration: add_condition_descriptions_to_ecr');

    // Add before_condition_description and after_condition_description columns
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS before_condition_description TEXT,
      ADD COLUMN IF NOT EXISTS after_condition_description TEXT;
    `);

    console.log('✅ Columns before_condition_description and after_condition_description added successfully');

    // Add comments for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.before_condition_description IS
      'Detailed description of the condition before the change';
    `);

    await client.query(`
      COMMENT ON COLUMN ecr_reports.after_condition_description IS
      'Detailed description of the condition after the change';
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
