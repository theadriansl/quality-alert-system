/**
 * WIDashboard.js
 * Dashboard de Work Instructions con Matriz ILUO y métricas de cobertura
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import workInstructionsService from '../../services/workInstructionsService';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  // ILUO Scale Colors: 1=I, 2=L, 3=U, 4=O
  levelI: '#ef4444',  // 1 - I (Observador) - rojo
  levelL: '#f59e0b',  // 2 - L (Bajo Supervisión) - naranja
  levelU: '#22c55e',  // 3 - U (Libre) - verde
  levelO: '#0ea5e9'   // 4 - O (Instructor) - azul
};

const WIDashboard = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [activeTab, setActiveTab] = useState('matrix');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, matrixRes, expiringRes] = await Promise.all([
        workInstructionsService.getCertificationSummary(),
        workInstructionsService.getILUOMatrix({ clientId: clientFilter || undefined }),
        workInstructionsService.getExpiringCertifications(30)
      ]);

      if (summaryRes.success) setSummary(summaryRes.summary);
      if (matrixRes.success) {
        setMatrixData(matrixRes);
        // Extract unique clients from WIs
        const uniqueClients = [...new Set(matrixRes.workInstructions?.map(w => w.clientName).filter(Boolean))];
        setClients(uniqueClients);
      }
      if (expiringRes.success) setExpiring(expiringRes.expiringCertifications || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ILUO Scale: 1=I, 2=L, 3=U, 4=O (de menor a mayor competencia)
  const getLevelColor = (level) => {
    if (!level || level === 0) return 'transparent';
    switch (level) {
      case 1: return COLORS.levelI;  // 1 = I (Observador)
      case 2: return COLORS.levelL;  // 2 = L (Bajo Supervisión)
      case 3: return COLORS.levelU;  // 3 = U (Libre)
      case 4: return COLORS.levelO;  // 4 = O (Instructor)
      default: return COLORS.levelO;
    }
  };

  const getLevelCode = (level) => {
    if (!level || level === 0) return '';
    switch (level) {
      case 1: return 'I';  // 1 = I (Observador)
      case 2: return 'L';  // 2 = L (Bajo Supervisión)
      case 3: return 'U';  // 3 = U (Libre)
      case 4: return 'O';  // 4 = O (Instructor)
      case 5: return 'O+'; // Para escala 1-5
      default: return level.toString();
    }
  };

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
    padding: '20px'
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: t.textMuted }}>Cargando dashboard...</div>
      </div>
    );
  }

  // Calculate coverage percentages
  const coverage3x1Pct = matrixData?.coverage?.totalWIs > 0
    ? Math.round((matrixData.coverage.wisWithAtLeast3Ops / matrixData.coverage.totalWIs) * 100)
    : 0;
  const coverage1x3Pct = matrixData?.coverage?.totalOperators > 0
    ? Math.round((matrixData.coverage.opsWithAtLeast3WIs / matrixData.coverage.totalOperators) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/work-instructions')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            ← Work Instructions
          </button>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: t.text }}>
            Dashboard ILUO
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={loadData} style={{ padding: '8px 16px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total WIs */}
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.blue }}>{summary?.totalWorkInstructions || 0}</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Work Instructions Activas</div>
        </div>

        {/* Total Certifications */}
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.green }}>{summary?.totalCertifications || 0}</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Certificaciones Totales</div>
        </div>

        {/* By Level - ILUO: I, L, U, O (de mayor a menor competencia) */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.levelI }}>{summary?.byLevel?.i || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>I</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.levelL }}>{summary?.byLevel?.l || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>L</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.levelU }}>{summary?.byLevel?.u || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>U</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.levelO }}>{summary?.byLevel?.o || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>O</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', marginTop: '8px' }}>ILUO</div>
        </div>

        {/* Expiring */}
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: summary?.expiringSoon > 0 ? COLORS.orange : t.textMuted }}>
            {summary?.expiringSoon || 0}
          </div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Por Vencer (30 dias)</div>
        </div>

        {/* Expired */}
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: summary?.expired > 0 ? COLORS.red : t.textMuted }}>
            {summary?.expired || 0}
          </div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Vencidas</div>
        </div>
      </div>

      {/* Coverage Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* 3x1 Coverage */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `conic-gradient(${coverage3x1Pct >= 80 ? COLORS.green : coverage3x1Pct >= 50 ? COLORS.orange : COLORS.red} ${coverage3x1Pct * 3.6}deg, ${t.bgPanel} 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: t.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: t.text }}>{coverage3x1Pct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: t.text }}>Cobertura 3x1</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
              {matrixData?.coverage?.wisWithAtLeast3Ops || 0} de {matrixData?.coverage?.totalWIs || 0} WIs
            </div>
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
              tienen al menos 3 operadores certificados
            </div>
          </div>
        </div>

        {/* 1x3 Coverage */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `conic-gradient(${coverage1x3Pct >= 80 ? COLORS.green : coverage1x3Pct >= 50 ? COLORS.orange : COLORS.red} ${coverage1x3Pct * 3.6}deg, ${t.bgPanel} 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: t.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: t.text }}>{coverage1x3Pct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: t.text }}>Cobertura 1x3</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
              {matrixData?.coverage?.opsWithAtLeast3WIs || 0} de {matrixData?.coverage?.totalOperators || 0} operadores
            </div>
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
              certificados en al menos 3 WIs
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: t.bgPanel, borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'matrix', label: 'Matriz ILUO' },
          { id: 'operators', label: 'Por Operador' },
          { id: 'wis', label: 'Por Work Instruction' },
          { id: 'expiring', label: `Por Vencer (${expiring.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: activeTab === tab.id ? COLORS.blue : 'transparent',
              color: activeTab === tab.id ? '#fff' : t.textMuted
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={cardStyle}>
        {/* MATRIX TAB */}
        {activeTab === 'matrix' && (
          <div style={{ overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
              Matriz ILUO - Operadores x Work Instructions
            </h3>

            {/* Legend - ILUO: I(1), L(2), U(3), O(4) de menor a mayor */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: COLORS.levelI, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '11px' }}>I</span>
                <span style={{ color: t.textMuted }}>Observador (1)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: COLORS.levelL, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '11px' }}>L</span>
                <span style={{ color: t.textMuted }}>Bajo Supervisión (2)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: COLORS.levelU, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '11px' }}>U</span>
                <span style={{ color: t.textMuted }}>Libre (3)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: COLORS.levelO, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '11px' }}>O</span>
                <span style={{ color: t.textMuted }}>Instructor (4)</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}` }}></span>
                <span style={{ color: t.textMuted }}>Sin certificar</span>
              </span>
            </div>

            {matrixData?.workInstructions?.length > 0 && matrixData?.operators?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: t.textMuted, minWidth: '200px', position: 'sticky', left: 0, backgroundColor: t.bgCard }}>
                      Work Instruction
                    </th>
                    {matrixData.operators.map(op => (
                      <th key={op.id} style={{ padding: '8px 4px', textAlign: 'center', color: t.textMuted, minWidth: '60px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '100px' }}>
                        <span
                          onClick={() => navigate(`/work-instructions/operator/${op.id}`)}
                          style={{ cursor: 'pointer', color: COLORS.blue }}
                          title={op.position || ''}
                        >
                          {op.name}
                        </span>
                      </th>
                    ))}
                    <th style={{ padding: '8px', textAlign: 'center', color: t.text, backgroundColor: COLORS.blue + '10', fontWeight: '700', minWidth: '60px' }}>
                      3x1
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.workInstructions.map((wi, idx) => {
                    const certCount = wi.certifiedCount || 0;
                    const meets3x1 = certCount >= 3;

                    return (
                      <tr key={wi.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgPanel }}>
                        <td style={{ padding: '8px 10px', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel }}>
                          <div
                            onClick={() => navigate(`/work-instructions/${wi.id}`)}
                            style={{ cursor: 'pointer', color: COLORS.blue, fontWeight: '500' }}
                          >
                            {wi.title}
                          </div>
                          <div style={{ fontSize: '10px', color: t.textMuted }}>
                            {wi.operationCode && `${wi.operationCode} · `}
                            {wi.clientName || 'General'}
                          </div>
                        </td>
                        {matrixData.operators.map(op => {
                          // Find if this operator has certification for this WI
                          const level = op[`wi_${wi.id}`] || 0;
                          const levelColor = getLevelColor(level);
                          const levelCode = getLevelCode(level);

                          return (
                            <td key={op.id} style={{ padding: '4px', textAlign: 'center' }}>
                              {level > 0 ? (
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '4px',
                                  backgroundColor: levelColor,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: '700', fontSize: '12px'
                                }}>
                                  {levelCode}
                                </div>
                              ) : (
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '4px',
                                  backgroundColor: t.bgPanel, border: `1px solid ${t.border}`,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px', textAlign: 'center', backgroundColor: COLORS.blue + '08' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px',
                            backgroundColor: meets3x1 ? COLORS.green + '20' : COLORS.red + '20',
                            color: meets3x1 ? COLORS.green : COLORS.red,
                            fontWeight: '600', fontSize: '12px'
                          }}>
                            {certCount}/3
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${t.border}`, backgroundColor: t.bgPanel }}>
                    <td style={{ padding: '10px', fontWeight: '700', color: t.text, position: 'sticky', left: 0, backgroundColor: t.bgPanel }}>
                      Cobertura 1x3
                    </td>
                    {matrixData.operators.map(op => {
                      const wiCount = op.totalCertifications || 0;
                      const meets1x3 = wiCount >= 3;
                      return (
                        <td key={op.id} style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                            backgroundColor: meets1x3 ? COLORS.green + '20' : COLORS.red + '20',
                            color: meets1x3 ? COLORS.green : COLORS.red,
                            fontWeight: '600'
                          }}>
                            {wiCount}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ backgroundColor: COLORS.blue + '15' }}></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay datos de certificaciones
              </div>
            )}
          </div>
        )}

        {/* OPERATORS TAB */}
        {activeTab === 'operators' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
              Certificaciones por Operador
            </h3>
            {matrixData?.operators?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {matrixData.operators.map(op => {
                  const meets1x3 = (op.totalCertifications || 0) >= 3;
                  return (
                    <div key={op.id} style={{
                      padding: '16px', borderRadius: '8px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgPanel
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div
                            onClick={() => navigate(`/work-instructions/operator/${op.id}`)}
                            style={{ fontWeight: '600', color: COLORS.blue, cursor: 'pointer' }}
                          >
                            {op.name}
                          </div>
                          <div style={{ fontSize: '12px', color: t.textMuted }}>{op.position || 'Sin puesto'}</div>
                        </div>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px',
                          backgroundColor: meets1x3 ? COLORS.green + '20' : COLORS.orange + '20',
                          color: meets1x3 ? COLORS.green : COLORS.orange,
                          fontWeight: '600'
                        }}>
                          {meets1x3 ? '1x3 OK' : `${op.totalCertifications}/3`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ textAlign: 'center', flex: 1, padding: '6px', backgroundColor: COLORS.levelI + '15', borderRadius: '6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.levelI }}>{op.levelICount || 0}</div>
                          <div style={{ fontSize: '9px', color: t.textMuted }}>I</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '6px', backgroundColor: COLORS.levelL + '15', borderRadius: '6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.levelL }}>{op.levelLCount || 0}</div>
                          <div style={{ fontSize: '9px', color: t.textMuted }}>L</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '6px', backgroundColor: COLORS.levelU + '15', borderRadius: '6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.levelU }}>{op.levelUCount || 0}</div>
                          <div style={{ fontSize: '9px', color: t.textMuted }}>U</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '6px', backgroundColor: COLORS.levelO + '15', borderRadius: '6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.levelO }}>{op.levelOCount || 0}</div>
                          <div style={{ fontSize: '9px', color: t.textMuted }}>O</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay operadores con certificaciones
              </div>
            )}
          </div>
        )}

        {/* WIS TAB */}
        {activeTab === 'wis' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
              Certificaciones por Work Instruction
            </h3>
            {matrixData?.workInstructions?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted }}>Work Instruction</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: COLORS.levelO }}>O</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: COLORS.levelU }}>U</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: COLORS.levelL }}>L</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: COLORS.levelI }}>I</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.text }}>Total</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.text }}>3x1</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.workInstructions.map((wi, idx) => {
                    const meets3x1 = (wi.certifiedCount || 0) >= 3;
                    return (
                      <tr key={wi.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgPanel }}>
                        <td style={{ padding: '12px' }}>
                          <span
                            onClick={() => navigate(`/work-instructions/${wi.id}`)}
                            style={{ color: COLORS.blue, cursor: 'pointer', fontWeight: '500' }}
                          >
                            {wi.title}
                          </span>
                          {wi.operationCode && <span style={{ marginLeft: '8px', fontSize: '11px', color: t.textMuted }}>{wi.operationCode}</span>}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>{wi.clientName || '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                            backgroundColor: wi.wiType === 'BASIC' ? COLORS.purple + '20' : COLORS.blue + '20',
                            color: wi.wiType === 'BASIC' ? COLORS.purple : COLORS.blue
                          }}>
                            {wi.wiType}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: COLORS.levelO }}>{wi.levelOCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: COLORS.levelU }}>{wi.levelUCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: COLORS.levelL }}>{wi.levelLCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: COLORS.levelI }}>{wi.levelICount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>{wi.certifiedCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px',
                            backgroundColor: meets3x1 ? COLORS.green + '20' : COLORS.red + '20',
                            color: meets3x1 ? COLORS.green : COLORS.red,
                            fontWeight: '600', fontSize: '11px'
                          }}>
                            {meets3x1 ? 'OK' : 'FALTA'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay Work Instructions
              </div>
            )}
          </div>
        )}

        {/* EXPIRING TAB */}
        {activeTab === 'expiring' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: t.text }}>
              Certificaciones por Vencer (30 dias)
            </h3>
            {expiring.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted }}>Operador</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted }}>Work Instruction</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted }}>Nivel</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted }}>Vence</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted }}>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((cert, idx) => {
                    const daysLeft = cert.daysUntilExpiry;
                    const isUrgent = daysLeft <= 7;
                    return (
                      <tr key={cert.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: idx % 2 === 0 ? 'transparent' : t.bgPanel }}>
                        <td style={{ padding: '12px' }}>
                          <span
                            onClick={() => navigate(`/work-instructions/operator/${cert.operatorId}`)}
                            style={{ color: COLORS.blue, cursor: 'pointer' }}
                          >
                            {cert.operatorName}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            onClick={() => navigate(`/work-instructions/${cert.workInstructionId}`)}
                            style={{ color: COLORS.blue, cursor: 'pointer' }}
                          >
                            {cert.wiTitle}
                          </span>
                          {cert.operationCode && <span style={{ marginLeft: '8px', fontSize: '11px', color: t.textMuted }}>{cert.operationCode}</span>}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            width: '28px', height: '28px', borderRadius: '4px',
                            backgroundColor: getLevelColor(cert.level),
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '700', fontSize: '12px'
                          }}>
                            {getLevelCode(cert.level)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>
                          {new Date(cert.expiresAt).toLocaleDateString('es-MX')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px',
                            backgroundColor: isUrgent ? COLORS.red + '20' : COLORS.orange + '20',
                            color: isUrgent ? COLORS.red : COLORS.orange,
                            fontWeight: '600', fontSize: '12px'
                          }}>
                            {daysLeft} dias
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                No hay certificaciones por vencer en los proximos 30 dias
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WIDashboard;
