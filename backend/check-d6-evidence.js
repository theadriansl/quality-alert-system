const { query } = require('./config/database');

async function check() {
  try {
    // Check what's in the 8D report's d6_definitive_actions
    const result = await query(`
      SELECT id, report_id, d6_definitive_actions
      FROM eightd_reports
      WHERE d6_definitive_actions IS NOT NULL
      AND jsonb_array_length(d6_definitive_actions) > 0
      ORDER BY updated_at DESC
      LIMIT 3
    `);

    console.log('Reports with D6 actions:');
    result.rows.forEach(report => {
      console.log(`\nReport: ${report.report_id} (ID: ${report.id})`);
      const actions = report.d6_definitive_actions || [];
      console.log(`Actions count: ${actions.length}`);
      actions.forEach((action, i) => {
        console.log(`  Action ${i+1}: ${action.action || action.title || 'No title'}`);
        console.log(`    workloadActivityId: ${action.workloadActivityId || 'none'}`);
        console.log(`    evidenceFiles: ${JSON.stringify(action.evidenceFiles || [])}`);
      });
    });

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
