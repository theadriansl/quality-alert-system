require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function debug() {
  try {
    // 1. Verificar qué hay en la BD
    console.log('\n1️⃣ ===== DATOS EN LA BASE DE DATOS =====');
    const dbResult = await pool.query(`
      SELECT
        id,
        d3_mfg_others,
        d3_mfg_temporary_controls,
        d3_mfg_line_modifications
      FROM eightd_reports
      WHERE id = 4
    `);

    const report = dbResult.rows[0];
    console.log('\nColumna d3_mfg_others (snake_case):');
    console.log('Tipo:', typeof report.d3_mfg_others);
    console.log('Es Array?:', Array.isArray(report.d3_mfg_others));
    console.log('Contenido:', JSON.stringify(report.d3_mfg_others, null, 2));

    console.log('\n\nColumna d3_mfg_temporary_controls (para comparar):');
    console.log('Tipo:', typeof report.d3_mfg_temporary_controls);
    console.log('Es Array?:', Array.isArray(report.d3_mfg_temporary_controls));
    console.log('Items:', report.d3_mfg_temporary_controls?.length || 0);

    // 2. Simular transformación a camelCase
    const { transformToCamelCase } = require('./utils/caseTransform.js');

    console.log('\n\n2️⃣ ===== DESPUÉS DE transformToCamelCase =====');
    const transformed = transformToCamelCase(report);

    console.log('\nCampo d3MfgOthers (camelCase):');
    console.log('Existe?:', 'd3MfgOthers' in transformed);
    console.log('Tipo:', typeof transformed.d3MfgOthers);
    console.log('Es Array?:', Array.isArray(transformed.d3MfgOthers));
    console.log('Contenido:', JSON.stringify(transformed.d3MfgOthers, null, 2));

    console.log('\n\nCampo d3MfgTemporaryControls (para comparar):');
    console.log('Existe?:', 'd3MfgTemporaryControls' in transformed);
    console.log('Es Array?:', Array.isArray(transformed.d3MfgTemporaryControls));
    console.log('Items:', transformed.d3MfgTemporaryControls?.length || 0);

    // 3. Listar TODAS las claves que contienen "others"
    console.log('\n\n3️⃣ ===== TODAS LAS CLAVES CON "others" =====');
    const allKeys = Object.keys(transformed);
    const othersKeys = allKeys.filter(key => key.toLowerCase().includes('other'));
    console.log('Claves encontradas:', othersKeys);

    // 4. Mostrar TODAS las claves d3Mfg
    console.log('\n\n4️⃣ ===== TODAS LAS CLAVES d3Mfg =====');
    const d3Keys = allKeys.filter(key => key.startsWith('d3Mfg'));
    d3Keys.forEach(key => {
      const val = transformed[key];
      console.log(`${key}: ${Array.isArray(val) ? `Array[${val.length}]` : typeof val}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

debug();
