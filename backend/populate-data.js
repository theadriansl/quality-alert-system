/**
 * Script para poblar la base de datos con datos completos y realistas
 * Ejecutar con: node populate-data.js
 */

const { query, pool } = require('./config/database');

async function populateData() {
  console.log('🚀 Iniciando poblado de datos...\n');

  try {
    // ========================================================================
    // PASO 1: AGREGAR PROYECTOS ADICIONALES
    // ========================================================================
    console.log('📁 Agregando proyectos adicionales...');

    const projects = [
      // Gissing - Proyecto 1
      {
        projectNumber: 'PROJ-2024-003',
        projectName: 'Seat Belt Buckle Assembly',
        clientId: 2,
        clientName: 'Gissing North America LLC',
        description: 'High-strength seat belt buckle assembly for passenger safety systems',
        status: 'Active',
        startDate: '2024-03-01',
        targetEndDate: '2025-06-30'
      },
      // Lucid - Proyecto 2 (ya tienen PROJ-2024-002)
      {
        projectNumber: 'PROJ-2024-007',
        projectName: 'Electric Motor Housing Components',
        clientId: 3,
        clientName: 'Lucid Headquarters',
        description: 'Precision motor housing components for high-performance EV motors',
        status: 'Active',
        startDate: '2024-05-15',
        targetEndDate: '2026-06-30'
      },
      // ElringKlinger - Proyecto 1
      {
        projectNumber: 'PROJ-2024-004',
        projectName: 'Engine Gasket System',
        clientId: 4,
        clientName: 'ElringKlinger Canada Inc',
        description: 'Complete engine gasket and sealing system for automotive engines',
        status: 'Active',
        startDate: '2024-04-01',
        targetEndDate: '2025-09-30'
      },
      // Mubea - Proyecto 1
      {
        projectNumber: 'PROJ-2024-005',
        projectName: 'Coil Spring Manufacturing',
        clientId: 5,
        clientName: 'Mubea de México S de RL de CV',
        description: 'High-performance coil springs for suspension systems',
        status: 'Active',
        startDate: '2024-01-20',
        targetEndDate: '2025-12-31'
      },
      // Faurecia - Proyecto 2
      {
        projectNumber: 'PROJ-2024-006',
        projectName: 'Door Panel Assembly',
        clientId: 1,
        clientName: 'Faurecia Sistemas Automotrices SA de CV',
        description: 'Interior door panel assembly with integrated controls',
        status: 'Planning',
        startDate: '2024-06-01',
        targetEndDate: '2026-01-31'
      }
    ];

    for (const proj of projects) {
      // Check if project already exists
      const existsCheck = await query(
        'SELECT id FROM projects WHERE project_number = $1',
        [proj.projectNumber]
      );

      if (existsCheck.rows.length > 0) {
        console.log(`   ⏭️  Ya existe: ${proj.projectName} (${proj.projectNumber})`);
        continue;
      }

      const result = await query(`
        INSERT INTO projects (
          project_number, project_name, client_id, client_name,
          description, status, start_date, target_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        proj.projectNumber, proj.projectName, proj.clientId, proj.clientName,
        proj.description, proj.status, proj.startDate, proj.targetEndDate
      ]);
      console.log(`   ✓ Proyecto creado: ${proj.projectName} (ID: ${result.rows[0].id})`);
    }

    // ========================================================================
    // PASO 2: AGREGAR PARTES A LOS PROYECTOS
    // ========================================================================
    console.log('\n🔩 Agregando partes a los proyectos...');

    // Get actual project IDs from database
    const projectIds = {};
    const projectsQuery = await query('SELECT id, project_number FROM projects');
    projectsQuery.rows.forEach(row => {
      projectIds[row.project_number] = row.id;
    });

    const parts = [
      // PROYECTO GISSING (PROJ-2024-003): Seat Belt Buckle Assembly
      {
        projectNumber: 'PROJ-2024-003',
        partNumber: 'GIS-SB-2024-001',
        clientPartNumber: 'CLI-GIS-SB-001',
        partName: 'Seat Belt Buckle Housing',
        description: 'Main housing for seat belt buckle mechanism',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Steel AISI 1018', surfaceFinish: 'Black oxide', loadTest: '5000N min' }),
        weight: 0.350,
        snpQuantity: 500,
        snpVolume: 0.015,
        unitCost: 8.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-003',
        partNumber: 'GIS-SB-2024-002',
        clientPartNumber: 'CLI-GIS-SB-002',
        partName: 'Release Button Assembly',
        description: 'Red release button with spring mechanism',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'ABS Plastic', color: 'RAL 3000 Red', pressureForce: '15-20N' }),
        weight: 0.085,
        snpQuantity: 1000,
        snpVolume: 0.008,
        unitCost: 3.25,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-003',
        partNumber: 'GIS-SB-2024-003',
        clientPartNumber: 'CLI-GIS-SB-003',
        partName: 'Latch Mechanism',
        description: 'Internal latch mechanism for buckle',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Stainless Steel 304', cycles: '50000 min', retentionForce: '100N min' }),
        weight: 0.120,
        snpQuantity: 600,
        snpVolume: 0.005,
        unitCost: 12.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-003',
        partNumber: 'GIS-SB-2024-004',
        clientPartNumber: 'CLI-GIS-SB-004',
        partName: 'Mounting Bracket',
        description: 'Vehicle mounting bracket for buckle assembly',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Steel Q235', coating: 'Zinc plated', pulloutForce: '8000N min' }),
        weight: 0.450,
        snpQuantity: 500,
        snpVolume: 0.012,
        unitCost: 6.80,
        currency: 'USD'
      },

      // PROYECTO 3: Lucid - EV Battery Enclosure
      {
        projectNumber: 'PROJ-2024-007',
        partNumber: 'LUC-BAT-2024-001',
        clientPartNumber: 'CLI-LUC-BAT-001',
        partName: 'Battery Tray Bottom Panel',
        description: 'Aluminum bottom panel for battery enclosure',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Aluminum 6061-T6', thickness: '4mm', flatness: '0.5mm max', PPAP: 'Level 5' }),
        weight: 12.500,
        snpQuantity: 50,
        snpVolume: 0.850,
        unitCost: 285.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-007',
        partNumber: 'LUC-BAT-2024-002',
        clientPartNumber: 'CLI-LUC-BAT-002',
        partName: 'Battery Tray Top Cover',
        description: 'Top cover with integrated cooling channels',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Aluminum 6061-T6', thickness: '3mm', sealingGroove: 'As per drawing' }),
        weight: 9.800,
        snpQuantity: 50,
        snpVolume: 0.720,
        unitCost: 245.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-007',
        partNumber: 'LUC-BAT-2024-003',
        clientPartNumber: 'CLI-LUC-BAT-003',
        partName: 'Reinforcement Beam',
        description: 'Structural reinforcement beam for battery protection',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Aluminum 7075-T6', ultimateStrength: '572 MPa min', crashTest: 'Per FMVSS 305' }),
        weight: 8.200,
        snpQuantity: 100,
        snpVolume: 0.450,
        unitCost: 165.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-007',
        partNumber: 'LUC-BAT-2024-004',
        clientPartNumber: 'CLI-LUC-BAT-004',
        partName: 'Thermal Management Bracket',
        description: 'Bracket for thermal management system mounting',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Aluminum 6063-T5', anodizing: 'Clear Type II', tolerance: '±0.1mm' }),
        weight: 1.850,
        snpQuantity: 200,
        snpVolume: 0.085,
        unitCost: 32.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-007',
        partNumber: 'LUC-BAT-2024-005',
        clientPartNumber: 'CLI-LUC-BAT-005',
        partName: 'Seal Retention Clip',
        description: 'Stainless steel clip for gasket retention',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Stainless Steel 316', springForce: '25-30N', corrosionTest: 'Salt spray 1000hrs' }),
        weight: 0.045,
        snpQuantity: 500,
        snpVolume: 0.002,
        unitCost: 4.25,
        currency: 'USD'
      },

      // PROYECTO 4: ElringKlinger - Engine Gasket System
      {
        projectNumber: 'PROJ-2024-004',
        partNumber: 'ELR-GAS-2024-001',
        clientPartNumber: 'CLI-ELR-GAS-001',
        partName: 'Cylinder Head Gasket',
        description: 'Multi-layer steel cylinder head gasket',
        revision: 'Rev E',
        specifications: JSON.stringify({ material: 'MLS Steel', layers: '3', thickness: '1.2mm', compressionTest: 'Per spec' }),
        weight: 0.850,
        snpQuantity: 300,
        snpVolume: 0.025,
        unitCost: 45.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-004',
        partNumber: 'ELR-GAS-2024-002',
        clientPartNumber: 'CLI-ELR-GAS-002',
        partName: 'Oil Pan Gasket',
        description: 'Rubber oil pan sealing gasket',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'NBR Rubber', hardness: '70 Shore A', tempRange: '-40°C to +150°C' }),
        weight: 0.320,
        snpQuantity: 500,
        snpVolume: 0.018,
        unitCost: 12.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-004',
        partNumber: 'ELR-GAS-2024-003',
        clientPartNumber: 'CLI-ELR-GAS-003',
        partName: 'Valve Cover Gasket',
        description: 'Silicone valve cover gasket with integrated spark plug seals',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Silicone VMQ', tempRange: '-60°C to +200°C', durometer: '60 Shore A' }),
        weight: 0.285,
        snpQuantity: 400,
        snpVolume: 0.022,
        unitCost: 18.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-004',
        partNumber: 'ELR-GAS-2024-004',
        clientPartNumber: 'CLI-ELR-GAS-004',
        partName: 'Exhaust Manifold Gasket',
        description: 'High-temperature exhaust manifold gasket',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Graphite composite', maxTemp: '800°C', thickness: '2.5mm' }),
        weight: 0.195,
        snpQuantity: 350,
        snpVolume: 0.012,
        unitCost: 22.00,
        currency: 'USD'
      },

      // PROYECTO 5: Mubea - Coil Spring Manufacturing
      {
        projectNumber: 'PROJ-2024-005',
        partNumber: 'MUB-SPR-2024-001',
        clientPartNumber: 'CLI-MUB-SPR-001',
        partName: 'Front Suspension Coil Spring',
        description: 'Heavy-duty front suspension coil spring',
        revision: 'Rev C',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160', wireDiameter: '14.5mm', freeHeight: '385mm', springRate: '45 N/mm' }),
        weight: 3.850,
        snpQuantity: 200,
        snpVolume: 0.045,
        unitCost: 28.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-005',
        partNumber: 'MUB-SPR-2024-002',
        clientPartNumber: 'CLI-MUB-SPR-002',
        partName: 'Rear Suspension Coil Spring',
        description: 'Rear suspension progressive rate coil spring',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160', wireDiameter: '13.5mm', freeHeight: '345mm', springRate: '38 N/mm' }),
        weight: 3.250,
        snpQuantity: 200,
        snpVolume: 0.038,
        unitCost: 25.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-005',
        partNumber: 'MUB-SPR-2024-003',
        clientPartNumber: 'CLI-MUB-SPR-003',
        partName: 'Heavy Duty Truck Spring',
        description: 'Commercial vehicle heavy duty coil spring',
        revision: 'Rev D',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160H', wireDiameter: '18.0mm', freeHeight: '520mm', springRate: '85 N/mm' }),
        weight: 8.500,
        snpQuantity: 100,
        snpVolume: 0.095,
        unitCost: 52.00,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-005',
        partNumber: 'MUB-SPR-2024-004',
        clientPartNumber: 'CLI-MUB-SPR-004',
        partName: 'Performance Spring Kit',
        description: 'Sport-tuned lowering spring set',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'Spring Steel SAE 5160', coating: 'Powder coated red', dropHeight: '-35mm', springRate: '52 N/mm' }),
        weight: 3.450,
        snpQuantity: 150,
        snpVolume: 0.042,
        unitCost: 38.00,
        currency: 'USD'
      },

      // PROYECTO 6: Faurecia - Door Panel Assembly
      {
        projectNumber: 'PROJ-2024-006',
        partNumber: 'FAU-DP-2024-001',
        clientPartNumber: 'CLI-FAU-DP-001',
        partName: 'Door Panel Base Structure',
        description: 'Main door panel structural base',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'PP Fiber reinforced', surfaceFinish: 'Textured', PPAP: 'Level 3' }),
        weight: 1.850,
        snpQuantity: 250,
        snpVolume: 0.065,
        unitCost: 32.50,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-006',
        partNumber: 'FAU-DP-2024-002',
        clientPartNumber: 'CLI-FAU-DP-002',
        partName: 'Arm Rest Assembly',
        description: 'Integrated arm rest with storage compartment',
        revision: 'Rev B',
        specifications: JSON.stringify({ material: 'ABS + PU Foam', color: 'As per color chip', loadTest: '150kg static' }),
        weight: 0.950,
        snpQuantity: 300,
        snpVolume: 0.028,
        unitCost: 18.75,
        currency: 'USD'
      },
      {
        projectNumber: 'PROJ-2024-006',
        partNumber: 'FAU-DP-2024-003',
        clientPartNumber: 'CLI-FAU-DP-003',
        partName: 'Door Handle Bezel',
        description: 'Chrome-finish door handle trim bezel',
        revision: 'Rev A',
        specifications: JSON.stringify({ material: 'ABS Chrome plated', finish: 'Bright chrome', adhesion: 'Per ASTM D3359' }),
        weight: 0.125,
        snpQuantity: 500,
        snpVolume: 0.008,
        unitCost: 8.50,
        currency: 'USD'
      }
    ];

    for (const part of parts) {
      // Get the actual project ID from the map
      const projectId = projectIds[part.projectNumber];

      if (!projectId) {
        console.log(`   ⏭️  Proyecto no encontrado: ${part.projectNumber} - saltando parte ${part.partNumber}`);
        continue;
      }

      // Check if part already exists
      const existingPart = await query(
        'SELECT id FROM project_parts WHERE part_number = $1',
        [part.partNumber]
      );

      if (existingPart.rows.length > 0) {
        console.log(`   ⏭️  Ya existe: ${part.partName} (${part.partNumber})`);
        continue;
      }

      await query(`
        INSERT INTO project_parts (
          project_id, part_number, client_part_number, part_name,
          description, revision, specifications, weight,
          snp_quantity, snp_volume, unit_cost, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        projectId, part.partNumber, part.clientPartNumber, part.partName,
        part.description, part.revision, part.specifications, part.weight,
        part.snpQuantity, part.snpVolume, part.unitCost, part.currency
      ]);
      console.log(`   ✓ Parte creada: ${part.partName} (${part.partNumber})`);
    }

    // ========================================================================
    // PASO 3: AGREGAR CONTACTOS A LOS CLIENTES
    // ========================================================================
    console.log('\n👥 Agregando contactos a los clientes...');

    const contacts = [
      // FAURECIA (client_id: 1)
      {
        clientId: 1,
        name: 'Roberto Sánchez',
        title: 'Quality Manager',
        email: 'roberto.sanchez@faurecia.com',
        phone: '+1 (937) 492-2710'
      },
      {
        clientId: 1,
        name: 'María García',
        title: 'Purchasing Director',
        email: 'maria.garcia@faurecia.com',
        phone: '+1 (937) 492-2715'
      },
      {
        clientId: 1,
        name: 'David Hernández',
        title: 'Program Manager',
        email: 'david.hernandez@faurecia.com',
        phone: '+1 (937) 492-2720'
      },

      // GISSING (client_id: 2)
      {
        clientId: 2,
        name: 'John Mitchell',
        title: 'VP of Operations',
        email: 'john.mitchell@gissing.com',
        phone: '+1 (313) 555-0101'
      },
      {
        clientId: 2,
        name: 'Sarah Thompson',
        title: 'Quality Director',
        email: 'sarah.thompson@gissing.com',
        phone: '+1 (313) 555-0102'
      },
      {
        clientId: 2,
        name: 'Michael Chen',
        title: 'Supplier Quality Engineer',
        email: 'michael.chen@gissing.com',
        phone: '+1 (313) 555-0105'
      },

      // LUCID (client_id: 3)
      {
        clientId: 3,
        name: 'Jennifer Park',
        title: 'Supply Chain Manager',
        email: 'jennifer.park@lucidmotors.com',
        phone: '+1 (510) 648-3560'
      },
      {
        clientId: 3,
        name: 'Thomas Anderson',
        title: 'Battery Engineering Lead',
        email: 'thomas.anderson@lucidmotors.com',
        phone: '+1 (510) 648-3565'
      },
      {
        clientId: 3,
        name: 'Lisa Kumar',
        title: 'Supplier Quality Manager',
        email: 'lisa.kumar@lucidmotors.com',
        phone: '+1 (510) 648-3570'
      },

      // ELRINGKLINGER (client_id: 4)
      {
        clientId: 4,
        name: 'Hans Müller',
        title: 'Plant Manager',
        email: 'hans.mueller@elringklinger.ca',
        phone: '+1 (519) 255-1235'
      },
      {
        clientId: 4,
        name: 'Patricia Wilson',
        title: 'Quality Assurance Manager',
        email: 'patricia.wilson@elringklinger.ca',
        phone: '+1 (519) 255-1240'
      },
      {
        clientId: 4,
        name: 'James Brown',
        title: 'Procurement Specialist',
        email: 'james.brown@elringklinger.ca',
        phone: '+1 (519) 255-1245'
      },

      // MUBEA (client_id: 5)
      {
        clientId: 5,
        name: 'Carlos Ramírez',
        title: 'Director de Operaciones',
        email: 'carlos.ramirez@mubea.com',
        phone: '+52-442-345-6790'
      },
      {
        clientId: 5,
        name: 'Ana Martínez',
        title: 'Gerente de Calidad',
        email: 'ana.martinez@mubea.com',
        phone: '+52-442-345-6795'
      },
      {
        clientId: 5,
        name: 'Luis Fernández',
        title: 'Ingeniero de Procesos',
        email: 'luis.fernandez@mubea.com',
        phone: '+52-442-345-6800'
      }
    ];

    for (const contact of contacts) {
      // Check if contact already exists
      const existingContact = await query(
        'SELECT id FROM client_contacts WHERE email = $1',
        [contact.email]
      );

      if (existingContact.rows.length > 0) {
        console.log(`   ⏭️  Ya existe: ${contact.name} (${contact.email})`);
        continue;
      }

      await query(`
        INSERT INTO client_contacts (client_id, name, title, email, phone)
        VALUES ($1, $2, $3, $4, $5)
      `, [contact.clientId, contact.name, contact.title, contact.email, contact.phone]);
      console.log(`   ✓ Contacto agregado: ${contact.name} - ${contact.title}`);
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n📊 RESUMEN DE DATOS POBLADOS:');
    console.log('=====================================');

    const projectCount = await query('SELECT COUNT(*) FROM projects');
    const partCount = await query('SELECT COUNT(*) FROM project_parts');
    const contactCount = await query('SELECT COUNT(*) FROM client_contacts');

    console.log(`✅ Total Proyectos: ${projectCount.rows[0].count}`);
    console.log(`✅ Total Partes: ${partCount.rows[0].count}`);
    console.log(`✅ Total Contactos: ${contactCount.rows[0].count}`);
    console.log('=====================================\n');

    console.log('🎉 ¡Poblado de datos completado exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante el poblado de datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar
populateData();
