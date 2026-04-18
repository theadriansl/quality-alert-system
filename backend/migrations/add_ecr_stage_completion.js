/**
 * Migration: Add stage_completion_status to ecr_reports
 * Description: Tracks completion status per stage for adoption reporting
 *
 * Structure:
 * {
 *   "ecr1": { "completed": true, "completedAt": "2026-01-22T...", "completedBy": userId, "completedByName": "John Doe" },
 *   "ecr2": { "completed": false },
 *   "ecr2b": { "completed": true, ... },
 *   "ecr3": { "completed": false },
 *   "ecr4": { "completed": false }
 * }
 */

const { query } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_ecr_stage_completion');

    // Add stage_completion_status column
    await query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS stage_completion_status JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Added stage_completion_status column');

    // Initialize existing ECRs with empty completion status
    await query(`
      UPDATE ecr_reports
      SET stage_completion_status = '{
        "ecr1": {"completed": false},
        "ecr2": {"completed": false},
        "ecr2b": {"completed": false},
        "ecr3": {"completed": false},
        "ecr4": {"completed": false}
      }'::jsonb
      WHERE stage_completion_status IS NULL OR stage_completion_status = '{}'::jsonb
    `);
    console.log('✅ Initialized stage_completion_status for existing ECRs');

    // Add index for faster queries on completion status
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_reports_stage_completion
      ON ecr_reports USING GIN (stage_completion_status)
    `);
    console.log('✅ Created index on stage_completion_status');

    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
