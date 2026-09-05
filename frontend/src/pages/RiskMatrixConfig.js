import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import riskMatrixService from '../services/riskMatrixService';

const RiskMatrixConfig = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState({
    severityLevels: [
      { value: 1, label: 'Menor', description: 'Impacto mínimo en operaciones' },
      { value: 2, label: 'Moderado', description: 'Impacto moderado, requiere atención' },
      { value: 3, label: 'Severo', description: 'Impacto significativo en calidad/producción' },
      { value: 4, label: 'Crítico', description: 'Impacto crítico, requiere acción inmediata' }
    ],
    occurrenceLevels: [
      { value: 1, label: 'Raro', description: 'Probabilidad muy baja' },
      { value: 2, label: 'Ocasional', description: 'Puede ocurrir ocasionalmente' },
      { value: 3, label: 'Frecuente', description: 'Ocurre con frecuencia' },
      { value: 4, label: 'Muy Frecuente', description: 'Ocurre constantemente' }
    ],
    riskRules: [
      { severity: 1, occurrence: 1, riskLevel: 'low', description: 'Riesgo Bajo' },
      { severity: 1, occurrence: 2, riskLevel: 'low', description: 'Riesgo Bajo' },
      { severity: 1, occurrence: 3, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 1, occurrence: 4, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 2, occurrence: 1, riskLevel: 'low', description: 'Riesgo Bajo' },
      { severity: 2, occurrence: 2, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 2, occurrence: 3, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 2, occurrence: 4, riskLevel: 'high', description: 'Riesgo Alto' },
      { severity: 3, occurrence: 1, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 3, occurrence: 2, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 3, occurrence: 3, riskLevel: 'high', description: 'Riesgo Alto' },
      { severity: 3, occurrence: 4, riskLevel: 'high', description: 'Riesgo Alto' },
      { severity: 4, occurrence: 1, riskLevel: 'medium', description: 'Riesgo Medio' },
      { severity: 4, occurrence: 2, riskLevel: 'high', description: 'Riesgo Alto' },
      { severity: 4, occurrence: 3, riskLevel: 'high', description: 'Riesgo Alto' },
      { severity: 4, occurrence: 4, riskLevel: 'high', description: 'Riesgo Alto' }
    ],
    validationSuggestions: {
      low: ['Revisión documental básica', 'Aprobación de supervisor'],
      medium: ['PFMEA actualizado', 'Control Plan revisado', 'Primera pieza aprobada'],
      high: ['PPAP completo', 'Run@Rate', 'Validación de cliente', 'Auditoría de proceso', 'Capacitación de personal']
    }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const activeConfig = await riskMatrixService.getActiveConfig();
      if (activeConfig) {
        setConfig(activeConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      showError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await riskMatrixService.updateConfig(config);
      showSuccess('Configuración guardada exitosamente');
      navigate(-1);
    } catch (error) {
      console.error('Error saving config:', error);
      showError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Functions to manage validation suggestions
  const updateSuggestion = (riskLevel, index, newValue) => {
    setConfig(prev => ({
      ...prev,
      validationSuggestions: {
        ...prev.validationSuggestions,
        [riskLevel]: prev.validationSuggestions[riskLevel].map((item, i) =>
          i === index ? newValue : item
        )
      }
    }));
  };

  const addSuggestion = (riskLevel) => {
    setConfig(prev => ({
      ...prev,
      validationSuggestions: {
        ...prev.validationSuggestions,
        [riskLevel]: [...prev.validationSuggestions[riskLevel], '']
      }
    }));
  };

  const removeSuggestion = (riskLevel, index) => {
    setConfig(prev => ({
      ...prev,
      validationSuggestions: {
        ...prev.validationSuggestions,
        [riskLevel]: prev.validationSuggestions[riskLevel].filter((_, i) => i !== index)
      }
    }));
  };

  const getRiskColor = (riskLevel) => {
    switch(riskLevel) {
      case 'low': return '#2E7D32';
      case 'medium': return '#C77700';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const updateRiskRule = (severity, occurrence, newRiskLevel) => {
    setConfig(prev => ({
      ...prev,
      riskRules: prev.riskRules.map(rule =>
        rule.severity === severity && rule.occurrence === occurrence
          ? { ...rule, riskLevel: newRiskLevel }
          : rule
      )
    }));
  };

  const getRiskLevel = (severity, occurrence) => {
    const rule = config.riskRules.find(r => r.severity === severity && r.occurrence === occurrence);
    return rule ? rule.riskLevel : 'low';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bgPanel
    },
    header: {
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      padding: '20px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    headerRight: {},
    backButton: {
      padding: '10px 20px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: t.textMuted
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textDim,
      margin: '4px 0 0 0'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    content: {
      padding: '32px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    disclaimer: {
      backgroundColor: `${t.warning}20`,
      border: `2px solid ${t.warning}`,
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '32px'
    },
    disclaimerTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.warning,
      margin: '0 0 12px 0'
    },
    disclaimerText: {
      fontSize: '14px',
      color: t.warning,
      margin: 0,
      lineHeight: '1.6'
    },
    section: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text,
      margin: '0 0 8px 0'
    },
    sectionSubtitle: {
      fontSize: '14px',
      color: t.textDim,
      margin: '0 0 24px 0'
    },
    matrixContainer: {
      overflowX: 'auto'
    },
    matrixGrid: {
      display: 'grid',
      gridTemplateColumns: '200px repeat(4, 1fr)',
      gap: '1px',
      backgroundColor: t.border,
      border: `1px solid ${t.border}`,
      marginBottom: '24px'
    },
    matrixCell: {
      padding: '12px',
      backgroundColor: t.bgCard
    },
    matrixHeaderCell: {
      padding: '16px',
      backgroundColor: t.bgPanel,
      fontWeight: '600',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '80px'
    },
    matrixHeaderLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px'
    },
    matrixHeaderDesc: {
      fontSize: '11px',
      color: t.textDim,
      fontWeight: '400'
    },
    matrixDataCell: {
      padding: '20px',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80px',
      transition: 'opacity 0.2s',
      ':hover': {
        opacity: 0.8
      }
    },
    riskLevelText: {
      textAlign: 'center',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    },
    legend: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      backgroundColor: t.bgPanel,
      borderRadius: '6px'
    },
    legendTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted
    },
    legendItems: {
      display: 'flex',
      gap: '24px'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: t.textDim
    },
    legendBox: {
      width: '24px',
      height: '24px',
      borderRadius: '4px'
    },
    suggestionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px'
    },
    suggestionCard: {
      backgroundColor: t.bgPanel,
      borderLeft: '4px solid',
      borderRadius: '8px',
      padding: '20px'
    },
    suggestionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      margin: '0 0 16px 0'
    },
    suggestionList: {
      margin: 0,
      paddingLeft: '20px',
      fontSize: '14px',
      color: t.textMuted,
      lineHeight: '1.8'
    },
    suggestionItems: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '16px'
    },
    suggestionItem: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    suggestionInput: {
      flex: 1,
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      backgroundColor: t.bgCard,
      color: t.textMuted
    },
    removeSuggestionButton: {
      width: '28px',
      height: '28px',
      padding: 0,
      backgroundColor: `${t.error}15`,
      color: t.error,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    addSuggestionButton: {
      padding: '8px 16px',
      backgroundColor: t.bgCard,
      color: t.textMuted,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    instructionsSection: {
      backgroundColor: `${t.info}10`,
      border: `1px solid ${t.info}40`,
      borderRadius: '8px',
      padding: '24px'
    },
    instructionsTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      margin: '0 0 16px 0'
    },
    instructionsList: {
      margin: 0,
      paddingLeft: '24px',
      fontSize: '14px',
      color: t.text,
      lineHeight: '1.8'
    },
    loadingContainer: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgPanel
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `4px solid ${t.border}`,
      borderTop: `4px solid ${t.accent}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/ecr-dashboard')} style={styles.backButton}>
            ← Volver a ECR Dashboard
          </button>
          <div>
            <h1 style={styles.title}> Configuración de Risk Matrix</h1>
            <p style={styles.subtitle}>
              Configura los niveles de riesgo y las reglas de evaluación para tu empresa
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', marginRight: '12px' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? 'Guardando...' : ' Guardar Configuración'}
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Legal Disclaimer */}
        <div style={styles.disclaimer}>
          <h3 style={styles.disclaimerTitle}> Aviso Legal Importante</h3>
          <p style={styles.disclaimerText}>
            Esta matriz de riesgo es una herramienta orientativa diseñada para ayudar en la evaluación
            de cambios según IATF 16949. Los niveles de riesgo generados son <strong>sugerencias</strong>
            y no sustituyen el juicio profesional de ingenieros, calidad o gerencia. Cada organización
            es responsable de adaptar esta matriz a sus necesidades específicas y de tomar decisiones
            finales basadas en su contexto operacional.
          </p>
        </div>

        {/* Risk Matrix Visualization */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}> Matriz de Riesgo Visual</h2>

          {/* Explicación de los ejes */}
          <div style={{
            backgroundColor: `${t.info}10`,
            border: `1px solid ${t.info}40`,
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <strong style={{ color: t.text, fontSize: '14px' }}>Ocurrencia (Probabilidad):</strong>
                <span style={{ color: t.text, fontSize: '13px', marginLeft: '8px' }}>
                  Frecuencia con la que el riesgo podría ocurrir.
                </span>
              </div>
              <div>
                <strong style={{ color: t.text, fontSize: '14px' }}>Severidad:</strong>
                <span style={{ color: t.text, fontSize: '13px', marginLeft: '8px' }}>
                  Impacto potencial si el riesgo llega a materializarse.
                </span>
              </div>
            </div>
          </div>

          <p style={styles.sectionSubtitle}>
            Haz clic en cada celda para cambiar el nivel de riesgo asignado
          </p>

          <div style={styles.matrixContainer}>
            <div style={styles.matrixGrid}>
              {/* Header Row */}
              <div style={{
                ...styles.matrixHeaderCell,
                fontSize: '13px',
                fontWeight: '600',
                color: t.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                Severidad \ Ocurrencia
              </div>
              {config.occurrenceLevels.map(occ => (
                <div key={occ.value} style={styles.matrixHeaderCell}>
                  <div style={styles.matrixHeaderLabel}>{occ.label}</div>
                  <div style={styles.matrixHeaderDesc}>{occ.description}</div>
                </div>
              ))}

              {/* Data Rows */}
              {config.severityLevels.map(sev => (
                <React.Fragment key={sev.value}>
                  <div style={styles.matrixHeaderCell}>
                    <div style={styles.matrixHeaderLabel}>{sev.label}</div>
                    <div style={styles.matrixHeaderDesc}>{sev.description}</div>
                  </div>
                  {config.occurrenceLevels.map(occ => {
                    const riskLevel = getRiskLevel(sev.value, occ.value);
                    return (
                      <div
                        key={`${sev.value}-${occ.value}`}
                        style={{
                          ...styles.matrixDataCell,
                          backgroundColor: getRiskColor(riskLevel),
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const levels = ['low', 'medium', 'high'];
                          const currentIndex = levels.indexOf(riskLevel);
                          const nextLevel = levels[(currentIndex + 1) % levels.length];
                          updateRiskRule(sev.value, occ.value, nextLevel);
                        }}
                        title="Click para cambiar nivel de riesgo"
                      >
                        <div style={styles.riskLevelText}>
                          {riskLevel === 'low' && 'BAJO'}
                          {riskLevel === 'medium' && 'MEDIO'}
                          {riskLevel === 'high' && 'ALTO'}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Legend */}
            <div style={styles.legend}>
              <div style={styles.legendTitle}>Leyenda:</div>
              <div style={styles.legendItems}>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#2E7D32'}}></div>
                  <span>Riesgo Bajo</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#C77700'}}></div>
                  <span>Riesgo Medio</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendBox, backgroundColor: '#ef4444'}}></div>
                  <span>Riesgo Alto</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Suggestions */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}> Sugerencias de Validación por Nivel</h2>
          <p style={styles.sectionSubtitle}>
            Actividades recomendadas según el nivel de riesgo identificado
          </p>

          <div style={styles.suggestionsGrid}>
            {/* Low Risk */}
            <div style={{...styles.suggestionCard, borderLeftColor: '#2E7D32'}}>
              <h3 style={{...styles.suggestionTitle, color: '#2E7D32'}}> Riesgo Bajo</h3>
              <div style={styles.suggestionItems}>
                {config.validationSuggestions.low.map((item, index) => (
                  <div key={index} style={styles.suggestionItem}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateSuggestion('low', index, e.target.value)}
                      style={styles.suggestionInput}
                      placeholder="Escribe una actividad..."
                    />
                    <button
                      onClick={() => removeSuggestion('low', index)}
                      style={styles.removeSuggestionButton}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addSuggestion('low')}
                style={styles.addSuggestionButton}
              >
                + Agregar actividad
              </button>
            </div>

            {/* Medium Risk */}
            <div style={{...styles.suggestionCard, borderLeftColor: '#C77700'}}>
              <h3 style={{...styles.suggestionTitle, color: '#C77700'}}> Riesgo Medio</h3>
              <div style={styles.suggestionItems}>
                {config.validationSuggestions.medium.map((item, index) => (
                  <div key={index} style={styles.suggestionItem}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateSuggestion('medium', index, e.target.value)}
                      style={styles.suggestionInput}
                      placeholder="Escribe una actividad..."
                    />
                    <button
                      onClick={() => removeSuggestion('medium', index)}
                      style={styles.removeSuggestionButton}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addSuggestion('medium')}
                style={styles.addSuggestionButton}
              >
                + Agregar actividad
              </button>
            </div>

            {/* High Risk */}
            <div style={{...styles.suggestionCard, borderLeftColor: '#ef4444'}}>
              <h3 style={{...styles.suggestionTitle, color: '#ef4444'}}> Riesgo Alto</h3>
              <div style={styles.suggestionItems}>
                {config.validationSuggestions.high.map((item, index) => (
                  <div key={index} style={styles.suggestionItem}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateSuggestion('high', index, e.target.value)}
                      style={styles.suggestionInput}
                      placeholder="Escribe una actividad..."
                    />
                    <button
                      onClick={() => removeSuggestion('high', index)}
                      style={styles.removeSuggestionButton}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addSuggestion('high')}
                style={styles.addSuggestionButton}
              >
                + Agregar actividad
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructionsSection}>
          <h3 style={styles.instructionsTitle}> Instrucciones de Uso</h3>
          <ol style={styles.instructionsList}>
            <li>
              <strong>Personalizar la matriz:</strong> Haz clic en cualquier celda de la matriz
              para cambiar el nivel de riesgo asignado a esa combinación de severidad/ocurrencia.
            </li>
            <li>
              <strong>Niveles de riesgo:</strong> Las celdas pueden ser Bajo (verde), Medio (amarillo),
              o Alto (rojo). Cada click cambia al siguiente nivel en secuencia.
            </li>
            <li>
              <strong>Validaciones sugeridas:</strong> El sistema sugerirá automáticamente
              actividades de validación basadas en el nivel de riesgo calculado.
            </li>
            <li>
              <strong>Guardar cambios:</strong> Al terminar tu configuración, haz clic en
              "Guardar Configuración" para aplicar los cambios a toda la organización.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RiskMatrixConfig;
