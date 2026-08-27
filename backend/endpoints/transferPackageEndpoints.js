/**
 * Transfer Package Endpoints
 * Sistema bidireccional de transferencias Hospital <-> MRB
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { transformToCamelCase } = require('../utils/caseTransform');
const { socketEvents } = require('../config/socket');

// ============================================================================
// GET /transfer-packages - Listar paquetes con filtros
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  const { status, originType, destinationType, pendingFor } = req.query;

  try {
    let sql = `
      SELECT
        tp.*,
        CONCAT(uc.first_name, ' ', uc.last_name) as created_by_name,
        CONCAT(ur.first_name, ' ', ur.last_name) as received_by_name,
        mc.campaign_number,
        qa.alert_number,
        (SELECT COUNT(*) FROM transfer_package_items WHERE package_id = tp.id) as item_count,
        (SELECT STRING_AGG(DISTINCT part_number, ', ') FROM transfer_package_items WHERE package_id = tp.id) as parts_summary,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 as minutes_elapsed,
        CASE WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 > tp.alert_hours THEN true ELSE false END as alert_triggered
      FROM transfer_packages tp
      LEFT JOIN users uc ON tp.created_by = uc.id
      LEFT JOIN users ur ON tp.received_by = ur.id
      LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
      LEFT JOIN quality_alerts qa ON tp.qar_id = qa.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND tp.status = $${params.length}`;
    }

    if (originType) {
      params.push(originType);
      sql += ` AND tp.origin_type = $${params.length}`;
    }

    if (destinationType) {
      params.push(destinationType);
      sql += ` AND tp.destination_type = $${params.length}`;
    }

    // pendingFor: 'HOSPITAL' o 'MRB' - paquetes pendientes de recibir
    if (pendingFor) {
      params.push(pendingFor);
      sql += ` AND tp.destination_type = $${params.length} AND tp.status = 'PENDING'`;
    }

    sql += ` ORDER BY tp.created_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      packages: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching transfer packages:', error);
    res.status(500).json({ success: false, message: 'Error al obtener paquetes' });
  }
});

// ============================================================================
// GET /transfer-packages/pending-serials - Seriales en paquetes pendientes
// ============================================================================
router.get('/pending-serials', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT
        tpi.serial_number,
        tp.package_number,
        tp.destination_type,
        tp.created_at
      FROM transfer_package_items tpi
      JOIN transfer_packages tp ON tpi.package_id = tp.id
      WHERE tp.status = 'PENDING'
      ORDER BY tp.created_at DESC
    `);

    // Crear un Set de seriales para búsqueda rápida en frontend
    const serialSet = [...new Set(result.rows.map(r => r.serial_number))];

    res.json({
      success: true,
      serials: serialSet,
      details: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching pending serials:', error);
    res.status(500).json({ success: false, message: 'Error al obtener seriales pendientes' });
  }
});

// ============================================================================
// GET /transfer-packages/pending/:destination - Paquetes pendientes por destino
// ============================================================================
router.get('/pending/:destination', authenticateToken, async (req, res) => {
  const { destination } = req.params; // 'HOSPITAL' o 'MRB'

  try {
    const result = await query(`
      SELECT
        tp.*,
        CONCAT(uc.first_name, ' ', uc.last_name) as created_by_name,
        mc.campaign_number,
        qa.alert_number,
        (SELECT COUNT(*) FROM transfer_package_items WHERE package_id = tp.id) as item_count,
        (SELECT STRING_AGG(DISTINCT part_number, ', ') FROM transfer_package_items WHERE package_id = tp.id) as parts_summary,
        (SELECT STRING_AGG(DISTINCT defect_summary, '; ') FROM transfer_package_items WHERE package_id = tp.id) as defects_summary,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 as minutes_elapsed,
        CASE WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 > tp.alert_hours THEN true ELSE false END as alert_triggered
      FROM transfer_packages tp
      LEFT JOIN users uc ON tp.created_by = uc.id
      LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
      LEFT JOIN quality_alerts qa ON tp.qar_id = qa.id
      WHERE tp.destination_type = $1 AND tp.status = 'PENDING'
      ORDER BY
        CASE WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 > tp.alert_hours THEN 0 ELSE 1 END,
        tp.created_at ASC
    `, [destination]);

    // Separar por con/sin campaña para MRB
    const withCampaign = result.rows.filter(p => p.mrb_campaign_id !== null);
    const withoutCampaign = result.rows.filter(p => p.mrb_campaign_id === null);

    res.json({
      success: true,
      packages: transformToCamelCase(result.rows),
      withCampaign: transformToCamelCase(withCampaign),
      withoutCampaign: transformToCamelCase(withoutCampaign),
      totalPending: result.rows.length,
      alertCount: result.rows.filter(p => p.alert_triggered).length
    });
  } catch (error) {
    console.error('Error fetching pending packages:', error);
    res.status(500).json({ success: false, message: 'Error al obtener paquetes pendientes' });
  }
});

// ============================================================================
// GET /transfer-packages/campaign-assignment-matrix
// Matriz de asignación de campañas para paquetes pendientes
// IMPORTANTE: Esta ruta debe estar ANTES de /:id
// ============================================================================
router.get('/campaign-assignment-matrix', authenticateToken, async (req, res) => {
  try {
    // 1. Obtener items de paquetes pendientes agrupados por part_id
    const itemsRes = await query(`
      SELECT
        tpi.id as item_id,
        tpi.package_id,
        tp.package_number,
        tpi.defect_id,
        tpi.serial_number,
        tpi.part_number,
        tpi.part_name,
        tpi.part_id,
        d.entry_number,
        dt.name as defect_type
      FROM transfer_package_items tpi
      JOIN transfer_packages tp ON tpi.package_id = tp.id
      LEFT JOIN defect_entries_v2 d ON tpi.defect_id = d.id
      LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
      WHERE tp.status = 'PENDING' AND tp.destination_type = 'MRB'
      ORDER BY tpi.part_number, tpi.serial_number
    `);

    // 2. Obtener campañas activas con sus part_id y conteo de seriales
    const campaignsRes = await query(`
      SELECT
        mc.id,
        mc.campaign_number,
        mc.title,
        mc.part_id,
        cp.part_number as campaign_part_number,
        (SELECT COUNT(*) FROM mrb_affected_serials WHERE mrb_campaign_id = mc.id) as serials_count
      FROM mrb_campaigns mc
      LEFT JOIN client_parts cp ON mc.part_id = cp.id
      WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
      ORDER BY mc.created_at DESC
    `);

    // 3. Obtener seriales ya definidos en mrb_affected_serials
    const affectedRes = await query(`
      SELECT
        mas.mrb_campaign_id,
        mas.serial_number
      FROM mrb_affected_serials mas
      JOIN mrb_campaigns mc ON mas.mrb_campaign_id = mc.id
      WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
    `);

    // Crear mapa de seriales afectados por campaña
    const affectedMap = {};
    for (const row of affectedRes.rows) {
      if (!affectedMap[row.mrb_campaign_id]) {
        affectedMap[row.mrb_campaign_id] = new Set();
      }
      affectedMap[row.mrb_campaign_id].add(row.serial_number);
    }

    // 4. Agrupar items por part_id
    const partGroups = {};
    for (const item of itemsRes.rows) {
      const key = item.part_id || item.part_number;
      if (!partGroups[key]) {
        partGroups[key] = {
          partId: item.part_id,
          partNumber: item.part_number,
          partName: item.part_name,
          serials: []
        };
      }
      partGroups[key].serials.push({
        itemId: item.item_id,
        packageId: item.package_id,
        packageNumber: item.package_number,
        defectId: item.defect_id,
        serialNumber: item.serial_number,
        partId: item.part_id,
        entryNumber: item.entry_number,
        defectType: item.defect_type
      });
    }

    // 5. Construir matriz de estados por campaña
    const campaigns = campaignsRes.rows.map(c => ({
      id: c.id,
      campaignNumber: c.campaign_number,
      title: c.title,
      partId: c.part_id,
      partNumber: c.campaign_part_number,
      serialsCount: parseInt(c.serials_count) || 0,
      hasLimitedSerials: parseInt(c.serials_count) > 0
    }));

    const parts = Object.values(partGroups).map(part => {
      // Para cada serial, calcular estado vs cada campaña
      const serialsWithStatus = part.serials.map(serial => {
        const campaignStatus = {};
        for (const camp of campaigns) {
          if (camp.partId !== part.partId) {
            campaignStatus[camp.id] = 'NOT_APPLICABLE';
          } else if (!camp.hasLimitedSerials) {
            campaignStatus[camp.id] = 'IN_SCOPE';
          } else {
            const serialSet = affectedMap[camp.id] || new Set();
            campaignStatus[camp.id] = serialSet.has(serial.serialNumber) ? 'IN_SCOPE' : 'OUT_OF_SCOPE';
          }
        }
        return {
          ...serial,
          campaignStatus
        };
      });

      // Calcular estado agregado a nivel de parte
      const partCampaignStatus = {};
      for (const camp of campaigns) {
        const statuses = serialsWithStatus.map(s => s.campaignStatus[camp.id]);
        if (statuses.every(s => s === 'NOT_APPLICABLE')) {
          partCampaignStatus[camp.id] = 'NOT_APPLICABLE';
        } else if (statuses.some(s => s === 'OUT_OF_SCOPE')) {
          partCampaignStatus[camp.id] = 'PARTIAL';
        } else if (statuses.every(s => s === 'IN_SCOPE' || s === 'NOT_APPLICABLE')) {
          partCampaignStatus[camp.id] = 'IN_SCOPE';
        } else {
          partCampaignStatus[camp.id] = 'MIXED';
        }
      }

      return {
        ...part,
        serials: serialsWithStatus,
        quantity: serialsWithStatus.length,
        campaignStatus: partCampaignStatus
      };
    });

    res.json({
      success: true,
      campaigns,
      parts,
      totalItems: itemsRes.rows.length
    });
  } catch (error) {
    console.error('Error fetching campaign assignment matrix:', error);
    res.status(500).json({ success: false, message: 'Error al obtener matriz de asignación' });
  }
});

// ============================================================================
// GET /transfer-packages/:id - Detalle de un paquete con items
// ============================================================================
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener paquete
    const packageResult = await query(`
      SELECT
        tp.*,
        CONCAT(uc.first_name, ' ', uc.last_name) as created_by_name,
        CONCAT(ur.first_name, ' ', ur.last_name) as received_by_name,
        mc.campaign_number, mc.status as campaign_status,
        qa.alert_number, qa.title as qar_title,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 as minutes_elapsed
      FROM transfer_packages tp
      LEFT JOIN users uc ON tp.created_by = uc.id
      LEFT JOIN users ur ON tp.received_by = ur.id
      LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
      LEFT JOIN quality_alerts qa ON tp.qar_id = qa.id
      WHERE tp.id = $1
    `, [id]);

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado' });
    }

    // Obtener items del paquete
    const itemsResult = await query(`
      SELECT
        tpi.*,
        cp.part_number as current_part_number,
        cp.description as current_part_name,
        de.repair_status,
        de.entry_number,
        ur.current_status as unit_status
      FROM transfer_package_items tpi
      LEFT JOIN client_parts cp ON tpi.part_id = cp.id
      LEFT JOIN defect_entries_v2 de ON tpi.defect_id = de.id
      LEFT JOIN unit_registry ur ON tpi.unit_id = ur.id
      WHERE tpi.package_id = $1
      ORDER BY tpi.id
    `, [id]);

    res.json({
      success: true,
      package: transformToCamelCase(packageResult.rows[0]),
      items: transformToCamelCase(itemsResult.rows)
    });
  } catch (error) {
    console.error('Error fetching package detail:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle del paquete' });
  }
});

// ============================================================================
// POST /transfer-packages - Crear paquete de transferencia
// ============================================================================
router.post('/', authenticateToken, async (req, res) => {
  const {
    originType,        // 'HOSPITAL' o 'MRB'
    destinationType,   // 'HOSPITAL' o 'MRB'
    defectIds,         // Array de IDs de defect_entries_v2
    mrbCampaignId,     // Campaña MRB (opcional)
    qarId,             // QAR asociado (opcional)
    source8dId,        // 8D asociado (opcional)
    alertUserId,       // Usuario a notificar si excede alerta (opcional)
    destinationLocationId, // Ubicación MRB destino (para control 360°)
    notes,
    alertMinutes = 60   // Tiempo en minutos antes de alertar (default 1 hora)
  } = req.body;

  const userId = req.user.id;

  if (!defectIds || !Array.isArray(defectIds) || defectIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Se requiere al menos un defecto' });
  }

  if (!originType || !destinationType) {
    return res.status(400).json({ success: false, message: 'Se requiere origen y destino' });
  }

  try {
    // ========== VALIDACIÓN ESTRICTA: Seriales ya en paquetes pendientes ==========
    // Obtener seriales de los defectos a enviar
    const defectSerials = await query(`
      SELECT id, COALESCE(serial_number, lot_number) as serial
      FROM defect_entries_v2
      WHERE id = ANY($1)
    `, [defectIds]);

    const serialsToSend = defectSerials.rows.map(r => r.serial).filter(Boolean);

    if (serialsToSend.length > 0) {
      // Buscar seriales que ya están en paquetes PENDING
      const duplicates = await query(`
        SELECT DISTINCT tpi.serial_number, tp.package_number
        FROM transfer_package_items tpi
        JOIN transfer_packages tp ON tpi.package_id = tp.id
        WHERE tp.status = 'PENDING'
          AND tpi.serial_number = ANY($1)
      `, [serialsToSend]);

      if (duplicates.rows.length > 0) {
        const duplicateList = duplicates.rows.map(r => `${r.serial_number} (${r.package_number})`).join(', ');
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_SERIALS',
          message: `Seriales ya en paquetes pendientes: ${duplicateList}`,
          duplicates: duplicates.rows
        });
      }
    }

    // Crear paquete (el trigger genera package_number automáticamente)
    const packageResult = await query(`
      INSERT INTO transfer_packages (
        origin_type, destination_type, mrb_campaign_id, qar_id, source_8d_id,
        alert_user_id, created_by, notes, alert_hours, destination_location_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
      RETURNING *
    `, [originType, destinationType, mrbCampaignId || null, qarId || null, source8dId || null, alertUserId || null, userId, notes || null, alertMinutes, destinationLocationId || null]);

    const packageId = packageResult.rows[0].id;
    const packageNumber = packageResult.rows[0].package_number;

    // Procesar cada defecto y agregar al paquete
    const itemsAdded = [];
    for (const defectId of defectIds) {
      // Obtener info del defecto
      const defectInfo = await query(`
        SELECT
          de.id, de.serial_number, de.lot_number, de.unit_id,
          de.part_id, cp.part_number, cp.description as part_name,
          dt.name as defect_type_name,
          sev.code as severity_code,
          (SELECT json_agg(file_path) FROM defect_attachments WHERE defect_id = de.id) as photos
        FROM defect_entries_v2 de
        LEFT JOIN client_parts cp ON de.part_id = cp.id
        LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
        LEFT JOIN inspection_severities sev ON de.severity_id = sev.id
        WHERE de.id = $1
      `, [defectId]);

      if (defectInfo.rows.length === 0) continue;

      const d = defectInfo.rows[0];

      // Insertar item en el paquete
      await query(`
        INSERT INTO transfer_package_items (
          package_id, defect_id, unit_id, serial_number,
          part_id, part_number, part_name,
          defect_summary, severity_code, photo_urls, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        packageId,
        defectId,
        d.unit_id,
        d.serial_number || d.lot_number,
        d.part_id,
        d.part_number,
        d.part_name,
        d.defect_type_name,
        d.severity_code,
        JSON.stringify(d.photos || []),
        null
      ]);

      // Actualizar defecto con referencia al paquete
      await query(`
        UPDATE defect_entries_v2
        SET transfer_package_id = $1,
            transfer_status = 'PENDING_TRANSFER',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [packageId, defectId]);

      itemsAdded.push(defectId);
    }

    // Log evento
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments)
      SELECT id, 'PACKAGE_CREATED', $1, $2
      FROM defect_entries_v2 WHERE id = ANY($3)
    `, [userId, `Agregado a paquete ${packageNumber}`, defectIds]);

    // Emit WebSocket event
    socketEvents.broadcast('package:created', {
      id: packageId,
      packageNumber,
      originType,
      destinationType,
      itemCount: itemsAdded.length,
      createdBy: userId
    });

    res.json({
      success: true,
      package: transformToCamelCase(packageResult.rows[0]),
      itemsAdded: itemsAdded.length,
      message: `Paquete ${packageNumber} creado con ${itemsAdded.length} item(s)`
    });
  } catch (error) {
    console.error('Error creating transfer package:', error);
    res.status(500).json({ success: false, message: 'Error al crear paquete' });
  }
});

// ============================================================================
// POST /transfer-packages/:id/receive - Recibir un paquete
// ============================================================================
router.post('/:id/receive', authenticateToken, async (req, res) => {
  const packageId = parseInt(req.params.id);
  const { notes, mrbCampaignId, locationId } = req.body; // locationId para ubicación destino
  const userId = req.user.id;
  const parsedLocationId = locationId ? parseInt(locationId) : null;
  const parsedCampaignId = mrbCampaignId ? parseInt(mrbCampaignId) : null;

  try {
    // Verificar paquete existe y está pendiente
    const packageCheck = await query(
      'SELECT * FROM transfer_packages WHERE id = $1 AND status = $2',
      [packageId, 'PENDING']
    );

    if (packageCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado o ya procesado' });
    }

    const pkg = packageCheck.rows[0];

    // Actualizar campaña si se proporciona al recibir (para paquetes sin campaña)
    const finalCampaignId = parsedCampaignId || pkg.mrb_campaign_id;

    // Marcar paquete como recibido
    const updateResult = await query(`
      UPDATE transfer_packages
      SET status = 'RECEIVED',
          received_by = $1,
          received_at = CURRENT_TIMESTAMP,
          reception_notes = $2,
          mrb_campaign_id = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [userId, notes || null, finalCampaignId, packageId]);

    // Actualizar estado de los defectos y obtener datos para mrb_affected_serials
    const newRepairStatus = pkg.destination_type === 'MRB' ? 'QUARANTINE' : 'IN_REPAIR';

    // Incluir ubicación si se proporciona (para MRB)
    const updatedDefects = await query(`
      UPDATE defect_entries_v2
      SET transfer_status = 'RECEIVED',
          repair_status = $1,
          mrb_campaign_id = COALESCE($2, mrb_campaign_id),
          current_location_id = COALESCE($4, current_location_id),
          mrb_received_at = CASE WHEN $1 = 'QUARANTINE' THEN CURRENT_TIMESTAMP ELSE mrb_received_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE transfer_package_id = $3
      RETURNING id, serial_number, part_id, lot_number
    `, [newRepairStatus, finalCampaignId, packageId, parsedLocationId]);

    // Si hay campaña asignada y es destino MRB, crear registros en mrb_affected_serials
    if (finalCampaignId && pkg.destination_type === 'MRB') {
      for (const defect of updatedDefects.rows) {
        if (defect.serial_number) {
          await query(`
            INSERT INTO mrb_affected_serials (mrb_campaign_id, serial_number, part_id, lot_number, created_by, inspected)
            VALUES ($1, $2, $3, $4, $5, false)
            ON CONFLICT (mrb_campaign_id, serial_number) DO NOTHING
          `, [finalCampaignId, defect.serial_number, defect.part_id, defect.lot_number, userId]);
        }
      }
    }

    // Actualizar ubicación de las partes (unit_registry) si hay locationId
    if (parsedLocationId) {
      await query(`
        UPDATE unit_registry ur
        SET current_location_id = $1
        FROM defect_entries_v2 d
        WHERE d.unit_id = ur.id AND d.transfer_package_id = $2
      `, [parsedLocationId, packageId]);
    }

    // Log evento
    await query(`
      INSERT INTO defect_events (defect_id, event_type, performed_by, comments)
      SELECT defect_id, 'PACKAGE_RECEIVED', $1, $2
      FROM transfer_package_items WHERE package_id = $3
    `, [userId, `Paquete ${pkg.package_number} recibido`, packageId]);

    // Calcular tiempo de transferencia en minutos
    const transferMinutes = (new Date() - new Date(pkg.created_at)) / (1000 * 60);

    // Emit WebSocket event
    socketEvents.broadcast('package:received', {
      id: packageId,
      packageNumber: pkg.package_number,
      originType: pkg.origin_type,
      destinationType: pkg.destination_type,
      itemCount: updatedDefects.rows.length,
      receivedBy: userId,
      transferMinutes: Math.round(transferMinutes)
    });

    res.json({
      success: true,
      package: transformToCamelCase(updateResult.rows[0]),
      transferMinutes: Math.round(transferMinutes),
      message: `Paquete ${pkg.package_number} recibido exitosamente`
    });
  } catch (error) {
    console.error('Error receiving package:', error);
    res.status(500).json({ success: false, message: `Error al recibir paquete: ${error.message}` });
  }
});

// ============================================================================
// POST /transfer-packages/:id/cancel - Cancelar un paquete pendiente
// ============================================================================
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  try {
    const packageCheck = await query(
      'SELECT * FROM transfer_packages WHERE id = $1 AND status = $2',
      [id, 'PENDING']
    );

    if (packageCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado o ya procesado' });
    }

    const pkg = packageCheck.rows[0];

    // Cancelar paquete
    await query(`
      UPDATE transfer_packages
      SET status = 'CANCELLED',
          notes = CONCAT(COALESCE(notes, ''), ' | CANCELADO: ', $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reason || 'Sin razón especificada', id]);

    // Revertir estado de defectos
    await query(`
      UPDATE defect_entries_v2
      SET transfer_package_id = NULL,
          transfer_status = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE transfer_package_id = $1
    `, [id]);

    // Emit WebSocket event
    socketEvents.broadcast('package:cancelled', {
      id: parseInt(id),
      packageNumber: pkg.package_number,
      cancelledBy: userId,
      reason
    });

    res.json({
      success: true,
      message: `Paquete ${pkg.package_number} cancelado`
    });
  } catch (error) {
    console.error('Error cancelling package:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar paquete' });
  }
});

// ============================================================================
// GET /transfer-packages/alerts - Paquetes con alerta (excedieron tiempo)
// ============================================================================
router.get('/status/alerts', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        tp.*,
        CONCAT(uc.first_name, ' ', uc.last_name) as created_by_name,
        mc.campaign_number,
        (SELECT COUNT(*) FROM transfer_package_items WHERE package_id = tp.id) as item_count,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 as minutes_elapsed
      FROM transfer_packages tp
      LEFT JOIN users uc ON tp.created_by = uc.id
      LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
      WHERE tp.status = 'PENDING'
        AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 60 > tp.alert_hours
      ORDER BY tp.created_at ASC
    `);

    res.json({
      success: true,
      alerts: transformToCamelCase(result.rows),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Error al obtener alertas' });
  }
});

// ============================================================================
// GET /transfer-packages/stats - Estadísticas de transferencias
// ============================================================================
router.get('/status/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE status = 'RECEIVED') as received_count,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND origin_type = 'HOSPITAL') as pending_from_hospital,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND origin_type = 'MRB') as pending_from_mrb,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 > alert_hours) as alert_count,
        AVG(CASE WHEN status = 'RECEIVED' THEN EXTRACT(EPOCH FROM (received_at - created_at)) / 60 END) as avg_transfer_minutes
      FROM transfer_packages
    `);

    res.json({
      success: true,
      stats: transformToCamelCase(stats.rows[0])
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

// ============================================================================
// GET /transfer-packages/summary/no-campaign - Resumen de material sin campaña
// ============================================================================
router.get('/summary/no-campaign', authenticateToken, async (req, res) => {
  try {
    // Resumen agrupado por part_number + defecto para referencia al crear campaña
    const result = await query(`
      SELECT
        tpi.part_number,
        tpi.part_name,
        tpi.defect_summary,
        COUNT(*) as quantity,
        STRING_AGG(DISTINCT tpi.serial_number, ', ') as serials,
        MIN(tp.created_at) as oldest_package_date,
        tp.qar_id,
        qa.alert_number
      FROM transfer_package_items tpi
      JOIN transfer_packages tp ON tpi.package_id = tp.id
      LEFT JOIN quality_alerts qa ON tp.qar_id = qa.id
      WHERE tp.status = 'PENDING'
        AND tp.destination_type = 'MRB'
        AND tp.mrb_campaign_id IS NULL
      GROUP BY tpi.part_number, tpi.part_name, tpi.defect_summary, tp.qar_id, qa.alert_number
      ORDER BY quantity DESC, tpi.part_number
    `);

    res.json({
      success: true,
      summary: transformToCamelCase(result.rows)
    });
  } catch (error) {
    console.error('Error fetching no-campaign summary:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
});

// ============================================================================
// POST /transfer-packages/assign-campaigns-bulk
// Asignar campañas en bulk a seriales de paquetes pendientes
// ============================================================================
router.post('/assign-campaigns-bulk', authenticateToken, async (req, res) => {
  const { assignments } = req.body;
  // assignments: [{ serialNumber, campaignId, defectId }]

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ success: false, message: 'Se requieren asignaciones' });
  }

  try {
    let assigned = 0;
    let skipped = 0;

    for (const item of assignments) {
      const { serialNumber, campaignId, defectId, partId } = item;

      // Verificar si ya existe en mrb_affected_serials
      const existing = await query(
        'SELECT id FROM mrb_affected_serials WHERE mrb_campaign_id = $1 AND serial_number = $2',
        [campaignId, serialNumber]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insertar en mrb_affected_serials
      await query(`
        INSERT INTO mrb_affected_serials (mrb_campaign_id, serial_number, part_id, created_by, inspected)
        VALUES ($1, $2, $3, $4, false)
      `, [campaignId, serialNumber, partId, req.user.id]);

      // Actualizar defect_entries_v2 si hay defectId
      if (defectId) {
        await query(`
          UPDATE defect_entries_v2
          SET mrb_campaign_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND mrb_campaign_id IS NULL
        `, [campaignId, defectId]);
      }

      assigned++;
    }

    res.json({
      success: true,
      assigned,
      skipped,
      message: `${assigned} seriales asignados, ${skipped} ya existían`
    });
  } catch (error) {
    console.error('Error assigning campaigns bulk:', error);
    res.status(500).json({ success: false, message: 'Error al asignar campañas' });
  }
});

// ============================================================================
// GET /transfer-packages/rework-pending - Defectos MRB con disposición REWORK pendientes de envío a Hospital
// ============================================================================
router.get('/rework/pending', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        de.id,
        de.entry_number,
        de.serial_number,
        de.lot_number,
        de.part_id,
        cp.part_number,
        cp.description as part_name,
        de.mrb_campaign_id,
        mc.campaign_number,
        mc.title as campaign_title,
        dt.name as defect_type_name,
        disp.code as disposition_code,
        disp.name as disposition_name,
        sev.code as severity_code,
        de.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as captured_by_name,
        (SELECT json_agg(file_path) FROM defect_attachments WHERE defect_id = de.id) as photos
      FROM defect_entries_v2 de
      JOIN inspection_dispositions disp ON de.disposition_id = disp.id
      LEFT JOIN client_parts cp ON de.part_id = cp.id
      LEFT JOIN mrb_campaigns mc ON de.mrb_campaign_id = mc.id
      LEFT JOIN defect_types dt ON de.defect_type_id = dt.id
      LEFT JOIN inspection_severities sev ON de.severity_id = sev.id
      LEFT JOIN users u ON de.captured_by_user_id = u.id
      WHERE disp.code = 'REWORK'
        AND de.transfer_package_id IS NULL
        AND de.mrb_campaign_id IS NOT NULL
      ORDER BY mc.campaign_number, de.created_at DESC
    `);

    // Agrupar por campaña para mejor visualización
    const byCampaign = {};
    result.rows.forEach(row => {
      const key = row.mrb_campaign_id || 'sin_campana';
      if (!byCampaign[key]) {
        byCampaign[key] = {
          campaignId: row.mrb_campaign_id,
          campaignNumber: row.campaign_number,
          campaignTitle: row.campaign_title,
          defects: []
        };
      }
      byCampaign[key].defects.push(row);
    });

    res.json({
      success: true,
      defects: transformToCamelCase(result.rows),
      byCampaign: Object.values(byCampaign).map(c => ({
        ...c,
        defects: transformToCamelCase(c.defects)
      })),
      totalCount: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching rework pending:', error);
    res.status(500).json({ success: false, message: 'Error al obtener defectos REWORK' });
  }
});

// ============================================================================
// GET /transfer-packages/hospital/pending-summary - Resumen de paquetes pendientes para Hospital
// ============================================================================
router.get('/hospital/pending-summary', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE destination_type = 'HOSPITAL' AND status = 'PENDING') as pending_from_mrb,
        COUNT(*) FILTER (WHERE destination_type = 'HOSPITAL' AND status = 'PENDING'
          AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 > alert_hours) as alerts_from_mrb
      FROM transfer_packages
    `);

    res.json({
      success: true,
      pendingFromMrb: parseInt(result.rows[0].pending_from_mrb) || 0,
      alertsFromMrb: parseInt(result.rows[0].alerts_from_mrb) || 0
    });
  } catch (error) {
    console.error('Error fetching hospital pending summary:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
});

module.exports = router;
