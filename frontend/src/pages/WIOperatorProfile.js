/**
 * WIOperatorProfile.js
 * Perfil de certificaciones ILUO del operador en Work Instructions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip
} from 'recharts';
import { Paperclip } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import workInstructionsService from '../services/workInstructionsService';

const API_URL = 'http://localhost:5000';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280',
  // ILUO Scale Colors: 1=I, 2=L, 3=U, 4=O
  levelI: '#ef4444',  // 1 - I (Observador) - rojo
  levelL: '#f59e0b',  // 2 - L (Bajo Supervisión) - naranja
  levelU: '#22c55e',  // 3 - U (Libre) - verde
  levelO: '#0ea5e9'   // 4 - O (Instructor) - azul
};

// ILUO Scale: I(1), L(2), U(3), O(4)
const LEVEL_INFO = {
  1: { code: 'I', label: 'Observador', description: 'Solo puede observar, no ejecutar', color: COLORS.levelI },
  2: { code: 'L', label: 'Bajo Supervisión', description: 'Puede ejecutar bajo supervisión directa', color: COLORS.levelL },
  3: { code: 'U', label: 'Libre', description: 'Puede ejecutar de forma autónoma', color: COLORS.levelU },
  4: { code: 'O', label: 'Instructor', description: 'Puede instruir y certificar a otros', color: COLORS.levelO }
};

const WIOperatorProfile = () => {
  const { operatorId } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workInstructionsService.getOperatorCertificationsPivot(operatorId, 20);
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Error al cargar datos');
      }
    } catch (err) {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ILUO Scale (1-4): O → U → L → I
  const getLevelColor = (level) => {
    if (!level) return 'transparent';
    return LEVEL_INFO[level]?.color || COLORS.gray;
  };

  const getLevelCode = (level) => {
    if (!level) return '';
    return LEVEL_INFO[level]?.code || level.toString();
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: t.textMuted }}>Cargando perfil...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: COLORS.red }}>{error || 'Operador no encontrado'}</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', color: t.text }}>Volver</button>
      </div>
    );
  }

  const { operator, dates, workInstructions, summary } = data;

  // Build development curve data
  const buildCurveData = () => {
    if (!dates?.length || !workInstructions?.length) return [];

    const numDates = dates.length;
    const chartData = [];
    const lastKnownLevels = {}; // wiId -> level

    // Iterate from oldest (last index) to newest (first index)
    for (let i = numDates - 1; i >= 0; i--) {
      const dateInfo = dates[i];

      // Update known levels from certifications on this date
      for (const wi of workInstructions) {
        const cert = wi.certifications[i];
        if (cert && cert.level !== null) {
          lastKnownLevels[wi.wiId] = cert.level;
        }
      }

      // Calculate average of known levels
      const knownLevels = Object.values(lastKnownLevels);
      if (knownLevels.length > 0) {
        const avgLevel = knownLevels.reduce((sum, l) => sum + l, 0) / knownLevels.length;
        const dateStr = new Date(dateInfo.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });

        chartData.push({
          date: dateStr,
          rawDate: dateInfo.date,
          level: parseFloat(avgLevel.toFixed(2)),
          wisEvaluated: knownLevels.length
        });
      }
    }

    return chartData;
  };

  const curveData = buildCurveData();

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
            ← Volver
          </button>
          <button onClick={() => navigate('/work-instructions')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Work Instructions
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: t.text }}>
            Certificaciones ILUO
          </h1>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column - Operator Info */}
        <div>
          {/* Operator Card */}
          <div style={{ ...cardStyle, textAlign: 'center', marginBottom: '20px' }}>
            {/* Photo */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: t.bgPanel,
              margin: '0 auto 16px auto',
              overflow: 'hidden',
              border: `4px solid ${COLORS.blue}`
            }}>
              {operator.photoPath ? (
                <img src={`${API_URL}${operator.photoPath}`} alt={operator.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '600', color: t.textMuted, backgroundColor: COLORS.blue + '20' }}>
                  {operator.firstName?.charAt(0)}{operator.lastName?.charAt(0)}
                </div>
              )}
            </div>

            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600', color: t.text }}>
              {operator.firstName} {operator.lastName}
            </h2>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '12px' }}>
              {operator.position || 'Sin puesto'}
            </div>
            <div style={{ fontSize: '12px', color: t.textMuted }}>
              {operator.departmentName || 'Sin departamento'}
            </div>
          </div>

          {/* Summary Card */}
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
              Resumen de Certificaciones
            </h3>

            {/* Level badges - ILUO: I, L, U, O (de mayor a menor) */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: COLORS.levelI + '20', border: `3px solid ${COLORS.levelI}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px auto'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.levelI }}>{summary.levelI || 0}</span>
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>I</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: COLORS.levelL + '20', border: `3px solid ${COLORS.levelL}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px auto'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.levelL }}>{summary.levelL || 0}</span>
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>L</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: COLORS.levelU + '20', border: `3px solid ${COLORS.levelU}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px auto'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.levelU }}>{summary.levelU || 0}</span>
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>U</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: COLORS.levelO + '20', border: `3px solid ${COLORS.levelO}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px auto'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: COLORS.levelO }}>{summary.levelO || 0}</span>
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>O</div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Total Certificaciones:</span>
                <span style={{ fontWeight: '600', color: t.text }}>{summary.totalCertifications}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Promedio Nivel:</span>
                <span style={{ fontWeight: '600', color: COLORS.blue }}>{summary.avgLevel.toFixed(2)}</span>
              </div>
              {summary.expiringSoon > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                  <span style={{ color: COLORS.orange }}>Por vencer:</span>
                  <span style={{ fontWeight: '600', color: COLORS.orange }}>{summary.expiringSoon}</span>
                </div>
              )}
              {summary.expired > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${t.border}` }}>
                  <span style={{ color: COLORS.red }}>Vencidas:</span>
                  <span style={{ fontWeight: '600', color: COLORS.red }}>{summary.expired}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ ...cardStyle }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
              Niveles ILUO
            </h3>
            <div style={{ fontSize: '12px' }}>
              {Object.entries(LEVEL_INFO).reverse().map(([level, info]) => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    backgroundColor: info.color + '20', border: `2px solid ${info.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '600', color: info.color, fontSize: '14px'
                  }}>
                    {info.code}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: t.text }}>{level} - {info.label}</div>
                    <div style={{ fontSize: '10px', color: t.textMuted }}>{info.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Charts & Table */}
        <div>
          {/* Development Curve */}
          {curveData.length > 1 && (
            <div style={{ ...cardStyle, marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
                Curva de Desarrollo
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fill: t.textMuted, fontSize: 11 }} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}
                    formatter={(value, name, props) => [
                      value.toFixed(2),
                      `Promedio (${props.payload.wisEvaluated} WIs)`
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="level"
                    stroke={COLORS.blue}
                    strokeWidth={3}
                    dot={{ fill: COLORS.blue, strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pivot Table */}
          <div style={{ ...cardStyle, overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
              Historial de Certificaciones
            </h3>

            {workInstructions?.length > 0 ? (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                      <th style={{ padding: '10px', textAlign: 'left', color: t.textMuted, minWidth: '200px', position: 'sticky', left: 0, backgroundColor: t.bgCard }}>
                        Work Instruction
                      </th>
                      {/* Dates reversed: oldest to left */}
                      {[...dates].reverse().map(d => (
                        <th key={d.historyId} style={{ padding: '8px 6px', textAlign: 'center', color: t.textMuted, minWidth: '70px' }}>
                          {new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </th>
                      ))}
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: t.text, minWidth: '80px', backgroundColor: COLORS.blue + '10', fontWeight: '600' }}>
                        ACTUAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workInstructions.map((wi, idx) => (
                      <tr key={wi.wiId} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgPanel }}>
                        <td style={{ padding: '8px 10px', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel }}>
                          <div style={{ fontWeight: '500', color: t.text }}>{wi.wiTitle}</div>
                          <div style={{ fontSize: '10px', color: t.textMuted }}>
                            {wi.operationCode && <span style={{ marginRight: '8px' }}>{wi.operationCode}</span>}
                            {wi.clientName || 'General'}
                            <span style={{
                              marginLeft: '6px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: wi.wiType === 'BASIC' ? COLORS.purple + '20' : COLORS.blue + '20',
                              color: wi.wiType === 'BASIC' ? COLORS.purple : COLORS.blue,
                              fontSize: '9px'
                            }}>
                              {wi.wiType}
                            </span>
                          </div>
                        </td>
                        {/* Certifications reversed */}
                        {[...wi.certifications].reverse().map((cert, certIdx) => {
                          const levelColor = getLevelColor(cert.level);
                          const levelCode = getLevelCode(cert.level);

                          return (
                            <td
                              key={certIdx}
                              onClick={() => cert.level && setDetailModal({ wi, cert })}
                              style={{
                                padding: '4px',
                                textAlign: 'center',
                                cursor: cert.level ? 'pointer' : 'default'
                              }}
                            >
                              {cert.level !== null ? (
                                <div style={{
                                  display: 'inline-flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: levelColor + '20',
                                  border: `1px solid ${levelColor}40`,
                                  minWidth: '40px'
                                }}>
                                  <span style={{ fontWeight: '600', color: levelColor, fontSize: '14px' }}>{levelCode}</span>
                                  <span style={{ fontSize: '9px', color: t.textMuted }}>{cert.level}</span>
                                  {cert.hasEvidence && <Paperclip size={12} color={t.textMuted} style={{ marginTop: '2px' }} />}
                                </div>
                              ) : (
                                <span style={{ color: t.textMuted }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        {/* Current column */}
                        <td style={{ padding: '4px', textAlign: 'center', backgroundColor: COLORS.blue + '08' }}>
                          {wi.currentLevel !== null ? (
                            <div style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: getLevelColor(wi.currentLevel) + '25',
                              border: `2px solid ${getLevelColor(wi.currentLevel)}`,
                              minWidth: '50px'
                            }}>
                              <span style={{ fontWeight: '600', color: getLevelColor(wi.currentLevel), fontSize: '18px' }}>
                                {wi.currentLevelCode}
                              </span>
                              <span style={{ fontSize: '10px', color: t.textMuted }}>Nivel {wi.currentLevel}</span>
                              {wi.currentStatus !== 'ACTIVE' && (
                                <span style={{ fontSize: '8px', color: COLORS.red }}>{wi.currentStatus}</span>
                              )}
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
                        PROMEDIO NIVEL
                      </td>
                      {[...dates].reverse().map(d => (
                        <td key={d.historyId} style={{ padding: '8px', textAlign: 'center', color: t.textMuted }}>—</td>
                      ))}
                      <td style={{ padding: '8px', textAlign: 'center', backgroundColor: COLORS.blue + '15' }}>
                        <span style={{ fontWeight: '600', fontSize: '18px', color: COLORS.blue }}>
                          {summary.avgLevel.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Legend row - ILUO: I(1), L(2), U(3), O(4) */}
                <div style={{ marginTop: '12px', fontSize: '11px', color: t.textMuted, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.levelI + '40', borderRadius: '3px', marginRight: '4px' }}></span> I = Observador (1)</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.levelL + '40', borderRadius: '3px', marginRight: '4px' }}></span> L = Bajo Supervisión (2)</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.levelU + '40', borderRadius: '3px', marginRight: '4px' }}></span> U = Libre (3)</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: COLORS.levelO + '40', borderRadius: '3px', marginRight: '4px' }}></span> O = Instructor (4)</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Paperclip size={12} color={t.textMuted} /> = Evidencia</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay certificaciones registradas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setDetailModal(null)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>
                Detalle de Certificacion
              </h3>
              <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: t.textMuted }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
                {detailModal.wi.wiTitle}
              </h4>
              <div style={{ fontSize: '12px', color: t.textMuted }}>
                {detailModal.wi.operationCode && `${detailModal.wi.operationCode} · `}
                {detailModal.wi.clientName || 'General'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{
                  fontSize: '32px', fontWeight: '600',
                  color: getLevelColor(detailModal.cert.level)
                }}>
                  {getLevelCode(detailModal.cert.level)}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Nivel {detailModal.cert.level}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                  {new Date(detailModal.cert.date).toLocaleDateString('es-MX')}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Fecha</div>
              </div>
            </div>

            <div style={{ fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Tipo Capacitacion:</span>
                <span style={{ color: t.text }}>
                  {detailModal.cert.trainingType === 'INTERNAL' ? 'Interna' : detailModal.cert.trainingType === 'EXTERNAL' ? 'Externa' : 'No especificado'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Cambio:</span>
                <span style={{ color: t.text }}>
                  {detailModal.cert.changeReason === 'INITIAL' ? 'Certificacion inicial' :
                   detailModal.cert.changeReason === 'UPGRADE' ? 'Avance de nivel' :
                   detailModal.cert.changeReason === 'DOWNGRADE' ? 'Retroceso' :
                   detailModal.cert.changeReason === 'RECERTIFICATION' ? 'Recertificacion' :
                   detailModal.cert.changeReason || 'N/A'}
                </span>
              </div>
              {detailModal.cert.hasEvidence && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ color: t.textMuted }}>Evidencia:</span>
                  <span style={{ color: COLORS.green, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Paperclip size={12} /> Adjunta</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/work-instructions/${detailModal.wi.wiId}`)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                backgroundColor: COLORS.blue,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Ver Work Instruction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WIOperatorProfile;
