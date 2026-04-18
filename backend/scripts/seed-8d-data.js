const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function seedEightdData() {
  try {
    console.log('🌱 Seeding 8D reports data...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'seed-8d-reports.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the seed data
    await query(sqlContent);
    
    console.log('✅ 8D reports data seeded successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedEightdData();