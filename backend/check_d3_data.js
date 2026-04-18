require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkData() {
  try {
    const result = await pool.query(`
      SELECT
        d3_mfg_temporary_controls,
        d3_mfg_line_modifications,
        d3_mfg_others
      FROM eightd_reports
      WHERE id = 4
    `);

    console.log('\n📋 Datos D3 MFG del reporte 4:');
    console.log('================================================');

    const report = result.rows[0];

    console.log('\n1️⃣ Temporary Controls:', report.d3_mfg_temporary_controls ?
      `${report.d3_mfg_temporary_controls.length} items` : 'null');

    console.log('\n2️⃣ Line Modifications:', report.d3_mfg_line_modifications ?
      `${report.d3_mfg_line_modifications.length} items` : 'null');

    console.log('\n3️⃣ OTROS:', report.d3_mfg_others ?
      `${report.d3_mfg_others.length} items` : 'null');

    if (report.d3_mfg_others) {
      console.log('\n📦 Contenido de OTROS:');
      console.log(JSON.stringify(report.d3_mfg_others, null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkData();
