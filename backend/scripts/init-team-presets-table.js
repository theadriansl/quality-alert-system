const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeTeamPresetsTable() {
  try {
    console.log('🔄 Initializing team_presets table...');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'create-team-presets-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Execute the SQL content
    await query(sqlContent);

    console.log('✅ team_presets table initialized successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing table:', error);
    process.exit(1);
  }
}

initializeTeamPresetsTable();
