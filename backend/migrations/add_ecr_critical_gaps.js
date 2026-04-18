const { pool } = require('../config/database');

async function addECRCriticalGaps() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding ECR critical gaps fields (IATF compliance)...');

    await client.query('BEGIN');

    // Add critical fields for IATF compliance
    await client.query(`
      ALTER TABLE ecr_reports
      ADD COLUMN IF NOT EXISTS communication_plan JSONB DEFAULT '{
        "customer": {"method": "", "date": "", "status": "pending", "notes": ""},
        "supplier": {"method": "", "date": "", "status": "pending", "notes": ""},
        "plant": {"method": "", "date": "", "status": "pending", "notes": ""},
        "warehouse": {"method": "", "date": "", "status": "pending", "notes": ""},
        "logistics": {"method": "", "date": "", "status": "pending", "notes": ""}
      }'::jsonb,
      ADD COLUMN IF NOT EXISTS customer_approval JSONB DEFAULT '{
        "required": false,
        "status": "not_required",
        "approvedBy": "",
        "approvedAt": null,
        "comments": "",
        "evidence": []
      }'::jsonb,
      ADD COLUMN IF NOT EXISTS ppap_status_detail JSONB DEFAULT '{
        "level": "",
        "submittedDate": "",
        "approvedDate": "",
        "evidence": []
      }'::jsonb
    `);

    // Add comments for documentation
    await client.query(`
      COMMENT ON COLUMN ecr_reports.communication_plan IS
      'Plan de comunicación a partes interesadas (IATF 8.5.6.1.1). Estructura por stakeholder: customer, supplier, plant, warehouse, logistics. Cada uno con: method, date, status, notes.';

      COMMENT ON COLUMN ecr_reports.customer_approval IS
      'Aprobación del cliente para el cambio (IATF requirement). Incluye: required (bloqueante), status, approvedBy, approvedAt, comments, evidence.';

      COMMENT ON COLUMN ecr_reports.ppap_status_detail IS
      'Estado detallado de PPAP (IATF 8.3.5.2). Incluye: level (partial/full/not_required), submittedDate, approvedDate, evidence.';
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ecr_communication_status
      ON ecr_reports USING GIN (communication_plan);

      CREATE INDEX IF NOT EXISTS idx_ecr_customer_approval_required
      ON ecr_reports ((customer_approval->>'required'))
      WHERE customer_approval->>'required' = 'true';

      CREATE INDEX IF NOT EXISTS idx_ecr_ppap_level
      ON ecr_reports ((ppap_status_detail->>'level'));
    `);

    await client.query('COMMIT');

    console.log('✅ ECR critical gaps fields added successfully');
    console.log('');
    console.log('📋 Added columns:');
    console.log('   - communication_plan: Plan de comunicación (IATF 8.5.6.1.1)');
    console.log('   - customer_approval: Aprobación cliente obligatoria');
    console.log('   - ppap_status_detail: Estado PPAP detallado (IATF 8.3.5.2)');
    console.log('');
    console.log('🎯 IATF Compliance: Critical gaps addressed');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding ECR critical gaps:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addECRCriticalGaps()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addECRCriticalGaps };
