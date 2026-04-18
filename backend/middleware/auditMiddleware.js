/**
 * Automatic Audit Middleware for 8D Reports
 * Captures all changes to D1-D8 sections automatically
 */

const { pool } = require('../config/database');
const { logAction } = require('../utils/auditLog');

/**
 * Middleware to automatically log all changes to 8D reports
 */
async function auditEightDChanges(req, res, next) {
  console.log('🔍 Audit middleware called for:', req.method, req.path);

  // Only audit PUT/PATCH requests
  if (!['PUT', 'PATCH'].includes(req.method)) {
    console.log('⏭️ Skipping: not PUT/PATCH');
    return next();
  }

  // Only audit if user is authenticated
  if (!req.user) {
    console.log('⏭️ Skipping: no user');
    return next();
  }

  const reportId = req.params.reportId || req.params.id;
  console.log('📝 Report ID:', reportId, 'User:', req.user.email);

  if (!reportId) {
    console.log('⏭️ Skipping: no reportId');
    return next();
  }

  try {
    // Determine if reportId is numeric or string ID
    const isNumericId = !isNaN(parseInt(reportId));
    console.log('🔢 Is numeric ID:', isNumericId);

    // Get current state BEFORE update
    const beforeResult = await pool.query(
      isNumericId
        ? 'SELECT * FROM eightd_reports WHERE id = $1'
        : 'SELECT * FROM eightd_reports WHERE report_id = $1',
      [isNumericId ? parseInt(reportId) : reportId]
    );

    if (beforeResult.rows.length === 0) {
      console.log('⏭️ Skipping: report not found');
      return next();
    }

    const beforeData = beforeResult.rows[0];
    const actualReportId = beforeData.id;

    // Also get parts for BEFORE state
    const beforePartsResult = await pool.query(
      'SELECT * FROM eightd_parts WHERE report_id = $1',
      [actualReportId]
    );
    beforeData.selected_parts = beforePartsResult.rows;

    console.log('✅ Got BEFORE state for report:', actualReportId);

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // Override res.json to capture AFTER state
    res.json = async function(data) {
      console.log('📤 res.json called, success:', data.success);

      // Only log if the update was successful
      if (data.success) {
        try {
          console.log('🔄 Getting AFTER state...');
          // Get state AFTER update
          const afterResult = await pool.query(
            'SELECT * FROM eightd_reports WHERE id = $1',
            [actualReportId]
          );

          if (afterResult.rows.length > 0) {
            const afterData = afterResult.rows[0];

            // Also get parts for AFTER state
            const afterPartsResult = await pool.query(
              'SELECT * FROM eightd_parts WHERE report_id = $1',
              [actualReportId]
            );
            afterData.selected_parts = afterPartsResult.rows;

            console.log('✅ Got AFTER state, detecting changes...');

            // Detect and log changes
            await detectAndLogChanges(
              actualReportId,
              beforeData,
              afterData,
              req.user,
              req.body
            );

            console.log('✅ Audit logging completed');
          } else {
            console.log('⚠️  No AFTER state found');
          }
        } catch (auditError) {
          console.error('❌ Audit logging error:', auditError.message);
          console.error('Stack:', auditError.stack);
          // Don't fail the request if audit fails
        }
      } else {
        console.log('⏭️ Skipping audit: update was not successful');
      }

      // Call original res.json
      console.log('📮 Calling original res.json');
      return originalJson(data);
    };

    console.log('✅ Middleware setup complete, calling next()');
    next();
  } catch (error) {
    console.error('❌ Audit middleware error:', error.message);
    // Don't fail the request if audit fails
    next();
  }
}

/**
 * Detect what changed and log it
 */
async function detectAndLogChanges(reportId, before, after, user, requestBody) {
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  const userId = user.id;

  // D1 changes
  if (hasD1Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd1',
      userId,
      userName,
      description: 'Sección D1 (Equipo) actualizada',
      oldValue: extractD1Data(before),
      newValue: extractD1Data(after)
    });
  }

  // D2 changes
  if (hasD2Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd2',
      userId,
      userName,
      description: 'Sección D2 (Problema) actualizada',
      oldValue: extractD2Data(before),
      newValue: extractD2Data(after)
    });
  }

  // Parts changes (Client, Project, Affected Parts)
  if (hasPartsChanged(before, after)) {
    await logAction({
      reportId,
      actionType: 'parts_updated',
      actionCategory: 'section',
      sectionName: 'd2_parts',
      userId,
      userName,
      description: 'Partes afectadas actualizadas (Cliente, Proyecto, Números de Parte)',
      oldValue: extractPartsData(before),
      newValue: extractPartsData(after)
    });
  }

  // D3 changes
  if (hasD3Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd3',
      userId,
      userName,
      description: 'Sección D3 (Contención) actualizada',
      oldValue: extractD3Data(before),
      newValue: extractD3Data(after)
    });
  }

  // D3-MFG changes
  if (hasD3MfgChanged(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd3_mfg',
      userId,
      userName,
      description: 'D3-MFG (Contención Manufactura) actualizada',
      oldValue: extractD3MfgData(before),
      newValue: extractD3MfgData(after)
    });
  }

  // D4 changes
  if (hasD4Changed(before, after)) {
    const d4Changes = getD4ChangeDetails(before, after);
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd4',
      userId,
      userName,
      description: d4Changes.description,
      oldValue: extractD4Data(before),
      newValue: extractD4Data(after)
    });
  }

  // D5 changes
  if (hasD5Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd5',
      userId,
      userName,
      description: 'Sección D5 (Acciones Correctivas) actualizada',
      oldValue: extractD5Data(before),
      newValue: extractD5Data(after)
    });
  }

  // D6 changes
  if (hasD6Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd6',
      userId,
      userName,
      description: 'Sección D6 (Validación) actualizada',
      oldValue: extractD6Data(before),
      newValue: extractD6Data(after)
    });
  }

  // D7 changes
  if (hasD7Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd7',
      userId,
      userName,
      description: 'Sección D7 (Prevención) actualizada',
      oldValue: extractD7Data(before),
      newValue: extractD7Data(after)
    });
  }

  // D8 changes
  if (hasD8Changed(before, after)) {
    await logAction({
      reportId,
      actionType: 'section_updated',
      actionCategory: 'section',
      sectionName: 'd8',
      userId,
      userName,
      description: 'Sección D8 (Cierre) actualizada',
      oldValue: extractD8Data(before),
      newValue: extractD8Data(after)
    });
  }

  // Delay history changes (D4)
  if (hasDelayHistoryChanged(before, after)) {
    const delayChanges = getDelayHistoryChanges(before, after);
    await logAction({
      reportId,
      actionType: 'delay_added',
      actionCategory: 'section',
      sectionName: 'd4',
      userId,
      userName,
      description: `Razón de atraso agregada: "${delayChanges.newReason}"`,
      oldValue: before.d4_delay_history,
      newValue: after.d4_delay_history
    });
  }
}

// ============================================================================
// CHANGE DETECTION FUNCTIONS
// ============================================================================

function hasD1Changed(before, after) {
  return JSON.stringify(before.escalation_path) !== JSON.stringify(after.escalation_path);
}

function hasD2Changed(before, after) {
  return before.d2_problem_description !== after.d2_problem_description ||
         before.d2_is_5why !== after.d2_is_5why ||
         JSON.stringify(before.d2_5why_analysis) !== JSON.stringify(after.d2_5why_analysis);
}

function hasPartsChanged(before, after) {
  // Compare the parts arrays (fetched from eightd_parts table)
  return JSON.stringify(before.selected_parts) !== JSON.stringify(after.selected_parts);
}

function hasD3Changed(before, after) {
  return JSON.stringify(before.d3_interim_containment) !== JSON.stringify(after.d3_interim_containment);
}

function hasD3MfgChanged(before, after) {
  return before.d3_mfg_contamination_control !== after.d3_mfg_contamination_control ||
         before.d3_mfg_supplier_notification !== after.d3_mfg_supplier_notification ||
         JSON.stringify(before.d3_mfg_actions) !== JSON.stringify(after.d3_mfg_actions);
}

function hasD4Changed(before, after) {
  return before.d4_root_cause !== after.d4_root_cause ||
         JSON.stringify(before.d4_4m_evaluation) !== JSON.stringify(after.d4_4m_evaluation) ||
         JSON.stringify(before.d4_5whys_analysis) !== JSON.stringify(after.d4_5whys_analysis) ||
         JSON.stringify(before.d4_ishikawa) !== JSON.stringify(after.d4_ishikawa);
}

function hasD5Changed(before, after) {
  return JSON.stringify(before.d5_corrective_actions) !== JSON.stringify(after.d5_corrective_actions);
}

function hasD6Changed(before, after) {
  return before.d6_validation_results !== after.d6_validation_results ||
         JSON.stringify(before.d6_effectiveness_data) !== JSON.stringify(after.d6_effectiveness_data);
}

function hasD7Changed(before, after) {
  return JSON.stringify(before.d7_preventive_actions) !== JSON.stringify(after.d7_preventive_actions) ||
         JSON.stringify(before.d7_standardization) !== JSON.stringify(after.d7_standardization);
}

function hasD8Changed(before, after) {
  return before.d8_team_recognition !== after.d8_team_recognition ||
         before.d8_lessons_learned !== after.d8_lessons_learned ||
         before.d8_closure_notes !== after.d8_closure_notes;
}

function hasDelayHistoryChanged(before, after) {
  const beforeLength = (before.d4_delay_history || []).length;
  const afterLength = (after.d4_delay_history || []).length;
  return afterLength > beforeLength;
}

// ============================================================================
// DATA EXTRACTION FUNCTIONS (for old/new values)
// ============================================================================

function extractD1Data(data) {
  return {
    escalation_path: data.escalation_path
  };
}

function extractD2Data(data) {
  return {
    problem_description: data.d2_problem_description,
    is_5why: data.d2_is_5why,
    analysis: data.d2_5why_analysis
  };
}

function extractPartsData(data) {
  const parts = data.selected_parts || [];
  const firstPart = parts[0] || {};

  return {
    client_id: firstPart.client_id,
    client_name: firstPart.client_name,
    project_id: firstPart.project_id,
    project_number: firstPart.project_number,
    project_name: firstPart.project_name,
    parts_count: parts.length,
    part_numbers: parts.map(p => p.part_number).join(', ')
  };
}

function extractD3Data(data) {
  return {
    interim_containment: data.d3_interim_containment
  };
}

function extractD3MfgData(data) {
  return {
    contamination_control: data.d3_mfg_contamination_control,
    supplier_notification: data.d3_mfg_supplier_notification,
    actions: data.d3_mfg_actions
  };
}

function extractD4Data(data) {
  return {
    root_cause: data.d4_root_cause,
    evaluations: (data.d4_4m_evaluation || []).length,
    whys_analysis: (data.d4_5whys_analysis || []).length,
    delay_history: (data.d4_delay_history || []).length
  };
}

function extractD5Data(data) {
  return {
    actions: (data.d5_corrective_actions || []).length
  };
}

function extractD6Data(data) {
  return {
    validation_results: data.d6_validation_results
  };
}

function extractD7Data(data) {
  return {
    preventive_actions: (data.d7_preventive_actions || []).length
  };
}

function extractD8Data(data) {
  return {
    team_recognition: data.d8_team_recognition,
    lessons_learned: data.d8_lessons_learned
  };
}

function getD4ChangeDetails(before, after) {
  if (hasDelayHistoryChanged(before, after)) {
    return { description: 'D4 actualizado - Razón de atraso agregada' };
  }
  return { description: 'Sección D4 (Causa Raíz) actualizada' };
}

function getDelayHistoryChanges(before, after) {
  const beforeHistory = before.d4_delay_history || [];
  const afterHistory = after.d4_delay_history || [];
  const newEntry = afterHistory[afterHistory.length - 1];

  return {
    newReason: newEntry?.reason || 'Sin descripción',
    commitmentDate: newEntry?.commitmentDate
  };
}

module.exports = {
  auditEightDChanges
};
