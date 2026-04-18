/**
 * Script to run migration 010_ecr_dashboard_config.sql
 * Run with: node run_migration_010.js
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migration 010_ecr_dashboard_config.sql...\n');

    const sqlPath = path.join(__dirname, 'migrations', '010_ecr_dashboard_config.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_dashboard_configs', 'dashboard_widget_catalog')
    `);

    console.log('📋 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check widget catalog
    const widgetsResult = await client.query('SELECT COUNT(*) FROM dashboard_widget_catalog');
    console.log(`\n📊 Widgets in catalog: ${widgetsResult.rows[0].count}`);

    // Check default config
    const configResult = await client.query('SELECT COUNT(*) FROM user_dashboard_configs');
    console.log(`📋 Dashboard configs: ${configResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // If it's a duplicate error, that's OK - tables already exist
    if (error.code === '42P07') {
      console.log('\n⚠️ Tables already exist. Migration may have been run before.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
