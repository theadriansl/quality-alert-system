import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import CustomDashboard from './CustomDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const formatCurrency = (v) => {
  if (!v || isNaN(v)) return '$0';
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${parseFloat(v).toFixed(0)}`;
};

const sevColor = (s) => s === 'High' ? '#ef4444' : s === 'Medium' ? '#C77700' : '#2E7D32';
const statusColor = (s, t) => {
  const l = (s || '').toLowerCase();
  if (l === 'closed') return '#2E7D32';
  if (l === 'in progress' || l === 'in_progress') return t?.accent || '#0072CE';
  return t?.textDim || '#6b7280';
};

const STEP_COLORS = {
  D1: '#9ca3af', D2: '#6b7280', D3: '#4b5563', 'D3-MFG': '#374151',
  D4: '#1565C0', D5: '#0072CE', D6: '#8b5cf6', D7: '#C77700', D8: '#2E7D32'
};

const progressBucketColor = (label) => {
  if (label === '75-100%') return '#2E7D32';
  if (label === '50-75%') return '#0072CE';
  if (label === '25-50%') return '#C77700';
  return '#ef4444';
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const KpiTile = ({ label, value, unit = '', color, sub, icon, alert = false }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${alert ? '#ef4444' : t.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
      borderTop: `3px solid ${color || t.accent}`,
      boxShadow: alert ? '0 0 0 2px #fee2e280' : 'none'
    }}>
      <div style={{ fontSize: '10px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>
        {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: color || t.text, lineHeight: 1.1 }}>
        {value}<span style={{ fontSize: '13px', fontWeight: '400', marginLeft: '3px', color: t.textMuted }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '3px' }}>{sub}</div>}
    </div>
  );
};

const Card = ({ children, style = {} }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '18px', ...style }}>
      {children}
    </div>
  );
};

const SectionTitle = ({ icon, label, sub }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: t.text }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px', marginLeft: '24px' }}>{sub}</div>}
    </div>
  );
};

const HBar = ({ label, value, max, color, fmt }) => {
  const { theme: t } = useTheme();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: color }}>{fmt ? fmt(value) : value}</span>
      </div>
      <div style={{ height: '7px', backgroundColor: t.bgPanel, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

// ─── Tabs ────────────────────────────────────────────────────────────────────

// TAB 1: Volumen & Flujo
const TabVolumen = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };

  const stepData = useMemo(() => {
    const steps = {};
    derived.all.forEach(r => { const s = r.currentStep || 'D1'; steps[s] = (steps[s] || 0) + 1; });
    const order = ['D1', 'D2', 'D3', 'D3-MFG', 'D4', 'D5', 'D6', 'D7', 'D8'];
    return order.map(s => ({ step: s, count: steps[s] || 0, color: STEP_COLORS[s] })).filter(s => s.count > 0);
  }, [derived.all]);

  const early = stepData.filter(s => ['D1','D2','D3','D3-MFG'].includes(s.step)).reduce((a,b) => a + b.count, 0);
  const advanced = stepData.filter(s => ['D4','D5','D6','D7','D8'].includes(s.step)).reduce((a,b) => a + b.count, 0);
  const earlyPct = derived.total > 0 ? Math.round((early / derived.total) * 100) : 0;
  const advPct = derived.total > 0 ? Math.round((advanced / derived.total) * 100) : 0;

  const monthlyWithThroughput = useMemo(() => {
    const map = {};
    (data.monthlyTrend || []).forEach(m => { map[m.month] = { month: m.month, creados: m.count, cost: m.cost }; });
    (data.throughputByMonth || []).forEach(m => { if (map[m.month]) map[m.month].cerrados = m.count; else map[m.month] = { month: m.month, creados: 0, cost: 0, cerrados: m.count }; });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Early vs Advanced */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <KpiTile label="En etapas tempranas (D1-D3)" value={`${earlyPct}%`} color={earlyPct > 60 ? '#C77700' : t.textDim} icon="🌱" sub={`${early} reportes`} />
        <KpiTile label="En etapas avanzadas (D4-D8)" value={`${advPct}%`} color={advPct > 50 ? '#2E7D32' : t.accent} icon="🚀" sub={`${advanced} reportes`} />
        <KpiTile label="Throughput (cerrados/mes prom.)" value={data.throughputByMonth?.length ? Math.round(data.throughputByMonth.reduce((s,m)=>s+m.count,0)/data.throughputByMonth.length) : 0} unit="/ mes" color="#8b5cf6" icon="🏁" sub="Últimos 12 meses" />
      </div>

      {/* Monthly trend + throughput */}
      <Card>
        <SectionTitle icon="📈" label="Tendencia Mensual: Creados vs Cerrados" />
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={monthlyWithThroughput}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" fontSize={10} stroke={t.textMuted} />
            <YAxis yAxisId="left" fontSize={11} stroke={t.textMuted} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} fontSize={10} stroke={t.textMuted} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v, n) => n === 'cost' ? [formatCurrency(v), 'Costo'] : [v, n]} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="creados" name="Creados" fill="#0072CE" radius={[4,4,0,0]} />
            <Bar yAxisId="left" dataKey="cerrados" name="Cerrados" fill="#2E7D32" radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cost" name="cost" stroke="#C77700" strokeWidth={2} dot={{ r: 3, fill: '#C77700' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Step distribution */}
      <Card>
        <SectionTitle icon="📊" label="Distribución por Fase" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stepData} layout="vertical" margin={{ left: 10, right: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" fontSize={11} stroke={t.textMuted} />
            <YAxis type="category" dataKey="step" fontSize={12} stroke={t.textMuted} width={60} fontWeight="600" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0,6,6,0]} label={{ position:'right', fontSize:12, fontWeight:'700', fill:t.text }}>
              {stepData.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// TAB 2: Tiempo & Cumplimiento
const TabTiempo = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };

  const daysData = (data.avgDaysByDepartment || []).map(d => ({
    ...d, avgDays: parseFloat(d.avgDays),
    color: parseFloat(d.avgDays) > 90 ? '#ef4444' : parseFloat(d.avgDays) > 60 ? '#C77700' : '#2E7D32'
  }));
  const maxDays = Math.max(...daysData.map(d => d.avgDays), 1);

  const slaColor = data.slaCompliance >= 80 ? '#2E7D32' : data.slaCompliance >= 50 ? '#C77700' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <KpiTile label="Días Promedio para Cerrar" value={data.avgDaysToClose} unit="días" color={parseFloat(data.avgDaysToClose) > 60 ? '#ef4444' : '#2E7D32'} icon="⏱️" />
        <KpiTile label="SLA D4 Compliance" value={`${data.slaCompliance}%`} color={slaColor} icon="📋" sub="Tiempo respuesta cliente" />
        <KpiTile label="Vencidos" value={derived.overdueCount} color={derived.overdueCount > 0 ? '#ef4444' : '#2E7D32'} icon="⏰" alert={derived.overdueCount > 0} sub="Fecha objetivo pasada" />
        <KpiTile label="Por vencer (7 días)" value={derived.dueSoon7} color={derived.dueSoon7 > 0 ? '#C77700' : '#2E7D32'} icon="🔔" sub="Requieren atención" />
        <KpiTile label="Por vencer (30 días)" value={derived.dueSoon30} color={derived.dueSoon30 > 5 ? '#C77700' : '#2E7D32'} icon="📅" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Days by dept */}
        <Card>
          <SectionTitle icon="🏢" label="Días Promedio Abiertos por Departamento" sub="Solo reportes activos" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daysData} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" domain={[0, maxDays * 1.1]} unit=" d" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="department" fontSize={10} stroke={t.textMuted} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} días`]} />
              <Bar dataKey="avgDays" radius={[0,6,6,0]} label={{ position:'right', fontSize:11, fill:t.textMuted, formatter: v => `${v}d` }}>
                {daysData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* SLA + Vencidos detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* SLA gauge */}
          <Card>
            <SectionTitle icon="📋" label="SLA D4 Compliance" />
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '120px', height: '120px', borderRadius: '50%',
                border: `8px solid ${slaColor}`,
                backgroundColor: data.slaCompliance >= 80 ? '#dcfce7' : data.slaCompliance >= 50 ? '#fef3c7' : '#fee2e2'
              }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: slaColor }}>{data.slaCompliance}%</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>SLA D4</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: t.textMuted }}>
                {data.slaCompliance >= 80 ? '✅ Cumplimiento satisfactorio' : data.slaCompliance >= 50 ? '⚠️ Por debajo del objetivo' : '🔴 Crítico — requiere acción'}
              </div>
            </div>
          </Card>

          {/* Due soon list */}
          <Card>
            <SectionTitle icon="🔔" label="Por Vencer en 7 Días" />
            {derived.dueSoon7List.length === 0 ? (
              <div style={{ color: '#2E7D32', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>✅ Sin vencimientos próximos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {derived.dueSoon7List.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#92400e' }}>{r.reportId}</span>
                    <span style={{ color: t.textMuted }}>{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// TAB 3: Impacto Económico
const TabCostos = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };
  const total = data.totalEstimatedCost || 0;
  const avgCost = data.total8Ds > 0 ? total / data.total8Ds : 0;

  const costSevData = (data.costBySeverity || []).map(s => ({
    name: s.severity || 'N/A',
    cost: s.cost,
    count: s.count,
    color: sevColor(s.severity)
  }));

  const highSevCost = data.costBySeverity?.find(s => s.severity === 'High')?.cost || 0;
  const highSevPct = total > 0 ? Math.round((highSevCost / total) * 100) : 0;

  const deptData = (data.costByDepartment || []).slice(0, 8);
  const supplierData = (data.topSuppliers || []).filter(s => s.supplier !== 'N/A').slice(0, 8);
  const maxDeptCost = Math.max(...deptData.map(d => d.cost), 1);
  const maxSupCost = Math.max(...supplierData.map(s => s.cost), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <KpiTile label="Costo Total Estimado" value={formatCurrency(total)} color="#ef4444" icon="💸" />
        <KpiTile label="Costo Promedio por 8D" value={formatCurrency(avgCost)} color="#C77700" icon="📊" />
        <KpiTile label="% Costo en Alta Severidad" value={`${highSevPct}%`} color={highSevPct > 50 ? '#ef4444' : '#C77700'} icon="🔴" sub={formatCurrency(highSevCost)} />
        <KpiTile label="Máximo por Proveedor" value={formatCurrency(Math.max(...supplierData.map(s=>s.cost), 0))} color="#8b5cf6" icon="🏭" sub={supplierData.sort((a,b)=>b.cost-a.cost)[0]?.supplier} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Cost by dept */}
        <Card>
          <SectionTitle icon="🏢" label="Costo por Departamento" />
          <div style={{ padding: '4px 0' }}>
            {deptData.map(d => (
              <HBar key={d.department} label={d.department} value={d.cost} max={maxDeptCost} color={t.accent} fmt={formatCurrency} />
            ))}
          </div>
        </Card>

        {/* Cost by supplier */}
        <Card>
          <SectionTitle icon="🏭" label="Costo por Proveedor" />
          <div style={{ padding: '4px 0' }}>
            {supplierData.sort((a,b)=>b.cost-a.cost).map(s => (
              <HBar key={s.supplier} label={s.supplier} value={s.cost} max={maxSupCost} color="#8b5cf6" fmt={formatCurrency} />
            ))}
          </div>
        </Card>
      </div>

      {/* Cost by severity pie */}
      <Card>
        <SectionTitle icon="🥧" label="Distribución de Costo por Severidad" />
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <ResponsiveContainer width="40%" height={200}>
            <PieChart>
              <Pie data={costSevData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="cost" paddingAngle={3}>
                {costSevData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={v => [formatCurrency(v), 'Costo']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {costSevData.map(s => (
              <div key={s.name} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>{formatCurrency(s.cost)} · {s.count} reportes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

// TAB 4: Calidad de Análisis
const TabCalidad = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };

  const withD4 = derived.total - derived.withoutD4;
  const withD4Pct = derived.total > 0 ? Math.round((withD4 / derived.total) * 100) : 0;
  const highSevWithoutD4Pct = data.highSeverity > 0 ? Math.round((derived.highSevWithoutD4 / data.highSeverity) * 100) : 0;

  const progressBuckets = [
    { label: '0-25%', count: derived.all.filter(r => (r.progressPercentage || 0) < 25).length, color: '#ef4444' },
    { label: '25-50%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 25 && (r.progressPercentage || 0) < 50).length, color: '#C77700' },
    { label: '50-75%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 50 && (r.progressPercentage || 0) < 75).length, color: '#0072CE' },
    { label: '75-100%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 75).length, color: '#2E7D32' }
  ];
  const avgProgress = derived.total > 0
    ? Math.round(derived.all.reduce((s, r) => s + (r.progressPercentage || 0), 0) / derived.total)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <KpiTile label="% Con Causa Raíz (D4)" value={`${withD4Pct}%`}
          color={withD4Pct >= 80 ? '#2E7D32' : withD4Pct >= 50 ? '#C77700' : '#ef4444'} icon="🔍"
          sub={`${withD4} de ${derived.total} reportes`} />
        <KpiTile label="Sin Causa Raíz" value={derived.withoutD4}
          color={derived.withoutD4 > 0 ? '#ef4444' : '#2E7D32'} icon="❓"
          alert={derived.withoutD4 > 5} sub="Activos sin D4 definido" />
        <KpiTile label="Alta Sev. SIN D4 🔴" value={derived.highSevWithoutD4}
          color={derived.highSevWithoutD4 > 0 ? '#ef4444' : '#2E7D32'} icon="🚨"
          alert={derived.highSevWithoutD4 > 0} sub={`${highSevWithoutD4Pct}% de los High`} />
        <KpiTile label="Avance Promedio" value={`${avgProgress}%`}
          color={avgProgress >= 60 ? '#2E7D32' : avgProgress >= 30 ? '#C77700' : '#ef4444'} icon="📈" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Progress distribution */}
        <Card>
          <SectionTitle icon="📊" label="Distribución de Avance" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="label" fontSize={12} stroke={t.textMuted} />
              <YAxis fontSize={11} stroke={t.textMuted} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} reportes`]} />
              <Bar dataKey="count" radius={[6,6,0,0]} label={{ position:'top', fontSize:13, fontWeight:'700', fill:t.text }}>
                {progressBuckets.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            {progressBuckets.map(b => (
              <span key={b.label} style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '12px', backgroundColor: b.color + '20', color: b.color, fontWeight: '600' }}>
                {b.label}: {b.count}
              </span>
            ))}
          </div>
        </Card>

        {/* Top root causes */}
        <Card>
          <SectionTitle icon="🔎" label="Top Causas Raíz (D4)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data.topRootCauses || []).slice(0, 8).map((rc, i) => {
              const maxRc = data.topRootCauses?.[0]?.count || 1;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', color: t.text, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rc.cause}>
                      {i + 1}. {rc.cause}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#8b5cf6' }}>{rc.count}</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(rc.count / maxRc) * 100}%`, backgroundColor: '#8b5cf6', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Alert: High severity without D4 */}
      {derived.highSevWithoutD4 > 0 && (
        <div style={{ display: 'flex', gap: '12px', padding: '14px 18px', backgroundColor: '#fee2e2', borderRadius: '10px', border: '1px solid #fca5a5' }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <div style={{ fontWeight: '700', color: '#B00020', fontSize: '14px' }}>
              {derived.highSevWithoutD4} reporte(s) de Alta Severidad sin Causa Raíz definida
            </div>
            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
              Estos reportes representan alto riesgo operativo. Es prioritario completar el análisis D4 (5 Por Qués / Ishikawa).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TAB 5: Proveedores
const TabProveedores = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };

  const suppliers = (data.topSuppliers || []).filter(s => s.supplier && s.supplier !== 'N/A');
  const total = derived.total;
  const top2Pct = data.insights?.top2SuppliersPct || 0;
  const top2Names = data.insights?.top2SuppliersNames || '';
  const avgCostPerSup = suppliers.map(s => ({ ...s, avgCost: s.count > 0 ? s.cost / s.count : 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <KpiTile label="Total Proveedores" value={suppliers.length} color={t.accent} icon="🏭" />
        <KpiTile label="Concentración Top 2" value={`${top2Pct}%`} color={top2Pct > 40 ? '#ef4444' : '#C77700'} icon="⚠️" sub={top2Names} />
        <KpiTile label="Mayor Costo" value={formatCurrency(Math.max(...suppliers.map(s=>s.cost), 0))} color="#ef4444" icon="💸" sub={suppliers.sort((a,b)=>b.cost-a.cost)[0]?.supplier} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Top by incidents */}
        <Card>
          <SectionTitle icon="📊" label="Top Proveedores por Incidencias" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={suppliers.slice(0,8)} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="supplier" fontSize={10} stroke={t.textMuted} width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#C77700" radius={[0,6,6,0]} label={{ position:'right', fontSize:11, fill:t.textMuted }}>
                {suppliers.slice(0,8).map((e,i) => (
                  <Cell key={i} fill={i < 2 ? '#ef4444' : i < 4 ? '#C77700' : '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top by cost */}
        <Card>
          <SectionTitle icon="💸" label="Top Proveedores por Costo Total" />
          <div style={{ padding: '4px 0' }}>
            {suppliers.sort((a,b)=>b.cost-a.cost).slice(0,8).map((s, i) => (
              <div key={s.supplier} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>{i+1}. {s.supplier}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: i < 2 ? '#ef4444' : t.accent }}>{formatCurrency(s.cost)}</span>
                    <span style={{ fontSize: '10px', color: t.textMuted, marginLeft: '6px' }}>{s.count} 8Ds</span>
                  </div>
                </div>
                <div style={{ height: '5px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.cost/Math.max(...suppliers.map(x=>x.cost),1))*100}%`, backgroundColor: i < 2 ? '#ef4444' : t.accent, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Avg cost per incident by supplier */}
      <Card>
        <SectionTitle icon="📐" label="Costo Promedio por Incidente por Proveedor" sub="Indica el impacto económico típico de cada proveedor" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {avgCostPerSup.sort((a,b)=>b.avgCost-a.avgCost).slice(0,8).map(s => (
            <div key={s.supplier} style={{ padding: '10px 14px', backgroundColor: t.bgPanel, borderRadius: '8px', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.supplier}>{s.supplier}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: s.avgCost > 500000 ? '#ef4444' : t.accent }}>{formatCurrency(s.avgCost)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>prom/incidente · {s.count} 8Ds</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// TAB 6: Operación Interna
const TabOperacion = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px', color: t.text };

  const stepCols = ['D1','D2','D3','D3-MFG','D4','D5','D6','D7'];

  const deptData = (data.avgDaysByDepartment || []).map(dept => {
    const progressInfo = (data.avgProgressByDept || []).find(d => d.department === dept.department);
    return { ...dept, avgProgress: progressInfo?.avgProgress || 0 };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Pareto */}
      <Card>
        <SectionTitle icon="📊" label="Pareto por Departamento" sub="Principio 80/20: qué departamentos concentran el mayor volumen de 8Ds" />
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data.paretoByDepartment || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="department" fontSize={10} stroke={t.textMuted} angle={-15} textAnchor="end" height={50} />
            <YAxis yAxisId="left" fontSize={11} stroke={t.textMuted} />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} fontSize={11} stroke={t.textMuted} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="left" dataKey="count" name="Incidencias" fill={t.accent} radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Dept summary table */}
        <Card>
          <SectionTitle icon="📋" label="Resumen por Departamento" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: t.bgPanel }}>
                {['Departamento', '# 8Ds', 'Días Prom.', 'Avance Prom.'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', fontSize: '10px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptData.map((d, i) => (
                <tr key={d.department} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                  <td style={{ padding: '6px 10px', color: t.text, fontWeight: '500' }}>{d.department}</td>
                  <td style={{ padding: '6px 10px', color: t.text, textAlign: 'center' }}>{d.count}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <span style={{ color: parseFloat(d.avgDays) > 90 ? '#ef4444' : parseFloat(d.avgDays) > 60 ? '#C77700' : '#2E7D32', fontWeight: '700' }}>
                      {d.avgDays}d
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.avgProgress}%`, backgroundColor: d.avgProgress > 60 ? '#2E7D32' : d.avgProgress > 30 ? '#C77700' : '#ef4444', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: t.text, minWidth: '32px' }}>{d.avgProgress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Steps by dept stacked */}
        <Card>
          <SectionTitle icon="📈" label="Fase Actual por Departamento" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(data.stepsByDepartment || []).slice(0,6)} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="department" fontSize={9} stroke={t.textMuted} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {stepCols.map(s => (
                <Bar key={s} dataKey={s} stackId="a" fill={STEP_COLORS[s]} name={s} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

// TAB 7: Riesgo & Alertas
const TabRiesgo = ({ data, derived }) => {
  const { theme: t } = useTheme();

  const AlertList = ({ title, icon, items, emptyMsg, color = '#ef4444', renderItem }) => (
    <Card>
      <SectionTitle icon={icon} label={title} />
      {items.length === 0 ? (
        <div style={{ color: '#2E7D32', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>✅ {emptyMsg}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
          {items.map(renderItem)}
        </div>
      )}
    </Card>
  );

  const ReportRow = ({ r, color, badge }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: color + '10', borderRadius: '6px', border: `1px solid ${color}30` }}>
      <div>
        <span style={{ fontWeight: '700', color, fontSize: '12px' }}>{r.reportId}</span>
        <span style={{ color: t.textMuted, fontSize: '11px', marginLeft: '8px' }}>{r.title?.slice(0,45)}{r.title?.length > 45 ? '…' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {badge && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: color, color: 'white', fontWeight: '600' }}>{badge}</span>}
        <span style={{ fontSize: '11px', color: t.textMuted }}>{r.createdByDepartment}</span>
      </div>
    </div>
  );

  const riskScore = Math.min(100, Math.round(
    (derived.overdueCount / Math.max(derived.total, 1)) * 30 +
    (derived.highSevWithoutD4 / Math.max(data.highSeverity, 1)) * 30 +
    (derived.stagnantCount / Math.max(derived.total, 1)) * 20 +
    (Math.min(data.totalRevisions || 0, 5) / 5) * 20
  ));
  const riskLabel = riskScore >= 60 ? 'ALTO' : riskScore >= 35 ? 'MEDIO' : 'BAJO';
  const riskColor = riskScore >= 60 ? '#ef4444' : riskScore >= 35 ? '#C77700' : '#2E7D32';
  const riskBg = riskScore >= 60 ? '#fee2e2' : riskScore >= 35 ? '#fef3c7' : '#dcfce7';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Risk summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px' }}>
        <Card style={{ backgroundColor: riskBg, textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: riskColor, textTransform: 'uppercase', marginBottom: '8px' }}>Índice de Riesgo 8D</div>
          <div style={{ fontSize: '52px', fontWeight: '900', color: riskColor }}>{riskScore}</div>
          <div style={{ padding: '4px 16px', borderRadius: '20px', backgroundColor: riskColor, color: 'white', fontWeight: '700', fontSize: '14px', display: 'inline-block', marginTop: '4px' }}>{riskLabel}</div>
          <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '8px' }}>Vencidos + Alta Sev. sin D4 + Estancados + Revertidos</div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <KpiTile label="Vencidos" value={derived.overdueCount} color={derived.overdueCount > 0 ? '#ef4444' : '#2E7D32'} icon="⏰" alert={derived.overdueCount > 0} sub="Fecha objetivo pasada, no cerrados" />
          <KpiTile label="Alta Sev. sin D4" value={derived.highSevWithoutD4} color={derived.highSevWithoutD4 > 0 ? '#ef4444' : '#2E7D32'} icon="🚨" alert={derived.highSevWithoutD4 > 0} />
          <KpiTile label="Estancados >90 días" value={derived.stagnantCount} color={derived.stagnantCount > 0 ? '#C77700' : '#2E7D32'} icon="🐌" alert={derived.stagnantCount > 3} />
          <KpiTile label="Veces Regresado a Draft" value={data.totalRevisions || 0} color={(data.totalRevisions || 0) > 0 ? '#C77700' : '#2E7D32'} icon="↩️" sub={`${data.revertedFamilies || 0} reporte(s) · R1/R2/R3...`} />
        </div>
      </div>

      {/* Alert lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <AlertList title="Reportes Vencidos" icon="⏰" items={derived.overdueList} emptyMsg="Sin reportes vencidos" color="#ef4444"
          renderItem={r => <ReportRow key={r.id} r={r} color="#ef4444" badge={`${r.daysOpen}d`} />} />
        <AlertList title="Alta Severidad Sin D4" icon="🚨" items={derived.highSevWithoutD4List} emptyMsg="Todos los High tienen D4 definido" color="#ef4444"
          renderItem={r => <ReportRow key={r.id} r={r} color="#ef4444" badge={r.currentStep} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <AlertList title="Estancados >90 Días" icon="🐌" items={derived.stagnantList} emptyMsg="Sin reportes estancados" color="#C77700"
          renderItem={r => <ReportRow key={r.id} r={r} color="#C77700" badge={`${r.daysOpen}d`} />} />
        <Card>
          <SectionTitle icon="↩️" label="Regresados a Draft" sub={`${data.revertedFamilies || 0} reporte(s) · ${data.totalRevisions || 0} veces revertidos en total`} />
          {(data.totalRevisions || 0) === 0 ? (
            <div style={{ color: '#2E7D32', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>✅ Sin reportes revertidos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                <strong>{data.revertedFamilies}</strong> reporte(s) fueron regresados a borrador un total de <strong>{data.totalRevisions}</strong> veces (R1, R2, R3...).
                Esto indica problemas en el proceso de aprobación o calidad del análisis.
              </div>
              {/* List reverted from recent8Ds */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                {derived.all.filter(r => r.reportId?.includes('-R')).map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '11px' }}>
                    <span style={{ fontWeight: '700', color: '#C77700' }}>{r.reportId}</span>
                    <span style={{ color: t.textMuted }}>{r.currentStep}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ─── Reports Table ────────────────────────────────────────────────────────────
const ReportsTable = ({ reports, allReports, navigate, t, COLORS }) => {
  const [search, setSearch] = useState('');
  const [fSev, setFSev] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fStep, setFStep] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [fSupplier, setFSupplier] = useState('all');

  const departments = useMemo(() => [...new Set(allReports.map(r => r.createdByDepartment).filter(Boolean))].sort(), [allReports]);
  const suppliers = useMemo(() => [...new Set(allReports.map(r => r.supplierName).filter(Boolean))].sort(), [allReports]);

  const filtered = useMemo(() => allReports.filter(r => {
    const s = search.toLowerCase();
    return (
      (!s || r.title?.toLowerCase().includes(s) || r.reportId?.toLowerCase().includes(s) || r.supplierName?.toLowerCase().includes(s)) &&
      (fSev === 'all' || r.severity === fSev) &&
      (fStatus === 'all' || r.status === fStatus) &&
      (fStep === 'all' || r.currentStep === fStep) &&
      (fDept === 'all' || r.createdByDepartment === fDept) &&
      (fSupplier === 'all' || r.supplierName === fSupplier)
    );
  }), [allReports, search, fSev, fStatus, fStep, fDept, fSupplier]);

  const inputStyle = { padding: '7px 11px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text };
  const hasFilters = search || fSev !== 'all' || fStatus !== 'all' || fStep !== 'all' || fDept !== 'all' || fSupplier !== 'all';

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: t.text }}>📋 Listado de Reportes 8D</span>
            <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>{filtered.length} de {allReports.length}</span>
          </div>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFSev('all'); setFStatus('all'); setFStep('all'); setFDept('all'); setFSupplier('all'); }}
              style={{ fontSize: '12px', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input placeholder="Buscar ID, título, proveedor..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputStyle, width: '240px' }} />
          <select value={fSev} onChange={e=>setFSev(e.target.value)} style={inputStyle}>
            <option value="all">Severidad</option>
            <option value="High">Alta</option><option value="Medium">Media</option><option value="Low">Baja</option>
          </select>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={inputStyle}>
            <option value="all">Estado</option>
            <option value="Open">Abierto</option><option value="In Progress">En Progreso</option><option value="Closed">Cerrado</option>
          </select>
          <select value={fStep} onChange={e=>setFStep(e.target.value)} style={inputStyle}>
            <option value="all">Fase</option>
            {['D1','D2','D3','D3-MFG','D4','D5','D6','D7','D8'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fDept} onChange={e=>setFDept(e.target.value)} style={inputStyle}>
            <option value="all">Departamento</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fSupplier} onChange={e=>setFSupplier(e.target.value)} style={{ ...inputStyle, maxWidth: '160px' }}>
            <option value="all">Proveedor</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ backgroundColor: t.bgPanel }}>
              {['ID', 'Título', 'Proveedor', 'Severidad', 'Estado', 'Fase', 'Días', 'Avance', 'Vence', 'Costo'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '10px', color: t.textMuted, borderBottom: `2px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: t.textMuted }}>Sin resultados</td></tr>
            ) : filtered.map((r, i) => {
              const isOverdue = r.targetClosureDate && r.targetClosureDate < TODAY && r.status !== 'Closed';
              return (
                <tr key={r.id || i}
                  onClick={() => navigate(`/8d-workflow?reportId=${r.id}`)}
                  style={{ cursor: 'pointer', backgroundColor: isOverdue ? '#fee2e210' : i % 2 === 0 ? 'transparent' : t.bgPanel }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.bgPanel}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isOverdue ? '#fee2e210' : i % 2 === 0 ? 'transparent' : t.bgPanel}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'monospace', color: t.accent, fontWeight: '600', fontSize: '11px' }}>{r.reportId}</span>
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: '180px' }}>
                    <span style={{ color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={r.title}>{r.title}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: t.textMuted, whiteSpace: 'nowrap' }}>{r.supplierName || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: r.severity === 'High' ? '#fee2e2' : r.severity === 'Medium' ? '#fef3c7' : '#dcfce7',
                      color: sevColor(r.severity) }}>
                      {r.severity === 'High' ? 'Alta' : r.severity === 'Medium' ? 'Media' : r.severity === 'Low' ? 'Baja' : r.severity}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: statusColor(r.status, t), fontWeight: '500', fontSize: '11px' }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: STEP_COLORS[r.currentStep] || '#6b7280', color: 'white', fontSize: '11px', fontWeight: '700' }}>
                      {r.currentStep}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: (r.daysOpen || 0) > 90 ? '#ef4444' : (r.daysOpen || 0) > 60 ? '#C77700' : '#2E7D32', fontWeight: '600' }}>
                      {r.daysOpen || 0}d
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '40px', height: '5px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.progressPercentage || 0}%`, backgroundColor: (r.progressPercentage||0) > 60 ? '#2E7D32' : (r.progressPercentage||0) > 30 ? '#C77700' : '#ef4444', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: t.textMuted }}>{r.progressPercentage || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    {r.targetClosureDate ? (
                      <span style={{ color: isOverdue ? '#ef4444' : t.textMuted, fontWeight: isOverdue ? '700' : '400', fontSize: '11px' }}>
                        {isOverdue ? '⚠ ' : ''}{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}
                      </span>
                    ) : <span style={{ color: t.textMuted }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: '#2E7D32', fontWeight: '600', fontSize: '11px' }}>{formatCurrency(parseFloat(r.estimatedCost) || 0)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.border}`, backgroundColor: t.bgPanel, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textMuted }}>
        <span>Mostrando {filtered.length} de {allReports.length} reportes</span>
        <span>Costo filtrado: <strong style={{ color: '#2E7D32' }}>{formatCurrency(filtered.reduce((s,r) => s + (parseFloat(r.estimatedCost) || 0), 0))}</strong></span>
      </div>
    </div>
  );
};

// ─── Main EightDDashboard ────────────────────────────────────────────────────
// ─── Mi Dashboard: catálogo + renderer (8D) ──────────────────────────────────
const EIGHTD_CATALOG = [
  // KPIs
  { id: 'kpi-total',      cat: 'KPIs', label: 'Total 8Ds',             size: 'sm', icon: '📋' },
  { id: 'kpi-activos',    cat: 'KPIs', label: 'Activos',               size: 'sm', icon: '🔄' },
  { id: 'kpi-cerrados',   cat: 'KPIs', label: 'Cerrados',              size: 'sm', icon: '✅' },
  { id: 'kpi-alta-sev',   cat: 'KPIs', label: 'Alta Severidad',        size: 'sm', icon: '🔴' },
  { id: 'kpi-sla',        cat: 'KPIs', label: 'SLA D4 %',             size: 'sm', icon: '📋' },
  { id: 'kpi-vencidos',   cat: 'KPIs', label: 'Vencidos',             size: 'sm', icon: '⏰' },
  { id: 'kpi-sin-d4',     cat: 'KPIs', label: 'Sin Causa Raíz (D4)',  size: 'sm', icon: '❓' },
  { id: 'kpi-draft',      cat: 'KPIs', label: 'Regresados a Draft',   size: 'sm', icon: '↩️' },
  { id: 'kpi-costo',      cat: 'KPIs', label: 'Costo Total',          size: 'sm', icon: '💸' },
  { id: 'kpi-vencen7',    cat: 'KPIs', label: 'Por Vencer 7 días',    size: 'sm', icon: '🔔' },
  { id: 'kpi-estancados', cat: 'KPIs', label: 'Estancados >90d',      size: 'sm', icon: '🐌' },
  { id: 'kpi-avance',     cat: 'KPIs', label: 'Avance Promedio',      size: 'sm', icon: '📈' },
  // Gráficas
  { id: 'chart-trend',    cat: 'Gráficas', label: 'Tendencia mensual',      size: 'lg', icon: '📈' },
  { id: 'chart-steps',    cat: 'Gráficas', label: 'Distribución por Fase',  size: 'lg', icon: '📊' },
  { id: 'chart-sla',      cat: 'Gráficas', label: 'Gauge SLA D4',           size: 'md', icon: '🎯' },
  { id: 'chart-days-dept',cat: 'Gráficas', label: 'Días prom. por depto.',  size: 'lg', icon: '🏢' },
  { id: 'chart-cost-dept',cat: 'Gráficas', label: 'Costo por Departamento', size: 'lg', icon: '💰' },
  { id: 'chart-cost-sup', cat: 'Gráficas', label: 'Costo por Proveedor',    size: 'lg', icon: '🏭' },
  { id: 'chart-progress', cat: 'Gráficas', label: 'Distribución de Avance', size: 'lg', icon: '📊' },
  { id: 'chart-pareto',   cat: 'Gráficas', label: 'Pareto por Departamento',size: 'lg', icon: '📉' },
  // Riesgo
  { id: 'risk-score',     cat: 'Riesgo', label: 'Índice de Riesgo',     size: 'md', icon: '🚨' },
  { id: 'risk-vencidos',  cat: 'Riesgo', label: 'Lista Vencidos',       size: 'lg', icon: '⏰' },
  { id: 'risk-alta-d4',   cat: 'Riesgo', label: 'Alta Sev. Sin D4',    size: 'lg', icon: '🔴' },
  { id: 'risk-estancados',cat: 'Riesgo', label: 'Lista Estancados',     size: 'lg', icon: '🐌' },
  // Calidad
  { id: 'qual-root-causes',cat: 'Calidad', label: 'Top Causas Raíz',   size: 'lg', icon: '🔎' },
  { id: 'vencen-7-list',  cat: 'Calidad', label: 'Lista Por Vencer 7d',size: 'lg', icon: '🔔' },
];

const EIGHTD_DEFAULT = [
  'kpi-total', 'kpi-activos', 'kpi-vencidos', 'kpi-sla',
  'chart-trend', 'chart-steps', 'risk-score', 'qual-root-causes',
];

const render8DWidget = (id, { data, derived }, t) => {
  const t_ref = {}; // we use useTheme inside sub-components already
  const closedPct  = data.total8Ds > 0 ? Math.round((data.closed8Ds  / data.total8Ds) * 100) : 0;
  const overduePct = derived.total  > 0 ? Math.round((derived.overdueCount / derived.total) * 100) : 0;
  const withoutD4Pct = derived.total > 0 ? Math.round((derived.withoutD4  / derived.total) * 100) : 0;
  const avgProg = derived.total > 0
    ? Math.round(derived.all.reduce((s, r) => s + (r.progressPercentage || 0), 0) / derived.total) : 0;

  // ── KPIs ──
  if (id === 'kpi-total')      return <KpiTile label="Total 8Ds"            value={data.total8Ds || 0}    color={t.text} icon="📋" />;
  if (id === 'kpi-activos')    return <KpiTile label="Activos"               value={data.active8Ds || 0}   color={t.accent} icon="🔄" />;
  if (id === 'kpi-cerrados')   return <KpiTile label="Cerrados"              value={data.closed8Ds || 0}   color="#2E7D32" icon="✅" sub={`${closedPct}% del total`} />;
  if (id === 'kpi-alta-sev')   return <KpiTile label="Alta Severidad"        value={data.highSeverity || 0} color={data.highSeverity > 10 ? '#ef4444' : '#C77700'} icon="🔴" />;
  if (id === 'kpi-sla')        return <KpiTile label="SLA D4"                value={`${data.slaCompliance || 0}%`} color={data.slaCompliance >= 80 ? '#2E7D32' : data.slaCompliance >= 50 ? '#C77700' : '#ef4444'} icon="📋" />;
  if (id === 'kpi-vencidos')   return <KpiTile label="Vencidos"              value={derived.overdueCount}  color={derived.overdueCount > 0 ? '#ef4444' : '#2E7D32'} icon="⏰" alert={derived.overdueCount > 0} sub={`${overduePct}%`} />;
  if (id === 'kpi-sin-d4')     return <KpiTile label="Sin Causa Raíz (D4)"   value={derived.withoutD4}     color={derived.withoutD4 > 5 ? '#ef4444' : '#C77700'} icon="❓" sub={`${withoutD4Pct}%`} />;
  if (id === 'kpi-draft')      return <KpiTile label="Regresados a Draft"    value={data.totalRevisions || 0} color={(data.totalRevisions||0) > 0 ? '#C77700' : '#2E7D32'} icon="↩️" sub={`${data.revertedFamilies || 0} reporte(s)`} />;
  if (id === 'kpi-costo')      return <KpiTile label="Costo Total"           value={formatCurrency(data.totalEstimatedCost || 0)} color="#8b5cf6" icon="💸" />;
  if (id === 'kpi-vencen7')    return <KpiTile label="Por Vencer 7 días"     value={derived.dueSoon7}      color={derived.dueSoon7 > 0 ? '#C77700' : '#2E7D32'} icon="🔔" />;
  if (id === 'kpi-estancados') return <KpiTile label="Estancados >90 días"   value={derived.stagnantCount} color={derived.stagnantCount > 0 ? '#C77700' : '#2E7D32'} icon="🐌" />;
  if (id === 'kpi-avance')     return <KpiTile label="Avance Promedio"       value={`${avgProg}%`}         color={avgProg >= 60 ? '#2E7D32' : avgProg >= 30 ? '#C77700' : '#ef4444'} icon="📈" />;

  // ── Charts — reusan los mismos componentes de los tabs ──
  const tStyle = {}; // useTheme hooks inside sub-components handle colors

  if (id === 'chart-trend') {
    const monthly = (() => {
      const map = {};
      (data.monthlyTrend||[]).forEach(m => { map[m.month] = { month: m.month, creados: m.count }; });
      (data.throughputByMonth||[]).forEach(m => { if (map[m.month]) map[m.month].cerrados = m.count; else map[m.month] = { month: m.month, creados: 0, cerrados: m.count }; });
      return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
    })();
    return (
      <MiniChartWrapper title="📈 Tendencia Mensual">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" fontSize={9} />
            <YAxis fontSize={9} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="creados"  name="Creados"  fill={t.accent} opacity={0.7} />
            <Bar dataKey="cerrados" name="Cerrados" fill="#2E7D32" />
          </ComposedChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-steps') {
    const steps = {};
    derived.all.forEach(r => { const s = r.currentStep || 'D1'; steps[s] = (steps[s]||0)+1; });
    const order = ['D1','D2','D3','D3-MFG','D4','D5','D6','D7','D8'];
    const stepData = order.map(s => ({ step: s, count: steps[s]||0, color: STEP_COLORS[s] })).filter(s => s.count > 0);
    return (
      <MiniChartWrapper title="📊 Distribución por Fase">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stepData} layout="vertical" margin={{ left: 5, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" fontSize={9} />
            <YAxis type="category" dataKey="step" fontSize={10} width={55} />
            <Tooltip />
            <Bar dataKey="count" radius={[0,4,4,0]} label={{ position:'right', fontSize:10 }}>
              {stepData.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-sla') {
    const slaColor = data.slaCompliance >= 80 ? '#2E7D32' : data.slaCompliance >= 50 ? '#C77700' : '#ef4444';
    const slaBg    = data.slaCompliance >= 80 ? '#dcfce7' : data.slaCompliance >= 50 ? '#fef3c7' : '#fee2e2';
    return (
      <MiniChartWrapper title="🎯 SLA D4 Compliance">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', borderRadius: '50%', border: `8px solid ${slaColor}`, backgroundColor: slaBg }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: slaColor }}>{data.slaCompliance}%</div>
              <div style={{ fontSize: '9px', color: t.textMuted }}>SLA D4</div>
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: t.textMuted }}>
            {data.slaCompliance >= 80 ? '✅ Satisfactorio' : data.slaCompliance >= 50 ? '⚠️ Por debajo' : '🔴 Crítico'}
          </div>
        </div>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-days-dept') {
    const daysData = (data.avgDaysByDepartment||[]).map(d => ({
      ...d, avgDays: parseFloat(d.avgDays),
      color: parseFloat(d.avgDays) > 90 ? '#ef4444' : parseFloat(d.avgDays) > 60 ? '#C77700' : '#2E7D32'
    }));
    return (
      <MiniChartWrapper title="🏢 Días Prom. por Departamento">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daysData} layout="vertical" margin={{ left: 5, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" unit="d" fontSize={9} />
            <YAxis type="category" dataKey="department" fontSize={9} width={90} />
            <Tooltip formatter={v=>[`${v} días`]} />
            <Bar dataKey="avgDays" radius={[0,4,4,0]} label={{ position:'right', fontSize:9, formatter: v=>`${v}d` }}>
              {daysData.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-cost-dept') {
    const deptData = (data.costByDepartment||[]).slice(0,8);
    const maxC = Math.max(...deptData.map(d=>d.cost), 1);
    return (
      <MiniChartWrapper title="💰 Costo por Departamento">
        {deptData.map(d => (
          <div key={d.department} style={{ marginBottom: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>{d.department}</span>
              <span style={{ fontWeight: '700', color: t.accent }}>{formatCurrency(d.cost)}</span>
            </div>
            <div style={{ height: '5px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(d.cost/maxC)*100}%`, backgroundColor: t.accent, borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-cost-sup') {
    const supData = (data.topSuppliers||[]).filter(s=>s.supplier&&s.supplier!=='N/A').sort((a,b)=>b.cost-a.cost).slice(0,8);
    const maxS = Math.max(...supData.map(s=>s.cost), 1);
    return (
      <MiniChartWrapper title="🏭 Costo por Proveedor">
        {supData.map((s,i) => (
          <div key={s.supplier} style={{ marginBottom: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.supplier}</span>
              <span style={{ fontWeight: '700', color: i<2?'#ef4444':'#8b5cf6' }}>{formatCurrency(s.cost)}</span>
            </div>
            <div style={{ height: '5px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.cost/maxS)*100}%`, backgroundColor: i<2?'#ef4444':'#8b5cf6', borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-progress') {
    const buckets = [
      { label: '0-25%',   count: derived.all.filter(r=>(r.progressPercentage||0)<25).length,  color:'#ef4444' },
      { label: '25-50%',  count: derived.all.filter(r=>(r.progressPercentage||0)>=25&&(r.progressPercentage||0)<50).length, color:'#C77700' },
      { label: '50-75%',  count: derived.all.filter(r=>(r.progressPercentage||0)>=50&&(r.progressPercentage||0)<75).length, color:'#0072CE' },
      { label: '75-100%', count: derived.all.filter(r=>(r.progressPercentage||0)>=75).length,  color:'#2E7D32' },
    ];
    return (
      <MiniChartWrapper title="📊 Distribución de Avance">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="label" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={v=>[`${v} reportes`]} />
            <Bar dataKey="count" radius={[4,4,0,0]} label={{ position:'top', fontSize:11, fontWeight:'700' }}>
              {buckets.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-pareto') {
    return (
      <MiniChartWrapper title="📉 Pareto por Departamento">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data.paretoByDepartment||[]}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="department" fontSize={8} angle={-15} textAnchor="end" height={45} />
            <YAxis yAxisId="left"  fontSize={9} />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} fontSize={9} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="count" name="Incidencias" fill={t.accent} radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#ef4444" strokeWidth={2} dot={{ r:3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  // ── Riesgo ──
  if (id === 'risk-score') {
    const rs = Math.min(100, Math.round(
      (derived.overdueCount/Math.max(derived.total,1))*30 +
      (derived.highSevWithoutD4/Math.max(data.highSeverity,1))*30 +
      (derived.stagnantCount/Math.max(derived.total,1))*20 +
      (Math.min(data.totalRevisions||0,5)/5)*20
    ));
    const rl = rs>=60?'ALTO':rs>=35?'MEDIO':'BAJO';
    const rc = rs>=60?'#ef4444':rs>=35?'#C77700':'#2E7D32';
    return (
      <MiniChartWrapper title="🚨 Índice de Riesgo 8D">
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <div style={{ fontSize: '48px', fontWeight: '900', color: rc, lineHeight: 1 }}>{rs}</div>
          <div style={{ marginTop: '6px', marginBottom: '12px' }}>
            <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: '12px', backgroundColor: rc+'22', border:`1px solid ${rc}`, fontSize:'12px', fontWeight:'700', color:rc }}>{rl}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px' }}>
            {[
              { l:'Vencidos',     v:derived.overdueCount,    c:'#ef4444' },
              { l:'Alta+Sin D4',  v:derived.highSevWithoutD4,c:'#ef4444' },
              { l:'Estancados',   v:derived.stagnantCount,   c:'#C77700' },
              { l:'En Draft',     v:data.totalRevisions||0,  c:'#C77700' },
            ].map((k,i)=>(
              <div key={i} style={{ padding:'6px', backgroundColor:t.bgPanel, borderRadius:'6px' }}>
                <div style={{ fontSize:'16px', fontWeight:'800', color:k.c }}>{k.v}</div>
                <div style={{ fontSize:'9px', color:t.textDim }}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>
      </MiniChartWrapper>
    );
  }

  if (id === 'risk-vencidos') {
    return (
      <MiniChartWrapper title={`⏰ Reportes Vencidos (${derived.overdueList.length})`}>
        {derived.overdueList.length===0
          ? <div style={{ color:'#2E7D32', fontSize:'12px', textAlign:'center', padding:'12px' }}>✅ Sin vencidos</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'180px', overflowY:'auto' }}>
              {derived.overdueList.map(r=>(
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', backgroundColor:'#fee2e2', borderRadius:'6px', fontSize:'11px' }}>
                  <span style={{ fontWeight:'700', color:'#ef4444' }}>{r.reportId}</span>
                  <span style={{ color:t.textDim }}>{r.daysOpen}d · {r.createdByDepartment}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  if (id === 'risk-alta-d4') {
    return (
      <MiniChartWrapper title={`🚨 Alta Sev. Sin D4 (${derived.highSevWithoutD4List.length})`}>
        {derived.highSevWithoutD4List.length===0
          ? <div style={{ color:'#2E7D32', fontSize:'12px', textAlign:'center', padding:'12px' }}>✅ Todos tienen D4</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'180px', overflowY:'auto' }}>
              {derived.highSevWithoutD4List.map(r=>(
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', backgroundColor:'#fee2e2', borderRadius:'6px', fontSize:'11px' }}>
                  <span style={{ fontWeight:'700', color:'#ef4444' }}>{r.reportId}</span>
                  <span style={{ color:t.textDim }}>{r.currentStep} · {r.createdByDepartment}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  if (id === 'risk-estancados') {
    return (
      <MiniChartWrapper title={`🐌 Estancados >90d (${derived.stagnantList.length})`}>
        {derived.stagnantList.length===0
          ? <div style={{ color:'#2E7D32', fontSize:'12px', textAlign:'center', padding:'12px' }}>✅ Sin estancados</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'180px', overflowY:'auto' }}>
              {derived.stagnantList.map(r=>(
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', backgroundColor:'#fef3c7', borderRadius:'6px', fontSize:'11px' }}>
                  <span style={{ fontWeight:'700', color:'#C77700' }}>{r.reportId}</span>
                  <span style={{ color:t.textDim }}>{r.daysOpen}d abierto</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  // ── Calidad ──
  if (id === 'qual-root-causes') {
    return (
      <MiniChartWrapper title="🔎 Top Causas Raíz (D4)">
        <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
          {(data.topRootCauses||[]).slice(0,8).map((rc,i)=>{
            const maxRc = data.topRootCauses?.[0]?.count||1;
            return (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                  <span style={{ fontSize:'11px', maxWidth:'80%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i+1}. {rc.cause}</span>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:'#8b5cf6' }}>{rc.count}</span>
                </div>
                <div style={{ height:'4px', backgroundColor:t.border, borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(rc.count/maxRc)*100}%`, backgroundColor:'#8b5cf6', borderRadius:'2px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </MiniChartWrapper>
    );
  }

  if (id === 'vencen-7-list') {
    return (
      <MiniChartWrapper title={`🔔 Por Vencer en 7 Días (${derived.dueSoon7List.length})`}>
        {derived.dueSoon7List.length===0
          ? <div style={{ color:'#2E7D32', fontSize:'12px', textAlign:'center', padding:'12px' }}>✅ Sin vencimientos próximos</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'180px', overflowY:'auto' }}>
              {derived.dueSoon7List.map(r=>(
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', backgroundColor:'#fef3c7', borderRadius:'6px', fontSize:'11px' }}>
                  <span style={{ fontWeight:'700', color:'#92400e' }}>{r.reportId}</span>
                  <span style={{ color:t.textDim }}>{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  return null;
};

// Wrapper ligero para widgets con título — sin useTheme para no romper render8DWidget
const MiniChartWrapper = ({ title, children }) => (
  <div>
    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '10px', color: 'inherit' }}>{title}</div>
    {children}
  </div>
);

const EightDDashboard = ({ data, allReports }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('8d-dashboard-tab') || 'volumen');
  const handleTabChange = (id) => { setActiveTab(id); localStorage.setItem('8d-dashboard-tab', id); };

  // Derived KPIs from allReports
  const derived = useMemo(() => {
    const all = allReports || [];
    const total = all.length;
    const active = all.filter(r => (r.status || '').toLowerCase() !== 'closed');

    const today = new Date();
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);

    const overdueList = active.filter(r => r.targetClosureDate && new Date(r.targetClosureDate) < today);
    const dueSoon7List = active.filter(r => r.targetClosureDate && new Date(r.targetClosureDate) >= today && new Date(r.targetClosureDate) <= in7);
    const dueSoon30List = active.filter(r => r.targetClosureDate && new Date(r.targetClosureDate) >= today && new Date(r.targetClosureDate) <= in30);
    const withoutD4List = active.filter(r => !r.d4RootCause);
    const highSevWithoutD4List = withoutD4List.filter(r => r.severity === 'High');
    const stagnantList = active.filter(r => (r.daysOpen || 0) > 90);

    return {
      all, total,
      overdueCount: overdueList.length,
      overdueList,
      dueSoon7: dueSoon7List.length,
      dueSoon7List,
      dueSoon30: dueSoon30List.length,
      withoutD4: withoutD4List.length,
      highSevWithoutD4: highSevWithoutD4List.length,
      highSevWithoutD4List,
      stagnantCount: stagnantList.length,
      stagnantList
    };
  }, [allReports]);

  const TABS = [
    { id: 'volumen', label: '📈 Volumen & Flujo', component: TabVolumen },
    { id: 'tiempo', label: '⏱️ Tiempo & Cumplimiento', component: TabTiempo },
    { id: 'costos', label: '💰 Impacto Económico', component: TabCostos },
    { id: 'calidad', label: '🔍 Calidad de Análisis', component: TabCalidad },
    { id: 'proveedores', label: '🏭 Proveedores', component: TabProveedores },
    { id: 'operacion', label: '🏢 Operación Interna', component: TabOperacion },
    { id: 'riesgo', label: '🚨 Riesgo & Alertas', component: TabRiesgo },
    { id: 'personalizado', label: '⚙️ Mi Dashboard' },
  ];

  const ActiveTab = TABS.find(tab => tab.id === activeTab)?.component;

  // Top bar KPIs
  const closedPct = data.total8Ds > 0 ? Math.round((data.closed8Ds / data.total8Ds) * 100) : 0;
  const overduePct = derived.total > 0 ? Math.round((derived.overdueCount / derived.total) * 100) : 0;
  const withoutD4Pct = derived.total > 0 ? Math.round((derived.withoutD4 / derived.total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TOP BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '10px' }}>
        <KpiTile label="Total 8Ds" value={data.total8Ds || 0} color={t.text} icon="📋" />
        <KpiTile label="Activos" value={data.active8Ds || 0} color={t.accent} icon="🔄" />
        <KpiTile label="Cerrados" value={data.closed8Ds || 0} color="#2E7D32" icon="✅" sub={`${closedPct}% del total`} />
        <KpiTile label="Alta Severidad" value={data.highSeverity || 0} color={data.highSeverity > 10 ? '#ef4444' : '#C77700'} icon="🔴" alert={data.highSeverity > 10} />
        <KpiTile label="SLA D4" value={`${data.slaCompliance || 0}%`} color={data.slaCompliance >= 80 ? '#2E7D32' : data.slaCompliance >= 50 ? '#C77700' : '#ef4444'} icon="📋" />
        <KpiTile label="% Vencidos" value={`${overduePct}%`} color={derived.overdueCount > 0 ? '#ef4444' : '#2E7D32'} icon="⏰" alert={derived.overdueCount > 0} sub={`${derived.overdueCount} reportes`} />
        <KpiTile label="% Sin D4" value={`${withoutD4Pct}%`} color={derived.withoutD4 > 5 ? '#ef4444' : '#C77700'} icon="❓" sub={`${derived.withoutD4} sin causa raíz`} />
        <KpiTile label="Regresados a Draft" value={data.totalRevisions || 0} color={(data.totalRevisions||0) > 0 ? '#C77700' : '#2E7D32'} icon="↩️" sub={`${data.revertedFamilies || 0} reporte(s) afectados`} />
        <KpiTile label="Costo Total" value={formatCurrency(data.totalEstimatedCost || 0)} color="#8b5cf6" icon="💸" />
      </div>

      {/* TAB NAV */}
      <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500',
              backgroundColor: activeTab === tab.id ? t.accent : t.bgPanel,
              color: activeTab === tab.id ? 'white' : t.text,
              transition: 'all 0.2s'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'personalizado' ? (
        <CustomDashboard
          storageKey="8d-custom-dashboard-v1"
          catalog={EIGHTD_CATALOG}
          defaultWidgets={EIGHTD_DEFAULT}
          renderWidget={(id) => render8DWidget(id, { data, derived }, t)}
          data={{ data, derived }}
        />
      ) : (
        ActiveTab && <ActiveTab data={data} derived={derived} />
      )}

      {/* REPORTS TABLE — siempre visible */}
      <ReportsTable reports={allReports} allReports={allReports} navigate={navigate} t={t} COLORS={{}} />
    </div>
  );
};

export default EightDDashboard;
