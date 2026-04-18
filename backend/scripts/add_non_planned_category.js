const { query } = require('../config/database');

async function addNonPlannedCategory() {
  try {
    console.log('🔄 Adding "Non Planned" category to Risk Matrix Config...\n');

    // Get current active config
    const current = await query(`
      SELECT id, change_categories
      FROM risk_matrix_config
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (current.rows.length === 0) {
      console.log('❌ No active risk matrix config found');
      process.exit(1);
    }

    const config = current.rows[0];
    const categories = config.change_categories;

    // Check if Non Planned already exists
    const exists = categories.some(cat => cat.value === 'non_planned');
    if (exists) {
      console.log('ℹ️  "Non Planned" category already exists');
      process.exit(0);
    }

    // Add Non Planned after Emergency
    const updatedCategories = [
      categories[0], // Emergency
      {
        "label": "Non Planned",
        "value": "non_planned",
        "description": "Unscheduled changes (not necessarily emergency)"
      },
      ...categories.slice(1) // Planned, Continuous Improvement
    ];

    // Update the config
    await query(`
      UPDATE risk_matrix_config
      SET change_categories = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(updatedCategories), config.id]);

    console.log('✅ "Non Planned" category added successfully\n');
    console.log('📋 Updated Change Categories:');
    updatedCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.label} (${cat.value})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addNonPlannedCategory();
