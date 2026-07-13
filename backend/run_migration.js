const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'apqp_system',
  user: 'postgres',
  password: 'postgres'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running migration 100_defect_spec_link.sql...');

    // 1. Add spec_id column
    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS spec_id INTEGER REFERENCES part_specifications(id)
    `);
    console.log('✅ Added spec_id column');

    // 2. Add original measured value
    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS original_measured_value DECIMAL(15,6)
    `);
    console.log('✅ Added original_measured_value column');

    // 3. Index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_defect_entries_spec ON defect_entries_v2(spec_id)
    `);
    console.log('✅ Created index');

    // 4. Re-verification fields
    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS reverification_result VARCHAR(20)
    `);

    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS reverification_value DECIMAL(15,6)
    `);

    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS reverification_at TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE defect_entries_v2
      ADD COLUMN IF NOT EXISTS reverification_by INTEGER REFERENCES users(id)
    `);
    console.log('✅ Added reverification columns');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
