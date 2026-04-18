const { pool } = require('../config/database');

async function addRequestorUserId() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding requestor_user_id column...');

    await client.query('BEGIN');

    // Add requestor_user_id column
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS requestor_user_id INTEGER REFERENCES users(id)
    `);

    // Add comment
    await client.query(`
      COMMENT ON COLUMN ecr_reports.requestor_user_id IS
      'ID del usuario del sistema que solicita el cambio (NULL si es personalizado)';
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_requestor_user_id
      ON ecr_reports (requestor_user_id)
      WHERE requestor_user_id IS NOT NULL;
    `);

    await client.query('COMMIT');

    console.log('✅ requestor_user_id column added successfully');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding requestor_user_id:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addRequestorUserId()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addRequestorUserId };
