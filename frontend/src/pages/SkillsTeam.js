/**
 * SkillsTeam.js
 * Vista del equipo para supervisores - Asignar perfiles y evaluar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import {
  getTeam,
  getProfiles,
  assignUserProfile,
  uploadUserPhoto,
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

const SkillsTeam = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  // Traducciones locales
  const L = {
    en: {
      title: 'My Team',
      subtitle: 'Team skills management',
      modules: 'Modules',
      dashboard: 'Dashboard',
      config: 'Configuration',
      refresh: 'Refresh',
      // Messages
      errorLoading: 'Error loading data',
      profileAssigned: 'Profile assigned successfully',
      errorAssigning: 'Error assigning',
      photoUpdated: 'Photo updated',
      errorUploadingPhoto: 'Error uploading photo',
      connectionError: 'Connection error',
      // Labels
      noCategory: 'No category',
      noPosition: 'No position',
      noDept: 'No dept',
      notEvaluated: 'Not evaluated',
      noProfile: 'No profile',
      // Modal
      assignProfile: 'Assign Profile',
      selectProfile: 'Select profile',
      assign: 'Assign',
      cancel: 'Cancel',
      // Actions
      evaluate: 'Evaluate',
      viewHistory: 'View History',
      changePhoto: 'Change Photo'
    },
    es: {
      title: 'Mi Equipo',
      subtitle: 'Gestión de habilidades del equipo',
      modules: 'Módulos',
      dashboard: 'Dashboard',
      config: 'Configuración',
      refresh: 'Actualizar',
      // Messages
      errorLoading: 'Error al cargar datos',
      profileAssigned: 'Perfil asignado correctamente',
      errorAssigning: 'Error al asignar',
      photoUpdated: 'Foto actualizada',
      errorUploadingPhoto: 'Error al subir foto',
      connectionError: 'Error de conexión',
      // Labels
      noCategory: 'Sin categoría',
      noPosition: 'Sin puesto',
      noDept: 'Sin depto',
      notEvaluated: 'Sin evaluar',
      noProfile: 'Sin perfil',
      // Modal
      assignProfile: 'Asignar Perfil',
      selectProfile: 'Seleccionar perfil',
      assign: 'Asignar',
      cancel: 'Cancelar',
      // Actions
      evaluate: 'Evaluar',
      viewHistory: 'Ver Historial',
      changePhoto: 'Cambiar Foto'
    }
  }[language] || {};

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [radarData, setRadarData] = useState({}); // { userId: { categories: [], currentAvgScore: number } }
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, profilesRes] = await Promise.all([
        getTeam(),
        getProfiles()
      ]);
      const teamData = teamRes.data || [];
      setTeam(teamData);
      setProfiles(profilesRes.data || []);

      // Fetch radar data for each team member in parallel
      const radarPromises = teamData.map(async (member) => {
        try {
          const pivotRes = await getHistoryPivot(member.userId, 1);
          if (pivotRes.success && pivotRes.data) {
            // Agrupar TODAS las habilidades del perfil por categoría
            // El promedio = suma de scores / total de habilidades (no evaluadas = 0)
            const allSkills = pivotRes.data.skills || [];
            const categoryMap = {};

            for (const skill of allSkills) {
              const catName = skill.categoryName || L.noCategory;
              if (!categoryMap[catName]) {
                categoryMap[catName] = {
                  category: catName,
                  color: skill.categoryColor || COLORS.blue,
                  totalSkills: 0,
                  sumScores: 0,
                  targets: []
                };
              }
              categoryMap[catName].totalSkills++;
              // Sumar score si existe, sino cuenta como 0
              categoryMap[catName].sumScores += (skill.currentScore || 0);
              categoryMap[catName].targets.push(skill.currentTarget || skill.profileTarget || 3);
            }

            // Calcular promedios por categoría (dividir entre TODAS las habilidades)
            const chartData = Object.values(categoryMap).map(cat => ({
              category: cat.category.length > 10 ? cat.category.substring(0, 8) + '...' : cat.category,
              fullName: cat.category,
              score: cat.sumScores / cat.totalSkills,
              target: cat.targets.reduce((a, b) => a + b, 0) / cat.targets.length,
              color: cat.color
            }));

            return {
              userId: member.userId,
              data: {
                categories: chartData,
                currentAvgScore: pivotRes.data.currentAvgScore
              }
            };
          }
        } catch (e) {
          console.error(`Error fetching radar for user ${member.userId}:`, e);
        }
        return { userId: member.userId, data: { categories: [], currentAvgScore: null } };
      });

      const radarResults = await Promise.all(radarPromises);
      const radarMap = {};
      radarResults.forEach(r => { radarMap[r.userId] = r.data; });
      setRadarData(radarMap);
    } catch (err) {
      setError(L.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 3000);
  };

  const handleAssignProfile = async () => {
    if (!selectedUser || !selectedProfileId) return;

    try {
      const res = await assignUserProfile(selectedUser.userId, selectedProfileId);
      if (res.success) {
        showMessage(L.profileAssigned);
        setShowAssignModal(false);
        loadData();
      } else {
        showMessage(res.message || L.errorAssigning, true);
      }
    } catch (err) {
      showMessage(L.connectionError, true);
    }
  };

  const handlePhotoUpload = async (userId, file) => {
    try {
      const res = await uploadUserPhoto(userId, file);
      if (res.success) {
        showMessage(L.photoUpdated);
        loadData();
      } else {
        showMessage(L.errorUploadingPhoto, true);
      }
    } catch (err) {
      showMessage(L.connectionError, true);
    }
  };

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
    padding: '20px'
  };

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: t.text }}>
            Mi Equipo
          </h1>
          <p style={{ margin: '4px 0 0 0', color: t.textMuted }}>
            Gestiona las habilidades y capacitación de tu equipo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Módulos
          </button>
          <button onClick={() => navigate('/skills/dashboard')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Dashboard
          </button>
          <button onClick={() => navigate('/skills/config')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {L.config}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Cargando...</div>
      ) : team.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '16px', color: t.text, marginBottom: '8px' }}>No tienes personal a cargo</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Los usuarios que te reporten aparecerán aquí</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {team.map(member => (
            <div key={member.userId} style={cardStyle}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Photo */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: t.bgPanel,
                    overflow: 'hidden',
                    border: `3px solid ${member.profileName ? COLORS.blue : COLORS.gray}`
                  }}>
                    {member.photoPath ? (
                      <img src={`${API_URL}${member.photoPath}`} alt={member.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: t.textMuted, backgroundColor: COLORS.blue + '20' }}>
                        {member.userName?.split(' ').map(n => n.charAt(0)).join('').slice(0,2)}
                      </div>
                    )}
                  </div>
                  {/* Photo upload button */}
                  <label style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '24px',
                    height: '24px',
                    backgroundColor: COLORS.blue,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#fff',
                    fontWeight: '700'
                  }}>
                    +
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && handlePhotoUpload(member.userId, e.target.files[0])}
                    />
                  </label>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
                    {member.userName}
                  </h3>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
                    {member.position || L.noPosition} · {member.departmentName || L.noDept}
                  </div>

                  {/* Profile badges */}
                  {member.profileNames ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {member.profileNames.split(', ').map((pName, idx) => (
                        <span key={idx} style={{
                          padding: '4px 10px',
                          backgroundColor: COLORS.blue + '20',
                          color: COLORS.blue,
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {pName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{
                      padding: '4px 10px',
                      backgroundColor: COLORS.orange + '20',
                      color: COLORS.orange,
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}>
                      Sin perfil
                    </span>
                  )}
                </div>
              </div>

              {/* Evaluación Actual + Mini Radar */}
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: radarData[member.userId]?.categories?.length > 0 ? '8px' : '0' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>Evaluación Actual</div>
                    <div style={{ fontSize: '13px', color: t.text }}>
                      {member.lastEvaluationDate
                        ? new Date(member.lastEvaluationDate).toLocaleDateString('es-MX')
                        : L.notEvaluated
                      }
                    </div>
                  </div>
                  {radarData[member.userId]?.currentAvgScore != null ? (
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: radarData[member.userId].currentAvgScore >= 3 ? COLORS.green :
                             radarData[member.userId].currentAvgScore >= 2 ? COLORS.orange : COLORS.red
                    }}>
                      {radarData[member.userId].currentAvgScore.toFixed(1)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: t.textMuted }}>—</div>
                  )}
                </div>

                {/* Mini Radar Chart - Por Categoría */}
                {radarData[member.userId]?.categories?.length > 0 && (
                  <div style={{ height: '160px', marginTop: '8px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData[member.userId].categories} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                        <PolarGrid stroke={t.border} />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fontSize: 10, fill: t.textMuted }}
                        />
                        <Radar
                          name="Target"
                          dataKey="target"
                          stroke={COLORS.orange}
                          fill={COLORS.orange}
                          fillOpacity={0.15}
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke={COLORS.blue}
                          fill={COLORS.blue}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/skills/profile/${member.userId}`)}
                  style={{ flex: 1, padding: '8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: t.text }}
                >
                  Ver Perfil
                </button>
                <button
                  onClick={() => { setSelectedUser(member); setSelectedProfileId(member.skillProfileId || ''); setShowAssignModal(true); }}
                  style={{ flex: 1, padding: '8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: t.text }}
                >
                  Asignar Perfil
                </button>
                <button
                  onClick={() => navigate(`/skills/evaluate/${member.userId}`)}
                  style={{ flex: 1, padding: '8px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#fff' }}
                >
                  Capacitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Asignar Perfil */}
      {showAssignModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 8px 0', color: t.text }}>Asignar Perfil</h3>
            <p style={{ margin: '0 0 20px 0', color: t.textMuted, fontSize: '14px' }}>
              {selectedUser.userName}
            </p>

            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              style={{ width: '100%', padding: '12px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, marginBottom: '20px' }}
            >
              <option value="">Sin perfil</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAssignModal(false)} style={{ padding: '10px 20px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAssignProfile} style={{ padding: '10px 20px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsTeam;
