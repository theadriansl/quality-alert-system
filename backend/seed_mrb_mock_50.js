/**
 * Seed 50 campañas MRB mock — 6 meses (Oct 2025 – Apr 2026)
 * Ejecutar: node seed_mrb_mock_50.js
 */
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── Catálogos reales ────────────────────────────────────────────────────────

const PARTS = [
  { id: 68, partNumber: 'FAU-IP-001', partName: 'Instrument Panel Main Frame', projectId: 1, clientId: 1, unitCost: 125.50 },
  { id: 69, partNumber: 'FAU-IP-002', partName: 'Center Console Trim',         projectId: 1, clientId: 1, unitCost: 45.00  },
  { id: 70, partNumber: 'FAU-IP-003', partName: 'Air Vent Bezel',              projectId: 1, clientId: 1, unitCost: 12.75  },
  { id: 80, partNumber: 'LUC-EV-001', partName: 'Battery Tray Main Structure', projectId: 2, clientId: 3, unitCost: 450.00 },
  { id: 81, partNumber: 'LUC-EV-002', partName: 'Cell Module Bracket',         projectId: 2, clientId: 3, unitCost: 35.00  },
  { id: 75, partNumber: 'GIS-SB-001', partName: 'Seat Belt Buckle Housing',    projectId: 4, clientId: 2, unitCost: 18.50  },
  { id: 76, partNumber: 'GIS-SB-002', partName: 'Buckle Release Button',       projectId: 4, clientId: 2, unitCost: 3.25   },
  { id: 77, partNumber: 'GIS-SB-003', partName: 'Latch Mechanism',             projectId: 4, clientId: 2, unitCost: 8.75   },
  { id: 82, partNumber: 'LUC-MH-001', partName: 'Motor Housing Shell',         projectId: 5, clientId: 3, unitCost: 280.00 },
  { id: 86, partNumber: 'ELK-GS-001', partName: 'Cylinder Head Gasket',        projectId: 6, clientId: 4, unitCost: 45.00  },
  { id: 87, partNumber: 'ELK-GS-002', partName: 'Intake Manifold Gasket',      projectId: 6, clientId: 4, unitCost: 12.50  },
  { id: 88, partNumber: 'ELK-GS-003', partName: 'Oil Pan Gasket',              projectId: 6, clientId: 4, unitCost: 8.75   },
];

const DEPTS      = [1, 2, 3, 4, 5, 6];
const SEVERITIES = [1, 2, 3, 4];        // MINOR, MAJOR, CRITICAL, ALTA
const USERS      = [2, 3, 4, 5, 7];
const SHIFTS     = [1, 2, 3, 4];
const DEFECTS    = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34];
const STAGES     = [1, 2, 3, 4, 5];
const DISPS      = [
  { id: 1, code: 'USE_AS_IS',       sevId: 1 },
  { id: 2, code: 'REWORK',          sevId: 2 },
  { id: 3, code: 'SCRAP',           sevId: 3 },
  { id: 4, code: 'RETURN_SUPPLIER', sevId: 2 },
  { id: 5, code: 'HOLD',            sevId: 1 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rnd   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndF  = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

// Genera fecha aleatoria entre dos fechas
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ── Plantillas de campañas ───────────────────────────────────────────────────

const TITLES = [
  'Rayadura superficial en panel',
  'Dimensión fuera de tolerancia',
  'Rebaba en borde de corte',
  'Mancha de aceite en superficie',
  'Componente flojo post-ensamble',
  'Decoloración en área visible',
  'Faltante de componente',
  'Grieta en zona de unión',
  'Despostillado en pintura',
  'Contaminación en sellado',
  'Golpe en transporte',
  'Torque incorrecto en sujeción',
  'Abolladura en área crítica',
  'Sucio en interior de componente',
  'Roto en pestaña de ensamble',
  'Medida de orificio fuera de spec',
  'Acabado superficial inaceptable',
  'Material incorrecto entregado',
  'Etiqueta incorrecta aplicada',
  'Soldadura porosa detectada en inspección',
];

// ── Distribución temporal ────────────────────────────────────────────────────
// 50 campañas en 6 meses: Oct 2025 – Apr 2026

const MONTHS = [
  { year: 2025, month: 9,  count: 9,  closedRatio: 1.0  }, // Oct 2025 — todas cerradas
  { year: 2025, month: 10, count: 9,  closedRatio: 1.0  }, // Nov 2025 — todas cerradas
  { year: 2025, month: 11, count: 8,  closedRatio: 0.88 }, // Dic 2025 — mayoría cerradas
  { year: 2026, month: 0,  count: 8,  closedRatio: 0.75 }, // Ene 2026 — mix
  { year: 2026, month: 1,  count: 8,  closedRatio: 0.5  }, // Feb 2026 — mix
  { year: 2026, month: 2,  count: 8,  closedRatio: 0.25 }, // Mar 2026 — mayoria abiertas
];

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener último número de campaña para continuar secuencia
    const lastRes = await client.query("SELECT MAX(id) as last_id FROM mrb_campaigns");
    let campaignId = (parseInt(lastRes.rows[0].last_id) || 10);

    let totalInserted = 0;
    let numCounter2025 = 11; // empieza desde MRB-2025-0011
    let numCounter2026 = 11; // empieza desde MRB-2026-0011

    for (const mo of MONTHS) {
      const monthStart = new Date(mo.year, mo.month, 1);
      const monthEnd   = new Date(mo.year, mo.month + 1, 0);

      for (let i = 0; i < mo.count; i++) {
        campaignId++;
        const part       = pick(PARTS);
        const deptId     = pick(DEPTS);
        const sevId      = pick(SEVERITIES);
        const createdBy  = pick(USERS);
        const assignedTo = pick(USERS);
        const createdAt  = randomDate(monthStart, monthEnd);

        // Definir status
        const rand = Math.random();
        let status;
        if (rand < mo.closedRatio * 0.7) status = 'CERRADA';
        else if (rand < mo.closedRatio)   status = 'EN_PROCESO';
        else                               status = 'ABIERTA';

        // Cantidades
        const qtyTotal    = rnd(200, 5000);
        const qtyInsp     = status === 'ABIERTA' ? rnd(0, Math.floor(qtyTotal * 0.3)) : status === 'EN_PROCESO' ? rnd(Math.floor(qtyTotal*0.3), Math.floor(qtyTotal*0.9)) : qtyTotal;
        const nokPct      = rndF(0.01, 0.12);
        const qtyNok      = Math.round(qtyInsp * nokPct);
        const qtyOk       = qtyInsp - qtyNok;

        // Distribución de NOK entre disposiciones
        const scrapPct    = rndF(0.1, 0.4);
        const reworkPct   = rndF(0.2, 0.5);
        const uaiPct      = rndF(0.05, 0.2);
        const returnPct   = rndF(0.02, 0.1);
        const qtyScrap    = Math.round(qtyNok * scrapPct);
        const qtyRework   = Math.round(qtyNok * reworkPct);
        const qtyUai      = Math.round(qtyNok * uaiPct);
        const qtyReturn   = Math.round(qtyNok * returnPct);
        const qtyHold     = qtyNok - qtyScrap - qtyRework - qtyUai - qtyReturn;

        // Cuarentena
        const qtyWh      = Math.round(qtyTotal * rndF(0.02, 0.1));
        const qtyProc    = Math.round(qtyTotal * rndF(0.3, 0.6));
        const qtyTrans   = Math.round(qtyTotal * rndF(0.02, 0.08));
        const qtyCust    = Math.round(qtyTotal * rndF(0.01, 0.05));

        // Costos unitarios
        const inspRate   = rndF(7.5, 12.0);
        const supRate    = rndF(13.0, 18.0);

        // Fechas adicionales para campañas cerradas/en_proceso
        const responseDate = status !== 'ABIERTA' ? addDays(createdAt, rnd(1, 5)) : null;
        const closedAt     = status === 'CERRADA'  ? addDays(createdAt, rnd(7, 45)) : null;

        // Número de campaña
        const year = mo.year;
        let campaignNumber;
        if (year === 2025) {
          campaignNumber = `MRB-2025-${String(numCounter2025++).padStart(4,'0')}`;
        } else {
          campaignNumber = `MRB-2026-${String(numCounter2026++).padStart(4,'0')}`;
        }

        const title = pick(TITLES) + ' — ' + part.partName.split(' ')[0];

        // ── Insert campaña ────────────────────────────────────────────────
        await client.query(`
          INSERT INTO mrb_campaigns (
            id, campaign_number, client_id, project_id, part_id,
            title, description, severity_id, status,
            department_id, created_by, assigned_to, reported_by,
            qty_quarantine_total, qty_quarantine_warehouse, qty_quarantine_process,
            qty_quarantine_transit, qty_quarantine_customer,
            qty_inspected, qty_ok, qty_nok,
            qty_scrap, qty_rework, qty_use_as_is, qty_return, qty_hold,
            inspector_unit_cost, supervisor_unit_cost,
            inspector_count, supervisor_count,
            source_type, lot_number,
            created_at, updated_at, response_date, closed_at,
            root_cause, corrective_action,
            validation_status
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,
            $10,$11,$12,$13,
            $14,$15,$16,$17,$18,
            $19,$20,$21,
            $22,$23,$24,$25,$26,
            $27,$28,$29,$30,
            $31,$32,
            $33,$34,$35,$36,
            $37,$38,$39
          )
        `, [
          campaignId, campaignNumber, part.clientId, part.projectId, part.id,
          title,
          `Campaña mock generada para demo — ${part.partNumber}`,
          sevId, status,
          deptId, createdBy, assignedTo, createdBy,
          qtyTotal, qtyWh, qtyProc, qtyTrans, qtyCust,
          qtyInsp, qtyOk, qtyNok,
          qtyScrap, qtyRework, qtyUai, qtyReturn, Math.max(0, qtyHold),
          inspRate, supRate,
          rnd(2, 6), rnd(1, 2),
          pick(['QAR', '8D', 'MANUAL']),
          `LOT-${rnd(10000,99999)}`,
          createdAt.toISOString(), createdAt.toISOString(),
          responseDate ? responseDate.toISOString() : null,
          closedAt ? closedAt.toISOString() : null,
          status === 'CERRADA' ? pick(['Variación en proceso de proveedor', 'Error de parámetros en máquina', 'Material no conforme en recepción', 'Falla en herramental de corte']) : null,
          status === 'CERRADA' ? pick(['Ajuste de parámetros y re-validación', 'Devolución a proveedor con 8D', 'Retrabajo en línea con inspección 100%', 'Cambio de herramental y auditoría']) : null,
          status === 'CERRADA' ? 'APPROVED' : 'PENDING',
        ]);

        // ── Insert defect entries ─────────────────────────────────────────
        if (qtyNok > 0) {
          const dispGroups = [
            { dispId: 3, sevId: 3, qty: qtyScrap    },  // SCRAP → CRITICAL
            { dispId: 2, sevId: 2, qty: qtyRework   },  // REWORK → MAJOR
            { dispId: 1, sevId: 1, qty: qtyUai      },  // USE_AS_IS → MINOR
            { dispId: 4, sevId: 2, qty: qtyReturn   },  // RETURN → MAJOR
            { dispId: 5, sevId: 1, qty: Math.max(0, qtyHold) }, // HOLD → MINOR
          ].filter(g => g.qty > 0);

          for (const g of dispGroups) {
            const defectTypeId = pick(DEFECTS);
            const stageId      = pick(STAGES);
            const shiftId      = pick(SHIFTS);
            const inspectorId  = pick(USERS);
            const entryDate    = responseDate || createdAt;

            await client.query(`
              INSERT INTO defect_entries_v2 (
                client_id, project_id, part_id, defect_type_id,
                quantity, captured_by_user_id, captured_at,
                severity_id, stage_id, disposition_id, shift_id, inspector_id,
                department_id, mrb_campaign_id, lot_number, created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            `, [
              part.clientId, part.projectId, part.id, defectTypeId,
              g.qty, pick(USERS), entryDate.toISOString(),
              g.sevId, stageId, g.dispId, shiftId, inspectorId,
              deptId, campaignId, `LOT-${rnd(10000,99999)}`,
              entryDate.toISOString(), entryDate.toISOString(),
            ]);
          }
        }

        // ── Insert shift hours ────────────────────────────────────────────
        const numShifts = status === 'CERRADA' ? rnd(3, 8) : status === 'EN_PROCESO' ? rnd(2, 5) : rnd(1, 2);
        for (let s = 0; s < numShifts; s++) {
          const shiftDate = addDays(createdAt, s * rnd(1, 3));
          const hoursW    = rndF(6, 10);
          const inspCount = rnd(2, 6);
          const supCount  = rnd(1, 2);
          const shiftId   = SHIFTS[s % SHIFTS.length]; // evita duplicado campaign+shift+date
          await client.query(`
            INSERT INTO mrb_shift_hours (mrb_campaign_id, shift_id, inspection_date, hours_worked, inspector_count, supervisor_count, registered_by, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (mrb_campaign_id, shift_id, inspection_date) DO NOTHING
          `, [
            campaignId, shiftId, isoDate(shiftDate),
            hoursW, inspCount, supCount,
            pick(USERS), shiftDate.toISOString(), shiftDate.toISOString(),
          ]);
        }

        // ── Insert downtime entries (algunos turnos) ──────────────────────
        if (Math.random() > 0.5) {
          const dtDate = addDays(createdAt, rnd(0, 3));
          await client.query(`
            INSERT INTO mrb_downtime_entries (mrb_campaign_id, shift_id, inspector_id, lot_number, downtime_minutes, source_type, notes, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `, [
            campaignId, pick(SHIFTS), pick(USERS),
            `LOT-${rnd(10000,99999)}`,
            rnd(15, 120),
            pick(['OK', 'NOK']),
            pick(['Espera de decisión de ingeniero', 'Falta de herramental', 'Cambio de set-up', 'Revisión de especificación', 'Paro por avería de máquina', null]),
            dtDate.toISOString(),
          ]);
        }

        totalInserted++;
        process.stdout.write(`\r  Insertando campaña ${totalInserted}/50 — ${campaignNumber}...`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✓ ${totalInserted} campañas MRB mock insertadas correctamente.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\nERROR — ROLLBACK:', e.message);
    throw e;
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(() => process.exit(1));
