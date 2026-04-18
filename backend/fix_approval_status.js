const { query } = require('./config/database');

async function fixApprovalStatus() {
  try {
    console.log('🔧 Actualizando estado de aprobación a "approved"...\n');

    const result = await query(`
      UPDATE eightd_reports
      SET
        d1_d2_d3_approval_status = 'approved',
        current_approval_step = 3,
        approval_1_status = 'approved',
        approval_2_status = 'approved',
        approval_3_status = 'approved',
        updated_at = CURRENT_TIMESTAMP
      WHERE report_id = '8D-2025-0316'
      RETURNING id, report_id, d1_d2_d3_approval_status, current_approval_step
    `);

    if (result.rows.length > 0) {
      const report = result.rows[0];
      console.log('✅ Reporte actualizado:');
      console.log('  ID:', report.id);
      console.log('  Report ID:', report.report_id);
      console.log('  Estado D1-D2-D3:', report.d1_d2_d3_approval_status);
      console.log('  Step actual:', report.current_approval_step);
      console.log('\n✅ D4 y D5 ahora están desbloqueadas');
    } else {
      console.log('❌ Reporte no encontrado');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixApprovalStatus();
