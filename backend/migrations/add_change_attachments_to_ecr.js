/**
 * Migration: Add change_attachments column to ecr_reports
 * Date: 2026-01-13
 * Purpose: Store document attachments for change explanations
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
    console.log('🚀 Starting migration: add_change_attachments_to_ecr');

    // Add change_attachments column
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS change_attachments JSONB DEFAULT '[]';
    `);

    console.log('✅ Column change_attachments added successfully');

    // Add comment for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.change_attachments IS
      'Document attachments for change explanation (array of {name, url, uploadedAt, size, type})';
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
