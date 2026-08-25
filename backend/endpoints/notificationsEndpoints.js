const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authenticateToken = require('../middleware/auth');

// ============================================================================
// GET /notifications/my-pending
// Obtiene notificaciones pendientes del usuario: 8D, QAR, ECR (items abiertos)
// ============================================================================
router.get('/my-pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = [];

    // =========================================================================
    // 1. QAR - Alertas asignadas O creadas por el usuario (abiertas)
    // Tabla: quality_alerts
    // Columnas verificadas: id, alert_number, title, status, priority, created_at, assigned_to, reported_by
    // =========================================================================
    const qarResult = await query(`
      SELECT DISTINCT
        qa.id,
        qa.alert_number,
        qa.title,
        qa.status,
        qa.severity_id,
        qa.created_at
      FROM quality_alerts qa
      WHERE (qa.assigned_to = $1 OR qa.reported_by = $1)
        AND qa.status IN ('EMITIDO', 'RESPONDIDO', 'RECHAZADO')
      ORDER BY qa.severity_id ASC NULLS LAST, qa.created_at DESC
      LIMIT 15
    `, [userId]);

    qarResult.rows.forEach(row => {
      notifications.push({
        type: 'qar',
        id: row.id,
        code: row.alert_number || `QAR-${row.id}`,
        title: row.title || 'Sin título',
        status: row.status,
        priority: 'medium',
        path: `/qar-detail/${row.id}`,
        createdAt: row.created_at
      });
    });

    // =========================================================================
    // 2. 8D - Reportes donde el usuario es responsable O creador (abiertos)
    // Tabla: eightd_reports
    // Columnas verificadas: id, report_id, title, status, created_at, created_by,
    //   issue_assigned_to, countermeasure_assigned_to, confirmation_assigned_to
    // Status abiertos: NOT IN ('draft', 'closed', 'cancelled', 'completed')
    // =========================================================================
    const eightDResult = await query(`
      SELECT DISTINCT
        r.id,
        r.report_id,
        r.title,
        r.status,
        r.created_at
      FROM eightd_reports r
      WHERE r.status NOT IN ('draft', 'closed', 'cancelled', 'completed')
        AND (
          r.issue_assigned_to = $1
          OR r.countermeasure_assigned_to = $1
          OR r.confirmation_assigned_to = $1
          OR r.created_by = $1
        )
      ORDER BY r.created_at DESC
      LIMIT 15
    `, [userId]);

    eightDResult.rows.forEach(row => {
      notifications.push({
        type: '8d',
        id: row.id,
        code: row.report_id || `8D-${row.id}`,
        title: row.title || 'Sin título',
        status: row.status,
        priority: 'high',
        path: `/8d-workflow?reportId=${row.id}`,
        createdAt: row.created_at
      });
    });

    // =========================================================================
    // 3. ECR - ECRs creados por usuario O donde es aprobador (abiertos)
    // Tabla: ecr_reports
    // Columnas verificadas: id, ecr_number, change_title, status, current_stage, created_at,
    //   created_by, approval_status, current_approval_level, level1/2/3_approver
    // Lógica: Creador y TODOS los aprobadores ven ECRs abiertos (KPI - no sale del radar)
    // =========================================================================
    const ecrResult = await query(`
      SELECT DISTINCT
        e.id,
        e.ecr_number,
        e.change_title,
        e.status,
        e.current_stage,
        e.approval_status,
        e.current_approval_level,
        e.closure_approval_status,
        e.created_at
      FROM ecr_reports e
      WHERE e.status NOT IN ('cancelled', 'closed')
        AND (
          -- Creador: ve sus ECRs abiertos
          e.created_by = $1
          -- Aprobador: ve TODOS los ECRs abiertos donde está asignado como aprobador
          -- (sin importar si es su turno - responsabilidad de empujar el cierre)
          OR e.level1_approver = $1
          OR e.level2_approver = $1
          OR e.level3_approver = $1
        )
      ORDER BY e.created_at DESC
      LIMIT 15
    `, [userId]);

    ecrResult.rows.forEach(row => {
      let displayStatus = row.status;
      if (row.approval_status === 'pending_approval' && row.current_approval_level) {
        displayStatus = `Nivel ${row.current_approval_level}`;
      } else if (row.current_stage) {
        displayStatus = row.current_stage;
      }

      notifications.push({
        type: 'ecr',
        id: row.id,
        code: row.ecr_number || `ECR-${row.id}`,
        title: row.change_title || 'Sin título',
        status: displayStatus,
        priority: 'medium',
        path: `/ecr-workflow/${row.id}`,
        createdAt: row.created_at
      });
    });

    // Ordenar todas las notificaciones por fecha (más recientes primero)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Contar por tipo
    const counts = {
      qar: notifications.filter(n => n.type === 'qar').length,
      eightD: notifications.filter(n => n.type === '8d').length,
      ecr: notifications.filter(n => n.type === 'ecr').length,
      total: notifications.length
    };

    res.json({
      success: true,
      notifications,
      counts
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
});

module.exports = router;
