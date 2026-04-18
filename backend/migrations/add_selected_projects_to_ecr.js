// Migration: Add selected_projects column to ecr_reports
// Date: 2026-01-12
// Description: Add support for multiple projects per ECR

const { query } = require('../config/database');

async function runMigration() {
  console.log('🔄 Adding selected_projects column to ecr_reports...');

  try {
    // Add selected_projects column
    await query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS selected_projects JSONB DEFAULT '[]'
    `);

    console.log('✅ Migration completed successfully!');
    console.log('✅ Column selected_projects added to ecr_reports');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
