const { pool } = require('../config/database');

async function addECRApprovalColumns() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding ECR approval columns...');

    await client.query('BEGIN');

    // Add approval columns to ecr_reports table
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS current_approval_level INTEGER,

      -- Level 1 approver
      ADD COLUMN IF NOT EXISTS level1_approver INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level1_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS level1_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level1_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS level1_comments TEXT,

      -- Level 2 approver
      ADD COLUMN IF NOT EXISTS level2_approver INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level2_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS level2_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level2_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS level2_comments TEXT,

      -- Level 3 approver
      ADD COLUMN IF NOT EXISTS level3_approver INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level3_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS level3_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS level3_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS level3_comments TEXT
    `);

    // Create index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_approval_status ON ecr_reports(approval_status);
      CREATE INDEX IF NOT EXISTS idx_ecr_level1_approver ON ecr_reports(level1_approver);
      CREATE INDEX IF NOT EXISTS idx_ecr_level2_approver ON ecr_reports(level2_approver);
      CREATE INDEX IF NOT EXISTS idx_ecr_level3_approver ON ecr_reports(level3_approver);
    `);

    await client.query('COMMIT');

    console.log('✅ ECR approval columns added successfully');
    console.log('');
    console.log('📋 Added columns:');
    console.log('   - approval_status (VARCHAR)');
    console.log('   - current_approval_level (INTEGER)');
    console.log('   - level1_approver, level2_approver, level3_approver (INTEGER)');
    console.log('   - level1_status, level2_status, level3_status (VARCHAR)');
    console.log('   - level1_by, level2_by, level3_by (INTEGER)');
    console.log('   - level1_at, level2_at, level3_at (TIMESTAMP)');
    console.log('   - level1_comments, level2_comments, level3_comments (TEXT)');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding ECR approval columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addECRApprovalColumns()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addECRApprovalColumns };
