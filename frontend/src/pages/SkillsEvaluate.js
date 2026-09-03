/**
 * SkillsEvaluate.js
 * Formulario para registrar evidencia de capacitación de un usuario
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getUserAssignments,
  getScales,
  createEvaluation,
  completeEvaluation,
  uploadEvidence,
  getHistoryPivot
} from '../services/skillsService';

const API_URL = 'http://localhost:5000';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const SkillsEvaluate = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const L = {
    en: {
      errorLoading: 'Error loading data',
      selectAtLeastOne: 'Select at least one skill to evaluate',
      trainingCompleted: 'Training completed',
      evidencesUploaded: 'evidence(s) uploaded',
      savedCompleted: 'Training saved and completed',
      savedDraft: 'Training saved as draft',
      errorSaving: 'Error saving',
      connectionError: 'Connection error',
      loading: 'Loading...',
      back: '← Back',
      modules: 'Modules',
      registerTraining: 'Register Training',
      noProfile: 'No profile',
      skillsSelected: 'skill(s) selected',
      saveDraft: 'Save Draft',
      saveComplete: 'Save and Complete',
      period: 'Period',
      periodPlaceholder: 'E.g.: 2026-Q2',
      evaluationScale: 'EVALUATION SCALE',
      noSkillsAssigned: 'This user has no skills assigned',
      assignProfileFirst: 'Assign a profile or individual skills first',
      selectSkillsInfo: 'Select the skills you want to evaluate. You don\'t need to evaluate all of them in a single session.',
      selected: 'selected',
      selectAll: 'Select all',
      current: 'Current',
      levelAchieved: 'LEVEL ACHIEVED',
      target: 'TARGET',
      trainingType: 'TRAINING TYPE',
      notSpecified: 'Not specified',
      internal: 'Internal (company)',
      external: 'External (provider)',
      evidenceOptional: 'EVIDENCE (OPTIONAL)',
      observationsPlaceholder: 'Observations or comments...',
      generalNotes: 'General Notes',
      generalObservationsPlaceholder: 'General observations about the training...'
    },
    es: {
      errorLoading: 'Error al cargar datos',
      selectAtLeastOne: 'Selecciona al menos una habilidad para evaluar',
      trainingCompleted: 'Capacitación completada',
      evidencesUploaded: 'evidencia(s) subida(s)',
      savedCompleted: 'Capacitación guardada y completada',
      savedDraft: 'Capacitación guardada como borrador',
      errorSaving: 'Error al guardar',
      connectionError: 'Error de conexión',
      loading: 'Cargando...',
      back: '{L.back}',
      modules: 'Módulos',
      registerTraining: 'Registrar Capacitación',
      noProfile: 'Sin perfil',
      skillsSelected: 'habilidad(es) seleccionada(s)',
      saveDraft: 'Guardar Borrador',
      saveComplete: 'Guardar y Completar',
      period: 'Período',
      periodPlaceholder: 'Ej: 2026-Q2',
      evaluationScale: 'ESCALA DE EVALUACIÓN',
      noSkillsAssigned: 'Este usuario no tiene habilidades asignadas',
      assignProfileFirst: 'Asigna un perfil o habilidades individuales primero',
      selectSkillsInfo: 'Selecciona las habilidades que deseas evaluar. No es necesario evaluar todas en una sola sesión.',
      selected: 'seleccionadas',
      selectAll: 'Seleccionar todas',
      current: 'Actual',
      levelAchieved: 'NIVEL ALCANZADO',
      target: 'TARGET',
      trainingType: 'TIPO DE CAPACITACIÓN',
      notSpecified: 'No especificado',
      internal: 'Interna (empresa)',
      external: 'Externa (proveedor)',
      evidenceOptional: 'EVIDENCIA (OPCIONAL)',
      observationsPlaceholder: 'Observaciones o comentarios...',
      generalNotes: 'Notas Generales',
      generalObservationsPlaceholder: 'Observaciones generales de la capacitación...'
    }
  }[language] || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [scales, setScales] = useState([]);
  const [period, setPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [scores, setScores] = useState({});
  const [selectedSkills, setSelectedSkills] = useState(new Set());
  const [currentScores, setCurrentScores] = useState({}); // Score actual por habilidad

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, scalesRes, pivotRes] = await Promise.all([
        getUserAssignments(userId),
        getScales(),
        getHistoryPivot(userId, 1) // Solo necesitamos los currentScores
      ]);

      // Cargar scores actuales
      const currentMap = {};
      if (pivotRes.success && pivotRes.data.skills) {
        pivotRes.data.skills.forEach(s => {
          currentMap[s.skillId] = s.currentScore;
        });
      }
      setCurrentScores(currentMap);

      if (assignRes.success) {
        setUser(assignRes.data.user);
        setSkills(assignRes.data.skills || []);

        // Initialize scores con INTERNAL por default
        const initialScores = {};
        assignRes.data.skills?.forEach(skill => {
          initialScores[skill.skillId] = {
            score: skill.targetLevel,
            target: skill.targetLevel,
            notes: '',
            trainingType: 'INTERNAL', // Default a INTERNAL
            evidenceFile: null
          };
        });
        setScores(initialScores);
      }

      setScales(scalesRes.data || []);
    } catch (err) {
      setError(L.errorLoading);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateScore = (skillId, field, value) => {
    setScores(prev => ({
      ...prev,
      [skillId]: {
        ...prev[skillId],
        [field]: value
      }
    }));
  };

  const toggleSkillSelection = (skillId) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  const selectAllInCategory = (categorySkills) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      categorySkills.forEach(s => newSet.add(s.skillId));
      return newSet;
    });
  };

  const handleSave = async (complete = false) => {
    if (selectedSkills.size === 0) {
      setError(L.selectAtLeastOne);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Preparar scores con trainingType
      const scoresArray = Object.entries(scores)
        .filter(([skillId]) => selectedSkills.has(parseInt(skillId)))
        .map(([skillId, data]) => ({
          skillId: parseInt(skillId),
          score: parseInt(data.score),
          target: parseInt(data.target),
          notes: data.notes,
          trainingType: data.trainingType || null
        }));

      const res = await createEvaluation({
        userId: parseInt(userId),
        period: period || null,
        notes,
        scores: scoresArray
      });

      if (res.success) {
        const evaluationId = res.data.id;
        const createdScores = res.data.scores || [];

        // Subir archivos de evidencia si hay
        const filesData = Object.entries(scores)
          .filter(([skillId]) => selectedSkills.has(parseInt(skillId)) && scores[skillId].evidenceFile)
          .map(([skillId, data]) => {
            const scoreInfo = createdScores.find(s => s.skillId === parseInt(skillId));
            return {
              scoreId: scoreInfo?.scoreId,
              file: data.evidenceFile
            };
          })
          .filter(f => f.scoreId);

        // Subir cada archivo
        let uploadedCount = 0;
        for (const fileData of filesData) {
          try {
            await uploadEvidence(fileData.scoreId, fileData.file);
            uploadedCount++;
          } catch (err) {
            console.error('Error uploading evidence:', err);
          }
        }

        if (complete) {
          await completeEvaluation(evaluationId);
          if (uploadedCount > 0) {
            setSuccess(`${L.trainingCompleted}. ${uploadedCount} ${L.evidencesUploaded}.`);
          } else {
            setSuccess(L.savedCompleted);
          }
        } else {
          setSuccess(L.savedDraft);
        }
        setTimeout(() => navigate(`/skills/profile/${userId}`), 1500);
      } else {
        setError(res.message || L.errorSaving);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setSaving(false);
    }
  };

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.categoryName;
    if (!acc[cat]) {
      acc[cat] = {
        icon: skill.categoryIcon,
        color: skill.categoryColor,
        skills: []
      };
    }
    acc[cat].skills.push(skill);
    return acc;
  }, {});

  // Get scale levels
  const defaultScale = scales.find(s => s.isDefault) || scales[0];
  const levels = defaultScale?.levels || [];

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px'
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: t.textMuted }}>{L.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {L.back}
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {L.modules}
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
              {L.registerTraining}
            </h1>
            {user && (
              <p style={{ margin: '4px 0 0 0', color: t.textMuted }}>
                {user.firstName} {user.lastName} · {user.profileName || L.noProfile}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: t.textMuted }}>
            {selectedSkills.size} {L.skillsSelected}
          </span>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || selectedSkills.size === 0}
            style={{ padding: '10px 20px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer', opacity: selectedSkills.size === 0 ? 0.5 : 1 }}
          >
            💾 {L.saveDraft}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || selectedSkills.size === 0}
            style={{ padding: '10px 20px', backgroundColor: COLORS.green, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', opacity: selectedSkills.size === 0 ? 0.5 : 1 }}
          >
            {L.saveComplete}
          </button>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <ThemeSelector />
        </div>
      </div>

      {/* Messages */}
      {error && <div style={{ padding: '12px', backgroundColor: COLORS.red + '20', color: COLORS.red, borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '12px', backgroundColor: COLORS.green + '20', color: COLORS.green, borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

      {/* User card */}
      {user && (
        <div style={{ ...cardStyle, display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: t.bgPanel,
            overflow: 'hidden',
            border: `3px solid ${COLORS.blue}`
          }}>
            {user.photoPath ? (
              <img src={`${API_URL}${user.photoPath}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '600', color: t.textMuted, backgroundColor: COLORS.blue + '20' }}>
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: t.text }}>{user.firstName} {user.lastName}</h2>
            <div style={{ fontSize: '13px', color: t.textMuted }}>{user.email}</div>
            <div style={{ fontSize: '13px', color: t.textMuted }}>{user.position} · {user.departmentName}</div>
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: t.textMuted }}>{L.period}</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder={L.periodPlaceholder}
              style={{ width: '100%', padding: '8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
            />
          </div>
        </div>
      )}

      {/* Scale legend */}
      {levels.length > 0 && (
        <div style={{ ...cardStyle, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '12px' }}>{L.evaluationScale}</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {levels.map(level => (
              <div key={level.levelValue} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: level.color + '15', borderRadius: '6px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: level.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                  {level.levelValue}
                </span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>{level.label}</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>{level.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills by category */}
      {skills.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '16px', color: t.text }}>{L.noSkillsAssigned}</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>{L.assignProfileFirst}</div>
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, padding: '16px', marginBottom: '20px', backgroundColor: COLORS.blue + '10' }}>
            <p style={{ margin: 0, fontSize: '13px', color: t.text }}>
              {L.selectSkillsInfo}
            </p>
          </div>

          {Object.entries(groupedSkills).map(([categoryName, category]) => (
            <div key={categoryName} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: category.color }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: t.text }}>{categoryName}</h3>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>
                    ({category.skills.filter(s => selectedSkills.has(s.skillId)).length}/{category.skills.length} {L.selected})
                  </span>
                </div>
                <button
                  onClick={() => selectAllInCategory(category.skills)}
                  style={{ padding: '4px 12px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: t.text }}
                >
                  {L.selectAll}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {category.skills.map(skill => {
                  const scoreData = scores[skill.skillId] || { score: 3, target: 3, notes: '' };
                  const gap = scoreData.target - scoreData.score;
                  const isSelected = selectedSkills.has(skill.skillId);
                  const currentScore = currentScores[skill.skillId]; // Score actual

                  return (
                    <div
                      key={skill.skillId}
                      style={{
                        padding: '16px',
                        backgroundColor: isSelected ? t.bgPanel : t.bgCard,
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${COLORS.blue}` : `1px solid ${t.border}`,
                        opacity: isSelected ? 1 : 0.7
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isSelected ? '16px' : '0' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkillSelection(skill.skillId)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: t.text }}>{skill.skillName}</div>
                          <div style={{ fontSize: '12px', color: t.textMuted }}>{skill.skillCode}</div>
                        </div>
                        {/* Score Actual */}
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: currentScore != null ? (currentScore >= skill.targetLevel ? COLORS.green + '15' : COLORS.orange + '15') : t.bgPanel,
                          border: `1px solid ${currentScore != null ? (currentScore >= skill.targetLevel ? COLORS.green + '40' : COLORS.orange + '40') : t.border}`,
                          textAlign: 'center',
                          minWidth: '70px'
                        }}>
                          <div style={{ fontSize: '10px', color: t.textMuted }}>{L.current}</div>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: currentScore != null ? (currentScore >= skill.targetLevel ? COLORS.green : COLORS.orange) : t.textMuted }}>
                            {currentScore != null ? currentScore : '—'}
                          </div>
                        </div>
                        {isSelected && gap !== 0 && (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: gap > 0 ? COLORS.red + '20' : COLORS.green + '20',
                            color: gap > 0 ? COLORS.red : COLORS.green
                          }}>
                            Gap: {gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <>
                          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {/* Score selector */}
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: t.textMuted }}>{L.levelAchieved}</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {levels.map(level => (
                                  <button
                                    key={level.levelValue}
                                    onClick={() => updateScore(skill.skillId, 'score', level.levelValue)}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '8px',
                                      border: scoreData.score === level.levelValue ? `3px solid ${level.color}` : `1px solid ${t.border}`,
                                      backgroundColor: scoreData.score === level.levelValue ? level.color : t.bgCard,
                                      color: scoreData.score === level.levelValue ? '#fff' : t.text,
                                      cursor: 'pointer',
                                      fontWeight: '600',
                                      fontSize: '14px'
                                    }}
                                  >
                                    {level.levelValue}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Target selector */}
                            <div>
                              <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: t.textMuted }}>{L.target}</label>
                              <select
                                value={scoreData.target}
                                onChange={(e) => updateScore(skill.skillId, 'target', parseInt(e.target.value))}
                                style={{ padding: '10px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                              >
                                {levels.map(level => (
                                  <option key={level.levelValue} value={level.levelValue}>{level.levelValue} - {level.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Training Type */}
                            <div>
                              <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: t.textMuted }}>{L.trainingType}</label>
                              <select
                                value={scoreData.trainingType || ''}
                                onChange={(e) => updateScore(skill.skillId, 'trainingType', e.target.value)}
                                style={{ padding: '10px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                              >
                                <option value="">{L.notSpecified}</option>
                                <option value="INTERNAL">{L.internal}</option>
                                <option value="EXTERNAL">{L.external}</option>
                              </select>
                            </div>
                          </div>

                          {/* Evidence file upload */}
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: t.textMuted }}>{L.evidenceOptional}</label>
                              <input
                                type="file"
                                onChange={(e) => updateScore(skill.skillId, 'evidenceFile', e.target.files[0] || null)}
                                style={{ fontSize: '12px', color: t.text }}
                              />
                              {scoreData.evidenceFile && (
                                <span style={{ marginLeft: '8px', fontSize: '11px', color: COLORS.green }}>
                                  {scoreData.evidenceFile.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <input
                              type="text"
                              value={scoreData.notes}
                              onChange={(e) => updateScore(skill.skillId, 'notes', e.target.value)}
                              placeholder={L.observationsPlaceholder}
                              style={{ width: '100%', padding: '8px 12px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontSize: '12px' }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* General notes */}
      <div style={cardStyle}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: t.text }}>
          {L.generalNotes}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={L.generalObservationsPlaceholder}
          rows={4}
          style={{ width: '100%', padding: '12px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, resize: 'vertical' }}
        />
      </div>
    </div>
  );
};

export default SkillsEvaluate;
