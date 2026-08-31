import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import riskMatrixService from '../../services/riskMatrixService';
import teamTemplateService from '../../services/teamTemplateService';
import impactAreasService from '../../services/impactAreasService';

const ECRTeamTab = ({ data, onDataUpdate, isReadOnly = false, language = 'es', t: translate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);

  // Translation helper with fallback
  const tr = (key) => translate ? translate(key) : key;
  const isInitialMount = useRef(true);
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

  // Sync changeInfo when data changes (loading existing ECR)
  useEffect(() => {
    // Only sync if we have a valid ECR ID (existing ECR loaded)
    if (data.id) {
      setChangeInfo({
        changeTitle: data.changeTitle || '',
        changeDescription: data.changeDescription || data.changeReason || '',
        changeType: data.changeType || '',
        priority: data.priority || 'medium',
        plannedAdoptionDate: data.plannedAdoptionDate || ''
      });
    }
  }, [data.id, data.changeTitle, data.changeDescription, data.changeReason, data.changeType, data.priority, data.plannedAdoptionDate]);

  // Sync changeCategories when data changes (loading existing ECR)
  useEffect(() => {
    if (data.changeCategories && data.changeCategories.length > 0) {
      setChangeCategories(data.changeCategories);
    }
  }, [data.changeCategories]);

  // Sync reviewBoard and validationTeams when loading existing ECR (only on id change)
  const lastLoadedId = useRef(null);
  useEffect(() => {
    if (data.id && data.id !== lastLoadedId.current) {
      lastLoadedId.current = data.id;
      if (data.reviewBoard) {
        setReviewBoard({
          primary: data.reviewBoard.primary || null,
          members: data.reviewBoard.members || []
        });
      }
      if (data.validationTeams) {
        setValidationTeams(data.validationTeams);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

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

  // Update parent when data changes (skip initial mount to avoid infinite loop)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
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
    if (!userId) {
      setReviewBoard(prev => ({ ...prev, primary: null }));
      return;
    }
    const userIdInt = parseInt(userId);
    const user = users.find(u => u.id === userIdInt);
    const primaryData = user
      ? { id: userIdInt, name: `${user.firstName} ${user.lastName}`.trim() }
      : { id: userIdInt, name: `Usuario ${userIdInt}` };
    setReviewBoard(prev => ({ ...prev, primary: primaryData }));
  };

  const handleMemberToggle = (userId) => {
    setReviewBoard(prev => {
      const userIdInt = parseInt(userId);
      // Check if already selected (handle both old ID format and new object format)
      const isSelected = prev.members.some(member =>
        typeof member === 'object' ? member.id === userIdInt : member === userIdInt
      );

      if (isSelected) {
        // Remove member
        return {
          ...prev,
          members: prev.members.filter(member =>
            typeof member === 'object' ? member.id !== userIdInt : member !== userIdInt
          )
        };
      } else {
        // Add member with name (frozen at save time)
        const user = users.find(u => u.id === userIdInt);
        const memberData = user
          ? { id: userIdInt, name: `${user.firstName} ${user.lastName}`.trim() }
          : { id: userIdInt, name: `Usuario ${userIdInt}` };
        return {
          ...prev,
          members: [...prev.members, memberData]
        };
      }
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
        // Add area and pre-select default validators with names
        if (defaultValidators.length > 0) {
          const validatorsWithNames = defaultValidators.map(validatorId => {
            const user = users.find(u => u.id === validatorId);
            return user
              ? { id: validatorId, name: `${user.firstName} ${user.lastName}`.trim() }
              : { id: validatorId, name: `Usuario ${validatorId}` };
          });
          setValidationTeams(prevTeams => ({
            ...prevTeams,
            [areaKey]: validatorsWithNames
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

      // Check if already selected (handle both old ID format and new object format)
      const isSelected = currentTeam.some(member =>
        typeof member === 'object' ? member.id === userIdInt : member === userIdInt
      );

      if (isSelected) {
        // Remove member
        return {
          ...prev,
          [area]: currentTeam.filter(member =>
            typeof member === 'object' ? member.id !== userIdInt : member !== userIdInt
          )
        };
      } else {
        // Add member with name (frozen at save time)
        const user = users.find(u => u.id === userIdInt);
        const memberData = user
          ? { id: userIdInt, name: `${user.firstName} ${user.lastName}`.trim() }
          : { id: userIdInt, name: `Usuario ${userIdInt}` };

        return {
          ...prev,
          [area]: [...currentTeam, memberData]
        };
      }
    });
  };

  // Team Template handlers
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert(language === 'es' ? 'Por favor ingresa un nombre para la plantilla' : 'Please enter a template name');
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

      alert(language === 'es' ? 'Plantilla guardada exitosamente' : 'Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      alert(language === 'es' ? 'Error al guardar la plantilla' : 'Error saving template');
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
      alert(language === 'es' ? 'Plantilla cargada exitosamente' : 'Template loaded successfully');
    } catch (error) {
      console.error('Error loading template:', error);
      alert(language === 'es' ? 'Error al cargar la plantilla' : 'Error loading template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm(language === 'es' ? '¿Estás seguro de eliminar esta plantilla?' : 'Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await teamTemplateService.deleteTemplate(templateId);

      // Refresh templates list
      const response = await teamTemplateService.getAllTemplates();
      setTemplates(response.templates || []);

      alert(language === 'es' ? 'Plantilla eliminada' : 'Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(language === 'es' ? 'Error al eliminar la plantilla' : 'Error deleting template');
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  // Helper to check if a user is in reviewBoard.members (handles both old ID and new object formats)
  const isReviewBoardMember = (userId) => {
    return reviewBoard.members.some(member =>
      typeof member === 'object' ? member.id === userId : member === userId
    );
  };

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            {tr('ecr.messages.readOnlyMode')}
          </span>
        </div>
      )}

      <div style={{
        pointerEvents: isReadOnly ? 'none' : 'auto',
        opacity: isReadOnly ? 0.7 : 1
      }}>
      <div style={styles.header}>
        <h2 style={styles.title}> ECR-1: {language === 'es' ? 'Junta de Solicitud de Cambio' : 'Change Request Board'}</h2>
        <p style={styles.subtitle}>{language === 'es' ? 'Asignación de equipos de revisión y validación' : 'Assignment of review and validation teams'}</p>
      </div>

      {/* Change Request Information */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{tr('ecr.changeRequest.title')}</span>
        </h3>

        {/* Compact Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>{language === 'es' ? 'Título del Cambio' : 'Change Title'} *</label>
            <input
              type="text"
              style={styles.input}
              value={changeInfo.changeTitle}
              onChange={(e) => handleChangeInfoUpdate('changeTitle', e.target.value)}
              placeholder={language === 'es' ? 'Título del cambio solicitado...' : 'Requested change title...'}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{tr('ecr.changeRequest.changeType')} *</label>
            <select
              style={styles.select}
              value={changeInfo.changeType}
              onChange={(e) => handleChangeInfoUpdate('changeType', e.target.value)}
            >
              <option value="">{language === 'es' ? 'Seleccionar tipo...' : 'Select type...'}</option>
              <option value="design">{tr('ecr.changeRequest.types.design')}</option>
              <option value="process">{tr('ecr.changeRequest.types.process')}</option>
              <option value="material">{tr('ecr.changeRequest.types.material')}</option>
              <option value="safety">{language === 'es' ? 'Cambio de Seguridad' : 'Safety Change'}</option>
              <option value="administrative">{language === 'es' ? 'Administrativo' : 'Administrative'}</option>
              <option value="layout">{language === 'es' ? 'Cambio de Layout' : 'Layout Change'}</option>
              <option value="other">{tr('ecr.changeRequest.types.other')}</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{tr('ecr.changeRequest.priority')} *</label>
            <select
              style={styles.select}
              value={changeInfo.priority}
              onChange={(e) => handleChangeInfoUpdate('priority', e.target.value)}
            >
              <option value="low">{tr('ecr.changeRequest.priorities.low')}</option>
              <option value="medium">{tr('ecr.changeRequest.priorities.medium')}</option>
              <option value="high">{tr('ecr.changeRequest.priorities.high')}</option>
              <option value="critical">{tr('ecr.changeRequest.priorities.critical')}</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{language === 'es' ? 'Fecha Planeada Adopción' : 'Planned Adoption Date'}</label>
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
            <label style={styles.label}>{tr('ecr.changeRequest.changeDescription')} *</label>
            <textarea
              style={{ ...styles.input, minHeight: '120px', resize: 'vertical' }}
              value={changeInfo.changeDescription}
              onChange={(e) => handleChangeInfoUpdate('changeDescription', e.target.value)}
              placeholder={language === 'es' ? 'Descripción del cambio solicitado...' : 'Description of the requested change...'}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{language === 'es' ? 'Categoría del Cambio' : 'Change Category'} *</label>
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
             {language === 'es' ? 'Información del Solicitante' : 'Requestor Information'}
          </h4>

          {/* Requestor Name Row */}
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>{language === 'es' ? 'Nombre del Solicitante' : 'Requestor Name'} *</label>
            {!isCustomRequestor ? (
              <select
                style={styles.select}
                value={requestorInfo.requestorUserId || ''}
                onChange={(e) => handleRequestorUserChange(e.target.value)}
              >
                <option value="">{language === 'es' ? 'Selecciona un usuario...' : 'Select a user...'}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} - {user.department || (language === 'es' ? 'Sin departamento' : 'No department')}
                  </option>
                ))}
                <option value="other"> {language === 'es' ? 'Otro (Especificar manualmente)' : 'Other (Specify manually)'}</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  style={{ ...styles.input, flex: 1 }}
                  value={requestorInfo.requestorName}
                  onChange={(e) => handleRequestorInfoUpdate('requestorName', e.target.value)}
                  placeholder={language === 'es' ? 'Nombre completo del solicitante...' : 'Requestor full name...'}
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
                  ← {language === 'es' ? 'Volver a lista' : 'Back to list'}
                </button>
              </div>
            )}
          </div>

          {/* Contact Details Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={styles.field}>
              <label style={styles.label}>{language === 'es' ? 'Departamento' : 'Department'} *</label>
              <input
                type="text"
                style={styles.input}
                value={requestorInfo.requestorDepartment}
                onChange={(e) => handleRequestorInfoUpdate('requestorDepartment', e.target.value)}
                placeholder={language === 'es' ? 'Departamento' : 'Department'}
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
              <label style={styles.label}>{language === 'es' ? 'Teléfono' : 'Phone'}</label>
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
              <label style={styles.label}>{language === 'es' ? 'Ext.' : 'Ext.'}</label>
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
           {language === 'es' ? 'Cargar Plantilla' : 'Load Template'}
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
           {language === 'es' ? 'Guardar como Plantilla' : 'Save as Template'}
        </button>
        <div style={{ flex: 1, fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center' }}>
           {language === 'es' ? 'Guarda configuraciones de equipos para reutilizarlas en otros ECRs' : 'Save team configurations to reuse in other ECRs'}
        </div>
      </div>

      {/* Review Board Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{tr('ecr.team.reviewBoard')}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Junta de revisión de cambios - Responsables de aprobar o rechazar el ECR' : 'Change review board - Responsible for approving or rejecting the ECR'}
        </p>

        {/* Primary Member */}
        <div style={styles.field}>
          <label style={styles.label}>{language === 'es' ? 'Primary Member (Líder de la Junta)' : 'Primary Member (Board Leader)'} *</label>
          <select
            value={typeof reviewBoard.primary === 'object' ? reviewBoard.primary?.id || '' : reviewBoard.primary || ''}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            style={styles.select}
          >
            <option value="">{language === 'es' ? 'Seleccionar líder...' : 'Select leader...'}</option>
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
            {language === 'es' ? 'Board Members (Miembros de la junta)' : 'Board Members'}
            {reviewBoard.members.length > 0 && (
              <span style={{ marginLeft: '8px', color: '#0072CE', fontWeight: '600' }}>
                ({reviewBoard.members.length} {language === 'es' ? 'seleccionados' : 'selected'})
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
              .filter(user => {
                const primaryId = typeof reviewBoard.primary === 'object' ? reviewBoard.primary?.id : reviewBoard.primary;
                return user.id !== primaryId;
              })
              .map(user => {
                const isMember = isReviewBoardMember(user.id);
                return (
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
                      backgroundColor: isMember ? t.accentBg : 'transparent',
                      border: isMember ? `1px solid ${t.accent}` : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMember) {
                        e.currentTarget.style.backgroundColor = t.bgPanel;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMember) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isMember}
                      onChange={() => handleMemberToggle(user.id)}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: t.text,
                      fontWeight: isMember ? '600' : '400'
                    }}>
                      {user.firstName} {user.lastName}
                    </span>
                  </label>
                );
              })}
          </div>
        </div>
      </div>

      {/* Involved TFT Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{language === 'es' ? 'TFT Involucradas' : 'Involved TFT'}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Selecciona las TFT impactadas por este cambio. Se usarán para el análisis de impacto en ECR-2B.' : 'Select the TFTs impacted by this change. They will be used for impact analysis in ECR-2B.'}
        </p>

        {loadingAreas ? (
          <p style={{ color: t.textMuted, fontSize: '14px' }}>{language === 'es' ? 'Cargando TFT...' : 'Loading TFT...'}</p>
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
                    backgroundColor: isSelected ? t.accentBg : t.bgCard,
                    border: isSelected ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
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
                    <span style={{
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? t.accentFg : t.text
                    }}>
                      {area.areaName}
                    </span>
                  </div>

                  {/* Team Members */}
                  <div style={{ marginLeft: '26px' }}>
                    <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: '500' }}>{language === 'es' ? 'Miembros del Equipo:' : 'Team Members:'}</span>
                    {teamMembers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {teamMembers.map((member, idx) => {
                          // Handle both old format (just ID) and new format ({id, name})
                          const isObject = typeof member === 'object';
                          const memberId = isObject ? member.id : member;
                          const memberName = isObject
                            ? member.name
                            : (() => {
                                const user = users.find(u => u.id === memberId);
                                return user ? `${user.firstName} ${user.lastName}` : `${language === 'es' ? 'Usuario' : 'User'} #${memberId}`;
                              })();

                          return (
                            <span key={memberId || idx} style={{
                              backgroundColor: isSelected ? t.accentBg : t.bg,
                              color: isSelected ? t.accentFg : t.text,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {memberName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: t.textDim, fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                        {language === 'es' ? 'Sin equipo asignado' : 'No team assigned'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation TFT Section - Same areas as Involved TFT with team members */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.badge}>{language === 'es' ? 'TFT de Validación' : 'Validation TFT'}</span>
        </h3>
        <p style={styles.sectionDescription}>
          {language === 'es' ? 'Selecciona las TFT que requieren validación. El equipo asignado realizará la validación en ECR-3.' : 'Select the TFTs that require validation. The assigned team will perform the validation in ECR-3.'}
        </p>

        {loadingAreas ? (
          <p style={{ color: t.textMuted, fontSize: '14px' }}>{language === 'es' ? 'Cargando TFT...' : 'Loading TFT...'}</p>
        ) : (
          <div style={styles.areasGrid}>
            {impactAreas.map(area => {
              const isSelected = validationAreas.includes(area.areaKey);
              // Use validationTeams if set, otherwise fall back to defaultValidators (same as Involved TFT)
              const teamMembers = validationTeams[area.areaKey] || area.defaultValidators || [];

              return (
                <div
                  key={area.areaKey}
                  onClick={() => handleValidationAreaToggle(area)}
                  style={{
                    backgroundColor: isSelected ? t.accentBg : t.bgCard,
                    border: isSelected ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
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
                    <span style={{
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? t.accentFg : t.text
                    }}>
                      {area.areaName}
                    </span>
                  </div>

                  {/* Team Members */}
                  <div style={{ marginLeft: '26px' }}>
                    <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: '500' }}>{language === 'es' ? 'Miembros del Equipo:' : 'Team Members:'}</span>
                    {teamMembers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {teamMembers.map((member, idx) => {
                          // Handle both old format (just ID) and new format ({id, name})
                          const isObject = typeof member === 'object';
                          const memberId = isObject ? member.id : member;
                          const memberName = isObject
                            ? member.name
                            : (() => {
                                const user = users.find(u => u.id === memberId);
                                return user ? `${user.firstName} ${user.lastName}` : `${language === 'es' ? 'Usuario' : 'User'} #${memberId}`;
                              })();

                          return (
                            <span key={memberId || idx} style={{
                              backgroundColor: isSelected ? t.accentBg : t.bg,
                              color: isSelected ? t.accentFg : t.text,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {memberName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: t.textDim, fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                        {language === 'es' ? 'Sin equipo asignado' : 'No team assigned'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>{/* End of read-only wrapper */}

      {/* Load Template Modal */}
      {showTemplateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTemplateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
               {language === 'es' ? 'Cargar Plantilla de Equipo' : 'Load Team Template'}
            </h3>

            {templates.length === 0 ? (
              <p style={{ color: t.textMuted, fontSize: '14px' }}>
                {language === 'es' ? 'No tienes plantillas guardadas. Configura un equipo y guárdalo como plantilla.' : 'You have no saved templates. Configure a team and save it as a template.'}
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
                          Board: {template.reviewBoard?.members?.length || 0} {language === 'es' ? 'miembros' : 'members'} |
                          TFT: {template.involvedAreas?.length || 0}
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
                          {language === 'es' ? 'Cargar' : 'Load'}
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
                          {language === 'es' ? 'Eliminar' : 'Delete'}
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
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
               {language === 'es' ? 'Guardar Plantilla de Equipo' : 'Save Team Template'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                {language === 'es' ? 'Nombre de la Plantilla' : 'Template Name'} *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Equipo Calidad Estándar' : 'Ex: Standard Quality Team'}
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
                {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder={language === 'es' ? 'Describe cuándo usar esta plantilla...' : 'Describe when to use this template...'}
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
              <strong>{language === 'es' ? 'Se guardará:' : 'Will be saved:'}</strong><br/>
              • Review Board: {reviewBoard.members.length} {language === 'es' ? 'miembros' : 'members'}<br/>
              • {language === 'es' ? 'TFT involucradas' : 'Involved TFT'}: {involvedAreas.length}<br/>
              • Validation Teams: {Object.keys(validationTeams).length} {language === 'es' ? 'equipos' : 'teams'}
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
                {tr('ecr.actions.cancel')}
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
                {language === 'es' ? 'Guardar Plantilla' : 'Save Template'}
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
    fontWeight: '600',
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
