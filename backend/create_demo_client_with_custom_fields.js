// Create a demo client with properly structured custom fields in BOM
const { query } = require('./config/database');

async function createDemoClient() {
  try {
    console.log('🏭 Creating demo client with custom BOM fields...\n');

    // 1. Create client
    const clientResult = await query(`
      INSERT INTO clients (
        name, alias, vendor_number, corporate_address,
        corporate_phone, email, website, is_active,
        requires_signature, d4_response_time_hours, d5_response_time_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name
    `, [
      'TechFlow Manufacturing Inc',
      'TechFlow',
      'TF-2024-001',
      '1500 Innovation Drive, Austin, TX 78701, USA',
      '+1-512-555-0199',
      'procurement@techflow.com',
      'www.techflow-manufacturing.com',
      true,
      true,
      24,
      48
    ]);

    const clientId = clientResult.rows[0].id;
    console.log(`✅ Created client: ${clientResult.rows[0].name} (ID: ${clientId})\n`);

    // 2. Add contacts
    const contacts = [
      { name: 'Sarah Johnson', title: 'Quality Manager', email: 'sarah.johnson@techflow.com', phone: '+1-512-555-0150' },
      { name: 'Michael Chen', title: 'Engineering Manager', email: 'michael.chen@techflow.com', phone: '+1-512-555-0151' }
    ];

    for (const contact of contacts) {
      await query(
        'INSERT INTO client_contacts (client_id, name, title, email, phone) VALUES ($1, $2, $3, $4, $5)',
        [clientId, contact.name, contact.title, contact.email, contact.phone]
      );
      console.log(`✅ Added contact: ${contact.name}`);
    }

    console.log('\n📦 Adding parts with custom fields...\n');

    // 3. Add parts with well-defined custom fields
    const parts = [
      {
        partNumber: 'TF-PCB-2024-001',
        clientPartNumber: 'CLI-TF-PCB-001',
        partName: 'Main Control PCB Assembly',
        description: 'Primary control board with microcontroller',
        revision: 'Rev 3.2',
        unitCost: 145.50,
        customFields: {
          'ECR Number': 'ECR-2024-0045',
          'Drawing Number': 'DWG-TF-PCB-001-R32',
          'ROHS Compliant': 'Yes',
          'Lead Time (weeks)': '8',
          'Supplier': 'PCB Solutions Inc',
          'Last Updated': '2024-11-15'
        }
      },
      {
        partNumber: 'TF-PCB-2024-002',
        clientPartNumber: 'CLI-TF-PCB-002',
        partName: 'Power Supply Module',
        description: '24V DC power supply module',
        revision: 'Rev 2.1',
        unitCost: 89.75,
        customFields: {
          'ECR Number': 'ECR-2024-0046',
          'Drawing Number': 'DWG-TF-PCB-002-R21',
          'ROHS Compliant': 'Yes',
          'Lead Time (weeks)': '6',
          'Supplier': 'PowerTech Industries',
          'Last Updated': '2024-10-22'
        }
      },
      {
        partNumber: 'TF-ENC-2024-001',
        clientPartNumber: 'CLI-TF-ENC-001',
        partName: 'Aluminum Enclosure',
        description: 'CNC machined aluminum housing',
        revision: 'Rev 1.5',
        unitCost: 234.00,
        customFields: {
          'ECR Number': 'ECR-2024-0047',
          'Drawing Number': 'DWG-TF-ENC-001-R15',
          'ROHS Compliant': 'N/A',
          'Lead Time (weeks)': '10',
          'Supplier': 'Precision Machining Co',
          'Last Updated': '2024-11-20'
        }
      },
      {
        partNumber: 'TF-CBL-2024-001',
        clientPartNumber: 'CLI-TF-CBL-001',
        partName: 'Main Wiring Harness',
        description: 'Pre-assembled wiring harness with connectors',
        revision: 'Rev 2.0',
        unitCost: 67.25,
        customFields: {
          'ECR Number': 'ECR-2024-0048',
          'Drawing Number': 'DWG-TF-CBL-001-R20',
          'ROHS Compliant': 'Yes',
          'Lead Time (weeks)': '4',
          'Supplier': 'Cable Assembly Corp',
          'Last Updated': '2024-09-30'
        }
      },
      {
        partNumber: 'TF-SEN-2024-001',
        clientPartNumber: 'CLI-TF-SEN-001',
        partName: 'Temperature Sensor',
        description: 'Digital temperature sensor with I2C interface',
        revision: 'Rev 1.0',
        unitCost: 12.50,
        customFields: {
          'ECR Number': 'ECR-2024-0049',
          'Drawing Number': 'DWG-TF-SEN-001-R10',
          'ROHS Compliant': 'Yes',
          'Lead Time (weeks)': '3',
          'Supplier': 'Sensor Technologies Ltd',
          'Last Updated': '2024-08-15'
        }
      },
      {
        partNumber: 'TF-OLD-2023-999',
        clientPartNumber: 'CLI-TF-OLD-999',
        partName: 'Legacy Control Board',
        description: 'Obsolete control board - replaced by TF-PCB-2024-001',
        revision: 'Rev 2.5',
        unitCost: 125.00,
        active: false,
        customFields: {
          'ECR Number': 'ECR-2023-0999',
          'Drawing Number': 'DWG-TF-OLD-999-R25',
          'ROHS Compliant': 'No',
          'Lead Time (weeks)': 'N/A',
          'Supplier': 'Discontinued',
          'Last Updated': '2023-12-31'
        }
      }
    ];

    for (const part of parts) {
      const result = await query(`
        INSERT INTO client_parts (
          client_id, part_number, client_part_number, part_name,
          description, revision, unit_cost, currency, active, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, part_number, active
      `, [
        clientId,
        part.partNumber,
        part.clientPartNumber,
        part.partName,
        part.description,
        part.revision,
        part.unitCost,
        'USD',
        part.active !== false,
        JSON.stringify(part.customFields)
      ]);

      const status = result.rows[0].active ? '✓ Active' : '✗ Inactive';
      console.log(`✅ Created part: ${result.rows[0].part_number} - ${status}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Client: TechFlow Manufacturing Inc`);
    console.log(`   Parts: ${parts.length} (${parts.filter(p => p.active !== false).length} active, ${parts.filter(p => p.active === false).length} inactive)`);
    console.log(`   Custom Fields: ECR Number, Drawing Number, ROHS Compliant, Lead Time, Supplier, Last Updated`);

    console.log('\n✅ Demo client created successfully!');
    console.log('🎯 This client demonstrates proper BOM structure with consistent custom fields');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo client:', error);
    process.exit(1);
  }
}

createDemoClient();
