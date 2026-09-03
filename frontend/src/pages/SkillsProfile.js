/**
 * SkillsProfile.js
 * Perfil de habilidades del usuario con foto, info y radar charts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Paperclip } from 'lucide-react';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, getEvaluation, getHistoryPivot, getScoreDetail, getEvidenceDownloadUrl } from '../services/skillsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = 'http://localhost:5000';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const SkillsProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const L = {
    en: {
      errorLoading: 'Error loading profile',
      connectionError: 'Connection error',
      competenciesProfile: 'Competencies Profile',
      noPosition: 'No position',
      currentProfile: 'Current Profile:',
      generated: 'Generated:',
      currentSkills: 'Current Skills',
      skill: 'Skill',
      score: 'Score',
      target: 'Target',
      validity: 'Validity',
      trainingHistory: 'Training History',
      loadingProfile: 'Loading profile...',
      userNotFound: 'User not found',
      back: '← Back',
      modules: 'Modules',
      exporting: 'Exporting...',
      exportPdf: 'Export PDF',
      registerTraining: 'Register Training',
      email: 'Email:',
      department: 'Department:',
      noDepartment: 'No department',
      reportsTo: 'Reports to:',
      na: 'N/A',
      assignedProfile: 'Assigned Profile',
      active: 'ACTIVE',
      historical: 'HISTORICAL',
      noProfileAssigned: 'No profile assigned',
      noEvaluations: 'No evaluations',
      currentEvaluation: 'Current Evaluation',
      generalAverage: 'General Average',
      basedOnLastScore: 'Based on last score\nof each skill',
      skillsEvaluated: 'skills evaluated',
      developmentCurve: 'Development Curve',
      profile: 'Profile:',
      allSkillsEvaluated: 'All skills evaluated',
      avgFormula: 'Average = sum of scores / total skills',
      trainingDetail: 'Training Detail',
      noPeriod: 'No period',
      profileSkills: 'Profile Skills',
      historicalCurriculum: 'Historical Curriculum',
      currentProfileBtn: 'Current Profile',
      fullCurriculum: 'Full Curriculum',
      of: 'of',
      skillsEvaluatedLabel: 'skills evaluated',
      showingAllSkills: '(showing all historically evaluated skills)',
      current: 'CURRENT',
      generalAverageUpper: 'GENERAL AVERAGE',
      meetsTarget: 'Meets target',
      nearTarget: 'Near target',
      needsImprovement: 'Needs improvement',
      evidenceAttached: 'Evidence attached',
      internalExternal: 'INT = Internal | EXT = External',
      noEvaluationsProfile: 'No evaluations for this profile skills',
      noHistoricalEvaluations: 'No historical evaluations',
      rating: 'Rating',
      objective: 'Objective',
      date: 'Date:',
      evaluator: 'Evaluator:',
      type: 'Type:',
      internalTraining: 'Internal Training',
      externalTraining: 'External Training',
      notSpecified: 'Not specified',
      validUntil: 'Valid until:',
      notes: 'Notes:',
      downloadEvidence: 'Download Evidence',
      loading: 'Loading...',
      skills: 'skills'
    },
    es: {
      errorLoading: 'Error al cargar perfil',
      connectionError: 'Error de conexión',
      competenciesProfile: 'Perfil de Competencias',
      noPosition: 'Sin puesto',
      currentProfile: 'Perfil Actual:',
      generated: 'Generado:',
      currentSkills: 'Habilidades Actuales',
      skill: 'Habilidad',
      score: 'Score',
      target: 'Objetivo',
      validity: 'Vigencia',
      trainingHistory: 'Historial de Capacitaciones',
      loadingProfile: 'Cargando perfil...',
      userNotFound: 'Usuario no encontrado',
      back: '← Volver',
      modules: 'Módulos',
      exporting: 'Exportando...',
      exportPdf: 'Exportar PDF',
      registerTraining: 'Registrar Capacitación',
      email: 'Email:',
      department: 'Departamento:',
      noDepartment: 'Sin departamento',
      reportsTo: 'Reporta a:',
      na: 'N/A',
      assignedProfile: 'Perfil Asignado',
      active: 'ACTIVO',
      historical: 'HISTÓRICO',
      noProfileAssigned: 'Sin perfil asignado',
      noEvaluations: 'Sin evaluaciones',
      currentEvaluation: 'Evaluación Actual',
      generalAverage: 'Promedio General',
      basedOnLastScore: 'Basado en última calificación\nde cada habilidad',
      skillsEvaluated: 'habilidades evaluadas',
      developmentCurve: 'Curva de Desarrollo',
      profile: 'Perfil:',
      allSkillsEvaluated: 'Todas las habilidades evaluadas',
      avgFormula: 'Promedio = suma de scores / total habilidades',
      trainingDetail: 'Detalle de Capacitación',
      noPeriod: 'Sin período',
      profileSkills: 'Habilidades del Perfil',
      historicalCurriculum: 'Curriculum Histórico',
      currentProfileBtn: 'Perfil Actual',
      fullCurriculum: 'Curriculum Completo',
      of: 'de',
      skillsEvaluatedLabel: 'habilidades evaluadas',
      showingAllSkills: '(mostrando todas las habilidades evaluadas históricamente)',
      current: 'ACTUAL',
      generalAverageUpper: 'PROMEDIO GENERAL',
      meetsTarget: 'Cumple objetivo',
      nearTarget: 'Cerca del objetivo',
      needsImprovement: 'Necesita mejora',
      evidenceAttached: 'Evidencia adjunta',
      internalExternal: 'INT = Interno | EXT = Externo',
      noEvaluationsProfile: 'No hay evaluaciones para las habilidades de este perfil',
      noHistoricalEvaluations: 'No hay evaluaciones históricas',
      rating: 'Calificación',
      objective: 'Objetivo',
      date: 'Fecha:',
      evaluator: 'Evaluador:',
      type: 'Tipo:',
      internalTraining: 'Capacitación Interna',
      externalTraining: 'Capacitación Externa',
      notSpecified: 'No especificado',
      validUntil: 'Vigencia hasta:',
      notes: 'Notas:',
      downloadEvidence: 'Descargar Evidencia',
      loading: 'Cargando...',
      skills: 'habilidades'
    }
  }[language] || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedEvalId, setSelectedEvalId] = useState(null);
  const [evalDetail, setEvalDetail] = useState(null);
  const [historyPivot, setHistoryPivot] = useState(null);
  const [scoreModal, setScoreModal] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [viewMode, setViewMode] = useState('profile'); // 'profile' o 'curriculum'
  const profileRef = useRef(null);

  const loadHistoryPivot = useCallback(async (showAll = false) => {
    const pivotRes = await getHistoryPivot(userId, 20, showAll);
    if (pivotRes.success) {
      setHistoryPivot(pivotRes.data);
    }
  }, [userId]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserProfile(userId);
      if (res.success) {
        setData(res.data);
        if (res.data.lastEvaluation?.evaluationId) {
          setSelectedEvalId(res.data.lastEvaluation.evaluationId);
        }
        // Cargar tabla histórica pivote (modo perfil por default)
        await loadHistoryPivot(false);
      } else {
        setError(res.message || L.errorLoading);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [userId, loadHistoryPivot]);

  const openScoreModal = async (scoreId) => {
    if (!scoreId) return;
    setLoadingScore(true);
    try {
      const res = await getScoreDetail(scoreId);
      if (res.success) {
        setScoreModal(res.data);
      }
    } catch (err) {
      console.error('Error loading score:', err);
    } finally {
      setLoadingScore(false);
    }
  };

  const downloadEvidence = async (scoreId, filename) => {
    try {
      const url = getEvidenceDownloadUrl(scoreId);
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
      }
    } catch (err) {
      console.error('Error downloading evidence:', err);
    }
  };

  const exportToPdf = async () => {
    if (!profileRef.current || !data) return;
    setExportingPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Perfil de Competencias', pageWidth / 2, y, { align: 'center' });
      y += 12;

      // User info
      pdf.setFontSize(14);
      pdf.text(`${user.firstName} ${user.lastName}`, pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(user.position || 'Sin puesto', pageWidth / 2, y, { align: 'center' });
      y += 5;
      pdf.text(user.departmentName || '', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Profile info
      const activeProfile = profiles?.find(p => p.isActive);
      if (activeProfile) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Perfil Actual:', margin, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(activeProfile.profileName, margin + 30, y);
        y += 8;
      }

      // Fecha
      pdf.setFontSize(9);
      pdf.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, margin, y);
      y += 12;

      // Capturar radar chart si existe
      const radarElement = document.querySelector('.recharts-responsive-container');
      if (radarElement) {
        const radarCanvas = await html2canvas(radarElement, { scale: 2, backgroundColor: '#ffffff' });
        const radarImg = radarCanvas.toDataURL('image/png');
        const imgWidth = 120;
        const imgHeight = (radarCanvas.height / radarCanvas.width) * imgWidth;
        pdf.addImage(radarImg, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      }

      // Tabla de habilidades actuales
      if (data.currentSkills && data.currentSkills.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Habilidades Actuales', margin, y);
        y += 6;

        // Headers
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        const cols = [margin, margin + 70, margin + 100, margin + 130, margin + 160];
        pdf.text('Habilidad', cols[0], y);
        pdf.text('Score', cols[1], y);
        pdf.text('Objetivo', cols[2], y);
        pdf.text('Vigencia', cols[3], y);
        y += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);

        for (const skill of data.currentSkills) {
          if (y > 260) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(skill.skillName.substring(0, 35), cols[0], y);
          pdf.text(String(skill.score || '-'), cols[1], y);
          pdf.text(String(skill.target || '-'), cols[2], y);
          pdf.text(skill.expiresAt ? new Date(skill.expiresAt).toLocaleDateString('es-MX') : '-', cols[3], y);
          y += 4;
        }
      }

      // Historial completo
      if (historyPivot?.skills?.length > 0) {
        pdf.addPage();
        y = 20;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Historial de Capacitaciones', margin, y);
        y += 8;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');

        // Fechas como headers (máximo 8 para que quepan)
        const maxDates = Math.min(historyPivot.dates.length, 8);
        const colWidth = (pageWidth - margin * 2 - 50) / maxDates;
        pdf.text('Habilidad', margin, y);
        for (let i = 0; i < maxDates; i++) {
          const dateStr = new Date(historyPivot.dates[i].date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
          pdf.text(dateStr, margin + 50 + (i * colWidth), y);
        }
        y += 5;

        pdf.setFont('helvetica', 'normal');
        for (const skill of historyPivot.skills) {
          if (y > 260) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(skill.skillName.substring(0, 25), margin, y);
          for (let i = 0; i < maxDates; i++) {
            const ev = skill.evaluations[i];
            pdf.text(ev?.score != null ? String(ev.score) : '-', margin + 50 + (i * colWidth), y);
          }
          y += 4;
        }
      }

      pdf.save(`Perfil_${user.firstName}_${user.lastName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (selectedEvalId) {
      getEvaluation(selectedEvalId).then(res => {
        if (res.success) setEvalDetail(res.data);
      });
    }
  }, [selectedEvalId]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: t.textMuted }}>{L.loadingProfile}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: COLORS.red }}>{error || L.userNotFound}</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>{L.back}</button>
      </div>
    );
  }

  const { user, radarData, history, profiles } = data;

  // Preparar datos para radar chart - usar datos del perfil actual (historyPivot)
  // Agrupa por categoría las habilidades del perfil
  // El promedio de score se calcula: suma de scores / total de habilidades de la categoría
  // (las no evaluadas cuentan como 0)
  const buildRadarFromPivot = () => {
    if (!historyPivot?.skills?.length) return [];

    const categoryMap = {};
    for (const skill of historyPivot.skills) {
      const catName = skill.categoryName || 'Sin categoría';
      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          category: catName,
          color: skill.categoryColor,
          totalSkills: 0,
          sumScores: 0,
          targets: []
        };
      }
      categoryMap[catName].totalSkills++;
      // Sumar score si existe, sino cuenta como 0
      categoryMap[catName].sumScores += (skill.currentScore || 0);
      // El target siempre lo tiene del perfil
      categoryMap[catName].targets.push(skill.currentTarget || skill.profileTarget || 3);
    }

    return Object.values(categoryMap).map(cat => ({
      category: cat.category.length > 12 ? cat.category.substring(0, 10) + '...' : cat.category,
      fullName: cat.category,
      // Dividir entre TODAS las habilidades de la categoría, no solo las evaluadas
      score: cat.sumScores / cat.totalSkills,
      target: cat.targets.reduce((a, b) => a + b, 0) / cat.targets.length,
      fullMark: 5,
      totalSkills: cat.totalSkills
    }));
  };

  // Usar radar del perfil si está disponible, sino el general
  const chartData = historyPivot?.skills?.length > 0
    ? buildRadarFromPivot()
    : (radarData?.map(cat => ({
        category: cat.categoryName,
        score: parseFloat(cat.avgScore) || 0,
        target: parseFloat(cat.avgTarget) || 0,
        fullMark: 5
      })) || []);

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
    padding: '24px'
  };

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {L.back}
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {L.modules}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={exportToPdf}
            disabled={exportingPdf}
            style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}
          >
            {exportingPdf ? L.exporting : L.exportPdf}
          </button>
          <button onClick={() => navigate(`/skills/evaluate/${userId}`)} style={{ padding: '8px 16px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
            {L.registerTraining}
          </button>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <ThemeSelector />
        </div>
      </div>

      <div ref={profileRef} style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        {/* Left Column - User Info */}
        <div>
          {/* User Card */}
          <div style={{ ...cardStyle, textAlign: 'center', marginBottom: '20px' }}>
            {/* Photo */}
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              backgroundColor: t.bgPanel,
              margin: '0 auto 16px auto',
              overflow: 'hidden',
              border: `4px solid ${COLORS.blue}`
            }}>
              {user.photoPath ? (
                <img src={`${API_URL}${user.photoPath}`} alt={user.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '600', color: t.textMuted, backgroundColor: COLORS.blue + '20' }}>
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
              )}
            </div>

            {/* Name */}
            <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '600', color: t.text }}>
              {user.firstName} {user.lastName}
            </h1>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '12px' }}>
              {user.position || L.noPosition}
            </div>

            {/* Info */}
            <div style={{ textAlign: 'left', fontSize: '13px', color: t.textMuted }}>
              <div style={{ padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                <span style={{ fontWeight: '600', color: t.text }}>{L.email}</span> {user.email}
              </div>
              <div style={{ padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                <span style={{ fontWeight: '600', color: t.text }}>{L.department}</span> {user.departmentName || L.noDepartment}
              </div>
              <div style={{ padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                <span style={{ fontWeight: '600', color: t.text }}>{L.reportsTo}</span> {user.managerName || L.na}
              </div>
            </div>
          </div>

          {/* Perfil asignado */}
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
              {L.assignedProfile}
            </h3>
            {profiles && profiles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profiles.map(p => (
                  <div
                    key={p.id}
                    style={{
                      padding: '10px',
                      backgroundColor: p.isActive ? COLORS.blue + '10' : t.bgPanel,
                      borderRadius: '6px',
                      border: p.isActive ? `1px solid ${COLORS.blue}` : `1px solid ${t.border}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: t.text }}>{p.profileName}</span>
                      {p.isActive ? (
                        <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: COLORS.green + '20', color: COLORS.green, borderRadius: '4px' }}>{L.active}</span>
                      ) : (
                        <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: t.bgPanel, color: t.textMuted, borderRadius: '4px' }}>{L.historical}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
                      {new Date(p.startDate).toLocaleDateString('es-MX')}
                      {p.endDate && ` - ${new Date(p.endDate).toLocaleDateString('es-MX')}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: t.textMuted }}>{L.noProfileAssigned}</div>
            )}
          </div>

          {/* Radar Chart - Estilo FIFA */}
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke={t.border} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: t.text, fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: t.textMuted, fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}
                    formatter={(value) => value.toFixed(2)}
                  />
                  <Radar name="Score" dataKey="score" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.5} strokeWidth={2} />
                  <Radar name="Target" dataKey="target" stroke={COLORS.orange} fill={COLORS.orange} fillOpacity={0.2} strokeWidth={2} strokeDasharray="5 5" />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted, fontSize: '13px' }}>
                {L.noEvaluations}
              </div>
            )}
          </div>

          {/* Score Summary - Promedio Actual */}
          {historyPivot?.currentAvgScore != null && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
                {L.currentEvaluation}
              </h3>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: '600', color: COLORS.blue }}>
                  {historyPivot.currentAvgScore?.toFixed(2) || '—'}
                </div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>{L.generalAverage}</div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: t.textMuted }}>
                  {L.basedOnLastScore}
                </div>
                {historyPivot.skills?.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: t.text }}>
                    {historyPivot.skills.length} {L.skillsEvaluated}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Charts & Details */}
        <div>
          {/* Curva de Desarrollo Histórico - Calculada con promedios acumulativos */}
          {historyPivot?.dates?.length > 0 && historyPivot?.skills?.length > 0 && (() => {
            // Las fechas vienen en orden DESC (más reciente primero)
            // Las evaluations de cada skill están en el MISMO orden que dates
            // Necesitamos iterar de más antigua a más reciente (índices invertidos)

            const numDates = historyPivot.dates.length;
            const totalProfileSkills = historyPivot.skills.length; // Total de habilidades del perfil
            const chartData = [];
            const lastKnownScores = {}; // skillId -> { score, target, skillName }

            // Iterar desde el índice más alto (fecha más antigua) al más bajo (fecha más reciente)
            for (let i = numDates - 1; i >= 0; i--) {
              const dateInfo = historyPivot.dates[i];

              // Para cada habilidad, revisar si tiene score en esta fecha (mismo índice)
              for (const skill of historyPivot.skills) {
                const ev = skill.evaluations[i]; // Mismo índice que la fecha
                if (ev && ev.score !== null) {
                  // Actualizar el último score conocido de esta habilidad
                  lastKnownScores[skill.skillId] = {
                    score: ev.score,
                    target: ev.target,
                    skillName: skill.skillName
                  };
                }
              }

              // Calcular promedio: suma de scores conocidos / TOTAL de habilidades del perfil
              // Las habilidades no evaluadas cuentan como 0
              const knownScores = Object.values(lastKnownScores);
              const sumScores = knownScores.reduce((sum, s) => sum + s.score, 0);
              const avgScore = sumScores / totalProfileSkills;
              const dateStr = new Date(dateInfo.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });

              chartData.push({
                evalId: dateInfo.evaluationId,
                date: `#${dateInfo.evaluationId} ${dateStr}`,
                dateShort: dateStr,
                rawDate: dateInfo.date,
                score: parseFloat(avgScore.toFixed(2)),
                skillsEvaluated: knownScores.length,
                totalSkills: totalProfileSkills,
                details: knownScores.map(s => `${s.skillName.substring(0,15)}=${s.score}`).join(', ')
              });
            }

            // Obtener nombre del perfil activo
            const activeProfile = profiles?.find(p => p.isActive);

            return chartData.length > 0 ? (
              <div style={{ ...cardStyle, marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
                      {L.developmentCurve}
                    </h3>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>
                      {viewMode === 'profile' && activeProfile
                        ? `${L.profile} ${activeProfile.profileName} (${totalProfileSkills} ${L.skills})`
                        : `${L.allSkillsEvaluated} (${totalProfileSkills})`
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'right' }}>
                    {L.avgFormula}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                    <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <YAxis domain={[0, 5]} tick={{ fill: t.textMuted, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}
                      formatter={(value, name, props) => [
                        value.toFixed(2),
                        `Promedio (${props.payload.skillsEvaluated}/${props.payload.totalSkills} hab.)`
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={COLORS.blue}
                      strokeWidth={3}
                      dot={{ fill: COLORS.blue, strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null;
          })()}

          {/* Score Details */}
          {evalDetail && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: t.text }}>
                  {L.trainingDetail}
                </h3>
                {history && history.length > 1 && (
                  <select
                    value={selectedEvalId || ''}
                    onChange={(e) => setSelectedEvalId(parseInt(e.target.value))}
                    style={{ padding: '6px 12px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                  >
                    {history.map(h => (
                      <option key={h.id} value={h.id}>
                        {new Date(h.evaluationDate).toLocaleDateString('es-MX')} - {h.period || L.noPeriod}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Group by category */}
              {evalDetail.byCategory?.map(cat => (
                <div key={cat.categoryId} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color || COLORS.blue }} />
                    <span style={{ fontWeight: '600', color: t.text }}>{cat.categoryName}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: '600', color: cat.avgScore >= cat.avgTarget ? COLORS.green : COLORS.orange }}>
                      {cat.avgScore} / {cat.avgTarget}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evalDetail.scores?.filter(s => s.categoryName === cat.categoryName).map(score => (
                      <div key={score.skillId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
                        <span style={{ flex: 1, fontSize: '13px', color: t.text }}>{score.skillName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Score bar */}
                          <div style={{ width: '100px', height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${(score.score / 5) * 100}%`,
                              height: '100%',
                              backgroundColor: score.score >= score.target ? COLORS.green : COLORS.orange,
                              borderRadius: '4px'
                            }} />
                          </div>
                          <span style={{ width: '30px', textAlign: 'right', fontWeight: '600', color: score.score >= score.target ? COLORS.green : COLORS.orange }}>
                            {score.score}
                          </span>
                          <span style={{ color: t.textMuted, fontSize: '12px' }}>/ {score.target}</span>
                          {score.gap > 0 && (
                            <span style={{ padding: '2px 6px', backgroundColor: COLORS.red + '20', color: COLORS.red, borderRadius: '4px', fontSize: '10px' }}>
                              -{score.gap}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabla Histórica Pivote */}
          {historyPivot && (
            <div style={{ ...cardStyle, marginTop: '20px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: t.text }}>
                  {viewMode === 'profile' ? L.profileSkills : L.historicalCurriculum}
                </h3>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: t.bgPanel, borderRadius: '8px', padding: '4px' }}>
                  <button
                    onClick={() => { setViewMode('profile'); loadHistoryPivot(false); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: viewMode === 'profile' ? COLORS.blue : 'transparent',
                      color: viewMode === 'profile' ? '#fff' : t.textMuted
                    }}
                  >
                    {L.currentProfileBtn}
                  </button>
                  <button
                    onClick={() => { setViewMode('curriculum'); loadHistoryPivot(true); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: viewMode === 'curriculum' ? COLORS.blue : 'transparent',
                      color: viewMode === 'curriculum' ? '#fff' : t.textMuted
                    }}
                  >
                    {L.fullCurriculum}
                  </button>
                </div>
              </div>
              {historyPivot.skillsEvaluated != null && (
                <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '12px' }}>
                  {historyPivot.skillsEvaluated} {L.of} {historyPivot.totalProfileSkills} {L.skillsEvaluatedLabel}
                  {historyPivot.showingAllSkills && ` ${L.showingAllSkills}`}
                </div>
              )}
              {historyPivot.dates?.length > 0 ? (
              <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: t.textMuted, minWidth: '180px', position: 'sticky', left: 0, backgroundColor: t.bgCard }}>{L.skill}</th>
                    {/* Fechas invertidas: más vieja a la izquierda */}
                    {[...historyPivot.dates].reverse().map(d => (
                      <th key={d.evaluationId} style={{ padding: '8px 6px', textAlign: 'center', color: t.textMuted, minWidth: '70px' }}>
                        {new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </th>
                    ))}
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: t.text, minWidth: '80px', backgroundColor: COLORS.blue + '10', fontWeight: '600' }}>
                      {L.current}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyPivot.skills?.map((skill, idx) => (
                    <tr key={skill.skillId} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgPanel }}>
                      <td style={{ padding: '8px 10px', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: skill.categoryColor || COLORS.blue }} />
                          <span style={{ color: t.text, fontWeight: '500' }}>{skill.skillName}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: t.textMuted, marginLeft: '16px' }}>{skill.categoryName}</div>
                      </td>
                      {/* Evaluaciones invertidas: más vieja a la izquierda */}
                      {[...skill.evaluations].reverse().map(ev => {
                        const getScoreColor = (score, target) => {
                          if (!score) return 'transparent';
                          if (score >= target) return COLORS.green;
                          if (score >= target - 1) return COLORS.orange;
                          return COLORS.red;
                        };
                        const scoreColor = getScoreColor(ev.score, ev.target);

                        return (
                          <td
                            key={ev.evaluationId}
                            onClick={() => ev.scoreId && openScoreModal(ev.scoreId)}
                            style={{
                              padding: '4px',
                              textAlign: 'center',
                              cursor: ev.scoreId ? 'pointer' : 'default'
                            }}
                          >
                            {ev.score !== null ? (
                              <div style={{
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: scoreColor + '20',
                                border: `1px solid ${scoreColor}40`,
                                minWidth: '40px'
                              }}>
                                <span style={{ fontWeight: '600', color: scoreColor, fontSize: '14px' }}>{ev.score}</span>
                                {ev.hasEvidence && <Paperclip size={12} color={t.textMuted} style={{ marginTop: '2px' }} />}
                                {ev.trainingType && (
                                  <span style={{ fontSize: '8px', color: t.textMuted }}>
                                    {ev.trainingType === 'INTERNAL' ? 'INT' : 'EXT'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: t.textMuted }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Columna ACTUAL */}
                      <td style={{ padding: '4px', textAlign: 'center', backgroundColor: COLORS.blue + '08' }}>
                        {skill.currentScore !== null ? (
                          <div style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: skill.currentScore >= skill.currentTarget ? COLORS.green + '25' : COLORS.orange + '25',
                            border: `2px solid ${skill.currentScore >= skill.currentTarget ? COLORS.green : COLORS.orange}`,
                            minWidth: '50px'
                          }}>
                            <span style={{ fontWeight: '600', color: skill.currentScore >= skill.currentTarget ? COLORS.green : COLORS.orange, fontSize: '16px' }}>
                              {skill.currentScore}
                            </span>
                            <span style={{ fontSize: '9px', color: t.textMuted }}>/{skill.currentTarget}</span>
                          </div>
                        ) : (
                          <span style={{ color: t.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${t.border}`, backgroundColor: t.bgPanel }}>
                    <td style={{ padding: '10px', fontWeight: '600', color: t.text, position: 'sticky', left: 0, backgroundColor: t.bgPanel }}>
                      {L.generalAverageUpper}
                    </td>
                    {[...historyPivot.dates].reverse().map(d => (
                      <td key={d.evaluationId} style={{ padding: '8px', textAlign: 'center', color: t.textMuted }}>—</td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'center', backgroundColor: COLORS.blue + '15' }}>
                      <span style={{ fontWeight: '600', fontSize: '18px', color: COLORS.blue }}>
                        {historyPivot.currentAvgScore?.toFixed(2) || '—'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ marginTop: '12px', fontSize: '11px', color: t.textMuted, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.green + '40', borderRadius: '3px', marginRight: '4px' }}></span> {L.meetsTarget}</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.orange + '40', borderRadius: '3px', marginRight: '4px' }}></span> {L.nearTarget}</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.red + '40', borderRadius: '3px', marginRight: '4px' }}></span> {L.needsImprovement}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Paperclip size={12} color={t.textMuted} /> = {L.evidenceAttached}</span>
                <span>{L.internalExternal}</span>
              </div>
              </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  {viewMode === 'profile'
                    ? L.noEvaluationsProfile
                    : L.noHistoricalEvaluations
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Score */}
      {scoreModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setScoreModal(null)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>
                {L.trainingDetail}
              </h3>
              <button onClick={() => setScoreModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: t.textMuted }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: scoreModal.categoryColor || COLORS.blue }} />
                <span style={{ fontSize: '12px', color: t.textMuted }}>{scoreModal.categoryName}</span>
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>{scoreModal.skillName}</h4>
              <div style={{ fontSize: '12px', color: t.textMuted }}>{scoreModal.skillDescription}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '600', color: scoreModal.score >= scoreModal.target ? COLORS.green : COLORS.orange }}>
                  {scoreModal.score}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{L.rating}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '600', color: t.text }}>{scoreModal.target}</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>{L.objective}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>{L.date}</span>
                <span style={{ color: t.text }}>{new Date(scoreModal.evaluationDate).toLocaleDateString('es-MX')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>{L.evaluator}</span>
                <span style={{ color: t.text }}>{scoreModal.evaluatorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>{L.type}</span>
                <span style={{ color: t.text, fontWeight: '500' }}>
                  {scoreModal.trainingType === 'INTERNAL' ? L.internalTraining : scoreModal.trainingType === 'EXTERNAL' ? L.externalTraining : L.notSpecified}
                </span>
              </div>
              {scoreModal.expiresAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ color: t.textMuted }}>{L.validUntil}</span>
                  <span style={{ color: new Date(scoreModal.expiresAt) < new Date() ? COLORS.red : COLORS.green }}>
                    {new Date(scoreModal.expiresAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              )}
            </div>

            {scoreModal.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '4px' }}>{L.notes}</div>
                <div style={{ fontSize: '13px', color: t.textMuted, padding: '8px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                  {scoreModal.notes}
                </div>
              </div>
            )}

            {scoreModal.evidencePath && (
              <button
                onClick={() => downloadEvidence(scoreModal.id, scoreModal.evidenceFilename)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: COLORS.blue,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Paperclip size={14} /> {L.downloadEvidence} ({scoreModal.evidenceFilename || 'archivo'})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay for score modal */}
      {loadingScore && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{ backgroundColor: t.bgCard, padding: '20px', borderRadius: '8px', color: t.text }}>
            {L.loading}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsProfile;
