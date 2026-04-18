const { query } = require('./config/database');

async function checkStatus() {
  try {
    const result = await query(`
      SELECT
        id,
        report_id,
        current_approval_step,
        d1_d2_d3_approval_status,
        approval_1_status,
        approval_1_comments,
        approval_1_by,
        approval_1_at
      FROM eightd_reports
      WHERE report_id = '8D-2025-0316'
    `);

    if (result.rows.length > 0) {
      const r = result.rows[0];
      console.log('\n=== ESTADO ACTUAL DEL REPORTE ===');
      console.log('Report ID:', r.report_id);
      console.log('Current Step:', r.current_approval_step);
      console.log('Overall Status:', r.d1_d2_d3_approval_status);
      console.log('Approval 1 Status:', r.approval_1_status);
      console.log('Approval 1 By:', r.approval_1_by);
      console.log('Approval 1 At:', r.approval_1_at);
      console.log('Approval 1 Comments:', r.approval_1_comments);
    } else {
      console.log('Reporte no encontrado');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatus();
