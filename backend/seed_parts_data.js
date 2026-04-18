// Seed sample parts data with custom fields for each client
const { query } = require('./config/database');

const sampleParts = [
  // Faurecia - Automotive parts with ECR tracking
  {
    clientId: 1,
    partNumber: 'FAU-2024-001',
    partName: 'Dashboard Assembly',
    description: 'Complete dashboard assembly with electronics',
    revision: 'Rev C',
    unitCost: 450.50,
    currency: 'USD',
    active: true,
    customFields: {
      'ECR#': 'ECR-2024-001',
      'Drawing#': 'DWG-FAU-001',
      'Supplier': 'Tier 1 Plastics Inc'
    }
  },
  {
    clientId: 1,
    partNumber: 'FAU-2024-002',
    partName: 'Center Console',
    description: 'Center console with cup holders',
    revision: 'Rev B',
    unitCost: 125.75,
    currency: 'USD',
    active: true,
    customFields: {
      'ECR#': 'ECR-2024-002',
      'Drawing#': 'DWG-FAU-002',
      'Supplier': 'AutoParts Mexico'
    }
  },
  {
    clientId: 1,
    partNumber: 'FAU-2023-015',
    partName: 'Old Trim Panel',
    description: 'Obsolete trim panel - replaced by FAU-2024-003',
    revision: 'Rev A',
    unitCost: 45.00,
    currency: 'USD',
    active: false,
    customFields: {
      'ECR#': 'ECR-2023-015',
      'Drawing#': 'DWG-FAU-015',
      'Supplier': 'Legacy Supplier'
    }
  },

  // Gissing - Metal parts with material specs
  {
    clientId: 2,
    partNumber: 'GIS-A1234',
    partName: 'Stamped Bracket',
    description: 'Steel bracket for mounting',
    revision: '1.2',
    unitCost: 12.50,
    currency: 'USD',
    active: true,
    customFields: {
      'Part Type': 'Stamping',
      'Material': 'Steel AISI 1020',
      'Finish': 'Zinc Plated'
    }
  },
  {
    clientId: 2,
    partNumber: 'GIS-B5678',
    partName: 'Aluminum Housing',
    description: 'Die cast aluminum housing',
    revision: '2.0',
    unitCost: 78.25,
    currency: 'USD',
    active: true,
    customFields: {
      'Part Type': 'Die Cast',
      'Material': 'Aluminum A380',
      'Finish': 'Powder Coated Black'
    }
  },

  // Lucid - Electric vehicle parts with supply chain data
  {
    clientId: 3,
    partNumber: 'LUC-EV-001',
    partName: 'Battery Connector',
    description: 'High voltage battery connector assembly',
    revision: '3.1',
    unitCost: 245.00,
    currency: 'USD',
    active: true,
    customFields: {
      'Supplier Code': 'SUP-LUC-001',
      'Lead Time (weeks)': '6',
      'MOQ': '500'
    }
  },
  {
    clientId: 3,
    partNumber: 'LUC-EV-002',
    partName: 'Motor Mount',
    description: 'Electric motor mounting bracket',
    revision: '2.5',
    unitCost: 156.80,
    currency: 'USD',
    active: true,
    customFields: {
      'Supplier Code': 'SUP-LUC-002',
      'Lead Time (weeks)': '4',
      'MOQ': '1000'
    }
  },

  // ElringKlinger - Precision parts with tooling info
  {
    clientId: 4,
    partNumber: 'ELR-2024-M10',
    partName: 'Gasket Insert',
    description: 'Precision molded gasket insert',
    revision: 'A',
    unitCost: 8.75,
    currency: 'USD',
    active: true,
    customFields: {
      'Tool Number': 'T-2024-001',
      'Cavity': '8',
      'Cycle Time (sec)': '45'
    }
  },
  {
    clientId: 4,
    partNumber: 'ELR-2024-M11',
    partName: 'Seal Ring',
    description: 'High temperature seal ring',
    revision: 'B',
    unitCost: 6.50,
    currency: 'USD',
    active: true,
    customFields: {
      'Tool Number': 'T-2024-002',
      'Cavity': '16',
      'Cycle Time (sec)': '30'
    }
  },

  // Mubea - Metal forming with heat treatment
  {
    clientId: 5,
    partNumber: 'MUB-SP-2024-01',
    partName: 'Suspension Spring',
    description: 'Coil spring for suspension system',
    revision: '1.0',
    unitCost: 45.50,
    currency: 'USD',
    active: true,
    customFields: {
      'Heat Treatment': 'Quenched & Tempered',
      'Hardness': '45-50 HRC',
      'Surface Treatment': 'Shot Peened'
    }
  },
  {
    clientId: 5,
    partNumber: 'MUB-SP-2024-02',
    partName: 'Stabilizer Bar',
    description: 'Anti-roll bar for chassis',
    revision: '1.1',
    unitCost: 89.00,
    currency: 'USD',
    active: true,
    customFields: {
      'Heat Treatment': 'Normalized',
      'Hardness': '35-40 HRC',
      'Surface Treatment': 'Painted'
    }
  },
  {
    clientId: 5,
    partNumber: 'MUB-OLD-001',
    partName: 'Legacy Spring Design',
    description: 'Old spring design - discontinued',
    revision: '0.9',
    unitCost: 35.00,
    currency: 'USD',
    active: false,
    customFields: {
      'Heat Treatment': 'Air Cooled',
      'Hardness': '30-35 HRC',
      'Surface Treatment': 'None'
    }
  }
];

async function seedParts() {
  try {
    console.log('🌱 Seeding parts data...\n');

    for (const part of sampleParts) {
      try {
        const result = await query(
          `INSERT INTO client_parts (
            client_id, part_number, part_name, description, revision,
            unit_cost, currency, active, custom_fields
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, part_number`,
          [
            part.clientId,
            part.partNumber,
            part.partName,
            part.description,
            part.revision,
            part.unitCost,
            part.currency,
            part.active,
            JSON.stringify(part.customFields)
          ]
        );

        const status = part.active ? '✓ Active' : '✗ Inactive';
        console.log(`✅ Created: ${result.rows[0].part_number} (ID: ${result.rows[0].id}) - ${status}`);
      } catch (err) {
        if (err.code === '23505') {
          // Duplicate key error
          console.log(`⚠️  Skipped: ${part.partNumber} (already exists)`);
        } else {
          throw err;
        }
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    const stats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true) as active,
        COUNT(*) FILTER (WHERE active = false) as inactive
      FROM client_parts
    `);

    console.log(`   Total parts: ${stats.rows[0].total}`);
    console.log(`   Active: ${stats.rows[0].active}`);
    console.log(`   Inactive: ${stats.rows[0].inactive}`);

    // Custom fields summary
    const customFieldsResult = await query(`
      SELECT DISTINCT jsonb_object_keys(custom_fields) as field_name
      FROM client_parts
      WHERE custom_fields IS NOT NULL AND custom_fields != '{}'::jsonb
      ORDER BY field_name
    `);

    console.log(`\n✨ Custom fields found:`);
    customFieldsResult.rows.forEach(row => {
      console.log(`   - ${row.field_name}`);
    });

    console.log('\n✅ Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding parts:', error);
    process.exit(1);
  }
}

seedParts();
