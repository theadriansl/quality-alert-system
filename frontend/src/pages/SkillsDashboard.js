/**
 * SkillsDashboard.js
 * Dashboard gerencial del módulo de Skills
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getDashboard } from '../services/skillsService';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280',
  cyan: '#06b6d4'
};

const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.orange, COLORS.red, COLORS.purple];

const SkillsDashboard = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
    padding: '20px'
  };

  const kpiStyle = (color) => ({
    ...cardStyle,
    borderLeft: `4px solid ${color}`,
    textAlign: 'center'
  });

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', backgroundColor: t.bgPage, minHeight: '100vh' }}>
        <div style={{ color: t.textMuted }}>{tr('common.loadingDashboard')}</div>
      </div>
    );
  }

  const { usersWithProfile, evaluationsByStatus, avgByCategory, topGaps, expiringTraining } = data || {};

  // Prepare chart data
  const radarData = avgByCategory?.map(cat => ({
    category: cat.categoryName,
    score: parseFloat(cat.avgScore) || 0,
    target: parseFloat(cat.avgTarget) || 0
  })) || [];

  const statusData = evaluationsByStatus?.map(s => ({
    name: s.status,
    value: parseInt(s.count)
  })) || [];

  const gapData = topGaps?.slice(0, 8).map(g => ({
    skill: g.skillName.length > 20 ? g.skillName.substring(0, 20) + '...' : g.skillName,
    gap: parseFloat(g.avgGap) || 0
  })) || [];

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
            {tr('skills.dashboard')}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: t.textMuted }}>
            {tr('skills.managerialView')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {tr('common.modules')}
          </button>
          <button onClick={() => navigate('/skills/team')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {tr('skills.myTeam')}
          </button>
          <button onClick={() => navigate('/skills/config')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            {tr('common.configuration')}
          </button>
          <button onClick={loadData} style={{ padding: '8px 16px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
            {tr('common.refresh')}
          </button>
          <ThemeSelector />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={kpiStyle(COLORS.blue)}>
          <div style={{ fontSize: '36px', fontWeight: '600', color: COLORS.blue }}>{usersWithProfile || 0}</div>
          <div style={{ fontSize: '12px', color: t.textMuted }}>{tr('skills.kpi.usersWithProfile')}</div>
        </div>
        <div style={kpiStyle(COLORS.green)}>
          <div style={{ fontSize: '36px', fontWeight: '600', color: COLORS.green }}>
            {statusData.find(s => s.name === 'COMPLETED')?.value || 0}
          </div>
          <div style={{ fontSize: '12px', color: t.textMuted }}>{tr('skills.kpi.completedEvaluations')}</div>
        </div>
        <div style={kpiStyle(COLORS.orange)}>
          <div style={{ fontSize: '36px', fontWeight: '600', color: COLORS.orange }}>
            {statusData.find(s => s.name === 'DRAFT')?.value || 0}
          </div>
          <div style={{ fontSize: '12px', color: t.textMuted }}>{tr('skills.kpi.draftEvaluations')}</div>
        </div>
        <div style={kpiStyle(COLORS.red)}>
          <div style={{ fontSize: '36px', fontWeight: '600', color: COLORS.red }}>
            {expiringTraining?.length || 0}
          </div>
          <div style={{ fontSize: '12px', color: t.textMuted }}>{tr('skills.kpi.expiringTraining')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Radar Chart - Promedio por Categoría */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
            {tr('skills.charts.avgByCategory')}
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={t.border} />
                <PolarAngleAxis dataKey="category" tick={{ fill: t.text, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: t.textMuted, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Legend />
                <Radar name={language === 'es' ? 'Score Promedio' : 'Average Score'} dataKey="score" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.5} />
                <Radar name={language === 'es' ? 'Target Promedio' : 'Average Target'} dataKey="target" stroke={COLORS.orange} fill={COLORS.orange} fillOpacity={0.2} strokeDasharray="5 5" />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>{tr('skills.messages.noData')}</div>
          )}
        </div>

        {/* Pie Chart - Estado de Evaluaciones */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
            {tr('skills.charts.evaluationStatus')}
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>{language === 'es' ? 'Sin evaluaciones' : 'No evaluations'}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Bar Chart - Top Gaps */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
            {language === 'es' ? 'Habilidades con Mayor Brecha' : 'Skills with Largest Gap'}
          </h3>
          {gapData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" domain={[0, 'auto']} tick={{ fill: t.textMuted }} />
                <YAxis dataKey="skill" type="category" width={150} tick={{ fill: t.text, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="gap" fill={COLORS.red} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>{language === 'es' ? 'Sin brechas detectadas' : 'No gaps detected'}</div>
          )}
        </div>

        {/* Table - Capacitaciones por Vencer */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
            {language === 'es' ? 'Capacitaciones por Vencer' : 'Expiring Training'}
          </h3>
          {expiringTraining && expiringTraining.length > 0 ? (
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>{language === 'es' ? 'Usuario' : 'User'}</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>{language === 'es' ? 'Curso' : 'Course'}</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: t.textMuted }}>{language === 'es' ? 'Días' : 'Days'}</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: t.textMuted }}>{language === 'es' ? 'Estado' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringTraining.map((item, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '10px 8px', color: t.text }}>{item.userName}</td>
                      <td style={{ padding: '10px 8px', color: t.text }}>{item.courseName}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: item.daysUntilExpiry < 0 ? COLORS.red : COLORS.orange, fontWeight: '600' }}>
                        {item.daysUntilExpiry}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          backgroundColor: item.status === 'EXPIRED' ? COLORS.red + '20' : COLORS.orange + '20',
                          color: item.status === 'EXPIRED' ? COLORS.red : COLORS.orange
                        }}>
                          {item.status === 'EXPIRED' ? (language === 'es' ? 'VENCIDO' : 'EXPIRED') : (language === 'es' ? 'POR VENCER' : 'EXPIRING')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
              <div>{language === 'es' ? 'No hay capacitaciones por vencer' : 'No expiring training'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Category details */}
      {avgByCategory && avgByCategory.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
            {language === 'es' ? 'Detalle por Categoría' : 'Category Detail'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {avgByCategory.map(cat => {
              const pct = cat.avgTarget > 0 ? (cat.avgScore / cat.avgTarget) * 100 : 0;
              return (
                <div key={cat.categoryName} style={{ padding: '16px', backgroundColor: t.bgPanel, borderRadius: '10px', borderLeft: `4px solid ${cat.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', color: t.text }}>{cat.categoryName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '600', color: cat.color }}>{cat.avgScore}</span>
                    <span style={{ fontSize: '14px', color: t.textMuted }}>/ {cat.avgTarget}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: '100%',
                      backgroundColor: pct >= 100 ? COLORS.green : pct >= 80 ? COLORS.orange : COLORS.red,
                      borderRadius: '3px'
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '6px', textAlign: 'right' }}>
                    {pct.toFixed(0)}% {language === 'es' ? 'del target' : 'of target'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsDashboard;
