import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import CustomDashboard from './CustomDashboard';
import { KpiTile, SectionTitle, Card } from './shared/SharedComponents';

const API_URL = 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clr = (val, { low = 70, high = 100, invert = false } = {}) => {
  if (invert) {
    if (val > high) return '#ef4444';
    if (val > low) return '#C77700';
    return '#2E7D32';
  }
  if (val >= high) return '#2E7D32';
  if (val >= low) return '#C77700';
  return '#ef4444';
};

const riskColor = (idx) => {
  if (idx >= 60) return '#ef4444';
  if (idx >= 35) return '#C77700';
  return '#2E7D32';
};

const fmt1 = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

// ─── Sub-components (KpiTile, SectionTitle, Card imported from SharedComponents) ───

// Risk gauge - Speedometer style with needle
const RiskGauge = ({ value }) => {
  const { theme: t } = useTheme();
  const color = riskColor(value);
  // Needle angle: 0 = left (180°), 100 = right (0°)
  const angle = 180 - (value / 100) * 180;
  const needleLength = 55;
  const cx = 100, cy = 85;
  // Calculate needle end point
  const rad = (angle * Math.PI) / 180;
  const nx = cx + needleLength * Math.cos(rad);
  const ny = cy - needleLength * Math.sin(rad);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="200" height="120" viewBox="0 0 200 120" style={{ maxWidth: '100%' }}>
        {/* Background arc segments - Left to Right: Green → Yellow → Orange → Red */}
        {/* Green zone: 0-35 (left side) */}
        <path
          d="M 30 85 A 70 70 0 0 1 57 32"
          fill="none"
          stroke="#22c55e"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Yellow zone: 35-60 */}
        <path
          d="M 57 32 A 70 70 0 0 1 100 15"
          fill="none"
          stroke="#eab308"
          strokeWidth="16"
        />
        {/* Orange zone: 60-80 */}
        <path
          d="M 100 15 A 70 70 0 0 1 143 32"
          fill="none"
          stroke="#f97316"
          strokeWidth="16"
        />
        {/* Red zone: 80-100 (right side) */}
        <path
          d="M 143 32 A 70 70 0 0 1 170 85"
          fill="none"
          stroke="#ef4444"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={t.text}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Needle center dot */}
        <circle cx={cx} cy={cy} r="8" fill={color} />
        <circle cx={cx} cy={cy} r="4" fill={t.bgCard} />

        {/* Labels */}
        <text x="30" y="105" fontSize="10" fill={t.textMuted} textAnchor="middle">0</text>
        <text x="170" y="105" fontSize="10" fill={t.textMuted} textAnchor="middle">100</text>
      </svg>
      <div style={{ marginTop: '-10px', fontSize: '28px', fontWeight: '700', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: t.textDim, marginTop: '2px' }}>
        {value >= 60 ? 'Riesgo Alto' : value >= 35 ? 'Riesgo Medio' : 'Riesgo Bajo'}
      </div>
    </div>
  );
};

// Status badge for tables
const StatusBadge = ({ status, priority }) => {
  const { theme: t } = useTheme();
  const configs = {
    pending: { bg: t.bgPanel, color: t.textMuted, label: 'Pendiente' },
    in_progress: { bg: `${t.accent}15`, color: t.accent, label: 'En Progreso' },
    completed: { bg: `${t.success}15`, color: t.success, label: 'Completada' },
    blocked: { bg: `${t.error}15`, color: t.error, label: 'Bloqueada' },
    cancelled: { bg: t.bgPanel, color: t.textDim, label: 'Cancelada' }
  };
  const cfg = configs[status] || configs.pending;
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: cfg.bg,
      color: cfg.color
    }}>
      {cfg.label}
    </span>
  );
};

const PriorityDot = ({ priority }) => {
  const colors = {
    critical: '#B00020',
    high: '#ef4444',
    medium: '#C77700',
    low: '#2E7D32'
  };
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: colors[priority] || '#9ca3af',
      marginRight: 6
    }} />
  );
};

// ─── TAB: Summary ─────────────────────────────────────────────────────────────
const TabSummary = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { topBar, carga, riesgo, actividades, detail } = kpis;
  const userLoad = carga?.userLoad || [];
  const upcomingActivities = detail?.upcomingActivities || [];
  const delayedActivities = detail?.delayedActivities || [];

  // Sort users by risk (delayed + overloaded first)
  const sortedUsers = [...userLoad].sort((a, b) => {
    const aRisk = (a.delayedCount > 0 ? 100 : 0) + (a.utilization > 110 ? 50 : 0);
    const bRisk = (b.delayedCount > 0 ? 100 : 0) + (b.utilization > 110 ? 50 : 0);
    return bRisk - aRisk;
  });

  // Calculate additional flags
  const underutilizedCount = userLoad.filter(u => u.utilization < 50).length;
  const loadImbalance = carga?.loadImbalance || 0;
  const hasHighImbalance = loadImbalance > 60;
  const urgentUpcoming = upcomingActivities.filter(a => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date(a.endDate);
    return endDate <= tomorrow && a.status === 'pending';
  }).length;

  // Overall status
  const hasIssues = (riesgo?.overloadedCount || 0) > 0 ||
                    (riesgo?.criticalDelayedCount || 0) > 0 ||
                    (riesgo?.delayedCount || 0) > 0 ||
                    (riesgo?.blockedCount || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs Row - Cockpit style: siempre visibles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <KpiTile
          label="Carga Promedio"
          value={`${topBar?.avgUtilization || 0}%`}
          valueColor={clr(topBar?.avgUtilization || 0)}
          sub="Utilización equipo"
          t={t}
        />
        <KpiTile
          label="Sobrecargados"
          value={riesgo?.overloadedCount || 0}
          unit="personas"
          alertType={(riesgo?.overloadedCount || 0) > 0 ? 'error' : null}
          sub={(riesgo?.overloadedCount || 0) > 0 ? '> 110% de carga' : 'OK'}
          t={t}
        />
        <KpiTile
          label="Subutilizados"
          value={underutilizedCount}
          unit="personas"
          alertType={underutilizedCount > 0 ? 'warning' : null}
          sub={underutilizedCount > 0 ? '< 50% de carga' : 'OK'}
          t={t}
        />
        <KpiTile
          label="Desbalance"
          value={`${loadImbalance}%`}
          alertType={hasHighImbalance ? 'warning' : null}
          sub={hasHighImbalance ? 'máx - mín > 60%' : 'OK'}
          t={t}
        />
        <KpiTile
          label="Vence Mañana"
          value={urgentUpcoming}
          unit="actividades"
          alertType={urgentUpcoming > 0 ? 'error' : null}
          sub={urgentUpcoming > 0 ? 'Requieren atención' : 'OK'}
          t={t}
        />
        <KpiTile
          label="No Planeado"
          value={`${actividades?.unplannedPercent || 0}%`}
          alertType={(actividades?.unplannedPercent || 0) > 30 ? 'warning' : null}
          sub={(actividades?.unplannedPercent || 0) > 30 ? 'Emergencias > 30%' : 'OK'}
          t={t}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        {/* Risk Gauge */}
        <Card t={t} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: riesgo?.riskIndex >= 60 ? '#fee2e2' : riesgo?.riskIndex >= 35 ? '#fef3c7' : '#dcfce7'
        }}>
          <SectionTitle t={t} label="Índice de Riesgo" />
          <RiskGauge value={riesgo?.riskIndex || 0} />
          <div style={{
            marginTop: 12,
            padding: '6px 20px',
            borderRadius: 999,
            backgroundColor: riskColor(riesgo?.riskIndex || 0),
            color: '#fff',
            fontWeight: 600,
            fontSize: 13
          }}>
            {(riesgo?.riskIndex || 0) >= 60 ? 'ALTO' : (riesgo?.riskIndex || 0) >= 35 ? 'MEDIO' : 'BAJO'}
          </div>
        </Card>

        {/* Status de Tareas - Monitoreo constante */}
        <Card t={t}>
          <SectionTitle t={t} label="Status de Tareas" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Sobrecargados */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: (riesgo?.overloadedCount || 0) > 0 ? '#fee2e2' : '#dcfce7',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: (riesgo?.overloadedCount || 0) > 0 ? '#B00020' : '#2E7D32' }}>
                Personas sobrecargadas (&gt;110%)
              </span>
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: (riesgo?.overloadedCount || 0) > 0 ? '#B00020' : '#2E7D32',
                color: '#fff'
              }}>
                {(riesgo?.overloadedCount || 0) > 0 ? riesgo.overloadedCount : 'OK'}
              </span>
            </div>

            {/* Críticas retrasadas */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: (riesgo?.criticalDelayedCount || 0) > 0 ? '#fee2e2' : '#dcfce7',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: (riesgo?.criticalDelayedCount || 0) > 0 ? '#B00020' : '#2E7D32' }}>
                Tareas críticas retrasadas
              </span>
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: (riesgo?.criticalDelayedCount || 0) > 0 ? '#B00020' : '#2E7D32',
                color: '#fff'
              }}>
                {(riesgo?.criticalDelayedCount || 0) > 0 ? riesgo.criticalDelayedCount : 'OK'}
              </span>
            </div>

            {/* Actividades vencidas */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: (riesgo?.delayedCount || 0) > 0 ? '#fef3c7' : '#dcfce7',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: (riesgo?.delayedCount || 0) > 0 ? '#C77700' : '#2E7D32' }}>
                Actividades con fecha vencida
              </span>
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: (riesgo?.delayedCount || 0) > 0 ? '#C77700' : '#2E7D32',
                color: '#fff'
              }}>
                {(riesgo?.delayedCount || 0) > 0 ? riesgo.delayedCount : 'OK'}
              </span>
            </div>

            {/* Bloqueadas */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: (riesgo?.blockedCount || 0) > 0 ? '#fef3c7' : '#dcfce7',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: (riesgo?.blockedCount || 0) > 0 ? '#C77700' : '#2E7D32' }}>
                Actividades bloqueadas
              </span>
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: (riesgo?.blockedCount || 0) > 0 ? '#C77700' : '#2E7D32',
                color: '#fff'
              }}>
                {(riesgo?.blockedCount || 0) > 0 ? riesgo.blockedCount : 'OK'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Summary Table */}
      <Card t={t}>
        <SectionTitle t={t} label="Resumen por Persona" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: t.bgPanel }}>
                {['Persona', 'Utilización', 'Actividades', 'Completadas', 'Retrasadas', 'Estado'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: t.textMuted,
                    borderBottom: `1px solid ${t.border}`,
                    whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u, i) => {
                const isOverloaded = u.utilization > 110;
                const hasDelayed = u.delayedCount > 0;
                const status = isOverloaded ? 'Sobrecargado' : hasDelayed ? 'Con retrasos' : 'Normal';
                const statusColor = isOverloaded ? t.error : hasDelayed ? t.warning : t.success;
                return (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: t.text }}>
                      {u.first_name} {u.last_name}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 80,
                          height: 8,
                          backgroundColor: t.bgPanel,
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, u.utilization)}%`,
                            height: '100%',
                            backgroundColor: u.utilization > 110 ? t.error : u.utilization < 70 ? t.textMuted : t.success,
                            borderRadius: 4
                          }} />
                        </div>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: u.utilization > 110 ? t.error : u.utilization < 70 ? t.textMuted : t.success
                        }}>{u.utilization}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: t.text, textAlign: 'center' }}>
                      {u.activitiesCount}
                    </td>
                    <td style={{ padding: '8px 12px', color: t.success, textAlign: 'center', fontWeight: 600 }}>
                      {u.completedCount}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {u.delayedCount > 0
                        ? <span style={{ color: t.error, fontWeight: 600 }}>{u.delayedCount}</span>
                        : <span style={{ color: t.textMuted }}>-</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: `${statusColor}15`,
                        color: statusColor
                      }}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming Commitments */}
      {upcomingActivities.length > 0 && (
        <Card t={t}>
          <SectionTitle t={t} label="Próximos Compromisos (5 días)" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  {['Actividad', 'Responsable', 'Vence', 'Estado'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcomingActivities.slice(0, 8).map((a, i) => (
                  <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                    <td style={{ padding: '8px 12px', color: t.text }}>
                      <PriorityDot priority={a.priority} />
                      {a.title}
                    </td>
                    <td style={{ padding: '8px 12px', color: t.textMuted }}>{a.assignedTo}</td>
                    <td style={{ padding: '8px 12px', color: t.text, fontWeight: 500 }}>{formatDate(a.endDate)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── TAB: Workload (Carga) ────────────────────────────────────────────────────
const TabWorkload = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { carga, actividades } = kpis;
  const sorted = [...(carga?.userLoad || [])].sort((a, b) => b.utilization - a.utilization);

  const barData = sorted.map(u => ({
    name: u.first_name,
    utilización: parseFloat(u.utilization.toFixed(1)),
    disponible: parseFloat(u.hoursAvailable.toFixed(1)),
    asignadas: parseFloat(u.hoursAssigned.toFixed(1))
  }));

  // Planeado vs No Planeado
  const plannedPercent = 100 - (actividades?.unplannedPercent || 0);
  const unplannedPercent = actividades?.unplannedPercent || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <KpiTile
          label="Carga Promedio"
          value={`${carga?.userLoad?.length > 0 ? fmt1(carga.userLoad.reduce((s, u) => s + u.utilization, 0) / carga.userLoad.length) : 0}%`}
          color={clr(carga?.userLoad?.length > 0 ? carga.userLoad.reduce((s, u) => s + u.utilization, 0) / carga.userLoad.length : 0)}
          t={t}
        />
        <KpiTile label="Cap. Disponible" value={fmt1(carga?.totalAvailableHrs || 0)} unit="hrs" color={t.accent} t={t} />
        <KpiTile label="Horas Asignadas" value={fmt1(carga?.totalAssignedHrs || 0)} unit="hrs" color="#8b5cf6" t={t} />
        <KpiTile
          label="Desbalance"
          value={`${fmt1(carga?.loadImbalance || 0)}%`}
          color={(carga?.loadImbalance || 0) > 50 ? '#ef4444' : (carga?.loadImbalance || 0) > 25 ? '#C77700' : '#2E7D32'}
          sub="(máx - mín)"
          t={t}
        />
        <KpiTile
          label="Subutilización"
          value={`${carga?.underutilizedPercent || 0}%`}
          color={(carga?.underutilizedPercent || 0) > 30 ? '#C77700' : '#2E7D32'}
          sub={`${carga?.underutilizedCount || 0} personas <70%`}
          t={t}
        />
      </div>

      {/* Planeado vs No Planeado */}
      <Card t={t}>
        <SectionTitle t={t} label="Trabajo Planeado vs No Planeado" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: t.text }}>Trabajo planeado</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.accent }}>{plannedPercent}%</span>
            </div>
            <div style={{ height: 12, backgroundColor: t.bgPanel, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${plannedPercent}%`, backgroundColor: t.accent, borderRadius: 6 }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: t.text }}>No planeado (emergencias)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{unplannedPercent}%</span>
            </div>
            <div style={{ height: 12, backgroundColor: t.bgPanel, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${unplannedPercent}%`, backgroundColor: '#ef4444', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Utilization per person */}
        <Card t={t}>
          <SectionTitle t={t} label="Carga por Persona (%)" />
          <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 28)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" domain={[0, Math.max(120, ...barData.map(d => d.utilización))]}
                tickFormatter={v => `${v}%`} fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="name" fontSize={11} stroke={t.textMuted} width={70} interval={0} />
              <Tooltip formatter={(v) => [`${v}%`, 'Utilización']}
                contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="utilización" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: t.textMuted, formatter: v => `${v}%` }}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.utilización > 110 ? '#ef4444' : entry.utilización < 70 ? '#9ca3af' : '#2E7D32'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center', fontSize: 11, color: t.textMuted }}>
            <span style={{ color: t.textDim }}>■ Subutilizado (&lt;70%)</span>
            <span style={{ color: '#2E7D32' }}>■ Óptimo (70-110%)</span>
            <span style={{ color: '#ef4444' }}>■ Sobrecargado (&gt;110%)</span>
          </div>
        </Card>

        {/* Hours breakdown */}
        <Card t={t}>
          <SectionTitle t={t} label="Horas: Disponible vs Asignadas" />
          <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 28)}>
            <BarChart data={sorted.map(u => ({
              name: u.first_name,
              Disponibles: parseFloat(u.hoursAvailable.toFixed(1)),
              Asignadas: parseFloat(u.hoursAssigned.toFixed(1))
            }))} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="name" fontSize={11} stroke={t.textMuted} width={70} interval={0} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Disponibles" fill={t.border} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Asignadas" fill={t.accent} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detail table */}
      <Card t={t}>
        <SectionTitle t={t} label="Detalle por Persona" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: t.bgPanel }}>
                {['Persona', 'Puesto', 'Disponibles', 'Asignadas', 'Reales', 'Utilización', 'Actividades', 'Completadas', 'Retrasadas'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: t.textMuted, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                  <td style={{ padding: '8px 12px', color: t.text, fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '8px 12px', color: t.textMuted, fontSize: 12 }}>{u.position || '-'}</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursAvailable)} hrs</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursAssigned)} hrs</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursReal)} hrs</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '3px 12px',
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 12,
                      backgroundColor: u.utilization > 110 ? `${t.error}15` : u.utilization < 70 ? t.bgPanel : `${t.success}15`,
                      color: u.utilization > 110 ? t.error : u.utilization < 70 ? t.textDim : t.success
                    }}>{u.utilization}%</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: t.text, textAlign: 'center' }}>{u.activitiesCount}</td>
                  <td style={{ padding: '8px 12px', color: t.success, textAlign: 'center', fontWeight: 600 }}>{u.completedCount}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {u.delayedCount > 0
                      ? <span style={{ color: t.error, fontWeight: 600 }}>{u.delayedCount}</span>
                      : <span style={{ color: t.success }}>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── TAB: Objectives ──────────────────────────────────────────────────────────
const TabObjectives = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { proyectos, carga } = kpis;
  const kpiDist = proyectos?.kpiDistribution || [];
  const userLoad = carga?.userLoad || [];

  // QCTSP colors
  const qctspColors = {
    C: '#ef4444',   // Cost - red
    Q: '#0072CE',   // Quality - blue
    S: '#C77700',   // Safety - amber
    T: '#8b5cf6',   // Time - purple
    P: '#2E7D32'    // People - green
  };

  // Calculate user contribution per KPI (mock - would need backend enhancement for real data)
  const getKpiColor = (code) => qctspColors[code?.[0]] || t.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, kpiDist.length)}, 1fr)`, gap: 12 }}>
        {kpiDist.slice(0, 5).map(k => (
          <KpiTile
            key={k.kpi_id}
            label={k.name || k.code}
            value={`${k.avgProgress}%`}
            color={clr(k.avgProgress)}
            sub={`${k.completed}/${k.count} completadas`}
            t={t}
          />
        ))}
      </div>

      {/* Objectives with person breakdown */}
      <Card t={t}>
        <SectionTitle t={t} label="Objetivos del Periodo" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {kpiDist.map(k => (
            <div key={k.kpi_id} style={{
              padding: 16,
              backgroundColor: t.bgPanel,
              borderRadius: 8,
              borderLeft: `4px solid ${getKpiColor(k.code)}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: getKpiColor(k.code),
                    color: 'white',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    marginRight: 8
                  }}>{k.code}</span>
                  <span style={{ fontWeight: 600, color: t.text }}>{k.name}</span>
                </div>
                <span style={{ fontSize: 11, color: t.textMuted }}>
                  {k.count} actividades · {fmt1(k.estimated)} hrs est.
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: t.textMuted }}>Avance promedio</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: clr(k.avgProgress) }}>{k.avgProgress}%</span>
                </div>
                <div style={{ height: 8, backgroundColor: t.bgCard, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, k.avgProgress)}%`,
                    backgroundColor: clr(k.avgProgress),
                    borderRadius: 4
                  }} />
                </div>
              </div>

              {/* Person breakdown */}
              <div style={{ fontSize: 12, color: t.textMuted }}>
                <span style={{ fontWeight: 600 }}>Responsables:</span>{' '}
                {userLoad.filter(u => u.activitiesCount > 0).slice(0, 3).map((u, i) => (
                  <span key={u.id}>
                    {i > 0 && ', '}
                    {u.first_name}
                  </span>
                ))}
                {userLoad.length > 3 && ` +${userLoad.length - 3} más`}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Efficiency by department */}
      <Card t={t}>
        <SectionTitle t={t} label="Eficiencia por Departamento" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(proyectos?.departmentEfficiency || []).slice(0, 6).map(d => (
            <div key={d.department}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{d.department}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>{d.count} acts</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444'
                  }}>{d.completionRate}%</span>
                </div>
              </div>
              <div style={{ height: 6, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, d.completionRate)}%`,
                  backgroundColor: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444',
                  borderRadius: 3
                }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── TAB: Detail ──────────────────────────────────────────────────────────────
const TabDetail = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { ejecucion, detail } = kpis;
  const upcomingActivities = detail?.upcomingActivities || [];
  const delayedActivities = detail?.delayedActivities || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile
          label="Cumplimiento"
          value={`${ejecucion?.compliancePercent || 0}%`}
          color={clr(ejecucion?.compliancePercent || 0)}
          sub="Real vs Estimado"
          t={t}
        />
        <KpiTile
          label="Productividad"
          value={`${ejecucion?.productivity || 0}x`}
          color={(ejecucion?.productivity || 0) >= 1 ? '#2E7D32' : '#ef4444'}
          sub="est / real"
          t={t}
        />
        <KpiTile
          label="Lead Time"
          value={ejecucion?.avgLeadTimeDays || 0}
          unit="días"
          color={(ejecucion?.avgLeadTimeDays || 0) < 7 ? '#2E7D32' : (ejecucion?.avgLeadTimeDays || 0) < 21 ? '#C77700' : '#ef4444'}
          t={t}
        />
        <KpiTile
          label="Throughput"
          value={ejecucion?.throughput || 0}
          unit="tareas"
          color="#8b5cf6"
          sub="Completadas en periodo"
          t={t}
        />
      </div>

      {/* Upcoming Activities */}
      <Card t={t}>
        <SectionTitle t={t} label="Próximas Actividades" />
        {upcomingActivities.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  {['Actividad', 'Responsable', 'Fecha Fin', 'Avance', 'Estado'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcomingActivities.map((a, i) => (
                  <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                    <td style={{ padding: '8px 12px', color: t.text }}>
                      <PriorityDot priority={a.priority} />
                      {a.title}
                    </td>
                    <td style={{ padding: '8px 12px', color: t.textMuted }}>{a.assignedTo}</td>
                    <td style={{ padding: '8px 12px', color: t.text, fontWeight: 500 }}>{formatDate(a.endDate)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 6, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${a.progress || 0}%`, height: '100%', backgroundColor: t.accent, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: t.textMuted }}>{a.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: t.textMuted }}>
            No hay actividades próximas en los siguientes 5 días
          </div>
        )}
      </Card>

      {/* Delayed Activities */}
      <Card t={t}>
        <SectionTitle t={t} label="Actividades Retrasadas" />
        {delayedActivities.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  {['Actividad', 'Responsable', 'Fecha Fin', 'Días Vencido', 'Avance', 'Prioridad'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      borderBottom: `1px solid ${t.border}`
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delayedActivities.map((a, i) => {
                  const priorityConfig = {
                    critical: { bg: '#B0002015', color: '#B00020', label: 'Crítica' },
                    high: { bg: '#ef444415', color: '#ef4444', label: 'Alta' },
                    medium: { bg: '#C7770015', color: '#C77700', label: 'Media' },
                    low: { bg: '#2E7D3215', color: '#2E7D32', label: 'Baja' }
                  };
                  const pCfg = priorityConfig[a.priority] || priorityConfig.medium;
                  return (
                    <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                      <td style={{ padding: '8px 12px', color: t.text, fontWeight: 500 }}>
                        {a.title}
                      </td>
                      <td style={{ padding: '8px 12px', color: t.textMuted }}>{a.assignedTo}</td>
                      <td style={{ padding: '8px 12px', color: t.error, fontWeight: 500 }}>{formatDate(a.endDate)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: `${t.error}15`,
                          color: t.error
                        }}>+{a.daysOverdue} días</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 6, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${a.progress || 0}%`, height: '100%', backgroundColor: t.error, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: t.textMuted }}>{a.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: pCfg.bg,
                          color: pCfg.color
                        }}>{pCfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: t.success }}>
            No hay actividades retrasadas
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Mi Dashboard Catalog ─────────────────────────────────────────────────────
const WORKLOAD_CATALOG = [
  { id: 'kpi-util', cat: 'KPIs', label: 'Utilización Prom.', size: 'sm' },
  { id: 'kpi-sobrecarga', cat: 'KPIs', label: '% Sobrecargados', size: 'sm' },
  { id: 'kpi-retrasadas', cat: 'KPIs', label: '% Retrasadas', size: 'sm' },
  { id: 'kpi-riesgo', cat: 'KPIs', label: 'Índice de Riesgo', size: 'sm' },
  { id: 'kpi-cumplimiento', cat: 'KPIs', label: 'Cumplimiento', size: 'sm' },
  { id: 'kpi-productividad', cat: 'KPIs', label: 'Productividad', size: 'sm' },
  { id: 'chart-util-bar', cat: 'Carga', label: 'Carga por Persona', size: 'lg' },
  { id: 'chart-horas', cat: 'Carga', label: 'Horas Disponible vs Asignadas', size: 'lg' },
  { id: 'riesgo-gauge', cat: 'Riesgo', label: 'Índice de Riesgo', size: 'md' },
  { id: 'riesgo-items', cat: 'Riesgo', label: 'Alertas de Riesgo', size: 'lg' },
];

const WORKLOAD_DEFAULT = ['kpi-util', 'kpi-sobrecarga', 'kpi-retrasadas', 'kpi-riesgo', 'chart-util-bar', 'riesgo-gauge'];

const renderWorkloadWidget = (id, kpis, t) => {
  if (!kpis) return <div style={{ padding: 16, color: t.textDim, fontSize: 12 }}>Sin datos</div>;
  const { topBar = {}, carga = {}, riesgo = {} } = kpis;

  if (id === 'kpi-util')
    return <KpiTile label="Utilización Prom." value={`${topBar.avgUtilization ?? 0}%`} color={clr(topBar.avgUtilization ?? 0)} t={t} />;
  if (id === 'kpi-sobrecarga')
    return <KpiTile label="% Sobrecargados" value={`${topBar.overloadedPercent ?? 0}%`} color={(topBar.overloadedPercent ?? 0) > 30 ? '#ef4444' : (topBar.overloadedPercent ?? 0) > 0 ? '#C77700' : '#2E7D32'} sub="> 110% capacidad" t={t} />;
  if (id === 'kpi-retrasadas')
    return <KpiTile label="% Retrasadas" value={`${topBar.delayedPercent ?? 0}%`} color={(topBar.delayedPercent ?? 0) > 20 ? '#ef4444' : (topBar.delayedPercent ?? 0) > 10 ? '#C77700' : '#2E7D32'} sub="Fecha vencida" t={t} />;
  if (id === 'kpi-riesgo')
    return <KpiTile label="Índice de Riesgo" value={riesgo.riskIndex ?? 0} color={riskColor(riesgo.riskIndex ?? 0)} sub={(riesgo.riskIndex ?? 0) >= 60 ? 'Alto' : (riesgo.riskIndex ?? 0) >= 35 ? 'Medio' : 'Bajo'} t={t} />;
  if (id === 'kpi-cumplimiento')
    return <KpiTile label="Cumplimiento" value={`${kpis.ejecucion?.compliancePercent ?? 0}%`} color={clr(kpis.ejecucion?.compliancePercent ?? 0)} t={t} />;
  if (id === 'kpi-productividad')
    return <KpiTile label="Productividad" value={`${kpis.ejecucion?.productivity ?? 0}x`} color={(kpis.ejecucion?.productivity ?? 0) >= 1 ? '#2E7D32' : '#ef4444'} sub="est / real" t={t} />;

  if (id === 'chart-util-bar') {
    const sorted = [...(carga.userLoad || [])].sort((a, b) => b.utilization - a.utilization);
    const barData = sorted.map(u => ({ name: u.first_name, utilización: parseFloat(u.utilization.toFixed(1)) }));
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Carga por Persona (%)</div>
        <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 28)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 40 }}>
            <XAxis type="number" tickFormatter={v => `${v}%`} fontSize={10} />
            <YAxis type="category" dataKey="name" fontSize={10} width={70} interval={0} />
            <Tooltip formatter={(v) => [`${v}%`, 'Utilización']} />
            <Bar dataKey="utilización" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, formatter: v => `${v}%` }}>
              {barData.map((e, i) => <Cell key={i} fill={e.utilización > 110 ? '#ef4444' : e.utilización < 70 ? '#9ca3af' : '#2E7D32'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-horas') {
    const sorted = [...(carga.userLoad || [])].sort((a, b) => b.utilization - a.utilization);
    const data = sorted.map(u => ({ name: u.first_name, Disponibles: parseFloat(u.hoursAvailable.toFixed(1)), Asignadas: parseFloat(u.hoursAssigned.toFixed(1)) }));
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Horas: Disponible vs Asignadas</div>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
            <XAxis type="number" fontSize={10} />
            <YAxis type="category" dataKey="name" fontSize={10} width={70} interval={0} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Disponibles" fill={t.border} />
            <Bar dataKey="Asignadas" fill={t.accent} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'riesgo-gauge') {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Índice de Riesgo</div>
        <RiskGauge value={riesgo.riskIndex ?? 0} />
      </div>
    );
  }

  if (id === 'riesgo-items') {
    const items = [
      { label: 'Sobrecargados', value: riesgo.overloadedCount ?? 0, color: (riesgo.overloadedCount ?? 0) > 0 ? '#ef4444' : '#2E7D32' },
      { label: 'Críticas Retrasadas', value: riesgo.criticalDelayedCount ?? 0, color: (riesgo.criticalDelayedCount ?? 0) > 0 ? '#ef4444' : '#2E7D32' },
      { label: 'Retrasadas', value: riesgo.delayedCount ?? 0, color: (riesgo.delayedCount ?? 0) > 0 ? '#C77700' : '#2E7D32' },
      { label: 'Bloqueadas', value: riesgo.blockedCount ?? 0, color: (riesgo.blockedCount ?? 0) > 0 ? '#C77700' : '#2E7D32' },
    ];
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Alertas de Riesgo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {items.map(item => (
            <div key={item.label} style={{ padding: 10, borderRadius: 8, border: `1px solid ${t.border}`, borderLeft: `4px solid ${item.color}` }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div style={{ padding: 16, color: t.textDim, fontSize: 12 }}>Widget "{id}" no encontrado</div>;
};

// ─── Main WorkloadDashboard ───────────────────────────────────────────────────
const WorkloadDashboard = ({ userIds: initialUserIds, availableUsers = [] }) => {
  const { theme: t } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('workload-dashboard-tab') || 'summary');
  const handleTabChange = (id) => { setActiveTab(id); localStorage.setItem('workload-dashboard-tab', id); };

  // Period state
  const [periodPreset, setPeriodPreset] = useState('month');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // User IDs state - for multi-select
  const [userIds, setUserIds] = useState(initialUserIds || []);

  // Update userIds when prop changes
  useEffect(() => {
    if (initialUserIds && JSON.stringify(initialUserIds) !== JSON.stringify(userIds)) {
      setUserIds(initialUserIds);
    }
  }, [initialUserIds]);

  // Period preset handler
  const handlePeriodPreset = (preset) => {
    setPeriodPreset(preset);
    const today = new Date();
    let start;
    if (preset === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
    } else if (preset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
    }
    if (start) {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (!userIds || userIds.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        user_ids: userIds.join(','),
        start_date: startDate,
        end_date: endDate
      });
      const res = await fetch(`${API_URL}/workload/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error('WorkloadDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userIds?.join(','), startDate, endDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!userIds || userIds.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
        Selecciona un usuario para ver el dashboard.
      </div>
    );
  }

  const kpis = data?.kpis;

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'workload', label: 'Workload' },
    { id: 'objectives', label: 'Objectives' },
    { id: 'detail', label: 'Detail' },
    { id: 'mydashboard', label: 'My Dashboard' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Unified Header */}
      <div style={{
        backgroundColor: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        {/* Period presets */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
            { id: 'quarter', label: 'Trimestre' }
          ].map((p, i) => (
            <button
              key={p.id}
              onClick={() => handlePeriodPreset(p.id)}
              style={{
                padding: '6px 14px',
                border: `1px solid ${t.border}`,
                borderLeft: i === 0 ? `1px solid ${t.border}` : 'none',
                borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : 0,
                backgroundColor: periodPreset === p.id ? t.accent : t.bgPanel,
                color: periodPreset === p.id ? 'white' : t.text,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPeriodPreset(''); }}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              backgroundColor: t.bgPanel,
              color: t.text,
              fontSize: 13
            }}
          />
          <span style={{ color: t.textMuted }}>→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPeriodPreset(''); }}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              backgroundColor: t.bgPanel,
              color: t.text,
              fontSize: 13
            }}
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchDashboard}
          style={{
            padding: '6px 16px',
            backgroundColor: t.accent,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          Actualizar
        </button>

        {/* Period info */}
        {data && (
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 'auto' }}>
            {data.period?.days} días · {userIds.length} persona(s)
          </span>
        )}
      </div>

      {/* Tab nav - underline style */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${t.border}` }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${t.accent}` : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 500,
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? t.accent : t.textMuted,
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
          Calculando KPIs...
        </div>
      ) : kpis && (
        <>
          {activeTab === 'summary' && <TabSummary kpis={kpis} />}
          {activeTab === 'workload' && <TabWorkload kpis={kpis} />}
          {activeTab === 'objectives' && <TabObjectives kpis={kpis} />}
          {activeTab === 'detail' && <TabDetail kpis={kpis} />}
          {activeTab === 'mydashboard' && (
            <CustomDashboard
              storageKey="workload-custom-dashboard-v2"
              catalog={WORKLOAD_CATALOG}
              defaultWidgets={WORKLOAD_DEFAULT}
              renderWidget={(id) => renderWorkloadWidget(id, kpis, t)}
              data={kpis}
            />
          )}
        </>
      )}
    </div>
  );
};

export default WorkloadDashboard;
