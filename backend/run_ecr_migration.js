const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runECRMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running ECR tables migration...\n');

    // Read and execute ECR migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_ecr_tables.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('✅ ECR tables created successfully!');
    console.log('   - ecr_reports');
    console.log('   - ecr_validations');
    console.log('   - Indexes created\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runECRMigration()
  .then(() => {
    console.log('🎉 ECR module database setup complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
