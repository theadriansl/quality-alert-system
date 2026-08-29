import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import CustomDashboard from './CustomDashboard';
import {
  SectionTitle, Card, KpiTile, RiskScoreCard, AlertCountChip, HBar
} from './shared/SharedComponents';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const formatCurrency = (v) => {
  if (!v || isNaN(v)) return '$0';
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${parseFloat(v).toFixed(0)}`;
};

// Color helpers - now use theme tokens
const sevColor = (s, t) => s === 'High' ? t.error : s === 'Medium' ? t.warning : t.success;
const statusColor = (s, t) => {
  const l = (s || '').toLowerCase();
  if (l === 'closed') return t.success;
  if (l === 'in progress' || l === 'in_progress') return t.accent;
  return t.textDim;
};

// Step colors - grayscale gradient for early steps, theme colors for advanced
const getStepColor = (step, t) => {
  const early = { D1: t.textMuted, D2: t.textDim, D3: t.textDim, 'D3-MFG': t.text };
  const advanced = { D4: t.accent, D5: t.accent, D6: t.primary, D7: t.warning, D8: t.success };
  return early[step] || advanced[step] || t.textMuted;
};

// ─── Sub-components (now imported from SharedComponents) ──────────────────────

// ─── Tabs ────────────────────────────────────────────────────────────────────

// TAB 0: Resumen Ejecutivo
const TabResumen = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };

  // Risk Score
  const riskScore = Math.min(100, Math.round(
    (derived.overdueCount / Math.max(derived.total, 1)) * 30 +
    (derived.highSevWithoutD4 / Math.max(data.highSeverity, 1)) * 30 +
    (derived.stagnantCount / Math.max(derived.total, 1)) * 20 +
    (Math.min(data.totalRevisions || 0, 5) / 5) * 20
  ));

  // SLA status
  const slaStatus = data.slaCompliance >= 80 ? 'success' : data.slaCompliance >= 50 ? 'warning' : 'error';
  const slaColor = slaStatus === 'success' ? t.success : slaStatus === 'warning' ? t.warning : t.error;
  const slaBg = slaStatus === 'success' ? t.successBg : slaStatus === 'warning' ? t.warningBg : t.errorBg;

  // Monthly trend
  const monthlyWithThroughput = useMemo(() => {
    const map = {};
    (data.monthlyTrend || []).forEach(m => { map[m.month] = { month: m.month, creados: m.count, cost: m.cost }; });
    (data.throughputByMonth || []).forEach(m => { if (map[m.month]) map[m.month].cerrados = m.count; else map[m.month] = { month: m.month, creados: 0, cost: 0, cerrados: m.count }; });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  // Step distribution
  const stepData = useMemo(() => {
    const steps = {};
    derived.all.forEach(r => { const s = r.currentStep || 'D1'; steps[s] = (steps[s] || 0) + 1; });
    const order = ['D1', 'D2', 'D3', 'D3-MFG', 'D4', 'D5', 'D6', 'D7', 'D8'];
    return order.map(s => ({ step: s, count: steps[s] || 0, color: getStepColor(s, t) })).filter(s => s.count > 0);
  }, [derived.all, t]);

  // Cost by severity
  const costSevData = (data.costBySeverity || []).map(s => ({
    name: s.severity || 'N/A',
    cost: s.cost,
    count: s.count,
    color: sevColor(s.severity, t)
  }));

  const total = data.totalEstimatedCost || 0;
  const riskFactors = [
    { label: 'Vencidos', value: derived.overdueCount },
    { label: 'Alta Sev. sin D4', value: derived.highSevWithoutD4 },
    { label: 'Estancados', value: derived.stagnantCount },
    { label: 'En Draft', value: data.totalRevisions || 0 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Risk Score Card + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(4, 1fr)', gap: 10 }}>
        <RiskScoreCard score={riskScore} factors={riskFactors} t={t} />
        <KpiTile label="Por Vencer (7 dias)" value={derived.dueSoon7} alertType={derived.dueSoon7 > 0 ? 'warning' : null} sub="Requieren atencion" t={t} />
        <KpiTile label="Por Vencer (30 dias)" value={derived.dueSoon30} alertType={derived.dueSoon30 > 5 ? 'warning' : null} t={t} />
        <KpiTile label="Throughput Prom." value={data.throughputByMonth?.length ? Math.round(data.throughputByMonth.reduce((s,m)=>s+m.count,0)/data.throughputByMonth.length) : 0} unit="/mes" sub="Cerrados/mes" t={t} />
        <KpiTile label="Costo Prom. por 8D" value={formatCurrency(data.total8Ds > 0 ? total / data.total8Ds : 0)} t={t} />
      </div>

      {/* Row 2: Trend + SLA */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionTitle label="Tendencia Mensual: Creados vs Cerrados" t={t} />
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthlyWithThroughput}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="month" fontSize={10} stroke={t.textMuted} />
              <YAxis yAxisId="left" fontSize={11} stroke={t.textMuted} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="creados" name="Creados" fill={t.accent} radius={[2,2,0,0]} />
              <Bar yAxisId="left" dataKey="cerrados" name="Cerrados" fill={t.success} radius={[2,2,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* SLA Gauge */}
          <Card t={t}>
            <SectionTitle label="SLA D4 Compliance" t={t} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 90, height: 90, borderRadius: '50%',
                border: `6px solid ${slaColor}`,
                backgroundColor: slaBg
              }}>
                <div style={{ fontSize: 22, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", color: slaColor }}>
                  {data.slaCompliance}%
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted }}>
                {slaStatus === 'success' ? 'Satisfactorio' : slaStatus === 'warning' ? 'Por debajo' : 'Critico'}
              </div>
            </div>
          </Card>
          <KpiTile label="Dias Prom. Cierre" value={data.avgDaysToClose || 0} unit="dias" valueColor={parseFloat(data.avgDaysToClose) > 60 ? t.error : undefined} t={t} />
        </div>
      </div>

      {/* Row 3: Step Distribution + Cost by Severity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionTitle label="Distribucion por Fase" t={t} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stepData} layout="vertical" margin={{ left: 5, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={10} stroke={t.textMuted} />
              <YAxis type="category" dataKey="step" fontSize={11} stroke={t.textMuted} width={50} fontWeight={600} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0,2,2,0]} label={{ position: 'right', fontSize: 11, fontWeight: 600, fill: t.text }}>
                {stepData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card t={t}>
          <SectionTitle label="Costo por Severidad" t={t} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={costSevData} cx="50%" cy="50%" outerRadius={60} innerRadius={30} dataKey="cost" paddingAngle={3}>
                  {costSevData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [formatCurrency(v), 'Costo']} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {costSevData.map(s => (
                <div key={s.name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: t.textMuted }}>{formatCurrency(s.cost)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// TAB 1: Volumen & Flujo
const TabVolumen = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };

  const stepData = useMemo(() => {
    const steps = {};
    derived.all.forEach(r => { const s = r.currentStep || 'D1'; steps[s] = (steps[s] || 0) + 1; });
    const order = ['D1', 'D2', 'D3', 'D3-MFG', 'D4', 'D5', 'D6', 'D7', 'D8'];
    return order.map(s => ({ step: s, count: steps[s] || 0, color: getStepColor(s, t) })).filter(s => s.count > 0);
  }, [derived.all, t]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Early vs Advanced */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <KpiTile label="En etapas tempranas (D1-D3)" value={`${earlyPct}%`} alertType={earlyPct > 60 ? 'warning' : null} sub={`${early} reportes`} t={t} />
        <KpiTile label="En etapas avanzadas (D4-D8)" value={`${advPct}%`} sub={`${advanced} reportes`} t={t} />
        <KpiTile label="Throughput (cerrados/mes prom.)" value={data.throughputByMonth?.length ? Math.round(data.throughputByMonth.reduce((s,m)=>s+m.count,0)/data.throughputByMonth.length) : 0} unit="/mes" sub="Ultimos 12 meses" t={t} />
      </div>

      {/* Monthly trend + throughput */}
      <Card t={t}>
        <SectionTitle label="Tendencia Mensual: Creados vs Cerrados" t={t} />
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={monthlyWithThroughput}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" fontSize={10} stroke={t.textMuted} />
            <YAxis yAxisId="left" fontSize={11} stroke={t.textMuted} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} fontSize={10} stroke={t.textMuted} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => n === 'cost' ? [formatCurrency(v), 'Costo'] : [v, n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="creados" name="Creados" fill={t.accent} radius={[2,2,0,0]} />
            <Bar yAxisId="left" dataKey="cerrados" name="Cerrados" fill={t.success} radius={[2,2,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cost" name="cost" stroke={t.warning} strokeWidth={2} dot={{ r: 3, fill: t.warning }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Step distribution */}
      <Card t={t}>
        <SectionTitle label="Distribucion por Fase" t={t} />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stepData} layout="vertical" margin={{ left: 10, right: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" fontSize={11} stroke={t.textMuted} />
            <YAxis type="category" dataKey="step" fontSize={12} stroke={t.textMuted} width={60} fontWeight={600} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0,2,2,0]} label={{ position: 'right', fontSize: 12, fontWeight: 600, fill: t.text }}>
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
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };

  const daysData = (data.avgDaysByDepartment || []).map(d => ({
    ...d, avgDays: parseFloat(d.avgDays),
    color: parseFloat(d.avgDays) > 90 ? t.error : parseFloat(d.avgDays) > 60 ? t.warning : t.success
  }));
  const maxDays = Math.max(...daysData.map(d => d.avgDays), 1);

  const slaStatus = data.slaCompliance >= 80 ? 'success' : data.slaCompliance >= 50 ? 'warning' : 'error';
  const slaColor = slaStatus === 'success' ? t.success : slaStatus === 'warning' ? t.warning : t.error;
  const slaBg = slaStatus === 'success' ? t.successBg : slaStatus === 'warning' ? t.warningBg : t.errorBg;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <KpiTile label="Dias Promedio para Cerrar" value={data.avgDaysToClose} unit="dias" valueColor={parseFloat(data.avgDaysToClose) > 60 ? t.error : undefined} t={t} />
        <KpiTile label="SLA D4 Compliance" value={`${data.slaCompliance}%`} valueColor={slaColor} sub="Tiempo respuesta cliente" t={t} />
        <KpiTile label="Vencidos" value={derived.overdueCount} alertType={derived.overdueCount > 0 ? 'error' : null} sub="Fecha objetivo pasada" t={t} />
        <KpiTile label="Por vencer (7 dias)" value={derived.dueSoon7} alertType={derived.dueSoon7 > 0 ? 'warning' : null} sub="Requieren atencion" t={t} />
        <KpiTile label="Por vencer (30 dias)" value={derived.dueSoon30} alertType={derived.dueSoon30 > 5 ? 'warning' : null} t={t} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Days by dept */}
        <Card t={t}>
          <SectionTitle label="Dias Promedio Abiertos por Departamento" sub="Solo reportes activos" t={t} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daysData} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" domain={[0, maxDays * 1.1]} unit=" d" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="department" fontSize={10} stroke={t.textMuted} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} dias`]} />
              <Bar dataKey="avgDays" radius={[0,2,2,0]} label={{ position: 'right', fontSize: 11, fill: t.textMuted, formatter: v => `${v}d` }}>
                {daysData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* SLA + Due soon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* SLA gauge */}
          <Card t={t}>
            <SectionTitle label="SLA D4 Compliance" t={t} />
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 120, height: 120, borderRadius: '50%',
                border: `8px solid ${slaColor}`,
                backgroundColor: slaBg
              }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", color: slaColor }}>{data.slaCompliance}%</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>SLA D4</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: t.textMuted }}>
                {slaStatus === 'success' ? 'Cumplimiento satisfactorio' : slaStatus === 'warning' ? 'Por debajo del objetivo' : 'Critico - requiere accion'}
              </div>
            </div>
          </Card>

          {/* Due soon list */}
          <Card t={t}>
            <SectionTitle label="Por Vencer en 7 Dias" t={t} />
            {derived.dueSoon7List.length === 0 ? (
              <div style={{ color: t.success, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Sin vencimientos proximos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                {derived.dueSoon7List.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: t.warningBg, borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: t.warningFg }}>{r.reportId}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.textMuted }}>{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}</span>
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

// TAB 3: Impacto Economico
const TabCostos = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };
  const total = data.totalEstimatedCost || 0;
  const avgCost = data.total8Ds > 0 ? total / data.total8Ds : 0;

  const costSevData = (data.costBySeverity || []).map(s => ({
    name: s.severity || 'N/A',
    cost: s.cost,
    count: s.count,
    color: sevColor(s.severity, t)
  }));

  const highSevCost = data.costBySeverity?.find(s => s.severity === 'High')?.cost || 0;
  const highSevPct = total > 0 ? Math.round((highSevCost / total) * 100) : 0;

  const deptData = (data.costByDepartment || []).slice(0, 8);
  const supplierData = (data.topSuppliers || []).filter(s => s.supplier !== 'N/A').slice(0, 8);
  const maxDeptCost = Math.max(...deptData.map(d => d.cost), 1);
  const maxSupCost = Math.max(...supplierData.map(s => s.cost), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile label="Costo Total Estimado" value={formatCurrency(total)} t={t} />
        <KpiTile label="Costo Promedio por 8D" value={formatCurrency(avgCost)} t={t} />
        <KpiTile label="% Costo en Alta Severidad" value={`${highSevPct}%`} alertType={highSevPct > 50 ? 'error' : null} sub={formatCurrency(highSevCost)} t={t} />
        <KpiTile label="Maximo por Proveedor" value={formatCurrency(Math.max(...supplierData.map(s=>s.cost), 0))} sub={supplierData.sort((a,b)=>b.cost-a.cost)[0]?.supplier} t={t} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cost by dept */}
        <Card t={t}>
          <SectionTitle label="Costo por Departamento" t={t} />
          <div style={{ padding: '4px 0' }}>
            {deptData.map(d => (
              <HBar key={d.department} label={d.department} value={d.cost} max={maxDeptCost} color={t.accent} fmt={formatCurrency} t={t} />
            ))}
          </div>
        </Card>

        {/* Cost by supplier */}
        <Card t={t}>
          <SectionTitle label="Costo por Proveedor" t={t} />
          <div style={{ padding: '4px 0' }}>
            {supplierData.sort((a,b)=>b.cost-a.cost).map(s => (
              <HBar key={s.supplier} label={s.supplier} value={s.cost} max={maxSupCost} color={t.primary} fmt={formatCurrency} t={t} />
            ))}
          </div>
        </Card>
      </div>

      {/* Cost by severity pie */}
      <Card t={t}>
        <SectionTitle label="Distribucion de Costo por Severidad" t={t} />
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <ResponsiveContainer width="40%" height={200}>
            <PieChart>
              <Pie data={costSevData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="cost" paddingAngle={3}>
                {costSevData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={v => [formatCurrency(v), 'Costo']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {costSevData.map(s => (
              <div key={s.name} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.name}</div>
                  <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: t.textMuted }}>{formatCurrency(s.cost)} · {s.count} reportes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

// TAB 4: Calidad de Analisis
const TabCalidad = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };

  const withD4 = derived.total - derived.withoutD4;
  const withD4Pct = derived.total > 0 ? Math.round((withD4 / derived.total) * 100) : 0;
  const highSevWithoutD4Pct = data.highSeverity > 0 ? Math.round((derived.highSevWithoutD4 / data.highSeverity) * 100) : 0;

  const progressBuckets = [
    { label: '0-25%', count: derived.all.filter(r => (r.progressPercentage || 0) < 25).length, color: t.error },
    { label: '25-50%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 25 && (r.progressPercentage || 0) < 50).length, color: t.warning },
    { label: '50-75%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 50 && (r.progressPercentage || 0) < 75).length, color: t.accent },
    { label: '75-100%', count: derived.all.filter(r => (r.progressPercentage || 0) >= 75).length, color: t.success }
  ];
  const avgProgress = derived.total > 0
    ? Math.round(derived.all.reduce((s, r) => s + (r.progressPercentage || 0), 0) / derived.total)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile label="% Con Causa Raiz (D4)" value={`${withD4Pct}%`} valueColor={withD4Pct < 50 ? t.error : withD4Pct < 80 ? t.warning : undefined} sub={`${withD4} de ${derived.total} reportes`} t={t} />
        <KpiTile label="Sin Causa Raiz" value={derived.withoutD4} alertType={derived.withoutD4 > 5 ? 'error' : derived.withoutD4 > 0 ? 'warning' : null} sub="Activos sin D4 definido" t={t} />
        <KpiTile label="Alta Sev. SIN D4" value={derived.highSevWithoutD4} alertType={derived.highSevWithoutD4 > 0 ? 'error' : null} sub={`${highSevWithoutD4Pct}% de los High`} t={t} />
        <KpiTile label="Avance Promedio" value={`${avgProgress}%`} t={t} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Progress distribution */}
        <Card t={t}>
          <SectionTitle label="Distribucion de Avance" t={t} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="label" fontSize={12} stroke={t.textMuted} />
              <YAxis fontSize={11} stroke={t.textMuted} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} reportes`]} />
              <Bar dataKey="count" radius={[2,2,0,0]} label={{ position: 'top', fontSize: 13, fontWeight: 600, fill: t.text }}>
                {progressBuckets.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top root causes */}
        <Card t={t}>
          <SectionTitle label="Top Causas Raiz (D4)" t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.topRootCauses || []).slice(0, 8).map((rc, i) => {
              const maxRc = data.topRootCauses?.[0]?.count || 1;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: t.text, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rc.cause}>
                      {i + 1}. {rc.cause}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.primary }}>{rc.count}</span>
                  </div>
                  <div style={{ height: 5, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(rc.count / maxRc) * 100}%`, backgroundColor: t.primary, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Alert: High severity without D4 */}
      {derived.highSevWithoutD4 > 0 && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 18px', backgroundColor: t.errorBg, borderRadius: 8, border: `1px solid ${t.errorBorder}` }}>
          <div style={{ width: 5, backgroundColor: t.error, borderRadius: 3, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: t.errorFg, fontSize: 14 }}>
              {derived.highSevWithoutD4} reporte(s) de Alta Severidad sin Causa Raiz definida
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
              Estos reportes representan alto riesgo operativo. Es prioritario completar el analisis D4 (5 Por Ques / Ishikawa).
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
  const top2Pct = data.insights?.top2SuppliersPct || 0;
  const top2Names = data.insights?.top2SuppliersNames || '';
  const avgCostPerSup = suppliers.map(s => ({ ...s, avgCost: s.count > 0 ? s.cost / s.count : 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <KpiTile label="Total Proveedores" value={suppliers.length} t={t} />
        <KpiTile label="Concentracion Top 2" value={`${top2Pct}%`} alertType={top2Pct > 40 ? 'error' : 'warning'} sub={top2Names} t={t} />
        <KpiTile label="Mayor Costo" value={formatCurrency(Math.max(...suppliers.map(s=>s.cost), 0))} sub={suppliers.sort((a,b)=>b.cost-a.cost)[0]?.supplier} t={t} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top by incidents */}
        <Card t={t}>
          <SectionTitle label="Top Proveedores por Incidencias" t={t} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={suppliers.slice(0,8)} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="supplier" fontSize={10} stroke={t.textMuted} width={120} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={t.warning} radius={[0,2,2,0]} label={{ position: 'right', fontSize: 11, fill: t.textMuted }}>
                {suppliers.slice(0,8).map((e,i) => (
                  <Cell key={i} fill={i < 2 ? t.error : i < 4 ? t.warning : t.textMuted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top by cost */}
        <Card t={t}>
          <SectionTitle label="Top Proveedores por Costo Total" t={t} />
          <div style={{ padding: '4px 0' }}>
            {suppliers.sort((a,b)=>b.cost-a.cost).slice(0,8).map((s, i) => (
              <div key={s.supplier} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{i+1}. {s.supplier}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: i < 2 ? t.error : t.accent }}>{formatCurrency(s.cost)}</span>
                    <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 6 }}>{s.count} 8Ds</span>
                  </div>
                </div>
                <div style={{ height: 5, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.cost/Math.max(...suppliers.map(x=>x.cost),1))*100}%`, backgroundColor: i < 2 ? t.error : t.accent, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Avg cost per incident by supplier */}
      <Card t={t}>
        <SectionTitle label="Costo Promedio por Incidente por Proveedor" sub="Indica el impacto economico tipico de cada proveedor" t={t} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {avgCostPerSup.sort((a,b)=>b.avgCost-a.avgCost).slice(0,8).map(s => (
            <div key={s.supplier} style={{ padding: '10px 14px', backgroundColor: t.bgPanel, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.supplier}>{s.supplier}</div>
              <div style={{ fontSize: 18, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", color: s.avgCost > 500000 ? t.error : t.text }}>{formatCurrency(s.avgCost)}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>prom/incidente · {s.count} 8Ds</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// TAB 6: Operacion Interna
const TabOperacion = ({ data, derived }) => {
  const { theme: t } = useTheme();
  const tooltipStyle = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text };

  const stepCols = ['D1','D2','D3','D3-MFG','D4','D5','D6','D7'];

  const deptData = (data.avgDaysByDepartment || []).map(dept => {
    const progressInfo = (data.avgProgressByDept || []).find(d => d.department === dept.department);
    return { ...dept, avgProgress: progressInfo?.avgProgress || 0 };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pareto */}
      <Card t={t}>
        <SectionTitle label="Pareto por Departamento" sub="Principio 80/20: que departamentos concentran el mayor volumen de 8Ds" t={t} />
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data.paretoByDepartment || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="department" fontSize={10} stroke={t.textMuted} angle={-15} textAnchor="end" height={50} />
            <YAxis yAxisId="left" fontSize={11} stroke={t.textMuted} />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} fontSize={11} stroke={t.textMuted} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="left" dataKey="count" name="Incidencias" fill={t.accent} radius={[2,2,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="% Acumulado" stroke={t.error} strokeWidth={2} dot={{ r: 4, fill: t.error }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Dept summary table */}
        <Card t={t}>
          <SectionTitle label="Resumen por Departamento" t={t} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel, height: 30 }}>
                  {['DEPARTAMENTO', '# 8DS', 'DIAS PROM.', 'AVANCE PROM.'].map(h => (
                    <th key={h} style={{ padding: '0 10px', textAlign: 'left', fontWeight: 600, fontSize: 10.5, color: t.textDim, borderBottom: `1px solid ${t.line}`, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptData.map((d, i) => (
                  <tr key={d.department} style={{ height: 44, borderBottom: `1px solid ${t.line}` }}>
                    <td style={{ padding: '0 10px', color: t.text, fontWeight: 500 }}>{d.department}</td>
                    <td style={{ padding: '0 10px', color: t.text, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>{d.count}</td>
                    <td style={{ padding: '0 10px', textAlign: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: parseFloat(d.avgDays) > 90 ? t.error : parseFloat(d.avgDays) > 60 ? t.warning : t.success, fontWeight: 600 }}>
                        {d.avgDays}d
                      </span>
                    </td>
                    <td style={{ padding: '0 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.avgProgress}%`, backgroundColor: d.avgProgress > 60 ? t.success : d.avgProgress > 30 ? t.warning : t.error, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.text, minWidth: 32 }}>{d.avgProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Steps by dept stacked */}
        <Card t={t}>
          <SectionTitle label="Fase Actual por Departamento" t={t} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(data.stepsByDepartment || []).slice(0,6)} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="department" fontSize={9} stroke={t.textMuted} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stepCols.map(s => (
                <Bar key={s} dataKey={s} stackId="a" fill={getStepColor(s, t)} name={s} />
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

  const AlertList = ({ title, items, emptyMsg, alertColor, renderItem }) => (
    <Card t={t}>
      <SectionTitle label={title} t={t} />
      {items.length === 0 ? (
        <div style={{ color: t.success, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{emptyMsg}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {items.map(renderItem)}
        </div>
      )}
    </Card>
  );

  const ReportRow = ({ r, alertType, badge }) => {
    const color = alertType === 'error' ? t.error : t.warning;
    const bg = alertType === 'error' ? t.errorBg : t.warningBg;
    const fg = alertType === 'error' ? t.errorFg : t.warningFg;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: bg, borderRadius: 6 }}>
        <div>
          <span style={{ fontWeight: 600, color: fg, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>{r.reportId}</span>
          <span style={{ color: t.textMuted, fontSize: 11, marginLeft: 8 }}>{r.title?.slice(0,45)}{r.title?.length > 45 ? '...' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: color, color: '#fff', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{badge}</span>}
          <span style={{ fontSize: 11, color: t.textMuted }}>{r.createdByDepartment}</span>
        </div>
      </div>
    );
  };

  const riskScore = Math.min(100, Math.round(
    (derived.overdueCount / Math.max(derived.total, 1)) * 30 +
    (derived.highSevWithoutD4 / Math.max(data.highSeverity, 1)) * 30 +
    (derived.stagnantCount / Math.max(derived.total, 1)) * 20 +
    (Math.min(data.totalRevisions || 0, 5) / 5) * 20
  ));

  const riskFactors = [
    { label: 'Vencidos', value: derived.overdueCount },
    { label: 'Alta Sev. sin D4', value: derived.highSevWithoutD4 },
    { label: 'Estancados', value: derived.stagnantCount },
    { label: 'En Draft', value: data.totalRevisions || 0 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Risk summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        <RiskScoreCard score={riskScore} factors={riskFactors} t={t} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <KpiTile label="Vencidos" value={derived.overdueCount} alertType={derived.overdueCount > 0 ? 'error' : null} sub="Fecha objetivo pasada, no cerrados" t={t} />
          <KpiTile label="Alta Sev. sin D4" value={derived.highSevWithoutD4} alertType={derived.highSevWithoutD4 > 0 ? 'error' : null} t={t} />
          <KpiTile label="Estancados >90 dias" value={derived.stagnantCount} alertType={derived.stagnantCount > 3 ? 'warning' : null} t={t} />
          <KpiTile label="Veces Regresado a Draft" value={data.totalRevisions || 0} alertType={(data.totalRevisions || 0) > 0 ? 'warning' : null} sub={`${data.revertedFamilies || 0} reporte(s) - R1/R2/R3...`} t={t} />
        </div>
      </div>

      {/* Alert lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AlertList title="Reportes Vencidos" items={derived.overdueList} emptyMsg="Sin reportes vencidos" alertColor="error"
          renderItem={r => <ReportRow key={r.id} r={r} alertType="error" badge={`${r.daysOpen}d`} />} />
        <AlertList title="Alta Severidad Sin D4" items={derived.highSevWithoutD4List} emptyMsg="Todos los High tienen D4 definido" alertColor="error"
          renderItem={r => <ReportRow key={r.id} r={r} alertType="error" badge={r.currentStep} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AlertList title="Estancados >90 Dias" items={derived.stagnantList} emptyMsg="Sin reportes estancados" alertColor="warning"
          renderItem={r => <ReportRow key={r.id} r={r} alertType="warning" badge={`${r.daysOpen}d`} />} />
        <Card t={t}>
          <SectionTitle label="Regresados a Draft" sub={`${data.revertedFamilies || 0} reporte(s) - ${data.totalRevisions || 0} veces revertidos en total`} t={t} />
          {(data.totalRevisions || 0) === 0 ? (
            <div style={{ color: t.success, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin reportes revertidos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 14px', backgroundColor: t.warningBg, borderRadius: 8, fontSize: 13, color: t.warningFg }}>
                <strong>{data.revertedFamilies}</strong> reporte(s) fueron regresados a borrador un total de <strong>{data.totalRevisions}</strong> veces (R1, R2, R3...).
                Esto indica problemas en el proceso de aprobacion o calidad del analisis.
              </div>
              {/* List reverted */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                {derived.all.filter(r => r.reportId?.includes('-R')).map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: t.warningBg, borderRadius: 6, fontSize: 11 }}>
                    <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.warningFg }}>{r.reportId}</span>
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
const ReportsTable = ({ reports, allReports, navigate, t }) => {
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

  const inputStyle = { padding: '7px 11px', fontSize: 12, border: `1px solid ${t.border}`, borderRadius: 6, backgroundColor: t.bgCard, color: t.text };
  const hasFilters = search || fSev !== 'all' || fStatus !== 'all' || fStep !== 'all' || fDept !== 'all' || fSupplier !== 'all';

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header - 44px */}
      <div style={{ height: 44, padding: '0 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.textDim }}>LISTADO DE REPORTES 8D</span>
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 8 }}>{filtered.length} de {allReports.length}</span>
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFSev('all'); setFStatus('all'); setFStep('all'); setFDept('all'); setFSupplier('all'); }}
            style={{ fontSize: 12, color: t.errorFg, backgroundColor: 'transparent', border: `1px solid ${t.errorBorder}`, borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ padding: '10px 20px', borderBottom: `1px solid ${t.line}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Buscar ID, titulo, proveedor..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputStyle, width: 240 }} />
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
        <select value={fSupplier} onChange={e=>setFSupplier(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="all">Proveedor</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ backgroundColor: t.bgPanel, height: 30 }}>
              {['ID', 'TITULO', 'PROVEEDOR', 'SEVERIDAD', 'ESTADO', 'FASE', 'DIAS', 'AVANCE', 'VENCE', 'COSTO'].map(h => (
                <th key={h} style={{ padding: '0 12px', textAlign: 'left', fontWeight: 600, fontSize: 10.5, color: t.textDim, borderBottom: `1px solid ${t.line}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="10" style={{ padding: 32, textAlign: 'center', color: t.textMuted }}>Sin resultados</td></tr>
            ) : filtered.map((r, i) => {
              const isOverdue = r.targetClosureDate && r.targetClosureDate < TODAY && r.status !== 'Closed';
              return (
                <tr key={r.id || i}
                  onClick={() => navigate(`/8d-workflow?reportId=${r.id}`)}
                  style={{ cursor: 'pointer', height: 44, borderBottom: `1px solid ${t.line}`, backgroundColor: isOverdue ? t.errorBg : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = t.hover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isOverdue ? t.errorBg : 'transparent'}
                >
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.accent, fontWeight: 600, fontSize: 11 }}>{r.reportId}</span>
                  </td>
                  <td style={{ padding: '0 12px', maxWidth: 180 }}>
                    <span style={{ color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={r.title}>{r.title}</span>
                  </td>
                  <td style={{ padding: '0 12px', color: t.textMuted, whiteSpace: 'nowrap' }}>{r.supplierName || '-'}</td>
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      backgroundColor: r.severity === 'High' ? t.errorBg : r.severity === 'Medium' ? t.warningBg : t.successBg,
                      color: sevColor(r.severity, t) }}>
                      {r.severity === 'High' ? 'Alta' : r.severity === 'Medium' ? 'Media' : r.severity === 'Low' ? 'Baja' : r.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ color: statusColor(r.status, t), fontWeight: 500, fontSize: 11 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: getStepColor(r.currentStep, t), color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {r.currentStep}
                    </span>
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: (r.daysOpen || 0) > 90 ? t.error : (r.daysOpen || 0) > 60 ? t.warning : t.success, fontWeight: 600 }}>
                      {r.daysOpen || 0}d
                    </span>
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 40, height: 5, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.progressPercentage || 0}%`, backgroundColor: (r.progressPercentage||0) > 60 ? t.success : (r.progressPercentage||0) > 30 ? t.warning : t.error, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: t.textMuted }}>{r.progressPercentage || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                    {r.targetClosureDate ? (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: isOverdue ? t.error : t.textMuted, fontWeight: isOverdue ? 600 : 400, fontSize: 11 }}>
                        {new Date(r.targetClosureDate).toLocaleDateString('es-MX')}
                      </span>
                    ) : <span style={{ color: t.textMuted }}>-</span>}
                  </td>
                  <td style={{ padding: '0 12px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.text, fontWeight: 600, fontSize: 11 }}>{formatCurrency(parseFloat(r.estimatedCost) || 0)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.line}`, backgroundColor: t.bgPanel, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.textMuted }}>
        <span>Mostrando {filtered.length} de {allReports.length} reportes</span>
        <span>Costo filtrado: <strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.text }}>{formatCurrency(filtered.reduce((s,r) => s + (parseFloat(r.estimatedCost) || 0), 0))}</strong></span>
      </div>
    </div>
  );
};

// ─── Main EightDDashboard ────────────────────────────────────────────────────
// ─── Mi Dashboard: catálogo + renderer (8D) ──────────────────────────────────
const EIGHTD_CATALOG = [
  // KPIs
  { id: 'kpi-total',      cat: 'KPIs', label: 'Total 8Ds',             size: 'sm' },
  { id: 'kpi-activos',    cat: 'KPIs', label: 'Activos',               size: 'sm' },
  { id: 'kpi-cerrados',   cat: 'KPIs', label: 'Cerrados',              size: 'sm' },
  { id: 'kpi-alta-sev',   cat: 'KPIs', label: 'Alta Severidad',        size: 'sm' },
  { id: 'kpi-sla',        cat: 'KPIs', label: 'SLA D4 %',              size: 'sm' },
  { id: 'kpi-vencidos',   cat: 'KPIs', label: 'Vencidos',              size: 'sm' },
  { id: 'kpi-sin-d4',     cat: 'KPIs', label: 'Sin Causa Raiz (D4)',   size: 'sm' },
  { id: 'kpi-draft',      cat: 'KPIs', label: 'Regresados a Draft',    size: 'sm' },
  { id: 'kpi-costo',      cat: 'KPIs', label: 'Costo Total',           size: 'sm' },
  { id: 'kpi-vencen7',    cat: 'KPIs', label: 'Por Vencer 7 dias',     size: 'sm' },
  { id: 'kpi-estancados', cat: 'KPIs', label: 'Estancados >90d',       size: 'sm' },
  { id: 'kpi-avance',     cat: 'KPIs', label: 'Avance Promedio',       size: 'sm' },
  // Graficas
  { id: 'chart-trend',    cat: 'Graficas', label: 'Tendencia mensual',      size: 'lg' },
  { id: 'chart-steps',    cat: 'Graficas', label: 'Distribucion por Fase',  size: 'lg' },
  { id: 'chart-sla',      cat: 'Graficas', label: 'Gauge SLA D4',           size: 'md' },
  { id: 'chart-days-dept',cat: 'Graficas', label: 'Dias prom. por depto.',  size: 'lg' },
  { id: 'chart-cost-dept',cat: 'Graficas', label: 'Costo por Departamento', size: 'lg' },
  { id: 'chart-cost-sup', cat: 'Graficas', label: 'Costo por Proveedor',    size: 'lg' },
  { id: 'chart-progress', cat: 'Graficas', label: 'Distribucion de Avance', size: 'lg' },
  { id: 'chart-pareto',   cat: 'Graficas', label: 'Pareto por Departamento',size: 'lg' },
  // Riesgo
  { id: 'risk-score',     cat: 'Riesgo', label: 'Indice de Riesgo',     size: 'md' },
  { id: 'risk-vencidos',  cat: 'Riesgo', label: 'Lista Vencidos',       size: 'lg' },
  { id: 'risk-alta-d4',   cat: 'Riesgo', label: 'Alta Sev. Sin D4',     size: 'lg' },
  { id: 'risk-estancados',cat: 'Riesgo', label: 'Lista Estancados',     size: 'lg' },
  // Calidad
  { id: 'qual-root-causes',cat: 'Calidad', label: 'Top Causas Raiz',    size: 'lg' },
  { id: 'vencen-7-list',  cat: 'Calidad', label: 'Lista Por Vencer 7d', size: 'lg' },
];

const EIGHTD_DEFAULT = [
  'kpi-total', 'kpi-activos', 'kpi-vencidos', 'kpi-sla',
  'chart-trend', 'chart-steps', 'risk-score', 'qual-root-causes',
];

const render8DWidget = (id, { data, derived }, t) => {
  const closedPct  = data.total8Ds > 0 ? Math.round((data.closed8Ds  / data.total8Ds) * 100) : 0;
  const overduePct = derived.total  > 0 ? Math.round((derived.overdueCount / derived.total) * 100) : 0;
  const withoutD4Pct = derived.total > 0 ? Math.round((derived.withoutD4  / derived.total) * 100) : 0;
  const avgProg = derived.total > 0
    ? Math.round(derived.all.reduce((s, r) => s + (r.progressPercentage || 0), 0) / derived.total) : 0;

  // ── KPIs ──
  if (id === 'kpi-total')      return <KpiTile label="Total 8Ds"            value={data.total8Ds || 0}    t={t} />;
  if (id === 'kpi-activos')    return <KpiTile label="Activos"               value={data.active8Ds || 0}   t={t} />;
  if (id === 'kpi-cerrados')   return <KpiTile label="Cerrados"              value={data.closed8Ds || 0}   sub={`${closedPct}% del total`} t={t} />;
  if (id === 'kpi-alta-sev')   return <KpiTile label="Alta Severidad"        value={data.highSeverity || 0} alertType={data.highSeverity > 10 ? 'error' : null} t={t} />;
  if (id === 'kpi-sla')        return <KpiTile label="SLA D4"                value={`${data.slaCompliance || 0}%`} valueColor={data.slaCompliance < 50 ? t.error : data.slaCompliance < 80 ? t.warning : undefined} t={t} />;
  if (id === 'kpi-vencidos')   return <KpiTile label="Vencidos"              value={derived.overdueCount}  alertType={derived.overdueCount > 0 ? 'error' : null} sub={`${overduePct}%`} t={t} />;
  if (id === 'kpi-sin-d4')     return <KpiTile label="Sin Causa Raiz (D4)"   value={derived.withoutD4}     alertType={derived.withoutD4 > 5 ? 'error' : derived.withoutD4 > 0 ? 'warning' : null} sub={`${withoutD4Pct}%`} t={t} />;
  if (id === 'kpi-draft')      return <KpiTile label="Regresados a Draft"    value={data.totalRevisions || 0} alertType={(data.totalRevisions||0) > 0 ? 'warning' : null} sub={`${data.revertedFamilies || 0} reporte(s)`} t={t} />;
  if (id === 'kpi-costo')      return <KpiTile label="Costo Total"           value={formatCurrency(data.totalEstimatedCost || 0)} t={t} />;
  if (id === 'kpi-vencen7')    return <KpiTile label="Por Vencer 7 dias"     value={derived.dueSoon7}      alertType={derived.dueSoon7 > 0 ? 'warning' : null} t={t} />;
  if (id === 'kpi-estancados') return <KpiTile label="Estancados >90 dias"   value={derived.stagnantCount} alertType={derived.stagnantCount > 0 ? 'warning' : null} t={t} />;
  if (id === 'kpi-avance')     return <KpiTile label="Avance Promedio"       value={`${avgProg}%`}         t={t} />;

  // ── Charts ──
  if (id === 'chart-trend') {
    const monthly = (() => {
      const map = {};
      (data.monthlyTrend||[]).forEach(m => { map[m.month] = { month: m.month, creados: m.count }; });
      (data.throughputByMonth||[]).forEach(m => { if (map[m.month]) map[m.month].cerrados = m.count; else map[m.month] = { month: m.month, creados: 0, cerrados: m.count }; });
      return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
    })();
    return (
      <MiniChartWrapper title="Tendencia Mensual" t={t}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" fontSize={9} stroke={t.textMuted} />
            <YAxis fontSize={9} stroke={t.textMuted} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="creados" name="Creados" fill={t.accent} radius={[2,2,0,0]} />
            <Bar dataKey="cerrados" name="Cerrados" fill={t.success} radius={[2,2,0,0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-steps') {
    const steps = {};
    derived.all.forEach(r => { const s = r.currentStep || 'D1'; steps[s] = (steps[s]||0)+1; });
    const order = ['D1','D2','D3','D3-MFG','D4','D5','D6','D7','D8'];
    const stepData = order.map(s => ({ step: s, count: steps[s]||0, color: getStepColor(s, t) })).filter(s => s.count > 0);
    return (
      <MiniChartWrapper title="Distribucion por Fase" t={t}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stepData} layout="vertical" margin={{ left: 5, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" fontSize={9} stroke={t.textMuted} />
            <YAxis type="category" dataKey="step" fontSize={10} width={55} stroke={t.textMuted} />
            <Tooltip />
            <Bar dataKey="count" radius={[0,2,2,0]} label={{ position: 'right', fontSize: 10, fill: t.text }}>
              {stepData.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-sla') {
    const slaStatus = data.slaCompliance >= 80 ? 'success' : data.slaCompliance >= 50 ? 'warning' : 'error';
    const slaColor = slaStatus === 'success' ? t.success : slaStatus === 'warning' ? t.warning : t.error;
    const slaBg = slaStatus === 'success' ? t.successBg : slaStatus === 'warning' ? t.warningBg : t.errorBg;
    return (
      <MiniChartWrapper title="SLA D4 Compliance" t={t}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: '50%', border: `8px solid ${slaColor}`, backgroundColor: slaBg }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", color: slaColor }}>{data.slaCompliance}%</div>
              <div style={{ fontSize: 9, color: t.textMuted }}>SLA D4</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: t.textMuted }}>
            {slaStatus === 'success' ? 'Satisfactorio' : slaStatus === 'warning' ? 'Por debajo' : 'Critico'}
          </div>
        </div>
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-days-dept') {
    const daysData = (data.avgDaysByDepartment||[]).map(d => ({
      ...d, avgDays: parseFloat(d.avgDays),
      color: parseFloat(d.avgDays) > 90 ? t.error : parseFloat(d.avgDays) > 60 ? t.warning : t.success
    }));
    return (
      <MiniChartWrapper title="Dias Prom. por Departamento" t={t}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daysData} layout="vertical" margin={{ left: 5, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" unit="d" fontSize={9} stroke={t.textMuted} />
            <YAxis type="category" dataKey="department" fontSize={9} width={90} stroke={t.textMuted} />
            <Tooltip formatter={v=>[`${v} dias`]} />
            <Bar dataKey="avgDays" radius={[0,2,2,0]} label={{ position: 'right', fontSize: 9, fill: t.textMuted, formatter: v=>`${v}d` }}>
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
      <MiniChartWrapper title="Costo por Departamento" t={t}>
        {deptData.map(d => (
          <div key={d.department} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: t.text }}>{d.department}</span>
              <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.accent }}>{formatCurrency(d.cost)}</span>
            </div>
            <div style={{ height: 5, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(d.cost/maxC)*100}%`, backgroundColor: t.accent, borderRadius: 3 }} />
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
      <MiniChartWrapper title="Costo por Proveedor" t={t}>
        {supData.map((s,i) => (
          <div key={s.supplier} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.text }}>{s.supplier}</span>
              <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: i<2 ? t.error : t.primary }}>{formatCurrency(s.cost)}</span>
            </div>
            <div style={{ height: 5, backgroundColor: t.bgPanel, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.cost/maxS)*100}%`, backgroundColor: i<2 ? t.error : t.primary, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </MiniChartWrapper>
    );
  }

  if (id === 'chart-progress') {
    const buckets = [
      { label: '0-25%',   count: derived.all.filter(r=>(r.progressPercentage||0)<25).length,  color: t.error },
      { label: '25-50%',  count: derived.all.filter(r=>(r.progressPercentage||0)>=25&&(r.progressPercentage||0)<50).length, color: t.warning },
      { label: '50-75%',  count: derived.all.filter(r=>(r.progressPercentage||0)>=50&&(r.progressPercentage||0)<75).length, color: t.accent },
      { label: '75-100%', count: derived.all.filter(r=>(r.progressPercentage||0)>=75).length,  color: t.success },
    ];
    return (
      <MiniChartWrapper title="Distribucion de Avance" t={t}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="label" fontSize={10} stroke={t.textMuted} />
            <YAxis fontSize={10} stroke={t.textMuted} />
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
      <MiniChartWrapper title="Pareto por Departamento" t={t}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data.paretoByDepartment||[]}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="department" fontSize={8} angle={-15} textAnchor="end" height={45} stroke={t.textMuted} />
            <YAxis yAxisId="left" fontSize={9} stroke={t.textMuted} />
            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} fontSize={9} stroke={t.textMuted} />
            <Tooltip />
            <Bar yAxisId="left" dataKey="count" name="Incidencias" fill={t.accent} radius={[2,2,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke={t.error} strokeWidth={2} dot={{ r: 3 }} />
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
    const riskFactors = [
      { label: 'Vencidos', value: derived.overdueCount, color: derived.overdueCount > 0 ? t.errorFg : t.text },
      { label: 'Alta+Sin D4', value: derived.highSevWithoutD4, color: derived.highSevWithoutD4 > 0 ? t.errorFg : t.text },
      { label: 'Estancados', value: derived.stagnantCount, color: derived.stagnantCount > 0 ? t.warningFg : t.text },
      { label: 'En Draft', value: data.totalRevisions || 0, color: (data.totalRevisions || 0) > 0 ? t.warningFg : t.text }
    ];
    return <RiskScoreCard score={rs} factors={riskFactors} t={t} />;
  }

  if (id === 'risk-vencidos') {
    return (
      <MiniChartWrapper title={`Reportes Vencidos (${derived.overdueList.length})`} t={t}>
        {derived.overdueList.length===0
          ? <div style={{ color: t.success, fontSize: 12, textAlign: 'center', padding: 12 }}>Sin vencidos</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {derived.overdueList.map(r=>(
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: t.errorBg, borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.errorFg }}>{r.reportId}</span>
                  <span style={{ color: t.textDim }}>{r.daysOpen}d - {r.createdByDepartment}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  if (id === 'risk-alta-d4') {
    return (
      <MiniChartWrapper title={`Alta Sev. Sin D4 (${derived.highSevWithoutD4List.length})`} t={t}>
        {derived.highSevWithoutD4List.length===0
          ? <div style={{ color: t.success, fontSize: 12, textAlign: 'center', padding: 12 }}>Todos tienen D4</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {derived.highSevWithoutD4List.map(r=>(
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: t.errorBg, borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.errorFg }}>{r.reportId}</span>
                  <span style={{ color: t.textDim }}>{r.currentStep} - {r.createdByDepartment}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  if (id === 'risk-estancados') {
    return (
      <MiniChartWrapper title={`Estancados >90d (${derived.stagnantList.length})`} t={t}>
        {derived.stagnantList.length===0
          ? <div style={{ color: t.success, fontSize: 12, textAlign: 'center', padding: 12 }}>Sin estancados</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {derived.stagnantList.map(r=>(
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: t.warningBg, borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.warningFg }}>{r.reportId}</span>
                  <span style={{ color: t.textDim }}>{r.daysOpen}d abierto</span>
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
      <MiniChartWrapper title="Top Causas Raiz (D4)" t={t}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(data.topRootCauses||[]).slice(0,8).map((rc,i)=>{
            const maxRc = data.topRootCauses?.[0]?.count||1;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: t.text, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i+1}. {rc.cause}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.primary }}>{rc.count}</span>
                </div>
                <div style={{ height: 4, backgroundColor: t.bgPanel, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(rc.count/maxRc)*100}%`, backgroundColor: t.primary, borderRadius: 2 }} />
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
      <MiniChartWrapper title={`Por Vencer en 7 Dias (${derived.dueSoon7List.length})`} t={t}>
        {derived.dueSoon7List.length===0
          ? <div style={{ color: t.success, fontSize: 12, textAlign: 'center', padding: 12 }}>Sin vencimientos proximos</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {derived.dueSoon7List.map(r=>(
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: t.warningBg, borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: t.warningFg }}>{r.reportId}</span>
                  <span style={{ color: t.textDim }}>{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}</span>
                </div>
              ))}
            </div>
        }
      </MiniChartWrapper>
    );
  }

  return null;
};

// Wrapper for mini widgets - receives t from render8DWidget
const MiniChartWrapper = ({ title, children, t }) => (
  <div>
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: 10,
      color: t?.textDim || 'inherit'
    }}>
      {title}
    </div>
    {children}
  </div>
);

const EightDDashboard = ({ data, allReports }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('8d-dashboard-tab') || 'resumen');
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

  // Calculate alerts needing attention for Riesgo tab badge
  const riskAlertCount = derived.overdueCount + derived.highSevWithoutD4;

  const TABS = [
    { id: 'resumen', label: 'Resumen', component: TabResumen },
    { id: 'volumen', label: 'Volumen & Flujo', component: TabVolumen },
    { id: 'tiempo', label: 'Tiempo & Cumplimiento', component: TabTiempo },
    { id: 'costos', label: 'Impacto Economico', component: TabCostos },
    { id: 'calidad', label: 'Calidad de Analisis', component: TabCalidad },
    { id: 'proveedores', label: 'Proveedores', component: TabProveedores },
    { id: 'operacion', label: 'Operacion Interna', component: TabOperacion },
    { id: 'riesgo', label: 'Riesgo & Alertas', component: TabRiesgo, alertCount: riskAlertCount },
    { id: 'personalizado', label: 'Mi Dashboard' },
  ];

  const ActiveTab = TABS.find(tab => tab.id === activeTab)?.component;

  // Top bar KPIs
  const closedPct = data.total8Ds > 0 ? Math.round((data.closed8Ds / data.total8Ds) * 100) : 0;
  const overduePct = derived.total > 0 ? Math.round((derived.overdueCount / derived.total) * 100) : 0;
  const withoutD4Pct = derived.total > 0 ? Math.round((derived.withoutD4 / derived.total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* TOP BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10 }}>
        <KpiTile label="Total 8Ds" value={data.total8Ds || 0} t={t} />
        <KpiTile label="Activos" value={data.active8Ds || 0} t={t} />
        <KpiTile label="Cerrados" value={data.closed8Ds || 0} sub={`${closedPct}% del total`} t={t} />
        <KpiTile label="Alta Severidad" value={data.highSeverity || 0} alertType={data.highSeverity > 10 ? 'error' : null} t={t} />
        <KpiTile label="SLA D4" value={`${data.slaCompliance || 0}%`} valueColor={data.slaCompliance < 50 ? t.error : data.slaCompliance < 80 ? t.warning : undefined} t={t} />
        <KpiTile label="% Vencidos" value={`${overduePct}%`} alertType={derived.overdueCount > 0 ? 'error' : null} sub={`${derived.overdueCount} reportes`} t={t} />
        <KpiTile label="% Sin D4" value={`${withoutD4Pct}%`} alertType={derived.withoutD4 > 5 ? 'error' : derived.withoutD4 > 0 ? 'warning' : null} sub={`${derived.withoutD4} sin causa raiz`} t={t} />
        <KpiTile label="Regresados a Draft" value={data.totalRevisions || 0} alertType={(data.totalRevisions||0) > 0 ? 'warning' : null} sub={`${data.revertedFamilies || 0} reporte(s) afectados`} t={t} />
        <KpiTile label="Costo Total" value={formatCurrency(data.totalEstimatedCost || 0)} t={t} />
      </div>

      {/* TAB NAV - Underline style like 8D report tabs */}
      <div style={{
        backgroundColor: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        padding: '0 14px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto'
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '0 0 auto',
                padding: '12px 16px',
                border: 'none',
                borderBottom: isActive ? `2px solid ${t.primary}` : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                backgroundColor: 'transparent',
                color: isActive ? t.text : t.textMuted,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
              {tab.alertCount > 0 && <AlertCountChip count={tab.alertCount} t={t} />}
            </button>
          );
        })}
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
