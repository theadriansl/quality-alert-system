import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import riskMatrixService from '../../services/riskMatrixService';
import teamTemplateService from '../../services/teamTemplateService';
import impactAreasService from '../../services/impactAreasService';

const ECRTeamTab = ({ data, onDataUpdate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const [users, setUsers] = useState([]);
  const [reviewBoard, setReviewBoard] = useState({
    primary: data.reviewBoard?.primary || null,
    members: data.reviewBoard?.members || []
  });
  const [involvedAreas, setInvolvedAreas] = useState(data.involvedAreas || []);
  const [validationAreas, setValidationAreas] = useState(data.validationAreas || []);
  const [validationTeams, setValidationTeams] = useState(data.validationTeams || {});

  // Impact areas from database
  const [impactAreas, setImpactAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Team Templates states
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Change Info states
  const [changeInfo, setChangeInfo] = useState({
    changeTitle: data.changeTitle || '',
    changeDescription: data.changeDescription || data.changeReason || '',
    changeType: data.changeType || '',
    priority: data.priority || 'medium',
    plannedAdoptionDate: data.plannedAdoptionDate || ''
  });

  // Requestor Information states
  const [requestorInfo, setRequestorInfo] = useState({
    requestorUserId: data.requestorUserId || null,
    requestorName: data.requestorName || '',
    requestorDepartment: data.requestorDepartment || '',
    requestorEmail: data.requestorEmail || '',
    requestorPhone: data.requestorPhone || '',
    requestorExtension: data.requestorExtension || ''
  });
  // Si hay requestorName pero NO hay requestorUserId, es personalizado
  const [isCustomRequestor, setIsCustomRequestor] = useState(
    data.requestorName && !data.requestorUserId ? true : false
  );

  // Risk Matrix states
  const [changeCategories, setChangeCategories] = useState(data.changeCategories || []);
  const [riskMatrixConfig, setRiskMatrixConfig] = useState(null);

  // Update requestor info when data changes (loading existing ECR)
  useEffect(() => {
    if (data.requestorUserId || data.requestorName) {
      setRequestorInfo({
        requestorUserId: data.requestorUserId || null,
        requestorName: data.requestorName || '',
        requestorDepartment: data.requestorDepartment || '',
        requestorEmail: data.requestorEmail || '',
        requestorPhone: data.requestorPhone || '',
        requestorExtension: data.requestorExtension || ''
      });
      setIsCustomRequestor(data.requestorName && !data.requestorUserId ? true : false);
    }
  }, [data.requestorUserId, data.requestorName, data.requestorDepartment, data.requestorEmail, data.requestorPhone, data.requestorExtension]);

  // Sync validation areas when data changes (loading existing ECR)
  useEffect(() => {
    if (data.validationAreas && data.validationAreas.length > 0) {
      setValidationAreas(data.validationAreas);
    }
  }, [data.validationAreas]);

  // Sync involved areas when data changes (loading existing ECR)
  useEffect(() => {
    if (data.involvedAreas && data.involvedAreas.length > 0) {
      setInvolvedAreas(data.involvedAreas);
    }
  }, [data.involvedAreas]);

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/users/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Load impact areas from database
  useEffect(() => {
    const fetchImpactAreas = async () => {
      try {
        setLoadingAreas(true);
        const response = await impactAreasService.getActiveAreas();
        if (response.success && response.areas) {
          setImpactAreas(response.areas);
        }
      } catch (error) {
        console.error('Error loading impact areas:', error);
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchImpactAreas();
  }, []);

  // Load risk matrix configuration
  useEffect(() => {
    const fetchRiskMatrixConfig = async () => {
      try {
        const config = await riskMatrixService.getActiveConfig();
        setRiskMatrixConfig(config);
      } catch (error) {
        console.error('Error fetching risk matrix config:', error);
      }
    };
    fetchRiskMatrixConfig();
  }, []);

  // Load team templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await teamTemplateService.getAllTemplates();
        setTemplates(response.templates || []);
      } catch (error) {
        console.error('Error fetching team templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Handle change info updates
  const handleChangeInfoUpdate = (field, value) => {
    setChangeInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle requestor info updates
  const handleRequestorInfoUpdate = (field, value) => {
    setRequestorInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle requestor user selection
  const handleRequestorUserChange = (userId) => {
    if (userId === 'other') {
      setIsCustomRequestor(true);
      setRequestorInfo({
        requestorUserId: null,
        requestorName: '',
        requestorDepartment: '',
        requestorEmail: '',
        requestorPhone: '',
        requestorExtension: ''
      });
    } else if (userId) {
      const user = users.find(u => u.id === parseInt(userId));
      if (user) {
        setIsCustomRequestor(false);
        setRequestorInfo({
          requestorUserId: user.id,
          requestorName: `${user.firstName} ${user.lastName}`,
          requestorDepartment: user.department || '',
          requestorEmail: user.email || '',
          requestorPhone: user.phone || '',
          requestorExtension: user.extension || ''
        });
      }
    } else {
      setIsCustomRequestor(false);
      setRequestorInfo({
        requestorUserId: null,
        requestorName: '',
        requestorDepartment: '',
        requestorEmail: '',
        requestorPhone: '',
        requestorExtension: ''
      });
    }
  };

  // Handle category checkbox toggle
  const handleCategoryToggle = (categoryValue) => {
    setChangeCategories(prev => {
      if (prev.includes(categoryValue)) {
        return prev.filter(c => c !== categoryValue);
      } else {
        return [...prev, categoryValue];
      }
    });
  };

  // Risk assessment removed - now done in ECR-3

  // Update parent when data changes
  useEffect(() => {
    onDataUpdate({
      reviewBoard,
      validationTeams,
      involvedAreas,
      validationAreas,
      changeCategories,
      ...changeInfo,
      ...requestorInfo
    });
  }, [reviewBoard, validationTeams, involvedAreas, validationAreas, changeCategories, changeInfo, requestorInfo]);

  const handlePrimaryChange = (userId) => {
    setReviewBoard(prev => ({
      ...prev,
      primary: userId ? parseInt(userId) : null
    }));
  };

  const handleMemberToggle = (userId) => {
    setReviewBoard(prev => {
      const userIdInt = parseInt(userId);
      const isSelected = prev.members.includes(userIdInt);

      return {
        ...prev,
        members: isSelected
          ? prev.members.filter(id => id !== userIdInt)
          : [...prev.members, userIdInt]
      };
    });
  };

  const handleAreaToggle = (areaObj) => {
    // areaObj can be a string (legacy) or an object from impactAreas
    const areaKey = typeof areaObj === 'string' ? areaObj : areaObj.areaKey;

    setInvolvedAreas(prev => {
      const isSelected = prev.includes(areaKey);
      if (isSelected) {
        return prev.filter(a => a !== areaKey);
      } else {
        return [...prev, areaKey];
      }
    });
  };

  const handleValidationAreaToggle = (areaObj) => {
    const areaKey = typeof areaObj === 'string' ? areaObj : areaObj.areaKey;
    const defaultValidators = typeof areaObj === 'object' ? (areaObj.defaultValidators || []) : [];

    setValidationAreas(prev => {
      const isSelected = prev.includes(areaKey);

      if (isSelected) {
        // Remove area and its team
        const newAreas = prev.filter(a => a !== areaKey);
        const newTeams = { ...validationTeams };
        delete newTeams[areaKey];
        setValidationTeams(newTeams);
        return newAreas;
      } else {
        // Add area and pre-select default validators
        if (defaultValidators.length > 0) {
          setValidationTeams(prevTeams => ({
            ...prevTeams,
            [areaKey]: [...defaultValidators]
          }));
        }
        return [...prev, areaKey];
      }
    });
  };

  const handleTeamMemberToggle = (area, userId) => {
    setValidationTeams(prev => {
      const userIdInt = parseInt(userId);
      const currentTeam = prev[area] || [];
      const isSelected = currentTeam.includes(userIdInt);

      return {
        ...prev,
        [area]: isSelected
          ? currentTeam.filter(id => id !== userIdInt)
          : [...currentTeam, userIdInt]
      };
    });
  };

  // Team Template handlers
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Por favor ingresa un nombre para la plantilla');
      return;
    }

    try {
      await teamTemplateService.createTemplate({
        name: templateName,
        description: templateDescription,
        reviewBoard: reviewBoard,
        validationTeams: validationTeams,
        involvedAreas: involvedAreas
      });

      // Refresh templates list
      const response = await teamTemplateService.getAllTemplates();
      setTemplates(response.templates || []);

      // Close modal and reset
      setShowSaveModal(false);
      setTemplateName('');
      setTemplateDescription('');

      alert(' Plantilla guardada exitosamente');
    } catch (error) {
      console.error('Error saving template:', error);
      alert(' Error al guardar la plantilla');
    }
  };

  const handleLoadTemplate = async (templateId) => {
    try {
      const response = await teamTemplateService.getTemplateById(templateId);
      const template = response.template;

      // Load template data
      setReviewBoard(template.reviewBoard || { primary: null, members: [] });
      setValidationTeams(template.validationTeams || {});
      setInvolvedAreas(template.involvedAreas || []);

      setShowTemplateModal(false);
      alert(' Plantilla cargada exitosamente');
    } catch (error) {
      console.error('Error loading template:', error);
      alert(' Error al cargar la plantilla');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    try {
      await teamTemplateService.deleteTemplate(templateId);

      // Refresh templates list
      const response = await teamTemplateService.getAllTemplates();
      setTemplates(response.templates || []);

      alert(' Plantilla eliminada');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(' Error al eliminar la plantilla');
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-1: Change Request Board</h2>
        <p style={styles.subtitle}>Asignación de equipos de revisión y validación</p>
      </div>

      {/* Change Request Information */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Change Request Information</span>
        </h3>

        {/* Compact Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Change Title *</label>
            <input
              type="text"
              style={styles.input}
              value={changeInfo.changeTitle}
              onChange={(e) => handleChangeInfoUpdate('changeTitle', e.target.value)}
              placeholder="Título del cambio solicitado..."
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Change Type *</label>
            <select
              style={styles.select}
              value={changeInfo.changeType}
              onChange={(e) => handleChangeInfoUpdate('changeType', e.target.value)}
            >
              <option value="">Seleccionar tipo...</option>
              <option value="design">Design Change</option>
              <option value="process">Process Change</option>
              <option value="material">Material Change</option>
              <option value="safety">Safety Change</option>
              <option value="administrative">Administrative</option>
              <option value="layout">Layout Change</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Priority *</label>
            <select
              style={styles.select}
              value={changeInfo.priority}
              onChange={(e) => handleChangeInfoUpdate('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fecha Planeada Adopción</label>
            <input
              type="date"
              style={styles.input}
              value={changeInfo.plannedAdoptionDate}
              onChange={(e) => handleChangeInfoUpdate('plannedAdoptionDate', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Change Description *</label>
            <textarea
              style={{ ...styles.input, minHeight: '120px', resize: 'vertical' }}
              value={changeInfo.changeDescription}
              onChange={(e) => handleChangeInfoUpdate('changeDescription', e.target.value)}
              placeholder="Descripción del cambio solicitado..."
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Change Category *</label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '8px',
              backgroundColor: t.bg,
              borderRadius: '6px',
              border: `1px solid ${t.border}`
            }}>
              {riskMatrixConfig?.changeCategories?.map(cat => (
                <label key={cat.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={changeCategories.includes(cat.value)}
                    onChange={() => handleCategoryToggle(cat.value)}
                    style={styles.checkbox}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '13px' }}>
                    {cat.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Requestor Information */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #E6EAEE' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
             Requestor Information
          </h4>

          {/* Requestor Name Row */}
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Nombre del Solicitante *</label>
            {!isCustomRequestor ? (
              <select
                style={styles.select}
                value={requestorInfo.requestorUserId || ''}
                onChange={(e) => handleRequestorUserChange(e.target.value)}
              >
                <option value="">Selecciona un usuario...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.department || 'Sin departamento'}
                  </option>
                ))}
                <option value="other"> Otro (Especificar manualmente)</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  style={{ ...styles.input, flex: 1 }}
                  value={requestorInfo.requestorName}
                  onChange={(e) => handleRequestorInfoUpdate('requestorName', e.target.value)}
                  placeholder="Nombre completo del solicitante..."
                />
                <button
                  onClick={() => {
                    setIsCustomRequestor(false);
                    setRequestorInfo({
                      requestorUserId: null,
                      requestorName: '',
                      requestorDepartment: '',
                      requestorEmail: '',
                      requestorPhone: '',
                      requestorExtension: ''
                    });
                  }}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  ← Volver a lista
                </button>
              </div>
            )}
          </div>

          {/* Contact Details Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={styles.field}>
              <label style={styles.label}>Departamento *</label>
              <input
                type="text"
                style={styles.input}
                value={requestorInfo.requestorDepartment}
                onChange={(e) => handleRequestorInfoUpdate('requestorDepartment', e.target.value)}
                placeholder="Departamento"
                disabled={!isCustomRequestor && requestorInfo.requestorUserId}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                style={styles.input}
                value={requestorInfo.requestorEmail}
                onChange={(e) => handleRequestorInfoUpdate('requestorEmail', e.target.value)}
                placeholder="email@empresa.com"
                disabled={!isCustomRequestor && requestorInfo.requestorUserId}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Teléfono</label>
              <input
                type="tel"
                style={styles.input}
                value={requestorInfo.requestorPhone}
                onChange={(e) => handleRequestorInfoUpdate('requestorPhone', e.target.value)}
                placeholder="+52 123 456 7890"
                disabled={!isCustomRequestor && requestorInfo.requestorUserId}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Ext.</label>
              <input
                type="text"
                style={styles.input}
                value={requestorInfo.requestorExtension}
                onChange={(e) => handleRequestorInfoUpdate('requestorExtension', e.target.value)}
                placeholder="1234"
                disabled={!isCustomRequestor && requestorInfo.requestorUserId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment removed - now done in ECR-3 */}

      {/* Team Templates Actions */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #bae6fd'
      }}>
        <button
          onClick={() => setShowTemplateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0072CE',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
           Cargar Plantilla
        </button>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2E7D32',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
           Guardar como Plantilla
        </button>
        <div style={{ flex: 1, fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center' }}>
           Guarda configuraciones de equipos para reutilizarlas en otros ECRs
        </div>
      </div>

      {/* Review Board Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Review Board</span>
        </h3>
        <p style={styles.sectionDescription}>
          Junta de revisión de cambios - Responsables de aprobar o rechazar el ECR
        </p>

        {/* Primary Member */}
        <div style={styles.field}>
          <label style={styles.label}>Primary Member (Líder de la Junta) *</label>
          <select
            value={reviewBoard.primary || ''}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            style={styles.select}
          >
            <option value="">Seleccionar líder...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} - {user.position}
              </option>
            ))}
          </select>
        </div>

        {/* Board Members - Compact Checkboxes */}
        <div style={styles.field}>
          <label style={styles.label}>
            Board Members (Miembros de la junta)
            {reviewBoard.members.length > 0 && (
              <span style={{ marginLeft: '8px', color: '#0072CE', fontWeight: '600' }}>
                ({reviewBoard.members.length} seleccionados)
              </span>
            )}
          </label>

          {/* Compact checkbox grid - 3 columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            maxHeight: '180px',
            overflowY: 'auto',
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            padding: '12px',
            backgroundColor: t.bgCard
          }}>
            {users
              .filter(user => user.id !== reviewBoard.primary)
              .map(user => (
                <label
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: reviewBoard.members.includes(user.id) ? '#eff6ff' : 'transparent',
                    border: reviewBoard.members.includes(user.id) ? '1px solid #0072CE' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!reviewBoard.members.includes(user.id)) {
                      e.currentTarget.style.backgroundColor = '#FAFBFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!reviewBoard.members.includes(user.id)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reviewBoard.members.includes(user.id)}
                    onChange={() => handleMemberToggle(user.id)}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: t.text,
                    fontWeight: reviewBoard.members.includes(user.id) ? '600' : '400'
                  }}>
                    {user.firstName} {user.lastName}
                  </span>
                </label>
              ))}
          </div>
        </div>
      </div>

      {/* Involved Areas Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Involved Areas</span>
        </h3>
        <p style={styles.sectionDescription}>
          Selecciona las áreas impactadas por este cambio. Se usarán para el análisis de impacto en ECR-2B.
        </p>

        {loadingAreas ? (
          <p style={{ color: t.textMuted, fontSize: '14px' }}>Cargando áreas...</p>
        ) : (
          <div style={styles.areasGrid}>
            {impactAreas.map(area => {
              const isSelected = involvedAreas.includes(area.areaKey);
              const teamMembers = area.defaultValidators || [];

              return (
                <div
                  key={area.areaKey}
                  onClick={() => handleAreaToggle(area)}
                  style={{
                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                    border: isSelected ? '2px solid #0072CE' : '1px solid #E6EAEE',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '20px' }}>{area.icon}</span>
                    <span style={{
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? '#1d4ed8' : '#374151'
                    }}>
                      {area.areaName}
                    </span>
                  </div>

                  {/* Team Members */}
                  <div style={{ marginLeft: '26px' }}>
                    <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: '500' }}>Team Members:</span>
                    {teamMembers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {teamMembers.map(userId => {
                          const user = users.find(u => u.id === userId);
                          return user ? (
                            <span key={userId} style={{
                              backgroundColor: isSelected ? '#dbeafe' : t.bg,
                              color: isSelected ? '#0F3B5F' : '#374151',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {user.firstName} {user.lastName}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: t.textDim, fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                        Sin equipo asignado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Areas Section - Same areas as Involved Areas with team members */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>Áreas de Validación</span>
        </h3>
        <p style={styles.sectionDescription}>
          Selecciona las áreas que requieren validación. El equipo asignado realizará la validación en ECR-3.
        </p>

        {loadingAreas ? (
          <p style={{ color: t.textMuted, fontSize: '14px' }}>Cargando áreas...</p>
        ) : (
          <div style={styles.areasGrid}>
            {impactAreas.map(area => {
              const isSelected = validationAreas.includes(area.areaKey);
              const teamMembers = validationTeams[area.areaKey] || [];

              return (
                <div
                  key={area.areaKey}
                  onClick={() => handleValidationAreaToggle(area)}
                  style={{
                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                    border: isSelected ? '2px solid #0072CE' : '1px solid #E6EAEE',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '20px' }}>{area.icon}</span>
                    <span style={{
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? '#1d4ed8' : '#374151'
                    }}>
                      {area.areaName}
                    </span>
                  </div>

                  {/* Team Members */}
                  <div style={{ marginLeft: '26px' }}>
                    <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: '500' }}>Team Members:</span>
                    {teamMembers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {teamMembers.map(userId => {
                          const user = users.find(u => u.id === userId);
                          return user ? (
                            <span key={userId} style={{
                              backgroundColor: isSelected ? '#dbeafe' : t.bg,
                              color: isSelected ? '#0F3B5F' : '#374151',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {user.firstName} {user.lastName}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: t.textDim, fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                        Sin equipo asignado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load Template Modal */}
      {showTemplateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTemplateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
               Cargar Plantilla de Equipo
            </h3>

            {templates.length === 0 ? (
              <p style={{ color: t.textMuted, fontSize: '14px' }}>
                No tienes plantillas guardadas. Configura un equipo y guárdalo como plantilla.
              </p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {templates.map(template => (
                  <div
                    key={template.id}
                    style={{
                      padding: '12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      marginBottom: '12px',
                      backgroundColor: t.bg
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                          {template.name}
                        </div>
                        {template.description && (
                          <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
                            {template.description}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: t.textMuted }}>
                          Board: {template.reviewBoard?.members?.length || 0} miembros |
                          Áreas: {template.involvedAreas?.length || 0}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleLoadTemplate(template.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0072CE',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
               Guardar Plantilla de Equipo
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Equipo Calidad Estándar"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Descripción (opcional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe cuándo usar esta plantilla..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px', color: '#0369a1' }}>
              <strong>Se guardará:</strong><br/>
              • Review Board: {reviewBoard.members.length} miembros<br/>
              • Áreas involucradas: {involvedAreas.length}<br/>
              • Validation Teams: {Object.keys(validationTeams).length} equipos
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getStyles = (t) => ({
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: t.text,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: t.textMuted,
    margin: 0
  },
  section: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: t.bg,
    borderRadius: '8px',
    border: `1px solid ${t.border}`
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  sectionDescription: {
    fontSize: '13px',
    color: t.textMuted,
    margin: '0 0 16px 0'
  },
  badge: {
    padding: '4px 12px',
    backgroundColor: '#0072CE',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: t.text,
    marginBottom: '8px'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px'
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '12px',
    backgroundColor: t.bgCard,
    borderRadius: '6px',
    border: `1px solid ${t.border}`
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '14px'
  },
  userName: {
    fontWeight: '500',
    color: t.text,
    flex: 1
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px'
  },
  userPosition: {
    fontSize: '12px',
    color: t.textMuted
  },
  primaryBadge: {
    padding: '2px 8px',
    backgroundColor: '#0072CE',
    color: 'white',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  areasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  areaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: t.bgCard,
    borderRadius: '6px',
    border: `1px solid ${t.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  areaName: {
    fontSize: '14px',
    fontWeight: '500',
    color: t.text
  },
  teamSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: t.bgCard,
    borderRadius: '6px',
    border: `1px solid ${t.border}`
  },
  teamTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 12px 0'
  },
  summary: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    fontSize: '13px',
    color: t.text
  },
  selectedList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  tag: {
    padding: '4px 10px',
    backgroundColor: '#0072CE',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: t.bgCard,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  }
});

export default ECRTeamTab;
