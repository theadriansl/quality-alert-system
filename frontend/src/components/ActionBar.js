/**
 * ActionBar.js
 * Barra de acciones global para Hospital de Defectos
 *
 * Principio UX:
 * - Los Tabs representan el trabajo (qué hay pendiente)
 * - La ActionBar representa las acciones (qué puedo hacer)
 * - Las acciones dependen del ESTADO, no del TAB
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ============================================================================
// CONFIGURACIÓN DE ACCIONES
// ============================================================================

// Acciones de flujo de trabajo (workflow)
const WORKFLOW_ACTIONS = {
  START_REPAIR: {
    id: 'START_REPAIR',
    labelEs: 'Iniciar Reparación',
    labelEn: 'Start Repair',
    icon: '🔧',
    validStatuses: ['OPEN'],
    requiresLocation: false
  },
  COMPLETE_REPAIR: {
    id: 'COMPLETE_REPAIR',
    labelEs: 'Completar Reparación',
    labelEn: 'Complete Repair',
    icon: '✓',
    validStatuses: ['IN_REPAIR'],
    requiresModal: true
  },
  SEND_TO_QA: {
    id: 'SEND_TO_QA',
    labelEs: 'Enviar a QA',
    labelEn: 'Send to QA',
    icon: '📋',
    validStatuses: ['REPAIRED'],
    requiresModal: true
  },
  RELEASE: {
    id: 'RELEASE',
    labelEs: 'Liberar',
    labelEn: 'Release',
    icon: '✅',
    validStatuses: ['IN_VALIDATION'],
    permissionRequired: 'release'
  },
  REJECT: {
    id: 'REJECT',
    labelEs: 'Rechazar',
    labelEn: 'Reject',
    icon: '↩️',
    validStatuses: ['IN_VALIDATION'],
    requiresModal: true,
    permissionRequired: 'release'
  },
  RETURN_TO_REPAIR: {
    id: 'RETURN_TO_REPAIR',
    labelEs: 'Regresar a Reparación',
    labelEn: 'Return to Repair',
    icon: '🔄',
    validStatuses: ['QUARANTINE', 'SCRAPPED']
  },
  CONFIRM_SCRAP: {
    id: 'CONFIRM_SCRAP',
    labelEs: 'Confirmar Scrap',
    labelEn: 'Confirm Scrap',
    icon: '☑️',
    validStatuses: ['SCRAPPED'],
    permissionRequired: 'scrap'
  },
  RETURN_TO_QUARANTINE: {
    id: 'RETURN_TO_QUARANTINE',
    labelEs: 'Regresar a Cuarentena',
    labelEn: 'Return to Quarantine',
    icon: '↩️',
    validStatuses: ['SCRAPPED']
  },
  CREATE_MRB_PACKAGE: {
    id: 'CREATE_MRB_PACKAGE',
    labelEs: 'Crear Paquete MRB',
    labelEn: 'Create MRB Package',
    icon: '📦',
    validStatuses: ['QUARANTINE', 'SCRAPPED'],
    requiresModal: true
  }
};

// Acciones de cambio de status (disposición)
const STATUS_ACTIONS = {
  SEND_TO_MRB: {
    id: 'SEND_TO_MRB',
    labelEs: 'Enviar a Cuarentena (MRB)',
    labelEn: 'Send to Quarantine (MRB)',
    icon: '⚠️',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED'],
    requiresModal: true
  },
  SEND_TO_SCRAP: {
    id: 'SEND_TO_SCRAP',
    labelEs: 'Enviar a Scrap',
    labelEn: 'Send to Scrap',
    icon: '🗑️',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'QUARANTINE'],
    requiresModal: true,
    permissionRequired: 'scrap'
  },
  RELEASE_WITH_DEVIATION: {
    id: 'RELEASE_WITH_DEVIATION',
    labelEs: 'Liberar con Desviación',
    labelEn: 'Release with Deviation',
    icon: '📝',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'QUARANTINE', 'IN_VALIDATION'],
    requiresModal: true
  }
};

const MANAGEMENT_ACTIONS = {
  ASSIGN_LOCATION: {
    id: 'ASSIGN_LOCATION',
    labelEs: 'Asignar Ubicación',
    labelEn: 'Assign Location',
    icon: '📍',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'QUARANTINE'],
    requiresModal: true
  },
  CHANGE_RESPONSIBLE: {
    id: 'CHANGE_RESPONSIBLE',
    labelEs: 'Cambiar Responsable',
    labelEn: 'Change Responsible',
    icon: '👤',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'QUARANTINE'],
    requiresModal: true
  },
  ASSIGN_DEVIATION: {
    id: 'ASSIGN_DEVIATION',
    labelEs: 'Asignar Desviación',
    labelEn: 'Assign Deviation',
    icon: '📄',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'QUARANTINE', 'IN_VALIDATION'],
    requiresModal: true
  }
};

const TOOLS_ACTIONS = {
  VIEW_TRACEABILITY: {
    id: 'VIEW_TRACEABILITY',
    labelEs: 'Ver Trazabilidad',
    labelEn: 'View Traceability',
    icon: '🔍',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE', 'SCRAPPED', 'RELEASED', 'CLOSED'],
    singleOnly: true
  },
  EXPORT_EXCEL: {
    id: 'EXPORT_EXCEL',
    labelEs: 'Exportar Excel',
    labelEn: 'Export Excel',
    icon: '📥',
    validStatuses: ['OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE', 'SCRAPPED', 'RELEASED', 'CLOSED']
  }
};

// ============================================================================
// COMPONENTE DROPDOWN
// ============================================================================

const ActionDropdown = ({ label, icon, actions, onAction, disabled, theme: t, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (actions.length === 0) {
    return (
      <div style={{
        padding: '8px 16px',
        fontSize: '13px',
        color: t.textMuted,
        opacity: 0.5,
        cursor: 'not-allowed'
      }}>
        {icon} {label} (0)
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          backgroundColor: isOpen ? t.accent : 'transparent',
          color: isOpen ? '#fff' : t.text,
          border: `1px solid ${isOpen ? t.accent : t.border}`,
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
      >
        {icon} {label} ({actions.length})
        <span style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          minWidth: '220px',
          backgroundColor: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {actions.map((action, idx) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: idx < actions.length - 1 ? `1px solid ${t.border}` : 'none',
                color: t.text,
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = t.bgPanel}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '16px' }}>{action.icon}</span>
              <span>{language === 'es' ? action.labelEs : action.labelEn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: ActionBar
// ============================================================================

const ActionBar = ({
  selectedDefects = [],      // Array de defectos seleccionados
  userPermissions = {},      // { repair: true, release: true, admin: true }
  onAction,                  // Callback: (actionId, defects) => void
  onClearSelection,          // Callback para limpiar selección
  loading = false
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  // Obtener estados únicos de los defectos seleccionados
  const selectedStatuses = useMemo(() => {
    const statuses = new Set();
    selectedDefects.forEach(d => {
      const status = d.repairStatus || d.repair_status || 'OPEN';
      statuses.add(status);
    });
    return statuses;
  }, [selectedDefects]);

  // Filtrar acciones disponibles según estados y permisos
  const getAvailableActions = (actionsConfig) => {
    return Object.values(actionsConfig).filter(action => {
      // Verificar si al menos un estado seleccionado es válido para esta acción
      const hasValidStatus = action.validStatuses.some(status => selectedStatuses.has(status));
      if (!hasValidStatus) return false;

      // Verificar permisos
      if (action.permissionRequired && !userPermissions[action.permissionRequired]) {
        return false;
      }

      // Verificar si es solo para selección individual
      if (action.singleOnly && selectedDefects.length > 1) {
        return false;
      }

      return true;
    });
  };

  const workflowActions = useMemo(() => getAvailableActions(WORKFLOW_ACTIONS), [selectedStatuses, userPermissions, selectedDefects.length]);
  const statusActions = useMemo(() => getAvailableActions(STATUS_ACTIONS), [selectedStatuses, userPermissions, selectedDefects.length]);
  const managementActions = useMemo(() => getAvailableActions(MANAGEMENT_ACTIONS), [selectedStatuses, userPermissions, selectedDefects.length]);
  const toolsActions = useMemo(() => getAvailableActions(TOOLS_ACTIONS), [selectedStatuses, userPermissions, selectedDefects.length]);

  // No mostrar si no hay selección
  if (selectedDefects.length === 0) {
    return null;
  }

  const handleAction = (action) => {
    if (onAction) {
      onAction(action.id, selectedDefects, action);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: t.accent + '15',
      borderRadius: '8px',
      marginBottom: '12px',
      border: `2px solid ${t.accent}`,
      flexWrap: 'wrap'
    }}>
      {/* Contador de selección */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingRight: '16px',
        borderRight: `1px solid ${t.border}`
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          backgroundColor: t.accent,
          color: '#fff',
          borderRadius: '50%',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {selectedDefects.length}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>
          {language === 'es'
            ? `Defecto${selectedDefects.length !== 1 ? 's' : ''} seleccionado${selectedDefects.length !== 1 ? 's' : ''}`
            : `Defect${selectedDefects.length !== 1 ? 's' : ''} selected`}
        </span>
        <button
          onClick={onClearSelection}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: t.textMuted,
            fontSize: '12px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {language === 'es' ? 'Limpiar' : 'Clear'}
        </button>
      </div>

      {/* Dropdowns de acciones */}
      <ActionDropdown
        label={language === 'es' ? 'Workflow' : 'Workflow'}
        icon="⚡"
        actions={workflowActions}
        onAction={handleAction}
        disabled={loading}
        theme={t}
        language={language}
      />

      <ActionDropdown
        label={language === 'es' ? 'Disposición' : 'Disposition'}
        icon="🔀"
        actions={statusActions}
        onAction={handleAction}
        disabled={loading}
        theme={t}
        language={language}
      />

      <ActionDropdown
        label={language === 'es' ? 'Gestión' : 'Management'}
        icon="⚙️"
        actions={managementActions}
        onAction={handleAction}
        disabled={loading}
        theme={t}
        language={language}
      />

      <ActionDropdown
        label={language === 'es' ? 'Herramientas' : 'Tools'}
        icon="🔧"
        actions={toolsActions}
        onAction={handleAction}
        disabled={loading}
        theme={t}
        language={language}
      />

      {/* Indicador de estados mezclados */}
      {selectedStatuses.size > 1 && (
        <div style={{
          marginLeft: 'auto',
          padding: '6px 12px',
          backgroundColor: t.warning + '20',
          borderRadius: '4px',
          fontSize: '11px',
          color: t.warning
        }}>
          ⚠️ {language === 'es' ? 'Estados mixtos' : 'Mixed statuses'}: {Array.from(selectedStatuses).join(', ')}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: t.textMuted
        }}>
          ⏳ {language === 'es' ? 'Procesando...' : 'Processing...'}
        </div>
      )}
    </div>
  );
};

export default ActionBar;

// Export de configuraciones para uso externo
export { WORKFLOW_ACTIONS, MANAGEMENT_ACTIONS, TOOLS_ACTIONS };
