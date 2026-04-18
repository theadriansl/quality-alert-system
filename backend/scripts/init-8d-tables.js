const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeTables() {
  try {
    console.log('🔄 Initializing 8D tables...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'create-8d-tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the entire SQL content at once
    await query(sqlContent);
    
    console.log('✅ 8D tables initialized successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    process.exit(1);
  }
}

initializeTables();