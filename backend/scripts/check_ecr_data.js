const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

async function checkECRData() {
  try {
    console.log('🔍 Checking ECR #1 data...\n');

    const result = await query(`
      SELECT requestor_name, requestor_department, requestor_email, requestor_phone, requestor_extension
      FROM ecr_reports
      WHERE id = 1
    `);

    if (result.rows.length > 0) {
      const data = transformToCamelCase(result.rows[0]);
      console.log('📋 Requestor Data in DB:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ No ECR found with ID 1');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkECRData();
