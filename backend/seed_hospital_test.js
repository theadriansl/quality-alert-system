/**
 * seed_hospital_test.js
 * Crea 5 defectos sin ubicación para testing de Hospital
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'apqp_system',
  user: 'postgres',
  password: 'postgres'
});

async function seed() {
  const client = await pool.connect();

  try {
    // Obtener IDs necesarios
    const parts = await client.query(`SELECT id, client_id, project_id FROM client_parts LIMIT 1`);
    const defectTypes = await client.query(`SELECT id FROM defect_types LIMIT 5`);
    const users = await client.query(`SELECT id FROM users WHERE is_active = true LIMIT 1`);
    const departments = await client.query(`SELECT id FROM departments LIMIT 1`);

    if (parts.rows.length === 0) {
      console.log('No hay partes en client_parts. Abortando.');
      return;
    }

    const part = parts.rows[0];
    const userId = users.rows[0]?.id || 1;
    const deptId = departments.rows[0]?.id || 1;

    console.log('Insertando 5 defectos de prueba sin ubicación...');

    for (let i = 1; i <= 5; i++) {
      const serial = `TEST-HOSP-${Date.now()}-${i}`;
      const defectTypeId = defectTypes.rows[i % defectTypes.rows.length]?.id || 1;

      await client.query(`
        INSERT INTO defect_entries_v2 (
          part_id, client_id, project_id, defect_type_id,
          quantity, captured_by_user_id, captured_at,
          department_id, lot_number, serial_number,
          repair_status, current_location_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $8, 'OPEN', NULL, NOW(), NOW())
      `, [
        part.id,
        part.client_id,
        part.project_id,
        defectTypeId,
        1,
        userId,
        deptId,
        serial
      ]);

      console.log(`  ✓ Defecto ${i}: ${serial}`);
    }

    console.log('\n✅ 5 defectos creados sin ubicación');
    console.log('   Refresh Hospital y ve a tab "Sin Ubicación"');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
