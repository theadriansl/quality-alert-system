/**
 * Script completo para poblar la base de datos con datos realistas
 * Incluye: Clientes con vendor numbers, usuarios, proyectos y números de parte
 * Ejecutar con: node populate-complete-data.js
 */

const { query, pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function populateCompleteData() {
  console.log('🚀 Iniciando poblado completo de datos...\n');

  try {
    // ========================================================================
    // PASO 1: ACTUALIZAR/CREAR CLIENTES CON TODOS LOS DATOS
    // ========================================================================
    console.log('🏢 Actualizando clientes con información completa...');

    const clients = [
      {
        name: 'Faurecia Sistemas Automotrices SA de CV',
        alias: 'Faurecia',
        vendor_number: 'VEN-FAU-2023-001',
        corporate_address: '123 Industrial Parkway, Troy, MI 48083, USA',
        corporate_phone: '+1 (937) 492-2700',
        corporate_fax: '+1 (937) 492-2799',
        billing_address: 'P.O. Box 5467, Troy, MI 48007, USA',
        billing_frequency: 'Monthly',
        billing_period: 'Net 30 days',
        website: 'https://www.faurecia.com',
        is_active: true,
        requires_signature: true
      },
      {
        name: 'Gissing North America LLC',
        alias: 'Gissing',
        vendor_number: 'VEN-GIS-2023-002',
        corporate_address: '25800 Northwestern Highway, Southfield, MI 48075, USA',
        corporate_phone: '+1 (313) 555-0100',
        corporate_fax: '+1 (313) 555-0199',
        billing_address: 'P.O. Box 8923, Southfield, MI 48037, USA',
        billing_frequency: 'Bi-Weekly',
        billing_period: 'Net 45 days',
        website: 'https://www.gissing.com',
        is_active: true,
        requires_signature: false
      },
      {
        name: 'Lucid Headquarters',
        alias: 'Lucid',
        vendor_number: 'VEN-LUC-2024-003',
        corporate_address: '7373 Gateway Boulevard, Newark, CA 94560, USA',
        corporate_phone: '+1 (510) 648-3553',
        corporate_fax: '+1 (510) 648-3599',
        billing_address: 'Lucid Group, Inc., 7373 Gateway Blvd, Newark, CA 94560',
        billing_frequency: 'Monthly',
        billing_period: 'Net 60 days',
        website: 'https://www.lucidmotors.com',
        is_active: true,
        requires_signature: true
      },
      {
        name: 'ElringKlinger Canada Inc',
        alias: 'ElringKlinger',
        vendor_number: 'VEN-ELK-2023-004',
        corporate_address: '2345 Windsor Avenue, Windsor, ON N8W 5A1, Canada',
        corporate_phone: '+1 (519) 255-1234',
        corporate_fax: '+1 (519) 255-1299',
        billing_address: 'ElringKlinger Canada Inc., 2345 Windsor Ave, Windsor, ON N8W 5A1',
        billing_frequency: 'Monthly',
        billing_period: 'Net 30 days',
        website: 'https://www.elringklinger.ca',
        is_active: true,
        requires_signature: false
      },
      {
        name: 'Mubea de México S de RL de CV',
        alias: 'Mubea',
        vendor_number: 'VEN-MUB-2023-005',
        corporate_address: 'Parque Industrial Bernardo Quintana, El Marqués, Querétaro, 76246, México',
        corporate_phone: '+52-442-345-6789',
        corporate_fax: '+52-442-345-6799',
        billing_address: 'Mubea de México, Parque Industrial B. Quintana, El Marqués, QRO 76246',
        billing_frequency: 'Monthly',
        billing_period: 'Net 45 days',
        website: 'https://www.mubea.com',
        is_active: true,
        requires_signature: true
      }
    ];

    for (const client of clients) {
      const existing = await query('SELECT id FROM clients WHERE name = $1', [client.name]);

      if (existing.rows.length > 0) {
        // Update existing client
        await query(`
          UPDATE clients SET
            alias = $1,
            vendor_number = $2,
            corporate_address = $3,
            corporate_phone = $4,
            corporate_fax = $5,
            billing_address = $6,
            billing_frequency = $7,
            billing_period = $8,
            website = $9,
            is_active = $10,
            requires_signature = $11
          WHERE name = $12
        `, [
          client.alias, client.vendor_number, client.corporate_address,
          client.corporate_phone, client.corporate_fax, client.billing_address,
          client.billing_frequency, client.billing_period, client.website,
          client.is_active, client.requires_signature, client.name
        ]);
        console.log(`   ✓ Actualizado: ${client.name}`);
      } else {
        // Insert new client
        await query(`
          INSERT INTO clients (
            name, alias, vendor_number, corporate_address, corporate_phone,
            corporate_fax, billing_address, billing_frequency, billing_period,
            website, is_active, requires_signature
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          client.name, client.alias, client.vendor_number, client.corporate_address,
          client.corporate_phone, client.corporate_fax, client.billing_address,
          client.billing_frequency, client.billing_period, client.website,
          client.is_active, client.requires_signature
        ]);
        console.log(`   ✓ Creado: ${client.name}`);
      }
    }

    // ========================================================================
    // PASO 2: AGREGAR USUARIOS ADICIONALES
    // ========================================================================
    console.log('\n👥 Agregando usuarios del sistema...');

    const users = [
      {
        email: 'john.quality@company.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Quality',
        role: 'Quality Manager',
        department: 'Quality Assurance',
        phone: '+1 (555) 001-0001',
        is_tft_member: true
      },
      {
        email: 'maria.engineer@company.com',
        password: 'password123',
        first_name: 'Maria',
        last_name: 'Engineer',
        role: 'Quality Engineer',
        department: 'Quality Assurance',
        phone: '+1 (555) 001-0002',
        is_tft_member: true
      },
      {
        email: 'david.supervisor@company.com',
        password: 'password123',
        first_name: 'David',
        last_name: 'Supervisor',
        role: 'Production Supervisor',
        department: 'Production',
        phone: '+1 (555) 001-0003',
        is_tft_member: true
      },
      {
        email: 'sarah.analyst@company.com',
        password: 'password123',
        first_name: 'Sarah',
        last_name: 'Analyst',
        role: 'Quality Analyst',
        department: 'Quality Assurance',
        phone: '+1 (555) 001-0004',
        is_tft_member: false
      },
      {
        email: 'michael.tech@company.com',
        password: 'password123',
        first_name: 'Michael',
        last_name: 'Technician',
        role: 'Lab Technician',
        department: 'Laboratory',
        phone: '+1 (555) 001-0005',
        is_tft_member: false
      }
    ];

    for (const user of users) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [user.email]);

      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await query(`
          INSERT INTO users (
            email, password, first_name, last_name, role,
            department, phone, is_tft_member
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          user.email, hashedPassword, user.first_name, user.last_name,
          user.role, user.department, user.phone, user.is_tft_member
        ]);
        console.log(`   ✓ Usuario creado: ${user.first_name} ${user.last_name} (${user.email})`);
      } else {
        console.log(`   ⏭️  Ya existe: ${user.email}`);
      }
    }

    // ========================================================================
    // PASO 3: AGREGAR PROYECTOS (mínimo 1 por cliente)
    // ========================================================================
    console.log('\n📁 Agregando proyectos...');

    const clientsData = await query('SELECT id, name FROM clients ORDER BY id');
    const clientMap = {};
    clientsData.rows.forEach(row => {
      clientMap[row.name] = row.id;
    });

    const projects = [
      // Faurecia - Proyecto 1
      {
        projectNumber: 'PROJ-FAU-2024-001',
        projectName: 'Dashboard Assembly Line A',
        clientName: 'Faurecia Sistemas Automotrices SA de CV',
        description: 'Complete dashboard assembly with integrated electronics and trim components',
        status: 'Active',
        startDate: '2024-01-15',
        targetEndDate: '2025-12-31'
      },
      // Faurecia - Proyecto 2
      {
        projectNumber: 'PROJ-FAU-2024-006',
        projectName: 'Door Panel Assembly',
        clientName: 'Faurecia Sistemas Automotrices SA de CV',
        description: 'Interior door panel assembly with integrated controls',
        status: 'Active',
        startDate: '2024-06-01',
        targetEndDate: '2026-01-31'
      },
      // Gissing - Proyecto 1
      {
        projectNumber: 'PROJ-GIS-2024-003',
        projectName: 'Seat Belt Buckle Assembly',
        clientName: 'Gissing North America LLC',
        description: 'High-strength seat belt buckle assembly for passenger safety systems',
        status: 'Active',
        startDate: '2024-03-01',
        targetEndDate: '2025-06-30'
      },
      // Lucid - Proyecto 1
      {
        projectNumber: 'PROJ-LUC-2024-002',
        projectName: 'EV Battery Enclosure',
        clientName: 'Lucid Headquarters',
        description: 'Electric vehicle battery enclosure with thermal management',
        status: 'Active',
        startDate: '2024-02-10',
        targetEndDate: '2025-08-15'
      },
      // Lucid - Proyecto 2
      {
        projectNumber: 'PROJ-LUC-2024-007',
        projectName: 'Electric Motor Housing Components',
        clientName: 'Lucid Headquarters',
        description: 'Precision motor housing components for high-performance EV motors',
        status: 'Active',
        startDate: '2024-05-15',
        targetEndDate: '2026-06-30'
      },
      // ElringKlinger - Proyecto 1
      {
        projectNumber: 'PROJ-ELK-2024-004',
        projectName: 'Engine Gasket System',
        clientName: 'ElringKlinger Canada Inc',
        description: 'Complete engine gasket and sealing system for automotive engines',
        status: 'Active',
        startDate: '2024-04-01',
        targetEndDate: '2025-09-30'
      },
      // Mubea - Proyecto 1
      {
        projectNumber: 'PROJ-MUB-2024-005',
        projectName: 'Coil Spring Manufacturing',
        clientName: 'Mubea de México S de RL de CV',
        description: 'High-performance coil springs for suspension systems',
        status: 'Active',
        startDate: '2024-01-20',
        targetEndDate: '2025-12-31'
      }
    ];

    for (const proj of projects) {
      const clientId = clientMap[proj.clientName];

      if (!clientId) {
        console.log(`   ⏭️  Cliente no encontrado: ${proj.clientName}`);
        continue;
      }

      const existing = await query('SELECT id FROM projects WHERE project_number = $1', [proj.projectNumber]);

      if (existing.rows.length === 0) {
        await query(`
          INSERT INTO projects (
            project_number, project_name, client_id, client_name,
            description, status, start_date, target_end_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          proj.projectNumber, proj.projectName, clientId, proj.clientName,
          proj.description, proj.status, proj.startDate, proj.targetEndDate
        ]);
        console.log(`   ✓ Proyecto creado: ${proj.projectName}`);
      } else {
        console.log(`   ⏭️  Ya existe: ${proj.projectName}`);
      }
    }

    // ========================================================================
    // PASO 4: AGREGAR NÚMEROS DE PARTE (3+ por proyecto)
    // ========================================================================
    console.log('\n🔩 Agregando números de parte a los proyectos...');

    const projectsData = await query('SELECT id, project_number, project_name FROM projects');
    const projectMap = {};
    projectsData.rows.forEach(row => {
      projectMap[row.project_number] = { id: row.id, name: row.project_name };
    });

    const parts = [
      // PROYECTO: Dashboard Assembly Line A (Faurecia)
      {
        projectNumber: 'PROJ-FAU-2024-001',
        partNumber: 'FAU-DASH-001',
        clientPartNumber: 'CLI-FAU-DASH-001',
        partName: 'Dashboard Main Structure',
        description: 'Main structural frame for dashboard assembly',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'PP+GF30', color: 'Black', finish: 'Textured' }),
        weight: 3.500,
        snpQuantity: 100,
        snpVolume: 0.125,
        unitCost: 45.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-FAU-2024-001',
        partNumber: 'FAU-DASH-002',
        clientPartNumber: 'CLI-FAU-DASH-002',
        partName: 'Glove Box Assembly',
        description: 'Integrated glove box with damper mechanism',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'ABS', damperType: 'Soft-close', lockingMechanism: 'Yes' }),
        weight: 0.850,
        snpQuantity: 200,
        snpVolume: 0.035,
        unitCost: 22.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-FAU-2024-001',
        partNumber: 'FAU-DASH-003',
        clientPartNumber: 'CLI-FAU-DASH-003',
        partName: 'Center Console Trim',
        description: 'Decorative trim panel for center console',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'ABS Chrome', finish: 'High gloss', adhesive: '3M VHB' }),
        weight: 0.320,
        snpQuantity: 300,
        snpVolume: 0.018,
        unitCost: 12.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-FAU-2024-001',
        partNumber: 'FAU-DASH-004',
        clientPartNumber: 'CLI-FAU-DASH-004',
        partName: 'Air Vent Assembly',
        description: 'Adjustable air vent with integrated louvers',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'PC/ABS', movementAngle: '90 degrees', durability: '50000 cycles' }),
        weight: 0.185,
        snpQuantity: 400,
        snpVolume: 0.012,
        unitCost: 8.50,
        currency: 'USD'
      },

      // PROYECTO: Door Panel Assembly (Faurecia)
      {
        projectNumber: 'PROJ-FAU-2024-006',
        partNumber: 'FAU-DOOR-001',
        clientPartNumber: 'CLI-FAU-DOOR-001',
        partName: 'Door Panel Base Structure',
        description: 'Main door panel structural base',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'PP+GF', surfaceFinish: 'Textured', PPAP: 'Level 3' }),
        weight: 1.850,
        snpQuantity: 250,
        snpVolume: 0.065,
        unitCost: 32.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-FAU-2024-006',
        partNumber: 'FAU-DOOR-002',
        clientPartNumber: 'CLI-FAU-DOOR-002',
        partName: 'Arm Rest Assembly',
        description: 'Integrated arm rest with storage compartment',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'ABS + PU Foam', loadTest: '150kg static' }),
        weight: 0.950,
        snpQuantity: 300,
        snpVolume: 0.028,
        unitCost: 18.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-FAU-2024-006',
        partNumber: 'FAU-DOOR-003',
        clientPartNumber: 'CLI-FAU-DOOR-003',
        partName: 'Door Handle Bezel',
        description: 'Chrome-finish door handle trim bezel',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'ABS Chrome', finish: 'Bright chrome' }),
        weight: 0.125,
        snpQuantity: 500,
        snpVolume: 0.008,
        unitCost: 8.50,
        currency: 'USD'
      },

      // PROYECTO: Seat Belt Buckle Assembly (Gissing)
      {
        projectNumber: 'PROJ-GIS-2024-003',
        partNumber: 'GIS-BELT-001',
        clientPartNumber: 'CLI-GIS-BELT-001',
        partName: 'Seat Belt Buckle Housing',
        description: 'Main housing for seat belt buckle mechanism',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Steel AISI 1018', surfaceFinish: 'Black oxide' }),
        weight: 0.350,
        snpQuantity: 500,
        snpVolume: 0.015,
        unitCost: 8.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-GIS-2024-003',
        partNumber: 'GIS-BELT-002',
        clientPartNumber: 'CLI-GIS-BELT-002',
        partName: 'Release Button Assembly',
        description: 'Red release button with spring mechanism',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'ABS Plastic', color: 'RAL 3000 Red' }),
        weight: 0.085,
        snpQuantity: 1000,
        snpVolume: 0.008,
        unitCost: 3.25,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-GIS-2024-003',
        partNumber: 'GIS-BELT-003',
        clientPartNumber: 'CLI-GIS-BELT-003',
        partName: 'Latch Mechanism',
        description: 'Internal latch mechanism for buckle',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Stainless Steel 304', cycles: '50000 min' }),
        weight: 0.120,
        snpQuantity: 600,
        snpVolume: 0.005,
        unitCost: 12.50,
        currency: 'USD'
      },

      // PROYECTO: EV Battery Enclosure (Lucid)
      {
        projectNumber: 'PROJ-LUC-2024-002',
        partNumber: 'LUC-BAT-001',
        clientPartNumber: 'CLI-LUC-BAT-001',
        partName: 'Battery Tray Bottom Panel',
        description: 'Aluminum bottom panel for battery enclosure',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Aluminum 6061-T6', thickness: '4mm' }),
        weight: 12.500,
        snpQuantity: 50,
        snpVolume: 0.850,
        unitCost: 285.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-LUC-2024-002',
        partNumber: 'LUC-BAT-002',
        clientPartNumber: 'CLI-LUC-BAT-002',
        partName: 'Battery Tray Top Cover',
        description: 'Top cover with integrated cooling channels',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Aluminum 6061-T6', thickness: '3mm' }),
        weight: 9.800,
        snpQuantity: 50,
        snpVolume: 0.720,
        unitCost: 245.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-LUC-2024-002',
        partNumber: 'LUC-BAT-003',
        clientPartNumber: 'CLI-LUC-BAT-003',
        partName: 'Reinforcement Beam',
        description: 'Structural reinforcement beam for battery protection',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Aluminum 7075-T6' }),
        weight: 8.200,
        snpQuantity: 100,
        snpVolume: 0.450,
        unitCost: 165.00,
        currency: 'USD'
      },

      // PROYECTO: Electric Motor Housing (Lucid)
      {
        projectNumber: 'PROJ-LUC-2024-007',
        partNumber: 'LUC-MOT-001',
        clientPartNumber: 'CLI-LUC-MOT-001',
        partName: 'Motor Housing Front Cover',
        description: 'Front housing cover for electric motor assembly',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Aluminum A380', finish: 'Anodized' }),
        weight: 5.200,
        snpQuantity: 100,
        snpVolume: 0.180,
        unitCost: 125.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-LUC-2024-007',
        partNumber: 'LUC-MOT-002',
        clientPartNumber: 'CLI-LUC-MOT-002',
        partName: 'Motor Housing Rear Cover',
        description: 'Rear housing cover with bearing mount',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Aluminum A380', bearingFit: 'H7' }),
        weight: 4.800,
        snpQuantity: 100,
        snpVolume: 0.165,
        unitCost: 118.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-LUC-2024-007',
        partNumber: 'LUC-MOT-003',
        clientPartNumber: 'CLI-LUC-MOT-003',
        partName: 'Cooling Jacket',
        description: 'Integrated cooling jacket with fluid channels',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Aluminum 6061', coolingCapacity: '15kW' }),
        weight: 3.500,
        snpQuantity: 100,
        snpVolume: 0.120,
        unitCost: 95.00,
        currency: 'USD'
      },

      // PROYECTO: Engine Gasket System (ElringKlinger)
      {
        projectNumber: 'PROJ-ELK-2024-004',
        partNumber: 'ELK-GAS-001',
        clientPartNumber: 'CLI-ELK-GAS-001',
        partName: 'Cylinder Head Gasket',
        description: 'Multi-layer steel cylinder head gasket',
        revision: 'Rev E',
        specifications: JSON.stringify({ material: 'MLS Steel', layers: '3', thickness: '1.2mm' }),
        weight: 0.850,
        snpQuantity: 300,
        snpVolume: 0.025,
        unitCost: 45.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-ELK-2024-004',
        partNumber: 'ELK-GAS-002',
        clientPartNumber: 'CLI-ELK-GAS-002',
        partName: 'Oil Pan Gasket',
        description: 'Rubber oil pan sealing gasket',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'NBR Rubber', hardness: '70 Shore A' }),
        weight: 0.320,
        snpQuantity: 500,
        snpVolume: 0.018,
        unitCost: 12.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-ELK-2024-004',
        partNumber: 'ELK-GAS-003',
        clientPartNumber: 'CLI-ELK-GAS-003',
        partName: 'Valve Cover Gasket',
        description: 'Silicone valve cover gasket',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Silicone VMQ', tempRange: '-60°C to +200°C' }),
        weight: 0.285,
        snpQuantity: 400,
        snpVolume: 0.022,
        unitCost: 18.75,
        currency: 'USD'
      },

      // PROYECTO: Coil Spring Manufacturing (Mubea)
      {
        projectNumber: 'PROJ-MUB-2024-005',
        partNumber: 'MUB-SPR-001',
        clientPartNumber: 'CLI-MUB-SPR-001',
        partName: 'Front Suspension Coil Spring',
        description: 'Heavy-duty front suspension coil spring',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160', wireDiameter: '14.5mm' }),
        weight: 3.850,
        snpQuantity: 200,
        snpVolume: 0.045,
        unitCost: 28.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-MUB-2024-005',
        partNumber: 'MUB-SPR-002',
        clientPartNumber: 'CLI-MUB-SPR-002',
        partName: 'Rear Suspension Coil Spring',
        description: 'Rear suspension progressive rate coil spring',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160', wireDiameter: '13.5mm' }),
        weight: 3.250,
        snpQuantity: 200,
        snpVolume: 0.038,
        unitCost: 25.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-MUB-2024-005',
        partNumber: 'MUB-SPR-003',
        clientPartNumber: 'CLI-MUB-SPR-003',
        partName: 'Heavy Duty Truck Spring',
        description: 'Commercial vehicle heavy duty coil spring',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160H', wireDiameter: '18.0mm' }),
        weight: 8.500,
        snpQuantity: 100,
        snpVolume: 0.095,
        unitCost: 52.00,
        currency: 'USD'
      }
    ];

    for (const part of parts) {
      const projectData = projectMap[part.projectNumber];

      if (!projectData) {
        console.log(`   ⏭️  Proyecto no encontrado: ${part.projectNumber}`);
        continue;
      }

      const existing = await query('SELECT id FROM project_parts WHERE part_number = $1', [part.partNumber]);

      if (existing.rows.length === 0) {
        await query(`
          INSERT INTO project_parts (
            project_id, part_number, client_part_number, part_name,
            description, revision, specifications, weight,
            snp_quantity, snp_volume, unit_cost, currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          projectData.id, part.partNumber, part.clientPartNumber, part.partName,
          part.description, part.revision, part.specifications, part.weight,
          part.snpQuantity, part.snpVolume, part.unitCost, part.currency
        ]);
        console.log(`   ✓ Parte creada: ${part.partName} (${part.partNumber})`);
      } else {
        console.log(`   ⏭️  Ya existe: ${part.partName}`);
      }
    }

    // ========================================================================
    // PASO 5: AGREGAR CONTACTOS A LOS CLIENTES
    // ========================================================================
    console.log('\n📞 Agregando contactos a los clientes...');

    const contacts = [
      // Faurecia
      { clientName: 'Faurecia Sistemas Automotrices SA de CV', name: 'Roberto Sánchez', title: 'Quality Manager', email: 'roberto.sanchez@faurecia.com', phone: '+1 (937) 492-2710' },
      { clientName: 'Faurecia Sistemas Automotrices SA de CV', name: 'María García', title: 'Purchasing Director', email: 'maria.garcia@faurecia.com', phone: '+1 (937) 492-2715' },
      { clientName: 'Faurecia Sistemas Automotrices SA de CV', name: 'David Hernández', title: 'Program Manager', email: 'david.hernandez@faurecia.com', phone: '+1 (937) 492-2720' },

      // Gissing
      { clientName: 'Gissing North America LLC', name: 'John Mitchell', title: 'VP of Operations', email: 'john.mitchell@gissing.com', phone: '+1 (313) 555-0101' },
      { clientName: 'Gissing North America LLC', name: 'Sarah Thompson', title: 'Quality Director', email: 'sarah.thompson@gissing.com', phone: '+1 (313) 555-0102' },
      { clientName: 'Gissing North America LLC', name: 'Michael Chen', title: 'Supplier Quality Engineer', email: 'michael.chen@gissing.com', phone: '+1 (313) 555-0105' },

      // Lucid
      { clientName: 'Lucid Headquarters', name: 'Jennifer Park', title: 'Supply Chain Manager', email: 'jennifer.park@lucidmotors.com', phone: '+1 (510) 648-3560' },
      { clientName: 'Lucid Headquarters', name: 'Thomas Anderson', title: 'Battery Engineering Lead', email: 'thomas.anderson@lucidmotors.com', phone: '+1 (510) 648-3565' },
      { clientName: 'Lucid Headquarters', name: 'Lisa Kumar', title: 'Supplier Quality Manager', email: 'lisa.kumar@lucidmotors.com', phone: '+1 (510) 648-3570' },

      // ElringKlinger
      { clientName: 'ElringKlinger Canada Inc', name: 'Hans Müller', title: 'Plant Manager', email: 'hans.mueller@elringklinger.ca', phone: '+1 (519) 255-1235' },
      { clientName: 'ElringKlinger Canada Inc', name: 'Patricia Wilson', title: 'Quality Assurance Manager', email: 'patricia.wilson@elringklinger.ca', phone: '+1 (519) 255-1240' },
      { clientName: 'ElringKlinger Canada Inc', name: 'James Brown', title: 'Procurement Specialist', email: 'james.brown@elringklinger.ca', phone: '+1 (519) 255-1245' },

      // Mubea
      { clientName: 'Mubea de México S de RL de CV', name: 'Carlos Ramírez', title: 'Director de Operaciones', email: 'carlos.ramirez@mubea.com', phone: '+52-442-345-6790' },
      { clientName: 'Mubea de México S de RL de CV', name: 'Ana Martínez', title: 'Gerente de Calidad', email: 'ana.martinez@mubea.com', phone: '+52-442-345-6795' },
      { clientName: 'Mubea de México S de RL de CV', name: 'Luis Fernández', title: 'Ingeniero de Procesos', email: 'luis.fernandez@mubea.com', phone: '+52-442-345-6800' }
    ];

    for (const contact of contacts) {
      const clientId = clientMap[contact.clientName];

      if (!clientId) {
        console.log(`   ⏭️  Cliente no encontrado: ${contact.clientName}`);
        continue;
      }

      const existing = await query('SELECT id FROM client_contacts WHERE email = $1', [contact.email]);

      if (existing.rows.length === 0) {
        await query(`
          INSERT INTO client_contacts (client_id, name, title, email, phone)
          VALUES ($1, $2, $3, $4, $5)
        `, [clientId, contact.name, contact.title, contact.email, contact.phone]);
        console.log(`   ✓ Contacto agregado: ${contact.name} - ${contact.title}`);
      } else {
        console.log(`   ⏭️  Ya existe: ${contact.name}`);
      }
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n📊 RESUMEN DE DATOS:');
    console.log('=====================================');

    const clientCount = await query('SELECT COUNT(*) FROM clients');
    const userCount = await query('SELECT COUNT(*) FROM users');
    const projectCount = await query('SELECT COUNT(*) FROM projects');
    const partCount = await query('SELECT COUNT(*) FROM project_parts');
    const contactCount = await query('SELECT COUNT(*) FROM client_contacts');

    console.log(`✅ Total Clientes: ${clientCount.rows[0].count}`);
    console.log(`✅ Total Usuarios: ${userCount.rows[0].count}`);
    console.log(`✅ Total Proyectos: ${projectCount.rows[0].count}`);
    console.log(`✅ Total Números de Parte: ${partCount.rows[0].count}`);
    console.log(`✅ Total Contactos: ${contactCount.rows[0].count}`);
    console.log('=====================================\n');

    // Mostrar resumen por cliente
    console.log('📋 RESUMEN POR CLIENTE:');
    console.log('=====================================');

    const clientsSummary = await query(`
      SELECT
        c.name,
        c.vendor_number,
        COUNT(DISTINCT p.id) as project_count,
        COUNT(DISTINCT pp.id) as part_count,
        COUNT(DISTINCT cc.id) as contact_count
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      LEFT JOIN project_parts pp ON p.id = pp.project_id
      LEFT JOIN client_contacts cc ON c.id = cc.client_id
      GROUP BY c.id, c.name, c.vendor_number
      ORDER BY c.name
    `);

    clientsSummary.rows.forEach(row => {
      console.log(`\n${row.name}`);
      console.log(`  Vendor: ${row.vendor_number}`);
      console.log(`  Proyectos: ${row.project_count}`);
      console.log(`  Números de Parte: ${row.part_count}`);
      console.log(`  Contactos: ${row.contact_count}`);
    });

    console.log('\n=====================================');
    console.log('🎉 ¡Poblado de datos completado exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante el poblado de datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar
populateCompleteData();
