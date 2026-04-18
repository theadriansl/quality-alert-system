const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running migration 017: Simplify Defect Module...\n');

    const migrationPath = path.join(__dirname, 'migrations', '017_simplify_defect_module.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration 017 completed successfully!\n');

    // Verify tables created
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('defect_types', 'part_defect_config', 'defect_entries_v2')
      ORDER BY table_name
    `);

    console.log('📋 Tables created/verified:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));

    // Count defect types
    const defectTypesCount = await client.query('SELECT COUNT(*) FROM defect_types');
    console.log(`\n📊 Defect types seeded: ${defectTypesCount.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
