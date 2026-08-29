import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { isUserAdmin } from '../../utils/permissions';

const D8FollowUpEvidence = ({
  data,
  onDataUpdate,
  language: propLanguage = 'es',
  isBlocked = false,
  onSendToApproval,
  onApprove,
  onReject,
  isSending,
  currentUser,
  isReadOnly = false
}) => {
  const { theme: themeColors } = useTheme();
  const { language } = useLanguage();
  const { showSuccess, showError, showWarning } = useToast();

  // Check if current user is admin - admins can ALWAYS edit
  const isAdmin = isUserAdmin(currentUser);
  const actuallyBlocked = isAdmin ? false : isBlocked;

  const [formData, setFormData] = useState({
    d8FollowupActions: [],
    d8EvidenceDocumentation: [],
    d8ClosureNotes: '',
    d8LessonsLearned: '',
    d8ClosedBy: null,
    d8ClosedAt: '',
    d8Completed: false
  });

  // Removed newFollowupItem state - now we add directly to the list

  const [users, setUsers] = useState([]);
  const [d8ApprovalHistory, setD8ApprovalHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Revert to draft modal state (Admin only)
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertComments, setRevertComments] = useState('');
  const [isReverting, setIsReverting] = useState(false);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [newLesson, setNewLesson] = useState('');
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Load users (Quality Managers)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/users/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        setUsers(result.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load lessons learned for this report
  useEffect(() => {
    const fetchLessonsLearned = async () => {
      if (!data || !data.reportId) return;

      setIsLoadingLessons(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/lessons-learned/report/${data.reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setLessonsLearned(result.lessons || []);
        }
      } catch (error) {
        console.error('Error fetching lessons learned:', error);
      } finally {
        setIsLoadingLessons(false);
      }
    };
    fetchLessonsLearned();
  }, [data]);

  // Load D8 approval history from audit log
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      if (!data?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/8d/reports/${data.id}/audit-log?actionCategory=approval&sectionName=d8`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const result = await response.json();
        if (result.success) {
          setD8ApprovalHistory(result.auditLog || []);
        }
      } catch (error) {
        console.error('Error loading D8 approval history:', error);
      }
    };
    fetchApprovalHistory();
  }, [data?.id]);

  // Load data from props
  useEffect(() => {
    if (data) {
      // Ensure existing items have isEditing: false
      const followupActions = (data.d8FollowupActions || []).map(item => ({
        ...item,
        isEditing: item.isEditing ?? false
      }));

      setFormData({
        d8FollowupActions: followupActions,
        d8EvidenceDocumentation: data.d8EvidenceDocumentation || [],
        d8ClosureNotes: data.d8ClosureNotes || '',
        d8LessonsLearned: data.d8LessonsLearned || '',
        d8ClosedBy: data.d8ClosedBy || null,
        d8ClosedAt: data.d8ClosedAt || '',
        d8Completed: data.d8Completed || false
      });
    }
  }, [data]);

  const translations = {
    es: {
      title: 'D8 - Evidencia de Acciones de Seguimiento',
      subtitle: 'Cierre formal del 8D con evidencia y lecciones aprendidas',
      followupActions: 'Acciones de Seguimiento',
      followupPlaceholder: 'Acción de seguimiento (actualización de documentos, capacitación, etc.)...',
      addFollowup: 'Agregar Acción de Seguimiento',
      removeFollowup: 'Eliminar',
      item: 'Acción',
      responsible: 'Responsable',
      dueDate: 'Fecha Límite',
      status: 'Estado',
      noFollowups: 'No hay acciones de seguimiento registradas',
      evidenceDocumentation: 'Documentación de Evidencia',
      evidenceType: 'Tipo de Evidencia',
      evidenceDescription: 'Descripción',
      addEvidence: 'Agregar Evidencia',
      evidenceTypes: {
        process_update: 'Actualización de Proceso',
        work_instruction: 'Instrucción de Trabajo',
        training: 'Capacitación',
        control_plan: 'Plan de Control',
        fmea_update: 'Actualización FMEA',
        drawing_change: 'Cambio de Plano',
        other: 'Otro'
      },
      closureNotes: 'Notas de Cierre',
      closureNotesPlaceholder: 'Resumen final del 8D y comentarios de cierre...',
      lessonsLearned: 'Lecciones Aprendidas',
      lessonsLearnedPlaceholder: 'Documenta las lecciones clave aprendidas durante este proceso 8D...',
      closedBy: 'Cerrado por (Quality Manager)',
      closureDate: 'Fecha de Cierre Oficial',
      markComplete: 'Cerrar 8D Formalmente',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      blocked: 'Esta sección está bloqueada hasta que D7 esté completada',
      required: 'Campo requerido',
      statuses: {
        pending: 'Pendiente',
        in_progress: 'En Progreso',
        completed: 'Completada'
      }
    },
    en: {
      title: 'D8 - Follow-up Actions Evidence',
      subtitle: 'Formal 8D closure with evidence and lessons learned',
      followupActions: 'Follow-up Actions',
      followupPlaceholder: 'Follow-up action (document updates, training, etc.)...',
      addFollowup: 'Add Follow-up Action',
      removeFollowup: 'Remove',
      item: 'Action',
      responsible: 'Responsible',
      dueDate: 'Due Date',
      status: 'Status',
      noFollowups: 'No follow-up actions registered',
      evidenceDocumentation: 'Evidence Documentation',
      evidenceType: 'Evidence Type',
      evidenceDescription: 'Description',
      addEvidence: 'Add Evidence',
      evidenceTypes: {
        process_update: 'Process Update',
        work_instruction: 'Work Instruction',
        training: 'Training',
        control_plan: 'Control Plan',
        fmea_update: 'FMEA Update',
        drawing_change: 'Drawing Change',
        other: 'Other'
      },
      closureNotes: 'Closure Notes',
      closureNotesPlaceholder: 'Final 8D summary and closing comments...',
      lessonsLearned: 'Lessons Learned',
      lessonsLearnedPlaceholder: 'Document key lessons learned during this 8D process...',
      closedBy: 'Closed by (Quality Manager)',
      closureDate: 'Official Closure Date',
      markComplete: 'Close 8D Formally',
      save: 'Save Changes',
      saving: 'Saving...',
      blocked: 'This section is blocked until D7 is completed',
      required: 'Required field',
      statuses: {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed'
      }
    }
  };

  const t = translations[language] || translations.es;

  const handleAddFollowup = () => {
    // Add empty item directly to the list in editing mode
    setFormData(prev => ({
      ...prev,
      d8FollowupActions: [
        ...prev.d8FollowupActions,
        {
          id: Date.now(),
          item: '',
          responsible: null,
          dueDate: '',
          status: 'pending',
          isEditing: true
        }
      ]
    }));
  };

  const handleConfirmFollowup = async (id) => {
    const item = formData.d8FollowupActions.find(i => i.id === id);
    if (!item?.item?.trim()) {
      showError('Debes describir la acción de seguimiento');
      return;
    }

    // Mark as confirmed and save to backend
    const updatedActions = formData.d8FollowupActions.map(action =>
      action.id === id ? { ...action, isEditing: false } : action
    );

    const updatedFormData = {
      ...formData,
      d8FollowupActions: updatedActions,
      d8ClosedBy: currentUser?.id || formData.d8ClosedBy
    };

    setFormData(updatedFormData);

    // Save to backend
    try {
      await onDataUpdate(updatedFormData);
      showSuccess('Acción de seguimiento guardada');
    } catch (error) {
      console.error('Error saving followup action:', error);
      showError('Error al guardar la acción');
    }
  };

  const handleEditFollowup = (id) => {
    handleUpdateFollowup(id, 'isEditing', true);
  };

  const handleRemoveFollowup = (id) => {
    setFormData(prev => ({
      ...prev,
      d8FollowupActions: prev.d8FollowupActions.filter(item => item.id !== id)
    }));
  };

  const handleUpdateFollowup = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      d8FollowupActions: prev.d8FollowupActions.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSave = async () => {
    if (actuallyBlocked) {
      showError(' Esta sección está bloqueada hasta que D7 esté completada');
      return;
    }

    // Only require lessons learned when marking as completed
    if (formData.d8Completed && lessonsLearned.length === 0) {
      showError(' Debes agregar al menos una lección aprendida para cerrar D8');
      return;
    }

    setIsSaving(true);
    try {
      // Filter out empty actions and mark all as confirmed
      const validActions = formData.d8FollowupActions
        .filter(action => action.item && action.item.trim())
        .map(action => ({ ...action, isEditing: false }));

      // Update local state to reflect confirmed actions
      setFormData(prev => ({
        ...prev,
        d8FollowupActions: validActions
      }));

      // Auto-set closure info if completing
      const dataToSave = {
        ...formData,
        d8FollowupActions: validActions,
        d8ClosedBy: currentUser?.id || formData.d8ClosedBy
      };
      if (formData.d8Completed && !formData.d8ClosedAt) {
        dataToSave.d8ClosedAt = new Date().toISOString();
      }

      await onDataUpdate(dataToSave);
      showSuccess(' D8 - Evidencia y Cierre guardado exitosamente');
    } catch (error) {
      console.error('Error saving D8:', error);
      showError(' Error al guardar D8');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle revert to draft (Admin only) - Creates new revision
  const handleRevertToDraft = async () => {
    if (!revertComments || revertComments.trim() === '') {
      showWarning(language === 'es' ? 'El comentario es obligatorio' : 'Comments are required');
      return;
    }

    // Confirm action
    const confirmMsg = language === 'es'
      ? `⚠️ CONFIRMACIÓN FINAL - CREAR NUEVA REVISIÓN\n\n` +
        `Esta acción:\n` +
        `• Archivará PERMANENTEMENTE el reporte ${data?.reportId || '8D'} completo\n` +
        `• Creará una nueva revisión (${data?.reportId || '8D'}-R1)\n` +
        `• Reseteará TODAS las aprobaciones (D3 a D8)\n` +
        `• El documento archivado quedará bloqueado para auditorías ISO\n\n` +
        `¿Está seguro de que desea continuar?\n\n` +
        `Esta acción NO se puede deshacer.`
      : `⚠️ FINAL CONFIRMATION - CREATE NEW REVISION\n\n` +
        `This action will:\n` +
        `• PERMANENTLY archive the complete ${data?.reportId || '8D'} report\n` +
        `• Create a new revision (${data?.reportId || '8D'}-R1)\n` +
        `• Reset ALL approvals (D3 through D8)\n` +
        `• Lock the archived document for ISO audits\n\n` +
        `Are you sure you want to continue?\n\n` +
        `This action CANNOT be undone.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsReverting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/revert-to-draft`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: revertComments })
      });

      const result = await response.json();

      if (result.success) {
        const newRevisionId = result.data.newRevision.reportId;
        const newDbId = result.data.newRevision.id;
        showSuccess(language === 'es'
          ? `Documento archivado. Nueva revisión ${newRevisionId} creada.`
          : `Document archived. New revision ${newRevisionId} created.`);
        setShowRevertModal(false);
        setRevertComments('');
        window.location.href = `/8d-workflow?reportId=${newDbId}`;
      } else {
        showError('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showError(language === 'es' ? 'Error al revertir a borrador' : 'Error reverting to draft');
    } finally {
      setIsReverting(false);
    }
  };

  const handleSaveLesson = async () => {
    if (actuallyBlocked) {
      showError(' Esta sección está bloqueada hasta que D7 esté completada');
      return;
    }

    if (!newLesson.trim()) {
      showError(' Debes escribir una lección aprendida');
      return;
    }

    if (!data || !data.reportId) {
      showError(' No se pudo identificar el reporte');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/lessons-learned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId: data.reportId,
          lessonText: newLesson,
          category: null
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(' Lección aprendida guardada exitosamente');
        setNewLesson('');
        // Refresh lessons list
        setLessonsLearned(prev => [result.lesson, ...prev]);
      } else {
        showError(` ${result.message || 'Error al guardar lección aprendida'}`);
      }
    } catch (error) {
      console.error('Error saving lesson learned:', error);
      showError(' Error al guardar lección aprendida');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (actuallyBlocked) {
      showError(' Esta sección está bloqueada hasta que D7 esté completada');
      return;
    }

    if (!window.confirm('¿Estás seguro de eliminar esta lección aprendida?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/lessons-learned/${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(' Lección aprendida eliminada');
        setLessonsLearned(prev => prev.filter(lesson => lesson.id !== lessonId));
      } else {
        showError(` ${result.message || 'Error al eliminar lección aprendida'}`);
      }
    } catch (error) {
      console.error('Error deleting lesson learned:', error);
      showError(' Error al eliminar lección aprendida');
    }
  };

  const styles = {
    container: {
      padding: '16px 24px',
      width: '100%',
      maxWidth: 'none'
    },
    header: {
      marginBottom: '24px',
      borderBottom: `2px solid ${themeColors.success}`,
      paddingBottom: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: themeColors.textMuted
    },
    section: {
      backgroundColor: themeColors.bgPanel,
      padding: '24px',
      borderRadius: '8px',
      marginBottom: '24px',
      border: `1px solid ${themeColors.border}`
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: '16px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: themeColors.text,
      marginBottom: '8px'
    },
    required: {
      color: themeColors.error,
      marginLeft: '4px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      boxSizing: 'border-box',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px',
      backgroundColor: themeColors.bgCard,
      color: themeColors.text,
      boxSizing: 'border-box'
    },
    followupCard: {
      backgroundColor: themeColors.bgCard,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${themeColors.border}`,
      marginBottom: '12px'
    },
    followupHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    removeButton: {
      padding: '6px 12px',
      backgroundColor: themeColors.error,
      color: themeColors.bgCard,
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    addFollowupCard: {
      backgroundColor: themeColors.bgPanel,
      padding: '16px',
      borderRadius: '8px',
      border: `1px dashed ${themeColors.success}`,
      marginBottom: '16px'
    },
    addButton: {
      padding: '10px 20px',
      backgroundColor: themeColors.success,
      color: themeColors.bgCard,
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      marginTop: '12px'
    },
    checkbox: {
      marginRight: '8px',
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: themeColors.text,
      cursor: 'pointer',
      padding: '16px',
      backgroundColor: themeColors.bgPanel,
      borderRadius: '8px',
      border: `2px solid ${themeColors.error}`,
      fontWeight: '500'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: themeColors.success,
      color: themeColors.bgCard,
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    blockedOverlay: {
      position: 'relative',
      opacity: 0.6,
      pointerEvents: 'none'
    },
    blockedMessage: {
      backgroundColor: themeColors.bgPanel,
      border: `1px solid ${themeColors.error}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: themeColors.error,
      fontSize: '14px',
      fontWeight: '500'
    },
    emptyState: {
      textAlign: 'center',
      padding: '32px',
      color: themeColors.textMuted,
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: themeColors.warningBg,
          border: `1px solid ${themeColors.warningBorder}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: themeColors.warningFg, fontWeight: '500' }}>
            Este 8D está cerrado y es de solo lectura
          </span>
        </div>
      )}

      <div style={{ pointerEvents: isReadOnly ? 'none' : 'auto', opacity: isReadOnly ? 0.7 : 1 }}>
      <div style={styles.header}>
        <div style={styles.title}> {t.title}</div>
        <div style={styles.subtitle}>{t.subtitle}</div>
      </div>

      {actuallyBlocked && (
        <div style={styles.blockedMessage}>
           {t.blocked}
        </div>
      )}

      <div style={actuallyBlocked ? styles.blockedOverlay : {}}>
        {/* Follow-up Actions */}
        <div id="d8-evidencia" style={{ ...styles.section, scrollMarginTop: '20px' }}>
          <div style={styles.sectionTitle}>{t.followupActions}</div>

          {formData.d8FollowupActions.length === 0 && (
            <div style={styles.emptyState}>{t.noFollowups}</div>
          )}

          {formData.d8FollowupActions.map((item, index) => (
            <div key={item.id} style={{
              ...styles.followupCard,
              border: item.isEditing ? `2px dashed ${themeColors.success}` : `1px solid ${themeColors.border}`,
              backgroundColor: item.isEditing ? themeColors.successBg : themeColors.bgCard
            }}>
              <div style={styles.followupHeader}>
                <span style={{ fontWeight: '600', color: themeColors.success }}>
                  Acción #{index + 1}
                  {!item.isEditing && <span style={{ marginLeft: '8px', color: themeColors.success }}>✓</span>}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {item.isEditing ? (
                    <button
                      onClick={() => handleConfirmFollowup(item.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: themeColors.success,
                        color: themeColors.bgCard,
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      disabled={actuallyBlocked}
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditFollowup(item.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: themeColors.bgPanel,
                        color: themeColors.text,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      disabled={actuallyBlocked}
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveFollowup(item.id)}
                    style={styles.removeButton}
                    disabled={actuallyBlocked}
                  >
                    {t.removeFollowup}
                  </button>
                </div>
              </div>

              {item.isEditing ? (
                <>
                  <div style={styles.formGroup}>
                    <textarea
                      style={{...styles.textarea, minHeight: '60px'}}
                      value={item.item}
                      onChange={(e) => handleUpdateFollowup(item.id, 'item', e.target.value)}
                      placeholder={t.followupPlaceholder}
                      disabled={actuallyBlocked}
                      rows="2"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.responsible}</label>
                      <select
                        style={styles.select}
                        value={item.responsible || ''}
                        onChange={(e) => handleUpdateFollowup(item.id, 'responsible', parseInt(e.target.value) || null)}
                        disabled={actuallyBlocked}
                      >
                        <option value="">Seleccionar...</option>
                        {Array.isArray(users) && users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.dueDate}</label>
                      <input
                        type="date"
                        style={styles.input}
                        value={item.dueDate}
                        onChange={(e) => handleUpdateFollowup(item.id, 'dueDate', e.target.value)}
                        disabled={actuallyBlocked}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.status}</label>
                      <select
                        style={styles.select}
                        value={item.status}
                        onChange={(e) => handleUpdateFollowup(item.id, 'status', e.target.value)}
                        disabled={actuallyBlocked}
                      >
                        <option value="pending">{t.statuses.pending}</option>
                        <option value="in_progress">{t.statuses.in_progress}</option>
                        <option value="completed">{t.statuses.completed}</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  <div style={{
                    fontSize: '14px',
                    color: themeColors.text,
                    marginBottom: '12px',
                    lineHeight: '1.5'
                  }}>
                    {item.item}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: themeColors.textMuted }}>
                    <span>
                      <strong>Responsable:</strong> {
                        item.responsible
                          ? users.find(u => u.id === item.responsible)?.firstName + ' ' + users.find(u => u.id === item.responsible)?.lastName
                          : 'Sin asignar'
                      }
                    </span>
                    <span>
                      <strong>Fecha:</strong> {item.dueDate || 'Sin fecha'}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: item.status === 'completed' ? themeColors.successBg : item.status === 'in_progress' ? themeColors.warningBg : themeColors.bgPanel,
                      color: item.status === 'completed' ? themeColors.successFg : item.status === 'in_progress' ? themeColors.warningFg : themeColors.textMuted,
                      fontWeight: '500'
                    }}>
                      {t.statuses[item.status] || item.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Follow-up Button */}
          <button
            onClick={handleAddFollowup}
            style={styles.addButton}
            disabled={actuallyBlocked}
          >
            + {t.addFollowup}
          </button>
        </div>

        {/* Lessons Learned */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
             {t.lessonsLearned}
            <span style={styles.required}>*</span>
          </div>

          {/* Saved Lessons List */}
          {isLoadingLessons ? (
            <div style={styles.emptyState}>Cargando lecciones aprendidas...</div>
          ) : (
            <>
              {lessonsLearned.length === 0 && (
                <div style={styles.emptyState}>
                  No hay lecciones aprendidas registradas. Agrega al menos una lección aprendida.
                </div>
              )}

              {lessonsLearned.map((lesson, index) => (
                <div key={lesson.id} style={styles.followupCard}>
                  <div style={styles.followupHeader}>
                    <span style={{ fontWeight: '600', color: themeColors.accent }}>Lección #{index + 1}</span>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      style={styles.removeButton}
                      disabled={actuallyBlocked}
                    >
                       Eliminar
                    </button>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: themeColors.accentBg,
                    borderRadius: '6px',
                    borderLeft: `3px solid ${themeColors.accent}`,
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}>
                    {lesson.lessonText}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: themeColors.textMuted
                  }}>
                    Agregada el {new Date(lesson.createdAt).toLocaleDateString('es-ES')}
                    {lesson.createdByName && ` por ${lesson.createdByName}`}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add New Lesson Button */}
          <button
            onClick={() => setShowLessonModal(true)}
            style={{
              ...styles.addButton,
              backgroundColor: themeColors.accent
            }}
            disabled={actuallyBlocked}
          >
            + Agregar Lección Aprendida
          </button>
        </div>

        {/* Closure Information */}
        <div id="d8-cierre" style={{ ...styles.section, scrollMarginTop: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.closureNotes}</label>
            <textarea
              style={styles.textarea}
              value={formData.d8ClosureNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, d8ClosureNotes: e.target.value }))}
              placeholder={t.closureNotesPlaceholder}
              disabled={actuallyBlocked}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.closedBy}</label>
              <div style={{
                ...styles.input,
                backgroundColor: themeColors.bgPanel,
                display: 'flex',
                alignItems: 'center',
                color: themeColors.text
              }}>
                {currentUser?.firstName || currentUser?.first_name || ''} {currentUser?.lastName || currentUser?.last_name || ''}
                {(currentUser?.position || currentUser?.role) && ` - ${currentUser?.position || currentUser?.role}`}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.closureDate}</label>
              <input
                type="date"
                style={styles.input}
                value={formData.d8ClosedAt ? formData.d8ClosedAt.split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, d8ClosedAt: e.target.value ? `${e.target.value}T00:00:00` : '' }))}
                disabled={actuallyBlocked}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={formData.d8Completed}
                onChange={(e) => setFormData(prev => ({ ...prev, d8Completed: e.target.checked }))}
                disabled={actuallyBlocked}
              />
               {t.markComplete}
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          {/* Mensaje cuando está completamente aprobado */}
          {data?.d8Status === 'approved' ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{
                padding: '12px 24px',
                backgroundColor: themeColors.successBg,
                border: `1px solid ${themeColors.successBorder}`,
                borderRadius: '6px',
                fontSize: '14px',
                color: themeColors.successFg,
                textAlign: 'center',
                fontWeight: 'bold',
                flex: 1
              }}>
                D8 COMPLETAMENTE APROBADO. El reporte 8D ha sido cerrado exitosamente.
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowRevertModal(true)}
                  style={{
                    ...styles.saveButton,
                    backgroundColor: themeColors.error,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.error}
                  onMouseLeave={(e) => e.target.style.backgroundColor = themeColors.error}
                >
                  {language === 'es' ? 'Regresar a Borrador' : 'Revert to Draft'}
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isBlocked || isSaving}
                style={{
                  ...styles.saveButton,
                  opacity: isBlocked || isSaving ? 0.5 : 1,
                  cursor: isBlocked || isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? t.saving : t.save}
              </button>

              {onSendToApproval && (
            <>
              {/* Show APPROVE/REJECT buttons ONLY when under review */}
              {data?.d8Status === 'under_review' && onApprove && onReject && (
                <>
                  <button
                    onClick={onApprove}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: themeColors.success,
                      color: themeColors.bgCard,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={onReject}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: themeColors.error,
                      color: themeColors.bgCard,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Rechazar
                  </button>
                </>
              )}

              {/* Show SEND button when NOT in approval (admin can always see) */}
              {data?.d8Status !== 'under_review' && data?.d8Status !== 'approved' && !actuallyBlocked && (
                <button
                  onClick={() => {
                    if (!formData.d8Completed) {
                      showError(' Debes marcar D8 como completada antes de enviar a aprobación');
                      return;
                    }
                    onSendToApproval();
                  }}
                  disabled={isSending}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: themeColors.success,
                    color: themeColors.bgCard,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.6 : 1
                  }}
                >
                  {isSending ? 'Enviando...' : 'Enviar a Aprobación'}
                </button>
              )}
            </>
          )}
            </>
          )}
        </div>

        {/* Approval Status Section - D8 (Multi-level) */}
        {data && data.escalationPath && (
          <div style={{
            backgroundColor: themeColors.warningBg,
            border: `1px solid ${themeColors.warningBorder}`,
            borderRadius: '8px',
            padding: '20px',
            marginTop: '32px'
          }}>
            <h3 style={{
              fontSize: '17px',
              fontWeight: 'bold',
              color: themeColors.warningFg,
              marginTop: 0,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
               Estado de Aprobación D8 - Cierre y Felicitación del Equipo (Calidad)
            </h3>

            {/* Multi-level Approval Steps - Dynamic based on confirmation_users */}
            {(() => {
              const confirmationUsers = data?.escalationPath?.confirmation_users || data?.escalation_path?.confirmation_users || [];
              const configuredApprovers = [1, 2, 3].filter(step => {
                const approver = confirmationUsers[step];
                return approver !== undefined && approver !== null;
              });

              if (configuredApprovers.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '12px', color: themeColors.textMuted, fontSize: '13px' }}>
                    No hay aprobadores configurados para D8
                  </div>
                );
              }

              const d8CurrentStep = data?.d8CurrentApprovalStep || 0;
              const approvalData = {
                1: { status: data?.d8Approval1Status, at: data?.d8Approval1At, comments: data?.d8Approval1Comments },
                2: { status: data?.d8Approval2Status, at: data?.d8Approval2At, comments: data?.d8Approval2Comments },
                3: { status: data?.d8Approval3Status, at: data?.d8Approval3At, comments: data?.d8Approval3Comments }
              };

              return (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '20px',
                  justifyContent: 'center'
                }}>
                  {configuredApprovers.map(step => {
                    const isPast = step < d8CurrentStep;
                    const isCurrent = step === d8CurrentStep && data?.d8Status === 'under_review';
                    const approval = approvalData[step];
                    // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
                    const approverData = confirmationUsers[step];
                    const approverId = typeof approverData === 'object' ? approverData.id : approverData;
                    const approverUser = users.find(u => u.id === approverId);
                    // Si es formato nuevo con nombre congelado, usarlo
                    const approverName = (typeof approverData === 'object' && approverData.name)
                      ? approverData.name
                      : approverUser
                        ? `${approverUser.firstName || approverUser.first_name || ''} ${approverUser.lastName || approverUser.last_name || ''}`.trim() || approverUser.email
                        : `ID: ${approverId}`;
                    const approverEmail = approverUser?.email || '';

                    return (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '6px',
                          border: isCurrent ? `2px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`,
                          backgroundColor: isPast
                            ? approval?.status === 'approved' ? themeColors.successBg : approval?.status === 'rejected' ? themeColors.errorBg : themeColors.bg
                            : isCurrent ? themeColors.accentBg : themeColors.bg,
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>
                          {isPast && approval?.status === 'approved' && ' '}
                          {isPast && approval?.status === 'rejected' && ' '}
                          {isCurrent && ' '}
                          {approverName}
                        </div>
                        {approverEmail && (
                          <div style={{ fontSize: '11px', color: themeColors.primary, marginBottom: '4px' }}>
                            {approverEmail}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: themeColors.textMuted }}>
                          {isPast && approval?.status === 'approved' && (
                            <>Aprobado {approval?.at && `el ${new Date(approval.at).toLocaleDateString()}`}</>
                          )}
                          {isPast && approval?.status === 'rejected' && (
                            <>Rechazado</>
                          )}
                          {isCurrent && 'Pendiente de aprobación'}
                          {!isPast && !isCurrent && 'En espera'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Approval History - Full Audit Trail */}
            {d8ApprovalHistory.length > 0 && (
              <div style={{
                backgroundColor: themeColors.bgCard,
                padding: '15px',
                borderRadius: '6px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                  Historial de Aprobaciones D8 ({d8ApprovalHistory.length} registros):
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {d8ApprovalHistory.map((entry, index) => {
                    const isApproved = entry.actionType === 'approved';
                    const isRejected = entry.actionType === 'rejected';
                    const isSubmitted = entry.actionType === 'submitted_for_approval';

                    return (
                      <div key={entry.id || index} style={{
                        marginBottom: '10px',
                        padding: '10px',
                        backgroundColor: isApproved ? themeColors.successBg : isRejected ? themeColors.errorBg : themeColors.accentBg,
                        borderLeft: `3px solid ${isApproved ? themeColors.success : isRejected ? themeColors.error : themeColors.accent}`,
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: isApproved ? themeColors.successFg : isRejected ? themeColors.errorFg : themeColors.accentFg }}>
                            {entry.userName || 'Usuario'}
                          </strong>
                          <span style={{ fontSize: '11px', color: themeColors.textMuted }}>
                            {entry.createdAt && new Date(entry.createdAt).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          {isApproved && <span style={{ color: themeColors.successFg }}>Aprobado</span>}
                          {isRejected && <span style={{ color: themeColors.errorFg }}>Rechazado</span>}
                          {isSubmitted && <span style={{ color: themeColors.accentFg }}>Enviado a Aprobación</span>}
                          {entry.description && (
                            <span style={{ marginLeft: '8px', color: themeColors.textMuted }}>
                              - {entry.description}
                            </span>
                          )}
                        </div>
                        {entry.newValue && typeof entry.newValue === 'object' && entry.newValue.comments && (
                          <div style={{
                            marginTop: '6px',
                            padding: '6px',
                            backgroundColor: themeColors.warningBg,
                            borderLeft: `2px solid ${themeColors.warning}`,
                            fontSize: '12px',
                            fontStyle: 'italic'
                          }}>
                            Comentarios: {entry.newValue.comments}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================== ESCALATION PATH ================== */}
        <div style={{
          marginTop: '30px',
          backgroundColor: themeColors.accentBg,
          border: `1px solid ${themeColors.accentBorder}`,
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: themeColors.text,
            marginTop: 0,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Escalation Path - D8 (Confirmation Section)
          </h3>
          {(() => {
            const confirmationUsers = data?.escalationPath?.confirmation_users || data?.escalation_path?.confirmation_users || [];

            if (confirmationUsers.length === 0) {
              return (
                <div style={{ color: themeColors.errorFg, fontSize: '13px', padding: '12px', backgroundColor: themeColors.errorBg, borderRadius: '6px' }}>
                  No hay usuarios asignados. Configure el Escalation Path en la sección "Confirmation (D7-D8)" del tab D1-D2-D3.
                </div>
              );
            }

            // Compatible con formato nuevo (objeto {id, name}) y antiguo (solo ID)
            const getUserInfo = (userIdOrObject, role) => {
              if (!userIdOrObject) return null;

              // Si ya es objeto con nombre congelado
              if (typeof userIdOrObject === 'object' && userIdOrObject.name) {
                const userId = userIdOrObject.id;
                const user = users.find(u => u.id === userId);
                return {
                  name: userIdOrObject.name,
                  email: user?.email || '',
                  position: user?.position || user?.cargo || '',
                  role
                };
              }

              // Formato antiguo: solo ID
              const userId = typeof userIdOrObject === 'object' ? userIdOrObject.id : userIdOrObject;
              const user = users.find(u => u.id === userId);
              const name = user
                ? `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email
                : `ID: ${userId}`;
              const email = user?.email || '';
              const position = user?.position || user?.cargo || '';
              return { name, email, position, role };
            };

            const roles = [
              { index: 0, label: 'Responsable', color: themeColors.accentFg, bgColor: themeColors.accentBg, borderColor: themeColors.accentBorder },
              { index: 1, label: 'Aprobador 1', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder },
              { index: 2, label: 'Aprobador 2', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder },
              { index: 3, label: 'Aprobador 3', color: themeColors.successFg, bgColor: themeColors.successBg, borderColor: themeColors.successBorder }
            ];

            return (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {roles.map(({ index, label, color, bgColor, borderColor }) => {
                  const userId = confirmationUsers[index];
                  if (!userId) return null;
                  const info = getUserInfo(userId, label);
                  if (!info) return null;

                  return (
                    <div key={index} style={{
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      minWidth: '200px',
                      flex: '1 1 200px'
                    }}>
                      <div style={{ fontSize: '11px', color: themeColors.textMuted, marginBottom: '4px', fontWeight: '600' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color }}>
                        {info.name}
                      </div>
                      {info.email && (
                        <div style={{ fontSize: '12px', color: themeColors.primary, marginTop: '2px' }}>
                          {info.email}
                        </div>
                      )}
                      {info.position && (
                        <div style={{ fontSize: '11px', color: themeColors.textMuted, marginTop: '2px' }}>
                          {info.position}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal: Add Lesson Learned */}
      {showLessonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: themeColors.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: themeColors.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: themeColors.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: themeColors.accent,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Agregar Nueva Lección Aprendida
            </h3>

            <textarea
              style={{
                ...styles.textarea,
                minHeight: '150px'
              }}
              value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)}
              placeholder={t.lessonsLearnedPlaceholder}
              rows="6"
              autoFocus
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setShowLessonModal(false);
                  setNewLesson('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: 'transparent',
                  color: themeColors.text,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await handleSaveLesson();
                  setShowLessonModal(false);
                }}
                disabled={!newLesson.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !newLesson.trim() ? themeColors.bgPanel : themeColors.accent,
                  color: !newLesson.trim() ? themeColors.textMuted : themeColors.bgCard,
                  cursor: !newLesson.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Guardar Lección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revert to Draft (Admin only) */}
      {showRevertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: themeColors.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: themeColors.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: themeColors.isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: themeColors.error,
              fontSize: '20px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ {language === 'es' ? 'CREAR NUEVA REVISIÓN DEL 8D' : 'CREATE NEW 8D REVISION'}
            </h3>

            <div style={{
              backgroundColor: themeColors.errorBg,
              border: `1px solid ${themeColors.errorBorder}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 12px 0', color: themeColors.errorFg, fontSize: '15px', fontWeight: '600' }}>
                {language === 'es'
                  ? '⚠️ ADVERTENCIA: ACCIÓN IRREVERSIBLE'
                  : '⚠️ WARNING: IRREVERSIBLE ACTION'}
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', color: themeColors.errorFg, fontSize: '14px', lineHeight: '1.8' }}>
                <li style={{ marginBottom: '8px' }}>
                  {language === 'es'
                    ? <><strong>TODO el reporte 8D</strong> (D1 a D8) será archivado permanentemente como referencia histórica.</>
                    : <><strong>The ENTIRE 8D report</strong> (D1 through D8) will be permanently archived as historical reference.</>}
                </li>
                <li style={{ marginBottom: '8px' }}>
                  {language === 'es'
                    ? <>Se creará una <strong>NUEVA REVISIÓN</strong> editable (ej: {data?.reportId}-R1).</>
                    : <>A <strong>NEW REVISION</strong> will be created for editing (e.g., {data?.reportId}-R1).</>}
                </li>
                <li style={{ marginBottom: '8px' }}>
                  {language === 'es'
                    ? <><strong>Todas las aprobaciones</strong> (D3, D3-MFG, D4, D5, D6, D7, D8) serán reseteadas.</>
                    : <><strong>All approvals</strong> (D3, D3-MFG, D4, D5, D6, D7, D8) will be reset.</>}
                </li>
                <li>
                  {language === 'es'
                    ? <>El documento archivado <strong>quedará bloqueado</strong> y disponible para auditorías ISO.</>
                    : <>The archived document <strong>will be locked</strong> and available for ISO audits.</>}
                </li>
              </ul>
            </div>

            <div style={{
              backgroundColor: themeColors.accentBg,
              border: `1px solid ${themeColors.accentBorder}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: themeColors.accentFg
            }}>
              <strong>📋 Cumplimiento ISO:</strong> Esta acción mantiene la trazabilidad documental requerida por ISO 9001/IATF 16949.
              El documento original permanecerá inmutable como evidencia de auditoría.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: themeColors.text
              }}>
                {language === 'es' ? 'Razón (obligatorio):' : 'Reason (required):'}
              </label>
              <textarea
                value={revertComments}
                onChange={(e) => setRevertComments(e.target.value)}
                placeholder={language === 'es' ? 'Ingrese el motivo de la reversión...' : 'Enter reason for reverting...'}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.bgInput,
                  color: themeColors.text,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRevertModal(false);
                  setRevertComments('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: 'transparent',
                  color: themeColors.text,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleRevertToDraft}
                disabled={isReverting || !revertComments.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isReverting || !revertComments.trim() ? themeColors.bgPanel : themeColors.error,
                  color: isReverting || !revertComments.trim() ? themeColors.textMuted : themeColors.bgCard,
                  cursor: isReverting || !revertComments.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isReverting
                  ? (language === 'es' ? 'Procesando...' : 'Processing...')
                  : (language === 'es' ? 'Confirmar' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* End of read-only wrapper */}
    </div>
  );
};

export default D8FollowUpEvidence;
