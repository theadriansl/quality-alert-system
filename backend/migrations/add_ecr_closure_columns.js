const { pool } = require('../config/database');

async function addECRClosureColumns() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding ECR closure columns...');

    await client.query('BEGIN');

    // Add closure columns to ecr_reports table
    await client.query(`
      ALTER TABLE ecr_reports
      -- 1. Verification section
      ADD COLUMN IF NOT EXISTS dimensional_results TEXT,
      ADD COLUMN IF NOT EXISTS functional_tests TEXT,
      ADD COLUMN IF NOT EXISTS material_validations TEXT,
      ADD COLUMN IF NOT EXISTS final_validations TEXT,
      ADD COLUMN IF NOT EXISTS verification_evidence JSONB DEFAULT '[]'::jsonb,

      -- 2. Production results section
      ADD COLUMN IF NOT EXISTS isir_first_article TEXT,
      ADD COLUMN IF NOT EXISTS initial_scrap TEXT,
      ADD COLUMN IF NOT EXISTS process_stability TEXT,
      ADD COLUMN IF NOT EXISTS cpk_post_change TEXT,
      ADD COLUMN IF NOT EXISTS production_evidence JSONB DEFAULT '[]'::jsonb,

      -- 3. Documentation section
      ADD COLUMN IF NOT EXISTS released_revisions TEXT,
      ADD COLUMN IF NOT EXISTS dms_update TEXT,
      ADD COLUMN IF NOT EXISTS traceability_evidence TEXT,
      ADD COLUMN IF NOT EXISTS documentation_evidence JSONB DEFAULT '[]'::jsonb,

      -- 4. Final release section
      ADD COLUMN IF NOT EXISTS effective_date DATE,
      ADD COLUMN IF NOT EXISTS affected_parts TEXT,
      ADD COLUMN IF NOT EXISTS ppap_status VARCHAR(50),

      -- 5. Lessons learned section
      ADD COLUMN IF NOT EXISTS detected_risks TEXT,
      ADD COLUMN IF NOT EXISTS applied_improvements TEXT,

      -- 6. Formal closure section
      ADD COLUMN IF NOT EXISTS process_owner_signature INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS process_owner_signed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS management_signature INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS management_signed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_ppap_status ON ecr_reports(ppap_status);
      CREATE INDEX IF NOT EXISTS idx_ecr_is_completed ON ecr_reports(is_completed);
      CREATE INDEX IF NOT EXISTS idx_ecr_effective_date ON ecr_reports(effective_date);
    `);

    await client.query('COMMIT');

    console.log('✅ ECR closure columns added successfully');
    console.log('');
    console.log('📋 Added columns:');
    console.log('   Section 1 - Verification: dimensional_results, functional_tests, material_validations, final_validations, verification_evidence');
    console.log('   Section 2 - Production: isir_first_article, initial_scrap, process_stability, cpk_post_change, production_evidence');
    console.log('   Section 3 - Documentation: released_revisions, dms_update, traceability_evidence, documentation_evidence');
    console.log('   Section 4 - Release: effective_date, affected_parts, ppap_status');
    console.log('   Section 5 - Lessons: detected_risks, applied_improvements');
    console.log('   Section 6 - Signatures: process_owner_signature, process_owner_signed_at, management_signature, management_signed_at, is_completed');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding ECR closure columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addECRClosureColumns()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addECRClosureColumns };
