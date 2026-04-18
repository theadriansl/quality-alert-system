const { query, pool } = require('../config/database');

/**
 * FLUJO DE APROBACIÓN EN CASCADA PARA 8D REPORTS
 *
 * ESTADOS DEL SISTEMA (15 estados):
 * 1. draft - Borrador inicial
 * 2-4. issue_approval_1/2/3 - Aprobaciones Issue
 * 5. issue_approved - Issue completado
 * 6. countermeasure_in_progress - Primary trabajando en Countermeasure
 * 7-9. countermeasure_approval_1/2/3 - Aprobaciones Countermeasure
 * 10. countermeasure_approved - Countermeasure completado
 * 11. confirmation_in_progress - Primary trabajando en Confirmation
 * 12-14. confirmation_approval_1/2/3 - Aprobaciones Confirmation
 * 15. closed - 8D completado y cerrado
 */

// Mapeo de estados para transiciones
const STATE_MACHINE = {
  draft: {
    next: 'issue_approval_1',
    section: 'issue',
    level: 1
  },
  issue_approval_1: {
    next: 'issue_approval_2',
    previous: 'draft',
    section: 'issue',
    level: 1
  },
  issue_approval_2: {
    next: 'issue_approval_3',
    previous: 'issue_approval_1',
    section: 'issue',
    level: 2
  },
  issue_approval_3: {
    next: 'issue_approved',
    previous: 'issue_approval_2',
    section: 'issue',
    level: 3
  },
  issue_approved: {
    next: 'countermeasure_in_progress',
    section: 'issue'
  },
  countermeasure_in_progress: {
    next: 'countermeasure_approval_1',
    section: 'countermeasure',
    level: 0
  },
  countermeasure_approval_1: {
    next: 'countermeasure_approval_2',
    previous: 'countermeasure_in_progress',
    section: 'countermeasure',
    level: 1
  },
  countermeasure_approval_2: {
    next: 'countermeasure_approval_3',
    previous: 'countermeasure_approval_1',
    section: 'countermeasure',
    level: 2
  },
  countermeasure_approval_3: {
    next: 'countermeasure_approved',
    previous: 'countermeasure_approval_2',
    section: 'countermeasure',
    level: 3
  },
  countermeasure_approved: {
    next: 'confirmation_in_progress',
    section: 'countermeasure'
  },
  confirmation_in_progress: {
    next: 'confirmation_approval_1',
    section: 'confirmation',
    level: 0
  },
  confirmation_approval_1: {
    next: 'confirmation_approval_2',
    previous: 'confirmation_in_progress',
    section: 'confirmation',
    level: 1
  },
  confirmation_approval_2: {
    next: 'confirmation_approval_3',
    previous: 'confirmation_approval_1',
    section: 'confirmation',
    level: 2
  },
  confirmation_approval_3: {
    next: 'closed',
    previous: 'confirmation_approval_2',
    section: 'confirmation',
    level: 3
  },
  closed: {
    section: 'confirmation'
  }
};

/**
 * Obtener el siguiente estado basado en los aprobadores asignados
 * Si no hay aprobador en un nivel, salta al siguiente
 */
async function getNextState(reportId, currentState) {
  const stateInfo = STATE_MACHINE[currentState];
  if (!stateInfo || !stateInfo.next) {
    return null;
  }

  // Si el siguiente estado es un estado de aprobación, verificar si hay aprobador asignado
  if (stateInfo.next.includes('approval')) {
    const section = stateInfo.section;
    const nextLevel = STATE_MACHINE[stateInfo.next].level;

    // Obtener el reporte para ver los aprobadores asignados
    const reportResult = await query(
      'SELECT escalation_path FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      throw new Error('Reporte no encontrado');
    }

    const escalationPath = reportResult.rows[0].escalation_path || {};

    // Mapear sección a la key correcta en escalation_path
    const sectionKeyMap = {
      'issue': 'issue_users',
      'countermeasure': 'countermeasure_users',
      'confirmation': 'confirmation_users'
    };
    const sectionKey = sectionKeyMap[section];
    const sectionUsers = escalationPath[sectionKey] || [];

    // En escalation_path: índice 0 = primary/responsable, índice 1 = approver1, índice 2 = approver2, etc.
    // Para approval level N, el aprobador está en índice N
    const approverIndex = nextLevel; // level 1 -> index 1, level 2 -> index 2, etc.

    if (!sectionUsers[approverIndex]) {
      // No hay aprobador en este nivel, saltar al siguiente estado
      console.log(`⏭️ Saltando ${stateInfo.next} - no hay aprobador en índice ${approverIndex}`);
      return await getNextState(reportId, stateInfo.next);
    }
  }

  return stateInfo.next;
}

/**
 * Obtener el estado anterior (para rechazos)
 */
function getPreviousState(currentState) {
  const stateInfo = STATE_MACHINE[currentState];
  return stateInfo ? stateInfo.previous : null;
}

/**
 * Enviar 8D a aprobación (desde draft)
 * POST /8d/reports/:id/submit
 */
async function submitForApproval(req, res) {
  const reportId = parseInt(req.params.id);
  const userId = req.user.id; // Asumiendo que el usuario está en req.user

  try {
    // Verificar que el reporte existe y está en estado draft
    const reportResult = await query(
      'SELECT status, created_by FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = reportResult.rows[0];

    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'El reporte no está en estado draft' });
    }

    // Verificar que el usuario es el creador
    if (report.created_by !== userId) {
      return res.status(403).json({ error: 'Solo el creador puede enviar a aprobación' });
    }

    // Calcular el siguiente estado
    const nextState = await getNextState(reportId, 'draft');

    // Actualizar estado del reporte
    await query(
      'UPDATE eightd_reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextState, reportId]
    );

    res.json({
      success: true,
      message: 'Reporte enviado a aprobación',
      newStatus: nextState
    });

  } catch (error) {
    console.error('Error al enviar a aprobación:', error);
    res.status(500).json({ error: 'Error al enviar a aprobación' });
  }
}

/**
 * Aprobar una sección del 8D
 * POST /8d/reports/:id/approve
 * Body: { section, level, comments }
 */
async function approveSection(req, res) {
  const reportId = parseInt(req.params.id);
  const userId = req.user.id;
  const { section, level, comments } = req.body;

  try {
    // Validar parámetros
    if (!section || !level) {
      return res.status(400).json({ error: 'Sección y nivel son requeridos' });
    }

    if (!['issue', 'countermeasure', 'confirmation'].includes(section)) {
      return res.status(400).json({ error: 'Sección inválida' });
    }

    if (![1, 2, 3].includes(level)) {
      return res.status(400).json({ error: 'Nivel de aprobador inválido' });
    }

    // Obtener el reporte
    const reportResult = await query(
      'SELECT status, escalation_path FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = reportResult.rows[0];
    const currentState = report.status;

    // Verificar que el estado actual corresponde a esta aprobación
    const expectedState = `${section}_approval_${level}`;
    if (currentState !== expectedState) {
      return res.status(400).json({
        error: `El reporte no está en el estado correcto para esta aprobación. Estado actual: ${currentState}`
      });
    }

    // Verificar que el usuario es el aprobador asignado
    const escalationPath = report.escalation_path || {};
    const sectionKeyMap = {
      'issue': 'issue_users',
      'countermeasure': 'countermeasure_users',
      'confirmation': 'confirmation_users'
    };
    const sectionKey = sectionKeyMap[section];
    const sectionUsers = escalationPath[sectionKey] || [];

    // En escalation_path: índice 0 = primary, índice N = approver N
    const approverUserId = sectionUsers[level];

    if (!approverUserId) {
      return res.status(400).json({ error: 'No hay aprobador asignado en este nivel' });
    }

    if (approverUserId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para aprobar en este nivel' });
    }

    // Registrar aprobación
    await query(
      `INSERT INTO eightd_approvals (report_id, section, approver_level, user_id, action, comments)
       VALUES ($1, $2, $3, $4, 'approved', $5)`,
      [reportId, section, level, userId, comments || null]
    );

    // Calcular el siguiente estado
    const nextState = await getNextState(reportId, currentState);

    // Actualizar estado del reporte
    await query(
      'UPDATE eightd_reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextState, reportId]
    );

    res.json({
      success: true,
      message: 'Aprobación registrada exitosamente',
      newStatus: nextState
    });

  } catch (error) {
    console.error('Error al aprobar:', error);
    res.status(500).json({ error: 'Error al aprobar' });
  }
}

/**
 * Rechazar una sección del 8D
 * POST /8d/reports/:id/reject
 * Body: { section, level, comments }
 */
async function rejectSection(req, res) {
  const reportId = parseInt(req.params.id);
  const userId = req.user.id;
  const { section, level, comments } = req.body;

  try {
    // Validar parámetros
    if (!section || !level) {
      return res.status(400).json({ error: 'Sección y nivel son requeridos' });
    }

    if (!comments || comments.trim() === '') {
      return res.status(400).json({ error: 'Los comentarios son obligatorios al rechazar' });
    }

    if (!['issue', 'countermeasure', 'confirmation'].includes(section)) {
      return res.status(400).json({ error: 'Sección inválida' });
    }

    if (![1, 2, 3].includes(level)) {
      return res.status(400).json({ error: 'Nivel de aprobador inválido' });
    }

    // Obtener el reporte
    const reportResult = await query(
      'SELECT status, escalation_path FROM eightd_reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = reportResult.rows[0];
    const currentState = report.status;

    // Verificar que el estado actual corresponde a esta aprobación
    const expectedState = `${section}_approval_${level}`;
    if (currentState !== expectedState) {
      return res.status(400).json({
        error: `El reporte no está en el estado correcto para este rechazo. Estado actual: ${currentState}`
      });
    }

    // Verificar que el usuario es el aprobador asignado
    const escalationPath = report.escalation_path || {};
    const sectionKeyMap = {
      'issue': 'issue_users',
      'countermeasure': 'countermeasure_users',
      'confirmation': 'confirmation_users'
    };
    const sectionKey = sectionKeyMap[section];
    const sectionUsers = escalationPath[sectionKey] || [];

    // En escalation_path: índice 0 = primary, índice N = approver N
    const approverUserId = sectionUsers[level];

    if (!approverUserId) {
      return res.status(400).json({ error: 'No hay aprobador asignado en este nivel' });
    }

    if (approverUserId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para rechazar en este nivel' });
    }

    // Registrar rechazo
    await query(
      `INSERT INTO eightd_approvals (report_id, section, approver_level, user_id, action, comments)
       VALUES ($1, $2, $3, $4, 'rejected', $5)`,
      [reportId, section, level, userId, comments]
    );

    // Obtener el estado anterior (regresa al paso anterior)
    const previousState = getPreviousState(currentState);

    if (!previousState) {
      return res.status(400).json({ error: 'No se puede retroceder desde este estado' });
    }

    // Actualizar estado del reporte
    await query(
      'UPDATE eightd_reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [previousState, reportId]
    );

    res.json({
      success: true,
      message: 'Rechazo registrado exitosamente',
      newStatus: previousState
    });

  } catch (error) {
    console.error('Error al rechazar:', error);
    res.status(500).json({ error: 'Error al rechazar' });
  }
}

/**
 * Obtener estado de aprobación de un reporte
 * GET /8d/reports/:id/approval-status
 * NOTA: Este endpoint maneja AMBOS sistemas:
 * - Sistema NUEVO: D1-D2-D3 Sequential Approval (d1_d2_d3_approval_status)
 * - Sistema VIEJO: Cascading Approval (status field)
 */
async function getApprovalStatus(req, res) {
  const reportId = parseInt(req.params.id);

  try {
    // Obtener el reporte con TODOS los campos necesarios
    const reportResult = await query(
      `SELECT
        id, status, created_by, created_at, updated_at,
        d1_d2_d3_approval_status, current_approval_step,
        escalation_path,
        approval_1_by, approval_1_status,
        approval_2_by, approval_2_status,
        approval_3_by, approval_3_status
       FROM eightd_reports WHERE id = $1`,
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const report = reportResult.rows[0];

    // Obtener historial de aprobaciones (sistema viejo)
    const approvalsResult = await query(
      `SELECT a.*, u.first_name, u.last_name, u.email, u.position
       FROM eightd_approvals a
       JOIN users u ON a.user_id = u.id
       WHERE a.report_id = $1
       ORDER BY a.created_at ASC`,
      [reportId]
    );

    let pendingApprover = null;
    let currentStatus = report.status;

    // ===== SISTEMA NUEVO: D1-D2-D3 Sequential Approval =====
    if (report.d1_d2_d3_approval_status) {
      const d123Status = report.d1_d2_d3_approval_status;
      currentStatus = d123Status; // Usar el estado del sistema nuevo

      // Solo mostrar pending_approver si está en pending_approval_X
      if (d123Status === 'pending_approval_1' ||
          d123Status === 'pending_approval_2' ||
          d123Status === 'pending_approval_3') {

        const level = parseInt(d123Status.split('_').pop()); // Extraer el número

        // Obtener los aprobadores desde escalation_path
        if (report.escalation_path && report.escalation_path.issue_users) {
          const approverUserId = report.escalation_path.issue_users[level]; // level = 1,2,3

          if (approverUserId) {
            // Obtener detalles del aprobador
            const approverResult = await query(
              `SELECT id, first_name, last_name, email, position
               FROM users WHERE id = $1`,
              [approverUserId]
            );

            if (approverResult.rows.length > 0) {
              pendingApprover = {
                section: 'issue',
                level: level,
                users: [approverResult.rows[0]] // Formato compatible con frontend
              };
            }
          }
        }
      }

      // Si está rechazado o aprobado, NO hay pending_approver
      // rejected_by_a1, rejected_by_a2, rejected_by_a3, approved, draft
    }
    // ===== SISTEMA VIEJO: Cascading Approval =====
    else if (currentStatus.includes('approval')) {
      const stateInfo = STATE_MACHINE[currentStatus];
      const section = stateInfo.section;
      const level = stateInfo.level;

      // Usar escalation_path en lugar de team_assignments
      const escalationPath = report.escalation_path || {};
      const sectionKeyMap = {
        'issue': 'issue_users',
        'countermeasure': 'countermeasure_users',
        'confirmation': 'confirmation_users'
      };
      const sectionKey = sectionKeyMap[section];
      const sectionUsers = escalationPath[sectionKey] || [];
      const approverUserId = sectionUsers[level];

      if (approverUserId) {
        // Obtener detalles del aprobador
        const approverResult = await query(
          `SELECT id, first_name, last_name, email, position
           FROM users WHERE id = $1`,
          [approverUserId]
        );

        if (approverResult.rows.length > 0) {
          pendingApprover = {
            section,
            level,
            users: [approverResult.rows[0]]
          };
        }
      }
    }

    res.json({
      report_id: report.id,
      current_status: currentStatus, // Usar el estado correcto según el sistema
      created_by: report.created_by,
      created_at: report.created_at,
      updated_at: report.updated_at,
      pending_approver: pendingApprover, // null si rechazado o aprobado
      approval_history: approvalsResult.rows
    });

  } catch (error) {
    console.error('Error al obtener estado de aprobación:', error);
    res.status(500).json({ error: 'Error al obtener estado de aprobación' });
  }
}

module.exports = {
  submitForApproval,
  approveSection,
  rejectSection,
  getApprovalStatus
};
