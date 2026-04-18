const { pool } = require('../config/database');

async function addImpactVerifications() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding impact_verifications column to ecr_reports...');

    await client.query('BEGIN');

    // Add impact_verifications column
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS impact_verifications JSONB DEFAULT '{}'::jsonb
    `);

    // Add comment for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.impact_verifications IS
      'Dynamic verification data from ECR-4 based on ECR-2B selections. Structure:
      {
        "areaKey": {
          "subsectionKey": {
            "verified": true/false,
            "observations": "Descripción de la verificación",
            "evidence": [
              {
                "name": "evidence.pdf",
                "url": "/uploads/ecr/123/evidence/...",
                "uploadedAt": "2026-01-09T10:30:00Z"
              }
            ]
          }
        }
      }'
    `);

    // Create index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_impact_verifications
      ON ecr_reports USING GIN (impact_verifications)
    `);

    await client.query('COMMIT');

    console.log('✅ impact_verifications column added successfully');
    console.log('');
    console.log('📋 Details:');
    console.log('   - Column: impact_verifications (JSONB)');
    console.log('   - Default: {} (empty object)');
    console.log('   - Purpose: Store dynamic verification data from ECR-4');
    console.log('   - Structure: Nested by areaKey → subsectionKey → verification data');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding impact_verifications column:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addImpactVerifications()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addImpactVerifications };
