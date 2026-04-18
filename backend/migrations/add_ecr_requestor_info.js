const { pool } = require('../config/database');

async function addECRRequestorInfo() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding ECR requestor information fields...');

    await client.query('BEGIN');

    // Add requestor information fields
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS requestor_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS requestor_department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS requestor_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS requestor_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS requestor_extension VARCHAR(20)
    `);

    // Add comments for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.requestor_name IS
      'Nombre completo del solicitante del cambio (puede ser un usuario del sistema o personalizado)';

      COMMENT ON COLUMN ecr_reports.requestor_department IS
      'Departamento del solicitante del cambio (ej: Ingeniería, Calidad, Manufactura)';

      COMMENT ON COLUMN ecr_reports.requestor_email IS
      'Email de contacto del solicitante del cambio';

      COMMENT ON COLUMN ecr_reports.requestor_phone IS
      'Teléfono de contacto del solicitante del cambio';

      COMMENT ON COLUMN ecr_reports.requestor_extension IS
      'Extensión telefónica del solicitante del cambio';
    `);

    // Create index for department (useful for filtering/reporting)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_requestor_department
      ON ecr_reports (requestor_department)
      WHERE requestor_department IS NOT NULL;
    `);

    await client.query('COMMIT');

    console.log('✅ ECR requestor information fields added successfully');
    console.log('');
    console.log('📋 Added columns:');
    console.log('   - requestor_name: Nombre del solicitante');
    console.log('   - requestor_department: Departamento del solicitante');
    console.log('   - requestor_email: Email de contacto');
    console.log('   - requestor_phone: Teléfono de contacto');
    console.log('   - requestor_extension: Extensión telefónica');
    console.log('');
    console.log('🎯 IATF Gap Closed: Requestor information (ECR-1 - 30% gap reduction)');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding ECR requestor information:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addECRRequestorInfo()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addECRRequestorInfo };
