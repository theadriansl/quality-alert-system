const { pool } = require('../config/database');

async function createImpactAreasConfig() {
  const client = await pool.connect();

  try {
    console.log('🔄 Creating impact_areas_config table...');

    await client.query('BEGIN');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS impact_areas_config (
        id SERIAL PRIMARY KEY,
        area_key VARCHAR(100) UNIQUE NOT NULL,
        area_name VARCHAR(200) NOT NULL,
        icon VARCHAR(10),
        color VARCHAR(50),
        description TEXT,
        subsections JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_impact_areas_active ON impact_areas_config(is_active);
      CREATE INDEX IF NOT EXISTS idx_impact_areas_order ON impact_areas_config(display_order);
    `);

    // Insert seed data - 7 predefined areas
    const areas = [
      {
        area_key: 'customer',
        area_name: 'Cliente',
        icon: '👥',
        color: '#3b82f6',
        description: 'Impacto directo en el cliente final',
        subsections: JSON.stringify([
          { key: 'product_performance', label: 'Desempeño del producto' },
          { key: 'appearance', label: 'Apariencia' },
          { key: 'delivery', label: 'Entregas' },
          { key: 'communication', label: 'Comunicación' }
        ]),
        display_order: 1
      },
      {
        area_key: 'production',
        area_name: 'Producción',
        icon: '🏭',
        color: '#10b981',
        description: 'Impacto en procesos de manufactura',
        subsections: JSON.stringify([
          { key: 'plant_layout', label: 'Layout de planta' },
          { key: 'capacity', label: 'Capacidad de producción' },
          { key: 'cycle_time', label: 'Tiempo de ciclo' },
          { key: 'tooling', label: 'Tooling/Herramental' }
        ]),
        display_order: 2
      },
      {
        area_key: 'quality',
        area_name: 'Calidad',
        icon: '✅',
        color: '#8b5cf6',
        description: 'Impacto en sistemas de calidad',
        subsections: JSON.stringify([
          { key: 'inspection', label: 'Inspección/Control' },
          { key: 'specifications', label: 'Especificaciones' },
          { key: 'measurement', label: 'Sistemas de medición' },
          { key: 'certifications', label: 'Certificaciones' }
        ]),
        display_order: 3
      },
      {
        area_key: 'engineering',
        area_name: 'Ingeniería',
        icon: '⚙️',
        color: '#f59e0b',
        description: 'Impacto en diseño y desarrollo',
        subsections: JSON.stringify([
          { key: 'design', label: 'Diseño del producto' },
          { key: 'bom', label: 'BOM/Lista de materiales' },
          { key: 'drawings', label: 'Planos/Especificaciones' },
          { key: 'validation', label: 'Validación de diseño' }
        ]),
        display_order: 4
      },
      {
        area_key: 'supply_chain',
        area_name: 'Cadena de Suministro',
        icon: '🚚',
        color: '#06b6d4',
        description: 'Impacto en proveedores y logística',
        subsections: JSON.stringify([
          { key: 'suppliers', label: 'Proveedores' },
          { key: 'materials', label: 'Materiales/Componentes' },
          { key: 'logistics', label: 'Logística' },
          { key: 'inventory', label: 'Inventarios' }
        ]),
        display_order: 5
      },
      {
        area_key: 'documentation',
        area_name: 'Documentación',
        icon: '📄',
        color: '#ec4899',
        description: 'Impacto en control documental',
        subsections: JSON.stringify([
          { key: 'procedures', label: 'Procedimientos' },
          { key: 'work_instructions', label: 'Instrucciones de trabajo' },
          { key: 'control_plan', label: 'Plan de control' },
          { key: 'pfmea', label: 'PFMEA' }
        ]),
        display_order: 6
      },
      {
        area_key: 'regulatory',
        area_name: 'Regulatorio',
        icon: '⚖️',
        color: '#ef4444',
        description: 'Impacto en cumplimiento regulatorio',
        subsections: JSON.stringify([
          { key: 'standards', label: 'Normas/Estándares' },
          { key: 'safety', label: 'Seguridad' },
          { key: 'environmental', label: 'Medio ambiente' },
          { key: 'legal', label: 'Legal/Cumplimiento' }
        ]),
        display_order: 7
      }
    ];

    for (const area of areas) {
      await client.query(`
        INSERT INTO impact_areas_config (
          area_key, area_name, icon, color, description, subsections, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (area_key) DO NOTHING
      `, [
        area.area_key,
        area.area_name,
        area.icon,
        area.color,
        area.description,
        area.subsections,
        area.display_order
      ]);
    }

    await client.query('COMMIT');

    console.log('✅ Impact areas configuration table created successfully');
    console.log('📋 Inserted 7 predefined impact areas:');
    console.log('   1. Cliente (Customer)');
    console.log('   2. Producción (Production)');
    console.log('   3. Calidad (Quality)');
    console.log('   4. Ingeniería (Engineering)');
    console.log('   5. Cadena de Suministro (Supply Chain)');
    console.log('   6. Documentación (Documentation)');
    console.log('   7. Regulatorio (Regulatory)');
    console.log('');
    console.log('⚠️  NOTA: Esta configuración es responsabilidad del usuario.');
    console.log('   Ajuste según los requisitos específicos de su organización.');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating impact areas config:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  createImpactAreasConfig()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createImpactAreasConfig };
