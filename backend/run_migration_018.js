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
    console.log('🚀 Running migration 018: Defect Shortcuts...\n');

    const migrationPath = path.join(__dirname, 'migrations', '018_defect_shortcuts.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);

    // Seed default shortcuts
    const shortcuts = [
      { name: 'Apariencia', codes: ['SCRATCH', 'DENT', 'DIRTY', 'WAX_STAIN'], color: '#f59e0b' },
      { name: 'Funcional', codes: ['LOOSE', 'MISSING', 'BROKEN', 'MALADJUSTED'], color: '#3b82f6' },
      { name: 'Eléctrico', codes: ['CONNECTOR_LOOSE', 'CONNECTOR_DAMAGED', 'UNPLUGGED'], color: '#8b5cf6' },
      { name: 'Clips', codes: ['CLIP_MISSING', 'CLIP_LOOSE'], color: '#ef4444' }
    ];

    for (const shortcut of shortcuts) {
      // Get defect type IDs for these codes
      const idsResult = await client.query(
        'SELECT id FROM defect_types WHERE code = ANY($1)',
        [shortcut.codes]
      );

      const ids = idsResult.rows.map(r => r.id);

      if (ids.length > 0) {
        await client.query(
          `INSERT INTO defect_shortcuts (name, defect_type_ids, color, display_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [shortcut.name, ids, shortcut.color, shortcuts.indexOf(shortcut) + 1]
        );
      }
    }

    await client.query('COMMIT');

    console.log('✅ Migration 018 completed successfully!\n');

    // Verify
    const count = await client.query('SELECT * FROM defect_shortcuts');
    console.log('📊 Shortcuts created:', count.rows.length);
    count.rows.forEach(s => console.log(`   - ${s.name}: ${s.defect_type_ids.length} defectos`));

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
