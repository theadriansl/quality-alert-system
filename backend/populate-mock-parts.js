const { query } = require('./config/database');

const mockParts = [
  // Faurecia (ID 1) - Interior parts
  { clientId: 1, projectId: 1, partNumber: 'FAU-IP-001', partName: 'Instrument Panel Main Frame', description: 'Main structural frame for instrument panel assembly', revision: 'Rev C', bomLevel: 1, unitCost: 125.50, weight: 3.2, snpQuantity: 50, snpVolume: 0.15, supplier: 'ABC Plastics', clientPartNumber: 'CLI-FAU-001', currency: 'USD' },
  { clientId: 1, projectId: 1, partNumber: 'FAU-IP-002', partName: 'Center Console Trim', description: 'Decorative trim piece for center console', revision: 'Rev B', bomLevel: 2, unitCost: 45.00, weight: 0.8, snpQuantity: 100, snpVolume: 0.05, supplier: 'Trim Masters Inc', clientPartNumber: 'CLI-FAU-002', currency: 'USD' },
  { clientId: 1, projectId: 1, partNumber: 'FAU-IP-003', partName: 'Air Vent Bezel', description: 'Decorative bezel for HVAC air vents', revision: 'Rev A', bomLevel: 3, unitCost: 12.75, weight: 0.15, snpQuantity: 200, snpVolume: 0.02, supplier: 'Precision Molding', clientPartNumber: 'CLI-FAU-003', currency: 'USD' },
  { clientId: 1, projectId: 8, partNumber: 'FAU-DP-001', partName: 'Door Panel Substrate', description: 'Base substrate for door panel assembly', revision: 'Rev B', bomLevel: 1, unitCost: 89.00, weight: 2.1, snpQuantity: 40, snpVolume: 0.12, supplier: 'Composite Solutions', clientPartNumber: 'CLI-FAU-DP1', currency: 'USD' },
  { clientId: 1, projectId: 8, partNumber: 'FAU-DP-002', partName: 'Armrest Insert', description: 'Soft touch armrest insert with stitching', revision: 'Rev A', bomLevel: 2, unitCost: 35.00, weight: 0.6, snpQuantity: 80, snpVolume: 0.04, supplier: 'Leather Craft MX', clientPartNumber: 'CLI-FAU-DP2', currency: 'USD' },
  { clientId: 1, projectId: 9, partNumber: 'FAU-DA-001', partName: 'Dashboard Upper Cover', description: 'Upper dashboard cover with soft touch surface', revision: 'Rev D', bomLevel: 1, unitCost: 156.00, weight: 2.8, snpQuantity: 30, snpVolume: 0.18, supplier: 'SoftTouch Industries', clientPartNumber: 'CLI-FAU-DA1', currency: 'USD' },
  { clientId: 1, projectId: 10, partNumber: 'FAU-DPA-001', partName: 'Door Pull Handle', description: 'Interior door pull handle assembly', revision: 'Rev B', bomLevel: 2, unitCost: 28.50, weight: 0.35, snpQuantity: 150, snpVolume: 0.03, supplier: 'Handle Tech', clientPartNumber: 'CLI-FAU-DPA1', currency: 'USD' },

  // Gissing (ID 2) - Safety parts
  { clientId: 2, projectId: 4, partNumber: 'GIS-SB-001', partName: 'Seat Belt Buckle Housing', description: 'Main housing for seat belt buckle mechanism', revision: 'Rev C', bomLevel: 1, unitCost: 18.50, weight: 0.25, snpQuantity: 500, snpVolume: 0.01, supplier: 'Safety Components Ltd', clientPartNumber: 'GIS-BKL-001', currency: 'USD' },
  { clientId: 2, projectId: 4, partNumber: 'GIS-SB-002', partName: 'Buckle Release Button', description: 'Red release button with tactile feedback', revision: 'Rev B', bomLevel: 2, unitCost: 3.25, weight: 0.05, snpQuantity: 1000, snpVolume: 0.005, supplier: 'Button Works', clientPartNumber: 'GIS-BKL-002', currency: 'USD' },
  { clientId: 2, projectId: 4, partNumber: 'GIS-SB-003', partName: 'Latch Mechanism', description: 'Spring-loaded latch mechanism', revision: 'Rev A', bomLevel: 2, unitCost: 8.75, weight: 0.12, snpQuantity: 500, snpVolume: 0.008, supplier: 'Precision Springs', clientPartNumber: 'GIS-BKL-003', currency: 'USD' },
  { clientId: 2, projectId: 11, partNumber: 'GIS-SBA-001', partName: 'Belt Anchor Plate', description: 'Reinforced anchor plate for seat belt mounting', revision: 'Rev B', bomLevel: 1, unitCost: 12.00, weight: 0.45, snpQuantity: 300, snpVolume: 0.015, supplier: 'Steel Fabricators', clientPartNumber: 'GIS-ANC-001', currency: 'USD' },
  { clientId: 2, projectId: 11, partNumber: 'GIS-SBA-002', partName: 'Belt Webbing Guide', description: 'Plastic guide for belt webbing routing', revision: 'Rev A', bomLevel: 2, unitCost: 2.50, weight: 0.08, snpQuantity: 800, snpVolume: 0.003, supplier: 'Plastic Solutions', clientPartNumber: 'GIS-ANC-002', currency: 'USD' },

  // Lucid (ID 3) - EV components
  { clientId: 3, projectId: 2, partNumber: 'LUC-EV-001', partName: 'Battery Tray Main Structure', description: 'Aluminum battery tray with thermal management channels', revision: 'Rev D', bomLevel: 1, unitCost: 450.00, weight: 25.0, snpQuantity: 10, snpVolume: 0.85, supplier: 'Aluminum Dynamics', clientPartNumber: 'LUC-BAT-001', currency: 'USD' },
  { clientId: 3, projectId: 2, partNumber: 'LUC-EV-002', partName: 'Cell Module Bracket', description: 'Mounting bracket for battery cell modules', revision: 'Rev C', bomLevel: 2, unitCost: 35.00, weight: 1.2, snpQuantity: 50, snpVolume: 0.08, supplier: 'Precision Metal Works', clientPartNumber: 'LUC-BAT-002', currency: 'USD' },
  { clientId: 3, projectId: 5, partNumber: 'LUC-MH-001', partName: 'Motor Housing Shell', description: 'Die-cast aluminum motor housing', revision: 'Rev B', bomLevel: 1, unitCost: 280.00, weight: 12.5, snpQuantity: 15, snpVolume: 0.35, supplier: 'CastTech Industries', clientPartNumber: 'LUC-MOT-001', currency: 'USD' },
  { clientId: 3, projectId: 5, partNumber: 'LUC-MH-002', partName: 'Stator Mount Ring', description: 'Precision machined stator mounting ring', revision: 'Rev A', bomLevel: 2, unitCost: 95.00, weight: 3.8, snpQuantity: 25, snpVolume: 0.12, supplier: 'Precision Machining Co', clientPartNumber: 'LUC-MOT-002', currency: 'USD' },
  { clientId: 3, projectId: 12, partNumber: 'LUC-BE-001', partName: 'Battery Enclosure Lid', description: 'Sealed battery enclosure top cover', revision: 'Rev C', bomLevel: 1, unitCost: 175.00, weight: 8.5, snpQuantity: 12, snpVolume: 0.45, supplier: 'Composite Innovations', clientPartNumber: 'LUC-ENC-001', currency: 'USD' },
  { clientId: 3, projectId: 13, partNumber: 'LUC-EMH-001', partName: 'Cooling Jacket', description: 'Liquid cooling jacket for motor housing', revision: 'Rev B', bomLevel: 2, unitCost: 120.00, weight: 4.2, snpQuantity: 20, snpVolume: 0.18, supplier: 'Thermal Solutions Inc', clientPartNumber: 'LUC-COOL-001', currency: 'USD' },

  // ElringKlinger (ID 4) - Gaskets
  { clientId: 4, projectId: 6, partNumber: 'ELK-GS-001', partName: 'Cylinder Head Gasket', description: 'Multi-layer steel cylinder head gasket', revision: 'Rev E', bomLevel: 1, unitCost: 45.00, weight: 0.35, snpQuantity: 200, snpVolume: 0.02, supplier: 'Steel Laminate Corp', clientPartNumber: 'ELK-CHG-001', currency: 'USD' },
  { clientId: 4, projectId: 6, partNumber: 'ELK-GS-002', partName: 'Intake Manifold Gasket', description: 'Composite intake manifold gasket', revision: 'Rev C', bomLevel: 2, unitCost: 12.50, weight: 0.08, snpQuantity: 500, snpVolume: 0.008, supplier: 'Gasket Materials Inc', clientPartNumber: 'ELK-IMG-001', currency: 'USD' },
  { clientId: 4, projectId: 6, partNumber: 'ELK-GS-003', partName: 'Oil Pan Gasket', description: 'Silicone-coated oil pan gasket', revision: 'Rev B', bomLevel: 2, unitCost: 8.75, weight: 0.12, snpQuantity: 400, snpVolume: 0.01, supplier: 'Seal Tech', clientPartNumber: 'ELK-OPG-001', currency: 'USD' },
  { clientId: 4, projectId: 14, partNumber: 'ELK-GSE-001', partName: 'Exhaust Manifold Gasket', description: 'High-temperature exhaust gasket', revision: 'Rev D', bomLevel: 1, unitCost: 22.00, weight: 0.15, snpQuantity: 300, snpVolume: 0.012, supplier: 'HiTemp Seals', clientPartNumber: 'ELK-EMG-001', currency: 'USD' },
  { clientId: 4, projectId: 14, partNumber: 'ELK-GSE-002', partName: 'Valve Cover Gasket Set', description: 'Complete valve cover gasket set', revision: 'Rev C', bomLevel: 2, unitCost: 18.50, weight: 0.1, snpQuantity: 250, snpVolume: 0.015, supplier: 'Gasket Solutions', clientPartNumber: 'ELK-VCG-001', currency: 'USD' },

  // Mubea (ID 5) - Springs
  { clientId: 5, projectId: 7, partNumber: 'MUB-CS-001', partName: 'Front Coil Spring', description: 'Progressive rate front suspension coil spring', revision: 'Rev C', bomLevel: 1, unitCost: 35.00, weight: 2.8, snpQuantity: 100, snpVolume: 0.08, supplier: 'Spring Steel Corp', clientPartNumber: 'MUB-FCS-001', currency: 'USD' },
  { clientId: 5, projectId: 7, partNumber: 'MUB-CS-002', partName: 'Rear Coil Spring', description: 'Linear rate rear suspension coil spring', revision: 'Rev B', bomLevel: 1, unitCost: 32.00, weight: 3.2, snpQuantity: 100, snpVolume: 0.09, supplier: 'Spring Steel Corp', clientPartNumber: 'MUB-RCS-001', currency: 'USD' },
  { clientId: 5, projectId: 7, partNumber: 'MUB-CS-003', partName: 'Spring Isolator Pad', description: 'Rubber isolator pad for spring mounting', revision: 'Rev A', bomLevel: 2, unitCost: 4.50, weight: 0.15, snpQuantity: 500, snpVolume: 0.012, supplier: 'Rubber Tech MX', clientPartNumber: 'MUB-SIP-001', currency: 'USD' },
  { clientId: 5, projectId: 15, partNumber: 'MUB-CSM-001', partName: 'Heavy Duty Coil Spring', description: 'Heavy duty truck coil spring', revision: 'Rev B', bomLevel: 1, unitCost: 55.00, weight: 4.5, snpQuantity: 60, snpVolume: 0.12, supplier: 'HD Springs Inc', clientPartNumber: 'MUB-HDCS-001', currency: 'USD' },
  { clientId: 5, projectId: 15, partNumber: 'MUB-CSM-002', partName: 'Spring Seat Cup', description: 'Steel spring seat cup upper', revision: 'Rev A', bomLevel: 2, unitCost: 8.00, weight: 0.45, snpQuantity: 200, snpVolume: 0.025, supplier: 'Metal Stampings Co', clientPartNumber: 'MUB-SSC-001', currency: 'USD' },

  // TechFlow (ID 6) - General (sin proyectos)
  { clientId: 6, projectId: null, partNumber: 'TF-GEN-001', partName: 'Universal Mounting Bracket', description: 'Versatile mounting bracket for various applications', revision: 'Rev B', bomLevel: 1, unitCost: 15.00, weight: 0.5, snpQuantity: 300, snpVolume: 0.02, supplier: 'General Fab', clientPartNumber: 'TF-UMB-001', currency: 'USD' },
  { clientId: 6, projectId: null, partNumber: 'TF-GEN-002', partName: 'Cable Management Clip', description: 'Snap-fit cable management clip', revision: 'Rev A', bomLevel: 2, unitCost: 0.85, weight: 0.02, snpQuantity: 5000, snpVolume: 0.001, supplier: 'Clip Masters', clientPartNumber: 'TF-CMC-001', currency: 'USD' },
  { clientId: 6, projectId: null, partNumber: 'TF-GEN-003', partName: 'Vibration Dampener', description: 'Rubber vibration dampening mount', revision: 'Rev C', bomLevel: 2, unitCost: 6.25, weight: 0.18, snpQuantity: 400, snpVolume: 0.008, supplier: 'Vibra-Stop Inc', clientPartNumber: 'TF-VDM-001', currency: 'USD' },

  // TEST Client (ID 7)
  { clientId: 7, projectId: 16, partNumber: 'TEST-001', partName: 'Test Part Alpha', description: 'Sample test part for validation purposes', revision: 'Rev A', bomLevel: 1, unitCost: 10.00, weight: 0.5, snpQuantity: 100, snpVolume: 0.05, supplier: 'Test Supplier', clientPartNumber: 'TST-A-001', currency: 'USD' },
  { clientId: 7, projectId: 16, partNumber: 'TEST-002', partName: 'Test Part Beta', description: 'Secondary test component', revision: 'Rev A', bomLevel: 2, unitCost: 5.00, weight: 0.25, snpQuantity: 200, snpVolume: 0.025, supplier: 'Test Supplier', clientPartNumber: 'TST-B-001', currency: 'USD' },
  { clientId: 7, projectId: null, partNumber: 'TEST-003', partName: 'Standalone Test Part', description: 'Test part without project assignment', revision: 'Rev B', bomLevel: 1, unitCost: 7.50, weight: 0.3, snpQuantity: 150, snpVolume: 0.03, supplier: 'General Test Co', clientPartNumber: 'TST-S-001', currency: 'USD' }
];

async function populate() {
  try {
    let inserted = 0;
    for (const part of mockParts) {
      await query(`
        INSERT INTO client_parts (
          client_id, project_id, part_number, client_part_number, part_name,
          description, revision, bom_level, unit_cost, weight,
          snp_quantity, snp_volume, supplier, currency, active, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, '{}')
      `, [
        part.clientId, part.projectId, part.partNumber, part.clientPartNumber, part.partName,
        part.description, part.revision, part.bomLevel, part.unitCost, part.weight,
        part.snpQuantity, part.snpVolume, part.supplier, part.currency
      ]);
      inserted++;
      console.log(`✅ Insertada: ${part.partNumber} - ${part.partName}`);
    }
    console.log(`\n🎉 Total insertadas: ${inserted} partes`);

    // Resumen por cliente
    const summary = await query(`
      SELECT c.name, COUNT(cp.id) as total
      FROM clients c
      LEFT JOIN client_parts cp ON c.id = cp.client_id
      GROUP BY c.id, c.name
      ORDER BY c.id
    `);
    console.log('\n=== RESUMEN POR CLIENTE ===');
    summary.rows.forEach(r => console.log(`  ${r.name}: ${r.total} partes`));
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

populate();
