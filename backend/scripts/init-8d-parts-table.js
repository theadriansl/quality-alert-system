const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeEightDPartsTable() {
  try {
    console.log('🔄 Initializing eightd_parts table...');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'create-8d-parts-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Execute the SQL content
    await query(sqlContent);

    console.log('✅ eightd_parts table initialized successfully');
    console.log('✅ Indexes created');
    console.log('✅ View eightd_parts_summary created');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing table:', error);
    process.exit(1);
  }
}

initializeEightDPartsTable();
