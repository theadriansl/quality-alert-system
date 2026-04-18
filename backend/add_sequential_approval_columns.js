const { pool } = require('./config/database');

async function addSequentialApprovalColumns() {
  try {
    console.log('🔄 Agregando columnas para sistema de aprobación secuencial...\n');

    // Agregar columna de step actual
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 0
    `);
    console.log('✅ Columna current_approval_step agregada');

    // Agregar columnas para Aprobación 1
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS approval_1_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS approval_1_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_1_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approval_1_comments TEXT
    `);
    console.log('✅ Columnas de Aprobación 1 agregadas');

    // Agregar columnas para Aprobación 2
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS approval_2_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS approval_2_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_2_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approval_2_comments TEXT
    `);
    console.log('✅ Columnas de Aprobación 2 agregadas');

    // Agregar columnas para Aprobación 3
    await pool.query(`
      ALTER TABLE eightd_reports
      ADD COLUMN IF NOT EXISTS approval_3_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS approval_3_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_3_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS approval_3_comments TEXT
    `);
    console.log('✅ Columnas de Aprobación 3 agregadas');

    // Agregar comentarios explicativos
    await pool.query(`
      COMMENT ON COLUMN eightd_reports.current_approval_step IS
      '0=draft, 1=waiting A1, 2=waiting A2, 3=waiting A3, 4=fully approved'
    `);

    await pool.query(`
      COMMENT ON COLUMN eightd_reports.approval_1_comments IS
      'Required if approval_1_status = rejected'
    `);

    await pool.query(`
      COMMENT ON COLUMN eightd_reports.approval_2_comments IS
      'Required if approval_2_status = rejected'
    `);

    await pool.query(`
      COMMENT ON COLUMN eightd_reports.approval_3_comments IS
      'Required if approval_3_status = rejected'
    `);

    console.log('✅ Comentarios explicativos agregados\n');

    // Verificar las columnas agregadas
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'eightd_reports'
      AND column_name LIKE 'approval_%' OR column_name = 'current_approval_step'
      ORDER BY column_name
    `);

    console.log('=== Verificación de Columnas Agregadas ===');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.column_default ? `(default: ${row.column_default})` : ''}`);
    });

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📋 Sistema de aprobación secuencial configurado:');
    console.log('   - Aprobador 1 → Aprobador 2 → Aprobador 3');
    console.log('   - Rechazo regresa al anterior');
    console.log('   - Comentarios obligatorios en rechazo\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addSequentialApprovalColumns();
