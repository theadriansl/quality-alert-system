const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'apqp_system',
  user: 'postgres',
  password: 'postgres'
});

async function checkDefects() {
  try {
    // Check recent defects
    const defects = await pool.query(`
      SELECT id, entry_number, serial_number, lot_number, spec_id,
             repair_status, created_at, defect_type_id
      FROM defect_entries_v2
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n=== ULTIMOS 10 DEFECTOS ===');
    console.table(defects.rows);

    // Check recent spec inspections
    const inspections = await pool.query(`
      SELECT id, serial_number, spec_id, result, measured_value, created_at
      FROM spec_inspection_entries
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n=== ULTIMAS 10 INSPECCIONES DE SPECS ===');
    console.table(inspections.rows);

    // Check if SPEC_FAILURE defect type exists
    const specFailType = await pool.query(`
      SELECT id, code, name FROM defect_types WHERE code = 'SPEC_FAILURE'
    `);
    console.log('\n=== TIPO SPEC_FAILURE ===');
    console.table(specFailType.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDefects();
