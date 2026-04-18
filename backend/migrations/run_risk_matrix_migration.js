const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runRiskMatrixMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running Risk Matrix migrations...\n');

    // 1. Run risk matrix config migration
    console.log('📋 Creating risk_matrix_config table...');
    const riskMatrixSQL = fs.readFileSync(
      path.join(__dirname, 'create_risk_matrix_config.sql'),
      'utf8'
    );
    await client.query(riskMatrixSQL);
    console.log('✅ risk_matrix_config table created successfully\n');

    // 2. Update ecr_reports table with new columns
    console.log('📋 Updating ecr_reports table...');
    const updateECRSQL = `
      -- Add new columns if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='ecr_reports' AND column_name='change_category') THEN
          ALTER TABLE ecr_reports ADD COLUMN change_category VARCHAR(50);
          COMMENT ON COLUMN ecr_reports.change_category IS 'Change category: emergency, planned, continuous_improvement';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='ecr_reports' AND column_name='risk_assessment') THEN
          ALTER TABLE ecr_reports ADD COLUMN risk_assessment JSONB;
          COMMENT ON COLUMN ecr_reports.risk_assessment IS 'Calculated risk info: {riskLevel, suggestedAreas, reasoning, riskLevelInfo, legalDisclaimer}';
        END IF;
      END $$;
    `;
    await client.query(updateECRSQL);
    console.log('✅ ecr_reports table updated successfully\n');

    console.log('\n✅ All Risk Matrix migrations completed successfully!');
    console.log('🎉 Risk Matrix system is ready to use\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runRiskMatrixMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
