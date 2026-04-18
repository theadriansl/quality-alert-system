const { query } = require('./config/database');

async function check() {
  try {
    const result = await query(`
      SELECT id, title, evidence_files
      FROM workload_activities
      WHERE source_type = '8D'
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('8D Activities with evidence:');
    result.rows.forEach(r => {
      console.log(`\nID: ${r.id} - Title: ${r.title}`);
      console.log('Evidence:', JSON.stringify(r.evidence_files, null, 2));
    });

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
