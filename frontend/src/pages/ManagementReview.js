import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import managementReviewService from '../services/managementReviewService';
import { useTheme } from '../context/ThemeContext';

const ManagementReview = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // For editing existing acta
  const { theme: themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState('kpis');
  const [loading, setLoading] = useState(true);

  // Data
  const [acta, setActa] = useState(null);
  const [kpis, setKpis] = useState({});
  const [checklist, setChecklist] = useState({ inputs: [], outputs: [] });
  const [checklistResponses, setChecklistResponses] = useState({});
  const [previousActions, setPreviousActions] = useState([]);
  const [users, setUsers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    reviewDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    location: '',
    attendees: [],
    executiveSummary: '',
    nextReviewDate: ''
  });

  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Calculate period (last quarter by default)
  useEffect(() => {
    const today = new Date();
    const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
    const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0);

    setFormData(prev => ({
      ...prev,
      periodStart: quarterStart.toISOString().split('T')[0],
      periodEnd: quarterEnd.toISOString().split('T')[0]
    }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load checklist template
      const checklistRes = await managementReviewService.getChecklistTemplate();
      setChecklist(checklistRes.checklist);

      // Load previous actions
      const actionsRes = await managementReviewService.getPreviousActions();
      setPreviousActions(actionsRes.actions || []);

      // Load users for attendees
      const usersRes = await fetch('http://localhost:5000/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // If editing existing acta
      if (id) {
        const actaRes = await managementReviewService.getActa(id);
        setActa(actaRes.acta);
        setFormData({
          reviewDate: actaRes.acta.reviewDate?.split('T')[0] || '',
          periodStart: actaRes.acta.periodStart?.split('T')[0] || '',
          periodEnd: actaRes.acta.periodEnd?.split('T')[0] || '',
          location: actaRes.acta.location || '',
          attendees: actaRes.acta.attendees || [],
          executiveSummary: actaRes.acta.executiveSummary || '',
          nextReviewDate: actaRes.acta.nextReviewDate?.split('T')[0] || ''
        });
        setChecklistResponses(actaRes.acta.checklistResponses || {});
        if (actaRes.acta.kpiSnapshot) {
          setKpis(actaRes.acta.kpiSnapshot);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadKPIs = async () => {
    try {
      const res = await managementReviewService.getKPIs(formData.periodStart, formData.periodEnd);
      setKpis(res.kpis);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  useEffect(() => {
    if (formData.periodStart && formData.periodEnd && !id) {
      loadKPIs();
    }
  }, [formData.periodStart, formData.periodEnd]);

  const handleSave = async (status = 'draft') => {
    try {
      setSaving(true);

      const data = {
        ...formData,
        status,
        kpiSnapshot: kpis,
        checklistResponses,
        createdBy: user.id,
        updatedBy: user.id
      };

      let result;
      if (acta?.id) {
        result = await managementReviewService.updateActa(acta.id, data);
      } else {
        result = await managementReviewService.createActa(data);
      }

      if (result.success) {
        setActa(result.acta);
        alert(acta?.id ? 'Acta actualizada' : 'Acta creada');
        if (!acta?.id) {
          navigate(`/management-review/${result.acta.id}`);
        }
      }
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateChecklistItem = (itemId, field, value) => {
    setChecklistResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      ok: { bg: '#2E7D32', label: 'OK' },
      partial: { bg: '#C77700', label: 'Parcial' },
      nok: { bg: '#ef4444', label: 'NOK' },
      na: { bg: '#6b7280', label: 'N/A' }
    };
    const s = styles[status] || styles.ok;
    return (
      <span style={{ backgroundColor: s.bg, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: themeColors.bg, minHeight: '100vh', color: themeColors.text }}>
        Cargando...
      </div>
    );
  }

  const tabs = [
    { id: 'kpis', label: 'KPIs del Periodo', icon: '' },
    { id: 'previous', label: 'Acciones Previas', icon: '', count: previousActions.length },
    { id: 'checklist', label: 'Checklist 9.3', icon: '', count: checklist.inputs?.length + checklist.outputs?.length },
    { id: 'decisions', label: 'Decisiones', icon: '' },
    { id: 'attendees', label: 'Asistentes', icon: '', count: formData.attendees.length }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: themeColors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/workload')}
          style={{ background: 'none', border: 'none', color: themeColors.primary, cursor: 'pointer', marginBottom: '10px' }}
        >
          ← Volver a Workload
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: themeColors.primary }}>
              Revisión por la Dirección
              {acta?.actaNumber && <span style={{ color: themeColors.textMuted, fontSize: '18px' }}> - {acta.actaNumber}</span>}
            </h2>
            <p style={{ margin: '5px 0 0', color: themeColors.textMuted }}>
              ISO 9001:9.3 / IATF 16949:9.3
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: '6px', border: `1px solid ${themeColors.border}`, background: themeColors.bgCard, color: themeColors.text, cursor: 'pointer' }}
            >
              Guardar Borrador
            </button>
            <button
              onClick={() => handleSave('pending_signatures')}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: themeColors.primary, color: 'white', cursor: 'pointer' }}
            >
              Enviar a Firmas
            </button>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div style={{ backgroundColor: themeColors.bgPanel, padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: themeColors.textMuted, marginBottom: '4px' }}>Fecha Revisión</label>
          <input
            type="date"
            value={formData.reviewDate}
            onChange={(e) => setFormData(prev => ({ ...prev, reviewDate: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.bgCard, color: themeColors.text }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: themeColors.textMuted, marginBottom: '4px' }}>Periodo Inicio</label>
          <input
            type="date"
            value={formData.periodStart}
            onChange={(e) => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.bgCard, color: themeColors.text }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: themeColors.textMuted, marginBottom: '4px' }}>Periodo Fin</label>
          <input
            type="date"
            value={formData.periodEnd}
            onChange={(e) => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.bgCard, color: themeColors.text }}
          />
        </div>
        <button
          onClick={loadKPIs}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: themeColors.accent, color: 'white', cursor: 'pointer' }}
        >
          Cargar KPIs
        </button>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: themeColors.textMuted, marginBottom: '4px' }}>Ubicación</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Sala de juntas..."
            style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, width: '200px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: `2px solid ${themeColors.border}`, marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === tab.id ? themeColors.primary : 'transparent',
              color: activeTab === tab.id ? 'white' : themeColors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px 8px 0 0',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : themeColors.bgPanel,
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ backgroundColor: themeColors.bgCard, borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

        {/* KPIs TAB */}
        {activeTab === 'kpis' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: themeColors.primary }}>KPIs del Periodo</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

              {/* 8D */}
              <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#92400e' }}>8D Reports</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['8D']?.openCount || 0}</strong><br /><small>Abiertos</small></div>
                  <div><strong>{kpis['8D']?.closedCount || 0}</strong><br /><small>Cerrados</small></div>
                  <div><strong>{kpis['8D']?.avgDaysToClose || 0}</strong><br /><small>Días Promedio</small></div>
                  <div><strong>{kpis['8D']?.onTimeRate || 0}%</strong><br /><small>A Tiempo</small></div>
                </div>
                {kpis['8D']?.totalSavings > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fbbf24', borderRadius: '4px' }}>
                    <strong>${(kpis['8D']?.totalSavings || 0).toLocaleString()}</strong> Ahorros
                  </div>
                )}
              </div>

              {/* QAR */}
              <div style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#991b1b' }}>QAR Defectos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['QAR']?.totalQars || 0}</strong><br /><small>Total QARs</small></div>
                  <div><strong>{kpis['QAR']?.openCount || 0}</strong><br /><small>Abiertos</small></div>
                  <div><strong>{kpis['QAR']?.criticalCount || 0}</strong><br /><small>Críticos</small></div>
                  <div><strong>{kpis['QAR']?.majorCount || 0}</strong><br /><small>Mayores</small></div>
                </div>
              </div>

              {/* MRB */}
              <div style={{ backgroundColor: '#dbeafe', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#0F3B5F' }}>MRB</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['MRB']?.totalCampaigns || 0}</strong><br /><small>Campañas</small></div>
                  <div><strong>{kpis['MRB']?.activeCampaigns || 0}</strong><br /><small>Activas</small></div>
                  <div><strong>${(kpis['MRB']?.totalScrapCost || 0).toLocaleString()}</strong><br /><small>Costo Scrap</small></div>
                  <div><strong>{kpis['MRB']?.totalInspectionHours || 0}</strong><br /><small>Hrs Inspección</small></div>
                </div>
              </div>

              {/* ECR */}
              <div style={{ backgroundColor: '#f3e8ff', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#6b21a8' }}>ECR Cambios</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['ECR']?.totalChanges || 0}</strong><br /><small>Total Cambios</small></div>
                  <div><strong>{kpis['ECR']?.approvedCount || 0}</strong><br /><small>Aprobados</small></div>
                  <div><strong>{kpis['ECR']?.highRiskCount || 0}</strong><br /><small>Alto Riesgo</small></div>
                  <div><strong>{kpis['ECR']?.avgCycleDays || 0}</strong><br /><small>Días Ciclo</small></div>
                </div>
              </div>

              {/* AUDIT */}
              <div style={{ backgroundColor: '#d1fae5', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#065f46' }}>Auditorias</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['AUDIT']?.completedAudits || 0}</strong><br /><small>Completadas</small></div>
                  <div><strong>{kpis['AUDIT']?.pendingAudits || 0}</strong><br /><small>Pendientes</small></div>
                  <div><strong>{kpis['AUDIT']?.totalNCs || 0}</strong><br /><small>No Conformidades</small></div>
                  <div><strong>{kpis['AUDIT']?.ncClosureRate || 0}%</strong><br /><small>% Cierre NC</small></div>
                </div>
              </div>

              {/* WORKLOAD */}
              <div style={{ backgroundColor: '#e0e7ff', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px', color: '#3730a3' }}>Workload</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>{kpis['WORKLOAD']?.totalActivities || 0}</strong><br /><small>Actividades</small></div>
                  <div><strong>{kpis['WORKLOAD']?.completedCount || 0}</strong><br /><small>Completadas</small></div>
                  <div><strong>{kpis['WORKLOAD']?.completionRate || 0}%</strong><br /><small>% Completado</small></div>
                  <div><strong>{kpis['WORKLOAD']?.avgProgress || 0}%</strong><br /><small>Progreso Prom</small></div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PREVIOUS ACTIONS TAB */}
        {activeTab === 'previous' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: themeColors.primary }}>Seguimiento de Acciones Previas (9.3.2.a)</h3>

            {previousActions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: themeColors.textMuted }}>
                No hay acciones pendientes de revisiones anteriores
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: themeColors.bgPanel }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Acta</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Acción</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Responsable</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Fecha Límite</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previousActions.map(action => (
                    <tr key={action.id}>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>{action.actaNumber}</td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>{action.description}</td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>{action.responsibleName}</td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, textAlign: 'center', color: themeColors.text }}>
                        {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, textAlign: 'center' }}>
                        {getStatusBadge(action.status === 'pending' ? 'partial' : action.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: themeColors.primary }}>Checklist ISO/IATF 9.3</h3>

            {/* Inputs */}
            <h4 style={{ color: themeColors.success, marginBottom: '10px' }}>Entradas (9.3.2)</h4>
            <div style={{ marginBottom: '30px' }}>
              {checklist.inputs?.map(item => (
                <div key={item.id} style={{ padding: '15px', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: themeColors.text }}>
                      <span style={{ color: themeColors.accent }}>{item.clause}</span> - {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: themeColors.textMuted, marginTop: '4px' }}>{item.description}</div>
                  </div>
                  <select
                    value={checklistResponses[item.id]?.status || ''}
                    onChange={(e) => updateChecklistItem(item.id, 'status', e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, width: '100px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="ok">OK</option>
                    <option value="partial">Parcial</option>
                    <option value="nok">NOK</option>
                    <option value="na">N/A</option>
                  </select>
                  <input
                    type="text"
                    value={checklistResponses[item.id]?.comments || ''}
                    onChange={(e) => updateChecklistItem(item.id, 'comments', e.target.value)}
                    placeholder="Comentarios..."
                    style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, width: '250px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
                  />
                </div>
              ))}
            </div>

            {/* Outputs */}
            <h4 style={{ color: themeColors.primary, marginBottom: '10px' }}>Salidas (9.3.3)</h4>
            <div>
              {checklist.outputs?.map(item => (
                <div key={item.id} style={{ padding: '15px', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: themeColors.text }}>
                      <span style={{ color: themeColors.accent }}>{item.clause}</span> - {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: themeColors.textMuted, marginTop: '4px' }}>{item.description}</div>
                  </div>
                  <select
                    value={checklistResponses[item.id]?.status || ''}
                    onChange={(e) => updateChecklistItem(item.id, 'status', e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, width: '100px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="ok">OK</option>
                    <option value="partial">Parcial</option>
                    <option value="nok">NOK</option>
                    <option value="na">N/A</option>
                  </select>
                  <input
                    type="text"
                    value={checklistResponses[item.id]?.comments || ''}
                    onChange={(e) => updateChecklistItem(item.id, 'comments', e.target.value)}
                    placeholder="Comentarios..."
                    style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${themeColors.border}`, width: '250px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DECISIONS TAB */}
        {activeTab === 'decisions' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: themeColors.text }}>Decisiones y Resumen Ejecutivo</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Resumen Ejecutivo</label>
              <textarea
                value={formData.executiveSummary}
                onChange={(e) => setFormData(prev => ({ ...prev, executiveSummary: e.target.value }))}
                rows={6}
                placeholder="Resumen de los puntos clave discutidos y conclusiones principales..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${themeColors.border}`, resize: 'vertical', backgroundColor: themeColors.bgCard, color: themeColors.text }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Próxima Revisión</label>
              <input
                type="date"
                value={formData.nextReviewDate}
                onChange={(e) => setFormData(prev => ({ ...prev, nextReviewDate: e.target.value }))}
                style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.bgCard, color: themeColors.text }}
              />
            </div>

            <div style={{ backgroundColor: themeColors.bgPanel, padding: '20px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 15px', color: themeColors.text }}>Acciones Generadas</h4>
              <p style={{ color: themeColors.textMuted, fontSize: '14px' }}>
                Las acciones se crean desde el checklist marcando items como NOK o Parcial.
                Cada acción genera automáticamente una actividad en Workload.
              </p>
            </div>
          </div>
        )}

        {/* ATTENDEES TAB */}
        {activeTab === 'attendees' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: themeColors.text }}>Asistentes y Firmas</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Agregar Asistente</label>
              <select
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  if (userId && !formData.attendees.find(a => a.userId === userId)) {
                    const userInfo = users.find(u => u.id === userId);
                    setFormData(prev => ({
                      ...prev,
                      attendees: [...prev.attendees, {
                        userId,
                        name: `${userInfo.firstName} ${userInfo.lastName}`,
                        position: userInfo.position || '',
                        present: true,
                        signature: null,
                        signedAt: null
                      }]
                    }));
                  }
                  e.target.value = '';
                }}
                style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${themeColors.border}`, width: '300px', backgroundColor: themeColors.bgCard, color: themeColors.text }}
              >
                <option value="">Seleccionar usuario...</option>
                {users.filter(u => !formData.attendees.find(a => a.userId === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} - {u.position}</option>
                ))}
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: themeColors.bgPanel }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Nombre</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Puesto</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Presente</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Firma</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {formData.attendees.map((attendee, idx) => (
                  <tr key={attendee.userId}>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>{attendee.name}</td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, color: themeColors.text }}>{attendee.position}</td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={attendee.present}
                        onChange={(e) => {
                          const updated = [...formData.attendees];
                          updated[idx].present = e.target.checked;
                          setFormData(prev => ({ ...prev, attendees: updated }));
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, textAlign: 'center' }}>
                      {attendee.signature ? (
                        <span style={{ color: '#2E7D32' }}> Firmado</span>
                      ) : (
                        <span style={{ color: themeColors.textDim }}>Pendiente</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${themeColors.border}`, textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            attendees: prev.attendees.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default ManagementReview;
