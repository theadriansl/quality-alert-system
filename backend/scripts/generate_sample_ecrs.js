/**
 * Script para generar 20 ECRs de prueba
 * Ejecutar: node scripts/generate_sample_ecrs.js
 */

const { pool, query } = require('../config/database');

const CHANGE_TYPES = ['Design', 'Process', 'Material', 'Safety', 'Administrative', 'Other'];
const CHANGE_CATEGORIES = ['Emergency', 'Planned', 'Continuous Improvement'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'closed'];

const SAMPLE_TITLES = [
  'Cambio de material en componente principal',
  'Actualizacion de proceso de soldadura',
  'Modificacion de tolerancias dimensionales',
  'Nuevo proveedor de materia prima',
  'Rediseno de fixture de ensamble',
  'Optimizacion de tiempo de ciclo',
  'Cambio de especificacion de torque',
  'Actualizacion de instrucciones de trabajo',
  'Modificacion de empaque para transporte',
  'Nuevo proceso de inspeccion visual',
  'Cambio de lubricante en maquinado',
  'Actualizacion de plano de ingenieria',
  'Modificacion de secuencia de ensamble',
  'Nuevo metodo de prueba funcional',
  'Cambio de temperatura en horno',
  'Actualizacion de software de control',
  'Modificacion de layout de linea',
  'Nuevo sistema de trazabilidad',
  'Cambio de recubrimiento superficial',
  'Optimizacion de consumo energetico',
  'Rediseno de herramienta de corte',
  'Actualizacion de procedimiento de calibracion',
  'Modificacion de parametros de inyeccion',
  'Nuevo proceso de limpieza',
  'Cambio de adhesivo estructural'
];

const DEPARTMENTS = ['Engineering', 'Quality', 'Production', 'Maintenance', 'Logistics', 'R&D'];

const REQUESTOR_NAMES = [
  'Carlos Rodriguez', 'Maria Garcia', 'Juan Martinez', 'Ana Lopez',
  'Pedro Sanchez', 'Laura Hernandez', 'Miguel Torres', 'Sofia Ramirez'
];

async function generateSampleECRs() {
  const client = await pool.connect();

  try {
    console.log('Iniciando generacion de ECRs de prueba...\n');

    // Obtener clientes existentes
    const clientsResult = await query('SELECT id, name FROM clients LIMIT 10');
    const clients = clientsResult.rows;

    if (clients.length === 0) {
      console.log('No hay clientes en la base de datos. Creando cliente de prueba...');
      const newClient = await query(`
        INSERT INTO clients (name, code, is_active)
        VALUES ('Cliente Demo', 'DEMO', true)
        RETURNING id, name
      `);
      clients.push(newClient.rows[0]);
    }

    // Obtener usuarios existentes
    const usersResult = await query('SELECT id FROM users LIMIT 5');
    const users = usersResult.rows;
    const defaultUserId = users.length > 0 ? users[0].id : null;

    await client.query('BEGIN');

    const year = new Date().getFullYear();

    // Obtener el ultimo numero de ECR del ano
    const countResult = await client.query(
      'SELECT COUNT(*) FROM ecr_reports WHERE EXTRACT(YEAR FROM created_at) = $1',
      [year]
    );
    let ecrCounter = parseInt(countResult.rows[0].count) + 1;

    const createdECRs = [];

    for (let i = 0; i < 20; i++) {
      const ecrNumber = `ECR-${year}-${String(ecrCounter++).padStart(3, '0')}`;
      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      const changeType = CHANGE_TYPES[Math.floor(Math.random() * CHANGE_TYPES.length)];
      const changeCategory = CHANGE_CATEGORIES[Math.floor(Math.random() * CHANGE_CATEGORIES.length)];
      const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const title = SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)];
      const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      const requestorName = REQUESTOR_NAMES[Math.floor(Math.random() * REQUESTOR_NAMES.length)];

      // Generar fecha aleatoria en los ultimos 12 meses
      const daysAgo = Math.floor(Math.random() * 365);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      // Generar risk assessment aleatorio
      const severity = Math.floor(Math.random() * 10) + 1;
      const occurrence = Math.floor(Math.random() * 10) + 1;
      const detection = Math.floor(Math.random() * 10) + 1;
      const riskAssessment = {
        severity,
        occurrence,
        detection,
        rpn: severity * occurrence * detection
      };

      // Generar stage completion status aleatorio
      const stageCompletionStatus = {
        ecr1: { completed: Math.random() > 0.3, completedAt: Math.random() > 0.3 ? new Date().toISOString() : null },
        ecr2: { completed: Math.random() > 0.4, completedAt: Math.random() > 0.4 ? new Date().toISOString() : null },
        ecr2b: { completed: Math.random() > 0.5, completedAt: Math.random() > 0.5 ? new Date().toISOString() : null },
        ecr3: { completed: Math.random() > 0.6, completedAt: Math.random() > 0.6 ? new Date().toISOString() : null },
        ecr4: { completed: Math.random() > 0.7, completedAt: Math.random() > 0.7 ? new Date().toISOString() : null }
      };

      // Impact analysis de ejemplo
      const impactAnalysis = [
        {
          areaName: 'Production',
          areaKey: 'production',
          impact: Math.random() > 0.5 ? 'high' : 'medium',
          description: 'Impacto en linea de produccion'
        },
        {
          areaName: 'Quality',
          areaKey: 'quality',
          impact: Math.random() > 0.5 ? 'medium' : 'low',
          description: 'Impacto en controles de calidad'
        }
      ];

      const insertQuery = `
        INSERT INTO ecr_reports (
          ecr_number,
          client_id,
          change_title,
          change_description,
          change_type,
          change_category,
          priority,
          status,
          risk_assessment,
          impact_analysis,
          requestor_name,
          requestor_department,
          created_by,
          created_at,
          stage_completion_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id, ecr_number
      `;

      const result = await client.query(insertQuery, [
        ecrNumber,
        randomClient.id,
        title,
        `Descripcion detallada del cambio: ${title}. Este es un ECR de prueba generado automaticamente para demostrar las capacidades del dashboard.`,
        changeType,
        changeCategory,
        priority,
        status,
        JSON.stringify(riskAssessment),
        JSON.stringify(impactAnalysis),
        requestorName,
        department,
        defaultUserId,
        createdAt.toISOString(),
        JSON.stringify(stageCompletionStatus)
      ]);

      createdECRs.push({
        id: result.rows[0].id,
        ecrNumber: result.rows[0].ecr_number,
        title,
        status,
        client: randomClient.name
      });

      console.log(`  Creado: ${ecrNumber} - ${title.substring(0, 40)}... [${status}]`);
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log(`Se crearon ${createdECRs.length} ECRs de prueba exitosamente`);
    console.log('========================================\n');

    // Resumen por status
    const statusCount = {};
    createdECRs.forEach(ecr => {
      statusCount[ecr.status] = (statusCount[ecr.status] || 0) + 1;
    });

    console.log('Resumen por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    process.exit(0);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generando ECRs:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

generateSampleECRs();
