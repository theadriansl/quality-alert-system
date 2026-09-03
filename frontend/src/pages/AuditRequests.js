import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [requests, setRequests] = useState([]);

  const L = {
    en: {
      observation: 'Observation', notApplicable: 'Not Applicable',
      loading: 'Loading audit requests...', title: 'Audit Requests',
      subtitle: 'Click on a request to open the checklist and validate',
      dashboard: 'Dashboard', home: 'Home', noRequests: 'No audit requests',
      days: 'days', severity: 'Severity', issueDate: 'Issue', client: 'Client', project: 'Project',
      auditProgress: 'Audit Progress', pending: 'Pending', rejections: 'Rejection',
      auditors: 'Auditors', responded: 'responded', nextDue: 'Next due',
      loadingChecklist: 'Loading checklist...', noItems: 'No items in the checklist',
      category: 'Category', checkItem: 'Check Item', leaderNotes: 'Leader Notes',
      dueDate: 'Due Date', auditorComments: 'Auditor Comments', judgment: 'Judgment',
      completed: 'Completed', validatedBy: 'Validated by', round: 'Round', history: 'Hist.',
      notSpecified: 'Not specified', commentsPlaceholder: 'Comments / findings...',
      selfVerified: 'Self-verified by leader', leader: 'Leader',
      close: 'Close', saving: 'Saving...', saveProgress: 'Save Progress', saveError: 'Error saving',
      historyTitle: 'Audit History', loadingHistory: 'Loading history...',
      noHistory: 'No previous round history', currentRound: 'Current Round',
      comments: 'Comments', previousRounds: 'Previous Rounds (Closed Findings)',
      finding: 'Finding', resolution: 'Resolution', closed: 'Closed',
      overdue: 'OVERDUE'
    },
    es: {
      observation: 'Observación', notApplicable: 'No Aplica',
      loading: 'Cargando solicitudes de auditoría...', title: 'Solicitudes de Auditoría',
      subtitle: 'Haz clic en una solicitud para abrir el checklist y validar',
      dashboard: 'Dashboard', home: 'Inicio', noRequests: 'No hay solicitudes de auditoría',
      days: 'días', severity: 'Severidad', issueDate: 'Issue', client: 'Cliente', project: 'Proyecto',
      auditProgress: 'Progreso de Auditoría', pending: 'Pendiente', rejections: 'Rechazo',
      auditors: 'Auditores', responded: 'respondieron', nextDue: 'Próx. vencimiento',
      loadingChecklist: 'Cargando checklist...', noItems: 'No hay items en el checklist',
      category: 'Categoría', checkItem: 'Check Item', leaderNotes: 'Notas del Líder',
      dueDate: 'Fecha Límite', auditorComments: 'Comentarios Auditor', judgment: 'Juicio',
      completed: 'Completado', validatedBy: 'Validado por', round: 'Ronda', history: 'Hist.',
      notSpecified: 'Sin especificar', commentsPlaceholder: 'Comentarios / hallazgos...',
      selfVerified: 'Auto-verificado por líder', leader: 'Líder',
      close: 'Cerrar', saving: 'Guardando...', saveProgress: 'Guardar Avance', saveError: 'Error al guardar',
      historyTitle: 'Historial de Auditoría', loadingHistory: 'Cargando historial...',
      noHistory: 'No hay historial de rondas anteriores', currentRound: 'Ronda Actual',
      comments: 'Comentarios', previousRounds: 'Rondas Anteriores (Hallazgos Cerrados)',
      finding: 'Hallazgo', resolution: 'Resolución', closed: 'Cerrado',
      overdue: 'VENCIDO'
    }
  }[language] || {};

  const JUDGMENT_OPTIONS = [
    { value: '', label: '--' },
    { value: 'OK', label: ' OK' },
    { value: 'NOK', label: ' NOK' },
    { value: 'OBS', label: ` ${L.observation}` },
    { value: 'NA', label: `- ${L.notApplicable}` }
  ];
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('8D');
  const autoOpenProcessed = useRef(false);

  // Modal state
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [reportInfo, setReportInfo] = useState(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState({ history: [], currentRound: null, itemName: '' });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load requests with scorecard data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/audit/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        // Data already comes grouped with scorecard info
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open checklist from URL params
  useEffect(() => {
    if (loading || autoOpenProcessed.current || requests.length === 0) return;

    const params = new URLSearchParams(location.search);
    const autoOpen = params.get('autoOpen');
    const sourceType = params.get('sourceType');
    const sourceId = params.get('sourceId');

    if (autoOpen === 'true' && sourceType && sourceId) {
      autoOpenProcessed.current = true;
      setActiveTab(sourceType);

      const targetRequest = requests.find(r =>
        r.sourceType === sourceType && String(r.sourceId) === sourceId
      );

      if (targetRequest) {
        openChecklist(targetRequest);
      }
    }
  }, [loading, requests, location.search]);

  const filteredRequests = requests.filter(r => r.sourceType === activeTab);

  // Open checklist modal
  const openChecklist = async (request) => {
    setSelectedRequest(request);
    setShowChecklistModal(true);
    setLoadingChecklist(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/d7-checklist/${request.sourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        setChecklistItems(data.items || []);
        setReportInfo(data.reportInfo);
      }
    } catch (err) {
      console.error('Error loading checklist:', err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  // Update item in local state
  const updateLocalItem = (itemId, field, value) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Save progress
  const saveProgress = async () => {
    setSavingProgress(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/audit/d7-checklist/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: checklistItems })
      });

      const data = await res.json();

      if (data.success) {
        alert(` ${data.message}`);
        // Reload to get updated auditor names
        openChecklist(selectedRequest);
        loadData();
      }
    } catch (err) {
      console.error('Error saving progress:', err);
      alert(L.saveError);
    } finally {
      setSavingProgress(false);
    }
  };

  // Open history modal for an item
  const openHistoryModal = async (item) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setHistoryData({ history: [], currentRound: null, itemName: item.itemName });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/d7-item/${item.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        setHistoryData({
          history: data.history,
          currentRound: data.currentRound,
          itemName: item.itemName
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      alert(L.loadingHistory);
    } finally {
      setLoadingHistory(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      marginBottom: '24px',
      backgroundColor: t.bgCard,
      padding: '4px',
      borderRadius: '10px',
      width: 'fit-content'
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '2px solid transparent'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      width: '100%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalBody: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    th: {
      backgroundColor: t.bgPanel,
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      borderBottom: `2px solid ${t.border}`,
      color: t.text
    },
    td: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      verticalAlign: 'top',
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '8px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      resize: 'vertical',
      minHeight: '60px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          {L.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}> {L.title}</h1>
          <p style={{ fontSize: '14px', color: t.textMuted, marginTop: '4px' }}>
            {L.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             {L.dashboard}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← {L.home}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            backgroundColor: activeTab === '8D' ? t.accent : 'transparent',
            color: activeTab === '8D' ? 'white' : t.textMuted
          }}
          onClick={() => setActiveTab('8D')}
        >
           8D Reports
        </button>
      </div>

      {/* Requests List - Scorecards */}
      {filteredRequests.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '48px', cursor: 'default' }}>
          <p style={{ fontSize: '18px', marginBottom: '12px', color: t.textMuted }}>
            {L.noRequests} {activeTab}
          </p>
        </div>
      ) : (
        filteredRequests.map((request, idx) => {
          const pendingItems = request.totalItems - request.completedItems;
          const hasOverdue = request.overdueItems > 0;
          const progressPercent = request.totalItems > 0
            ? Math.round((request.completedItems / request.totalItems) * 100)
            : 0;
          const assignedCount = request.assignedAuditors?.length || 0;
          const respondedCount = request.respondedAuditors?.length || 0;

          return (
            <div
              key={idx}
              style={{
                ...styles.card,
                borderColor: hasOverdue ? t.error : pendingItems > 0 ? t.warning : t.success,
                borderWidth: hasOverdue ? '3px' : '2px'
              }}
              onClick={() => openChecklist(request)}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: t.accent }}>
                     {request.reportId || `${request.sourceType}-${request.sourceId}`}
                  </span>
                  <span style={{ color: t.border }}>|</span>
                  <span style={{ fontSize: '15px', fontWeight: '500', color: t.text }}>{request.reportTitle || 'Sin título'}</span>
                  <span style={{ color: t.border }}>|</span>
                  <span style={{ fontSize: '13px', color: t.textMuted }}> {request.daysOpen || 0} {L.days}</span>
                </div>
                {hasOverdue && (
                  <span style={{
                    ...styles.badge,
                    backgroundColor: `${t.error}20`,
                    color: t.error,
                    animation: 'pulse 2s infinite'
                  }}>
                     {request.overdueItems} {L.overdue}
                  </span>
                )}
              </div>

              {/* Info Row */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div>
                  <span style={{ color: t.textMuted }}>{L.severity}: </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    backgroundColor: request.severity === 'High' ? `${t.error}20` :
                                    request.severity === 'Medium' ? `${t.warning}20` : `${t.success}20`,
                    color: request.severity === 'High' ? t.error :
                           request.severity === 'Medium' ? t.warning : t.success
                  }}>
                    {request.severity || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ color: t.textMuted }}>{L.issueDate}: </span>
                  <span style={{ fontWeight: '500', color: t.text }}>
                    {request.issueDate ? new Date(request.issueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX') : '-'}
                  </span>
                </div>
                {request.clientName && (
                  <div>
                    <span style={{ color: t.textMuted }}>{L.client}: </span>
                    <span style={{ fontWeight: '500', color: t.text }}>{request.clientName}</span>
                  </div>
                )}
                {request.projectNumber && (
                  <div>
                    <span style={{ color: t.textMuted }}>{L.project}: </span>
                    <span style={{ fontWeight: '500', color: t.text }}>{request.projectNumber}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                  <span style={{ color: t.textMuted }}>{L.auditProgress}</span>
                  <span style={{ fontWeight: '600', color: t.text }}>{progressPercent}% ({request.completedItems}/{request.totalItems})</span>
                </div>
                <div style={{ height: '8px', backgroundColor: t.bgPanel, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    backgroundColor: progressPercent === 100 ? t.success : t.accent,
                    borderRadius: '4px',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Item Status */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {request.okItems > 0 && (
                    <span style={{ ...styles.badge, backgroundColor: `${t.success}20`, color: t.success }}>
                       {request.okItems} OK
                    </span>
                  )}
                  {request.nokItems > 0 && (
                    <span style={{ ...styles.badge, backgroundColor: `${t.error}20`, color: t.error }}>
                       {request.nokItems} NOK
                    </span>
                  )}
                  {request.obsItems > 0 && (
                    <span style={{ ...styles.badge, backgroundColor: `${t.warning}20`, color: t.warning }}>
                       {request.obsItems} OBS
                    </span>
                  )}
                  {pendingItems > 0 && (
                    <span style={{ ...styles.badge, backgroundColor: t.bgPanel, color: t.textMuted }}>
                       {pendingItems} {L.pending}
                    </span>
                  )}
                  {request.totalRejections > 0 && (
                    <span style={{ ...styles.badge, backgroundColor: '#fae8ff', color: '#a21caf' }}>
                       {request.totalRejections} {L.rejections}{request.totalRejections > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <span style={{ color: t.border }}>|</span>

                {/* Auditors Status */}
                <div style={{ fontSize: '13px' }}>
                  <span style={{ color: t.textMuted }}>{L.auditors}: </span>
                  <span style={{
                    fontWeight: '600',
                    color: respondedCount === assignedCount && assignedCount > 0 ? t.success : t.warning
                  }}>
                    {respondedCount}/{assignedCount} {L.responded}
                  </span>
                </div>

                {/* Next Due Date */}
                {request.nextDueDate && (
                  <>
                    <span style={{ color: t.border }}>|</span>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: t.textMuted }}>{L.nextDue}: </span>
                      <span style={{
                        fontWeight: '600',
                        color: new Date(request.nextDueDate) < new Date() ? t.error : t.text
                      }}>
                        {new Date(request.nextDueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div style={styles.modal} onClick={() => setShowChecklistModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.modalHeader}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: t.accent }}>
                     {reportInfo?.reportId || `8D-${selectedRequest?.sourceId}`}
                  </h2>
                  <span style={{ color: t.textMuted, fontSize: '18px' }}>|</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: t.text }}>{reportInfo?.title || 'Sin título'}</span>
                  <span style={{ color: t.textMuted, fontSize: '18px' }}>|</span>
                  <span style={{ fontSize: '14px', color: t.textMuted }}>
                     {reportInfo?.daysOpen || 0} {L.days}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: t.textMuted }}>{L.severity}:</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: reportInfo?.severity === 'High' ? `${t.error}20` :
                                      reportInfo?.severity === 'Medium' ? `${t.warning}20` : `${t.success}20`,
                      color: reportInfo?.severity === 'High' ? t.error :
                             reportInfo?.severity === 'Medium' ? t.warning : t.success
                    }}>
                      {reportInfo?.severity || '-'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: t.textMuted }}>{L.issueDate}:</span>
                    <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '500', color: t.text }}>
                      {reportInfo?.issueDate ? new Date(reportInfo.issueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX') : '-'}
                    </span>
                  </div>
                  {reportInfo?.partsInfo?.[0]?.clientName && (
                    <div>
                      <span style={{ fontSize: '12px', color: t.textMuted }}>{L.client}:</span>
                      <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '500', color: t.text }}>
                        {reportInfo.partsInfo[0].clientName}
                      </span>
                    </div>
                  )}
                  {reportInfo?.partsInfo?.[0]?.projectNumber && (
                    <div>
                      <span style={{ fontSize: '12px', color: t.textMuted }}>{L.project}:</span>
                      <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '500', color: t.text }}>
                        {reportInfo.partsInfo[0].projectNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted, alignSelf: 'flex-start' }}
              >

              </button>
            </div>

            {/* Body */}
            <div style={styles.modalBody}>
              {loadingChecklist ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{L.loadingChecklist}</div>
              ) : checklistItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  {L.noItems}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: '100px' }}>{L.category}</th>
                        <th style={{ ...styles.th, width: '200px' }}>{L.checkItem}</th>
                        <th style={{ ...styles.th, width: '150px', backgroundColor: '#eff6ff' }}>{L.leaderNotes}</th>
                        <th style={{ ...styles.th, width: '90px' }}>{L.dueDate}</th>
                        <th style={{ ...styles.th, width: '200px' }}>{L.auditorComments}</th>
                        <th style={{ ...styles.th, width: '100px' }}>{L.judgment}</th>
                        <th style={{ ...styles.th, width: '80px' }}>{L.completed}</th>
                        <th style={{ ...styles.th, width: '120px' }}>{L.validatedBy}</th>
                        <th style={{ ...styles.th, width: '70px', backgroundColor: '#fef9c3' }}>{L.round}</th>
                        <th style={{ ...styles.th, width: '70px' }}>{L.history}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistItems.map((item) => {
                        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.auditorCompleted;
                        // Check if item was self-verified by leader (has judgment but no assigned auditors)
                        const isSelfVerified = item.auditorJudgment && (!item.assignedAuditors || item.assignedAuditors.length === 0);

                        return (
                          <tr key={item.id} style={{
                            backgroundColor: isSelfVerified ? `${t.accent}10` : item.auditorCompleted ? `${t.success}10` : isOverdue ? `${t.error}10` : t.bgCard
                          }}>
                            <td style={styles.td}>
                              <strong>{item.itemIcon} {item.itemName}</strong>
                            </td>
                            <td style={styles.td}>
                              <div style={{
                                backgroundColor: t.bgPanel,
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '13px'
                              }}>
                                {item.checkItem || <span style={{ color: t.textDim }}>{L.notSpecified}</span>}
                              </div>
                            </td>
                            {/* Leader Notes/Comments */}
                            <td style={{ ...styles.td, backgroundColor: '#f0f7ff' }}>
                              {item.comments ? (
                                <div style={{
                                  backgroundColor: '#dbeafe',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#1e40af',
                                  fontStyle: 'italic'
                                }}>
                                  {item.comments}
                                </div>
                              ) : (
                                <span style={{ color: t.textDim, fontSize: '12px' }}>-</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {item.dueDate ? (
                                <span style={{ color: isOverdue ? t.error : t.text }}>
                                  {new Date(item.dueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                                  {isOverdue && ' '}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={styles.td}>
                              {isSelfVerified ? (
                                <div style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                                  {item.auditorComments || L.selfVerified}
                                </div>
                              ) : (
                                <textarea
                                  style={styles.textarea}
                                  value={item.auditorComments || ''}
                                  onChange={(e) => updateLocalItem(item.id, 'auditorComments', e.target.value)}
                                  placeholder={L.commentsPlaceholder}
                                />
                              )}
                            </td>
                            <td style={styles.td}>
                              {isSelfVerified ? (
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: item.auditorJudgment === 'OK' ? `${t.success}20` :
                                    item.auditorJudgment === 'NOK' ? `${t.error}20` :
                                    item.auditorJudgment === 'OBS' ? `${t.warning}20` : t.bgPanel,
                                  color: item.auditorJudgment === 'OK' ? t.success :
                                    item.auditorJudgment === 'NOK' ? t.error :
                                    item.auditorJudgment === 'OBS' ? t.warning : t.text
                                }}>
                                  {item.auditorJudgment} ({L.leader})
                                </span>
                              ) : (
                                <select
                                  style={{
                                    ...styles.select,
                                    backgroundColor: item.auditorJudgment === 'OK' ? `${t.success}20` :
                                      item.auditorJudgment === 'NOK' ? `${t.error}20` :
                                      item.auditorJudgment === 'OBS' ? `${t.warning}20` : t.bgCard
                                  }}
                                  value={item.auditorJudgment || ''}
                                  onChange={(e) => updateLocalItem(item.id, 'auditorJudgment', e.target.value)}
                                >
                                  {JUDGMENT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {isSelfVerified ? (
                                <span style={{ color: t.accent, fontSize: '18px' }}></span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={item.auditorCompleted || false}
                                  onChange={(e) => updateLocalItem(item.id, 'auditorCompleted', e.target.checked)}
                                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                              )}
                            </td>
                            <td style={{ ...styles.td, fontSize: '12px', color: t.textMuted }}>
                              {item.auditedByName || '-'}
                              {item.verificationDate && (
                                <div style={{ fontSize: '11px' }}>
                                  {new Date(item.verificationDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                                </div>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center', backgroundColor: '#fefce8' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '13px',
                                backgroundColor: (item.auditRound || 1) > 1 ? `${t.warning}20` : t.bgPanel,
                                color: (item.auditRound || 1) > 1 ? t.warning : t.text
                              }}>
                                {item.auditRound || 1}
                              </span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); openHistoryModal(item); }}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#8b5cf6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                title={L.historyTitle}
                              >
                                 {L.history}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowChecklistModal(false)}
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
              >
                {L.close}
              </button>
              <button
                onClick={saveProgress}
                disabled={savingProgress || loadingChecklist}
                style={{
                  ...styles.button,
                  backgroundColor: t.success,
                  color: 'white',
                  opacity: savingProgress ? 0.6 : 1
                }}
              >
                {savingProgress ? ` ${L.saving}` : ` ${L.saveProgress}`}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* History Modal */}
      {showHistoryModal && (
        <div style={styles.modal} onClick={() => setShowHistoryModal(false)}>
          <div
            style={{ ...styles.modalContent, maxWidth: '700px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              ...styles.modalHeader,
              backgroundColor: '#8b5cf6',
              color: 'white'
            }}>
              <span style={{ fontSize: '18px', fontWeight: '600' }}>
                 {L.historyTitle} - {historyData.itemName}
              </span>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >

              </button>
            </div>

            {/* Body */}
            <div style={styles.modalBody}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  {L.loadingHistory}
                </div>
              ) : historyData.history.length === 0 && !historyData.currentRound ? (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  {L.noHistory}
                </div>
              ) : (
                <div>
                  {/* Current Round */}
                  {historyData.currentRound && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: `${t.success}10`,
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: `2px solid ${t.success}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: t.success }}>
                          {L.currentRound}: {historyData.currentRound.auditRound || 1}
                        </span>
                        {historyData.currentRound.auditorJudgment && (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            backgroundColor: historyData.currentRound.auditorJudgment === 'OK' ? `${t.success}20` :
                                            historyData.currentRound.auditorJudgment === 'NOK' ? `${t.error}20` : `${t.warning}20`,
                            color: historyData.currentRound.auditorJudgment === 'OK' ? t.success :
                                   historyData.currentRound.auditorJudgment === 'NOK' ? t.error : t.warning
                          }}>
                            {historyData.currentRound.auditorJudgment}
                          </span>
                        )}
                      </div>
                      {historyData.currentRound.auditorComments && (
                        <div style={{ marginTop: '8px', fontSize: '14px', color: t.text }}>
                          <strong>{L.comments}:</strong> {historyData.currentRound.auditorComments}
                        </div>
                      )}
                      {historyData.currentRound.auditorName && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: t.textMuted }}>
                           {historyData.currentRound.auditorName}
                          {historyData.currentRound.verificationDate && (
                            <span> - {new Date(historyData.currentRound.verificationDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Previous Rounds */}
                  {historyData.history.length > 0 && (
                    <>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
                        {L.previousRounds}:
                      </div>
                      {historyData.history.map((round, idx) => (
                        <div key={idx} style={{
                          padding: '14px',
                          backgroundColor: t.bgPanel,
                          borderRadius: '8px',
                          marginBottom: '10px',
                          borderLeft: `4px solid ${round.auditorJudgment === 'NOK' ? t.error : round.auditorJudgment === 'OBS' ? t.warning : t.textMuted}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', color: t.text }}>
                              {L.round} {round.auditRound}
                            </span>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: round.auditorJudgment === 'NOK' ? `${t.error}20` :
                                              round.auditorJudgment === 'OBS' ? `${t.warning}20` : t.bgPanel,
                              color: round.auditorJudgment === 'NOK' ? t.error :
                                     round.auditorJudgment === 'OBS' ? t.warning : t.text
                            }}>
                              {round.auditorJudgment}
                            </span>
                          </div>
                          {round.auditorComments && (
                            <div style={{ fontSize: '13px', color: t.text, marginBottom: '6px' }}>
                              <strong>{L.finding}:</strong> {round.auditorComments}
                            </div>
                          )}
                          {round.closureNotes && (
                            <div style={{ fontSize: '13px', color: t.success, marginBottom: '6px' }}>
                              <strong>{L.resolution}:</strong> {round.closureNotes}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: t.textDim }}>
                            {round.auditorName && <span> {round.auditorName}</span>}
                            {round.verificationDate && (
                              <span> - {new Date(round.verificationDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}</span>
                            )}
                            {round.closedAt && (
                              <span> - {L.closed}: {new Date(round.closedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
              >
                {L.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditRequests;
