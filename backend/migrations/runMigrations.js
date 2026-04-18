const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running database migrations...\n');

    // Read and execute schema SQL file
    console.log('📋 Creating schema...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '001_complete_schema.sql'),
      'utf8'
    );

    await client.query(schemaSQL);
    console.log('✅ Schema created successfully\n');

    // Run seed data script
    console.log('🌱 Seeding initial data...');
    const { seedData } = require('./002_seed_data');
    await seedData();

    console.log('\n✅ All migrations completed successfully!');
    console.log('🎉 Database is ready to use\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
