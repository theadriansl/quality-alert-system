/**
 * Form Completion Rules
 * Defines required fields for each 8D section and calculates completion percentage
 */

// Field definitions for each section
export const sectionFieldRules = {
  // D1-D2-D3 Team Assignment / Issue Section
  d1d2d3: {
    fields: [
      { key: 'defectOrigin', label: 'Origen del defecto', required: true },
      { key: 'materialNumber', label: 'Número de material', required: true },
      { key: 'productName', label: 'Nombre del producto', required: true },
      { key: 'problemDescription', label: 'Descripción del problema', required: true },
      { key: 'issueUsers', label: 'Usuarios asignados', required: true, isArray: true, minLength: 1 },
      { key: 'detectedDate', label: 'Fecha de detección', required: true },
      { key: 'location', label: 'Ubicación', required: false },
      { key: 'customer', label: 'Cliente', required: false }
    ],
    getName: (lang) => lang === 'en' ? 'Issue (D1-D2-D3)' : 'Issue (D1-D2-D3)'
  },

  // D3 MFG - Manufacturing containment
  d3mfg: {
    fields: [
      { key: 'd3MfgTemporaryControls', label: 'Controles temporales', required: true, isArray: true, minLength: 1 },
      { key: 'd3MfgInspectionPoints', label: 'Puntos de inspección', required: false, isArray: true },
      { key: 'd3MfgParametersAdjusted', label: 'Parámetros ajustados', required: false, isArray: true },
      { key: 'd3MfgResponsibleUserIds', label: 'Responsables', required: true, isArray: true, minLength: 1 },
      { key: 'd3MfgImplementationDate', label: 'Fecha de implementación', required: true }
    ],
    getName: (lang) => lang === 'en' ? 'D3 MFG Containment' : 'D3 MFG Contención'
  },

  // D4 Containment & Root Cause
  d4: {
    fields: [
      { key: 'containmentActions', label: 'Acciones de contención', required: true, isArray: true, minLength: 1 },
      { key: 'fourMAnalysis', label: 'Análisis 4M', required: false },
      { key: 'fiveWhysAnalysis', label: 'Análisis 5 Porqués', required: true },
      { key: 'rootCauseSummary', label: 'Resumen causa raíz', required: true },
      { key: 'd4ResponsibleUserIds', label: 'Responsables', required: true, isArray: true, minLength: 1 }
    ],
    getName: (lang) => lang === 'en' ? 'D4 Root Cause' : 'D4 Causa Raíz'
  },

  // D5 Corrective Actions
  d5: {
    fields: [
      { key: 'd5CorrectiveActions', label: 'Acciones correctivas', required: true, isArray: true, minLength: 1 },
      { key: 'd5ResponsibleUserIds', label: 'Responsables', required: true, isArray: true, minLength: 1 },
      { key: 'd5TargetDate', label: 'Fecha objetivo', required: true },
      { key: 'd5VerificationMethod', label: 'Método de verificación', required: false }
    ],
    getName: (lang) => lang === 'en' ? 'D5 Corrective Actions' : 'D5 Acciones Correctivas'
  },

  // D6 Definitive Countermeasures
  d6: {
    fields: [
      { key: 'd6DefinitiveActions', label: 'Acciones definitivas', required: true, isArray: true, minLength: 1 },
      { key: 'd6ImplementationPlan', label: 'Plan de implementación', required: true },
      { key: 'd6ResponsibleUserIds', label: 'Responsables', required: true, isArray: true, minLength: 1 },
      { key: 'd6TargetDate', label: 'Fecha objetivo', required: true }
    ],
    getName: (lang) => lang === 'en' ? 'D6 Definitive Actions' : 'D6 Acciones Definitivas'
  },

  // D7 Validation
  d7: {
    fields: [
      { key: 'd7ValidationResults', label: 'Resultados de validación', required: true },
      { key: 'd7EffectivenessEvidence', label: 'Evidencia de efectividad', required: true },
      { key: 'd7SPCData', label: 'Datos SPC', required: false },
      { key: 'd7TrainingCompleted', label: 'Capacitación completada', required: true },
      { key: 'd7AuditResults', label: 'Resultados de auditoría', required: false }
    ],
    getName: (lang) => lang === 'en' ? 'D7 Validation' : 'D7 Validación'
  },

  // D8 Follow Up
  d8: {
    fields: [
      { key: 'd8FollowUpActions', label: 'Acciones de seguimiento', required: false, isArray: true },
      { key: 'd8LessonsLearned', label: 'Lecciones aprendidas', required: true, isArray: true, minLength: 1 },
      { key: 'd8PreventiveMeasures', label: 'Medidas preventivas', required: true },
      { key: 'd8ClosureComments', label: 'Comentarios de cierre', required: true }
    ],
    getName: (lang) => lang === 'en' ? 'D8 Follow Up' : 'D8 Seguimiento'
  }
};

/**
 * Check if a field value is considered "completed"
 */
const isFieldComplete = (value, fieldConfig) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (fieldConfig.isArray) {
    if (!Array.isArray(value)) return false;
    const minLength = fieldConfig.minLength || 1;
    return value.length >= minLength && value.some(item => {
      if (typeof item === 'object') {
        // Check if at least one property has a value
        return Object.values(item).some(v => v !== null && v !== undefined && v !== '');
      }
      return item !== null && item !== undefined && item !== '';
    });
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'object') {
    // For objects, check if at least one property has a value
    return Object.values(value).some(v => v !== null && v !== undefined && v !== '');
  }

  return true;
};

/**
 * Calculate completion status for a section
 * @param {string} sectionId - The section identifier (e.g., 'd3mfg', 'd4', etc.)
 * @param {object} data - The form data object
 * @returns {object} - { completed: number, total: number, percentage: number, missingFields: array }
 */
export const calculateSectionCompletion = (sectionId, data) => {
  const section = sectionFieldRules[sectionId];
  if (!section) {
    return { completed: 0, total: 0, percentage: 0, missingFields: [] };
  }

  const requiredFields = section.fields.filter(f => f.required);
  const missingFields = [];
  let completedCount = 0;

  requiredFields.forEach(field => {
    // Handle nested keys (e.g., 'escalationPath.issue_users')
    const keys = field.key.split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }

    if (isFieldComplete(value, field)) {
      completedCount++;
    } else {
      missingFields.push({
        key: field.key,
        label: field.label
      });
    }
  });

  const total = requiredFields.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 100;

  return {
    completed: completedCount,
    total,
    percentage,
    missingFields
  };
};

/**
 * Calculate overall 8D workflow completion
 * @param {object} data - The full workflow data
 * @returns {object} - Overall completion info with per-section breakdown
 */
export const calculateOverallCompletion = (data) => {
  const sections = ['d1d2d3', 'd3mfg', 'd4', 'd5', 'd6', 'd7', 'd8'];
  let totalCompleted = 0;
  let totalFields = 0;
  const sectionBreakdown = {};

  sections.forEach(sectionId => {
    const completion = calculateSectionCompletion(sectionId, data);
    sectionBreakdown[sectionId] = completion;
    totalCompleted += completion.completed;
    totalFields += completion.total;
  });

  return {
    completed: totalCompleted,
    total: totalFields,
    percentage: totalFields > 0 ? Math.round((totalCompleted / totalFields) * 100) : 0,
    sections: sectionBreakdown
  };
};

/**
 * Get completion color based on percentage
 * @param {number} percentage
 * @param {object} theme - Theme colors
 * @returns {string} - Color code
 */
export const getCompletionColor = (percentage, theme) => {
  if (percentage >= 80) return theme.success;
  if (percentage >= 50) return theme.warning;
  return theme.error;
};

/**
 * Get completion status label
 * @param {number} percentage
 * @param {string} language
 * @returns {string}
 */
export const getCompletionStatusLabel = (percentage, language = 'es') => {
  const labels = {
    es: {
      complete: 'Completo',
      almostComplete: 'Casi completo',
      inProgress: 'En progreso',
      incomplete: 'Incompleto'
    },
    en: {
      complete: 'Complete',
      almostComplete: 'Almost complete',
      inProgress: 'In progress',
      incomplete: 'Incomplete'
    }
  };

  const tr = labels[language] || labels.es;

  if (percentage === 100) return tr.complete;
  if (percentage >= 80) return tr.almostComplete;
  if (percentage >= 50) return tr.inProgress;
  return tr.incomplete;
};

export default {
  sectionFieldRules,
  calculateSectionCompletion,
  calculateOverallCompletion,
  getCompletionColor,
  getCompletionStatusLabel
};
