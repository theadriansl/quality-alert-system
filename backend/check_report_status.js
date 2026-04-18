const { query } = require('./config/database');

async function checkReportStatus() {
  try {
    const result = await query(`
      SELECT
        id,
        report_id,
        title,
        d1_d2_d3_approval_status,
        current_approval_step,
        approval_1_status,
        approval_2_status,
        approval_3_status,
        d5_completed,
        created_at,
        updated_at
      FROM eightd_reports
      WHERE report_id = '8D-2025-0316'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Reporte no encontrado');
      process.exit(1);
    }

    const report = result.rows[0];

    console.log('=== ESTADO DEL REPORTE 8D-2025-0316 ===\n');
    console.log('ID:', report.id);
    console.log('Título:', report.title);
    console.log('\n--- ESTADO DE APROBACIÓN D1-D2-D3 ---');
    console.log('d1_d2_d3_approval_status:', report.d1_d2_d3_approval_status);
    console.log('current_approval_step:', report.current_approval_step);
    console.log('approval_1_status:', report.approval_1_status);
    console.log('approval_2_status:', report.approval_2_status);
    console.log('approval_3_status:', report.approval_3_status);
    console.log('\n--- OTROS CAMPOS ---');
    console.log('d5_completed:', report.d5_completed);
    console.log('created_at:', report.created_at);
    console.log('updated_at:', report.updated_at);

    // Verificar si está realmente aprobado
    const isApproved = report.d1_d2_d3_approval_status === 'approved';
    console.log('\n--- VERIFICACIÓN ---');
    console.log(isApproved ? '✅ D1-D2-D3 ESTÁ APROBADO' : '❌ D1-D2-D3 NO ESTÁ APROBADO');

    if (!isApproved) {
      console.log('\n⚠️ PROBLEMA: El reporte NO está aprobado en la BD');
      console.log('Estado actual:', report.d1_d2_d3_approval_status);
      console.log('Debería ser: "approved" para que D4 y D5 estén habilitados');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReportStatus();
