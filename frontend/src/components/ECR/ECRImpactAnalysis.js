import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import ECRApprovalAssignment from './ECRApprovalAssignment';
import impactAreasService from '../../services/impactAreasService';

const ECRImpactAnalysis = ({ data, onDataUpdate, isReadOnly = false, language = 'es', t: translate }) => {
  const { theme: t } = useTheme();
  const styles = getStyles(t);
  const { showSuccess, showError } = useToast();

  // Translation helper with fallback
  const tr = (key) => translate ? translate(key) : key;

  // Impact areas loaded from database configuration
  const [impactAreas, setImpactAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  const [impactAnalysis, setImpactAnalysis] = useState(data.impactAnalysis || []);
  const [customerImpact, setCustomerImpact] = useState({
    affectsCustomer: false,
    requiresNotification: false,
    impactDescription: '',
    notificationMethod: 'none',
    evidenceFiles: [],
    customerApprovalRequired: false,
    customerApprovalStatus: 'not_required',
    ...(data.customerImpact || {})
  });
  const [users, setUsers] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(null);
  const [riskMatrixConfig, setRiskMatrixConfig] = useState(null);
  const [selectedValidations, setSelectedValidations] = useState(data.selectedValidations || []);
  const [showValidationError, setShowValidationError] = useState(false);

  // Track if we've already pre-selected areas from ECR-1
  const [hasPreselected, setHasPreselected] = useState(false);


  // Load impact areas from database configuration
  useEffect(() => {
    const fetchImpactAreas = async () => {
      try {
        setLoadingAreas(true);
        const response = await impactAreasService.getActiveAreas();

        if (response.success && response.areas) {
          // Transform database format to component format
          const transformedAreas = response.areas.map(area => ({
            key: area.areaKey,
            name: area.areaName,
            icon: area.icon,
            color: area.color,
            description: area.description,
            subsections: area.subsections || [],
            defaultValidators: area.defaultValidators || [],
            // Special flag for customer area
            isCustomerImpact: area.areaKey === 'customer'
          }));

          setImpactAreas(transformedAreas);
        }
      } catch (error) {
        console.error('Error loading impact areas:', error);
        showError(language === 'es' ? 'Error al cargar TFT de impacto' : 'Error loading impact TFT');
        // Fallback to empty array
        setImpactAreas([]);
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchImpactAreas();
  }, []);

  // Sync areas from ECR-1 (involvedAreas) when areas are loaded
  // This runs whenever involvedAreas changes to keep ECR-2B in sync
  useEffect(() => {
    if (loadingAreas || impactAreas.length === 0 || !data.involvedAreas?.length) return;

    // Get existing area keys
    const existingAreaKeys = impactAnalysis.map(a => a.areaKey);

    // Find new areas from ECR-1 that are not in impactAnalysis
    const newAreas = data.involvedAreas
      .filter(areaKey => !existingAreaKeys.includes(areaKey))
      .map(areaKey => {
        const areaConfig = impactAreas.find(a => a.key === areaKey);
        if (!areaConfig) return null;

        // Get the assigned validator from ECR-1 validationTeams
        const assignedValidators = data.validationTeams?.[areaKey] || [];
        const responsibleUserId = assignedValidators.length > 0 ? assignedValidators[0] : null;

        return {
          areaName: areaConfig.name,
          areaKey: areaConfig.key,
          icon: areaConfig.icon,
          color: areaConfig.color,
          responsibleUserId: responsibleUserId,
          impactDescription: '',
          evidenceFiles: [],
          selectedSubsections: [],
          severity: null,
          occurrence: null,
          riskLevel: null,
          status: 'pending'
        };
      })
      .filter(Boolean);

    // Also remove areas that are no longer in involvedAreas
    const validAreas = impactAnalysis.filter(a => data.involvedAreas.includes(a.areaKey));

    // Only update if there are changes
    if (newAreas.length > 0 || validAreas.length !== impactAnalysis.length) {
      setImpactAnalysis([...validAreas, ...newAreas]);
    }

    if (!hasPreselected) setHasPreselected(true);
  }, [loadingAreas, impactAreas, data.involvedAreas, data.validationTeams]);

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

  // Load risk matrix configuration
  useEffect(() => {
    const fetchRiskMatrixConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/risk-matrix/config', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRiskMatrixConfig(response.data.config);
      } catch (error) {
        console.error('Error fetching risk matrix config:', error);
      }
    };
    fetchRiskMatrixConfig();
  }, []);

  // Validate risk assessment completion
  const validateRiskAssessment = () => {
    if (impactAnalysis.length === 0) {
      return true; // No areas selected, no validation needed
    }

    // Check if all areas have severity and occurrence defined
    const areasWithoutRisk = impactAnalysis.filter(area =>
      !area.severity || !area.occurrence
    );

    return areasWithoutRisk.length === 0;
  };

  // Get areas missing risk assessment
  const getAreasMissingRisk = () => {
    return impactAnalysis.filter(area => !area.severity || !area.occurrence);
  };

  // Update parent when analysis or customer impact changes
  useEffect(() => {
    const isValid = validateRiskAssessment();
    onDataUpdate({
      impactAnalysis,
      customerImpact,
      selectedValidations,
      isRiskAssessmentValid: isValid
    });

    // Show validation error if there are areas selected but risk not complete
    if (impactAnalysis.length > 0 && !isValid) {
      setShowValidationError(true);
    } else {
      setShowValidationError(false);
    }
  }, [impactAnalysis, customerImpact, selectedValidations]);

  // Get area data
  const getAreaData = (areaKey) => {
    return impactAnalysis.find(item => item.areaKey === areaKey) || null;
  };

  // Toggle subsection within an area
  const toggleSubsection = (areaKey, subsectionKey) => {
    setImpactAnalysis(prev => prev.map(item => {
      if (item.areaKey === areaKey) {
        const currentSubsections = item.selectedSubsections || [];
        const isSelected = currentSubsections.includes(subsectionKey);

        return {
          ...item,
          selectedSubsections: isSelected
            ? currentSubsections.filter(key => key !== subsectionKey)
            : [...currentSubsections, subsectionKey]
        };
      }
      return item;
    }));
  };

  // Update area data
  const updateAreaData = (areaKey, field, value) => {
    setImpactAnalysis(prev => prev.map(item =>
      item.areaKey === areaKey
        ? { ...item, [field]: value }
        : item
    ));
  };

  // Calculate risk level based on severity and occurrence
  const calculateRiskLevel = (severity, occurrence) => {
    if (!severity || !occurrence) return null;

    // Risk matrix rules (same as in RiskMatrixConfig)
    const riskRules = [
      { severity: 1, occurrence: 1, riskLevel: 'low' },
      { severity: 1, occurrence: 2, riskLevel: 'low' },
      { severity: 1, occurrence: 3, riskLevel: 'medium' },
      { severity: 1, occurrence: 4, riskLevel: 'medium' },
      { severity: 2, occurrence: 1, riskLevel: 'low' },
      { severity: 2, occurrence: 2, riskLevel: 'medium' },
      { severity: 2, occurrence: 3, riskLevel: 'medium' },
      { severity: 2, occurrence: 4, riskLevel: 'high' },
      { severity: 3, occurrence: 1, riskLevel: 'medium' },
      { severity: 3, occurrence: 2, riskLevel: 'medium' },
      { severity: 3, occurrence: 3, riskLevel: 'high' },
      { severity: 3, occurrence: 4, riskLevel: 'high' },
      { severity: 4, occurrence: 1, riskLevel: 'medium' },
      { severity: 4, occurrence: 2, riskLevel: 'high' },
      { severity: 4, occurrence: 3, riskLevel: 'high' },
      { severity: 4, occurrence: 4, riskLevel: 'high' }
    ];

    const rule = riskRules.find(r => r.severity === severity && r.occurrence === occurrence);
    return rule ? rule.riskLevel : null;
  };

  // Update severity and recalculate risk
  const updateSeverity = (areaKey, severity) => {
    setImpactAnalysis(prev => prev.map(item => {
      if (item.areaKey === areaKey) {
        const riskLevel = calculateRiskLevel(severity, item.occurrence);
        return { ...item, severity, riskLevel };
      }
      return item;
    }));
  };

  // Update occurrence and recalculate risk
  const updateOccurrence = (areaKey, occurrence) => {
    setImpactAnalysis(prev => prev.map(item => {
      if (item.areaKey === areaKey) {
        const riskLevel = calculateRiskLevel(item.severity, occurrence);
        return { ...item, occurrence, riskLevel };
      }
      return item;
    }));
  };

  // Get risk level display info
  const getRiskDisplay = (riskLevel) => {
    switch(riskLevel) {
      case 'low':
        return { label: 'BAJO', color: t.successFg, icon: '' };
      case 'medium':
        return { label: 'MEDIO', color: t.warningFg, icon: '' };
      case 'high':
        return { label: 'ALTO', color: t.errorFg, icon: '' };
      default:
        return null;
    }
  };

  // Handle evidence upload
  const handleEvidenceUpload = async (areaKey, files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingEvidence(areaKey);
      const token = localStorage.getItem('token');
      const formData = new FormData();

      Array.from(files).forEach(file => {
        formData.append('evidence', file);
      });

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const uploadedFiles = response.data.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        // Add uploaded files to area
        setImpactAnalysis(prev => prev.map(item =>
          item.areaKey === areaKey
            ? { ...item, evidenceFiles: [...(item.evidenceFiles || []), ...uploadedFiles] }
            : item
        ));

        showSuccess(language === 'es' ? `${uploadedFiles.length} archivo(s) subido(s) exitosamente` : `${uploadedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError(language === 'es' ? 'Error al subir evidencia' : 'Error uploading evidence');
    } finally {
      setUploadingEvidence(null);
    }
  };

  // Remove evidence file
  const removeEvidenceFile = (areaKey, fileIndex) => {
    setImpactAnalysis(prev => prev.map(item =>
      item.areaKey === areaKey
        ? {
            ...item,
            evidenceFiles: item.evidenceFiles.filter((_, index) => index !== fileIndex)
          }
        : item
    ));
  };

  // Update customer impact
  const updateCustomerImpact = (field, value) => {
    setCustomerImpact(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle customer evidence upload
  const handleCustomerEvidenceUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingEvidence('customer');
      const token = localStorage.getItem('token');
      const formData = new FormData();

      Array.from(files).forEach(file => {
        formData.append('evidence', file);
      });

      const response = await axios.post(
        `http://localhost:5000/ecr/${data.id}/upload-evidence`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const uploadedFiles = response.data.files.map(file => ({
          name: file.originalName,
          url: file.url,
          uploadedAt: new Date().toISOString()
        }));

        setCustomerImpact(prev => ({
          ...prev,
          evidenceFiles: [...(prev.evidenceFiles || []), ...uploadedFiles]
        }));

        showSuccess(language === 'es' ? `${uploadedFiles.length} archivo(s) subido(s) exitosamente` : `${uploadedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading customer evidence:', error);
      showError(language === 'es' ? 'Error al subir evidencia' : 'Error uploading evidence');
    } finally {
      setUploadingEvidence(null);
    }
  };

  // Remove customer evidence file
  const removeCustomerEvidenceFile = (fileIndex) => {
    setCustomerImpact(prev => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter((_, index) => index !== fileIndex)
    }));
  };

  // Toggle validation selection
  const toggleValidation = (validation) => {
    setSelectedValidations(prev => {
      const exists = prev.find(v => v.text === validation);
      if (exists) {
        return prev.filter(v => v.text !== validation);
      } else {
        return [...prev, { text: validation, evidenceFiles: [] }];
      }
    });
  };

  // Check if validation is selected
  const isValidationSelected = (validation) => {
    return selectedValidations.some(v => v.text === validation);
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
        <h2 style={styles.title}> {tr('ecr.impactAnalysis.title')}</h2>
        <p style={styles.subtitle}>
          {language === 'es' ? 'Selecciona las TFT afectadas por este cambio y proporciona el análisis correspondiente' : 'Select the TFTs affected by this change and provide the corresponding analysis'}
        </p>
      </div>


      {/* Legal Disclaimer */}
      <div style={styles.disclaimer}>
        <p style={styles.disclaimerText}>
           <strong>{language === 'es' ? 'IMPORTANTE:' : 'IMPORTANT:'}</strong> {language === 'es' ? 'Selecciona únicamente las TFT que son afectadas por este cambio. Para cada TFT seleccionada, asigna un responsable, describe el impacto y proporciona evidencia de soporte.' : 'Select only the TFTs that are affected by this change. For each selected TFT, assign a responsible person, describe the impact and provide supporting evidence.'}
        </p>
      </div>

      {/* Validation Error Banner */}
      {showValidationError && getAreasMissingRisk().length > 0 && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}></span>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: t.error
              }}>
                {language === 'es' ? 'Error: Evaluación de Riesgo Incompleta' : 'Error: Incomplete Risk Assessment'}
              </h3>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#991b1b',
                lineHeight: '1.5'
              }}>
                {language === 'es'
                  ? <>Las siguientes TFT de impacto no tienen evaluación de riesgo completa. Debes seleccionar tanto <strong>Severidad</strong> como <strong>Ocurrencia</strong> para cada TFT:</>
                  : <>The following impact TFTs do not have a complete risk assessment. You must select both <strong>Severity</strong> and <strong>Occurrence</strong> for each TFT:</>
                }
              </p>
              <ul style={{
                margin: '0',
                paddingLeft: '20px',
                color: '#991b1b',
                fontSize: '14px'
              }}>
                {getAreasMissingRisk().map((area, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <strong>{area.areaName}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Impact Areas List - From ECR-1 Involved Areas (mandatory) */}
      <div style={styles.areasList}>
        {loadingAreas ? (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
            <p>{language === 'es' ? 'Cargando TFT de impacto...' : 'Loading impact TFTs...'}</p>
          </div>
        ) : impactAnalysis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
            <p>{language === 'es' ? 'No hay TFT involucradas seleccionadas en ECR-1.' : 'No involved TFTs selected in ECR-1.'}</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              {language === 'es' ? 'Regresa a ECR-1 y selecciona las TFT involucradas en este cambio.' : 'Go back to ECR-1 and select the TFTs involved in this change.'}
            </p>
          </div>
        ) : null}

        {!loadingAreas && impactAnalysis.filter(item => !item.isCustom).map(analysisItem => {
          // Get area config from impactAreas
          const area = impactAreas.find(a => a.key === analysisItem.areaKey) || {
            key: analysisItem.areaKey,
            name: analysisItem.areaName,
            icon: analysisItem.icon || '',
            color: analysisItem.color || '#6b7280',
            description: '',
            subsections: [],
            defaultValidators: []
          };
          const areaData = getAreaData(area.key);

          return (
            <div key={area.key} style={styles.areaContainer}>
              {/* Area Header (no checkbox - mandatory from ECR-1) */}
              <div style={{...styles.areaCheckbox, cursor: 'default'}}>
                <span style={{
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  marginRight: '8px'
                }}>
                   Asignada
                </span>
                <div style={styles.areaHeader}>
                  <span style={styles.areaName}>{area.name}</span>
                  <span style={styles.areaDescription}>{area.description}</span>
                </div>
              </div>

              {/* Area Details (always shown - mandatory) */}
              {areaData && (
                <div style={{
                  ...styles.areaDetails,
                  borderLeftColor: area.color
                }}>
                  {/* Standard fields for ALL areas including Customer */}
                  <>
                    {/* Responsible User - filtered by area's team members */}
                      <div style={styles.field}>
                        <label style={styles.label}>{language === 'es' ? 'Responsable del Análisis' : 'Analysis Responsible'} *</label>
                        <select
                          style={styles.select}
                          value={areaData.responsibleUserId || ''}
                          onChange={(e) => updateAreaData(area.key, 'responsibleUserId', parseInt(e.target.value))}
                        >
                          <option value="">{language === 'es' ? 'Seleccionar responsable...' : 'Select responsible...'}</option>
                          {(() => {
                            // Get team members for this area
                            const teamMemberIds = area.defaultValidators || [];
                            // Filter users by team members, or show all if no team configured
                            const filteredUsers = teamMemberIds.length > 0
                              ? users.filter(u => teamMemberIds.includes(u.id))
                              : users;
                            return filteredUsers.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} - {user.position}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* Subsections Checkboxes (if area has subsections) */}
                      {area.subsections && area.subsections.length > 0 && (
                        <div style={styles.field}>
                          <label style={styles.label}>{language === 'es' ? 'Aspectos Afectados' : 'Affected Aspects'}</label>
                          <div style={styles.subsectionsGrid}>
                            {area.subsections.map(subsection => (
                              <label key={subsection.key} style={styles.subsectionCheckbox}>
                                <input
                                  type="checkbox"
                                  checked={(areaData.selectedSubsections || []).includes(subsection.key)}
                                  onChange={() => toggleSubsection(area.key, subsection.key)}
                                  style={styles.checkbox}
                                />
                                <span>{subsection.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risk Assessment Section */}
                      <div style={{
                        ...styles.field,
                        backgroundColor: t.bg,
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${t.border}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <label style={{...styles.label, color: '#ef4444', fontWeight: '600', minWidth: '140px', margin: 0}}>
                            {tr('ecr.impactAnalysis.riskAssessment')}
                          </label>

                          {/* Severity Dropdown */}
                          <div style={{flex: 1}}>
                            <select
                              style={styles.select}
                              value={areaData.severity || ''}
                              onChange={(e) => updateSeverity(area.key, parseInt(e.target.value))}
                            >
                              <option value="">{language === 'es' ? 'Severidad...' : 'Severity...'}</option>
                              <option value="1">{language === 'es' ? 'Menor (1-3)' : 'Minor (1-3)'}</option>
                              <option value="2">{language === 'es' ? 'Moderado (4-6)' : 'Moderate (4-6)'}</option>
                              <option value="3">{language === 'es' ? 'Severo (7-8)' : 'Severe (7-8)'}</option>
                              <option value="4">{language === 'es' ? 'Crítico (9-10)' : 'Critical (9-10)'}</option>
                            </select>
                          </div>

                          {/* Occurrence Dropdown */}
                          <div style={{flex: 1}}>
                            <select
                              style={styles.select}
                              value={areaData.occurrence || ''}
                              onChange={(e) => updateOccurrence(area.key, parseInt(e.target.value))}
                            >
                              <option value="">{language === 'es' ? 'Ocurrencia...' : 'Occurrence...'}</option>
                              <option value="1">{language === 'es' ? 'Raro (1-3)' : 'Rare (1-3)'}</option>
                              <option value="2">{language === 'es' ? 'Ocasional (4-6)' : 'Occasional (4-6)'}</option>
                              <option value="3">{language === 'es' ? 'Frecuente (7-8)' : 'Frequent (7-8)'}</option>
                              <option value="4">{language === 'es' ? 'Muy Frecuente (9-10)' : 'Very Frequent (9-10)'}</option>
                            </select>
                          </div>

                          {/* Risk Level Result */}
                          <div style={{flex: 1}}>
                            <div style={{
                              padding: '10px 16px',
                              backgroundColor: areaData.riskLevel ? getRiskDisplay(areaData.riskLevel).color : '#E6EAEE',
                              color: 'white',
                              borderRadius: '6px',
                              textAlign: 'center',
                              fontWeight: '600',
                              fontSize: '14px',
                              height: '42px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {areaData.riskLevel ? (
                                <span>
                                  {getRiskDisplay(areaData.riskLevel).icon} {getRiskDisplay(areaData.riskLevel).label}
                                </span>
                              ) : (
                                <span style={{color: t.textDim}}>-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Impact Description */}
                      <div style={styles.field}>
                        <label style={styles.label}>{language === 'es' ? 'Descripción del Impacto' : 'Impact Description'} *</label>
                        <textarea
                          style={styles.textarea}
                          value={areaData.impactDescription || ''}
                          onChange={(e) => updateAreaData(area.key, 'impactDescription', e.target.value)}
                          placeholder={language === 'es' ? `Describe cómo este cambio afecta el TFT de ${area.name}...` : `Describe how this change affects the ${area.name} TFT...`}
                          rows={4}
                        />
                      </div>

                      {/* Evidence Upload */}
                      <div style={styles.field}>
                        <label style={styles.label}>{language === 'es' ? 'Evidencia de Soporte' : 'Supporting Evidence'}</label>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleEvidenceUpload(area.key, e.target.files)}
                          style={styles.fileInput}
                          disabled={uploadingEvidence === area.key || !data.id}
                        />
                        {!data.id && (
                          <p style={styles.helpText}>
                             Guarda el ECR primero para poder subir evidencia
                          </p>
                        )}
                        {uploadingEvidence === area.key && (
                          <p style={styles.uploadingText}>Subiendo archivos...</p>
                        )}

                        {/* Uploaded Files */}
                        {areaData.evidenceFiles && areaData.evidenceFiles.length > 0 && (
                          <div style={styles.filesContainer}>
                            <p style={styles.filesLabel}>Archivos adjuntos:</p>
                            {areaData.evidenceFiles.map((file, index) => (
                              <div key={index} style={styles.fileItem}>
                                <a
                                  href={`http://localhost:5000${file.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.fileLink}
                                >
                                   {file.name}
                                </a>
                                <button
                                  onClick={() => removeEvidenceFile(area.key, index)}
                                  style={styles.removeFileButton}
                                  title={language === 'es' ? 'Eliminar archivo' : 'Delete file'}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </>
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* ============================================================ */}
      {/* CUSTOMER NOTIFICATION SECTION - Always visible */}
      {/* ============================================================ */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#fffbeb',
        borderRadius: '8px',
        border: '2px solid #f59e0b'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '700',
          color: '#92400e'
        }}>
          Notificación al Cliente
        </h3>

        {/* Affects Customer */}
        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={customerImpact.affectsCustomer || false}
              onChange={(e) => updateCustomerImpact('affectsCustomer', e.target.checked)}
              style={styles.checkbox}
            />
            <span style={{fontWeight: '600', fontSize: '14px'}}>
              ¿Este cambio afecta al cliente o al producto/servicio entregado al cliente?
            </span>
          </label>
        </div>

        {customerImpact.affectsCustomer && (
          <>
            {/* Impact Description */}
            <div style={styles.field}>
              <label style={styles.label}>{language === 'es' ? 'Descripción del Impacto al Cliente *' : 'Customer Impact Description *'}</label>
              <textarea
                style={styles.textarea}
                value={customerImpact.impactDescription || ''}
                onChange={(e) => updateCustomerImpact('impactDescription', e.target.value)}
                placeholder={language === 'es' ? 'Describe cómo este cambio afecta al cliente (dimensiones, especificaciones, calidad, empaque, etc.)...' : 'Describe how this change affects the customer (dimensions, specifications, quality, packaging, etc.)...'}
                rows={3}
              />
            </div>

            {/* Requires Notification */}
            <div style={styles.field}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={customerImpact.requiresNotification}
                  onChange={(e) => updateCustomerImpact('requiresNotification', e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{fontWeight: '500'}}>¿Se requiere notificar al cliente sobre este cambio?</span>
              </label>
            </div>

            {customerImpact.requiresNotification && (
              <>
                {/* Notification Method */}
                <div style={styles.field}>
                  <label style={styles.label}>Método de Notificación *</label>
                  <select
                    style={styles.select}
                    value={customerImpact.notificationMethod || 'none'}
                    onChange={(e) => updateCustomerImpact('notificationMethod', e.target.value)}
                  >
                    <option value="none">Seleccionar método...</option>
                    <option value="email">Email / Correo Electrónico</option>
                    <option value="formal_letter">Carta Formal / Official Letter</option>
                    <option value="meeting">Reunión / Meeting</option>
                    <option value="portal">Portal del Cliente</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                {/* Customer Approval Required */}
                <div style={styles.field}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={customerImpact.customerApprovalRequired}
                      onChange={(e) => updateCustomerImpact('customerApprovalRequired', e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>¿Se requiere aprobación formal del cliente?</span>
                  </label>
                </div>

                {/* Customer Evidence Upload */}
                <div style={styles.field}>
                  <label style={styles.label}>Evidencia de Notificación / Aprobación del Cliente</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.msg,.eml"
                    onChange={(e) => handleCustomerEvidenceUpload(e.target.files)}
                    style={styles.fileInput}
                    disabled={uploadingEvidence === 'customer' || !data.id}
                  />
                  {!data.id && (
                    <p style={styles.helpText}>
                      Guarda el ECR primero para poder subir evidencia
                    </p>
                  )}
                  {uploadingEvidence === 'customer' && (
                    <p style={styles.uploadingText}>Subiendo archivos...</p>
                  )}

                  {/* Uploaded Customer Files */}
                  {customerImpact.evidenceFiles && customerImpact.evidenceFiles.length > 0 && (
                    <div style={styles.filesContainer}>
                      <p style={styles.filesLabel}>Archivos de notificación adjuntos:</p>
                      {customerImpact.evidenceFiles.map((file, index) => (
                        <div key={index} style={styles.fileItem}>
                          <a
                            href={`http://localhost:5000${file.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.fileLink}
                          >
                            {file.name}
                          </a>
                          <button
                            onClick={() => removeCustomerEvidenceFile(index)}
                            style={styles.removeFileButton}
                            title={language === 'es' ? 'Eliminar archivo' : 'Delete file'}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {impactAnalysis.length > 0 && (() => {
        // Calculate maximum risk level
        const riskPriority = { high: 3, medium: 2, low: 1 };
        const areasWithRisk = impactAnalysis.filter(item => item.riskLevel);
        const maxRiskLevel = areasWithRisk.length > 0
          ? areasWithRisk.reduce((max, item) =>
              riskPriority[item.riskLevel] > riskPriority[max] ? item.riskLevel : max
            , areasWithRisk[0].riskLevel)
          : null;

        const areasWithMaxRisk = maxRiskLevel
          ? impactAnalysis.filter(item => item.riskLevel === maxRiskLevel)
          : [];

        const validationSuggestions = maxRiskLevel && riskMatrixConfig?.validationSuggestions?.[maxRiskLevel]
          ? riskMatrixConfig.validationSuggestions[maxRiskLevel]
          : [];

        return (
          <div style={styles.summary}>
            <h3 style={styles.summaryTitle}>Resumen del Análisis</h3>
            <p style={styles.summaryText}>
              {impactAnalysis.length} TFT(s) afectada(s)
            </p>
            <div style={styles.summaryAreas}>
              {impactAnalysis.map(item => (
                <span key={item.areaKey} style={{
                  ...styles.summaryBadge,
                  backgroundColor: item.color
                }}>
                  {item.areaName}
                </span>
              ))}
            </div>

            {/* Risk Assessment Summary */}
            {maxRiskLevel && areasWithMaxRisk.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: maxRiskLevel === 'high' ? '#fee2e2' : maxRiskLevel === 'medium' ? '#fef3c7' : '#d1fae5',
                borderRadius: '8px',
                border: `2px solid ${maxRiskLevel === 'high' ? '#ef4444' : maxRiskLevel === 'medium' ? '#C77700' : '#2E7D32'}`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                  <span style={{fontSize: '24px'}}>
                    {getRiskDisplay(maxRiskLevel).icon}
                  </span>
                  <h4 style={{margin: 0, fontSize: '16px', fontWeight: '600', color: t.text}}>
                    Nivel de Riesgo Máximo: {getRiskDisplay(maxRiskLevel).label}
                  </h4>
                </div>

                <p style={{margin: '0 0 12px 0', fontSize: '14px', color: t.text}}>
                  {areasWithMaxRisk.length === 1 ? (
                    <>
                      <strong>{areasWithMaxRisk[0].icon} {areasWithMaxRisk[0].areaName}</strong> tiene una evaluación de riesgo <strong>{getRiskDisplay(maxRiskLevel).label}</strong>.
                    </>
                  ) : (
                    <>
                      Las siguientes TFT tienen una evaluación de riesgo <strong>{getRiskDisplay(maxRiskLevel).label}</strong>:{' '}
                      <strong>
                        {areasWithMaxRisk.map((area, idx) => (
                          <span key={area.areaKey}>
                            {area.areaName}
                            {idx < areasWithMaxRisk.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </strong>.
                    </>
                  )}
                </p>

                {validationSuggestions.length > 0 && (
                  <>
                    <p style={{margin: '12px 0 8px 0', fontSize: '14px', fontWeight: '600', color: t.text}}>
                      Adicional a las actividades normales para concluir el cambio, se requiere confirmar:
                    </p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {validationSuggestions.map((suggestion, idx) => (
                        <label key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: isValidationSelected(suggestion) ? '#f0fdf4' : 'white',
                          borderRadius: '6px',
                          border: isValidationSelected(suggestion) ? '2px solid #2E7D32' : '1px solid #d1d5db',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: t.text
                        }}>
                          <input
                            type="checkbox"
                            checked={isValidationSelected(suggestion)}
                            onChange={() => toggleValidation(suggestion)}
                            style={{width: '18px', height: '18px', cursor: 'pointer'}}
                          />
                          <span>{suggestion}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Approval Assignment Section */}
      <ECRApprovalAssignment data={data} onDataUpdate={onDataUpdate} />
      </div>{/* End of read-only wrapper */}
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
    marginBottom: '24px'
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
  disclaimer: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '24px'
  },
  disclaimerText: {
    fontSize: '13px',
    color: '#92400e',
    margin: 0,
    lineHeight: '1.5'
  },
  areasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  areaContainer: {
    border: `1px solid ${t.border}`,
    borderRadius: '8px',
    overflow: 'hidden'
  },
  areaCheckbox: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    cursor: 'pointer',
    gap: '12px',
    backgroundColor: t.bg,
    transition: 'background-color 0.2s'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  areaIcon: {
    fontSize: '32px'
  },
  areaHeader: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  areaName: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text
  },
  areaDescription: {
    fontSize: '13px',
    color: t.textMuted
  },
  areaDetails: {
    padding: '20px',
    backgroundColor: t.bgCard,
    borderLeft: '4px solid #0072CE',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: t.text
  },
  select: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: t.bgCard
  },
  textarea: {
    padding: '10px 12px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  fileInput: {
    padding: '8px',
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    fontSize: '14px'
  },
  helpText: {
    fontSize: '12px',
    color: t.textMuted,
    margin: '4px 0 0 0'
  },
  uploadingText: {
    fontSize: '13px',
    color: '#0072CE',
    margin: '4px 0 0 0'
  },
  filesContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: t.bg,
    borderRadius: '6px'
  },
  filesLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: t.text,
    margin: '0 0 8px 0'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '4px',
    marginBottom: '6px'
  },
  fileLink: {
    fontSize: '13px',
    color: '#0072CE',
    textDecoration: 'none'
  },
  removeFileButton: {
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: '1',
    fontWeight: 'bold'
  },
  summary: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe'
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  summaryText: {
    fontSize: '14px',
    color: t.textMuted,
    margin: '0 0 12px 0'
  },
  summaryAreas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  summaryBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: t.text
  },
  // Subsections Styles
  subsectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
    padding: '12px',
    backgroundColor: t.bg,
    borderRadius: '6px',
    border: `1px solid ${t.border}`
  },
  subsectionCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    color: t.text,
    padding: '4px'
  }
});

export default ECRImpactAnalysis;
