/**
 * Run Work Instructions Migration (048)
 * Creates all tables and functions for the Work Instructions module
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Work Instructions migration (048)...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '048_work_instructions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration 048_work_instructions.sql executed successfully!\n');

    // Verify tables created
    const tables = [
      'work_instructions',
      'work_instruction_projects',
      'work_instruction_parts',
      'work_instruction_users',
      'work_instruction_revisions',
      'work_instruction_steps',
      'work_instruction_step_files',
      'work_instruction_risk_assessments',
      'work_instruction_risk_criteria_definitions'
    ];

    console.log('📋 Verifying tables created:');
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )
      `, [table]);

      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }

    // Check function created
    const funcResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'create_wi_revision_snapshot'
      )
    `);
    console.log(`   ${funcResult.rows[0].exists ? '✅' : '❌'} create_wi_revision_snapshot() function`);

    // Check criteria definitions seeded
    const criteriaResult = await client.query('SELECT COUNT(*) FROM work_instruction_risk_criteria_definitions');
    console.log(`   ✅ ${criteriaResult.rows[0].count} risk criteria definitions seeded`);

    console.log('\n🎉 Work Instructions module ready to use!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
