const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Department IDs (hardcoded in frontend)
const DEPARTMENTS = [1, 2, 3, 4, 5, 6]; // Produccion, Calidad, Ingenieria, Mantenimiento, Logistica, Proveedor

// Random helper
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a random date within the last N days
const randomDate = (daysBack) => {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const random = new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  return random.toISOString();
};

const NOTES = [
  'Detectado en inspeccion visual',
  'Reportado por operador de linea',
  'Encontrado durante auditoria GP12',
  'Cliente reporto en recibo',
  'Detectado en estacion de verificacion',
  'Pieza de retrabajo',
  'Segunda ocurrencia en el turno',
  'Revisar con ingenieria',
  'Posible problema de proveedor',
  'Lote completo afectado',
  null, null, null, null // Some entries without notes
];

const LOT_PREFIXES = ['LOT', 'BT', 'SN', 'LT', 'P'];

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding mock defect entries...\n');

    // Fetch existing catalog data
    const [partsRes, defectsRes, severitiesRes, stationsRes, shiftsRes, stagesRes, dispositionsRes, usersRes] =
      await Promise.all([
        client.query(`
          SELECT cp.id as part_id, cp.client_id, cp.project_id, cp.part_number
          FROM client_parts cp
          WHERE cp.active = true
          LIMIT 50
        `),
        client.query('SELECT id, code, name FROM defect_types WHERE is_active = true'),
        client.query('SELECT id, code, name FROM inspection_severities WHERE is_active = true'),
        client.query('SELECT id, code, name FROM inspection_stations WHERE is_active = true'),
        client.query('SELECT id, code, name FROM inspection_shifts WHERE is_active = true'),
        client.query('SELECT id, code, name FROM inspection_stages WHERE is_active = true'),
        client.query('SELECT id, code, name FROM inspection_dispositions WHERE is_active = true'),
        client.query('SELECT id, first_name, last_name FROM users WHERE is_active = true LIMIT 20')
      ]);

    const parts = partsRes.rows;
    const defects = defectsRes.rows;
    const severities = severitiesRes.rows;
    const stations = stationsRes.rows;
    const shifts = shiftsRes.rows;
    const stages = stagesRes.rows;
    const dispositions = dispositionsRes.rows;
    const users = usersRes.rows;

    console.log(`  Partes activas: ${parts.length}`);
    console.log(`  Tipos de defecto: ${defects.length}`);
    console.log(`  Severidades: ${severities.length}`);
    console.log(`  Estaciones: ${stations.length}`);
    console.log(`  Turnos: ${shifts.length}`);
    console.log(`  Etapas: ${stages.length}`);
    console.log(`  Disposiciones: ${dispositions.length}`);
    console.log(`  Usuarios: ${users.length}`);

    if (parts.length === 0) {
      console.log('\n  No hay partes activas. Ejecuta seed_parts_data.js primero.');
      return;
    }
    if (defects.length === 0) {
      console.log('\n  No hay tipos de defecto. Ejecuta seed_defects_test.js primero.');
      return;
    }

    // Generate 100 mock entries with ALL fields filled, spread over last 90 days
    const TOTAL_ENTRIES = 100;
    let inserted = 0;

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
      const part = pick(parts);
      const defect = pick(defects);
      const severity = pick(severities);
      const station = pick(stations);
      const shift = pick(shifts);
      const stage = pick(stages);
      const disposition = pick(dispositions);
      const inspector = pick(users);
      const capturedBy = pick(users);
      const dept = pick(DEPARTMENTS);
      const downtime = randInt(0, 90);
      const lotPrefix = pick(LOT_PREFIXES);
      const lotNumber = `${lotPrefix}-${randInt(1000, 9999)}`;
      const note = pick(NOTES.filter(n => n !== null));
      const capturedAt = randomDate(90);
      const qty = randInt(1, 3);
      const statuses = ['open', 'open', 'resolved', 'closed'];
      const status = pick(statuses);

      try {
        await client.query(
          `INSERT INTO defect_entries_v2 (
            part_id, client_id, project_id, defect_type_id,
            severity_id, stage_id, disposition_id, station_id, shift_id,
            inspector_id, department_id, lot_number, downtime_minutes,
            notes, quantity, captured_by_user_id, captured_at, status, repair_status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'OPEN'
          )`,
          [
            part.part_id, part.client_id, part.project_id, defect.id,
            severity?.id || null, stage?.id || null, disposition?.id || null,
            station?.id || null, shift?.id || null,
            inspector?.id || null, dept, lotNumber, downtime,
            note, qty, capturedBy?.id || null, capturedAt, status
          ]
        );
        inserted++;
      } catch (err) {
        console.log(`  Error en entrada ${i + 1}: ${err.message}`);
      }
    }

    console.log(`\n  ${inserted} entradas de defecto insertadas`);

    // Show summary
    const summary = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed
      FROM defect_entries_v2
    `);
    const s = summary.rows[0];
    console.log(`\n  Resumen total en BD:`);
    console.log(`    Total: ${s.total} | Abiertos: ${s.open} | Resueltos: ${s.resolved} | Cerrados: ${s.closed}`);

    console.log('\n  Seed completado!');

  } catch (error) {
    console.error('  Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
