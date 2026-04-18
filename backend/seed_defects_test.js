const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

const defects = [
  // Apariencia
  { code: 'SCRATCH', name: 'Rayadura', color: '#eab308', description: 'Rayadura visible en superficie' },
  { code: 'DENT', name: 'Abolladura', color: '#f59e0b', description: 'Abolladura o hundimiento' },
  { code: 'DIRTY', name: 'Sucio', color: '#84cc16', description: 'Manchas o suciedad' },
  { code: 'STAIN', name: 'Mancha', color: '#a3e635', description: 'Mancha permanente' },
  { code: 'DISCOLORATION', name: 'Decoloración', color: '#fbbf24', description: 'Cambio de color' },
  { code: 'PAINT_CHIP', name: 'Despostillado Pintura', color: '#fb923c', description: 'Pintura saltada' },
  { code: 'BURR', name: 'Rebaba', color: '#fdba74', description: 'Rebaba de material' },

  // Funcional
  { code: 'LOOSE', name: 'Flojo/Suelto', color: '#f97316', description: 'Componente no fijado correctamente' },
  { code: 'MISSING', name: 'Faltante', color: '#ef4444', description: 'Componente faltante' },
  { code: 'BROKEN', name: 'Roto', color: '#dc2626', description: 'Componente roto o fracturado' },
  { code: 'BENT', name: 'Doblado', color: '#b91c1c', description: 'Componente doblado' },
  { code: 'STUCK', name: 'Atorado', color: '#991b1b', description: 'Mecanismo atorado' },
  { code: 'BINDING', name: 'Trabado', color: '#7f1d1d', description: 'Movimiento restringido' },
  { code: 'INOPERATIVE', name: 'No Funciona', color: '#450a0a', description: 'No opera correctamente' },

  // Clips y Sujetadores
  { code: 'CLIP_MISSING', name: 'Clip Faltante', color: '#ef4444', description: 'Clip de sujeción faltante' },
  { code: 'CLIP_BROKEN', name: 'Clip Roto', color: '#dc2626', description: 'Clip de sujeción roto' },
  { code: 'CLIP_LOOSE', name: 'Clip Flojo', color: '#f97316', description: 'Clip no enganchado correctamente' },
  { code: 'FASTENER_MISSING', name: 'Tornillo Faltante', color: '#ef4444', description: 'Tornillo o tuerca faltante' },
  { code: 'FASTENER_LOOSE', name: 'Tornillo Flojo', color: '#f97316', description: 'Tornillo no apretado' },
  { code: 'FASTENER_STRIPPED', name: 'Tornillo Barrido', color: '#b91c1c', description: 'Cuerda dañada' },

  // Eléctrico
  { code: 'CONNECTOR_LOOSE', name: 'Conector Flojo', color: '#8b5cf6', description: 'Conector no insertado completamente' },
  { code: 'CONNECTOR_DAMAGED', name: 'Conector Dañado', color: '#7c3aed', description: 'Conector con daño físico' },
  { code: 'WIRE_EXPOSED', name: 'Cable Expuesto', color: '#6d28d9', description: 'Aislamiento de cable dañado' },
  { code: 'WIRE_PINCHED', name: 'Cable Pinchado', color: '#5b21b6', description: 'Cable atrapado o pellizcado' },
  { code: 'SHORT_CIRCUIT', name: 'Corto Circuito', color: '#4c1d95', description: 'Corto eléctrico detectado' },
  { code: 'NO_POWER', name: 'Sin Corriente', color: '#581c87', description: 'No hay alimentación eléctrica' },

  // Ensamble
  { code: 'MISALIGNED', name: 'Desalineado', color: '#3b82f6', description: 'Componentes no alineados' },
  { code: 'GAP_EXCESSIVE', name: 'Gap Excesivo', color: '#2563eb', description: 'Separación mayor a especificación' },
  { code: 'GAP_INSUFFICIENT', name: 'Gap Insuficiente', color: '#1d4ed8', description: 'Separación menor a especificación' },
  { code: 'INTERFERENCE', name: 'Interferencia', color: '#1e40af', description: 'Componentes interfiriendo' },
  { code: 'WRONG_PART', name: 'Parte Incorrecta', color: '#dc2626', description: 'Parte equivocada instalada' },
  { code: 'REVERSED', name: 'Invertido', color: '#b91c1c', description: 'Parte instalada al revés' },
  { code: 'INCORRECT_ROUTE', name: 'Ruteo Incorrecto', color: '#6366f1', description: 'Arnés o manguera mal ruteada' },

  // Ruido/NVH
  { code: 'RATTLE', name: 'Cascabeleo', color: '#a855f7', description: 'Ruido de vibración suelta' },
  { code: 'SQUEAK', name: 'Rechinido', color: '#9333ea', description: 'Ruido al rozar superficies' },
  { code: 'BUZZ', name: 'Zumbido', color: '#7e22ce', description: 'Vibración audible' },
  { code: 'WIND_NOISE', name: 'Ruido de Viento', color: '#6b21a8', description: 'Entrada de aire' },
  { code: 'VIBRATION', name: 'Vibración', color: '#581c87', description: 'Vibración anormal' },

  // Sellado/Fugas
  { code: 'WATER_LEAK', name: 'Fuga de Agua', color: '#0ea5e9', description: 'Entrada de agua' },
  { code: 'AIR_LEAK', name: 'Fuga de Aire', color: '#0284c7', description: 'Entrada de aire' },
  { code: 'SEAL_DAMAGED', name: 'Sello Dañado', color: '#0369a1', description: 'Sello o empaque dañado' },
  { code: 'SEAL_MISSING', name: 'Sello Faltante', color: '#075985', description: 'Sello o empaque faltante' },

  // Otros
  { code: 'CONTAMINATION', name: 'Contaminación', color: '#65a30d', description: 'Material extraño presente' },
  { code: 'CORROSION', name: 'Corrosión', color: '#ca8a04', description: 'Oxidación o corrosión' },
  { code: 'LABEL_MISSING', name: 'Etiqueta Faltante', color: '#737373', description: 'Etiqueta requerida faltante' },
  { code: 'LABEL_WRONG', name: 'Etiqueta Incorrecta', color: '#525252', description: 'Etiqueta equivocada' },
  { code: 'OTHER', name: 'Otro', color: '#6b7280', description: 'Otro tipo de defecto' }
];

const shortcuts = [
  { name: 'Apariencia', codes: ['SCRATCH', 'DENT', 'DIRTY', 'STAIN', 'DISCOLORATION', 'PAINT_CHIP', 'BURR'], color: '#f59e0b' },
  { name: 'Funcional', codes: ['LOOSE', 'MISSING', 'BROKEN', 'BENT', 'STUCK', 'BINDING', 'INOPERATIVE'], color: '#ef4444' },
  { name: 'Clips/Sujetadores', codes: ['CLIP_MISSING', 'CLIP_BROKEN', 'CLIP_LOOSE', 'FASTENER_MISSING', 'FASTENER_LOOSE', 'FASTENER_STRIPPED'], color: '#f97316' },
  { name: 'Eléctrico', codes: ['CONNECTOR_LOOSE', 'CONNECTOR_DAMAGED', 'WIRE_EXPOSED', 'WIRE_PINCHED', 'SHORT_CIRCUIT', 'NO_POWER'], color: '#8b5cf6' },
  { name: 'Ensamble', codes: ['MISALIGNED', 'GAP_EXCESSIVE', 'GAP_INSUFFICIENT', 'INTERFERENCE', 'WRONG_PART', 'REVERSED', 'INCORRECT_ROUTE'], color: '#3b82f6' },
  { name: 'NVH/Ruido', codes: ['RATTLE', 'SQUEAK', 'BUZZ', 'WIND_NOISE', 'VIBRATION'], color: '#a855f7' },
  { name: 'Sellado/Fugas', codes: ['WATER_LEAK', 'AIR_LEAK', 'SEAL_DAMAGED', 'SEAL_MISSING'], color: '#0ea5e9' }
];

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🚀 Seeding defects and shortcuts...\n');

    // Clear existing data
    await client.query('DELETE FROM defect_shortcuts');
    await client.query('DELETE FROM defect_types');

    // Insert defects
    for (let i = 0; i < defects.length; i++) {
      const d = defects[i];
      await client.query(
        `INSERT INTO defect_types (code, name, description, color, display_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, color = $4`,
        [d.code, d.name, d.description, d.color, i + 1]
      );
    }
    console.log(`✅ ${defects.length} defectos insertados`);

    // Insert shortcuts
    for (let i = 0; i < shortcuts.length; i++) {
      const s = shortcuts[i];

      // Get IDs for the codes
      const idsResult = await client.query(
        'SELECT id FROM defect_types WHERE code = ANY($1)',
        [s.codes]
      );
      const ids = idsResult.rows.map(r => r.id);

      if (ids.length > 0) {
        await client.query(
          `INSERT INTO defect_shortcuts (name, defect_type_ids, color, display_order)
           VALUES ($1, $2, $3, $4)`,
          [s.name, ids, s.color, i + 1]
        );
        console.log(`   📌 Atajo "${s.name}": ${ids.length} defectos`);
      }
    }
    console.log(`✅ ${shortcuts.length} atajos creados`);

    console.log('\n🎉 Seed completado!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
