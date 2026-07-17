const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { authenticateWebhook, requirePermission, logWebhookCall, generateApiKey } = require('../middleware/webhookAuth');
const authenticateToken = require('../middleware/auth');

// ============================================================================
// WEBHOOK ENDPOINTS - Para sistemas externos (SAP, MES, EPICOR, etc.)
// ============================================================================

/**
 * POST /webhook/production
 * Recibir datos de producción desde sistema externo
 *
 * Headers:
 *   X-API-Key: pk_XXXXXXXX_secretkey
 *   Content-Type: application/json
 *
 * Body (single):
 * {
 *   "serial_number": "SN-001",
 *   "part_number": "ABC-123",
 *   "lot_number": "LOT-001",
 *   "work_order": "WO-50001",
 *   "produced_at": "2026-07-06T08:00:00Z",
 *   "shift": "SHIFT_1",
 *   "line": "LINE_01"
 * }
 *
 * Body (batch):
 * {
 *   "entries": [
 *     { "serial_number": "SN-001", "part_number": "ABC-123", ... },
 *     { "serial_number": "SN-002", "part_number": "ABC-123", ... }
 *   ]
 * }
 */
router.post('/production',
  authenticateWebhook,
  requirePermission('production:write'),
  async (req, res) => {
    const startTime = req.webhookAuth?.startTime || Date.now();
    const client = await pool.connect();

    try {
      let entries = [];

      // Soportar formato single o batch
      if (req.body.entries && Array.isArray(req.body.entries)) {
        entries = req.body.entries;
      } else if (req.body.serial_number) {
        entries = [req.body];
      } else {
        await logWebhookCall(req.webhookAuth.keyId, req, 400, { error: 'Formato inválido' }, startTime, false);
        return res.status(400).json({
          success: false,
          error: 'Formato inválido. Enviar objeto con serial_number o array en "entries"',
          code: 'INVALID_FORMAT'
        });
      }

      if (entries.length === 0) {
        await logWebhookCall(req.webhookAuth.keyId, req, 400, { error: 'Sin entries' }, startTime, false);
        return res.status(400).json({
          success: false,
          error: 'No se proporcionaron entries',
          code: 'EMPTY_PAYLOAD'
        });
      }

      // Límite de batch
      if (entries.length > 1000) {
        await logWebhookCall(req.webhookAuth.keyId, req, 400, { error: 'Excede límite' }, startTime, false);
        return res.status(400).json({
          success: false,
          error: 'Máximo 1000 entries por llamada',
          code: 'BATCH_LIMIT_EXCEEDED'
        });
      }

      // Pre-cargar mapas de part_number -> part_id y shift -> shift_id
      const partNumbers = [...new Set(entries.map(e => e.part_number).filter(Boolean))];
      const shiftCodes = [...new Set(entries.map(e => e.shift).filter(Boolean))];

      const partMap = {};
      const shiftMap = {};

      if (partNumbers.length > 0) {
        const partsResult = await client.query(
          'SELECT id, part_number FROM client_parts WHERE part_number = ANY($1)',
          [partNumbers]
        );
        partsResult.rows.forEach(p => { partMap[p.part_number] = p.id; });
      }

      if (shiftCodes.length > 0) {
        const shiftsResult = await client.query(
          'SELECT id, code FROM inspection_shifts WHERE code = ANY($1)',
          [shiftCodes]
        );
        shiftsResult.rows.forEach(s => { shiftMap[s.code] = s.id; });
      }

      await client.query('BEGIN');

      const results = {
        received: entries.length,
        inserted: 0,
        duplicates: 0,
        unmatched: 0,
        errors: []
      };

      const unmatchedParts = new Set();

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        try {
          // Validar serial_number
          if (!entry.serial_number) {
            results.errors.push({ index: i, error: 'serial_number requerido' });
            continue;
          }

          const partNumberRaw = entry.part_number || null;
          let partId = partMap[partNumberRaw] || null;
          let partStatus = 'CONFIGURED';

          if (!partId && partNumberRaw) {
            partStatus = 'UNMATCHED';
            unmatchedParts.add(partNumberRaw);
            results.unmatched++;
          } else if (!partId && !partNumberRaw) {
            results.errors.push({ index: i, serial: entry.serial_number, error: 'part_number requerido' });
            continue;
          }

          const shiftId = shiftMap[entry.shift] || null;
          const producedAt = entry.produced_at ? new Date(entry.produced_at) : new Date();

          const result = await client.query(`
            INSERT INTO production_entries (
              serial_number, part_id, part_number_raw, lot_number, work_order,
              shift_id, produced_at, source, source_reference, part_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'WEBHOOK', $8, $9)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [
            entry.serial_number,
            partId,
            partNumberRaw,
            entry.lot_number || null,
            entry.work_order || null,
            shiftId,
            producedAt,
            req.webhookAuth.systemName,
            partStatus
          ]);

          if (result.rows.length > 0) {
            results.inserted++;
          } else {
            results.duplicates++;
          }

        } catch (err) {
          results.errors.push({ index: i, serial: entry.serial_number, error: err.message });
        }
      }

      await client.query('COMMIT');

      // Construir respuesta
      const response = {
        success: true,
        results,
        warnings: []
      };

      if (unmatchedParts.size > 0) {
        response.warnings.push({
          code: 'UNMATCHED_PARTS',
          message: `${unmatchedParts.size} número(s) de parte no configurado(s)`,
          parts: Array.from(unmatchedParts)
        });
      }

      await logWebhookCall(
        req.webhookAuth.keyId, req, 200, response, startTime, true, results.inserted
      );

      res.json(response);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en webhook production:', error);

      const errorResponse = { success: false, error: error.message, code: 'PROCESSING_ERROR' };
      await logWebhookCall(req.webhookAuth.keyId, req, 500, errorResponse, startTime, false);

      res.status(500).json(errorResponse);

    } finally {
      client.release();
    }
  }
);

/**
 * GET /webhook/production/status/:serial
 * Consultar estado de un serial
 */
router.get('/production/status/:serial',
  authenticateWebhook,
  requirePermission('production:read'),
  async (req, res) => {
    const startTime = req.webhookAuth?.startTime || Date.now();

    try {
      const { serial } = req.params;

      const result = await pool.query(`
        SELECT
          pe.id,
          pe.serial_number,
          pe.part_number_raw,
          CASE WHEN pe.unit_id IS NULL THEN 'PENDING' ELSE COALESCE(ur.current_status, 'REGISTERED') END as inspection_status,
          pe.part_status,
          pe.produced_at,
          pe.inspected_at,
          pe.work_order,
          pe.lot_number,
          cp.part_number,
          cp.part_name,
          ur.current_status as unit_status
        FROM production_entries pe
        LEFT JOIN client_parts cp ON cp.id = pe.part_id
        LEFT JOIN unit_registry ur ON pe.unit_id = ur.id
        WHERE pe.serial_number = $1
        LIMIT 1
      `, [serial]);

      if (result.rows.length === 0) {
        const response = { success: false, error: 'Serial no encontrado', code: 'NOT_FOUND' };
        await logWebhookCall(req.webhookAuth.keyId, req, 404, response, startTime, false);
        return res.status(404).json(response);
      }

      const response = {
        success: true,
        entry: transformToCamelCase(result.rows[0])
      };

      await logWebhookCall(req.webhookAuth.keyId, req, 200, response, startTime, true);
      res.json(response);

    } catch (error) {
      console.error('Error consultando status:', error);
      const errorResponse = { success: false, error: error.message };
      await logWebhookCall(req.webhookAuth.keyId, req, 500, errorResponse, startTime, false);
      res.status(500).json(errorResponse);
    }
  }
);

/**
 * POST /webhook/production/batch-status
 * Consultar estado de múltiples seriales
 */
router.post('/production/batch-status',
  authenticateWebhook,
  requirePermission('production:read'),
  async (req, res) => {
    const startTime = req.webhookAuth?.startTime || Date.now();

    try {
      const { serials } = req.body;

      if (!Array.isArray(serials) || serials.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere array de seriales',
          code: 'INVALID_FORMAT'
        });
      }

      if (serials.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Máximo 500 seriales por consulta',
          code: 'BATCH_LIMIT_EXCEEDED'
        });
      }

      const result = await pool.query(`
        SELECT
          pe.serial_number,
          CASE WHEN pe.unit_id IS NULL THEN 'PENDING' ELSE COALESCE(ur.current_status, 'REGISTERED') END as inspection_status,
          pe.part_status,
          pe.inspected_at,
          cp.part_number,
          ur.current_status as unit_status
        FROM production_entries pe
        LEFT JOIN client_parts cp ON cp.id = pe.part_id
        LEFT JOIN unit_registry ur ON pe.unit_id = ur.id
        WHERE pe.serial_number = ANY($1)
      `, [serials]);

      // Construir mapa de resultados
      const statusMap = {};
      result.rows.forEach(row => {
        statusMap[row.serial_number] = {
          inspectionStatus: row.inspection_status,
          unitStatus: row.unit_status,
          partStatus: row.part_status,
          inspectedAt: row.inspected_at,
          partNumber: row.part_number
        };
      });

      // Incluir seriales no encontrados
      const notFound = serials.filter(s => !statusMap[s]);

      const response = {
        success: true,
        results: statusMap,
        notFound,
        summary: {
          found: Object.keys(statusMap).length,
          notFound: notFound.length,
          inspected: Object.values(statusMap).filter(s => s.inspectionStatus === 'INSPECTED').length,
          pending: Object.values(statusMap).filter(s => s.inspectionStatus === 'PENDING').length
        }
      };

      await logWebhookCall(req.webhookAuth.keyId, req, 200, { summary: response.summary }, startTime, true);
      res.json(response);

    } catch (error) {
      console.error('Error en batch-status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// ADMIN ENDPOINTS - Gestión de API Keys (requieren login normal)
// ============================================================================

/**
 * GET /webhook/admin/keys - Listar API keys
 */
router.get('/admin/keys', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id, system_name, description, api_key_prefix,
        permissions, allowed_ips, rate_limit_per_minute,
        is_active, created_at, last_used_at, usage_count, expires_at
      FROM webhook_api_keys
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      keys: result.rows.map(transformToCamelCase)
    });

  } catch (error) {
    console.error('Error listando API keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /webhook/admin/keys - Crear nueva API key
 */
router.post('/admin/keys', authenticateToken, async (req, res) => {
  try {
    const {
      systemName,
      description,
      permissions = ['production:write', 'production:read'],
      allowedIps,
      rateLimitPerMinute = 100,
      expiresAt
    } = req.body;

    if (!systemName) {
      return res.status(400).json({
        success: false,
        error: 'systemName es requerido'
      });
    }

    // Generar API key
    const { fullKey, prefix, hash } = generateApiKey();

    const result = await pool.query(`
      INSERT INTO webhook_api_keys (
        system_name, description, api_key_hash, api_key_prefix,
        permissions, allowed_ips, rate_limit_per_minute, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, system_name, api_key_prefix, created_at
    `, [
      systemName,
      description || null,
      hash,
      prefix,
      JSON.stringify(permissions),
      allowedIps || null,
      rateLimitPerMinute,
      expiresAt || null,
      req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      key: {
        id: result.rows[0].id,
        systemName: result.rows[0].system_name,
        prefix: result.rows[0].api_key_prefix,
        createdAt: result.rows[0].created_at
      },
      // IMPORTANTE: Mostrar solo una vez
      apiKey: fullKey,
      warning: 'Guarda esta API key. No podrás verla de nuevo.'
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una key con ese prefijo. Intenta de nuevo.'
      });
    }
    console.error('Error creando API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /webhook/admin/keys/:id - Actualizar API key
 */
router.put('/admin/keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, permissions, allowedIps, rateLimitPerMinute, isActive, expiresAt } = req.body;

    const result = await pool.query(`
      UPDATE webhook_api_keys
      SET
        description = COALESCE($1, description),
        permissions = COALESCE($2, permissions),
        allowed_ips = COALESCE($3, allowed_ips),
        rate_limit_per_minute = COALESCE($4, rate_limit_per_minute),
        is_active = COALESCE($5, is_active),
        expires_at = COALESCE($6, expires_at)
      WHERE id = $7
      RETURNING *
    `, [
      description,
      permissions ? JSON.stringify(permissions) : null,
      allowedIps,
      rateLimitPerMinute,
      isActive,
      expiresAt,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API key no encontrada' });
    }

    res.json({
      success: true,
      key: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error actualizando API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /webhook/admin/keys/:id - Eliminar API key
 */
router.delete('/admin/keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM webhook_api_keys WHERE id = $1 RETURNING id, system_name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API key no encontrada' });
    }

    res.json({
      success: true,
      deleted: true,
      systemName: result.rows[0].system_name
    });

  } catch (error) {
    console.error('Error eliminando API key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /webhook/admin/logs - Ver logs de llamadas
 */
router.get('/admin/logs', authenticateToken, async (req, res) => {
  try {
    const { keyId, success, limit = 100, offset = 0 } = req.query;

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (keyId) {
      conditions.push(`wl.api_key_id = $${paramIndex++}`);
      params.push(keyId);
    }
    if (success !== undefined) {
      conditions.push(`wl.success = $${paramIndex++}`);
      params.push(success === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        wl.*,
        wak.system_name
      FROM webhook_logs wl
      LEFT JOIN webhook_api_keys wak ON wak.id = wl.api_key_id
      ${whereClause}
      ORDER BY wl.received_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      logs: result.rows.map(transformToCamelCase)
    });

  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
