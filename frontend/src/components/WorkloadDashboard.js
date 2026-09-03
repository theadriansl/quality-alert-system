import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import CustomDashboard from './CustomDashboard';
import { KpiTile as SharedKpiTile } from './shared/SharedComponents';

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

// ─── Sub-components ───────────────────────────────────────────────────────────
// Local KpiTile wrapper for Workload-style (borderTop accent, colored value)
// Note: icon prop ignored per emoji cleanup protocol
const KpiTile = ({ label, value, unit = '', color, sub, size = 'md' }) => {
  const { theme: t } = useTheme();
  return (
    <SharedKpiTile
      label={label}
      value={value}
      unit={unit}
      sub={sub}
      borderAccent="top"
      accentColor={color}
      valueColor={color}
      size={size}
      t={t}
    />
  );
};

const SectionTitle = ({ icon, label }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '15px', fontWeight: '600', color: t.text }}>{label}</span>
    </div>
  );
};

const Card = ({ children, style = {} }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      padding: '18px',
      ...style
    }}>
      {children}
    </div>
  );
};

// Risk gauge (simple arc via conic-gradient trick with radial bar)
const RiskGauge = ({ value }) => {
  const { theme: t } = useTheme();
  const color = riskColor(value);
  const data = [{ name: 'Riesgo', value, fill: color }, { name: 'Rest', value: 100 - value, fill: t.border }];
  return (
    <div style={{ textAlign: 'center' }}>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0}
            innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '-40px', fontSize: '28px', fontWeight: '600', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: t.textDim, marginTop: '2px' }}>
        {value >= 60 ? '🔴 Riesgo Alto' : value >= 35 ? '🟡 Riesgo Medio' : '🟢 Riesgo Bajo'}
      </div>
    </div>
  );
};

// ─── Tab content components ───────────────────────────────────────────────────

const TabCarga = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { carga } = kpis;
  const sorted = [...(carga.userLoad || [])].sort((a, b) => b.utilization - a.utilization);

  const barData = sorted.map(u => ({
    name: u.first_name,
    utilización: parseFloat(u.utilization.toFixed(1)),
    disponible: parseFloat(u.hoursAvailable.toFixed(1)),
    asignadas: parseFloat(u.hoursAssigned.toFixed(1))
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <KpiTile label="Carga Promedio" value={`${carga.userLoad.length > 0 ? fmt1(carga.userLoad.reduce((s,u)=>s+u.utilization,0)/carga.userLoad.length) : 0}%`} color={clr(carga.userLoad.length>0?carga.userLoad.reduce((s,u)=>s+u.utilization,0)/carga.userLoad.length:0)} />
        <KpiTile label="Cap. Disponible" value={fmt1(carga.totalAvailableHrs)} unit="hrs" color={t.accent}  />
        <KpiTile label="Horas Asignadas" value={fmt1(carga.totalAssignedHrs)} unit="hrs" color="#8b5cf6" />
        <KpiTile label="Desbalance" value={`${fmt1(carga.loadImbalance)}%`} color={carga.loadImbalance > 50 ? '#ef4444' : carga.loadImbalance > 25 ? '#C77700' : '#2E7D32'}  sub="(máx - mín)" />
        <KpiTile label="Subutilización" value={`${carga.underutilizedPercent}%`} color={carga.underutilizedPercent > 30 ? '#C77700' : '#2E7D32'}  sub={`${carga.underutilizedCount} personas <70%`} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Utilization per person */}
        <Card>
          <SectionTitle label="Utilización por Persona (%)" />
          <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 28)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" domain={[0, Math.max(120, ...barData.map(d=>d.utilización))]}
                tickFormatter={v => `${v}%`} fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="name" fontSize={11} stroke={t.textMuted} width={70} interval={0} />
              <Tooltip formatter={(v, n) => [`${v}%`, 'Utilización']}
                contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="utilización" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: t.textMuted, formatter: v => `${v}%` }}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.utilización > 110 ? '#ef4444' : entry.utilización < 70 ? '#9ca3af' : '#2E7D32'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Reference lines legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center', fontSize: '11px', color: t.textMuted }}>
            <span style={{ color: t.textDim }}>■ Subutilizado (&lt;70%)</span>
            <span style={{ color: '#2E7D32' }}>■ Óptimo (70-110%)</span>
            <span style={{ color: '#ef4444' }}>■ Sobrecargado (&gt;110%)</span>
          </div>
        </Card>

        {/* Hours breakdown per person */}
        <Card>
          <SectionTitle label="Horas: Disponible vs Asignadas" />
          <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 28)}>
            <BarChart data={sorted.map(u => ({
              name: u.first_name,
              Disponibles: parseFloat(u.hoursAvailable.toFixed(1)),
              Asignadas: parseFloat(u.hoursAssigned.toFixed(1))
            }))} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" fontSize={11} stroke={t.textMuted} />
              <YAxis type="category" dataKey="name" fontSize={11} stroke={t.textMuted} width={70} interval={0} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Disponibles" fill={t.border} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Asignadas" fill={t.accent} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <SectionTitle label="Detalle por Persona" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: t.bgPanel }}>
                {['Persona', 'Puesto', 'Disponibles', 'Asignadas', 'Reales', 'Utilización', 'Actividades', 'Completadas', 'Retrasadas'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', color: t.textMuted, borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                  <td style={{ padding: '8px 12px', color: t.text, fontWeight: '600' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '8px 12px', color: t.textMuted, fontSize: '12px' }}>{u.position || '-'}</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursAvailable)} hrs</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursAssigned)} hrs</td>
                  <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(u.hoursReal)} hrs</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '12px',
                      backgroundColor: u.utilization > 110 ? '#fee2e2' : u.utilization < 70 ? t.bgPanel : '#dcfce7',
                      color: u.utilization > 110 ? '#ef4444' : u.utilization < 70 ? t.textDim : '#2E7D32'
                    }}>{u.utilization}%</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: t.text, textAlign: 'center' }}>{u.activitiesCount}</td>
                  <td style={{ padding: '8px 12px', color: '#2E7D32', textAlign: 'center', fontWeight: '600' }}>{u.completedCount}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {u.delayedCount > 0
                      ? <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠ {u.delayedCount}</span>
                      : <span style={{ color: '#2E7D32' }}>✓</span>}
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

const TabEjecucion = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { ejecucion, carga = {} } = kpis;
  const prodGood = ejecucion.productivity >= 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <KpiTile label="Cumplimiento" value={`${ejecucion.compliancePercent}%`}
          color={clr(ejecucion.compliancePercent)} icon="✅" sub="Real vs Estimado" />
        <KpiTile label="Desviación Est." value={`${ejecucion.estimationDeviation > 0 ? '+' : ''}${ejecucion.estimationDeviation}%`}
          color={Math.abs(ejecucion.estimationDeviation) < 10 ? '#2E7D32' : Math.abs(ejecucion.estimationDeviation) < 25 ? '#C77700' : '#ef4444'}
           sub="(real - est) / est" />
        <KpiTile label="Productividad" value={`${ejecucion.productivity}x`}
          color={prodGood ? '#2E7D32' : '#ef4444'}           sub={prodGood ? 'Más rápido de lo estimado' : 'Más lento de lo estimado'} />
        <KpiTile label="Lead Time Prom." value={`${ejecucion.avgLeadTimeDays}`} unit="días"
          color={ejecucion.avgLeadTimeDays < 7 ? '#2E7D32' : ejecucion.avgLeadTimeDays < 21 ? '#C77700' : '#ef4444'}
           sub="Promedio tareas completadas" />
        <KpiTile label="Throughput" value={ejecucion.throughput} unit="tareas"
          color="#8b5cf6"  sub="Completadas en el periodo" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Compliance visual */}
        <Card>
          <SectionTitle label="Horas: Estimadas vs Reales" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {/* Bar comparison */}
            {[
              { label: 'Horas Estimadas', value: carga.totalAssignedHrs || 0, color: '#0072CE' },
              { label: 'Horas Reales', value: Math.round((ejecucion.compliancePercent || 0) / 100 * (carga.totalAssignedHrs || 0) * 10) / 10, color: ejecucion.compliancePercent > 100 ? '#ef4444' : '#2E7D32' }
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: t.text }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: item.color }}>{fmt1(item.value)} hrs</span>
                </div>
              </div>
            ))}

            {/* Deviation alert */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: Math.abs(ejecucion.estimationDeviation) < 10 ? '#dcfce7' : Math.abs(ejecucion.estimationDeviation) < 25 ? '#fef3c7' : '#fee2e2',
              marginTop: '8px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>Interpretación</div>
              <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                {ejecucion.estimationDeviation > 0
                  ? `Las actividades están tomando ${ejecucion.estimationDeviation}% más horas de lo estimado.`
                  : ejecucion.estimationDeviation < 0
                    ? `Las actividades se están completando ${Math.abs(ejecucion.estimationDeviation)}% más rápido de lo estimado.`
                    : 'Las estimaciones están perfectamente alineadas con la ejecución.'}
              </div>
            </div>

            {/* Big deviation */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: '8px', backgroundColor: t.bgPanel,
              border: `1px solid ${t.border}`
            }}>
              <span style={{ fontSize: '13px', color: t.text }}>Actividades con desviación &gt;20%</span>
              <span style={{
                fontSize: '14px', fontWeight: '600',
                color: ejecucion.bigDeviationPercent > 30 ? '#ef4444' : ejecucion.bigDeviationPercent > 15 ? '#C77700' : '#2E7D32'
              }}>{ejecucion.bigDeviationCount} ({ejecucion.bigDeviationPercent}%)</span>
            </div>
          </div>
        </Card>

        {/* Productivity gauge */}
        <Card>
          <SectionTitle label="Índice de Productividad" />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '140px', height: '140px', borderRadius: '50%',
              border: `8px solid ${prodGood ? '#2E7D32' : '#ef4444'}`,
              backgroundColor: prodGood ? '#dcfce7' : '#fee2e2'
            }}>
              <div>
                <div style={{ fontSize: '36px', fontWeight: '600', color: prodGood ? '#2E7D32' : '#ef4444' }}>
                  {ejecucion.productivity}x
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>est / real</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', color: t.text, fontWeight: '600' }}>
              {prodGood ? '✅ Por encima de lo estimado' : '⚠️ Por debajo de lo estimado'}
            </div>
            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
              &gt;1.0 = más eficiente de lo planeado
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#8b5cf6' }}>{ejecucion.throughput}</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Completadas</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#C77700' }}>{ejecucion.avgLeadTimeDays}d</div>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Lead Time</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TabActividades = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { actividades } = kpis;

  const pieData = [
    { name: 'Completadas', value: actividades.completedCount, color: '#2E7D32' },
    { name: 'En Progreso', value: actividades.inProgressCount, color: '#0072CE' },
    { name: 'Pendientes', value: actividades.pendingCount, color: '#C77700' },
    { name: 'Canceladas', value: actividades.cancelledCount, color: '#9ca3af' }
  ].filter(d => d.value > 0);

  const typeData = [
    { name: 'Completadas', value: actividades.completedPercent, color: '#2E7D32' },
    { name: 'En Progreso (WIP)', value: actividades.wipPercent, color: '#0072CE' },
    { name: 'Pendientes', value: actividades.pendingPercent, color: '#C77700' },
    { name: 'No Planeadas', value: actividades.unplannedPercent, color: '#ef4444' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <KpiTile label="Avance Promedio" value={`${fmt1(actividades.avgProgress)}%`}
          color={clr(actividades.avgProgress)}  />
        <KpiTile label="% Completadas" value={`${actividades.completedPercent}%`}
          color={clr(actividades.completedPercent)} icon="✅" sub={`${actividades.completedCount} tareas`} />
        <KpiTile label="% Pendientes" value={`${actividades.pendingPercent}%`}
          color={actividades.pendingPercent > 50 ? '#C77700' : '#2E7D32'}  sub={`${actividades.pendingCount} tareas`} />
        <KpiTile label="% No Planeadas" value={`${actividades.unplannedPercent}%`}
          color={actividades.unplannedPercent > 20 ? '#ef4444' : actividades.unplannedPercent > 10 ? '#C77700' : '#2E7D32'}
          sub="Actividades sorpresa" />
        <KpiTile label="WIP" value={`${actividades.wipPercent}%`}
          color={t.accent} sub={`${actividades.inProgressCount} activas`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Pie chart status */}
        <Card>
          <SectionTitle label="Distribución por Estado" />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                dataKey="value" paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} tareas`]}
                contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {pieData.map(d => (
              <span key={d.name} style={{ fontSize: '11px', color: t.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
                {d.name}: <strong style={{ color: t.text }}>{d.value}</strong>
              </span>
            ))}
          </div>
        </Card>

        {/* % Bars */}
        <Card>
          <SectionTitle label="Indicadores de Flujo (%)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            {typeData.map(item => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: t.text }}>{item.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: item.color }}>{item.value}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: t.bgPanel, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, item.value)}%`,
                    backgroundColor: item.color, borderRadius: '4px',
                    transition: 'width 0.6s ease'
                  }} />
                </div>
              </div>
            ))}

            {/* Total */}
            <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: t.bgPanel, borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: t.textMuted }}>Total actividades en periodo</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>{actividades.total}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const TabRiesgo = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { riesgo } = kpis;

  const riskItems = [
    {
      label: 'Personas Sobrecargadas',
      value: riesgo.overloadedCount,
            color: riesgo.overloadedCount > 0 ? '#ef4444' : '#2E7D32',
      desc: 'Con utilización > 110%'
    },
    {
      label: 'Tareas Críticas Retrasadas',
      value: riesgo.criticalDelayedCount,
            color: riesgo.criticalDelayedCount > 0 ? '#ef4444' : '#2E7D32',
      desc: 'Prioridad Alta/Crítica vencidas'
    },
    {
      label: 'Tareas Retrasadas',
      value: riesgo.delayedCount,
            color: riesgo.delayedCount > 0 ? '#C77700' : '#2E7D32',
      desc: 'Fecha fin pasada, no completadas'
    },
    {
      label: 'Tareas Bloqueadas',
      value: riesgo.blockedCount,
            color: riesgo.blockedCount > 0 ? '#C77700' : '#2E7D32',
      desc: 'Estado: Bloqueado'
    },
    {
      label: '% Trabajo en Riesgo',
      value: `${riesgo.atRiskPercent}%`,
            color: riesgo.atRiskPercent > 20 ? '#ef4444' : riesgo.atRiskPercent > 10 ? '#C77700' : '#2E7D32',
      desc: 'Retrasadas + Bloqueadas'
    },
    {
      label: 'Desviación >20%',
      value: `${riesgo.bigDeviationPercent}%`,
            color: riesgo.bigDeviationPercent > 30 ? '#ef4444' : riesgo.bigDeviationPercent > 15 ? '#C77700' : '#2E7D32',
      desc: 'Tareas con estimación muy imprecisa'
    }
  ];

  const riskLevel = riesgo.riskIndex >= 60 ? 'ALTO' : riesgo.riskIndex >= 35 ? 'MEDIO' : 'BAJO';
  const riskBg = riesgo.riskIndex >= 60 ? '#fee2e2' : riesgo.riskIndex >= 35 ? '#fef3c7' : '#dcfce7';
  const riskTxt = riesgo.riskIndex >= 60 ? '#B00020' : riesgo.riskIndex >= 35 ? '#C77700' : '#2E7D32';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
        {/* Risk Index */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: riskBg }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: riskTxt, marginBottom: '4px', textTransform: 'uppercase' }}>
            Índice de Riesgo Operativo
          </div>
          <RiskGauge value={riesgo.riskIndex} />
          <div style={{
            marginTop: '8px', padding: '6px 20px', borderRadius: '20px',
            backgroundColor: riskColor(riesgo.riskIndex), color: 'white',
            fontWeight: '600', fontSize: '14px'
          }}>
            {riskLevel}
          </div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px', textAlign: 'center' }}>
            Basado en sobrecarga, retrasos,<br />tareas críticas y no planeadas
          </div>
        </Card>

        {/* Risk items */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {riskItems.map(item => (
            <div key={item.label} style={{
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '10px',
              padding: '14px',
              borderLeft: `4px solid ${item.color}`
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '600', color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginTop: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk recommendations */}
      <Card>
        <SectionTitle label="Recomendaciones" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {riesgo.overloadedCount > 0 && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#B00020' }}>
                <strong>{riesgo.overloadedCount} persona(s)</strong> están sobrecargadas (&gt;110%). Considera redistribuir actividades o revisar capacidad.
              </span>
            </div>
          )}
          {riesgo.criticalDelayedCount > 0 && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#B00020' }}>
                <strong>{riesgo.criticalDelayedCount} tarea(s) críticas</strong> están retrasadas. Requieren atención inmediata.
              </span>
            </div>
          )}
          {riesgo.delayedCount > 0 && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
              <span>⏰</span>
              <span style={{ fontSize: '13px', color: '#C77700' }}>
                <strong>{riesgo.delayedCount} actividad(es)</strong> tienen fecha de fin vencida. Actualiza fechas o avance.
              </span>
            </div>
          )}
          {riesgo.bigDeviationPercent > 20 && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#C77700' }}>
                El <strong>{riesgo.bigDeviationPercent}%</strong> de las actividades tiene desviación &gt;20% en horas. Revisa la calidad de las estimaciones.
              </span>
            </div>
          )}
          {riesgo.overloadedCount === 0 && riesgo.criticalDelayedCount === 0 && riesgo.delayedCount === 0 && riesgo.bigDeviationPercent <= 20 && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
              <span>✅</span>
              <span style={{ fontSize: '13px', color: '#2E7D32' }}>El equipo opera dentro de parámetros normales. Sin alertas críticas activas.</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const TabProyectos = ({ kpis }) => {
  const { theme: t } = useTheme();
  const { proyectos } = kpis;

  const kpiBarData = proyectos.kpiDistribution.map(k => ({
    name: k.name || k.code || 'Sin KPI',
    'Estimadas': parseFloat(k.estimated.toFixed(1)),
    'Reales': parseFloat(k.actual.toFixed(1)),
    color: k.color || '#8b5cf6'
  }));

  const projBarData = proyectos.projectDistribution.slice(0, 8).map(p => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    fullName: p.name,
    avance: p.avgProgress,
    est: parseFloat(p.estimated.toFixed(1)),
    real: parseFloat(p.actual.toFixed(1))
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* KPI distribution */}
        <Card>
          <SectionTitle label="Horas por KPI" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kpiBarData} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="name" fontSize={11} stroke={t.textMuted} />
              <YAxis fontSize={11} stroke={t.textMuted} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }}
                formatter={(v, n) => [`${v} hrs`, n]} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Estimadas" fill={t.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Reales" fill={t.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Department efficiency */}
        <Card>
          <SectionTitle label="Eficiencia por Departamento" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {proyectos.departmentEfficiency.slice(0, 6).map(d => (
              <div key={d.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>{d.department}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: t.textMuted }}>{d.count} acts</span>
                    <span style={{
                      fontSize: '12px', fontWeight: '600',
                      color: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444'
                    }}>{d.completionRate}% ✓</span>
                    {d.efficiency && (
                      <span style={{
                        fontSize: '12px', fontWeight: '600',
                        color: d.efficiency >= 1 ? '#2E7D32' : '#ef4444'
                      }}>{d.efficiency}x</span>
                    )}
                  </div>
                </div>
                <div style={{ height: '6px', backgroundColor: t.bgPanel, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, d.completionRate)}%`,
                    backgroundColor: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444',
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* KPI detail table */}
      <Card>
        <SectionTitle label="Detalle por KPI" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: t.bgPanel }}>
              {['KPI', 'Actividades', 'Completadas', 'Avance Prom.', 'Est. (hrs)', 'Real (hrs)', 'Eficiencia', '% del total'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', fontSize: '11px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proyectos.kpiDistribution.map((k, i) => (
              <tr key={k.kpi_id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: k.color || '#8b5cf6', display: 'inline-block' }} />
                    <strong style={{ color: t.text }}>{k.name || k.code}</strong>
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: t.text, textAlign: 'center' }}>{k.count}</td>
                <td style={{ padding: '8px 12px', color: '#2E7D32', textAlign: 'center', fontWeight: '600' }}>{k.completed}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ color: clr(k.avgProgress), fontWeight: '600' }}>{k.avgProgress}%</span>
                </td>
                <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(k.estimated)}</td>
                <td style={{ padding: '8px 12px', color: t.text }}>{fmt1(k.actual)}</td>
                <td style={{ padding: '8px 12px' }}>
                  {k.efficiency
                    ? <span style={{ color: k.efficiency >= 1 ? '#2E7D32' : '#ef4444', fontWeight: '600' }}>{k.efficiency}x</span>
                    : <span style={{ color: t.textMuted }}>—</span>}
                </td>
                <td style={{ padding: '8px 12px', color: '#8b5cf6', fontWeight: '600' }}>{k.hoursShare}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Project progress */}
      {projBarData.length > 0 && (
        <Card>
          <SectionTitle label="Avance por Proyecto (%)" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projBarData} margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="name" fontSize={10} stroke={t.textMuted} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} stroke={t.textMuted} />
              <Tooltip
                contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '12px' }}
                formatter={(v, n, p) => [`${v}%`, 'Avance']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="avance" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10, fill: t.textMuted, formatter: v => `${v}%` }}>
                {projBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.avance >= 75 ? '#2E7D32' : entry.avance >= 40 ? '#0072CE' : '#C77700'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

// ─── Mi Dashboard: catálogo + renderer (Workload) ─────────────────────────────
const WORKLOAD_CATALOG = [
  // KPIs
  { id: 'kpi-util',       cat: 'KPIs', label: 'Utilización Prom.',   size: 'sm' },
  { id: 'kpi-sobrecarga', cat: 'KPIs', label: '% Sobrecargados',     size: 'sm' },
  { id: 'kpi-planeado',   cat: 'KPIs', label: 'Planeado vs Dispon.', size: 'sm' },
  { id: 'kpi-real-plan',  cat: 'KPIs', label: 'Real vs Planeado',    size: 'sm' },
  { id: 'kpi-retrasadas', cat: 'KPIs', label: '% Retrasadas',        size: 'sm' },
  { id: 'kpi-cumplimiento',cat:'KPIs', label: 'Cumplimiento',        size: 'sm' },
  { id: 'kpi-productividad',cat:'KPIs',label: 'Productividad',       size: 'sm' },
  { id: 'kpi-leadtime',   cat: 'KPIs', label: 'Lead Time',           size: 'sm' },
  { id: 'kpi-throughput', cat: 'KPIs', label: 'Throughput',          size: 'sm' },
  { id: 'kpi-avance',     cat: 'KPIs', label: 'Avance Prom.',        size: 'sm' },
  { id: 'kpi-riesgo',     cat: 'KPIs', label: 'Índice de Riesgo',    size: 'sm' },
  // Carga
  { id: 'chart-util-bar', cat: 'Carga', label: 'Utilización por Persona', size: 'lg' },
  { id: 'chart-horas',    cat: 'Carga', label: 'Horas Disponible vs Asignadas', size: 'lg' },
  // Ejecución
  { id: 'chart-est-real', cat: 'Ejecución', label: 'Estimadas vs Reales', size: 'md' },
  { id: 'chart-productividad', cat: 'Ejecución', label: 'Productividad',  size: 'md' },
  // Actividades
  { id: 'chart-act-pie',  cat: 'Actividades', label: 'Distribución Actividades', size: 'md' },
  { id: 'chart-flujo',    cat: 'Actividades', label: 'Indicadores de Flujo',     size: 'md' },
  // Riesgo
  { id: 'riesgo-gauge',   cat: 'Riesgo', label: 'Índice de Riesgo',      size: 'md' },
  { id: 'riesgo-items',   cat: 'Riesgo', label: 'Alertas de Riesgo',     size: 'lg' },
  { id: 'riesgo-recomend',cat: 'Riesgo', label: 'Recomendaciones',       size: 'lg' },
  // Proyectos
  { id: 'chart-kpi-hrs',  cat: 'Proyectos', label: 'Horas por KPI',      size: 'lg' },
  { id: 'chart-dept-eff', cat: 'Proyectos', label: 'Eficiencia por Depto.', size: 'md' },
];

const WORKLOAD_DEFAULT = [
  'kpi-util', 'kpi-sobrecarga', 'kpi-retrasadas', 'kpi-riesgo',
  'chart-util-bar', 'chart-act-pie', 'riesgo-gauge', 'riesgo-items',
];

// Wrapper ligero sin useTheme para usar dentro de renderWorkloadWidget
const WLCardWrapper = ({ title, children }) => (
  <div>
    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: 'inherit' }}>{title}</div>
    {children}
  </div>
);

const renderWorkloadWidget = (id, kpis, t) => {
  if (!kpis) return <div style={{ padding: '16px', color: t.textDim, fontSize: '12px' }}>Sin datos</div>;
  const { topBar = {}, carga = {}, ejecucion = {}, actividades = {}, riesgo = {}, proyectos = {} } = kpis;

  // ── KPIs ──
  if (id === 'kpi-util')
    return <KpiTile label="Utilización Prom." value={`${topBar.avgUtilization ?? 0}%`} color={clr(topBar.avgUtilization ?? 0)} />;
  if (id === 'kpi-sobrecarga')
    return <KpiTile label="% Sobrecargados" value={`${topBar.overloadedPercent ?? 0}%`} color={(topBar.overloadedPercent ?? 0) > 30 ? '#ef4444' : (topBar.overloadedPercent ?? 0) > 0 ? '#C77700' : '#2E7D32'} sub="> 110% capacidad" />;
  if (id === 'kpi-planeado')
    return <KpiTile label="Planeado vs Dispon." value={`${topBar.plannedVsAvailable ?? 0}%`} color={clr(topBar.plannedVsAvailable ?? 0, { low: 60, high: 100 })} />;
  if (id === 'kpi-real-plan')
    return <KpiTile label="Real vs Planeado" value={`${topBar.realVsPlanned ?? 0}%`} color={Math.abs((topBar.realVsPlanned ?? 100) - 100) < 15 ? '#2E7D32' : Math.abs((topBar.realVsPlanned ?? 100) - 100) < 30 ? '#C77700' : '#ef4444'} />;
  if (id === 'kpi-retrasadas')
    return <KpiTile label="% Retrasadas" value={`${topBar.delayedPercent ?? 0}%`} color={(topBar.delayedPercent ?? 0) > 20 ? '#ef4444' : (topBar.delayedPercent ?? 0) > 10 ? '#C77700' : '#2E7D32'} sub="Fecha vencida" />;
  if (id === 'kpi-cumplimiento')
    return <KpiTile label="Cumplimiento" value={`${ejecucion.compliancePercent ?? 0}%`} color={clr(ejecucion.compliancePercent ?? 0)} />;
  if (id === 'kpi-productividad')
    return <KpiTile label="Productividad" value={`${ejecucion.productivity ?? 0}x`} color={(ejecucion.productivity ?? 0) >= 1 ? '#2E7D32' : '#ef4444'} sub="est / real" />;
  if (id === 'kpi-leadtime')
    return <KpiTile label="Lead Time Prom." value={ejecucion.avgLeadTimeDays ?? 0} unit="días" color={(ejecucion.avgLeadTimeDays ?? 0) < 7 ? '#2E7D32' : (ejecucion.avgLeadTimeDays ?? 0) < 21 ? '#C77700' : '#ef4444'}  />;
  if (id === 'kpi-throughput')
    return <KpiTile label="Throughput" value={ejecucion.throughput ?? 0} unit="tareas" color="#8b5cf6"  sub="Completadas en periodo" />;
  if (id === 'kpi-avance')
    return <KpiTile label="Avance Prom." value={`${fmt1(actividades.avgProgress ?? 0)}%`} color={clr(actividades.avgProgress ?? 0)}  />;
  if (id === 'kpi-riesgo')
    return <KpiTile label="Índice de Riesgo" value={riesgo.riskIndex ?? 0} color={riskColor(riesgo.riskIndex ?? 0)}  sub={(riesgo.riskIndex ?? 0) >= 60 ? '🔴 Alto' : (riesgo.riskIndex ?? 0) >= 35 ? '🟡 Medio' : '🟢 Bajo'} />;

  // ── Carga ──
  if (id === 'chart-util-bar') {
    const sorted = [...(carga.userLoad || [])].sort((a, b) => b.utilization - a.utilization);
    const barData = sorted.map(u => ({ name: u.first_name, utilización: parseFloat(u.utilization.toFixed(1)) }));
    const chartHeight = Math.max(200, barData.length * 28);
    return (
      <WLCardWrapper title="Utilización por Persona (%)">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 40 }}>
            <XAxis type="number" tickFormatter={v => `${v}%`} fontSize={10} />
            <YAxis type="category" dataKey="name" fontSize={10} width={70} interval={0} />
            <Tooltip formatter={(v) => [`${v}%`, 'Utilización']} />
            <Bar dataKey="utilización" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, formatter: v => `${v}%` }}>
              {barData.map((e, i) => <Cell key={i} fill={e.utilización > 110 ? '#ef4444' : e.utilización < 70 ? '#9ca3af' : '#2E7D32'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </WLCardWrapper>
    );
  }

  if (id === 'chart-horas') {
    const sorted = [...(carga.userLoad || [])].sort((a, b) => b.utilization - a.utilization);
    const data = sorted.map(u => ({ name: u.first_name, Disponibles: parseFloat(u.hoursAvailable.toFixed(1)), Asignadas: parseFloat(u.hoursAssigned.toFixed(1)) }));
    const chartHeight = Math.max(200, data.length * 28);
    return (
      <WLCardWrapper title="Horas: Disponible vs Asignadas">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
            <XAxis type="number" fontSize={10} />
            <YAxis type="category" dataKey="name" fontSize={10} width={70} interval={0} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Disponibles" fill={t.border} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Asignadas" fill={t.accent} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </WLCardWrapper>
    );
  }

  // ── Ejecución ──
  if (id === 'chart-est-real') {
    const sumEst = carga.totalAssignedHrs || 0;
    const sumReal = Math.round((ejecucion.compliancePercent || 0) / 100 * sumEst * 10) / 10;
    const maxVal = Math.max(sumEst, sumReal, 1);
    return (
      <WLCardWrapper title="Estimadas vs Reales (hrs)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          {[
            { label: 'Horas Estimadas', value: sumEst, color: '#0072CE' },
            { label: 'Horas Reales', value: sumReal, color: ejecucion.compliancePercent > 100 ? '#ef4444' : '#2E7D32' }
          ].map(item => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px' }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: item.color }}>{fmt1(item.value)} hrs</span>
              </div>
              <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color, borderRadius: '4px' }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '6px', backgroundColor: Math.abs(ejecucion.estimationDeviation ?? 0) < 10 ? '#dcfce7' : Math.abs(ejecucion.estimationDeviation ?? 0) < 25 ? '#fef3c7' : '#fee2e2' }}>
            Desviación: <strong>{ejecucion.estimationDeviation > 0 ? '+' : ''}{ejecucion.estimationDeviation ?? 0}%</strong>
          </div>
        </div>
      </WLCardWrapper>
    );
  }

  if (id === 'chart-productividad') {
    const prod = ejecucion.productivity ?? 0;
    const prodGood = prod >= 1;
    return (
      <WLCardWrapper title="Índice de Productividad">
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', borderRadius: '50%', border: `8px solid ${prodGood ? '#2E7D32' : '#ef4444'}`, backgroundColor: prodGood ? '#dcfce7' : '#fee2e2' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: prodGood ? '#2E7D32' : '#ef4444' }}>{prod}x</div>
              <div style={{ fontSize: '10px', color: t.textDim }}>est / real</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: prodGood ? '#2E7D32' : '#ef4444' }}>
            {prodGood ? '✅ Más eficiente que estimado' : '⚠️ Por debajo del estimado'}
          </div>
        </div>
      </WLCardWrapper>
    );
  }

  // ── Actividades ──
  if (id === 'chart-act-pie') {
    const pieData = [
      { name: 'Completadas', value: actividades.completedCount ?? 0, color: '#2E7D32' },
      { name: 'En Progreso', value: actividades.inProgressCount ?? 0, color: '#0072CE' },
      { name: 'Pendientes', value: actividades.pendingCount ?? 0, color: '#C77700' },
      { name: 'Canceladas', value: actividades.cancelledCount ?? 0, color: '#9ca3af' },
    ].filter(d => d.value > 0);
    return (
      <WLCardWrapper title="Distribución por Estado">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={35}
              dataKey="value" paddingAngle={3}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} tareas`]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
          {pieData.map(d => (
            <span key={d.name} style={{ fontSize: '10px', color: t.textDim, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
              {d.name}: <strong>{d.value}</strong>
            </span>
          ))}
        </div>
      </WLCardWrapper>
    );
  }

  if (id === 'chart-flujo') {
    const items = [
      { label: 'Completadas', value: actividades.completedPercent ?? 0, color: '#2E7D32' },
      { label: 'WIP (En Progreso)', value: actividades.wipPercent ?? 0, color: '#0072CE' },
      { label: 'Pendientes', value: actividades.pendingPercent ?? 0, color: '#C77700' },
      { label: 'No Planeadas', value: actividades.unplannedPercent ?? 0, color: '#ef4444' },
    ];
    return (
      <WLCardWrapper title="Indicadores de Flujo (%)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {items.map(item => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '11px' }}>{item.label}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: item.color }}>{item.value}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, item.value)}%`, backgroundColor: item.color, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </WLCardWrapper>
    );
  }

  // ── Riesgo ──
  if (id === 'riesgo-gauge') {
    return (
      <WLCardWrapper title="Índice de Riesgo Operativo">
        <RiskGauge value={riesgo.riskIndex ?? 0} />
      </WLCardWrapper>
    );
  }

  if (id === 'riesgo-items') {
    const items = [
      { label: 'Sobrecargados', value: riesgo.overloadedCount ?? 0, color: (riesgo.overloadedCount ?? 0) > 0 ? '#ef4444' : '#2E7D32', desc: '> 110% capacidad' },
      { label: 'Tareas Críticas Retrasadas', value: riesgo.criticalDelayedCount ?? 0, color: (riesgo.criticalDelayedCount ?? 0) > 0 ? '#ef4444' : '#2E7D32', desc: 'Alta/Crítica vencidas' },
      { label: 'Retrasadas', value: riesgo.delayedCount ?? 0, icon: '⏰', color: (riesgo.delayedCount ?? 0) > 0 ? '#C77700' : '#2E7D32', desc: 'Fecha vencida' },
      { label: 'Bloqueadas', value: riesgo.blockedCount ?? 0, color: (riesgo.blockedCount ?? 0) > 0 ? '#C77700' : '#2E7D32', desc: 'Estado: Bloqueado' },
      { label: '% En Riesgo', value: `${riesgo.atRiskPercent ?? 0}%`, color: (riesgo.atRiskPercent ?? 0) > 20 ? '#ef4444' : (riesgo.atRiskPercent ?? 0) > 10 ? '#C77700' : '#2E7D32', desc: 'Retrasadas + Bloqueadas' },
      { label: 'Desviación >20%', value: `${riesgo.bigDeviationPercent ?? 0}%`, color: (riesgo.bigDeviationPercent ?? 0) > 30 ? '#ef4444' : (riesgo.bigDeviationPercent ?? 0) > 15 ? '#C77700' : '#2E7D32', desc: 'Estimación imprecisa' },
    ];
    return (
      <WLCardWrapper title="Alertas de Riesgo">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {items.map(item => (
            <div key={item.label} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}`, borderLeft: `4px solid ${item.color}` }}>
              <div style={{ fontSize: '16px' }}>{item.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>{item.label}</div>
              <div style={{ fontSize: '10px', color: t.textDim }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </WLCardWrapper>
    );
  }

  if (id === 'riesgo-recomend') {
    const recs = [];
    if ((riesgo.overloadedCount ?? 0) > 0) recs.push({ bg: '#fee2e2', color: '#B00020', msg: `${riesgo.overloadedCount} persona(s) sobrecargadas (>110%). Redistribuye actividades.` });
    if ((riesgo.criticalDelayedCount ?? 0) > 0) recs.push({ bg: '#fee2e2', color: '#B00020', msg: `${riesgo.criticalDelayedCount} tarea(s) críticas retrasadas. Atención inmediata.` });
    if ((riesgo.delayedCount ?? 0) > 0) recs.push({ bg: '#fef3c7', color: '#C77700', icon: '⏰', msg: `${riesgo.delayedCount} actividad(es) con fecha vencida. Actualiza avance.` });
    if ((riesgo.bigDeviationPercent ?? 0) > 20) recs.push({ bg: '#fef3c7', color: '#C77700', msg: `${riesgo.bigDeviationPercent}% de actividades con desviación >20%. Revisa estimaciones.` });
    if (recs.length === 0) recs.push({ bg: '#dcfce7', color: '#2E7D32', icon: '✅', msg: 'El equipo opera dentro de parámetros normales. Sin alertas.' });
    return (
      <WLCardWrapper title="Recomendaciones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recs.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: r.bg }}>
              <span>{r.icon}</span>
              <span style={{ fontSize: '12px', color: r.color }}>{r.msg}</span>
            </div>
          ))}
        </div>
      </WLCardWrapper>
    );
  }

  // ── Proyectos ──
  if (id === 'chart-kpi-hrs') {
    const kpiBarData = (proyectos.kpiDistribution || []).map(k => ({
      name: k.name || k.code || 'Sin KPI',
      Estimadas: parseFloat((k.estimated || 0).toFixed(1)),
      Reales: parseFloat((k.actual || 0).toFixed(1)),
    }));
    return (
      <WLCardWrapper title="Horas por KPI">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={kpiBarData} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v, n) => [`${v} hrs`, n]} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Estimadas" fill={t.accent} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Reales" fill={t.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </WLCardWrapper>
    );
  }

  if (id === 'chart-dept-eff') {
    const depts = (proyectos.departmentEfficiency || []).slice(0, 6);
    return (
      <WLCardWrapper title="Eficiencia por Departamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {depts.map(d => (
            <div key={d.department}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '11px' }}>{d.department}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444' }}>
                  {d.completionRate}% ✓ {d.efficiency ? `· ${d.efficiency}x` : ''}
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, d.completionRate)}%`, backgroundColor: d.completionRate >= 70 ? '#2E7D32' : d.completionRate >= 40 ? '#C77700' : '#ef4444', borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </WLCardWrapper>
    );
  }

  return <div style={{ padding: '16px', color: t.textDim, fontSize: '12px' }}>Widget "{id}" no encontrado</div>;
};

// ─── Main WorkloadDashboard ───────────────────────────────────────────────────
const WorkloadDashboard = ({ userIds, periodStart, periodEnd }) => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('workload-dashboard-tab') || 'carga');
  const handleTabChange = (id) => { setActiveTab(id); localStorage.setItem('workload-dashboard-tab', id); };
  const [startDate, setStartDate] = useState(
    periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    periodEnd || new Date().toISOString().split('T')[0]
  );

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
      <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
        Selecciona un usuario para ver el dashboard de su equipo.
      </div>
    );
  }

  const kpis = data?.kpis;
  const topBar = kpis?.topBar;

  const TABS = [
    { id: 'carga', label: 'Carga', component: TabCarga },
    { id: 'ejecucion', label: 'Ejecución', component: TabEjecucion },
    { id: 'actividades', label: 'Actividades', component: TabActividades },
    { id: 'riesgo', label: 'Riesgo', component: TabRiesgo },
    { id: 'proyectos', label: 'Proyectos / KPI', component: TabProyectos },
    { id: 'personalizado', label: 'Mi Dashboard' },
  ];

  const ActiveTabComponent = TABS.find(tab => tab.id === activeTab)?.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Period selector */}
      <div style={{
        backgroundColor: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: '10px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: '600', color: t.text, fontSize: '14px' }}>Periodo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px' }} />
          <span style={{ color: t.textMuted }}>→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px' }} />
        </div>
        <button onClick={fetchDashboard}
          style={{ padding: '6px 16px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          Actualizar
        </button>
        {data && (
          <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: 'auto' }}>
            {data.period?.days} días · {userIds.length} persona(s)
          </span>
        )}
      </div>

      {/* Top Bar KPIs */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', color: t.textMuted }}>...</div>
          Calculando KPIs...
        </div>
      ) : topBar && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            <KpiTile
              label="Utilización Promedio" size="lg"
              value={`${topBar.avgUtilization}%`}
              color={clr(topBar.avgUtilization)}
                            sub={topBar.avgUtilization > 110 ? '⚠️ Equipo sobrecargado' : topBar.avgUtilization < 70 ? 'Capacidad sin usar' : '✅ Utilización óptima'}
            />
            <KpiTile
              label="% Personas Sobrecargadas" size="lg"
              value={`${topBar.overloadedPercent}%`}
              color={topBar.overloadedPercent > 30 ? '#ef4444' : topBar.overloadedPercent > 0 ? '#C77700' : '#2E7D32'}
                            sub="> 110% de capacidad"
            />
            <KpiTile
              label="Planeado vs Disponible" size="lg"
              value={`${topBar.plannedVsAvailable}%`}
              color={clr(topBar.plannedVsAvailable, { low: 60, high: 100 })}
                            sub="Hrs estimadas / hrs capacidad"
            />
            <KpiTile
              label="Real vs Planeado" size="lg"
              value={`${topBar.realVsPlanned}%`}
              color={Math.abs(topBar.realVsPlanned - 100) < 15 ? '#2E7D32' : Math.abs(topBar.realVsPlanned - 100) < 30 ? '#C77700' : '#ef4444'}
                            sub="Hrs reales / hrs estimadas"
            />
            <KpiTile
              label="% Tareas Retrasadas" size="lg"
              value={`${topBar.delayedPercent}%`}
              color={topBar.delayedPercent > 20 ? '#ef4444' : topBar.delayedPercent > 10 ? '#C77700' : '#2E7D32'}
                            sub="Con fecha vencida"
            />
          </div>

          {/* Tab nav */}
          <div style={{
            backgroundColor: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: '10px', padding: '10px 14px',
            display: 'flex', gap: '6px', flexWrap: 'wrap'
          }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '8px 18px', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                  backgroundColor: activeTab === tab.id ? t.accent : t.bgPanel,
                  color: activeTab === tab.id ? 'white' : t.text,
                  transition: 'all 0.2s'
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          {activeTab === 'personalizado' ? (
            <CustomDashboard
              storageKey="workload-custom-dashboard-v1"
              catalog={WORKLOAD_CATALOG}
              defaultWidgets={WORKLOAD_DEFAULT}
              renderWidget={(id) => renderWorkloadWidget(id, kpis, t)}
              data={kpis}
            />
          ) : (
            ActiveTabComponent && kpis && <ActiveTabComponent kpis={kpis} />
          )}
        </>
      )}
    </div>
  );
};

export default WorkloadDashboard;
