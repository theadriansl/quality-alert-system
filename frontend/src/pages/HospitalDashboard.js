/**
 * HospitalDashboard.js
 * Dashboard analítico para el Hospital de Defectos
 * 6 Tabs: Resumen, Operativo, Calidad, Costos, Personal, Mi Dashboard
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
// Permisos vienen del backend via hospitalRolesService
import {
  getDashboardSummary,
  getRepairerStats,
  getReleaserStats,
  getRepeatDefects,
  getClientStats,
  getCostData,
  getTopDefectTypes,
  getTopParts,
  getThroughput,
  getWIPByLocation,
  getExportData
} from '../services/hospitalDashboardService';
import { checkMyHospitalPermissions, cacheHospitalPermissions, getCachedHospitalPermissions } from '../services/hospitalRolesService';
import CustomDashboard from '../components/CustomDashboard';
import { useSocket } from '../context/SocketContext';
import { KpiTile } from '../components/shared/SharedComponents';

const COLORS = {
  green: '#16a34a',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#0072CE',
  purple: '#8b5cf6',
  gray: '#6b7280',
  cyan: '#06b6d4',
  orange: '#f97316'
};

const AGING_COLORS = { GREEN: COLORS.green, YELLOW: COLORS.yellow, RED: COLORS.red };

const fmt$ = v => v == null ? '$0' : v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${Number(v).toFixed(0)}`;
const fmtN = v => v == null ? '—' : Number(v).toLocaleString('es-MX');
const fmtPct = v => v == null ? '—' : `${Number(v).toFixed(1)}%`;
const fmtTime = v => v == null ? '—' : `${Number(v).toFixed(1)} min`;
const fmtDate = v => v ? new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMonth = v => v ? new Date(v).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : '—';
const fmtWeek = v => {
  if (!v) return '—';
  const d = new Date(v);
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return `Sem ${startOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`;
};

// Aggregation function for throughput data based on resolution
const aggregateThroughput = (data, resolution) => {
  if (!data || data.length === 0) return [];
  if (resolution === 'day') return data;

  const groups = {};

  data.forEach(item => {
    const d = new Date(item.date);
    let key;

    if (resolution === 'week') {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().split('T')[0];
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }

    if (!groups[key]) {
      groups[key] = {
        date: key,
        captured: 0,
        released: 0,
        scrapped: 0,
        repairTimeSum: 0,
        repairTimeCount: 0,
        releaseTimeSum: 0,
        releaseTimeCount: 0
      };
    }

    groups[key].captured += Number(item.captured) || 0;
    groups[key].released += Number(item.released) || 0;
    groups[key].scrapped += Number(item.scrapped) || 0;

    if (item.avgRepairTime != null) {
      groups[key].repairTimeSum += Number(item.avgRepairTime);
      groups[key].repairTimeCount++;
    }
    if (item.avgReleaseTime != null) {
      groups[key].releaseTimeSum += Number(item.avgReleaseTime);
      groups[key].releaseTimeCount++;
    }
  });

  return Object.values(groups).map(g => ({
    date: g.date,
    captured: g.captured,
    released: g.released,
    scrapped: g.scrapped,
    avgRepairTime: g.repairTimeCount > 0 ? g.repairTimeSum / g.repairTimeCount : null,
    avgReleaseTime: g.releaseTimeCount > 0 ? g.releaseTimeSum / g.releaseTimeCount : null
  })).sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getDateFormatter = (resolution) => {
  if (resolution === 'day') return fmtDate;
  if (resolution === 'week') return fmtWeek;
  return fmtMonth;
};

// Aggregation function for cost data based on resolution
const aggregateCosts = (data, resolution) => {
  if (!data || data.length === 0) return [];
  if (resolution === 'day') return data;

  const groups = {};

  data.forEach(item => {
    const d = new Date(item.periodDate);
    let key;

    if (resolution === 'week') {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().split('T')[0];
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }

    if (!groups[key]) {
      groups[key] = { periodDate: key, scrapCost: 0, scrapCount: 0 };
    }

    groups[key].scrapCost += Number(item.scrapCost) || 0;
    groups[key].scrapCount += Number(item.scrapCount) || 0;
  });

  return Object.values(groups).sort((a, b) => new Date(b.periodDate) - new Date(a.periodDate));
};

// ============================================================================
// MI DASHBOARD - CATÁLOGO DE WIDGETS
// ============================================================================
const HOSPITAL_CATALOG = [
  // RESUMEN
  { id: 'kpi-wip',        cat: 'Resumen',    label: 'WIP Total',           size: 'sm' },
  { id: 'kpi-released',   cat: 'Resumen',    label: 'Liberados',           size: 'sm' },
  { id: 'kpi-scrap',      cat: 'Resumen',    label: 'Scrap',               size: 'sm' },
  { id: 'kpi-captured',   cat: 'Resumen',    label: 'Capturados',          size: 'sm' },
  { id: 'kpi-scrap-cost', cat: 'Resumen',    label: 'Costo Scrap',         size: 'sm' },
  { id: 'kpi-wip-cost',   cat: 'Resumen',    label: 'Costo WIP',           size: 'sm' },
  { id: 'wip-status',     cat: 'Resumen',    label: 'Estatus WIP',         size: 'md' },
  { id: 'aging',          cat: 'Resumen',    label: 'Semaforo Aging',      size: 'md' },
  // OPERATIVO
  { id: 'wip-location',   cat: 'Operativo',  label: 'WIP por Ubicacion',   size: 'lg' },
  { id: 'throughput',     cat: 'Operativo',  label: 'Throughput',          size: 'lg' },
  { id: 'avg-times',      cat: 'Operativo',  label: 'Tiempos Promedio',    size: 'lg' },
  // CALIDAD
  { id: 'top-defects',    cat: 'Calidad',    label: 'Top Tipos Defecto',   size: 'lg' },
  { id: 'top-parts',      cat: 'Calidad',    label: 'Top Partes',          size: 'lg' },
  { id: 'repeat-defects', cat: 'Calidad',    label: 'Defectos Repetidos',  size: 'lg' },
  { id: 'by-client',      cat: 'Calidad',    label: 'Por Cliente',         size: 'lg' },
  // COSTOS
  { id: 'scrap-trend',    cat: 'Costos',     label: 'Tendencia Scrap',     size: 'lg' },
  { id: 'cost-period',    cat: 'Costos',     label: 'Costo por Periodo',   size: 'lg' },
  // PERSONAL
  { id: 'repair-prod',    cat: 'Personal',   label: 'Productividad Rep.',  size: 'lg' },
  { id: 'release-prod',   cat: 'Personal',   label: 'Productividad Lib.',  size: 'lg' },
  { id: 'repairers-tbl',  cat: 'Personal',   label: 'Tabla Reparadores',   size: 'xl' },
  { id: 'releasers-tbl',  cat: 'Personal',   label: 'Tabla Liberadores',   size: 'xl' },
];

const HOSPITAL_DEFAULT = ['kpi-wip', 'kpi-released', 'kpi-scrap', 'kpi-captured', 'aging', 'throughput'];

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

// Local KPI wrapper for Hospital-style (borderLeft accent, colored value, size lg)
const KPI = ({ label, value, sub, color, t }) => (
  <KpiTile
    label={label}
    value={value}
    sub={sub}
    borderAccent="left"
    accentColor={color}
    valueColor={color}
    size="lg"
    t={t}
  />
);

const SectionCard = ({ title, children, t, action }) => (
  <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: t.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      {action}
    </div>
    {children}
  </div>
);

const DataTable = ({ rows, cols, t, onRowClick, noDataText = 'No data' }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
    <thead>
      <tr style={{ borderBottom: `2px solid ${t.border}` }}>
        {cols.map(c => (
          <th key={c.key} style={{
            padding: '8px 10px',
            textAlign: c.right ? 'right' : 'left',
            color: t.textMuted,
            fontWeight: '600',
            fontSize: '11px',
            textTransform: 'uppercase'
          }}>{c.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr
          key={i}
          onClick={() => onRowClick?.(row)}
          style={{
            borderBottom: `1px solid ${t.border}`,
            backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel,
            cursor: onRowClick ? 'pointer' : 'default'
          }}
        >
          {cols.map(c => (
            <td key={c.key} style={{
              padding: '8px 10px',
              textAlign: c.right ? 'right' : 'left',
              fontWeight: c.bold ? '600' : '400',
              color: c.color ? c.color(row) : t.text
            }}>
              {c.render ? c.render(row[c.key], row) : (c.fmt ? c.fmt(row[c.key]) : row[c.key])}
            </td>
          ))}
        </tr>
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={cols.length} style={{ padding: '20px', textAlign: 'center', color: t.textMuted }}>
            {noDataText}
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

const AgingBadge = ({ color, count, t }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '16px',
    backgroundColor: AGING_COLORS[color] + '20',
    color: AGING_COLORS[color],
    fontWeight: '600',
    fontSize: '13px'
  }}>
    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: AGING_COLORS[color] }} />
    {count}
  </div>
);

// ============================================================================
// TABS
// ============================================================================

const TabResumen = ({ data, t, tr, filterLabel }) => {
  const s = data.summary || {};

  return (
    <div>
      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KPI label={tr.wipTotal} value={fmtN(s.totalWip)} sub={tr.piecesInProcess} color={COLORS.blue} t={t} />
        <KPI label={tr.released} value={fmtN(s.releasedCount)} color={COLORS.green} t={t} />
        <KPI label={tr.scrapped} value={fmtN(s.scrappedCount)} sub={fmt$(s.scrapCost)} color={COLORS.red} t={t} />
        <KPI label={tr.captured} value={fmtN(s.capturedCount)} color={COLORS.purple} t={t} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Estado del WIP */}
        <SectionCard title={tr.wipStatus} t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.orange }}>{fmtN(s.pendingRepair)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.pendingRepair}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.blue }}>{fmtN(s.inRepair)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.inRepair}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.cyan }}>{fmtN(s.repairedPendingQa)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.pendingQA}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.purple }}>{fmtN(s.inValidation)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.inValidation}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.red }}>{fmtN(s.inQuarantine)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.quarantine}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: COLORS.green }}>{fmt$(s.wipCost)}</div>
              <div style={{ fontSize: '11px', color: t.textMuted }}>{tr.wipCost}</div>
            </div>
          </div>
        </SectionCard>

        {/* Aging Semáforo */}
        <SectionCard title={tr.agingSemaphore} t={t}>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <AgingBadge color="GREEN" count={s.agingGreen || 0} t={t} />
              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>{tr.lessThan2Hours}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <AgingBadge color="YELLOW" count={s.agingYellow || 0} t={t} />
              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>{tr.twoToEightHours}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <AgingBadge color="RED" count={s.agingRed || 0} t={t} />
              <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>{tr.moreThan8Hours}</div>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
              {[
                { color: COLORS.green, count: Number(s.agingGreen) || 0 },
                { color: COLORS.yellow, count: Number(s.agingYellow) || 0 },
                { color: COLORS.red, count: Number(s.agingRed) || 0 }
              ].map((item, i) => {
                const total = (Number(s.agingGreen) || 0) + (Number(s.agingYellow) || 0) + (Number(s.agingRed) || 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return pct > 0 ? (
                  <div key={i} style={{ width: `${pct}%`, backgroundColor: item.color }} />
                ) : null;
              })}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Resumen del período */}
      <SectionCard title={`${tr.periodSummary}: ${filterLabel}`} t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <KPI label={tr.released} value={fmtN(s.releasedCount)} color={COLORS.green} t={t} />
          <KPI label={tr.scrapped} value={fmtN(s.scrappedCount)} color={COLORS.red} t={t} />
          <KPI label={tr.scrapCost} value={fmt$(s.scrapCost)} color={COLORS.red} t={t} />
          <KPI label={tr.wipCost} value={fmt$(s.wipCost)} color={COLORS.orange} t={t} />
        </div>
      </SectionCard>
    </div>
  );
};

const TabOperativo = ({ data, t, tr, filterLabel, resolution }) => {
  const wip = data.wipByLocation || [];
  const rawThroughput = data.throughput || [];
  const throughput = aggregateThroughput(rawThroughput, resolution);
  const dateFmt = getDateFormatter(resolution);

  return (
    <div>
      {/* WIP por ubicación */}
      <SectionCard title={tr.wipByLocation} t={t}>
        {wip.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wip} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis type="number" stroke={t.textMuted} />
              <YAxis dataKey="locationCode" type="category" width={100} stroke={t.textMuted} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
              <Bar dataKey="wipCount" fill={COLORS.blue} name={tr.pieces} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noLocationData}</div>
        )}
      </SectionCard>

      {/* Throughput */}
      <SectionCard title={`${tr.throughput}: ${filterLabel}`} t={t}>
        {throughput.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={throughput.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="date" stroke={t.textMuted} tick={{ fontSize: 10 }} tickFormatter={dateFmt} />
              <YAxis stroke={t.textMuted} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} labelFormatter={dateFmt} />
              <Legend />
              <Area type="monotone" dataKey="captured" stackId="1" fill={COLORS.purple} stroke={COLORS.purple} name={tr.captured} fillOpacity={0.6} />
              <Area type="monotone" dataKey="released" stackId="2" fill={COLORS.green} stroke={COLORS.green} name={tr.released} fillOpacity={0.6} />
              <Area type="monotone" dataKey="scrapped" stackId="3" fill={COLORS.red} stroke={COLORS.red} name={tr.scrapped} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noThroughputData}</div>
        )}
      </SectionCard>

      {/* Tiempos promedio */}
      <SectionCard title={`${tr.avgTimes}: ${filterLabel}`} t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {throughput.map((item, i) => (
            <div key={i} style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>{dateFmt(item.date)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px' }}>{tr.rep}: {fmtTime(item.avgRepairTime)}</span>
                <span style={{ fontSize: '12px' }}>{tr.rel}: {fmtTime(item.avgReleaseTime)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const TabCalidad = ({ data, t, tr }) => {
  const topTypes = data.topDefectTypes || [];
  const topParts = data.topParts || [];
  const repeatDefects = data.repeatDefects || [];
  const byClient = data.byClient || [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Tipos de Defecto */}
        <SectionCard title={tr.topDefectTypes} t={t}>
          {topTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topTypes.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} />
                <YAxis dataKey="defectTypeCode" type="category" width={80} stroke={t.textMuted} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="totalCount" fill={COLORS.blue} name={tr.total} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noData}</div>
          )}
        </SectionCard>

        {/* Top Partes */}
        <SectionCard title={tr.topPartsWithDefects} t={t}>
          <DataTable
            rows={topParts.slice(0, 8)}
            cols={[
              { key: 'partNumber', label: tr.part },
              { key: 'totalDefects', label: tr.defects, right: true, fmt: fmtN },
              { key: 'scrappedCount', label: tr.scrap, right: true, fmt: fmtN },
              { key: 'scrapCost', label: tr.cost, right: true, fmt: fmt$ }
            ]}
            t={t}
            noDataText={tr.noData}
          />
        </SectionCard>
      </div>

      {/* Defectos Repetidos */}
      <SectionCard title={tr.serialsWithRepeatDefects} t={t}>
        <DataTable
          rows={repeatDefects.slice(0, 10)}
          cols={[
            { key: 'serialNumber', label: tr.serial, bold: true },
            { key: 'partNumber', label: tr.part },
            { key: 'defectCount', label: tr.defectCount, right: true, fmt: fmtN, color: (row) => row.defectCount > 3 ? COLORS.red : t.text },
            { key: 'defectTypes', label: tr.types, render: (v) => Array.isArray(v) ? v.join(', ') : v },
            { key: 'totalCostImpact', label: tr.cost, right: true, fmt: fmt$ }
          ]}
          t={t}
          noDataText={tr.noData}
        />
      </SectionCard>

      {/* Por Cliente */}
      <SectionCard title={tr.defectsByClient} t={t}>
        <DataTable
          rows={byClient.slice(0, 10)}
          cols={[
            { key: 'clientName', label: tr.client, bold: true },
            { key: 'projectName', label: tr.project },
            { key: 'totalDefects', label: tr.total, right: true, fmt: fmtN },
            { key: 'currentWip', label: tr.wip, right: true, fmt: fmtN },
            { key: 'totalClosed', label: tr.closed, right: true, fmt: fmtN },
            { key: 'firstPassYield', label: tr.fpy, right: true, fmt: fmtPct, color: (row) => parseFloat(row.firstPassYield) >= 90 ? COLORS.green : COLORS.red }
          ]}
          t={t}
          noDataText={tr.noData}
        />
      </SectionCard>
    </div>
  );
};

const TabCostos = ({ data, t, tr, filterLabel, resolution }) => {
  const costs = data.costs || {};
  const { summary = {}, daily = [], monthly = [] } = costs;
  const aggregatedCosts = aggregateCosts(daily, resolution);
  const dateFmt = getDateFormatter(resolution);

  return (
    <div>
      {/* KPIs de costo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KPI label={tr.scrapTotal} value={fmt$(summary.scrapCost)} sub={`${fmtN(summary.scrapCount)} ${tr.pieces}`} color={COLORS.red} t={t} />
        <KPI label={tr.currentWIP} value={fmt$(summary.wipCost)} color={COLORS.blue} t={t} />
        <KPI label={tr.accumulated} value={fmt$((Number(summary.scrapCost) || 0) + (Number(summary.wipCost) || 0))} color={COLORS.purple} t={t} />
      </div>

      {/* Tendencia de Scrap */}
      <SectionCard title={`${tr.scrapTrend}: ${filterLabel}`} t={t}>
        {aggregatedCosts.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aggregatedCosts.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="periodDate" stroke={t.textMuted} tick={{ fontSize: 10 }} tickFormatter={dateFmt} />
              <YAxis stroke={t.textMuted} tickFormatter={fmt$} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} formatter={(v) => fmt$(v)} labelFormatter={dateFmt} />
              <Legend />
              <Line type="monotone" dataKey="scrapCost" stroke={COLORS.red} strokeWidth={2} name={tr.scrapCost} dot={{ fill: COLORS.red }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noData}</div>
        )}
      </SectionCard>

      {/* Costo por período */}
      <SectionCard title={`${tr.costByPeriod}: ${filterLabel}`} t={t}>
        {aggregatedCosts.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={aggregatedCosts.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
              <XAxis dataKey="periodDate" stroke={t.textMuted} tick={{ fontSize: 9 }} tickFormatter={dateFmt} />
              <YAxis stroke={t.textMuted} tickFormatter={fmt$} />
              <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} formatter={(v) => fmt$(v)} labelFormatter={dateFmt} />
              <Bar dataKey="scrapCost" fill={COLORS.red} name={tr.scrap} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noDailyData}</div>
        )}
      </SectionCard>
    </div>
  );
};

const TabPersonal = ({ data, t, tr }) => {
  const repairers = data.repairers || [];
  const releasers = data.releasers || [];

  // Preparar datos para gráficas
  const repairersChart = repairers.map(r => ({
    name: r.repairerName?.split(' ')[0] || 'N/A',
    total: Number(r.totalRepairs) || 0,
    exitosas: Number(r.successfulRepairs) || 0,
    scrap: Number(r.scrappedCount) || 0
  }));

  const releasersChart = releasers.map(r => ({
    name: r.releaserName?.split(' ')[0] || 'N/A',
    inspecciones: Number(r.totalInspections) || 0,
    aprobadas: Number(r.approvedCount) || 0,
    rechazadas: Number(r.rejectedCount) || 0
  }));

  return (
    <div>
      {/* Gráficas de Productividad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Productividad Reparadores */}
        <SectionCard title={tr.repairProductivity || 'Repair Productivity'} t={t}>
          {repairersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={repairersChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} />
                <YAxis dataKey="name" type="category" width={80} stroke={t.textMuted} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Legend />
                <Bar dataKey="total" fill={COLORS.blue} name={tr.total || 'Total'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="exitosas" fill={COLORS.green} name={tr.successful || 'Successful'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="scrap" fill={COLORS.red} name="Scrap" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noData}</div>
          )}
        </SectionCard>

        {/* Productividad Liberadores */}
        <SectionCard title={tr.releaseProductivity || 'Release Productivity'} t={t}>
          {releasersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={releasersChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} />
                <YAxis dataKey="name" type="category" width={80} stroke={t.textMuted} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Legend />
                <Bar dataKey="inspecciones" fill={COLORS.blue} name={tr.inspections || 'Inspections'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="aprobadas" fill={COLORS.green} name={tr.approved || 'Approved'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="rechazadas" fill={COLORS.red} name={tr.rejected || 'Rejected'} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>{tr.noData}</div>
          )}
        </SectionCard>
      </div>

      {/* Reparadores */}
      <SectionCard title={tr.repairTechnicians} t={t}>
        <DataTable
          rows={repairers}
          cols={[
            { key: 'repairerName', label: tr.technician, bold: true },
            { key: 'email', label: tr.email },
            { key: 'totalRepairs', label: tr.repairs, right: true, fmt: fmtN },
            { key: 'successfulRepairs', label: tr.successful, right: true, fmt: fmtN },
            { key: 'rejectedRepairs', label: tr.rejected, right: true, fmt: fmtN, color: (row) => row.rejectedRepairs > 0 ? COLORS.red : t.text },
            { key: 'avgRepairTimeMin', label: tr.avgTime, right: true, fmt: fmtTime },
            { key: 'firstPassYield', label: tr.fpy, right: true, fmt: fmtPct, color: (row) => parseFloat(row.firstPassYield) >= 90 ? COLORS.green : COLORS.orange },
            { key: 'currentlyInRepair', label: tr.inProcess, right: true, fmt: fmtN }
          ]}
          t={t}
          noDataText={tr.noData}
        />
      </SectionCard>

      {/* Liberadores */}
      <SectionCard title={tr.qaInspectors} t={t}>
        <DataTable
          rows={releasers}
          cols={[
            { key: 'releaserName', label: tr.inspector, bold: true },
            { key: 'email', label: tr.email },
            { key: 'totalInspections', label: tr.inspections, right: true, fmt: fmtN },
            { key: 'approvedCount', label: tr.approved, right: true, fmt: fmtN, color: () => COLORS.green },
            { key: 'rejectedCount', label: tr.rejected, right: true, fmt: fmtN, color: (row) => row.rejectedCount > 0 ? COLORS.red : t.text },
            { key: 'avgReleaseTimeMin', label: tr.avgTime, right: true, fmt: fmtTime },
            { key: 'rejectionRate', label: tr.rejectionRate, right: true, fmt: fmtPct, color: (row) => parseFloat(row.rejectionRate) > 10 ? COLORS.red : COLORS.green }
          ]}
          t={t}
          noDataText={tr.noData}
        />
      </SectionCard>
    </div>
  );
};

const TabMiDashboard = ({ data, t, tr, resolution }) => {
  const summary = data.summary || {};
  const costs = data.costs || {};
  const costSummary = costs.summary || {};
  const throughput = data.throughput || [];
  const aggregatedThroughput = aggregateThroughput(throughput, resolution);
  const aggregatedCosts = aggregateCosts(costs.daily || [], resolution);
  const dateFmt = getDateFormatter(resolution);
  const wip = data.wipByLocation || [];
  const topTypes = data.topDefectTypes || [];
  const topParts = data.topParts || [];
  const repeatDefects = data.repeatDefects || [];
  const byClient = data.byClient || [];
  const repairers = data.repairers || [];
  const releasers = data.releasers || [];

  const repairersChart = repairers.map(r => ({
    name: r.repairerName?.split(' ')[0] || 'N/A',
    total: Number(r.totalRepairs) || 0,
    exitosas: Number(r.successfulRepairs) || 0,
    scrap: Number(r.scrappedCount) || 0
  }));

  const releasersChart = releasers.map(r => ({
    name: r.releaserName?.split(' ')[0] || 'N/A',
    inspecciones: Number(r.totalInspections) || 0,
    aprobadas: Number(r.approvedCount) || 0,
    rechazadas: Number(r.rejectedCount) || 0
  }));

  const renderWidget = (id) => {
    // KPIs - usan datos filtrados
    if (id === 'kpi-wip') return <KPI label={tr.wipTotal} value={fmtN(summary.totalWip)} sub={tr.piecesInProcess} color={COLORS.blue} t={t} />;
    if (id === 'kpi-released') return <KPI label={tr.released} value={fmtN(summary.releasedCount)} color={COLORS.green} t={t} />;
    if (id === 'kpi-scrap') return <KPI label={tr.scrapped} value={fmtN(summary.scrappedCount)} color={COLORS.red} t={t} />;
    if (id === 'kpi-captured') return <KPI label={tr.captured} value={fmtN(summary.capturedCount)} color={COLORS.purple} t={t} />;
    if (id === 'kpi-scrap-cost') return <KPI label={tr.scrapCost} value={fmt$(costSummary.scrapCost)} color={COLORS.red} t={t} />;
    if (id === 'kpi-wip-cost') return <KPI label={tr.wipCost} value={fmt$(costSummary.wipCost)} color={COLORS.blue} t={t} />;

    // WIP Status
    if (id === 'wip-status') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.wipStatus}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.yellow }}>{summary.pendingRepair || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>{tr.pendingRepair}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.blue }}>{summary.inRepair || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>{tr.inRepair}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.cyan }}>{summary.repairedPendingQa || 0}</div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>{tr.pendingQA}</div>
            </div>
          </div>
        </div>
      );
    }

    // Aging
    if (id === 'aging') {
      const total = (Number(summary.agingGreen) || 0) + (Number(summary.agingYellow) || 0) + (Number(summary.agingRed) || 0);
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.agingSemaphore}</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center' }}><AgingBadge color="GREEN" count={summary.agingGreen || 0} t={t} /><div style={{ fontSize: '9px', color: t.textMuted, marginTop: '4px' }}>≤2h</div></div>
            <div style={{ textAlign: 'center' }}><AgingBadge color="YELLOW" count={summary.agingYellow || 0} t={t} /><div style={{ fontSize: '9px', color: t.textMuted, marginTop: '4px' }}>2-8h</div></div>
            <div style={{ textAlign: 'center' }}><AgingBadge color="RED" count={summary.agingRed || 0} t={t} /><div style={{ fontSize: '9px', color: t.textMuted, marginTop: '4px' }}>>8h</div></div>
          </div>
          <div style={{ display: 'flex', height: '16px', borderRadius: '4px', overflow: 'hidden' }}>
            {[{ color: COLORS.green, count: Number(summary.agingGreen) || 0 }, { color: COLORS.yellow, count: Number(summary.agingYellow) || 0 }, { color: COLORS.red, count: Number(summary.agingRed) || 0 }].map((item, i) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return pct > 0 ? <div key={i} style={{ width: `${pct}%`, backgroundColor: item.color }} /> : null;
            })}
          </div>
        </div>
      );
    }

    // WIP por ubicación
    if (id === 'wip-location') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.wipByLocation}</div>
          {wip.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wip} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <YAxis dataKey="locationCode" type="category" width={70} stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="wipCount" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Throughput
    if (id === 'throughput') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.throughput}</div>
          {aggregatedThroughput.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={aggregatedThroughput.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="date" stroke={t.textMuted} tick={{ fontSize: 8 }} tickFormatter={dateFmt} />
                <YAxis stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} labelFormatter={dateFmt} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="captured" stackId="1" fill={COLORS.purple} stroke={COLORS.purple} name={tr.captured} fillOpacity={0.6} />
                <Area type="monotone" dataKey="released" stackId="2" fill={COLORS.green} stroke={COLORS.green} name={tr.released} fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Tiempos promedio
    if (id === 'avg-times') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.avgTimes}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {aggregatedThroughput.slice(0, 6).map((item, i) => (
              <div key={i} style={{ padding: '8px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', color: t.textMuted, marginBottom: '4px' }}>{dateFmt(item.date)}</div>
                <div style={{ fontSize: '10px' }}>{tr.rep}: {fmtTime(item.avgRepairTime)}</div>
                <div style={{ fontSize: '10px' }}>{tr.rel}: {fmtTime(item.avgReleaseTime)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Top defectos
    if (id === 'top-defects') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.topDefectTypes}</div>
          {topTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topTypes.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <YAxis dataKey="defectTypeCode" type="category" width={60} stroke={t.textMuted} tick={{ fontSize: 8 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="totalCount" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Top partes
    if (id === 'top-parts') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.topPartsWithDefects}</div>
          <DataTable rows={topParts.slice(0, 5)} cols={[{ key: 'partNumber', label: tr.part }, { key: 'defectCount', label: tr.defects, right: true }]} t={t} noDataText={tr.noData} />
        </div>
      );
    }

    // Defectos repetidos
    if (id === 'repeat-defects') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.serialsWithRepeatDefects}</div>
          <DataTable rows={repeatDefects.slice(0, 5)} cols={[{ key: 'serialNumber', label: tr.serial }, { key: 'defectCount', label: tr.defectCount, right: true }]} t={t} noDataText={tr.noData} />
        </div>
      );
    }

    // Por cliente
    if (id === 'by-client') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.defectsByClient}</div>
          <DataTable rows={byClient.slice(0, 5)} cols={[{ key: 'clientName', label: tr.client }, { key: 'totalDefects', label: tr.total, right: true }]} t={t} noDataText={tr.noData} />
        </div>
      );
    }

    // Tendencia scrap
    if (id === 'scrap-trend') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.scrapTrend}</div>
          {aggregatedCosts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={aggregatedCosts.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="periodDate" stroke={t.textMuted} tick={{ fontSize: 8 }} tickFormatter={dateFmt} />
                <YAxis stroke={t.textMuted} tick={{ fontSize: 9 }} tickFormatter={fmt$} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} formatter={(v) => fmt$(v)} labelFormatter={dateFmt} />
                <Line type="monotone" dataKey="scrapCost" stroke={COLORS.red} strokeWidth={2} dot={{ fill: COLORS.red, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Costo por período
    if (id === 'cost-period') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.costByPeriod}</div>
          {aggregatedCosts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={aggregatedCosts.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="periodDate" stroke={t.textMuted} tick={{ fontSize: 8 }} tickFormatter={dateFmt} />
                <YAxis stroke={t.textMuted} tick={{ fontSize: 9 }} tickFormatter={fmt$} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} formatter={(v) => fmt$(v)} labelFormatter={dateFmt} />
                <Bar dataKey="scrapCost" fill={COLORS.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Productividad reparadores
    if (id === 'repair-prod') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.repairProductivity}</div>
          {repairersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={repairersChart.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" width={50} stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="total" fill={COLORS.blue} name={tr.total} radius={[0, 4, 4, 0]} />
                <Bar dataKey="exitosas" fill={COLORS.green} name={tr.successful} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Productividad liberadores
    if (id === 'release-prod') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.releaseProductivity}</div>
          {releasersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={releasersChart.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis type="number" stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" width={50} stroke={t.textMuted} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }} />
                <Bar dataKey="inspecciones" fill={COLORS.blue} name={tr.inspections} radius={[0, 4, 4, 0]} />
                <Bar dataKey="aprobadas" fill={COLORS.green} name={tr.approved} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted, fontSize: '12px' }}>{tr.noData}</div>}
        </div>
      );
    }

    // Tabla reparadores
    if (id === 'repairers-tbl') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.repairTechnicians}</div>
          <DataTable rows={repairers} cols={[
            { key: 'repairerName', label: tr.technician },
            { key: 'totalRepairs', label: tr.total, right: true },
            { key: 'successfulRepairs', label: tr.successful, right: true },
            { key: 'avgRepairTimeMin', label: tr.avgTime, right: true, render: v => fmtTime(v) },
            { key: 'firstPassYield', label: 'FPY', right: true, render: v => fmtPct(v) }
          ]} t={t} noDataText={tr.noData} />
        </div>
      );
    }

    // Tabla liberadores
    if (id === 'releasers-tbl') {
      return (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>{tr.releaseTechnicians}</div>
          <DataTable rows={releasers} cols={[
            { key: 'releaserName', label: tr.technician },
            { key: 'totalInspections', label: tr.inspections, right: true },
            { key: 'approvedCount', label: tr.approved, right: true },
            { key: 'avgReleaseTimeMin', label: tr.avgTime, right: true, render: v => fmtTime(v) }
          ]} t={t} noDataText={tr.noData} />
        </div>
      );
    }

    // Widget no encontrado (posiblemente eliminado) - retornar null para no mostrar nada
    return null;
  };

  return (
    <CustomDashboard
      storageKey="hospital_my_dashboard"
      catalog={HOSPITAL_CATALOG}
      defaultWidgets={HOSPITAL_DEFAULT}
      renderWidget={renderWidget}
      data={data}
    />
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const API_URL = 'http://localhost:5000';

const getPresets = (lang) => [
  { label: lang === 'es' ? 'Hoy' : 'Today',              days: 0   },
  { label: lang === 'es' ? 'Semana' : 'Week',            days: 7   },
  { label: lang === 'es' ? 'Mes actual' : 'This Month',  days: 30  },
  { label: lang === 'es' ? 'Trimestre' : 'Quarter',      days: 90  },
  { label: lang === 'es' ? 'Año' : 'Year',               days: 365 },
  { label: lang === 'es' ? 'Todo' : 'All',               days: null },
];

const STORAGE_KEY = 'hospital_dashboard_filters';

const getStoredFilters = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return null;
};

const initDateFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};
const initDateTo = () => new Date().toISOString().split('T')[0];

const HospitalDashboard = () => {
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscribe } = useSocket();
  const PRESETS = getPresets(language);
  const stored = getStoredFilters();

  // Check if redirected from DefectCapture due to access denied
  const accessDeniedParam = searchParams.get('accessDenied');
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState('');

  useEffect(() => {
    if (accessDeniedParam) {
      setShowAccessDenied(true);
      setAccessDeniedReason(
        accessDeniedParam === 'system'
          ? 'Layer 1: Permiso de sistema insuficiente. Admin: Administración → Usuarios → asignar rol con defects.access="full" o defects.sections.capture=true'
          : accessDeniedParam === 'hospital'
          ? 'Layer 2: Sin rol de Hospital. Admin: Hospital de Defectos → Configuración → Roles de Usuario → asignar "Inspector" o "Admin"'
          : 'Permisos insuficientes para capturar defectos.'
      );
    }
  }, [accessDeniedParam]);

  const handleCloseAccessDenied = () => {
    setShowAccessDenied(false);
    // Remove the accessDenied param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('accessDenied');
    window.history.replaceState({}, '', url.toString());
  };

  // Obtener usuario
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Estado para permisos de Hospital (cargados desde backend)
  const [hospitalPermissions, setHospitalPermissions] = useState(() => {
    // Intentar cargar desde cache primero
    const cached = getCachedHospitalPermissions();
    return cached || { canRepair: false, canRelease: false, isHospitalAdmin: false, hospitalRoles: [] };
  });

  // Cargar permisos de Hospital desde backend
  useEffect(() => {
    const loadHospitalPermissions = async () => {
      try {
        const response = await checkMyHospitalPermissions();
        if (response.success) {
          setHospitalPermissions(response.data);
          cacheHospitalPermissions(response.data);
        }
      } catch (error) {
        console.error('Error loading hospital permissions:', error);
      }
    };
    if (user.id) {
      loadHospitalPermissions();
    }
  }, [user.id]);

  // Permisos efectivos: vienen del backend (que ya verifica si es admin del sistema)
  // Reparadores y Liberadores NO pueden ser admins (mutuamente excluyentes)
  const canAccessRepair = hospitalPermissions.canRepair && !hospitalPermissions.isHospitalAdmin;
  const canAccessRelease = hospitalPermissions.canRelease && !hospitalPermissions.isHospitalAdmin;
  const canAccessAdmin = hospitalPermissions.isHospitalAdmin;

  // Filter states - initialized from localStorage if available
  const [preset, setPreset] = useState(stored?.preset ?? 'Mes actual');
  const [dateFrom, setDateFrom] = useState(stored?.dateFrom ?? initDateFrom());
  const [dateTo, setDateTo] = useState(stored?.dateTo ?? initDateTo());
  const [clientId, setClientId] = useState(stored?.clientId ?? '');
  const [resolution, setResolution] = useState(stored?.resolution ?? 'day');
  const [clients, setClients] = useState([]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, dateFrom, dateTo, clientId, resolution }));
  }, [preset, dateFrom, dateTo, clientId, resolution]);

  // Traducciones locales
  const tr = {
    en: {
      title: 'Hospital Dashboard',
      subtitle: 'Defect Hospital Analytics',
      backToHospital: 'Back to Hospital',
      loading: 'Loading...',
      refresh: 'Refresh',
      loadingData: 'Loading data...',
      errorLoading: 'Error loading dashboard data',
      noData: 'No data',
      // Tabs
      tabSummary: 'Summary',
      tabOperational: 'Operational',
      tabQuality: 'Quality',
      tabCosts: 'Costs',
      tabPersonnel: 'Personnel',
      tabMyDashboard: 'My Dashboard',
      // KPIs
      wipTotal: 'WIP Total',
      piecesInProcess: 'pieces in process',
      releasedToday: 'Released Today',
      thisWeek: 'this week',
      scrapToday: 'Scrap Today',
      capturedToday: 'Captured Today',
      // WIP Status
      wipStatus: 'WIP Status',
      pendingRepair: 'Pending Repair',
      inRepair: 'In Repair',
      pendingQA: 'Pending QA',
      inValidation: 'In Validation',
      quarantine: 'Quarantine',
      wipCost: 'WIP Cost',
      // Aging
      agingSemaphore: 'Aging (Semaphore)',
      lessThan2Hours: '≤2 hours',
      twoToEightHours: '2-8 hours',
      moreThan8Hours: '>8 hours',
      // Period Summary
      periodSummary: 'Summary',
      released: 'Released',
      scrapped: 'Scrapped',
      scrapCost: 'Scrap Cost',
      // Operational
      wipByLocation: 'WIP by Location',
      pieces: 'Pieces',
      noLocationData: 'No location data',
      throughput: 'Throughput',
      captured: 'Captured',
      noThroughputData: 'No throughput data',
      avgTimes: 'Average Times',
      rep: 'Rep',
      rel: 'Rel',
      // Quality
      topDefectTypes: 'Top Defect Types',
      topPartsWithDefects: 'Top Parts with Defects',
      part: 'Part',
      defects: 'Defects',
      scrap: 'Scrap',
      cost: 'Cost',
      serialsWithRepeatDefects: 'Serials with Repeat Defects',
      serial: 'Serial',
      defectCount: '# Defects',
      types: 'Types',
      defectsByClient: 'Defects by Client',
      client: 'Client',
      project: 'Project',
      total: 'Total',
      wip: 'WIP',
      closed: 'Closed',
      fpy: 'FPY',
      // Costs
      scrapTotal: 'Total Scrap',
      currentWIP: 'Current WIP',
      accumulated: 'Accumulated Total',
      scrapTrend: 'Scrap Trend',
      noMonthlyData: 'No monthly data',
      costByPeriod: 'Cost',
      noDailyData: 'No daily data',
      // Personnel
      repairTechnicians: 'Repair Technicians',
      technician: 'Technician',
      email: 'Email',
      repairs: 'Repairs',
      successful: 'Successful',
      rejected: 'Rejected',
      avgTime: 'Avg Time',
      inProcess: 'In Process',
      qaInspectors: 'QA Inspectors (Release)',
      inspector: 'Inspector',
      inspections: 'Inspections',
      approved: 'Approved',
      rejectionRate: '% Rejection',
      repairProductivity: 'Repair Productivity',
      releaseProductivity: 'Release Productivity',
      // My Dashboard
      myDashboardTitle: 'My Dashboard (Coming Soon)',
      customizableDashboard: 'Customizable Dashboard',
      dragAndConfigure: 'Drag and configure your favorite widgets',
      locale: 'en-US'
    },
    es: {
      title: 'Hospital Dashboard',
      subtitle: 'Analíticas del Hospital de Defectos',
      backToHospital: 'Volver al Hospital',
      loading: 'Cargando...',
      refresh: 'Actualizar',
      loadingData: 'Cargando datos...',
      errorLoading: 'Error al cargar datos del dashboard',
      noData: 'Sin datos',
      // Tabs
      tabSummary: 'Resumen',
      tabOperational: 'Operativo',
      tabQuality: 'Calidad',
      tabCosts: 'Costos',
      tabPersonnel: 'Personal',
      tabMyDashboard: 'Mi Dashboard',
      // KPIs
      wipTotal: 'WIP Total',
      piecesInProcess: 'piezas en proceso',
      releasedToday: 'Liberados Hoy',
      thisWeek: 'esta semana',
      scrapToday: 'Scrap Hoy',
      capturedToday: 'Capturados Hoy',
      // WIP Status
      wipStatus: 'Estado del WIP',
      pendingRepair: 'Pendiente Rep.',
      inRepair: 'En Reparación',
      pendingQA: 'Pendiente QA',
      inValidation: 'En Validación',
      quarantine: 'Cuarentena',
      wipCost: 'Costo WIP',
      // Aging
      agingSemaphore: 'Aging (Semáforo)',
      lessThan2Hours: '≤2 horas',
      twoToEightHours: '2-8 horas',
      moreThan8Hours: '>8 horas',
      // Period Summary
      periodSummary: 'Resumen',
      released: 'Liberados',
      scrapped: 'Scrapped',
      scrapCost: 'Costo Scrap',
      // Operational
      wipByLocation: 'WIP por Ubicación',
      pieces: 'Piezas',
      noLocationData: 'Sin datos de ubicación',
      throughput: 'Throughput',
      captured: 'Capturados',
      noThroughputData: 'Sin datos de throughput',
      avgTimes: 'Tiempos Promedio',
      rep: 'Rep',
      rel: 'Lib',
      // Quality
      topDefectTypes: 'Top Tipos de Defecto',
      topPartsWithDefects: 'Top Partes con Defectos',
      part: 'Parte',
      defects: 'Defectos',
      scrap: 'Scrap',
      cost: 'Costo',
      serialsWithRepeatDefects: 'Seriales con Defectos Repetidos',
      serial: 'Serial',
      defectCount: '# Defectos',
      types: 'Tipos',
      defectsByClient: 'Defectos por Cliente',
      client: 'Cliente',
      project: 'Proyecto',
      total: 'Total',
      wip: 'WIP',
      closed: 'Cerrados',
      fpy: 'FPY',
      // Costs
      scrapTotal: 'Scrap Total',
      currentWIP: 'WIP Actual',
      accumulated: 'Total Acumulado',
      scrapTrend: 'Tendencia de Scrap',
      noMonthlyData: 'Sin datos mensuales',
      costByPeriod: 'Costo',
      noDailyData: 'Sin datos diarios',
      // Personnel
      repairTechnicians: 'Técnicos de Reparación',
      technician: 'Técnico',
      email: 'Email',
      repairs: 'Reparaciones',
      successful: 'Exitosas',
      rejected: 'Rechazadas',
      avgTime: 'Tiempo Prom',
      inProcess: 'En Proceso',
      qaInspectors: 'Inspectores QA (Liberación)',
      inspector: 'Inspector',
      inspections: 'Inspecciones',
      approved: 'Aprobadas',
      rejectionRate: '% Rechazo',
      repairProductivity: 'Productividad Reparación',
      releaseProductivity: 'Productividad Liberación',
      // My Dashboard
      myDashboardTitle: 'Mi Dashboard (Próximamente)',
      customizableDashboard: 'Dashboard Personalizable',
      dragAndConfigure: 'Arrastra y configura tus widgets favoritos',
      locale: 'es-MX'
    }
  }[language] || {};

  const [activeTab, setActiveTab] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  // Modal selección de estación
  const [showStationModal, setShowStationModal] = useState(null); // 'repair' | 'release' | null
  const [stations, setStations] = useState({ repair: [], release: [] });
  const [selectedStation, setSelectedStation] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Modal Admin (requiere ambas estaciones)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminRepairStation, setAdminRepairStation] = useState(null);
  const [adminReleaseStation, setAdminReleaseStation] = useState(null);
  const [loadingAdminStations, setLoadingAdminStations] = useState(false);

  // Ref para capturar el dashboard en PDF
  const dashboardRef = useRef(null);

  const applyPreset = useCallback((name) => {
    const p = PRESETS.find(pr => pr.label === name);
    if (!p) return;
    setPreset(name);
    if (p.days === null) {
      setDateFrom('');
      setDateTo('');
    } else if (p.days === 0) {
      const today = new Date().toISOString().split('T')[0];
      setDateFrom(today);
      setDateTo(today);
    } else {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - p.days);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
    }
  }, [PRESETS]);

  const getFilterLabel = useCallback(() => {
    if (preset) return preset;
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return dateFrom;
      return `${dateFrom} - ${dateTo}`;
    }
    if (dateFrom) return `${language === 'es' ? 'Desde' : 'From'} ${dateFrom}`;
    if (dateTo) return `${language === 'es' ? 'Hasta' : 'Until'} ${dateTo}`;
    return language === 'es' ? 'Todo' : 'All';
  }, [preset, dateFrom, dateTo, language]);

  // Load clients dropdown
  useEffect(() => {
    const loadClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/clients/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setClients(data.clients || data.items || []);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    };
    loadClients();
  }, []);

  // Cargar estaciones cuando se abre el modal
  useEffect(() => {
    if (showStationModal) {
      const loadStations = async () => {
        try {
          const token = localStorage.getItem('token');
          const type = showStationModal === 'repair' ? 'REPAIR' : 'RELEASE';
          const res = await fetch(`${API_URL}/station-config/stations/by-type/${type}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          setStations(prev => ({ ...prev, [showStationModal]: data.stations || [] }));
        } catch (err) {
          console.error('Error loading stations:', err);
        }
      };
      loadStations();
    }
  }, [showStationModal]);

  // Confirmar estación y navegar
  const handleStationConfirm = () => {
    if (!selectedStation) return;
    const mode = showStationModal;
    // Guardar estación en localStorage
    localStorage.setItem(`hospital_${mode}_station`, JSON.stringify(selectedStation));
    setShowStationModal(null);
    setSelectedStation(null);
    navigate(`/defect-hospital?mode=${mode}`);
  };

  // Cargar estaciones para modal Admin
  useEffect(() => {
    if (showAdminModal) {
      const loadAdminStations = async () => {
        setLoadingAdminStations(true);
        try {
          const token = localStorage.getItem('token');
          const [repairRes, releaseRes] = await Promise.all([
            fetch(`${API_URL}/station-config/stations/by-type/REPAIR`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${API_URL}/station-config/stations/by-type/RELEASE`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          const repairData = await repairRes.json();
          const releaseData = await releaseRes.json();
          setStations({
            repair: repairData.stations || [],
            release: releaseData.stations || []
          });
        } catch (err) {
          console.error('Error loading admin stations:', err);
        } finally {
          setLoadingAdminStations(false);
        }
      };
      loadAdminStations();
    }
  }, [showAdminModal]);

  // Confirmar estaciones Admin y navegar
  const handleAdminConfirm = () => {
    if (!adminRepairStation || !adminReleaseStation) return;
    // Guardar ambas estaciones
    localStorage.setItem('hospital_repair_station', JSON.stringify(adminRepairStation));
    localStorage.setItem('hospital_release_station', JSON.stringify(adminReleaseStation));
    setShowAdminModal(false);
    setAdminRepairStation(null);
    setAdminReleaseStation(null);
    navigate('/defect-hospital?mode=admin');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = {
      startDate: dateFrom,
      endDate: dateTo,
      clientId: clientId
    };
    try {
      const [
        summaryRes,
        repairersRes,
        releasersRes,
        repeatRes,
        clientRes,
        costsRes,
        defectTypesRes,
        partsRes,
        throughputRes,
        wipRes
      ] = await Promise.all([
        getDashboardSummary(filters),
        getRepairerStats(filters),
        getReleaserStats(filters),
        getRepeatDefects(filters),
        getClientStats(filters),
        getCostData(filters),
        getTopDefectTypes(filters),
        getTopParts(filters),
        getThroughput(filters),
        getWIPByLocation()
      ]);

      setData({
        summary: summaryRes.data || {},
        repairers: repairersRes.data || [],
        releasers: releasersRes.data || [],
        repeatDefects: repeatRes.data || [],
        byClient: clientRes.data || [],
        costs: costsRes.data || {},
        topDefectTypes: defectTypesRes.data || [],
        topParts: partsRes.data || [],
        throughput: throughputRes.data || [],
        wipByLocation: wipRes.data || []
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(tr.errorLoading);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, clientId, tr.errorLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket: actualizar dashboard en tiempo real
  useEffect(() => {
    const events = [
      'hospital:location-assigned',
      'defect:created',
      'defect:repaired',
      'defect:released',
      'defect:rejected',
      'defect:repair-started',
      'defect:approved',
      'defect:quarantined',
      'defect:scrapped',
      'defect:bulk-reassigned'
    ];
    const unsubscribes = events.map(event =>
      subscribe(event, () => loadData())
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, loadData]);

  // ============================================================================
  // EXPORTACIÓN A PDF
  // ============================================================================
  const exportToPDF = useCallback(async () => {
    if (!dashboardRef.current) return;

    setExporting(true);
    try {
      // Capturar el contenido del dashboard
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Configurar PDF (landscape para dashboards)
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth * 0.75, imgHeight * 0.75]
      });

      // Header del reporte
      const filterInfo = `${getFilterLabel()}${clientId ? ` | Cliente: ${clients.find(c => c.id === parseInt(clientId))?.name || clientId}` : ''}`;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Hospital de Defectos - Dashboard', 20, 30);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Periodo: ${filterInfo}`, 20, 50);
      pdf.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 20, 65);

      // Agregar imagen del dashboard
      pdf.addImage(imgData, 'PNG', 0, 80, imgWidth * 0.75, imgHeight * 0.75);

      // Guardar PDF
      const fileName = `Hospital_Dashboard_${dateFrom || 'all'}_${dateTo || 'all'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      alert(language === 'es' ? 'Error al exportar a PDF' : 'Error exporting to PDF');
    } finally {
      setExporting(false);
    }
  }, [getFilterLabel, clientId, clients, dateFrom, dateTo, language]);

  // ============================================================================
  // EXPORTACIÓN A EXCEL
  // ============================================================================
  const exportToExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const filters = {
        startDate: dateFrom || null,
        endDate: dateTo || null,
        clientId: clientId || null
      };

      const response = await getExportData(filters);
      if (!response.success) {
        throw new Error(response.message || 'Error fetching export data');
      }

      const { defects, byDefectType, byPart, byRepairer, byReleaser, byDepartment } = response.data;

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja 1: Todos los defectos
      if (defects && defects.length > 0) {
        const defectHeaders = {
          entryNumber: 'Entry',
          serialNumber: 'Serial',
          lotNumber: 'Lote',
          quantity: 'Cantidad',
          clientName: 'Cliente',
          partNumber: 'Número Parte',
          partName: 'Nombre Parte',
          defectType: 'Tipo Defecto',
          defectCode: 'Código',
          department: 'Departamento',
          severity: 'Severidad',
          disposition: 'Disposición',
          repairStatus: 'Estado',
          notes: 'Notas',
          capturedAt: 'Fecha Captura',
          capturedBy: 'Capturado Por',
          captureStation: 'Estación Captura',
          repairStartedAt: 'Inicio Reparación',
          repairedAt: 'Fecha Reparación',
          repairTimeMinutes: 'Tiempo Rep. (min)',
          repairType: 'Tipo Reparación',
          repairNotes: 'Notas Reparación',
          repairedBy: 'Reparado Por',
          releasedAt: 'Fecha Liberación',
          releasedBy: 'Liberado Por',
          currentLocation: 'Ubicación Actual',
          scrapCost: 'Costo Scrap'
        };
        const defectData = defects.map(d => {
          const row = {};
          Object.keys(defectHeaders).forEach(key => {
            let val = d[key];
            if (key.includes('At') && val) val = new Date(val).toLocaleString('es-MX');
            row[defectHeaders[key]] = val ?? '';
          });
          return row;
        });
        const ws1 = XLSX.utils.json_to_sheet(defectData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Defectos');
      }

      // Hoja 2: Por Tipo de Defecto
      if (byDefectType && byDefectType.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(byDefectType.map(r => ({
          'Tipo Defecto': r.defectType || 'Sin tipo',
          'Código': r.code || '',
          'Total': r.total,
          'Liberados': r.released,
          'Scrap': r.scrapped,
          'En Proceso': r.inProcess,
          'Tiempo Prom. (min)': r.avgRepairTime || '',
          'Costo Scrap': r.scrapCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws2, 'Por Tipo Defecto');
      }

      // Hoja 3: Por Parte
      if (byPart && byPart.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(byPart.map(r => ({
          'Número Parte': r.partNumber || 'Sin parte',
          'Nombre Parte': r.partName || '',
          'Cliente': r.client || '',
          'Total Defectos': r.totalDefects,
          'Liberados': r.released,
          'Scrap': r.scrapped,
          'Costo Scrap': r.scrapCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws3, 'Por Parte');
      }

      // Hoja 4: Por Reparador
      if (byRepairer && byRepairer.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(byRepairer.map(r => ({
          'Reparador': r.repairer || 'Sin asignar',
          'Total Reparaciones': r.totalRepairs,
          'Tiempo Total (min)': r.totalMinutes || 0,
          'Tiempo Promedio (min)': r.avgMinutes || '',
          'Primera Reparación': r.firstRepair ? new Date(r.firstRepair).toLocaleDateString('es-MX') : '',
          'Última Reparación': r.lastRepair ? new Date(r.lastRepair).toLocaleDateString('es-MX') : ''
        })));
        XLSX.utils.book_append_sheet(wb, ws4, 'Por Reparador');
      }

      // Hoja 5: Por Liberador
      if (byReleaser && byReleaser.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(byReleaser.map(r => ({
          'Liberador': r.releaser || 'Sin asignar',
          'Total Liberaciones': r.totalReleases,
          'Primera Liberación': r.firstRelease ? new Date(r.firstRelease).toLocaleDateString('es-MX') : '',
          'Última Liberación': r.lastRelease ? new Date(r.lastRelease).toLocaleDateString('es-MX') : ''
        })));
        XLSX.utils.book_append_sheet(wb, ws5, 'Por Liberador');
      }

      // Hoja 6: Por Departamento
      if (byDepartment && byDepartment.length > 0) {
        const ws6 = XLSX.utils.json_to_sheet(byDepartment.map(r => ({
          'Departamento': r.department || 'Sin departamento',
          'Total': r.total,
          'Liberados': r.released,
          'Scrap': r.scrapped,
          'Costo Scrap': r.scrapCost || 0
        })));
        XLSX.utils.book_append_sheet(wb, ws6, 'Por Departamento');
      }

      // Guardar archivo
      const fileName = `Hospital_Defectos_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert(language === 'es' ? 'Error al exportar a Excel' : 'Error exporting to Excel');
    } finally {
      setExportingExcel(false);
    }
  }, [dateFrom, dateTo, clientId, language]);

  const renderFilters = () => (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.label)} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'pointer', backgroundColor: preset === p.label ? COLORS.blue : t.bgPanel, color: preset === p.label ? 'white' : t.text }}>
            {p.label}
          </button>
        ))}
      </div>
      <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
      <span style={{ fontSize: '12px', color: t.textMuted }}>—</span>
      <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
      <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
        <option value="">{language === 'es' ? 'Cliente' : 'Client'}</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <span style={{ fontSize: '11px', color: t.textMuted, marginLeft: '8px' }}>{language === 'es' ? 'Ver por:' : 'View by:'}</span>
      <select value={resolution} onChange={e => setResolution(e.target.value)} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
        <option value="day">{language === 'es' ? 'Días' : 'Days'}</option>
        <option value="week">{language === 'es' ? 'Semanas' : 'Weeks'}</option>
        <option value="month">{language === 'es' ? 'Meses' : 'Months'}</option>
      </select>
      <button onClick={() => { setClientId(''); setResolution('day'); applyPreset(language === 'es' ? 'Mes actual' : 'This Month'); }} style={{ padding: '5px 10px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>Reset</button>
    </div>
  );

  const tabs = [
    { id: 'resumen', label: tr.tabSummary },
    { id: 'operativo', label: tr.tabOperational },
    { id: 'calidad', label: tr.tabQuality },
    { id: 'costos', label: tr.tabCosts },
    { id: 'personal', label: tr.tabPersonnel },
    { id: 'miDashboard', label: tr.tabMyDashboard }
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Access Denied Banner */}
      {showAccessDenied && (
        <div style={{
          backgroundColor: t.errorBg,
          border: `1px solid ${t.error}`,
          borderRadius: '8px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ color: t.errorFg, fontWeight: '600', fontSize: '16px' }}>
                Acceso a Captura de Defectos Denegado
              </div>
              <div style={{ color: t.error, fontSize: '14px' }}>
                {accessDeniedReason}
              </div>
            </div>
          </div>
          <button
            onClick={handleCloseAccessDenied}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: t.errorFg,
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
            {tr.title}
          </h1>
          <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
            {tr.subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ThemeSelector />
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.text,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Home
          </button>
          <button
            onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
            style={{
              padding: '8px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.text,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          {canAccessRepair && (
            <button
              onClick={() => setShowStationModal('repair')}
              style={{
                padding: '8px 16px',
                backgroundColor: t.warning,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Reparacion
            </button>
          )}
          {canAccessRelease && (
            <button
              onClick={() => setShowStationModal('release')}
              style={{
                padding: '8px 16px',
                backgroundColor: t.success,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Liberacion
            </button>
          )}
          {canAccessAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: t.primary,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Hospital
            </button>
          )}
          {/* Exportar a PDF */}
          <button
            onClick={exportToPDF}
            disabled={loading || exporting}
            style={{
              padding: '8px 14px',
              backgroundColor: t.error,
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: (loading || exporting) ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: (loading || exporting) ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={language === 'es' ? 'Exportar dashboard a PDF' : 'Export dashboard to PDF'}
          >
            <span style={{ fontSize: '14px' }}>&#x1F4C4;</span>
            PDF
          </button>
          {/* Exportar a Excel */}
          <button
            onClick={exportToExcel}
            disabled={loading || exportingExcel}
            style={{
              padding: '8px 14px',
              backgroundColor: t.success,
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: (loading || exportingExcel) ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: (loading || exportingExcel) ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={language === 'es' ? 'Exportar datos a Excel' : 'Export data to Excel'}
          >
            <span style={{ fontSize: '14px' }}>&#x1F4CA;</span>
            {exportingExcel ? '...' : 'Excel'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: t.accent,
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? tr.loading : tr.refresh}
          </button>
        </div>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Contenido del Dashboard (ref para exportar a PDF) */}
      <div ref={dashboardRef} style={{ backgroundColor: t.bgPage }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: t.bgCard,
          padding: '4px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid ${t.border}`
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: activeTab === tab.id ? COLORS.blue : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeTab === tab.id ? 'white' : t.text,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: COLORS.red + '20',
            border: `1px solid ${COLORS.red}`,
            borderRadius: '8px',
            color: COLORS.red,
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
            <div style={{ fontSize: '14px', marginBottom: '16px', color: t.textMuted }}>...</div>
            <div>{tr.loadingData}</div>
          </div>
        ) : (
          <>
            {activeTab === 'resumen' && <TabResumen data={data} t={t} tr={tr} filterLabel={getFilterLabel()} />}
            {activeTab === 'operativo' && <TabOperativo data={data} t={t} tr={tr} filterLabel={getFilterLabel()} resolution={resolution} />}
            {activeTab === 'calidad' && <TabCalidad data={data} t={t} tr={tr} />}
            {activeTab === 'costos' && <TabCostos data={data} t={t} tr={tr} filterLabel={getFilterLabel()} resolution={resolution} />}
            {activeTab === 'personal' && <TabPersonal data={data} t={t} tr={tr} />}
            {activeTab === 'miDashboard' && <TabMiDashboard data={data} t={t} tr={tr} resolution={resolution} />}
          </>
        )}
      </div>

      {/* Modal seleccion de estacion */}
      {showStationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setShowStationModal(null); setSelectedStation(null); }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: t.text }}>
              {showStationModal === 'repair' ? 'Seleccionar Estacion de Reparacion' : 'Seleccionar Estacion de Liberacion'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              {showStationModal === 'repair'
                ? 'Selecciona la estacion donde realizaras las reparaciones'
                : 'Selecciona la estacion donde realizaras las liberaciones'
              }
            </p>

            {/* Lista de estaciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {stations[showStationModal]?.length > 0 ? (
                stations[showStationModal].map(station => (
                  <button
                    key={station.id}
                    onClick={() => setSelectedStation(station)}
                    style={{
                      padding: '12px 16px',
                      border: selectedStation?.id === station.id ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                      borderRadius: '8px',
                      backgroundColor: selectedStation?.id === station.id ? t.bgPanel : t.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: t.text }}>{station.name}</div>
                      {station.code && <div style={{ fontSize: '12px', color: t.textMuted }}>{station.code}</div>}
                    </div>
                    {selectedStation?.id === station.id && (
                      <span style={{ color: t.accent, fontWeight: '600' }}>OK</span>
                    )}
                  </button>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: t.textMuted }}>
                  No hay estaciones disponibles
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowStationModal(null); setSelectedStation(null); }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleStationConfirm}
                disabled={!selectedStation}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: selectedStation ? (showStationModal === 'repair' ? t.warning : t.success) : t.border,
                  color: 'white',
                  cursor: selectedStation ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Continuar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin - Requiere ambas estaciones */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setShowAdminModal(false); setAdminRepairStation(null); setAdminReleaseStation(null); }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '600px',
            maxHeight: '85vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: t.text }}>
              Hospital de Defectos - Configuracion
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              Selecciona las estaciones de trabajo para reparacion y liberacion
            </p>

            {loadingAdminStations ? (
              <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                Cargando estaciones...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Estación de Reparación */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: t.warning,
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    Estacion de Reparacion
                    {adminRepairStation && <span style={{ color: t.success }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflow: 'auto' }}>
                    {stations.repair?.length > 0 ? (
                      stations.repair.map(station => (
                        <button
                          key={station.id}
                          onClick={() => setAdminRepairStation(station)}
                          style={{
                            padding: '10px 14px',
                            border: adminRepairStation?.id === station.id ? `2px solid ${t.warning}` : `1px solid ${t.border}`,
                            borderRadius: '6px',
                            backgroundColor: adminRepairStation?.id === station.id ? `${t.warning}15` : t.bgCard,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>{station.name}</div>
                          {station.code && <div style={{ fontSize: '11px', color: t.textMuted }}>{station.code}</div>}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '15px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
                        No hay estaciones de reparacion
                      </div>
                    )}
                  </div>
                </div>

                {/* Estación de Liberación */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: t.success,
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    Estacion de Liberacion
                    {adminReleaseStation && <span style={{ color: t.success }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflow: 'auto' }}>
                    {stations.release?.length > 0 ? (
                      stations.release.map(station => (
                        <button
                          key={station.id}
                          onClick={() => setAdminReleaseStation(station)}
                          style={{
                            padding: '10px 14px',
                            border: adminReleaseStation?.id === station.id ? `2px solid ${t.success}` : `1px solid ${t.border}`,
                            borderRadius: '6px',
                            backgroundColor: adminReleaseStation?.id === station.id ? `${t.success}15` : t.bgCard,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>{station.name}</div>
                          {station.code && <div style={{ fontSize: '11px', color: t.textMuted }}>{station.code}</div>}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '15px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
                        No hay estaciones de liberacion
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => { setShowAdminModal(false); setAdminRepairStation(null); setAdminReleaseStation(null); }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdminConfirm}
                disabled={!adminRepairStation || !adminReleaseStation}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: (adminRepairStation && adminReleaseStation) ? t.primary : t.border,
                  color: 'white',
                  cursor: (adminRepairStation && adminReleaseStation) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Entrar al Hospital →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
