import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditExecute = () => {
  const navigate = useNavigate();
  const { scheduleId } = useParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  const L = {
    en: {
      conformity: 'Conformity', ncMajor: 'Major NC', ncMinor: 'Minor NC', observation: 'Observation',
      opportunity: 'Opportunity', notApplicable: 'Not Applicable',
      loadError: 'Error loading data', startAuditFirst: 'You must start the audit first',
      startError: 'Error starting audit', saveFindingError: 'Error saving finding',
      confirmClose: 'Close the audit? This will finalize the execution.',
      closeError: 'Error closing audit', loading: 'Loading audit...',
      notFound: 'Audit not found', backToCalendar: 'Back to Calendar',
      recurrenceDetected: 'Recurrent Finding Detected', occurrences: 'previous occurrence(s) detected',
      riskLevel: 'Risk level', systemic: 'SYSTEMIC',
      start: 'Start', close: 'Close', criteria: 'Criteria',
      noChecklist: 'This audit has no checklist assigned', startAuditPrompt: 'Start audit',
      all: 'All', pending: 'Pending', completed: 'Completed',
      findingDesc: 'Finding Description *', descPlaceholder: 'Describe the finding in detail...',
      objectiveEvidence: 'Objective Evidence', evidencePlaceholder: 'Records, documents, observations...',
      evidenceFiles: 'Evidence Files', photoFile: 'Photo / File',
      auditorNotes: 'Auditor Notes', notesPlaceholder: 'Additional notes...',
      cancel: 'Cancel', saving: 'Saving...', update: 'Update', register: 'Register',
      descRequired: 'Description is required'
    },
    es: {
      conformity: 'Conformidad', ncMajor: 'NC Mayor', ncMinor: 'NC Menor', observation: 'Observación',
      opportunity: 'Oportunidad', notApplicable: 'No Aplica',
      loadError: 'Error al cargar datos', startAuditFirst: 'Primero debe iniciar la auditoría',
      startError: 'Error al iniciar auditoría', saveFindingError: 'Error al guardar hallazgo',
      confirmClose: '¿Cerrar la auditoría? Esto finalizará la ejecución.',
      closeError: 'Error al cerrar auditoría', loading: 'Cargando auditoría...',
      notFound: 'Auditoría no encontrada', backToCalendar: 'Volver al Calendario',
      recurrenceDetected: 'Hallazgo Recurrente Detectado', occurrences: 'ocurrencia(s) anterior(es) detectada(s)',
      riskLevel: 'Nivel de riesgo', systemic: 'SISTÉMICO',
      start: 'Iniciar', close: 'Cerrar', criteria: 'Criterios',
      noChecklist: 'Esta auditoría no tiene checklist asignado', startAuditPrompt: 'Inicie auditoría',
      all: 'Todos', pending: 'Pendientes', completed: 'Completados',
      findingDesc: 'Descripción del Hallazgo *', descPlaceholder: 'Describa detalladamente el hallazgo...',
      objectiveEvidence: 'Evidencia Objetiva', evidencePlaceholder: 'Registros, documentos, observaciones...',
      evidenceFiles: 'Archivos de Evidencia', photoFile: 'Foto / Archivo',
      auditorNotes: 'Notas del Auditor', notesPlaceholder: 'Notas adicionales...',
      cancel: 'Cancelar', saving: 'Guardando...', update: 'Actualizar', register: 'Registrar',
      descRequired: 'La descripción es requerida'
    }
  }[language] || {};

  // Quick-tap result options with keyboard shortcuts
  const RESULT_OPTIONS = [
    { value: 'conformity', label: 'C', fullLabel: L.conformity, colorKey: 'success', icon: '', key: '1' },
    { value: 'nc_major', label: 'M', fullLabel: L.ncMajor, colorKey: 'error', icon: '', key: '2', needsModal: true },
    { value: 'nc_minor', label: 'm', fullLabel: L.ncMinor, colorKey: 'warning', icon: '!', key: '3', needsModal: true },
    { value: 'observation', label: 'O', fullLabel: L.observation, colorKey: 'info', icon: '?', key: '4', needsModal: true },
    { value: 'opportunity', label: '+', fullLabel: L.opportunity, colorKey: 'primary', icon: '+', key: '5' },
    { value: 'na', label: 'N/A', fullLabel: L.notApplicable, colorKey: 'textMuted', icon: '-', key: '0' }
  ];
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);

  // Modal state for NC/Observation
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [recurrenceWarning, setRecurrenceWarning] = useState(null);

  // Filter state
  const [filter, setFilter] = useState('all'); // all, pending, completed

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const scheduleRes = await fetch(`${API_URL}/audit/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const scheduleData = await scheduleRes.json();

      if (!scheduleData.success) {
        throw new Error(scheduleData.message);
      }

      setSchedule(scheduleData.schedule);

      if (scheduleData.schedule.checklistId) {
        const checklistRes = await fetch(`${API_URL}/audit/checklists/${scheduleData.schedule.checklistId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const checklistData = await checklistRes.json();

        if (checklistData.success) {
          setChecklist(checklistData.checklist);
          setChecklistItems(checklistData.items || []);
        }
      }

      const auditsRes = await fetch(`${API_URL}/audit/audits?scheduleId=${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const auditsData = await auditsRes.json();

      if (auditsData.success && auditsData.audits.length > 0) {
        const existingAudit = auditsData.audits[0];
        setAudit(existingAudit);

        const auditDetailRes = await fetch(`${API_URL}/audit/audits/${existingAudit.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const auditDetailData = await auditDetailRes.json();

        if (auditDetailData.success && auditDetailData.findings) {
          const findingsMap = {};
          auditDetailData.findings.forEach(f => {
            findingsMap[f.checklistItemId] = {
              result: f.result,
              findingDescription: f.findingDescription,
              objectiveEvidence: f.objectiveEvidence,
              auditorNotes: f.auditorNotes,
              evidenceFiles: f.evidenceFiles || [],
              id: f.id
            };
          });
          setFindings(findingsMap);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      alert(L.loadError);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startAudit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          scheduleId: parseInt(scheduleId),
          auditDate: new Date().toISOString().split('T')[0]
        })
      });
      const result = await res.json();

      if (result.success) {
        setAudit(result.audit);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.startError);
    } finally {
      setSaving(false);
    }
  };

  // Quick-tap handler for immediate results (Conformity, N/A, Opportunity)
  const handleQuickResult = async (itemId, resultValue) => {
    const resultOption = RESULT_OPTIONS.find(r => r.value === resultValue);

    // If needs modal, open it instead
    if (resultOption?.needsModal) {
      const item = checklistItems.find(i => i.id === itemId);
      setModalData({
        itemId,
        item,
        result: resultValue,
        findingDescription: '',
        objectiveEvidence: '',
        auditorNotes: '',
        evidenceFiles: []
      });
      setModalOpen(true);
      return;
    }

    // Quick save for conformity, opportunity, n/a
    await saveFinding(itemId, { result: resultValue });
  };

  const saveFinding = async (itemId, findingData) => {
    if (!audit) {
      alert(L.startAuditFirst);
      return;
    }

    try {
      setSavingItemId(itemId);
      const token = localStorage.getItem('token');
      const item = checklistItems.find(i => i.id === itemId);

      const res = await fetch(`${API_URL}/audit/audits/${audit.id}/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          checklistItemId: itemId,
          result: findingData.result,
          clause: item?.clause,
          findingDescription: findingData.findingDescription || '',
          objectiveEvidence: findingData.objectiveEvidence || '',
          auditorNotes: findingData.auditorNotes || '',
          evidenceFiles: findingData.evidenceFiles || []
        })
      });
      const result = await res.json();

      if (result.success) {
        setFindings({
          ...findings,
          [itemId]: {
            ...findingData,
            id: result.finding.id,
            evidenceFiles: findingData.evidenceFiles || []
          }
        });

        // Show recurrence warning if applicable
        if (result.recurrence && result.recurrence.isRepeat) {
          setRecurrenceWarning({
            isRepeat: result.recurrence.isRepeat,
            repeatCount: result.recurrence.repeatCount,
            isSystemic: result.recurrence.isSystemic,
            riskLevel: result.recurrence.riskLevel,
            ncNumber: result.nonConformity?.ncNumber
          });
          setTimeout(() => setRecurrenceWarning(null), 5000);
        }

        // Close modal if open
        if (modalOpen) {
          setModalOpen(false);
          setModalData(null);
        }
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error saving finding:', err);
      alert(L.saveFindingError);
    } finally {
      setSavingItemId(null);
    }
  };

  const closeAudit = async () => {
    if (!window.confirm(L.confirmClose)) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/audits/${audit.id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        alert(result.message);
        navigate(`/audit/${audit.id}`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.closeError);
    } finally {
      setSaving(false);
    }
  };

  // Filter items
  const filteredItems = checklistItems.filter(item => {
    if (filter === 'pending') return !findings[item.id];
    if (filter === 'completed') return findings[item.id];
    return true;
  });

  // Calculate progress
  const totalItems = checklistItems.length;
  const completedItems = Object.keys(findings).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate summary
  const summaryData = Object.values(findings).reduce((acc, f) => {
    acc[f.result] = (acc[f.result] || 0) + 1;
    return acc;
  }, {});

  // Get color for result option
  const getResultColor = (colorKey) => {
    const colorMap = {
      success: t.success,
      error: t.error,
      warning: t.warning,
      info: t.info,
      primary: t.primary,
      textMuted: t.textMuted
    };
    return colorMap[colorKey] || t.textMuted;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      paddingBottom: '24px'
    },
    loadingCenter: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '16px',
      color: t.textMuted
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `4px solid ${t.border}`,
      borderTopColor: t.primary,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    tabletHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    backButton: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      fontSize: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: t.text
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '13px',
      color: t.textMuted,
      margin: '2px 0 0'
    },
    headerRight: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    actionButton: {
      padding: '12px 20px',
      borderRadius: '10px',
      border: 'none',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer'
    },
    progressSticky: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      position: 'sticky',
      top: '77px',
      zIndex: 99
    },
    progressContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
    },
    progressBar: {
      flex: 1,
      height: '8px',
      backgroundColor: t.bgPanel,
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: t.success,
      transition: 'width 0.3s ease'
    },
    progressText: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      minWidth: '50px'
    },
    quickStats: {
      display: 'flex',
      gap: '12px',
      marginLeft: '20px'
    },
    quickStat: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text
    },
    statDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%'
    },
    filterTabs: {
      display: 'flex',
      gap: '8px',
      padding: '12px 20px',
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`
    },
    filterTab: {
      padding: '8px 16px',
      borderRadius: '20px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      fontSize: '13px',
      cursor: 'pointer',
      color: t.textMuted
    },
    filterTabActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
      color: 'white'
    },
    noChecklist: {
      padding: '48px 20px',
      textAlign: 'center',
      color: t.textMuted
    },
    itemsList: {
      padding: '12px'
    },
    listItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '8px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
      gap: '12px'
    },
    listItemCompleted: {
      backgroundColor: t.bgPanel,
      opacity: 0.9
    },
    listItemSaving: {
      opacity: 0.6,
      pointerEvents: 'none'
    },
    itemInfo: {
      flex: 1,
      minWidth: 0
    },
    itemClause: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      fontWeight: '600',
      color: t.primary,
      marginBottom: '4px'
    },
    criticalBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      backgroundColor: t.error,
      color: 'white',
      borderRadius: '50%',
      fontSize: '10px',
      fontWeight: '600'
    },
    riskBadge: {
      display: 'inline-block',
      padding: '2px 6px',
      backgroundColor: `${t.warning}30`,
      color: t.warning,
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600'
    },
    itemQuestion: {
      fontSize: '14px',
      color: t.text,
      lineHeight: '1.4',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    },
    quickActions: {
      display: 'flex',
      gap: '6px',
      flexShrink: 0
    },
    quickButton: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      border: 'none',
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.1s, opacity 0.1s'
    },
    resultBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      borderRadius: '20px',
      color: 'white',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    evidenceCount: {
      marginLeft: '4px',
      fontSize: '11px',
      opacity: 0.9
    },
    pendingText: {
      fontSize: '12px',
      color: t.textDim,
      fontStyle: 'italic'
    },
    recurrenceToast: {
      position: 'fixed',
      top: '100px',
      right: '20px',
      backgroundColor: '#fffbeb',
      border: `1px solid ${t.warning}`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      gap: '12px',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease'
    },
    recurrenceIcon: {
      fontSize: '24px'
    },
    systemicBadge: {
      display: 'inline-block',
      marginLeft: '8px',
      padding: '2px 6px',
      backgroundColor: t.error,
      color: 'white',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      margin: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }
  };

  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 1000
    },
    container: {
      backgroundColor: t.bgCard,
      borderRadius: '20px 20px 0 0',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.3s ease'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px',
      borderBottom: `1px solid ${t.border}`
    },
    resultIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '20px'
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: t.text
    },
    clause: {
      margin: '4px 0 0',
      fontSize: '13px',
      color: t.textMuted
    },
    closeButton: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: t.bgPanel,
      cursor: 'pointer',
      fontSize: '16px',
      color: t.text
    },
    body: {
      padding: '20px',
      overflowY: 'auto',
      flex: 1
    },
    resultSelector: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    resultOption: {
      padding: '10px 16px',
      borderRadius: '10px',
      border: '2px solid',
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: '500'
    },
    field: {
      marginBottom: '16px'
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '8px',
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '10px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      resize: 'vertical',
      minHeight: '80px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    uploadButton: {
      padding: '6px 12px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      fontSize: '12px',
      color: t.text
    },
    fileList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '8px'
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px'
    },
    thumbnail: {
      width: '40px',
      height: '40px',
      objectFit: 'cover',
      borderRadius: '6px'
    },
    fileIcon: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgPanel,
      borderRadius: '6px',
      fontSize: '18px'
    },
    fileName: {
      fontSize: '12px',
      maxWidth: '100px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      color: t.text
    },
    removeFile: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: t.error,
      color: 'white',
      cursor: 'pointer',
      fontSize: '12px'
    },
    footer: {
      display: 'flex',
      gap: '12px',
      padding: '16px 20px',
      borderTop: `1px solid ${t.border}`
    },
    cancelButton: {
      flex: 1,
      padding: '14px',
      borderRadius: '10px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: t.text
    },
    saveButton: {
      flex: 2,
      padding: '14px',
      borderRadius: '10px',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCenter}>
          <div style={styles.spinner} />
          {L.loading}
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{L.notFound}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.primary, color: 'white' }}
            onClick={() => navigate('/audit-calendar')}
          >
            {L.backToCalendar}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Recurrence Warning Toast */}
      {recurrenceWarning && (
        <div style={styles.recurrenceToast}>
          <div style={styles.recurrenceIcon}></div>
          <div>
            <strong>{L.recurrenceDetected}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
              {recurrenceWarning.ncNumber}: {recurrenceWarning.repeatCount} {L.occurrences}.
              {L.riskLevel}: <strong style={{ color:
                recurrenceWarning.riskLevel === 'high' ? t.error :
                recurrenceWarning.riskLevel === 'medium' ? t.warning : t.success
              }}>{recurrenceWarning.riskLevel?.toUpperCase()}</strong>
              {recurrenceWarning.isSystemic && <span style={styles.systemicBadge}>{L.systemic}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Tablet-optimized Header */}
      <div style={styles.tabletHeader}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => navigate('/audit-calendar')}
          >

          </button>
          <div>
            <h1 style={styles.title}>{schedule.auditNumber}</h1>
            <p style={styles.subtitle}>{schedule.auditName}</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <ThemeSelector />
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {!audit && (
            <button
              style={{ ...styles.actionButton, backgroundColor: t.success }}
              onClick={startAudit}
              disabled={saving}
            >
               {L.start}
            </button>
          )}
          {audit && audit.status === 'in_progress' && (
            <button
              style={{ ...styles.actionButton, backgroundColor: t.info }}
              onClick={closeAudit}
              disabled={saving}
            >
               {L.close}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (Sticky) */}
      {audit && (
        <div style={styles.progressSticky}>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <span style={styles.progressText}>{completedItems}/{totalItems}</span>
          </div>
          <div style={styles.quickStats}>
            {RESULT_OPTIONS.filter(r => r.value !== 'na').map(option => (
              <div key={option.value} style={styles.quickStat}>
                <span style={{ ...styles.statDot, backgroundColor: getResultColor(option.colorKey) }} />
                <span>{summaryData[option.value] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {[
          { key: 'all', label: L.all, count: totalItems },
          { key: 'pending', label: L.pending, count: totalItems - completedItems },
          { key: 'completed', label: L.completed, count: completedItems }
        ].map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.filterTab,
              ...(filter === tab.key ? styles.filterTabActive : {})
            }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Legend - Evaluation Criteria Help */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: t.bgPanel,
        borderRadius: '8px',
        margin: '0 12px 12px 12px',
        alignItems: 'center',
        fontSize: '12px'
      }}>
        <span style={{ color: t.textMuted, fontWeight: '600', marginRight: '4px' }}>{L.criteria}:</span>
        {RESULT_OPTIONS.map(option => (
          <div key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              backgroundColor: getResultColor(option.colorKey),
              color: 'white',
              fontWeight: '600',
              fontSize: '11px'
            }}>
              {option.label}
            </span>
            <span style={{ color: t.text, fontSize: '11px' }}>{option.fullLabel}</span>
          </div>
        ))}
      </div>

      {/* Checklist Items - List View */}
      {!checklist ? (
        <div style={styles.noChecklist}>
          <p>{L.noChecklist}</p>
        </div>
      ) : (
        <div style={styles.itemsList}>
          {filteredItems.map((item, index) => {
            const finding = findings[item.id];
            const resultOption = finding ? RESULT_OPTIONS.find(r => r.value === finding.result) : null;
            const isSaving = savingItemId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  ...styles.listItem,
                  ...(finding ? styles.listItemCompleted : {}),
                  ...(isSaving ? styles.listItemSaving : {})
                }}
              >
                {/* Item Info */}
                <div style={styles.itemInfo}>
                  <div style={styles.itemClause}>
                    {item.clause || '#' + (index + 1)}
                    {item.isCritical && <span style={styles.criticalBadge}>!</span>}
                    {item.riskWeight > 1 && (
                      <span style={styles.riskBadge}>R{item.riskWeight}</span>
                    )}
                  </div>
                  <div style={styles.itemQuestion}>{item.question}</div>
                </div>

                {/* Quick Action Buttons */}
                <div style={styles.quickActions}>
                  {audit && !finding ? (
                    // Show quick buttons
                    RESULT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        style={{
                          ...styles.quickButton,
                          backgroundColor: getResultColor(option.colorKey),
                          opacity: isSaving ? 0.5 : 1
                        }}
                        onClick={() => handleQuickResult(item.id, option.value)}
                        disabled={isSaving}
                        title={option.fullLabel}
                      >
                        {option.label}
                      </button>
                    ))
                  ) : finding ? (
                    // Show result badge
                    <div
                      style={{
                        ...styles.resultBadge,
                        backgroundColor: resultOption ? getResultColor(resultOption.colorKey) : '#ccc'
                      }}
                      onClick={() => {
                        // Allow re-editing NCs
                        if (resultOption?.needsModal) {
                          setModalData({
                            itemId: item.id,
                            item,
                            result: finding.result,
                            findingDescription: finding.findingDescription || '',
                            objectiveEvidence: finding.objectiveEvidence || '',
                            auditorNotes: finding.auditorNotes || '',
                            evidenceFiles: finding.evidenceFiles || [],
                            isEdit: true
                          });
                          setModalOpen(true);
                        }
                      }}
                    >
                      {resultOption?.icon} {resultOption?.fullLabel}
                      {finding.evidenceFiles?.length > 0 && (
                        <span style={styles.evidenceCount}>{finding.evidenceFiles.length}</span>
                      )}
                    </div>
                  ) : (
                    <span style={styles.pendingText}>{L.startAuditPrompt}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NC/Observation Modal */}
      {modalOpen && modalData && (
        <NCModal
          data={modalData}
          onClose={() => {
            setModalOpen(false);
            setModalData(null);
          }}
          onSave={(data) => saveFinding(data.itemId, data)}
          saving={savingItemId === modalData.itemId}
          theme={t}
          modalStyles={modalStyles}
          getResultColor={getResultColor}
          L={L}
        />
      )}
    </div>
  );
};

// NC/Observation Modal Component
const NCModal = ({ data, onClose, onSave, saving, theme: t, modalStyles, getResultColor, L }) => {
  const [formData, setFormData] = useState({
    result: data.result,
    findingDescription: data.findingDescription || '',
    objectiveEvidence: data.objectiveEvidence || '',
    auditorNotes: data.auditorNotes || '',
    evidenceFiles: data.evidenceFiles || []
  });
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const RESULT_OPTIONS_MODAL = [
    { value: 'nc_major', fullLabel: L.ncMajor, colorKey: 'error', icon: '', needsModal: true },
    { value: 'nc_minor', fullLabel: L.ncMinor, colorKey: 'warning', icon: '!', needsModal: true },
    { value: 'observation', fullLabel: L.observation, colorKey: 'info', icon: '?', needsModal: true }
  ];

  const resultOption = RESULT_OPTIONS_MODAL.find(r => r.value === formData.result);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    // In a real implementation, upload to server and get URLs
    // For now, create local blob URLs
    const newFiles = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      fileType: file.type,
      fileUrl: URL.createObjectURL(file),
      isPhoto: file.type.startsWith('image/'),
      capturedAt: new Date().toISOString(),
      size: file.size
    }));

    setFormData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...newFiles]
    }));
    setUploading(false);
  };

  const removeFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter(f => f.id !== fileId)
    }));
  };

  const handleSubmit = () => {
    if (!formData.findingDescription.trim()) {
      alert(L.descRequired);
      return;
    }
    onSave({
      itemId: data.itemId,
      ...formData
    });
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.container} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={modalStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              ...modalStyles.resultIcon,
              backgroundColor: resultOption ? getResultColor(resultOption.colorKey) : t.textMuted
            }}>
              {resultOption?.icon}
            </div>
            <div>
              <h2 style={modalStyles.title}>{resultOption?.fullLabel}</h2>
              <p style={modalStyles.clause}>{data.item?.clause} - {data.item?.question?.substring(0, 60)}...</p>
            </div>
          </div>
          <button style={modalStyles.closeButton} onClick={onClose}></button>
        </div>

        {/* Modal Body */}
        <div style={modalStyles.body}>
          {/* Result Type Selector */}
          <div style={modalStyles.resultSelector}>
            {RESULT_OPTIONS_MODAL.map(option => (
              <button
                key={option.value}
                style={{
                  ...modalStyles.resultOption,
                  borderColor: formData.result === option.value ? getResultColor(option.colorKey) : t.border,
                  backgroundColor: formData.result === option.value ? `${getResultColor(option.colorKey)}15` : t.bgCard
                }}
                onClick={() => setFormData({ ...formData, result: option.value })}
              >
                <span style={{ color: getResultColor(option.colorKey) }}>{option.icon}</span>
                {option.fullLabel}
              </button>
            ))}
          </div>

          {/* Description */}
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>{L.findingDesc}</label>
            <textarea
              style={modalStyles.textarea}
              value={formData.findingDescription}
              onChange={e => setFormData({ ...formData, findingDescription: e.target.value })}
              placeholder={L.descPlaceholder}
              rows={4}
            />
          </div>

          {/* Evidence */}
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>{L.objectiveEvidence}</label>
            <textarea
              style={{ ...modalStyles.textarea, minHeight: '60px' }}
              value={formData.objectiveEvidence}
              onChange={e => setFormData({ ...formData, objectiveEvidence: e.target.value })}
              placeholder={L.evidencePlaceholder}
              rows={2}
            />
          </div>

          {/* File Upload */}
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>
              {L.evidenceFiles}
              <button
                style={modalStyles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                 {L.photoFile}
              </button>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              capture="environment"
            />

            {formData.evidenceFiles.length > 0 && (
              <div style={modalStyles.fileList}>
                {formData.evidenceFiles.map(file => (
                  <div key={file.id} style={modalStyles.fileItem}>
                    {file.isPhoto ? (
                      <img
                        src={file.fileUrl}
                        alt={file.fileName}
                        style={modalStyles.thumbnail}
                      />
                    ) : (
                      <div style={modalStyles.fileIcon}></div>
                    )}
                    <span style={modalStyles.fileName}>{file.fileName}</span>
                    <button
                      style={modalStyles.removeFile}
                      onClick={() => removeFile(file.id)}
                    >

                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>{L.auditorNotes}</label>
            <textarea
              style={{ ...modalStyles.textarea, minHeight: '50px' }}
              value={formData.auditorNotes}
              onChange={e => setFormData({ ...formData, auditorNotes: e.target.value })}
              placeholder={L.notesPlaceholder}
              rows={2}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelButton} onClick={onClose}>
            {L.cancel}
          </button>
          <button
            style={{
              ...modalStyles.saveButton,
              backgroundColor: resultOption ? getResultColor(resultOption.colorKey) : t.primary,
              opacity: saving ? 0.7 : 1
            }}
            onClick={handleSubmit}
            disabled={saving || !formData.findingDescription.trim()}
          >
            {saving ? L.saving : data.isEdit ? L.update : L.register}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CSS animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);

export default AuditExecute;
