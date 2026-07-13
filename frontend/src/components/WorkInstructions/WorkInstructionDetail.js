import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workInstructionsService from '../../services/workInstructionsService';
import wiPlantConfigService from '../../services/wiPlantConfigService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const WorkInstructionDetail = () => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [workInstruction, setWorkInstruction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);

  // Edit mode for overview
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // Available items for linking
  const [availableProjects, setAvailableProjects] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);

  // New step data
  const [newStep, setNewStep] = useState({
    title: '',
    description: '',
    estimatedTimeMinutes: 0,
    stepType: 'regular',
    imageUrl: '',
    stationId: ''
  });

  // Station hierarchy for dropdown
  const [stationHierarchy, setStationHierarchy] = useState([]);

  // Risk assessment
  const [riskData, setRiskData] = useState(null);
  const [criteriaDefinitions, setCriteriaDefinitions] = useState([]);

  // ILUO Certifications
  const [certifications, setCertifications] = useState([]);
  const [availableOperators, setAvailableOperators] = useState([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certHistory, setCertHistory] = useState([]);
  const [certScales, setCertScales] = useState([]);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newCert, setNewCert] = useState({
    operatorId: '',
    level: 1,
    scaleId: null,
    trainingType: 'INTERNAL',
    notes: '',
    evidenceFile: null
  });
  const [uploadingEvidence, setUploadingEvidence] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchWorkInstruction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await workInstructionsService.getById(id);
      setWorkInstruction(response.workInstruction);
      setEditData({
        title: response.workInstruction.title,
        description: response.workInstruction.description || '',
        validFrom: response.workInstruction.validFrom?.split('T')[0] || '',
        validTo: response.workInstruction.validTo?.split('T')[0] || '',
        status: response.workInstruction.status
      });
    } catch (error) {
      console.error('Error fetching work instruction:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkInstruction();
  }, [fetchWorkInstruction]);

  useEffect(() => {
    if (activeTab === 'risk') {
      fetchRiskAssessment();
    }
    if (activeTab === 'certifications') {
      fetchCertifications();
    }
  }, [activeTab, id]);

  const fetchRiskAssessment = async () => {
    try {
      const response = await workInstructionsService.getRiskAssessment(id);
      setRiskData(response.riskAssessment);
      setCriteriaDefinitions(response.criteriaDefinitions || []);
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
    }
  };

  const fetchCertifications = async () => {
    try {
      const response = await workInstructionsService.getCertifications(id);
      setCertifications(response.certifications || []);
      // Also fetch history
      const histResponse = await workInstructionsService.getCertificationHistory(id, 20);
      setCertHistory(histResponse.history || []);
    } catch (error) {
      console.error('Error fetching certifications:', error);
    }
  };

  const fetchCertificationScales = async () => {
    try {
      const response = await workInstructionsService.getCertificationScales();
      const scales = response.scales || [];
      setCertScales(scales);
      // Set default scale
      const defaultScale = scales.find(s => s.isDefault) || scales[0];
      if (defaultScale) {
        setSelectedScale(defaultScale);
        setNewCert(prev => ({ ...prev, scaleId: defaultScale.id, level: defaultScale.minValue }));
      }
    } catch (error) {
      console.error('Error fetching certification scales:', error);
    }
  };

  const fetchAvailableOperatorsForCert = async () => {
    try {
      const response = await workInstructionsService.getAvailableOperators(id);
      setAvailableOperators(response.operators || []);
    } catch (error) {
      console.error('Error fetching available operators:', error);
    }
  };

  const handleSaveCertification = async () => {
    if (!newCert.operatorId) {
      alert('Selecciona un operador');
      return;
    }
    try {
      const result = await workInstructionsService.saveCertification(id, {
        operatorId: parseInt(newCert.operatorId),
        level: parseInt(newCert.level),
        trainingType: newCert.trainingType,
        notes: newCert.notes,
        certifiedBy: user.id
      });

      // If there's an evidence file, upload it
      if (newCert.evidenceFile && result.certification?.id) {
        await workInstructionsService.uploadCertificationEvidence(id, result.certification.id, newCert.evidenceFile);
      }

      setShowCertModal(false);
      setNewCert({ operatorId: '', level: 1, trainingType: 'INTERNAL', notes: '', evidenceFile: null });
      fetchCertifications();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUploadEvidence = async (certId, file) => {
    if (!file) return;
    setUploadingEvidence(certId);
    try {
      await workInstructionsService.uploadCertificationEvidence(id, certId, file);
      fetchCertifications();
    } catch (error) {
      alert('Error subiendo evidencia: ' + error.message);
    } finally {
      setUploadingEvidence(null);
    }
  };

  const handleDownloadEvidence = async (certId, filename) => {
    try {
      const url = workInstructionsService.getCertificationEvidenceUrl(id, certId);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename || 'evidencia';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Error descargando evidencia');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateCertLevel = async (certId, newLevel) => {
    try {
      await workInstructionsService.updateCertification(id, certId, {
        level: parseInt(newLevel),
        certifiedBy: user.id
      });
      fetchCertifications();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRevokeCertification = async (certId) => {
    const reason = prompt('Motivo de la revocación:');
    if (reason === null) return;
    try {
      await workInstructionsService.revokeCertification(id, certId, user.id, reason);
      fetchCertifications();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // ILUO Scale: I(1), L(2), U(3), O(4) - de menor a mayor competencia
  const getLevelBadge = (level, levelCode) => {
    const levelStyles = {
      'I': { bg: '#ef4444', label: 'I', desc: 'Observador' },
      'L': { bg: '#f59e0b', label: 'L', desc: 'Bajo Supervisión' },
      'U': { bg: '#22c55e', label: 'U', desc: 'Libre' },
      'O': { bg: '#0ea5e9', label: 'O', desc: 'Instructor' }
    };
    const code = levelCode || ['', 'I', 'L', 'U', 'O'][level] || 'I';
    const s = levelStyles[code] || levelStyles['I'];
    return (
      <span style={{
        backgroundColor: s.bg, color: 'white', padding: '4px 12px',
        borderRadius: '4px', fontSize: '13px', fontWeight: 'bold',
        display: 'inline-flex', alignItems: 'center', gap: '6px'
      }}>
        {s.label} <span style={{ fontWeight: 'normal', fontSize: '11px' }}>({level})</span>
      </span>
    );
  };

  const getCertStatusBadge = (status) => {
    const statusStyles = {
      'ACTIVE': { bg: t.success, label: 'Activo' },
      'EXPIRED': { bg: t.error, label: 'Vencido' },
      'EXPIRING_SOON': { bg: t.warning, label: 'Por vencer' },
      'REVOKED': { bg: t.textMuted, label: 'Revocado' }
    };
    const s = statusStyles[status] || statusStyles['ACTIVE'];
    return (
      <span style={{ backgroundColor: s.bg, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
        {s.label}
      </span>
    );
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await workInstructionsService.getAvailableProjects(id);
      setAvailableProjects(response.projects || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAvailableParts = async () => {
    try {
      const response = await workInstructionsService.getAvailableParts(id);
      setAvailableParts(response.parts || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await workInstructionsService.getAvailableUsers(id);
      setAvailableUsers(response.users || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStationHierarchy = async () => {
    try {
      const response = await wiPlantConfigService.getStationHierarchy();
      setStationHierarchy(response.stations || []);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const handleSaveOverview = async () => {
    try {
      setSaving(true);
      await workInstructionsService.update(id, {
        ...editData,
        updatedBy: user.id
      });
      setEditMode(false);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkProject = async (projectId) => {
    try {
      await workInstructionsService.linkProject(id, projectId);
      setShowProjectModal(false);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUnlinkProject = async (projectId) => {
    if (!window.confirm('¿Desvincular proyecto? Las partes de este proyecto también serán desvinculadas.')) return;
    try {
      await workInstructionsService.unlinkProject(id, projectId);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleLinkPart = async (partId) => {
    try {
      await workInstructionsService.linkPart(id, partId);
      setShowPartModal(false);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUnlinkPart = async (partId) => {
    if (!window.confirm('¿Desvincular parte?')) return;
    try {
      await workInstructionsService.unlinkPart(id, partId);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleAssignUser = async (userId, accessType) => {
    try {
      await workInstructionsService.assignUser(id, userId, accessType, user.id);
      setShowUserModal(false);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('¿Remover usuario?')) return;
    try {
      await workInstructionsService.removeUser(id, userId);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.title) {
      alert('El título es requerido');
      return;
    }
    try {
      await workInstructionsService.addStep(id, {
        ...newStep,
        stationId: newStep.stationId || null,
        createdBy: user.id
      });
      setShowStepModal(false);
      setNewStep({ title: '', description: '', estimatedTimeMinutes: 0, stepType: 'regular', imageUrl: '', stationId: '' });
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm('¿Eliminar paso?')) return;
    try {
      await workInstructionsService.deleteStep(id, stepId, user.id);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleMoveStep = async (stepId, direction) => {
    const steps = [...workInstruction.steps];
    const index = steps.findIndex(s => s.id === stepId);
    if (direction === 'up' && index > 0) {
      [steps[index], steps[index - 1]] = [steps[index - 1], steps[index]];
    } else if (direction === 'down' && index < steps.length - 1) {
      [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
    } else {
      return;
    }

    const stepOrders = steps.map((s, i) => ({ id: s.id, order: i }));
    try {
      await workInstructionsService.reorderSteps(id, stepOrders, user.id);
      fetchWorkInstruction();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSaveRiskAssessment = async () => {
    try {
      setSaving(true);
      await workInstructionsService.updateRiskAssessment(id, {
        criteria: riskData?.criteria || {},
        status: riskData?.status || 'pending',
        updatedBy: user.id
      });
      alert('Risk Assessment guardado');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateCriterion = (key, field, value) => {
    setRiskData(prev => ({
      ...prev,
      criteria: {
        ...prev?.criteria,
        [key]: {
          ...prev?.criteria?.[key],
          [field]: value
        }
      }
    }));
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: { bg: t.textMuted, label: 'Borrador' },
      active: { bg: t.success, label: 'Activa' },
      archived: { bg: t.warning, label: 'Archivada' }
    };
    const s = statusStyles[status] || statusStyles.draft;
    return (
      <span style={{ backgroundColor: s.bg, color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
        {s.label}
      </span>
    );
  };

  const getStepTypeBadge = (type) => {
    const typeStyles = {
      regular: { bg: t.textMuted, label: 'Regular' },
      safety: { bg: t.error, label: 'Seguridad' },
      legal: { bg: '#8b5cf6', label: 'Legal' },
      warranty: { bg: t.warning, label: 'Garantia' },
      quality: { bg: t.accent, label: 'Calidad' },
      critical: { bg: t.error, label: 'Critico' }
    };
    const s = typeStyles[type] || typeStyles.regular;
    return (
      <span style={{ backgroundColor: s.bg, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
        {s.label}
      </span>
    );
  };

  const getAccessTypeBadge = (type) => {
    const accessStyles = {
      viewer: { bg: t.textMuted, label: 'Viewer' },
      editor: { bg: t.accent, label: 'Editor' },
      approver: { bg: t.success, label: 'Approver' }
    };
    const s = accessStyles[type] || accessStyles.viewer;
    return (
      <span style={{ backgroundColor: s.bg, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!workInstruction) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Work Instruction no encontrada</p>
        <button onClick={() => navigate('/work-instructions')}>Volver</button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '' },
    { id: 'steps', label: 'Steps', icon: '', count: workInstruction.steps?.length || 0 },
    { id: 'certifications', label: 'Certificaciones ILUO', icon: '', count: certifications.length },
    { id: 'risk', label: 'Risk Assessment', icon: '' },
    { id: 'revisions', label: 'Revisiones', icon: '', count: workInstruction.revisions?.length || 0 }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: t.bg }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/work-instructions')}
          style={{ background: 'none', border: 'none', color: t.primary, cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          ← Volver a lista
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: t.primary }}>{workInstruction.title}</h2>
            <p style={{ margin: '5px 0', color: t.textMuted }}>
              {workInstruction.clientName} • Rev. {workInstruction.currentRevision}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {getStatusBadge(workInstruction.status)}
            {workInstruction.referenceImage && (
              <img
                src={workInstruction.referenceImage}
                alt="Referencia"
                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${t.border}` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: `2px solid ${t.border}`, marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === tab.id ? t.primary : 'transparent',
              color: activeTab === tab.id ? 'white' : t.textMuted,
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
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : t.bgPanel,
                color: activeTab === tab.id ? 'white' : t.text,
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
      <div style={{ backgroundColor: t.bgCard, borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Basic Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: t.primary }}>Informacion General</h3>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${t.primary}`, background: t.bgCard, color: t.primary, cursor: 'pointer' }}
                >
                  Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSaveOverview} disabled={saving} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: t.primary, color: 'white', cursor: 'pointer' }}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Titulo</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Estado</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activa</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Descripcion</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, resize: 'vertical', backgroundColor: t.bgCard, color: t.text }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Valido desde</label>
                  <input
                    type="date"
                    value={editData.validFrom}
                    onChange={(e) => setEditData({ ...editData, validFrom: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Valido hasta</label>
                  <input
                    type="date"
                    value={editData.validTo}
                    onChange={(e) => setEditData({ ...editData, validTo: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: t.text }}>
                <div><strong>Cliente:</strong> {workInstruction.clientName}</div>
                <div><strong>Revision:</strong> {workInstruction.currentRevision}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Descripcion:</strong> {workInstruction.description || '-'}</div>
                <div><strong>Valido desde:</strong> {workInstruction.validFrom ? new Date(workInstruction.validFrom).toLocaleDateString() : '-'}</div>
                <div><strong>Valido hasta:</strong> {workInstruction.validTo ? new Date(workInstruction.validTo).toLocaleDateString() : '-'}</div>
              </div>
            )}

            <hr style={{ margin: '30px 0', border: 'none', borderTop: `1px solid ${t.border}` }} />

            {/* Projects */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: t.text }}>Proyectos Vinculados ({workInstruction.projects?.length || 0})</h4>
                <button
                  onClick={() => { fetchAvailableProjects(); setShowProjectModal(true); }}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: t.primary, color: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Agregar
                </button>
              </div>
              {workInstruction.projects?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {workInstruction.projects.map(p => (
                    <div key={p.id} style={{ backgroundColor: t.bgPanel, padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: t.text }}>{p.projectNumber} - {p.projectName}</span>
                      <button onClick={() => handleUnlinkProject(p.id)} style={{ background: 'none', border: 'none', color: t.error, cursor: 'pointer', fontSize: '16px' }}>x</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: t.textMuted, fontStyle: 'italic' }}>No hay proyectos vinculados</p>
              )}
            </div>

            {/* Parts */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: t.text }}>Part Numbers ({workInstruction.parts?.length || 0})</h4>
                <button
                  onClick={() => { fetchAvailableParts(); setShowPartModal(true); }}
                  disabled={!workInstruction.projects?.length}
                  style={{
                    padding: '6px 12px', borderRadius: '4px', border: 'none',
                    background: workInstruction.projects?.length ? t.primary : t.textDim,
                    color: 'white', cursor: workInstruction.projects?.length ? 'pointer' : 'not-allowed', fontSize: '13px'
                  }}
                >
                  + Agregar
                </button>
              </div>
              {!workInstruction.projects?.length && (
                <p style={{ color: t.warning, fontSize: '13px' }}>Vincula proyectos primero para ver partes disponibles</p>
              )}
              {workInstruction.parts?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bgPanel }}>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text }}>Part Number</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text }}>Nombre</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text }}>Proyecto</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {workInstruction.parts.map(p => (
                      <tr key={p.id}>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{p.partNumber}</td>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{p.partName}</td>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{p.projectName}</td>
                        <td style={{ padding: '8px', borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                          <button onClick={() => handleUnlinkPart(p.id)} style={{ background: 'none', border: 'none', color: t.error, cursor: 'pointer' }}>x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : workInstruction.projects?.length > 0 && (
                <p style={{ color: t.textMuted, fontStyle: 'italic' }}>No hay partes vinculadas</p>
              )}
            </div>

            {/* Users */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: t.text }}>Usuarios Asignados ({workInstruction.assignedUsers?.length || 0})</h4>
                <button
                  onClick={() => { fetchAvailableUsers(); setShowUserModal(true); }}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: t.primary, color: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  + Asignar
                </button>
              </div>
              {workInstruction.assignedUsers?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {workInstruction.assignedUsers.map(u => (
                    <div key={u.userId} style={{ backgroundColor: t.bgPanel, padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: t.text }}>{u.firstName} {u.lastName}</span>
                      {getAccessTypeBadge(u.accessType)}
                      <button onClick={() => handleRemoveUser(u.userId)} style={{ background: 'none', border: 'none', color: t.error, cursor: 'pointer', fontSize: '16px' }}>x</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: t.textMuted, fontStyle: 'italic' }}>No hay usuarios asignados</p>
              )}
            </div>
          </div>
        )}

        {/* STEPS TAB */}
        {activeTab === 'steps' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: t.primary }}>Pasos de la Instruccion</h3>
              <button
                onClick={() => { fetchStationHierarchy(); setShowStepModal(true); }}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: t.primary, color: 'white', cursor: 'pointer' }}
              >
                + Agregar Paso
              </button>
            </div>

            {workInstruction.steps?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {workInstruction.steps.map((step, index) => (
                  <div key={step.id} style={{ backgroundColor: t.bgPanel, borderRadius: '8px', padding: '15px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ backgroundColor: t.primary, color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                          {index + 1}
                        </span>
                        {getStepTypeBadge(step.stepType)}
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleMoveStep(step.id, 'up')}
                          disabled={index === 0}
                          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1, color: t.text }}
                        >^</button>
                        <button
                          onClick={() => handleMoveStep(step.id, 'down')}
                          disabled={index === workInstruction.steps.length - 1}
                          style={{ background: 'none', border: 'none', cursor: index === workInstruction.steps.length - 1 ? 'not-allowed' : 'pointer', opacity: index === workInstruction.steps.length - 1 ? 0.3 : 1, color: t.text }}
                        >v</button>
                        <button onClick={() => handleDeleteStep(step.id)} style={{ background: 'none', border: 'none', color: t.error, cursor: 'pointer' }}>X</button>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 8px', color: t.primary }}>{step.title || `Paso ${index + 1}`}</h4>
                    <p style={{ margin: '0 0 10px', color: t.textMuted, fontSize: '14px' }}>{step.description || 'Sin descripcion'}</p>

                    {step.imageUrl && (
                      <img src={step.imageUrl} alt={`Step ${index + 1}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: t.textMuted }}>
                      <span>{step.estimatedTimeMinutes || 0} min</span>
                      {step.stationName && (
                        <span style={{ backgroundColor: t.id === 'dark' ? 'rgba(199, 119, 0, 0.2)' : '#fef3c7', color: t.warning, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          {step.stationName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                <p>No hay pasos definidos</p>
                <p style={{ fontSize: '14px' }}>Haz clic en "Agregar Paso" para comenzar</p>
              </div>
            )}
          </div>
        )}

        {/* CERTIFICATIONS TAB */}
        {activeTab === 'certifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: t.primary }}>Certificaciones ILUO de Operadores</h3>
              <button
                onClick={() => { fetchAvailableOperatorsForCert(); fetchCertificationScales(); setShowCertModal(true); }}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: t.primary, color: 'white', cursor: 'pointer' }}
              >
                + Certificar Operador
              </button>
            </div>

            {/* ILUO Legend - I(1), L(2), U(3), O(4) de menor a mayor */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>I</span>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Observador (1)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>L</span>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Bajo Supervisión (2)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>U</span>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Libre (3)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: '#0ea5e9', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>O</span>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Instructor (4)</span>
              </div>
            </div>

            {/* Certifications List */}
            {certifications.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: t.bgPanel }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text }}>Operador</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text }}>Nivel</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text }}>Fecha Cert.</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text }}>Vence</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text }}>Estado</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, width: '100px' }}>Evidencia</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, width: '150px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {certifications.map(cert => (
                    <tr key={cert.id}>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{cert.operatorName}</span>
                          <button
                            onClick={() => navigate(`/work-instructions/operator/${cert.operatorId}`)}
                            title="Ver perfil ILUO del operador"
                            style={{
                              background: 'none', border: `1px solid ${t.border}`, borderRadius: '4px',
                              padding: '2px 6px', cursor: 'pointer', fontSize: '10px', color: t.primary
                            }}
                          >
                            Ver Perfil
                          </button>
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted }}>{cert.position || ''}</div>
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                        {getLevelBadge(cert.level, cert.levelCode)}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center', color: t.text }}>
                        {cert.trainingType === 'INTERNAL' ? 'Interno' : 'Externo'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center', color: t.text }}>
                        {cert.certifiedDate ? new Date(cert.certifiedDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center', color: t.text }}>
                        {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'Sin vencimiento'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                        {getCertStatusBadge(cert.effectiveStatus)}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                        {cert.evidencePath ? (
                          <button
                            onClick={() => handleDownloadEvidence(cert.id, cert.evidenceFilename)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, background: t.bgPanel, color: t.text, cursor: 'pointer', fontSize: '11px' }}
                            title={cert.evidenceFilename}
                          >
                            📎 Descargar
                          </button>
                        ) : (
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              onChange={(e) => handleUploadEvidence(cert.id, e.target.files[0])}
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            />
                            <span style={{ padding: '4px 8px', borderRadius: '4px', border: `1px dashed ${t.border}`, background: 'transparent', color: t.textMuted, fontSize: '11px' }}>
                              {uploadingEvidence === cert.id ? 'Subiendo...' : '+ Subir'}
                            </span>
                          </label>
                        )}
                      </td>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                        {cert.status === 'ACTIVE' && (
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <select
                              value={cert.level}
                              onChange={(e) => handleUpdateCertLevel(cert.id, e.target.value)}
                              style={{ padding: '4px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text, fontSize: '12px' }}
                            >
                              <option value="1">1 - I</option>
                              <option value="2">2 - I</option>
                              <option value="3">3 - L</option>
                              <option value="4">4 - L</option>
                              <option value="5">5 - U</option>
                            </select>
                            <button
                              onClick={() => handleRevokeCertification(cert.id)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: t.error, color: 'white', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Revocar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                <p>No hay operadores certificados en esta WI</p>
                <p style={{ fontSize: '14px' }}>Haz clic en "Certificar Operador" para comenzar</p>
              </div>
            )}

            {/* Certification History */}
            {certHistory.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h4 style={{ color: t.primary, marginBottom: '15px' }}>Historial de Cambios</h4>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {certHistory.map(h => (
                    <div key={h.id} style={{
                      padding: '10px 15px', borderLeft: `3px solid ${t.primary}`, marginBottom: '8px',
                      backgroundColor: t.bgPanel, borderRadius: '0 6px 6px 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: t.text }}>{h.operatorName}</strong>
                          <span style={{ marginLeft: '10px', color: t.textMuted, fontSize: '13px' }}>
                            {h.changeReason === 'INITIAL' && 'Certificación inicial'}
                            {h.changeReason === 'UPGRADE' && `Nivel ${h.previousLevel} → ${h.newLevel}`}
                            {h.changeReason === 'DOWNGRADE' && `Nivel ${h.previousLevel} → ${h.newLevel}`}
                            {h.changeReason === 'RECERTIFICATION' && 'Recertificación'}
                            {h.changeReason === 'REVOKE' && 'Revocado'}
                          </span>
                        </div>
                        <span style={{ color: t.textDim, fontSize: '12px' }}>
                          {new Date(h.createdAt).toLocaleString()} • {h.changedByName || 'Sistema'}
                        </span>
                      </div>
                      {h.notes && <p style={{ margin: '5px 0 0', color: t.textMuted, fontSize: '13px' }}>{h.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RISK ASSESSMENT TAB */}
        {activeTab === 'risk' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: t.primary }}>Risk Assessment</h3>
              <button
                onClick={handleSaveRiskAssessment}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: t.success, color: 'white', cursor: 'pointer' }}
              >
                {saving ? 'Guardando...' : 'Guardar Risk Assessment'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {criteriaDefinitions.map(criterion => {
                const data = riskData?.criteria?.[criterion.criteriaKey] || {};
                return (
                  <div key={criterion.criteriaKey} style={{ backgroundColor: t.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                    <div style={{ marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 5px', color: t.primary }}>{criterion.displayOrder}. {criterion.criteriaName}</h4>
                      <p style={{ margin: 0, color: t.textMuted, fontSize: '14px' }}>{criterion.description}</p>
                      <p style={{ margin: '5px 0 0', color: t.textDim, fontSize: '12px', fontStyle: 'italic' }}>{criterion.scoreGuide}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>Score (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={data.score || ''}
                          onChange={(e) => updateCriterion(criterion.criteriaKey, 'score', parseInt(e.target.value) || null)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>Acciones Recomendadas</label>
                        <input
                          type="text"
                          value={data.actionsRecommended || ''}
                          onChange={(e) => updateCriterion(criterion.criteriaKey, 'actionsRecommended', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>Fecha Objetivo</label>
                        <input
                          type="date"
                          value={data.targetDate || ''}
                          onChange={(e) => updateCriterion(criterion.criteriaKey, 'targetDate', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>Score Revisado</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={data.revisedScore || ''}
                          onChange={(e) => updateCriterion(criterion.criteriaKey, 'revisedScore', parseInt(e.target.value) || null)}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {riskData && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: t.id === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#e0f2fe', borderRadius: '8px', display: 'flex', gap: '30px', color: t.text }}>
                <div><strong>Total Score:</strong> {riskData.totalScore || 0}</div>
                <div><strong>Total Revisado:</strong> {riskData.totalRevisedScore || 0}</div>
              </div>
            )}
          </div>
        )}

        {/* REVISIONS TAB */}
        {activeTab === 'revisions' && (
          <div>
            <h3 style={{ margin: '0 0 20px', color: t.primary }}>Historial de Revisiones</h3>

            {workInstruction.revisions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {workInstruction.revisions.map(rev => (
                  <div key={rev.id} style={{ backgroundColor: t.bgPanel, padding: '15px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ backgroundColor: t.primary, color: 'white', padding: '2px 10px', borderRadius: '4px', fontWeight: 'bold', marginRight: '10px' }}>
                          Rev. {rev.revisionNumber}
                        </span>
                        <span style={{ color: t.textMuted }}>{rev.changeSummary || 'Sin descripcion'}</span>
                      </div>
                      <div style={{ color: t.textDim, fontSize: '13px' }}>
                        {rev.createdByName} - {new Date(rev.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: t.textMuted, textAlign: 'center', padding: '40px' }}>No hay revisiones registradas</p>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Project Modal */}
      {showProjectModal && (
        <Modal title="Agregar Proyecto" onClose={() => setShowProjectModal(false)}>
          {availableProjects.length > 0 ? (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {availableProjects.map(p => (
                <div key={p.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{p.projectNumber} - {p.projectName}</span>
                  <button onClick={() => handleLinkProject(p.id)} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#1e3a5f', color: 'white', cursor: 'pointer' }}>
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay proyectos disponibles para vincular</p>
          )}
        </Modal>
      )}

      {/* Part Modal */}
      {showPartModal && (
        <Modal title="Agregar Part Number" onClose={() => setShowPartModal(false)}>
          {availableParts.length > 0 ? (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {availableParts.map(p => (
                <div key={p.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>{p.partNumber}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{p.partName} • {p.projectName}</div>
                  </div>
                  <button onClick={() => handleLinkPart(p.id)} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#1e3a5f', color: 'white', cursor: 'pointer' }}>
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay partes disponibles. Verifica que los proyectos vinculados tengan partes.</p>
          )}
        </Modal>
      )}

      {/* User Modal */}
      {showUserModal && (
        <Modal title="Asignar Usuario" onClose={() => setShowUserModal(false)}>
          {availableUsers.length > 0 ? (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {availableUsers.map(u => (
                <div key={u.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleAssignUser(u.id, 'viewer')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#6b7280', color: 'white', cursor: 'pointer', fontSize: '11px' }}>
                      Viewer
                    </button>
                    <button onClick={() => handleAssignUser(u.id, 'editor')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#0072CE', color: 'white', cursor: 'pointer', fontSize: '11px' }}>
                      Editor
                    </button>
                    <button onClick={() => handleAssignUser(u.id, 'approver')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#2E7D32', color: 'white', cursor: 'pointer', fontSize: '11px' }}>
                      Approver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay usuarios disponibles para asignar</p>
          )}
        </Modal>
      )}

      {/* Step Modal */}
      {showStepModal && (
        <Modal title="Agregar Paso" onClose={() => setShowStepModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Título *</label>
              <input
                type="text"
                value={newStep.title}
                onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                placeholder="Ej: Localizar el número de parte"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Descripción</label>
              <textarea
                value={newStep.description}
                onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tiempo Estimado (min)</label>
                <input
                  type="number"
                  min="0"
                  value={newStep.estimatedTimeMinutes}
                  onChange={(e) => setNewStep({ ...newStep, estimatedTimeMinutes: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tipo de Paso</label>
                <select
                  value={newStep.stepType}
                  onChange={(e) => setNewStep({ ...newStep, stepType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="regular">Regular</option>
                  <option value="safety">Seguridad</option>
                  <option value="legal">Legal</option>
                  <option value="warranty">Garantía</option>
                  <option value="quality">Calidad</option>
                  <option value="critical">Crítico</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Estación de Trabajo</label>
              <select
                value={newStep.stationId}
                onChange={(e) => setNewStep({ ...newStep, stationId: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="">Sin estación asignada</option>
                {stationHierarchy.map(s => (
                  <option key={s.stationId} value={s.stationId}>
                    {s.fullPath}
                  </option>
                ))}
              </select>
              {stationHierarchy.length === 0 && (
                <p style={{ fontSize: '12px', color: '#C77700', marginTop: '5px' }}>
                  No hay estaciones configuradas. <a href="/work-instructions-config" style={{ color: '#1e3a5f' }}>Configurar plantas</a>
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>URL de Imagen</label>
              <input
                type="text"
                value={newStep.imageUrl}
                onChange={(e) => setNewStep({ ...newStep, imageUrl: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowStepModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAddStep} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#1e3a5f', color: 'white', cursor: 'pointer' }}>
                Agregar Paso
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Certification Modal */}
      {showCertModal && (
        <Modal title="Certificar Operador" onClose={() => setShowCertModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Operador *</label>
              <select
                value={newCert.operatorId}
                onChange={(e) => setNewCert({ ...newCert, operatorId: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="">Seleccionar operador...</option>
                {availableOperators.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.firstName} {op.lastName} {op.position ? `- ${op.position}` : ''}
                  </option>
                ))}
              </select>
              {availableOperators.length === 0 && (
                <p style={{ fontSize: '12px', color: '#C77700', marginTop: '5px' }}>
                  Todos los operadores ya estan certificados en esta WI
                </p>
              )}
            </div>
            {/* Scale selector */}
            {certScales.length > 1 && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Escala de Evaluacion</label>
                <select
                  value={newCert.scaleId || ''}
                  onChange={(e) => {
                    const scaleId = parseInt(e.target.value);
                    const scale = certScales.find(s => s.id === scaleId);
                    setSelectedScale(scale);
                    setNewCert({ ...newCert, scaleId, level: scale?.minValue || 1 });
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  {certScales.map(scale => (
                    <option key={scale.id} value={scale.id}>
                      {scale.name} {scale.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                {selectedScale && (
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    {selectedScale.description}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Nivel {selectedScale?.code || 'ILUO'}
                </label>
                <select
                  value={newCert.level}
                  onChange={(e) => setNewCert({ ...newCert, level: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  {selectedScale?.levels?.length > 0 ? (
                    selectedScale.levels.map(lvl => (
                      <option key={lvl.levelValue} value={lvl.levelValue}>
                        {lvl.levelValue} - {lvl.code} ({lvl.label})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="1">1 - I (Observador)</option>
                      <option value="2">2 - L (Bajo Supervisión)</option>
                      <option value="3">3 - U (Libre)</option>
                      <option value="4">4 - O (Instructor)</option>
                    </>
                  )}
                </select>
                {selectedScale?.levels && (
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '11px' }}>
                    {selectedScale.levels.find(l => l.levelValue === newCert.level)?.description || ''}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tipo de Capacitacion</label>
                <select
                  value={newCert.trainingType}
                  onChange={(e) => setNewCert({ ...newCert, trainingType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="INTERNAL">Interna</option>
                  <option value="EXTERNAL">Externa</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Notas</label>
              <textarea
                value={newCert.notes}
                onChange={(e) => setNewCert({ ...newCert, notes: e.target.value })}
                rows={2}
                placeholder="Observaciones sobre la certificacion..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Evidencia (opcional)</label>
              <input
                type="file"
                onChange={(e) => setNewCert({ ...newCert, evidenceFile: e.target.files[0] })}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
              {newCert.evidenceFile && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Archivo: {newCert.evidenceFile.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowCertModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={handleSaveCertification}
                disabled={!newCert.operatorId}
                style={{
                  padding: '10px 20px', borderRadius: '6px', border: 'none',
                  background: newCert.operatorId ? '#1e3a5f' : '#ccc',
                  color: 'white', cursor: newCert.operatorId ? 'pointer' : 'not-allowed'
                }}
              >
                Certificar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Simple Modal Component
const Modal = ({ title, children, onClose }) => {
  const { theme: t } = useTheme();
  return (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div style={{ backgroundColor: t.bgCard, padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#1e3a5f' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>×</button>
      </div>
      {children}
    </div>
  </div>
  );
};

export default WorkInstructionDetail;
