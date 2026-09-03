import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { isUserAdmin } from '../utils/permissions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = 'http://localhost:5000';

const DEPT_PALETTE = ['#0072CE','#16a34a','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];
const fmt$ = v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
const fmtN = v => v == null ? '—' : Number(v).toLocaleString('es-MX');

const getPresets = (lang) => [
  { label: lang === 'es' ? 'Hoy' : 'Today',              days: 0  },
  { label: lang === 'es' ? 'Semana' : 'Week',            days: 7  },
  { label: lang === 'es' ? 'Mes actual' : 'This Month',  days: 30 },
  { label: lang === 'es' ? 'Trimestre' : 'Quarter',      days: 90 },
  { label: lang === 'es' ? 'Año' : 'Year',               days: 365},
  { label: lang === 'es' ? 'Todo' : 'All',               days: null},
];

const KPI = ({ label, value, sub, color, t }) => (
  <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '16px', borderLeft: `4px solid ${color || t.accent}` }}>
    <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '26px', fontWeight: '600', color: color || t.text }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>{sub}</div>}
  </div>
);

const SectionCard = ({ title, children, t }) => (
  <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
    <div style={{ fontSize: '13px', fontWeight: '600', color: t.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>{title}</div>
    {children}
  </div>
);

const DeptTable = ({ rows, cols, t }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
    <thead>
      <tr style={{ borderBottom: `2px solid ${t.border}` }}>
        {cols.map(c => <th key={c.key} style={{ padding: '6px 10px', textAlign: c.right ? 'right' : 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>{c.label}</th>)}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
          {cols.map(c => <td key={c.key} style={{ padding: '8px 10px', textAlign: c.right ? 'right' : 'left', fontWeight: c.bold ? '700' : '400', color: c.color ? c.color(row) : t.text }}>{c.fmt ? c.fmt(row[c.key], row) : row[c.key]}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

// ─── Mi Dashboard MRB ────────────────────────────────────────────────────────

const MRB_STORAGE_KEY = 'mrb-custom-dashboard-v1';

// C palette removed — use theme tokens (t.accent, t.success, t.error, t.warning, t.textMuted)

const SEV_COLORS = { Crítico: '#ef4444', ALTA: '#f97316', MEDIA: '#f59e0b', BAJA: '#16a34a' };

const KpiTile = ({ label, value, sub, color }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '14px 16px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '10px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '600', color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
};

const MRB_WIDGET_CATALOG = [
  // ── Resumen ────────────────────────────────────────────────────────────────
  { id: 'kpi-yield',         cat: 'Resumen',        label: 'Yield %',                    size: 'sm' },
  { id: 'kpi-ppm',           cat: 'Resumen',        label: 'PPM',                        size: 'sm' },
  { id: 'kpi-costo-total',   cat: 'Resumen',        label: 'Costo Total',                size: 'sm' },
  { id: 'kpi-backlog',       cat: 'Resumen',        label: 'Backlog',                    size: 'sm' },
  { id: 'kpi-cerradas',      cat: 'Resumen',        label: 'Cerradas',                   size: 'sm' },
  { id: 'chart-camp-mes',    cat: 'Resumen',        label: 'Campañas por Mes / Depto',   size: 'lg' },
  { id: 'chart-costo-mes-r', cat: 'Resumen',        label: 'Costo por Mes (Resumen)',    size: 'lg' },
  { id: 'tabla-dept-res',    cat: 'Resumen',        label: 'Contrib. por Departamento',  size: 'lg' },
  { id: 'campanas-abiertas', cat: 'Resumen',        label: 'Campañas Abiertas',          size: 'lg' },
  // ── Material ───────────────────────────────────────────────────────────────
  { id: 'kpi-scrap',         cat: 'Material',       label: 'Scrap (pzas)',               size: 'sm' },
  { id: 'kpi-rework',        cat: 'Material',       label: 'Rework (pzas)',              size: 'sm' },
  { id: 'kpi-use-as-is',     cat: 'Material',       label: 'Use As-Is (pzas)',           size: 'sm' },
  { id: 'kpi-return',        cat: 'Material',       label: 'Return (pzas)',              size: 'sm' },
  { id: 'kpi-hold',          cat: 'Material',       label: 'Hold (pzas)',                size: 'sm' },
  { id: 'chart-disp-pie',    cat: 'Material',       label: 'Distribución Disposición',   size: 'md' },
  { id: 'chart-disp-mes',    cat: 'Material',       label: 'Scrap/Rework por Mes',       size: 'lg' },
  { id: 'tabla-disp-dept',   cat: 'Material',       label: 'Disposición por Depto',      size: 'lg' },
  // ── Tiempo & Flujo ─────────────────────────────────────────────────────────
  { id: 'kpi-avg-resp',      cat: 'Tiempo & Flujo', label: 'Avg Respuesta (días)',       size: 'sm' },
  { id: 'kpi-avg-cierre',    cat: 'Tiempo & Flujo', label: 'Avg Cierre (días)',          size: 'sm' },
  { id: 'kpi-lead',          cat: 'Tiempo & Flujo', label: 'Lead Time (días)',           size: 'sm' },
  { id: 'kpi-aging14',       cat: 'Tiempo & Flujo', label: '>14 días abiertas',          size: 'sm' },
  { id: 'kpi-aging30',       cat: 'Tiempo & Flujo', label: '>30 días abiertas',          size: 'sm' },
  { id: 'tabla-aging',       cat: 'Tiempo & Flujo', label: 'Aging de Campañas',          size: 'lg' },
  // ── Costo & Impacto ────────────────────────────────────────────────────────
  { id: 'kpi-scrap-cost',    cat: 'Costo & Impacto', label: 'Scrap Cost',               size: 'sm' },
  { id: 'kpi-labor-cost',    cat: 'Costo & Impacto', label: 'Mano de Obra',             size: 'sm' },
  { id: 'kpi-total-cost',    cat: 'Costo & Impacto', label: 'Costo Total',              size: 'sm' },
  { id: 'chart-costo-mes',   cat: 'Costo & Impacto', label: 'Costo por Mes',            size: 'lg' },
  { id: 'chart-costo-dept',  cat: 'Costo & Impacto', label: 'Costo por Depto',          size: 'lg' },
  { id: 'tabla-top-costo',   cat: 'Costo & Impacto', label: 'Top 10 Campañas por Costo',size: 'lg' },
  // ── Defectos & Causa ───────────────────────────────────────────────────────
  { id: 'chart-top-defectos',cat: 'Defectos & Causa', label: 'Top Defectos',            size: 'lg' },
  { id: 'chart-sev-pie',     cat: 'Defectos & Causa', label: 'Por Severidad',           size: 'md' },
  { id: 'tabla-by-stage',    cat: 'Defectos & Causa', label: 'NOK por Etapa',           size: 'md' },
  { id: 'tabla-nok-dept',    cat: 'Defectos & Causa', label: 'NOK por Depto',           size: 'md' },
  // ── Operación ──────────────────────────────────────────────────────────────
  { id: 'kpi-pph',           cat: 'Operación',      label: 'Piezas / Hora',             size: 'sm' },
  { id: 'kpi-dph',           cat: 'Operación',      label: 'Defectos / Hora',           size: 'sm' },
  { id: 'kpi-downtime',      cat: 'Operación',      label: 'Downtime Total',            size: 'sm' },
  { id: 'kpi-hrs-inspector', cat: 'Operación',      label: 'Horas Inspector',           size: 'sm' },
  { id: 'chart-downtime',    cat: 'Operación',      label: 'Downtime por Turno',        size: 'lg' },
  { id: 'chart-down-dept',   cat: 'Operación',      label: 'Downtime por Depto',        size: 'md' },
];

const MRB_DEFAULT_WIDGETS = [
  'kpi-yield', 'kpi-backlog', 'kpi-costo-total', 'kpi-downtime',
  'chart-camp-mes', 'chart-disp-pie', 'chart-sev-pie', 'chart-costo-mes',
];

const MrbWidgetRenderer = ({ id, data }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const s  = data?.summary     || {};
  const c  = data?.cost        || {};
  const d  = data?.disposition || {};
  const o  = data?.ops         || {};
  const df = data?.defects     || {};
  const tm = data?.timing      || {};

  // ── Resumen ─────────────────────────────────────────────────────────────────
  if (id === 'kpi-yield')       return <KpiTile label="Yield" value={s.yieldPct != null ? `${s.yieldPct}%` : '—'} sub="calidad de inspección" color={parseFloat(s.yieldPct) >= 95 ? t.success : t.warning} />;
  if (id === 'kpi-ppm')         return <KpiTile label="PPM" value={s.ppm != null ? Number(s.ppm).toLocaleString('es-MX') : '—'} color={t.error} />;
  if (id === 'kpi-costo-total') return <KpiTile label="Costo Total" value={fmt$(s.totalCost || 0)} color={t.accent} />;
  if (id === 'kpi-backlog')     return <KpiTile label="Backlog" value={s.backlog ?? '—'} sub={`${s.total || 0} totales`} color={t.warning} />;
  if (id === 'kpi-cerradas')    return <KpiTile label="Cerradas" value={s.closed ?? '—'} sub={`${s.totalInsp ? Number(s.totalInsp).toLocaleString('es-MX') : 0} pzas insp.`} color={t.success} />;

  if (id === 'chart-camp-mes') {
    const { data: mdData, depts: mdDepts } = (() => {
      const months = {}, depts = new Set();
      (s.byMonthDept || []).forEach(r => { if (!months[r.month]) months[r.month] = { month: r.month }; months[r.month][r.dept] = r.count; depts.add(r.dept); });
      return { data: Object.values(months).sort((a,b) => a.month.localeCompare(b.month)), depts: [...depts] };
    })();
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Campañas por Mes / Depto</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mdData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: t.textMuted }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {mdDepts.map((dep, i) => <Bar key={dep} dataKey={dep} stackId="a" fill={DEPT_PALETTE[i % DEPT_PALETTE.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-costo-mes-r') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Costo por Mes</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={s.costByMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
            <Tooltip formatter={v => fmt$(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="scrap" name="Scrap" stackId="a" fill={t.error} />
            <Bar dataKey="labor" name="M.O." stackId="a" fill={t.warning} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'tabla-dept-res') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Contribución por Departamento</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
            {['Departamento','Backlog','Cerradas','Total','Costo'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Departamento' ? 'left' : 'right', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>{h}</th>)}
          </tr></thead>
          <tbody>{(s.byDept || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              <td style={{ padding: '6px 8px', color: t.text }}>{r.dept}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: r.backlog > 0 ? t.warning : t.text }}>{r.backlog}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: t.text }}>{r.closed}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: t.text }}>{r.total}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', color: t.accent }}>{fmt$(r.total_cost || 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  if (id === 'campanas-abiertas') {
    const open = data?.openCampaigns || [];
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>Campañas Abiertas ({open.length})</div>
        {open.length === 0
          ? <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', padding: '12px' }}>✓ Sin campañas abiertas</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
              {open.map((camp, i) => (
                <div key={i} onClick={() => navigate(`/mrb-campaign/${camp.id}`)}
                  style={{ padding: '7px 10px', backgroundColor: t.bgPanel, borderRadius: '5px', borderLeft: `3px solid ${t.warning}`, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: t.accent }}>{camp.campaignNumber || camp.campaign_number}</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>{camp.title}</div>
                </div>
              ))}
            </div>}
      </div>
    );
  }

  // ── Material ────────────────────────────────────────────────────────────────
  if (id === 'kpi-scrap')     return <KpiTile label="Scrap" value={Number(d.scrap || 0).toLocaleString('es-MX')} sub="piezas" color={t.error} />;
  if (id === 'kpi-rework')    return <KpiTile label="Rework" value={Number(d.rework || 0).toLocaleString('es-MX')} sub="piezas" color={t.warning} />;
  if (id === 'kpi-use-as-is') return <KpiTile label="Use As-Is" value={Number(d.use_as_is || 0).toLocaleString('es-MX')} sub="piezas" color={t.success} />;
  if (id === 'kpi-return')    return <KpiTile label="Return" value={Number(d.return_sup || 0).toLocaleString('es-MX')} sub="piezas" color={t.accent} />;
  if (id === 'kpi-hold')      return <KpiTile label="Hold" value={Number(d.hold || 0).toLocaleString('es-MX')} sub="piezas" color={t.textMuted} />;

  if (id === 'chart-disp-pie') {
    const pieData = [
      { name: 'Scrap',     value: d.scrap      || 0, fill: t.error    },
      { name: 'Rework',    value: d.rework     || 0, fill: t.warning },
      { name: 'Use As-Is', value: d.use_as_is  || 0, fill: t.success  },
      { name: 'Return',    value: d.return_sup || 0, fill: t.accent },
      { name: 'Hold',      value: d.hold       || 0, fill: t.textMuted   },
    ].filter(x => x.value > 0);
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>Distribución Disposición</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
              {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-disp-mes') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Scrap / Rework por Mes</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={d.byMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: t.textMuted }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="scrap" stroke={t.error} strokeWidth={2} dot={{ r: 3 }} name="Scrap" />
            <Line type="monotone" dataKey="rework" stroke={t.warning} strokeWidth={2} dot={{ r: 3 }} name="Rework" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'tabla-disp-dept') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Disposición por Depto</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
            {['Depto','Scrap','Rework','Use As-Is','Return','Hold'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Depto' ? 'left' : 'right', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>{h}</th>)}
          </tr></thead>
          <tbody>{(d.byDept || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              <td style={{ padding: '5px 8px', color: t.text }}>{r.dept}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.error, fontWeight: '600' }}>{r.scrap}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.warning }}>{r.rework}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.text }}>{r.use_as_is}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.text }}>{r.return_sup}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.text }}>{r.hold}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  // ── Tiempo & Flujo ──────────────────────────────────────────────────────────
  if (id === 'kpi-avg-resp')  return <KpiTile label="Avg Respuesta" value={tm.avg_response_days != null ? `${tm.avg_response_days} días` : '—'} color={t.accent} />;
  if (id === 'kpi-avg-cierre') return <KpiTile label="Avg Cierre" value={tm.avg_close_days != null ? `${tm.avg_close_days} días` : '—'} color={t.success} />;
  if (id === 'kpi-lead')      return <KpiTile label="Lead Time" value={tm.avg_lead_days != null ? `${tm.avg_lead_days} días` : '—'} color={t.accent} />;
  if (id === 'kpi-aging14')   return <KpiTile label=">14 días abiertas" value={tm.aging_14 ?? '—'} color={tm.aging_14 > 0 ? t.warning : t.success} />;
  if (id === 'kpi-aging30')   return <KpiTile label=">30 días abiertas" value={tm.aging_30 ?? '—'} color={tm.aging_30 > 0 ? t.error : t.success} />;

  if (id === 'tabla-aging') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Aging de Campañas</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
              {['Folio','Título','Depto','Estado','Días'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Días' ? 'right' : 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>{h}</th>)}
            </tr></thead>
            <tbody>{(tm.aging || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '5px 8px', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{r.campaign_number}</td>
                <td style={{ padding: '5px 8px', color: t.text, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                <td style={{ padding: '5px 8px', color: t.textMuted }}>{r.dept}</td>
                <td style={{ padding: '5px 8px', color: t.text }}>{r.status}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: r.age_days >= 30 ? t.error : r.age_days >= 14 ? t.warning : t.text }}>{r.age_days}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Costo & Impacto ─────────────────────────────────────────────────────────
  if (id === 'kpi-scrap-cost') return <KpiTile label="Scrap Cost" value={fmt$(c.scrapCost || 0)} color={t.error} />;
  if (id === 'kpi-labor-cost') return <KpiTile label="Mano de Obra" value={fmt$(c.laborCost || 0)} color={t.warning} />;
  if (id === 'kpi-total-cost') return <KpiTile label="Costo Total" value={fmt$(c.totalCost || 0)} color={t.accent} />;

  if (id === 'chart-costo-mes') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Costo por Mes</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={s.costByMonth || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
            <Tooltip formatter={v => fmt$(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="scrap" name="Scrap" stackId="a" fill={t.error} />
            <Bar dataKey="labor" name="M.O." stackId="a" fill={t.warning} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-costo-dept') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Costo por Depto</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={c.byDept || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 9, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
            <YAxis type="category" dataKey="dept" tick={{ fontSize: 9, fill: t.textMuted }} width={56} />
            <Tooltip formatter={v => fmt$(v)} />
            <Bar dataKey="scrap_cost" name="Scrap" stackId="a" fill={t.error} />
            <Bar dataKey="labor_cost" name="M.O." stackId="a" fill={t.warning} radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'tabla-top-costo') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Top Campañas por Costo</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
              {['Folio','Título','Scrap','M.O.','Total'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: ['Scrap','M.O.','Total'].includes(h) ? 'right' : 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>{h}</th>)}
            </tr></thead>
            <tbody>{(c.byCampaign || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '5px 8px', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{r.campaign_number}</td>
                <td style={{ padding: '5px 8px', color: t.text, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: t.error }}>{fmt$(r.scrap_cost || 0)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: t.warning }}>{fmt$(r.labor_cost || 0)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: t.accent }}>{fmt$(r.total_cost || 0)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Defectos & Causa ────────────────────────────────────────────────────────
  if (id === 'chart-top-defectos') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Top Defectos</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={(df.top || []).slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis type="category" dataKey="defect" tick={{ fontSize: 9, fill: t.textMuted }} width={80} />
            <Tooltip />
            <Bar dataKey="qty" name="Piezas NOK" fill={t.error} radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-sev-pie') {
    const sevData = (df.bySeverity || []).map((r, i) => ({ name: r.severity, value: r.qty_nok || 0, fill: SEV_COLORS[r.severity] || DEPT_PALETTE[i] }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>NOK por Severidad</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={sevData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
              {sevData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'tabla-by-stage') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>NOK por Etapa</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Etapa</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Piezas NOK</th>
          </tr></thead>
          <tbody>{(df.byStage || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              <td style={{ padding: '5px 8px', color: t.text }}>{r.stage}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: t.error }}>{r.qty}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  if (id === 'tabla-nok-dept') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>NOK por Depto</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Departamento</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Piezas NOK</th>
          </tr></thead>
          <tbody>{(df.byDept || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              <td style={{ padding: '5px 8px', color: t.text }}>{r.dept}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: r.qty > 0 ? t.error : t.text }}>{r.qty}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  // ── Operación ───────────────────────────────────────────────────────────────
  if (id === 'kpi-pph')          return <KpiTile label="Piezas / Hora" value={o.piecesPerHour ?? '—'} sub={`${Number(o.inspectorHours || 0).toFixed(1)} hrs inspector`} color={t.accent} />;
  if (id === 'kpi-dph')          return <KpiTile label="Defectos / Hora" value={o.defectsPerHour ?? '—'} color={t.error} />;
  if (id === 'kpi-downtime')     return <KpiTile label="Downtime Total" value={o.totalDowntime ? `${Number(o.totalDowntime).toLocaleString('es-MX')} min` : '0 min'} color={t.warning} />;
  if (id === 'kpi-hrs-inspector') return <KpiTile label="Horas Inspector" value={o.inspectorHours ? `${parseFloat(o.inspectorHours).toFixed(1)} h` : '—'} color={t.accent} />;

  if (id === 'chart-downtime') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Downtime por Turno</div>
        {(o.byShift || []).length === 0
          ? <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', padding: '20px' }}>Sin registros</div>
          : <ResponsiveContainer width="100%" height={180}>
              <BarChart data={o.byShift}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="shift" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
                <Tooltip />
                <Bar dataKey="minutes" name="Minutos" fill={t.warning} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>}
      </div>
    );
  }

  if (id === 'chart-down-dept') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>Downtime por Depto</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: `2px solid ${t.border}` }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Departamento</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', color: t.textMuted, fontWeight: '600', fontSize: '10px' }}>Minutos</th>
          </tr></thead>
          <tbody>{(o.byDept || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
              <td style={{ padding: '5px 8px', color: t.text }}>{r.dept}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600', color: r.minutes > 0 ? t.warning : t.text }}>{r.minutes}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  return null;
};

const SIZE_COLS = { sm: 1, md: 2, lg: 2, xl: 4 };
const WIDGET_SIZES = [
  { key: 'sm', label: 'Pequeño',      cols: 1, desc: '1/4 pantalla' },
  { key: 'md', label: 'Mediano',      cols: 2, desc: '2/4 pantalla' },
  { key: 'lg', label: 'Medio grande', cols: 2, desc: '2/4 pantalla' },
  { key: 'xl', label: 'Grande',       cols: 4, desc: 'Pantalla completa' },
];

const migrateMrb = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'string') return raw.map(id => ({ id, size: MRB_WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' }));
  return raw;
};

const MrbSortableWidget = ({ item, data, editMode, onRemove }) => {
  const { theme: t } = useTheme();
  const isKpi = item.size === 'sm';
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    gridColumn: `span ${SIZE_COLS[item.size] || 1}`,
    backgroundColor: t.bgCard, border: `1px solid ${isDragging ? t.accent : t.border}`,
    borderRadius: '8px', padding: isKpi ? '0' : '14px', position: 'relative',
    minHeight: isKpi ? 'auto' : '120px',
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.4 : 1,
    boxShadow: isDragging ? `0 8px 24px ${t.accent}33` : 'none',
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div ref={setActivatorNodeRef} {...listeners} {...attributes} title="Arrastrar"
        style={{ position: 'absolute', top: isKpi ? '50%' : '8px', left: '6px', transform: isKpi ? 'translateY(-50%)' : 'none', zIndex: 5, cursor: 'grab', color: editMode ? t.accent : t.border, fontSize: '14px', padding: '2px', borderRadius: '3px', userSelect: 'none', opacity: editMode ? 1 : 0.35 }}
        onMouseEnter={e => { e.currentTarget.style.color = t.accent; e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.color = editMode ? t.accent : t.border; e.currentTarget.style.opacity = editMode ? '1' : '0.35'; }}
      >⠿</div>
      {editMode && (
        <button onClick={() => onRemove(item.id)} style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 5, width: '18px', height: '18px', borderRadius: '50%', backgroundColor: t.error, border: 'none', color: 'white', fontSize: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      )}
      <div style={{ paddingLeft: isKpi ? '20px' : '0' }}>
        <MrbWidgetRenderer id={item.id} data={data} />
      </div>
    </div>
  );
};

const MrbDragGhost = ({ id }) => {
  const { theme: t } = useTheme();
  const meta = MRB_WIDGET_CATALOG.find(w => w.id === id);
  return (
    <div style={{ backgroundColor: t.bgCard, border: `2px solid ${t.accent}`, borderRadius: '8px', padding: '14px', boxShadow: `0 16px 40px ${t.accent}44`, opacity: 0.95, minWidth: '200px', transform: 'rotate(2deg)' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: t.accent }}>{meta?.icon} {meta?.label}</div>
      <div style={{ fontSize: '10px', color: t.textMuted }}>Arrastrando…</div>
    </div>
  );
};

const MrbTabPersonalizado = ({ data }) => {
  const { theme: t } = useTheme();
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(MRB_STORAGE_KEY);
      return raw ? migrateMrb(JSON.parse(raw)) : MRB_DEFAULT_WIDGETS.map(id => ({ id, size: MRB_WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' }));
    } catch { return MRB_DEFAULT_WIDGETS.map(id => ({ id, size: MRB_WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' })); }
  });
  const [editMode,      setEditMode]      = useState(false);
  const [activeId,      setActiveId]      = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [pendingWidget, setPendingWidget] = useState(null);

  const save     = (next) => { setSelected(next); localStorage.setItem(MRB_STORAGE_KEY, JSON.stringify(next)); };
  const reset    = () => save(MRB_DEFAULT_WIDGETS.map(id => ({ id, size: MRB_WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' })));
  const clearAll = () => save([]);
  const remove   = (id) => save(selected.filter(s => s.id !== id));

  const toggleWidget = (w) => {
    if (selected.some(s => s.id === w.id)) { save(selected.filter(s => s.id !== w.id)); }
    else { setPendingWidget(w); }
  };
  const addWithSize = (size) => {
    if (!pendingWidget) return;
    save([...selected, { id: pendingWidget.id, size }]);
    setPendingWidget(null);
  };
  const closeModal = () => { setShowModal(false); setPendingWidget(null); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragStart = ({ active }) => setActiveId(active.id);
  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oi = selected.findIndex(s => s.id === active.id), ni = selected.findIndex(s => s.id === over.id);
    if (oi === -1 || ni === -1) return;
    save(arrayMove(selected, oi, ni));
  };

  const cats = [...new Set(MRB_WIDGET_CATALOG.map(w => w.cat))];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>Mi Dashboard MRB</div>
          <div style={{ fontSize: '11px', color: t.textMuted }}>
            {selected.length} widget{selected.length !== 1 ? 's' : ''} activo{selected.length !== 1 ? 's' : ''}
            {!editMode && selected.length > 0 && <span style={{ marginLeft: '6px', color: t.border }}>· arrastra ⠿ para reordenar</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editMode && <>
            <button onClick={() => setShowModal(true)} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.accent}`, backgroundColor: t.accent + '12', color: t.accent, cursor: 'pointer', fontWeight: '600' }}>＋ Widgets</button>
            <button onClick={reset}    style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>Restablecer</button>
            <button onClick={clearAll} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.error}44`, backgroundColor: t.error + '12', color: t.error, cursor: 'pointer' }}>Limpiar todo</button>
          </>}
          <button onClick={() => setEditMode(e => !e)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: editMode ? `2px solid ${t.accent}` : `1px solid ${t.border}`, backgroundColor: editMode ? t.accent + '18' : t.bgPanel, color: editMode ? t.accent : t.text, cursor: 'pointer' }}>
            {editMode ? '✓ Listo' : '✏️ Personalizar'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {selected.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted }}>
            <div style={{ fontSize: '14px', marginBottom: '10px', color: t.textMuted }}>—</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>Tu dashboard está vacío</div>
            <div style={{ fontSize: '12px', marginTop: '6px' }}>Haz clic en <strong>✏️ Personalizar</strong> para agregar widgets</div>
          </div>
        : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={selected.map(s => s.id)} strategy={rectSortingStrategy}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
                {selected.map(item => <MrbSortableWidget key={item.id} item={item} data={data} editMode={editMode} onRemove={remove} />)}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeId ? <MrbDragGhost id={activeId} /> : null}
            </DragOverlay>
          </DndContext>}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '92%', maxHeight: '82vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: t.text }}>{pendingWidget ? `Tamaño — ${pendingWidget.label}` : 'Widgets del Dashboard'}</h2>
                {pendingWidget && <button onClick={() => setPendingWidget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.accent, fontSize: '12px', padding: 0, marginTop: '4px' }}>← Volver al catálogo</button>}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>
            {!pendingWidget && (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: t.textMuted }}>{selected.length} activo{selected.length !== 1 ? 's' : ''} — click en activo para quitar, en inactivo para agregar con tamaño</p>
                {cats.map(cat => (
                  <div key={cat} style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid ${t.border}` }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {MRB_WIDGET_CATALOG.filter(w => w.cat === cat).map(item => {
                        const active = selected.some(s => s.id === item.id);
                        return (
                          <button key={item.id} onClick={() => toggleWidget(item)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${active ? t.accent : t.border}`, backgroundColor: active ? t.accent + '18' : t.bgPanel, color: active ? t.accent : t.text, cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '500' }}>
                            <span style={{ fontSize: '14px' }}>{item.icon}</span><span>{item.label}</span>{active && <span style={{ fontSize: '11px', fontWeight: '600' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
            {pendingWidget && (
              <div>
                <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '20px' }}>Selecciona qué espacio ocupará en el grid (4 columnas total):</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {WIDGET_SIZES.map(sz => {
                    const isRec = sz.key === (pendingWidget.size || 'sm');
                    return (
                      <button key={sz.key} onClick={() => addWithSize(sz.key)} style={{ padding: '18px 16px', borderRadius: '10px', border: `2px solid ${isRec ? t.accent : t.border}`, backgroundColor: isRec ? t.accent + '15' : t.bgPanel, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.backgroundColor = t.accent + '15'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = isRec ? t.accent : t.border; e.currentTarget.style.backgroundColor = isRec ? t.accent + '15' : t.bgPanel; }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                          {[1,2,3,4].map(i => <div key={i} style={{ height: '10px', flex: 1, borderRadius: '3px', backgroundColor: i <= sz.cols ? t.accent : t.border }} />)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{sz.label}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{sz.desc}</div>
                        {isRec && <div style={{ fontSize: '10px', color: t.accent, fontWeight: '600', marginTop: '4px' }}>Recomendado</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Pivot byMonthDept → [{month, dept1: n, dept2: n, ...}]
const pivotByMonthDept = (rows) => {
  const months = {}, depts = new Set();
  rows.forEach(r => {
    if (!months[r.month]) months[r.month] = { month: r.month };
    months[r.month][r.dept] = r.count;
    depts.add(r.dept);
  });
  return { data: Object.values(months).sort((a,b) => a.month.localeCompare(b.month)), depts: [...depts] };
};

const TT = ({ t }) => ({ contentStyle: { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '12px' } });

const MRBDashboard = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { subscribe } = useSocket();
  const PRESETS = getPresets(language);

  // Traducciones locales
  const L = {
    en: {
      title: 'MRB Dashboard',
      subtitle: 'Material Review Board Analytics',
      thisMonth: 'This Month',
      filters: 'Filters',
      department: 'Department',
      client: 'Client',
      severity: 'Severity',
      allDepartments: 'All departments',
      allClients: 'All clients',
      allSeverities: 'All severities',
      reset: 'Reset',
      loading: 'Loading...',
      // Tabs
      tabSummary: 'Summary',
      tabMaterial: 'Material',
      tabTimeFlow: 'Time & Flow',
      tabCostImpact: 'Cost & Impact',
      tabDefectsCause: 'Defects & Cause',
      tabOperation: 'Operation',
      tabMyDashboard: 'My Dashboard',
      // KPIs
      qualityInspection: 'quality inspection',
      total: 'total',
      pcsInspected: 'pcs inspected',
      // Tables
      deptContribution: 'Contribution by Department',
      campaigns: 'Campaigns',
      inspected: 'Inspected',
      nokPcs: 'NOK Pcs',
      cost: 'Cost',
      openCampaigns: 'Open Campaigns',
      id: 'ID',
      reason: 'Reason',
      daysOpen: 'Days Open',
      go: 'Go',
      noCampaigns: 'No open campaigns',
      // Material
      dispositionDist: 'Disposition Distribution',
      scrapReworkByMonth: 'Scrap/Rework by Month',
      dispositionByDept: 'Disposition by Dept',
      pieces: 'Pieces',
      // Time
      campaignAging: 'Campaign Aging',
      campaign: 'Campaign',
      created: 'Created',
      days: 'Days',
      status: 'Status',
      // Cost
      costByMonth: 'Cost by Month',
      costByDept: 'Cost by Dept',
      top10ByCost: 'Top 10 Campaigns by Cost',
      scrapCost: 'Scrap Cost',
      laborCost: 'Labor Cost',
      totalCost: 'Total Cost',
      // Defects
      topDefects: 'Top Defects',
      bySeverity: 'By Severity',
      nokByStage: 'NOK by Stage',
      nokByDept: 'NOK by Dept',
      stage: 'Stage',
      count: 'Count',
      // Operation
      downtimeByShift: 'Downtime by Shift',
      downtimeByDept: 'Downtime by Dept',
      pcsPerHour: 'Pieces / Hour',
      defectsPerHour: 'Defects / Hour',
      totalDowntime: 'Total Downtime',
      inspectorHours: 'Inspector Hours',
      // My Dashboard
      dashboardWidgets: 'Dashboard Widgets',
      size: 'Size',
      small: 'Small',
      medium: 'Medium',
      mediumLarge: 'Medium Large',
      large: 'Large',
      addWidget: 'Add Widget',
      cancel: 'Cancel',
      edit: 'Edit',
      done: 'Done',
      resetDashboard: 'Reset Dashboard'
    },
    es: {
      title: 'MRB Dashboard',
      subtitle: 'Analíticas Material Review Board',
      thisMonth: 'Mes actual',
      filters: 'Filtros',
      department: 'Departamento',
      client: 'Cliente',
      severity: 'Severidad',
      allDepartments: 'Todos los departamentos',
      allClients: 'Todos los clientes',
      allSeverities: 'Todas las severidades',
      reset: 'Reset',
      loading: 'Cargando...',
      // Tabs
      tabSummary: 'Resumen',
      tabMaterial: 'Material',
      tabTimeFlow: 'Tiempo & Flujo',
      tabCostImpact: 'Costo & Impacto',
      tabDefectsCause: 'Defectos & Causa',
      tabOperation: 'Operación',
      tabMyDashboard: 'Mi Dashboard',
      // KPIs
      qualityInspection: 'calidad de inspección',
      total: 'totales',
      pcsInspected: 'pzas insp.',
      // Tables
      deptContribution: 'Contrib. por Departamento',
      campaigns: 'Campañas',
      inspected: 'Inspecc.',
      nokPcs: 'NOK Pzas',
      cost: 'Costo',
      openCampaigns: 'Campañas Abiertas',
      id: 'ID',
      reason: 'Razón',
      daysOpen: 'Días Abierta',
      go: 'Ir',
      noCampaigns: 'Sin campañas abiertas',
      // Material
      dispositionDist: 'Distribución Disposición',
      scrapReworkByMonth: 'Scrap/Rework por Mes',
      dispositionByDept: 'Disposición por Depto',
      pieces: 'Piezas',
      // Time
      campaignAging: 'Aging de Campañas',
      campaign: 'Campaña',
      created: 'Creada',
      days: 'Días',
      status: 'Estado',
      // Cost
      costByMonth: 'Costo por Mes',
      costByDept: 'Costo por Depto',
      top10ByCost: 'Top 10 Campañas por Costo',
      scrapCost: 'Scrap Cost',
      laborCost: 'Mano de Obra',
      totalCost: 'Costo Total',
      // Defects
      topDefects: 'Top Defectos',
      bySeverity: 'Por Severidad',
      nokByStage: 'NOK por Etapa',
      nokByDept: 'NOK por Depto',
      stage: 'Etapa',
      count: 'Cantidad',
      // Operation
      downtimeByShift: 'Downtime por Turno',
      downtimeByDept: 'Downtime por Depto',
      pcsPerHour: 'Piezas / Hora',
      defectsPerHour: 'Defectos / Hora',
      totalDowntime: 'Downtime Total',
      inspectorHours: 'Horas Inspector',
      // My Dashboard
      dashboardWidgets: 'Widgets del Dashboard',
      size: 'Tamaño',
      small: 'Pequeño',
      medium: 'Mediano',
      mediumLarge: 'Medio grande',
      large: 'Grande',
      addWidget: 'Agregar Widget',
      cancel: 'Cancelar',
      edit: 'Editar',
      done: 'Listo',
      resetDashboard: 'Reset Dashboard'
    }
  }[language] || {};

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('resumen');
  const [preset, setPreset]       = useState(language === 'es' ? 'Mes actual' : 'This Month');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [deptId, setDeptId]       = useState('');
  const [clientId, setClientId]   = useState('');
  const [severityId, setSeverityId] = useState('');
  const [depts, setDepts]         = useState([]);
  const [clients, setClients]     = useState([]);
  const [severities, setSeverities] = useState([]);
  const [openCampaigns, setOpenCampaigns] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Ref para capturar el dashboard en PDF
  const dashboardRef = useRef(null);

  // Load filter catalogs + open campaigns once
  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/departments`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/clients/list`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/inspection-catalogs/severities`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/mrb/active-campaigns`, { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([d, c, s, ac]) => {
      setDepts(d.departments || d.items || []);
      setClients(c.clients || c.items || c.data || []);
      setSeverities(s.severities || s.items || s.data || []);
      setOpenCampaigns(ac.campaigns || []);
    });
  }, []);

  // Apply preset
  const applyPreset = useCallback((name) => {
    setPreset(name);
    const p = PRESETS.find(p => p.label === name);
    if (!p) return;
    const to = new Date().toISOString().split('T')[0];
    if (p.days === null) { setDateFrom(''); setDateTo(''); return; }
    if (p.days === 0)    { setDateFrom(to); setDateTo(to); return; }
    const from = new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0];
    setDateFrom(from); setDateTo(to);
  }, []);

  useEffect(() => { applyPreset(L.thisMonth); }, [applyPreset, L.thisMonth]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom)   params.set('dateFrom', dateFrom);
    if (dateTo)     params.set('dateTo', dateTo);
    if (deptId)     params.set('departmentId', deptId);
    if (clientId)   params.set('clientId', clientId);
    if (severityId) params.set('severityId', severityId);
    try {
      const res = await fetch(`${API_URL}/mrb/dashboard?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setData(d);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, deptId, clientId, severityId]);

  useEffect(() => { if (dateFrom !== undefined) loadData(); }, [loadData]);

  // WebSocket: Escuchar eventos de MRB para actualización en tiempo real
  useEffect(() => {
    const events = ['mrb:inspection', 'package:received'];
    const unsubscribes = events.map(event =>
      subscribe(event, (data) => {
        console.log(`WebSocket [${event}]:`, data);
        loadData();
      })
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, loadData]);

  // ============================================================================
  // FUNCIONES DE EXPORTACIÓN
  // ============================================================================
  const getFilterLabel = useCallback(() => {
    let label = preset || `${dateFrom || ''} - ${dateTo || ''}`;
    if (deptId) {
      const dept = depts.find(d => d.id === parseInt(deptId));
      if (dept) label += ` | Depto: ${dept.name}`;
    }
    if (clientId) {
      const client = clients.find(c => c.id === parseInt(clientId));
      if (client) label += ` | Cliente: ${client.name}`;
    }
    if (severityId) {
      const sev = severities.find(s => s.id === parseInt(severityId));
      if (sev) label += ` | Severidad: ${sev.name}`;
    }
    return label;
  }, [preset, dateFrom, dateTo, deptId, depts, clientId, clients, severityId, severities]);

  const exportToPDF = useCallback(async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: 'white'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth * 0.75, imgHeight * 0.75 + 100]
      });

      const filterInfo = getFilterLabel();
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MRB Dashboard', 20, 30);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Periodo: ${filterInfo}`, 20, 50);
      pdf.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 20, 65);

      pdf.addImage(imgData, 'PNG', 0, 90, imgWidth * 0.75, imgHeight * 0.75);

      const fileName = `MRB_Dashboard_${dateFrom || 'all'}_${dateTo || 'all'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      alert(language === 'es' ? 'Error al exportar a PDF' : 'Error exporting to PDF');
    } finally {
      setExporting(false);
    }
  }, [getFilterLabel, dateFrom, dateTo, language]);

  // ============================================================================
  // EXPORTACIÓN A EXCEL
  // ============================================================================
  const exportToExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (dateFrom) params.append('start_date', dateFrom);
      if (dateTo) params.append('end_date', dateTo);
      if (deptId) params.append('department_id', deptId);

      const response = await fetch(`${API_URL}/mrb/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error fetching export data');
      }

      const { campaigns, byDepartment, bySeverity, byClient, byPart, monthlyTrend } = result.data;

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja 1: Todas las campañas MRB
      if (campaigns && campaigns.length > 0) {
        const campaignData = campaigns.map(c => ({
          'Folio': c.campaignNumber || '',
          'Título': c.title || '',
          'Estado': c.status || '',
          'Cliente': c.clientName || '',
          'Proyecto': c.projectNumber || '',
          'Número Parte': c.partNumber || '',
          'Nombre Parte': c.partName || '',
          'Departamento': c.department || '',
          'Severidad': c.severity || '',
          'Descripción': c.defectDescription || '',
          'Origen': c.sourceType || '',
          'Pzas NOK': c.qtyNok || 0,
          'Pzas Scrap': c.qtyScrap || 0,
          'Pzas Rework': c.qtyRework || 0,
          'Pzas Use As-Is': c.qtyUseAsIs || 0,
          'Pzas Return': c.qtyReturn || 0,
          'Pzas Hold': c.qtyHold || 0,
          'Costo Scrap': c.scrapCost || 0,
          'Costo M.O.': c.laborCost || 0,
          'Downtime (min)': c.downtimeMinutes || 0,
          'Causa Raíz': c.rootCause || '',
          'Acción Inmediata': c.immediateAction || '',
          'Contención': c.containmentAction || '',
          'Fecha Creación': c.createdAt ? new Date(c.createdAt).toLocaleString('es-MX') : '',
          'Fecha Cierre': c.closedAt ? new Date(c.closedAt).toLocaleString('es-MX') : '',
          'Creado Por': c.createdBy || '',
          'Cerrado Por': c.closedBy || '',
          'Días Abierta': c.daysOpen ? Math.round(c.daysOpen * 10) / 10 : ''
        }));
        const ws1 = XLSX.utils.json_to_sheet(campaignData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Campañas MRB');
      }

      // Hoja 2: Por Departamento
      if (byDepartment && byDepartment.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(byDepartment.map(r => ({
          'Departamento': r.department || 'Sin departamento',
          'Total Campañas': r.totalCampaigns,
          'Cerradas': r.closed,
          'Abiertas': r.open,
          'Total NOK': r.totalNok,
          'Total Scrap': r.totalScrap,
          'Total Rework': r.totalRework,
          'Costo Scrap': r.scrapCost || 0,
          'Costo M.O.': r.laborCost || 0,
          'Downtime (min)': r.totalDowntime || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws2, 'Por Departamento');
      }

      // Hoja 3: Por Severidad
      if (bySeverity && bySeverity.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(bySeverity.map(r => ({
          'Severidad': r.severity || 'Sin severidad',
          'Código': r.severityCode || '',
          'Total Campañas': r.totalCampaigns,
          'Total NOK': r.totalNok,
          'Total Scrap': r.totalScrap,
          'Costo Scrap': r.scrapCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws3, 'Por Severidad');
      }

      // Hoja 4: Por Cliente
      if (byClient && byClient.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(byClient.map(r => ({
          'Cliente': r.client || 'Sin cliente',
          'Total Campañas': r.totalCampaigns,
          'Cerradas': r.closed,
          'Total NOK': r.totalNok,
          'Total Scrap': r.totalScrap,
          'Costo Total': r.totalCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws4, 'Por Cliente');
      }

      // Hoja 5: Por Parte
      if (byPart && byPart.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(byPart.map(r => ({
          'Número Parte': r.partNumber || 'Sin parte',
          'Nombre Parte': r.partName || '',
          'Cliente': r.client || '',
          'Total Campañas': r.totalCampaigns,
          'Total NOK': r.totalNok,
          'Total Scrap': r.totalScrap,
          'Costo Scrap': r.scrapCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws5, 'Por Parte');
      }

      // Hoja 6: Tendencia Mensual
      if (monthlyTrend && monthlyTrend.length > 0) {
        const ws6 = XLSX.utils.json_to_sheet(monthlyTrend.map(r => ({
          'Mes': r.month,
          'Campañas': r.campaigns,
          'NOK': r.nok,
          'Scrap': r.scrap,
          'Costo Total': r.totalCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws6, 'Tendencia Mensual');
      }

      // Guardar archivo
      const fileName = `MRB_Datos_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert(language === 'es' ? 'Error al exportar a Excel' : 'Error exporting to Excel');
    } finally {
      setExportingExcel(false);
    }
  }, [dateFrom, dateTo, deptId, language]);

  const TABS = [
    { id: 'resumen',       label: L.tabSummary       },
    { id: 'disposicion',   label: L.tabMaterial      },
    { id: 'tiempo',        label: L.tabTimeFlow      },
    { id: 'costo',         label: L.tabCostImpact    },
    { id: 'defectos',      label: L.tabDefectsCause  },
    { id: 'operacion',     label: L.tabOperation     },
    { id: 'personalizado', label: L.tabMyDashboard   },
  ];

  const tt = TT({ t });

  const renderFilters = () => (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
      {/* Presets */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.label)} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'pointer', backgroundColor: preset === p.label ? t.accent : t.bgPanel, color: preset === p.label ? '#fff' : t.text }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ width: '1px', height: '30px', backgroundColor: t.border }} />
      {/* Date range */}
      <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgInput, color: t.text }} />
      <span style={{ color: t.textMuted, fontSize: '12px' }}>→</span>
      <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgInput, color: t.text }} />
      <div style={{ width: '1px', height: '30px', backgroundColor: t.border }} />
      {/* Dropdowns */}
      {[
        { val: deptId,     set: setDeptId,     items: depts,      label: L.department, key: 'name' },
        { val: clientId,   set: setClientId,   items: clients,    label: L.client,     key: 'name' },
        { val: severityId, set: setSeverityId, items: severities, label: L.severity,   key: 'name' },
      ].map(f => (
        <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgInput, color: t.text }}>
          <option value="">{f.label}</option>
          {f.items.map(i => <option key={i.id} value={i.id}>{i[f.key]}</option>)}
        </select>
      ))}
      <button onClick={() => { setDeptId(''); setClientId(''); setSeverityId(''); applyPreset(L.thisMonth); }} style={{ padding: '5px 10px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>↺ {L.reset}</button>
    </div>
  );

  // ── SECCIÓN 1: RESUMEN ────────────────────────────────────────────────────
  const renderResumen = () => {
    const s = data?.summary || {};
    const { data: mdData, depts: mdDepts } = pivotByMonthDept(s.byMonthDept || []);
    const costMonth = s.costByMonth || [];

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
          <KPI label="Yield" value={s.yieldPct != null ? `${s.yieldPct}%` : '—'} color={parseFloat(s.yieldPct) >= 95 ? t.success : t.warning} t={t} />
          <KPI label="PPM" value={s.ppm != null ? fmtN(s.ppm) : '—'} color={t.error} t={t} />
          <KPI label={L.totalCost} value={fmt$(s.totalCost || 0)} color={t.accent} t={t} />
          <KPI label="Backlog" value={s.backlog} sub={`${s.total || 0} ${L.total}`} color={t.warning} t={t} />
          <KPI label={language === 'es' ? 'Cerradas' : 'Closed'} value={s.closed} sub={`${s.totalInsp ? fmtN(s.totalInsp) : 0} ${L.pcsInspected}`} color={t.success} t={t} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <SectionCard title={language === 'es' ? 'Campañas por Mes y Departamento' : 'Campaigns by Month & Dept'} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mdData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
                <Tooltip {...tt} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {mdDepts.map((d, i) => <Bar key={d} dataKey={d} stackId="a" fill={DEPT_PALETTE[i % DEPT_PALETTE.length]} radius={i === mdDepts.length - 1 ? [4,4,0,0] : [0,0,0,0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title={language === 'es' ? 'Costo por Mes (Scrap + Mano de Obra)' : 'Cost by Month (Scrap + Labor)'} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costMonth} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
                <Tooltip {...tt} formatter={v => fmt$(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="scrap" name="Scrap" stackId="b" fill={t.error} />
                <Bar dataKey="labor" name={language === 'es' ? 'Mano de obra' : 'Labor'} stackId="b" fill={t.warning} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title={L.deptContribution} t={t}>
          <DeptTable rows={s.byDept || []} t={t} cols={[
            { key: 'dept',       label: L.department },
            { key: 'backlog',    label: 'Backlog',  right: true, bold: true, color: r => r.backlog > 0 ? t.warning : t.text },
            { key: 'closed',     label: language === 'es' ? 'Cerradas' : 'Closed', right: true },
            { key: 'total',      label: 'Total',    right: true },
            { key: 'total_cost', label: L.cost,    right: true, fmt: v => fmt$(v || 0) },
          ]} />
        </SectionCard>

        <SectionCard title={`${L.openCampaigns} (${openCampaigns.length})`} t={t}>
          {openCampaigns.length === 0 ? (
            <div style={{ textAlign: 'center', color: t.textMuted, padding: '20px', fontSize: '13px' }}>{L.noCampaigns}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {openCampaigns.map(c => {
                const insp   = c.qtyInspected || c.qty_inspected || 0;
                const ok     = c.qtyOk        || c.qty_ok        || 0;
                const nok    = c.qtyNok       || c.qty_nok       || 0;
                const total  = c.qtyQuarantineTotal || c.qty_quarantine_total || 0;
                const restante = Math.max(0, total - insp);
                const pct    = total > 0 ? Math.round((insp / total) * 100) : 0;
                const yield_ = insp > 0 ? ((ok / insp) * 100).toFixed(1) : null;
                const agingRow = (data?.timing?.aging || []).find(a => a.id === c.id);
                const ageDays  = agingRow?.age_days;
                const ageColor = ageDays >= 30 ? t.error : ageDays >= 14 ? t.warning : t.textMuted;
                const DISP = [
                  { label: 'REWORK',   val: c.qtyRework  || c.qty_rework  || 0, color: t.warning },
                  { label: 'SCRAP',    val: c.qtyScrap   || c.qty_scrap   || 0, color: t.error },
                  { label: 'RETURN',   val: c.qtyReturn  || c.qty_return  || 0, color: t.accent },
                  { label: 'HOLD',     val: c.qtyHold    || c.qty_hold    || 0, color: t.textMuted },
                  { label: 'USAR C/ES',val: c.qtyUseAsIs || c.qty_use_as_is || 0, color: t.success },
                ];
                return (
                  <div key={c.id} onClick={() => navigate(`/mrb-campaign/${c.id}`)} style={{ backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${t.border}`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}>{c.folio || c.campaignNumber || c.campaign_number}</span>
                      <span style={{ fontWeight: '600', color: t.text, fontSize: '13px', flex: 1 }}>{c.title}</span>
                      {c.severity_color && <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: c.severity_color, color: 'white' }}>{c.severityName || c.severity_name}</span>}
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', backgroundColor: c.status === 'ABIERTA' ? t.warningBg : t.accentBg, color: c.status === 'ABIERTA' ? t.warningFg : t.accentFg }}>{c.status}</span>
                      {ageDays != null && <span style={{ fontSize: '11px', fontWeight: '600', color: ageColor }}>{ageDays} {L.days}</span>}
                    </div>

                    {/* 3 columnas iguales: defectos | costo | avance */}
                    {(() => {
                      const costRow = data?.openCosts?.[c.id] || {};
                      const scrap   = costRow.scrap || 0;
                      const labor   = costRow.labor || 0;
                      const col = { padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' };
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>

                          {/* Col 1 — disposiciones + yield */}
                          <div style={{ ...col, paddingLeft: 0, borderRight: `1px solid ${t.border}` }}>
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              {DISP.map(d => (
                                <div key={d.label} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '24px', fontWeight: '600', color: d.val > 0 ? d.color : t.textDim, lineHeight: 1 }}>{fmtN(d.val)}</div>
                                  <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: '3px' }}>{d.label}</div>
                                </div>
                              ))}
                              {yield_ && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '24px', fontWeight: '600', color: parseFloat(yield_) >= 95 ? t.success : t.warning, lineHeight: 1 }}>{yield_}%</div>
                                  <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: '3px' }}>YIELD</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Col 2 — costos */}
                          <div style={{ ...col, borderRight: `1px solid ${t.border}` }}>
                            <div style={{ fontSize: '10px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo Acumulado</div>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
                              {[
                                { label: 'Scrap',    val: scrap,         color: t.error },
                                { label: 'Personal', val: labor,         color: t.warning },
                                { label: 'Total',    val: scrap + labor, color: t.accent },
                              ].map(({ label, val, color }, i) => (
                                <div key={label}>
                                  <div style={{ fontSize: i === 2 ? '28px' : '22px', fontWeight: '600', color, lineHeight: 1 }}>{fmt$(val)}</div>
                                  <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Col 3 — avance */}
                          <div style={{ ...col, paddingRight: 0 }}>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              {[
                                { label: 'EN PLANTA',     val: fmtN(total),    color: t.warning },
                                { label: 'INSPECCIONADO', val: fmtN(insp),     color: t.success },
                                { label: 'RESTANTE',      val: fmtN(restante), color: t.error },
                              ].map(({ label, val, color }) => (
                                <div key={label}>
                                  <div style={{ fontSize: '20px', fontWeight: '600', color, lineHeight: 1 }}>{val}</div>
                                  <div style={{ fontSize: '9px', color: t.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: t.textMuted, marginBottom: '4px' }}>
                                <span>% Avance</span><span style={{ fontWeight: '600', color: t.warning }}>{pct}%</span>
                              </div>
                              <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: t.warning, borderRadius: '4px' }} />
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </>
    );
  };

  // ── SECCIÓN 2: MATERIAL & DISPOSICIÓN ────────────────────────────────────
  const renderDisposicion = () => {
    const d = data?.disposition || {};
    const pieData = [
      { name: 'Scrap',      value: d.scrap     || 0, color: t.error },
      { name: 'Rework',     value: d.rework    || 0, color: t.warning },
      { name: 'Use As-Is',  value: d.use_as_is || 0, color: t.success },
      { name: 'Return',     value: d.return_sup|| 0, color: t.accent },
      { name: 'Hold',       value: d.hold      || 0, color: t.textMuted },
    ].filter(p => p.value > 0);
    const total = pieData.reduce((s, p) => s + p.value, 0);

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Scrap',     val: d.scrap,      color: t.error },
            { label: 'Rework',    val: d.rework,     color: t.warning },
            { label: 'Use As-Is', val: d.use_as_is,  color: t.success },
            { label: 'Return',    val: d.return_sup, color: t.accent },
            { label: 'Hold',      val: d.hold,       color: t.textMuted },
          ].map(k => <KPI key={k.label} label={k.label} value={fmtN(k.val)} sub={total > 0 ? `${(((k.val||0)/total)*100).toFixed(1)}%` : undefined} color={k.color} t={t} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <SectionCard title={L.dispositionDist} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...tt} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title={L.scrapReworkByMonth} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={d.byMonth || []} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
                <Tooltip {...tt} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="scrap" stroke={t.error} strokeWidth={2} dot={{ r: 3 }} name="Scrap" />
                <Line type="monotone" dataKey="rework" stroke={t.warning} strokeWidth={2} dot={{ r: 3 }} name="Rework" />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title={L.dispositionByDept} t={t}>
          <DeptTable rows={d.byDept || []} t={t} cols={[
            { key: 'dept',      label: L.department },
            { key: 'scrap',     label: 'Scrap',     right: true, bold: true, color: r => r.scrap > 0 ? t.error : t.text },
            { key: 'rework',    label: 'Rework',    right: true, color: r => r.rework > 0 ? t.warning : t.text },
            { key: 'use_as_is', label: 'Use As-Is', right: true },
            { key: 'return_sup',label: 'Return',    right: true },
            { key: 'hold',      label: 'Hold',      right: true },
          ]} />
        </SectionCard>
      </>
    );
  };

  // ── SECCIÓN 3: TIEMPO & FLUJO ─────────────────────────────────────────────
  const renderTiempo = () => {
    const tm = data?.timing || {};
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
          <KPI label={language === 'es' ? 'Avg Respuesta' : 'Avg Response'} value={tm.avg_response_days != null ? `${tm.avg_response_days} ${L.days}` : '—'} color={t.accent} t={t} />
          <KPI label={language === 'es' ? 'Avg Cierre' : 'Avg Close'} value={tm.avg_close_days != null ? `${tm.avg_close_days} ${L.days}` : '—'} color={t.success} t={t} />
          <KPI label="Lead Time" value={tm.avg_lead_days != null ? `${tm.avg_lead_days} ${L.days}` : '—'} color={t.accent} t={t} />
          <KPI label={language === 'es' ? '> 14 días abiertas' : '> 14 days open'} value={tm.aging_14} color={tm.aging_14 > 0 ? t.warning : t.success} t={t} />
          <KPI label={language === 'es' ? '> 30 días abiertas' : '> 30 days open'} value={tm.aging_30} color={tm.aging_30 > 0 ? t.error : t.success} t={t} />
        </div>

        <SectionCard title={L.campaignAging} t={t}>
          {(tm.aging || []).length === 0
            ? <p style={{ color: t.textMuted, fontSize: '13px' }}>{L.noCampaigns}</p>
            : <DeptTable rows={tm.aging} t={t} cols={[
                { key: 'campaign_number', label: 'Folio', color: () => t.accent },
                { key: 'title',           label: language === 'es' ? 'Título' : 'Title' },
                { key: 'dept',            label: L.department },
                { key: 'status',          label: L.status },
                { key: 'age_days',        label: L.daysOpen, right: true, bold: true, color: r => r.age_days >= 30 ? t.error : r.age_days >= 14 ? t.warning : t.text },
              ]} />}
        </SectionCard>
      </>
    );
  };

  // ── SECCIÓN 4: COSTO & IMPACTO ────────────────────────────────────────────
  const renderCosto = () => {
    const c = data?.cost || {};
    const s = data?.summary || {};
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          <KPI label={L.scrapCost} value={fmt$(c.scrapCost || 0)} color={t.error} t={t} />
          <KPI label={L.laborCost} value={fmt$(c.laborCost || 0)} color={t.warning} t={t} />
          <KPI label={L.totalCost} value={fmt$(c.totalCost || 0)} color={t.accent} t={t} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <SectionCard title={L.costByMonth} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={s.costByMonth || []} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
                <Tooltip {...tt} formatter={v => fmt$(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="scrap" name="Scrap" stackId="c" fill={t.error} />
                <Bar dataKey="labor" name={language === 'es' ? 'Mano de obra' : 'Labor'} stackId="c" fill={t.warning} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title={L.costByDept} t={t}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={c.byDept || []} layout="vertical" margin={{ top: 4, right: 20, left: 60, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} tickFormatter={v => fmt$(v)} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: t.textMuted }} width={56} />
                <Tooltip {...tt} formatter={v => fmt$(v)} />
                <Bar dataKey="scrap_cost" name="Scrap" stackId="d" fill={t.error} />
                <Bar dataKey="labor_cost" name="M.O." stackId="d" fill={t.warning} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title={L.top10ByCost} t={t}>
          <DeptTable rows={c.byCampaign || []} t={t} cols={[
            { key: 'campaign_number', label: 'Folio',       color: () => t.accent },
            { key: 'title',           label: language === 'es' ? 'Título' : 'Title' },
            { key: 'dept',            label: language === 'es' ? 'Depto' : 'Dept' },
            { key: 'scrap_cost',      label: 'Scrap',  right: true, fmt: v => fmt$(v || 0) },
            { key: 'labor_cost',      label: 'M.O.',   right: true, fmt: v => fmt$(v || 0) },
            { key: 'total_cost',      label: 'Total',  right: true, bold: true, fmt: v => fmt$(v || 0), color: () => t.accent },
          ]} />
        </SectionCard>
      </>
    );
  };

  // ── SECCIÓN 5: DEFECTOS & CAUSA ───────────────────────────────────────────
  const renderDefectos = () => {
    const d = data?.defects || {};
    const sevColors = (d.bySeverity || []).map((_, i) => DEPT_PALETTE[i]);
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <SectionCard title={L.topDefects} t={t}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.top || []} layout="vertical" margin={{ top: 4, right: 20, left: 80, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} />
                <YAxis type="category" dataKey="defect" tick={{ fontSize: 10, fill: t.textMuted }} width={76} />
                <Tooltip {...tt} />
                <Bar dataKey="qty" name={language === 'es' ? 'Piezas NOK' : 'NOK Pieces'} fill={t.error} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title={L.bySeverity} t={t}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={d.bySeverity || []} dataKey="qty_nok" nameKey="severity" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ severity, percent }) => `${severity} ${(percent*100).toFixed(0)}%`}>
                  {(d.bySeverity || []).map((_, i) => <Cell key={i} fill={sevColors[i]} />)}
                </Pie>
                <Tooltip {...tt} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <SectionCard title={L.nokByStage} t={t}>
            <DeptTable rows={d.byStage || []} t={t} cols={[
              { key: 'stage', label: L.stage },
              { key: 'qty',   label: language === 'es' ? 'Piezas NOK' : 'NOK Pieces', right: true, bold: true, color: () => t.error },
            ]} />
          </SectionCard>

          <SectionCard title={L.nokByDept} t={t}>
            <DeptTable rows={d.byDept || []} t={t} cols={[
              { key: 'dept', label: L.department },
              { key: 'qty',  label: language === 'es' ? 'Piezas NOK' : 'NOK Pieces', right: true, bold: true, color: r => r.qty > 0 ? t.error : t.text },
            ]} />
          </SectionCard>
        </div>
      </>
    );
  };

  // ── SECCIÓN 6: OPERACIÓN ──────────────────────────────────────────────────
  const renderOperacion = () => {
    const o = data?.ops || {};
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          <KPI label={L.pcsPerHour} value={o.piecesPerHour ?? '—'} sub={`${fmtN(o.inspectorHours)} ${language === 'es' ? 'hrs inspector' : 'inspector hrs'}`} color={t.accent} t={t} />
          <KPI label={L.defectsPerHour} value={o.defectsPerHour ?? '—'} color={t.error} t={t} />
          <KPI label={L.totalDowntime} value={o.totalDowntime ? `${fmtN(o.totalDowntime)} min` : '0 min'} color={t.warning} t={t} />
          <KPI label={L.inspectorHours} value={o.inspectorHours ? `${parseFloat(o.inspectorHours).toFixed(1)} h` : '—'} color={t.accent} t={t} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <SectionCard title={L.downtimeByShift} t={t}>
            {(o.byShift || []).length === 0
              ? <p style={{ color: t.textMuted, fontSize: '13px' }}>{language === 'es' ? 'Sin registros de downtime.' : 'No downtime records.'}</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={o.byShift}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                    <XAxis dataKey="shift" tick={{ fontSize: 11, fill: t.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: t.textMuted }} />
                    <Tooltip {...tt} />
                    <Bar dataKey="minutes" name={language === 'es' ? 'Minutos' : 'Minutes'} fill={t.warning} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </SectionCard>

          <SectionCard title={L.downtimeByDept} t={t}>
            <DeptTable rows={o.byDept || []} t={t} cols={[
              { key: 'dept',    label: L.department },
              { key: 'minutes', label: language === 'es' ? 'Minutos' : 'Minutes', right: true, bold: true, color: r => r.minutes > 0 ? t.warning : t.text },
            ]} />
          </SectionCard>
        </div>

        {(o.comments || []).length > 0 && (
          <SectionCard title={`Comentarios de Downtime (${(o.comments || []).length})`} t={t}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                  {[['Fecha / Hora', false], ['Campaña', false], ['Turno', false], ['Serial', false], ['Tipo', false], ['Min', true], ['Comentario', false]].map(([label, right]) => (
                    <th key={label} style={{ padding: '6px 10px', textAlign: right ? 'right' : 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(o.comments || []).map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                    <td style={{ padding: '8px 10px', color: t.textMuted, whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      {' '}
                      <span style={{ fontWeight: '600' }}>{new Date(r.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>{r.campaign_number}</td>
                    <td style={{ padding: '8px 10px', color: t.textMuted, fontSize: '12px' }}>{r.shift || '—'}</td>
                    <td style={{ padding: '8px 10px', color: t.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>{r.lot_number || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: r.source_type === 'NOK' ? t.errorBg : t.successBg, color: r.source_type === 'NOK' ? t.error : t.success }}>{r.source_type}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: t.warning }}>{r.downtime_minutes}</td>
                    <td style={{ padding: '8px 10px', color: t.text }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </>
    );
  };

  const renderSection = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Cargando...</div>;
    if (!data)   return <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Sin datos</div>;
    switch (tab) {
      case 'resumen':     return renderResumen();
      case 'disposicion': return renderDisposicion();
      case 'tiempo':      return renderTiempo();
      case 'costo':       return renderCosto();
      case 'defectos':    return renderDefectos();
      case 'operacion':     return renderOperacion();
      case 'personalizado': return <MrbTabPersonalizado data={data} />;
      default:              return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '14px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: t.primary, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '13px' }}>MRB</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>MRB Dashboard</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>Material Review Board</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeSelector />
            <button onClick={() => navigate('/')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.text, cursor: 'pointer' }}>Módulos</button>
            <button onClick={() => navigate('/mrb-campaigns')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.accent}`, borderRadius: '6px', backgroundColor: 'transparent', color: t.accent, cursor: 'pointer' }}>Campaigns</button>
            <button onClick={() => navigate('/mrb-capture')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', backgroundColor: t.accent, color: '#fff', cursor: 'pointer' }}>Inspección</button>
            <button onClick={() => navigate('/mrb-buffer')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.warning}`, borderRadius: '6px', backgroundColor: 'transparent', color: t.warning, cursor: 'pointer' }}>Buffer</button>
            <button onClick={() => navigate('/mrb-packages')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.success}`, borderRadius: '6px', backgroundColor: 'transparent', color: t.success, cursor: 'pointer' }}>Paquetes</button>
            <button onClick={() => navigate('/mrb-inventory')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.accent}`, borderRadius: '6px', backgroundColor: 'transparent', color: t.accent, cursor: 'pointer' }}>Inventario</button>
            {isUserAdmin() && <button onClick={() => navigate('/mrb-config')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.text, cursor: 'pointer' }}>Configuración</button>}
            {/* Exportar a PDF */}
            <button
              onClick={exportToPDF}
              disabled={loading || exporting}
              style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', backgroundColor: t.error, color: '#fff', cursor: (loading || exporting) ? 'not-allowed' : 'pointer', opacity: (loading || exporting) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}
              title={language === 'es' ? 'Exportar dashboard a PDF' : 'Export dashboard to PDF'}
            >
              <span>📄</span> PDF
            </button>
            {/* Exportar a Excel */}
            <button
              onClick={exportToExcel}
              disabled={loading || exportingExcel}
              style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', backgroundColor: t.success, color: '#fff', cursor: (loading || exportingExcel) ? 'not-allowed' : 'pointer', opacity: (loading || exportingExcel) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}
              title={language === 'es' ? 'Exportar datos a Excel' : 'Export data to Excel'}
            >
              {exportingExcel ? '...' : 'Excel'}
            </button>
            <button onClick={() => navigate('/mrb-create')} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', backgroundColor: t.primary, color: '#fff', cursor: 'pointer' }}>+ Campaña</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        {/* Contenido del Dashboard (ref para PDF) */}
        <div ref={dashboardRef} style={{ backgroundColor: t.bg }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `2px solid ${t.border}`, marginBottom: '20px', gap: '2px' }}>
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '10px 18px', fontSize: '13px', fontWeight: '600', border: 'none', borderBottom: tab === tb.id ? `2px solid ${t.accent}` : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', backgroundColor: 'transparent', color: tab === tb.id ? t.accent : t.textMuted, borderRadius: '6px 6px 0 0' }}>
                {tb.label}
              </button>
            ))}
          </div>

          {renderFilters()}
          {renderSection()}
        </div>
      </main>
    </div>
  );
};

export default MRBDashboard;
