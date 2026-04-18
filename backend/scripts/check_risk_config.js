const { query } = require('../config/database');

async function checkRiskConfig() {
  try {
    console.log('🔍 Checking Risk Matrix Config...\n');

    const result = await query(`
      SELECT id, config_name, change_categories, is_active, created_at
      FROM risk_matrix_config
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      const config = result.rows[0];
      console.log('✅ Active Risk Matrix Config Found:');
      console.log('   ID:', config.id);
      console.log('   Name:', config.config_name);
      console.log('   Active:', config.is_active);
      console.log('');
      console.log('📋 Change Categories:');
      console.log(JSON.stringify(config.change_categories, null, 2));
    } else {
      console.log('❌ No active risk matrix config found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRiskConfig();
