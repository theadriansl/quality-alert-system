const express = require('express');
const router = express.Router();
const path = require('path');
const { pool, getClient } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const multer = require('multer');
const csv = require('csv-parse');
const { Readable } = require('stream');

// Configuración de multer para CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  }
});

// ============================================================================
// GET /template - Descargar template CSV
// ============================================================================
router.get('/template', (req, res) => {
  const csvContent = `serial_number,part_number,lot_number,work_order,produced_at,shift
SN-EJEMPLO-001,PART-NUMBER-001,LOT-001,WO-001,2026-07-06 08:00:00,SHIFT_1
SN-EJEMPLO-002,PART-NUMBER-001,LOT-001,WO-001,2026-07-06 08:01:00,SHIFT_1`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="production_import_template.csv"');
  res.send(csvContent);
});

// ============================================================================
// GET /template/info - Info sobre formato CSV
// ============================================================================
router.get('/template/info', (req, res) => {
  res.json({
    success: true,
    format: {
      columns: [
        { name: 'serial_number', required: true, description: 'Número de serie único de la pieza' },
        { name: 'part_number', required: true, description: 'Número de parte (si no existe, se guarda para configurar después)' },
        { name: 'lot_number', required: false, description: 'Número de lote' },
        { name: 'work_order', required: false, description: 'Orden de trabajo' },
        { name: 'produced_at', required: false, description: 'Fecha/hora producción (YYYY-MM-DD HH:MM:SS). Si vacío, usa fecha actual' },
        { name: 'shift', required: false, description: 'Código del turno (SHIFT_1, SHIFT_2, SHIFT_3)' }
      ],
      notes: [
        'El archivo debe ser CSV con codificación UTF-8',
        'La primera fila debe contener los nombres de las columnas',
        'Si part_number no existe en el catálogo, se registrará como "Sin Configurar" para vincularlo después',
        'Máximo 10MB por archivo'
      ]
    }
  });
});

// ============================================================================
// POST /entries - Registrar una entrada de producción
// ============================================================================
router.post('/entries', async (req, res) => {
  try {
    const {
      serialNumber,
      partId,
      partNumberRaw,
      lotNumber,
      workOrder,
      lineId,
      shiftId,
      producedAt,
      source = 'API',
      sourceReference
    } = req.body;

    // Validaciones
    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        error: 'serialNumber es requerido'
      });
    }

    if (!partId && !partNumberRaw) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere partId o partNumberRaw'
      });
    }

    // Determinar estado de parte
    let finalPartId = partId;
    let partStatus = 'CONFIGURED';
    let warning = null;

    if (partId) {
      // Verificar que el part existe
      const partCheck = await pool.query(
        'SELECT id, part_number FROM client_parts WHERE id = $1',
        [partId]
      );
      if (partCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Part no encontrado'
        });
      }
    } else if (partNumberRaw) {
      // Buscar por part_number
      const partSearch = await pool.query(
        'SELECT id, part_number FROM client_parts WHERE part_number = $1 LIMIT 1',
        [partNumberRaw.trim()]
      );

      if (partSearch.rows.length > 0) {
        finalPartId = partSearch.rows[0].id;
        partStatus = 'CONFIGURED';
      } else {
        // Parte no encontrada - registrar como UNMATCHED
        finalPartId = null;
        partStatus = 'UNMATCHED';
        warning = `Parte "${partNumberRaw}" no encontrada en sistema. Registrada para configuración posterior.`;
      }
    }

    const result = await pool.query(`
      INSERT INTO production_entries (
        serial_number, part_id, part_number_raw, lot_number, work_order,
        line_id, shift_id, produced_at, source, source_reference,
        part_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      serialNumber,
      finalPartId,
      partNumberRaw || null,
      lotNumber || null,
      workOrder || null,
      lineId || null,
      shiftId || null,
      producedAt || new Date(),
      source,
      sourceReference || null,
      partStatus,
      req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      entry: transformToCamelCase(result.rows[0]),
      warning
    });

  } catch (error) {
    // Duplicado
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una entrada con este serial para esta parte'
      });
    }
    console.error('Error creando production entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /entries/bulk - Importación masiva (JSON array)
// ============================================================================
router.post('/entries/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { entries, source = 'API', sourceReference } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'entries debe ser un array no vacío'
      });
    }

    // Pre-cargar partes para validación
    const partNumbers = [...new Set(entries.map(e => e.partNumberRaw || e.partNumber).filter(Boolean))];
    const partMap = {};

    if (partNumbers.length > 0) {
      const partsResult = await client.query(
        'SELECT id, part_number FROM client_parts WHERE part_number = ANY($1)',
        [partNumbers]
      );
      partsResult.rows.forEach(p => {
        partMap[p.part_number] = p.id;
      });
    }

    await client.query('BEGIN');

    const results = {
      inserted: 0,
      duplicates: 0,
      unmatched: 0,
      errors: [],
      insertedIds: [],
      warnings: []
    };

    // Detectar partes no configuradas
    const unmatchedParts = new Set();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        const partNumberRaw = entry.partNumberRaw || entry.partNumber;
        let partId = entry.partId || partMap[partNumberRaw] || null;
        let partStatus = 'CONFIGURED';

        if (!partId && partNumberRaw) {
          partStatus = 'UNMATCHED';
          unmatchedParts.add(partNumberRaw);
          results.unmatched++;
        }

        const result = await client.query(`
          INSERT INTO production_entries (
            serial_number, part_id, part_number_raw, lot_number, work_order,
            line_id, shift_id, produced_at, source, source_reference,
            part_status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          entry.serialNumber,
          partId,
          partNumberRaw || null,
          entry.lotNumber || null,
          entry.workOrder || null,
          entry.lineId || null,
          entry.shiftId || null,
          entry.producedAt || new Date(),
          source,
          sourceReference || null,
          partStatus,
          req.user?.id || null
        ]);

        if (result.rows.length > 0) {
          results.inserted++;
          results.insertedIds.push(result.rows[0].id);
        } else {
          results.duplicates++;
        }
      } catch (err) {
        results.errors.push({ index: i, serial: entry.serialNumber, error: err.message });
      }
    }

    await client.query('COMMIT');

    // Generar warnings para partes no configuradas
    if (unmatchedParts.size > 0) {
      results.warnings.push({
        type: 'UNMATCHED_PARTS',
        message: `${unmatchedParts.size} número(s) de parte no encontrado(s) en sistema`,
        parts: Array.from(unmatchedParts),
        affectedEntries: results.unmatched
      });
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en bulk import:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /import/csv/preview - Preview de importación CSV (detecta duplicados)
// ============================================================================
router.post('/import/csv/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo CSV'
      });
    }

    const { defaultPartId } = req.body;

    // Parsear CSV
    const records = [];
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream.pipe(parser)
        .on('data', (row) => records.push(row))
        .on('error', reject)
        .on('end', resolve);
    });

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El archivo CSV está vacío'
      });
    }

    // Extraer seriales del CSV
    const serialsInCsv = records
      .map(r => r.serial_number)
      .filter(Boolean);

    if (serialsInCsv.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron seriales válidos en el CSV'
      });
    }

    // Buscar cuáles ya existen en DB
    const existingResult = await pool.query(
      `SELECT DISTINCT serial_number FROM production_entries WHERE serial_number = ANY($1)`,
      [serialsInCsv]
    );
    const existingSerials = new Set(existingResult.rows.map(r => r.serial_number));

    // Clasificar
    const duplicates = [];
    const newSerials = [];
    const unmatchedParts = new Set();

    // Mapa de partes para detectar no configuradas
    const partNumbers = [...new Set(records.map(r => r.part_number).filter(Boolean))];
    const partMap = {};

    if (partNumbers.length > 0) {
      const partsResult = await pool.query(
        'SELECT id, part_number FROM client_parts WHERE part_number = ANY($1)',
        [partNumbers]
      );
      partsResult.rows.forEach(p => {
        partMap[p.part_number] = p.id;
      });
    }

    for (const row of records) {
      if (!row.serial_number) continue;

      if (existingSerials.has(row.serial_number)) {
        duplicates.push({
          serialNumber: row.serial_number,
          partNumber: row.part_number || null,
          workOrder: row.work_order || null
        });
      } else {
        newSerials.push(row.serial_number);
      }

      // Detectar partes no configuradas
      const partNumberRaw = row.part_number || null;
      const partId = partMap[partNumberRaw] || (defaultPartId ? parseInt(defaultPartId) : null);
      if (!partId && partNumberRaw) {
        unmatchedParts.add(partNumberRaw);
      }
    }

    res.json({
      success: true,
      preview: {
        total: records.length,
        newCount: newSerials.length,
        duplicateCount: duplicates.length,
        duplicates: duplicates,
        unmatchedParts: Array.from(unmatchedParts),
        unmatchedCount: unmatchedParts.size
      }
    });

  } catch (error) {
    console.error('Error en preview CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /import/csv - Importar desde CSV
// ============================================================================
router.post('/import/csv', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo CSV'
      });
    }

    const { defaultPartId, sourceReference, allowDuplicates, mrbCampaignId } = req.body;
    const shouldAllowDuplicates = allowDuplicates === 'true' || allowDuplicates === true;
    const campaignId = mrbCampaignId ? parseInt(mrbCampaignId) : null;

    // Parsear CSV
    const records = [];
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });

    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream.pipe(parser)
        .on('data', (row) => records.push(row))
        .on('error', reject)
        .on('end', resolve);
    });

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El archivo CSV está vacío'
      });
    }

    // Construir mapa de part_number -> part_id
    const partNumbers = [...new Set(records.map(r => r.part_number).filter(Boolean))];
    const partMap = {};

    if (partNumbers.length > 0) {
      const partsResult = await client.query(
        'SELECT id, part_number FROM client_parts WHERE part_number = ANY($1)',
        [partNumbers]
      );
      partsResult.rows.forEach(p => {
        partMap[p.part_number] = p.id;
      });
    }

    // Mapa de shift codes
    const shiftCodes = [...new Set(records.map(r => r.shift).filter(Boolean))];
    const shiftMap = {};

    if (shiftCodes.length > 0) {
      const shiftsResult = await client.query(
        'SELECT id, code FROM inspection_shifts WHERE code = ANY($1)',
        [shiftCodes]
      );
      shiftsResult.rows.forEach(s => {
        shiftMap[s.code] = s.id;
      });
    }

    await client.query('BEGIN');

    const results = {
      total: records.length,
      inserted: 0,
      duplicates: 0,
      unmatched: 0,
      errors: [],
      warnings: []
    };

    // Detectar partes no configuradas
    const unmatchedParts = new Set();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        if (!row.serial_number) {
          results.errors.push({
            row: i + 2,
            error: 'serial_number vacío'
          });
          continue;
        }

        const partNumberRaw = row.part_number || null;
        let partId = partMap[partNumberRaw] || (defaultPartId ? parseInt(defaultPartId) : null);
        let partStatus = 'CONFIGURED';

        // Si no hay part_id pero sí part_number_raw, es UNMATCHED
        if (!partId && partNumberRaw) {
          partStatus = 'UNMATCHED';
          unmatchedParts.add(partNumberRaw);
          results.unmatched++;
        } else if (!partId && !partNumberRaw) {
          results.errors.push({
            row: i + 2,
            serial: row.serial_number,
            error: 'Sin part_number y sin defaultPartId'
          });
          continue;
        }

        const shiftId = shiftMap[row.shift] || null;
        const producedAt = row.produced_at ? new Date(row.produced_at) : new Date();

        let result;
        if (shouldAllowDuplicates) {
          // Actualizar si existe (usuario eligió agregar duplicados)
          result = await client.query(`
            INSERT INTO production_entries (
              serial_number, part_id, part_number_raw, lot_number, work_order,
              shift_id, produced_at, source, source_reference, part_status, created_by, mrb_campaign_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CSV', $8, $9, $10, $11)
            ON CONFLICT (part_id, serial_number) WHERE part_id IS NOT NULL
            DO UPDATE SET
              lot_number = EXCLUDED.lot_number,
              work_order = EXCLUDED.work_order,
              shift_id = EXCLUDED.shift_id,
              produced_at = EXCLUDED.produced_at,
              source_reference = EXCLUDED.source_reference,
              mrb_campaign_id = EXCLUDED.mrb_campaign_id
            RETURNING id, (xmax = 0) as inserted
          `, [
            row.serial_number,
            partId,
            partNumberRaw,
            row.lot_number || null,
            row.work_order || null,
            shiftId,
            producedAt,
            sourceReference || req.file.originalname,
            partStatus,
            req.user?.id || null,
            campaignId
          ]);

          if (result.rows.length > 0) {
            if (result.rows[0].inserted) {
              results.inserted++;
            } else {
              results.updated = (results.updated || 0) + 1;
            }
          }
        } else {
          // Omitir duplicados (comportamiento normal)
          result = await client.query(`
            INSERT INTO production_entries (
              serial_number, part_id, part_number_raw, lot_number, work_order,
              shift_id, produced_at, source, source_reference, part_status, created_by, mrb_campaign_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CSV', $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [
            row.serial_number,
            partId,
            partNumberRaw,
            row.lot_number || null,
            row.work_order || null,
            shiftId,
            producedAt,
            sourceReference || req.file.originalname,
            partStatus,
            req.user?.id || null,
            campaignId
          ]);

          if (result.rows.length > 0) {
            results.inserted++;
          } else {
            results.duplicates++;
          }
        }
      } catch (err) {
        results.errors.push({
          row: i + 2,
          serial: row.serial_number,
          error: err.message
        });
      }
    }

    await client.query('COMMIT');

    // Generar warnings para partes no configuradas
    if (unmatchedParts.size > 0) {
      results.warnings.push({
        type: 'UNMATCHED_PARTS',
        message: `${unmatchedParts.size} número(s) de parte no configurado(s) en sistema`,
        parts: Array.from(unmatchedParts),
        affectedEntries: results.unmatched,
        action: 'Ir a "Partes No Configuradas" para vincular'
      });
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importando CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /unmatched-parts - Listar partes no configuradas (agrupadas)
// ============================================================================
router.get('/unmatched-parts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        part_number_raw,
        COUNT(*) as entry_count,
        MIN(produced_at) as first_produced,
        MAX(produced_at) as last_produced,
        array_agg(DISTINCT work_order) FILTER (WHERE work_order IS NOT NULL) as work_orders,
        array_agg(DISTINCT source) as sources
      FROM production_entries
      WHERE part_status = 'UNMATCHED' AND part_id IS NULL
      GROUP BY part_number_raw
      ORDER BY COUNT(*) DESC
    `);

    res.json({
      success: true,
      unmatchedParts: result.rows.map(row => ({
        partNumberRaw: row.part_number_raw,
        entryCount: parseInt(row.entry_count),
        firstProduced: row.first_produced,
        lastProduced: row.last_produced,
        workOrders: row.work_orders || [],
        sources: row.sources || []
      })),
      totalUnmatched: result.rows.reduce((sum, r) => sum + parseInt(r.entry_count), 0)
    });

  } catch (error) {
    console.error('Error obteniendo partes no configuradas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PUT /unmatched-parts/link - Vincular part_number_raw con part_id
// ============================================================================
router.put('/unmatched-parts/link', async (req, res) => {
  try {
    const { partNumberRaw, partId } = req.body;

    if (!partNumberRaw || !partId) {
      return res.status(400).json({
        success: false,
        error: 'partNumberRaw y partId son requeridos'
      });
    }

    // Verificar que el part existe
    const partCheck = await pool.query(
      'SELECT id, part_number, part_name FROM client_parts WHERE id = $1',
      [partId]
    );
    if (partCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part no encontrado'
      });
    }

    // Actualizar todas las entradas con ese part_number_raw
    const result = await pool.query(`
      UPDATE production_entries
      SET part_id = $1, part_status = 'CONFIGURED'
      WHERE part_number_raw = $2 AND part_id IS NULL
      RETURNING id
    `, [partId, partNumberRaw]);

    res.json({
      success: true,
      linkedCount: result.rows.length,
      partNumber: partCheck.rows[0].part_number,
      partName: partCheck.rows[0].part_name,
      message: `${result.rows.length} entradas vinculadas a ${partCheck.rows[0].part_number}`
    });

  } catch (error) {
    console.error('Error vinculando parte:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /entries - Listar entradas con filtros
// ============================================================================
router.get('/entries', async (req, res) => {
  try {
    const {
      partId,
      status,
      partStatus,
      workOrder,
      lotNumber,
      dateFrom,
      dateTo,
      source,
      page = 1,
      limit = 50
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (partId) {
      conditions.push(`pe.part_id = $${paramIndex++}`);
      params.push(partId);
    }
    if (status) {
      // Filtrar por estado usando unit_registry como fuente de verdad
      if (status === 'PENDING') {
        conditions.push(`pe.unit_id IS NULL`);
      } else if (status === 'INSPECTED') {
        conditions.push(`pe.unit_id IS NOT NULL`);
      } else {
        // Estados específicos de unit_registry (OK, DEFECTIVE, SCRAPPED, etc.)
        conditions.push(`ur.current_status = $${paramIndex++}`);
        params.push(status);
      }
    }
    if (partStatus) {
      conditions.push(`pe.part_status = $${paramIndex++}`);
      params.push(partStatus);
    }
    if (workOrder) {
      conditions.push(`pe.work_order ILIKE $${paramIndex++}`);
      params.push(`%${workOrder}%`);
    }
    if (lotNumber) {
      conditions.push(`pe.lot_number ILIKE $${paramIndex++}`);
      params.push(`%${lotNumber}%`);
    }
    if (dateFrom) {
      conditions.push(`pe.produced_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`pe.produced_at <= $${paramIndex++}`);
      params.push(dateTo);
    }
    if (source) {
      conditions.push(`pe.source = $${paramIndex++}`);
      params.push(source);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM production_entries pe
      LEFT JOIN unit_registry ur ON pe.unit_id = ur.id
      ${whereClause}
    `, params);

    // Data - incluye unit_registry.current_status
    const dataResult = await pool.query(`
      SELECT
        pe.*,
        cp.part_number,
        cp.part_name,
        ish.code as shift_code,
        ish.name as shift_name,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        ur.current_status as unit_status
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      LEFT JOIN inspection_shifts ish ON ish.id = pe.shift_id
      LEFT JOIN users u ON u.id = pe.created_by
      LEFT JOIN unit_registry ur ON pe.unit_id = ur.id
      ${whereClause}
      ORDER BY pe.produced_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      entries: dataResult.rows.map(transformToCamelCase),
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error listando production entries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /pending - Solo pendientes de inspección (sin unit_id = no inspeccionado)
// ============================================================================
router.get('/pending', async (req, res) => {
  try {
    const { partId, workOrder, limit = 100 } = req.query;

    const conditions = ["pe.unit_id IS NULL", "pe.part_status = 'CONFIGURED'"];
    const params = [];
    let paramIndex = 1;

    if (partId) {
      conditions.push(`pe.part_id = $${paramIndex++}`);
      params.push(partId);
    }
    if (workOrder) {
      conditions.push(`pe.work_order = $${paramIndex++}`);
      params.push(workOrder);
    }

    const result = await pool.query(`
      SELECT
        pe.id,
        pe.serial_number,
        pe.part_id,
        cp.part_number,
        pe.lot_number,
        pe.work_order,
        pe.produced_at,
        EXTRACT(EPOCH FROM (NOW() - pe.produced_at)) / 3600 as hours_pending
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pe.produced_at ASC
      LIMIT $${paramIndex}
    `, [...params, parseInt(limit)]);

    res.json({
      success: true,
      pending: result.rows.map(transformToCamelCase),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /coverage - Estadísticas de cobertura
// ============================================================================
router.get('/coverage', async (req, res) => {
  try {
    const { partId, dateFrom, dateTo, shiftId, workOrder } = req.query;

    // Base: solo entradas con parte configurada
    const conditions = ["pe.part_status = 'CONFIGURED'"];
    const params = [];
    let paramIndex = 1;

    if (partId) {
      conditions.push(`pe.part_id = $${paramIndex++}`);
      params.push(partId);
    }
    if (dateFrom) {
      conditions.push(`pe.produced_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`pe.produced_at <= $${paramIndex++}`);
      params.push(dateTo);
    }
    if (shiftId) {
      conditions.push(`pe.shift_id = $${paramIndex++}`);
      params.push(shiftId);
    }
    if (workOrder) {
      conditions.push(`pe.work_order = $${paramIndex++}`);
      params.push(workOrder);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Totales generales - usa unit_registry.current_status como fuente de verdad
    const totalsResult = await pool.query(`
      SELECT
        COUNT(*) as total_produced,
        COUNT(*) FILTER (WHERE pe.unit_id IS NOT NULL) as total_inspected,
        COUNT(*) FILTER (WHERE pe.unit_id IS NULL) as pending,
        COUNT(*) FILTER (WHERE ur.current_status = 'OK') as total_ok,
        COUNT(*) FILTER (WHERE ur.current_status = 'DEFECTIVE') as total_defective,
        COUNT(*) FILTER (WHERE ur.current_status = 'SCRAPPED') as total_scrapped
      FROM production_entries pe
      LEFT JOIN unit_registry ur ON pe.unit_id = ur.id
      ${whereClause}
    `, params);

    // Contar entradas no configuradas (separado)
    const unmatchedResult = await pool.query(`
      SELECT COUNT(*) as unmatched_count
      FROM production_entries
      WHERE part_status = 'UNMATCHED'
    `);

    const totals = totalsResult.rows[0];
    const totalProduced = parseInt(totals.total_produced) || 0;
    const totalInspected = parseInt(totals.total_inspected) || 0;
    const coveragePercent = totalProduced > 0
      ? Math.round((totalInspected / totalProduced) * 10000) / 100
      : 0;

    // Por parte - usa unit_id para determinar si fue inspeccionado
    const byPartResult = await pool.query(`
      SELECT
        pe.part_id,
        cp.part_number,
        cp.part_name,
        COUNT(*) as produced,
        COUNT(*) FILTER (WHERE pe.unit_id IS NOT NULL) as inspected,
        COUNT(*) FILTER (WHERE pe.unit_id IS NULL) as pending
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      ${whereClause}
      GROUP BY pe.part_id, cp.part_number, cp.part_name
      ORDER BY COUNT(*) DESC
    `, params);

    const byPart = byPartResult.rows.map(row => ({
      partId: row.part_id,
      partNumber: row.part_number,
      partName: row.part_name,
      produced: parseInt(row.produced),
      inspected: parseInt(row.inspected),
      pending: parseInt(row.pending),
      coveragePercent: parseInt(row.produced) > 0
        ? Math.round((parseInt(row.inspected) / parseInt(row.produced)) * 10000) / 100
        : 0
    }));

    // Por turno - usa unit_id para determinar si fue inspeccionado
    const byShiftResult = await pool.query(`
      SELECT
        pe.shift_id,
        ish.code as shift_code,
        ish.name as shift_name,
        COUNT(*) as produced,
        COUNT(*) FILTER (WHERE pe.unit_id IS NOT NULL) as inspected,
        COUNT(*) FILTER (WHERE pe.unit_id IS NULL) as pending
      FROM production_entries pe
      LEFT JOIN inspection_shifts ish ON ish.id = pe.shift_id
      ${whereClause}
      GROUP BY pe.shift_id, ish.code, ish.name
      ORDER BY pe.shift_id
    `, params);

    const byShift = byShiftResult.rows.map(row => ({
      shiftId: row.shift_id,
      shiftCode: row.shift_code,
      shiftName: row.shift_name,
      produced: parseInt(row.produced),
      inspected: parseInt(row.inspected),
      pending: parseInt(row.pending),
      coveragePercent: parseInt(row.produced) > 0
        ? Math.round((parseInt(row.inspected) / parseInt(row.produced)) * 10000) / 100
        : 0
    }));

    // Seriales pendientes (top 50 más antiguos) - sin unit_id = no inspeccionado
    const pendingConditions = [...conditions, "pe.unit_id IS NULL"];
    const pendingWhereClause = `WHERE ${pendingConditions.join(' AND ')}`;

    const pendingSerialsResult = await pool.query(`
      SELECT pe.serial_number, cp.part_number, pe.produced_at
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      ${pendingWhereClause}
      ORDER BY pe.produced_at ASC
      LIMIT 50
    `, params);

    res.json({
      success: true,
      coverage: {
        totalProduced,
        totalInspected,
        pending: parseInt(totals.pending) || 0,
        // Desglose por estado de unit_registry
        totalOk: parseInt(totals.total_ok) || 0,
        totalDefective: parseInt(totals.total_defective) || 0,
        totalScrapped: parseInt(totals.total_scrapped) || 0,
        coveragePercent,
        unmatchedCount: parseInt(unmatchedResult.rows[0].unmatched_count) || 0,
        byPart,
        byShift,
        pendingSerials: pendingSerialsResult.rows.map(r => ({
          serialNumber: r.serial_number,
          partNumber: r.part_number,
          producedAt: r.produced_at
        }))
      }
    });

  } catch (error) {
    console.error('Error calculando cobertura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /by-serial/:serialNumber - Buscar por serial
// ============================================================================
router.get('/by-serial/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const { partId } = req.query;

    let query = `
      SELECT
        pe.*,
        cp.part_number,
        cp.part_name,
        ish.code as shift_code,
        ish.name as shift_name
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      LEFT JOIN inspection_shifts ish ON ish.id = pe.shift_id
      WHERE pe.serial_number = $1
    `;
    const params = [serialNumber];

    if (partId) {
      query += ' AND pe.part_id = $2';
      params.push(partId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entrada de producción no encontrada'
      });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error buscando por serial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /:id - Obtener entrada por ID
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        pe.*,
        cp.part_number,
        cp.part_name,
        ish.code as shift_code,
        ish.name as shift_name,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        ur.serial_number as unit_serial,
        ur.current_status as unit_status
      FROM production_entries pe
      LEFT JOIN client_parts cp ON cp.id = pe.part_id
      LEFT JOIN inspection_shifts ish ON ish.id = pe.shift_id
      LEFT JOIN users u ON u.id = pe.created_by
      LEFT JOIN unit_registry ur ON ur.id = pe.unit_id
      WHERE pe.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error obteniendo entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PUT /:id/link - Vincular con unit_registry
// ============================================================================
router.put('/:id/link', async (req, res) => {
  try {
    const { id } = req.params;
    const { unitId, status = 'INSPECTED' } = req.body;

    if (!unitId) {
      return res.status(400).json({
        success: false,
        error: 'unitId es requerido'
      });
    }

    // Verificar que el unit existe
    const unitCheck = await pool.query(
      'SELECT id FROM unit_registry WHERE id = $1',
      [unitId]
    );
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unit no encontrado en unit_registry'
      });
    }

    const result = await pool.query(`
      UPDATE production_entries
      SET unit_id = $1, inspection_status = $2, inspected_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [unitId, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entrada de producción no encontrada'
      });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error vinculando entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PUT /:id/status - Cambiar estado manualmente
// ============================================================================
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'INSPECTED', 'PARTIAL', 'SKIPPED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE production_entries
      SET inspection_status = $1
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }

    res.json({
      success: true,
      entry: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error actualizando status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE /:id - Eliminar entrada
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM production_entries WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entrada no encontrada'
      });
    }

    res.json({
      success: true,
      deleted: true,
      id: parseInt(id)
    });

  } catch (error) {
    console.error('Error eliminando entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
