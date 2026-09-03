import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isUserAdmin } from '../utils/permissions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Settings, Plus, RotateCcw, Save, X,
  FileText, CheckCircle, XCircle, Clock, Target, AlertTriangle
} from 'lucide-react';
import ecrService from '../services/ecrService';
import {
  DashboardWidget, KPICard, ChartWidget, AdoptionWidget,
  RankingWidget, RiskHeatmapWidget, ECRTableWidget, FinancialWidget
} from '../components/ECR/Dashboard';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',      label: 'Resumen' },
  { id: 'volumen',      label: 'Volumen & Tendencias' },
  { id: 'financiero',   label: 'Impacto Financiero' },
  { id: 'calidad',      label: 'Calidad & Riesgo' },
  { id: 'proceso',      label: 'Proceso & Auditoría' },
  { id: 'cliente',      label: 'Cliente & Negocio' },
  { id: 'personalizado',label: 'Mi Dashboard' },
  { id: 'alertas',      label: 'Alertas' },
];

const PRESETS = [
  { label: 'Hoy',        days: 0    },
  { label: 'Semana',     days: 7    },
  { label: 'Mes actual', days: 30   },
  { label: 'Trimestre',  days: 90   },
  { label: 'Año',        days: 365  },
  { label: 'Todo',       days: null },
];

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── Mi Dashboard config ──────────────────────────────────────────────────────
const WIDGET_SIZES = [
  { key: 'sm', label: 'Pequeño',     cols: 1, desc: '1/4 pantalla' },
  { key: 'md', label: 'Mediano',     cols: 2, desc: '2/4 pantalla' },
  { key: 'lg', label: 'Medio grande',cols: 3, desc: '3/4 pantalla' },
  { key: 'xl', label: 'Grande',      cols: 4, desc: 'Pantalla completa' },
];

const ALL_WIDGETS = [
  // Resumen
  { id: 'w1',  type: 'kpi_total',            title: 'Total ECRs',          category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w2',  type: 'kpi_open',             title: 'Abiertos',            category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w3',  type: 'kpi_approved',         title: 'Aprobados',           category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w4',  type: 'kpi_rejected',         title: 'No Adoptables',       category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w5',  type: 'kpi_avg_time',         title: 'Tiempo Promedio',     category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w6',  type: 'kpi_effectiveness',    title: 'Efectividad',         category: 'Resumen',             defaultSize: 'sm' },
  { id: 'w13', type: 'chart_by_status',      title: 'Por Status',          category: 'Resumen',             defaultSize: 'md' },
  // Volumen & Tendencias
  { id: 'w9',  type: 'chart_trend',          title: 'Tendencia Mensual',   category: 'Volumen & Tendencias', defaultSize: 'lg' },
  { id: 'w10', type: 'chart_by_type',        title: 'Por Tipo de Cambio',  category: 'Volumen & Tendencias', defaultSize: 'md' },
  { id: 'w11', type: 'chart_by_category',    title: 'Por Categoría',       category: 'Volumen & Tendencias', defaultSize: 'md' },
  { id: 'w12', type: 'chart_by_priority',    title: 'Por Prioridad',       category: 'Volumen & Tendencias', defaultSize: 'md' },
  // Impacto Financiero
  { id: 'w7',  type: 'kpi_net_impact',       title: 'Balance Neto $',      category: 'Impacto Financiero',  defaultSize: 'sm' },
  { id: 'w16', type: 'financial_impact',     title: 'Impacto Financiero',  category: 'Impacto Financiero',  defaultSize: 'lg' },
  // Calidad & Riesgo
  { id: 'w8',  type: 'kpi_cpk',             title: 'CPK Promedio',        category: 'Calidad & Riesgo',    defaultSize: 'sm' },
  { id: 'w17', type: 'chart_cpk',            title: 'CPK Distribución',    category: 'Calidad & Riesgo',    defaultSize: 'md' },
  { id: 'w15', type: 'heatmap_risk',         title: 'Matriz de Riesgo',    category: 'Calidad & Riesgo',    defaultSize: 'lg' },
  // Proceso & Auditoría
  { id: 'w14', type: 'chart_adoption',       title: 'Adopción por Etapa',  category: 'Proceso & Auditoría', defaultSize: 'lg' },
  { id: 'w18', type: 'chart_audit',          title: 'Auditoría Cierre',    category: 'Proceso & Auditoría', defaultSize: 'md' },
  { id: 'w19', type: 'chart_ppap',           title: 'Estado PPAP',         category: 'Proceso & Auditoría', defaultSize: 'md' },
  // Cliente & Negocio
  { id: 'w20', type: 'ranking_clients',      title: 'Top Clientes',        category: 'Cliente & Negocio',   defaultSize: 'md' },
  { id: 'w21', type: 'ranking_areas',        title: 'Top Áreas',           category: 'Cliente & Negocio',   defaultSize: 'md' },
  { id: 'w22', type: 'ranking_responsibles', title: 'Top Responsables',    category: 'Cliente & Negocio',   defaultSize: 'md' },
];

const DEFAULT_WIDGETS = ALL_WIDGETS.filter(w =>
  ['w1','w2','w3','w4','w5','w6','w9','w10','w15','w16'].includes(w.id)
).map(w => ({ ...w, uid: w.id, size: w.defaultSize }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => {
  if (!n && n !== 0) return '$0';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n);
};

const convertToNumbers = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      value: parseInt(item.value) || 0,
      count: parseInt(item.count) || 0,
      created: parseInt(item.created) || 0,
      approved: parseInt(item.approved) || 0,
      rejected: parseInt(item.rejected) || 0,
      closed: parseInt(item.closed) || 0
    }));
  }
  return data;
};

// ─── TabBar ───────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onSelect, t }) => (
  <div style={{
    display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '2px',
    borderBottom: `2px solid ${t.border}`, marginBottom: '24px'
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        style={{
          padding: '10px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          fontSize: '13px', fontWeight: active === tab.id ? '600' : '500',
          color: active === tab.id ? t.accent : t.textMuted,
          borderBottom: active === tab.id ? `3px solid ${t.accent}` : '3px solid transparent',
          backgroundColor: 'transparent', transition: 'all 0.15s', marginBottom: '-2px'
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ─── Shared card wrapper ──────────────────────────────────────────────────────
const Card = ({ children, style, t }) => (
  <div style={{
    backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${t.border}`, ...style
  }}>
    {children}
  </div>
);

const CardTitle = ({ children, t }) => (
  <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    {children}
  </h3>
);

const SectionGrid = ({ children, cols = 'repeat(auto-fill, minmax(260px, 1fr))' }) => (
  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '16px' }}>{children}</div>
);

// ─── 1️⃣ Tab Resumen ──────────────────────────────────────────────────────────
const TabResumen = ({ data, ecrs, t, isAdmin, onDelete }) => {
  if (!data) return null;
  const { kpis, adoption, riskMatrix, riskMatrixMeta, financialImpact } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionGrid cols="repeat(auto-fit, minmax(180px, 1fr))">
        <KPICard value={kpis?.total || 0} label="Total ECRs" icon={<FileText size={22} color={t.accent} />} color={t.accent} />
        <KPICard value={kpis?.open || 0} label="En Proceso" icon={<Clock size={22} color="#C77700" />} color="#C77700" />
        <KPICard value={kpis?.closed || 0} label="Cerrados" icon={<CheckCircle size={22} color="#2E7D32" />} color="#2E7D32" />
        <KPICard value={kpis?.rejected || 0} label="No Adoptables" icon={<XCircle size={22} color="#ef4444" />} color="#ef4444" />
        <KPICard value={kpis?.avgApprovalDays || 0} label="Días Ciclo Prom." icon={<Clock size={22} color="#8b5cf6" />} color="#8b5cf6" format="days" decimals={1} />
        <KPICard value={kpis?.effectivenessRate || 0} label="Efectividad" icon={<Target size={22} color="#ec4899" />} color="#ec4899" format="percentage" decimals={1} />
      </SectionGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <Card t={t}>
          <FinancialWidget data={financialImpact} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Matriz de Riesgo (Severity × Occurrence)</CardTitle>
          <RiskHeatmapWidget riskMatrix={riskMatrix} riskMatrixMeta={riskMatrixMeta} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Funnel de Adopción ECR-1 → ECR-4</CardTitle>
          <AdoptionWidget adoption={adoption} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Top Clientes</CardTitle>
          <RankingWidget data={data.topClients} nameKey="name" valueKey="count" color={t.accent} />
        </Card>
      </div>

      <Card t={t}>
        <CardTitle t={t}>Lista de ECRs</CardTitle>
        <ECRTableWidget ecrs={ecrs} loading={false} isAdmin={isAdmin} onDelete={onDelete} />
      </Card>
    </div>
  );
};

// ─── 2️⃣ Tab Volumen & Tendencias ─────────────────────────────────────────────
const TabVolumen = ({ data, t }) => {
  if (!data) return null;
  const { trends, byType, byCategory, byPriority, byDepartment } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card t={t} style={{ gridColumn: 'span 2' }}>
        <CardTitle t={t}>Tendencia Mensual (últimos 12 meses)</CardTitle>
        <ChartWidget type="line" data={trends || []} xAxisKey="monthLabel"
          lines={[
            { key: 'created',  color: '#0072CE', name: 'Creados' },
            { key: 'approved', color: '#2E7D32', name: 'Aprobados' },
            { key: 'rejected', color: '#ef4444', name: 'No Adoptables' }
          ]} height={220} />
      </Card>
      <SectionGrid cols="repeat(auto-fit, minmax(260px, 1fr))">
        <Card t={t}>
          <CardTitle t={t}>Por Tipo de Cambio</CardTitle>
          <ChartWidget type="horizontalBar" data={byType || []} height={200} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Por Categoría</CardTitle>
          <ChartWidget type="horizontalBar" data={byCategory || []} height={200} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Por Prioridad</CardTitle>
          <ChartWidget type="horizontalBar" data={byPriority || []} colorMap="priority" height={200} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Por Departamento Solicitante</CardTitle>
          <ChartWidget type="horizontalBar" data={byDepartment || []} height={200} />
        </Card>
      </SectionGrid>
    </div>
  );
};

// ─── 3️⃣ Tab Impacto Financiero ───────────────────────────────────────────────
const TabFinanciero = ({ data, t, qualityTargets = { initialScrapTarget: 5 } }) => {
  if (!data) return null;
  const { financialImpact, scrapStats } = data;
  const fi = financialImpact || {};
  const byType = fi.byType || {};

  const typeData = [
    { name: 'Scrap',      value: byType.scrap      || 0, color: '#ef4444' },
    { name: 'Rework',     value: byType.rework     || 0, color: '#f97316' },
    { name: 'Inversión',  value: byType.investment || 0, color: '#3b82f6' },
    { name: 'T. Extra',   value: byType.overtime   || 0, color: '#8b5cf6' },
    { name: 'Logística',  value: byType.logistics  || 0, color: '#06b6d4' },
    { name: 'Otros',      value: byType.other_expense || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionGrid cols="repeat(4, 1fr)">
        <Card t={t}>
          <CardTitle t={t}>Costo Total Acumulado</CardTitle>
          <div style={{ fontSize: '26px', fontWeight: '600', color: t.errorFg }}>{fmt$(fi.totalCost)}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>{fi.withData || 0} ECRs con datos financieros</div>
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Ahorro Total Acumulado</CardTitle>
          <div style={{ fontSize: '26px', fontWeight: '600', color: t.successFg }}>{fmt$(fi.totalSavings)}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>{fi.negativeCount || 0} ECRs con ahorro neto</div>
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Balance Neto</CardTitle>
          <div style={{ fontSize: '26px', fontWeight: '600', color: (fi.netImpact || 0) <= 0 ? t.successFg : t.errorFg }}>
            {(fi.netImpact || 0) <= 0 ? '-' : '+'}{fmt$(Math.abs(fi.netImpact || 0))}
          </div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
            {(fi.netImpact || 0) <= 0 ? 'Ahorros superan costos' : 'Costos superan ahorros'}
          </div>
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Scrap Inicial Promedio</CardTitle>
          <div style={{ fontSize: '26px', fontWeight: '600', color: scrapStats?.avg != null ? (scrapStats.avg > qualityTargets.initialScrapTarget ? t.errorFg : t.successFg) : t.textMuted }}>
            {scrapStats?.avg != null ? `${scrapStats.avg}%` : 'Sin datos'}
          </div>
          <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>Basado en {scrapStats?.total || 0} ECRs cerrados</div>
          {scrapStats?.avg != null && (
            <div style={{ marginTop: '8px', padding: '4px 10px', borderRadius: '6px', display: 'inline-block', backgroundColor: scrapStats.avg > qualityTargets.initialScrapTarget ? t.errorBg : t.successBg, fontSize: '11px', fontWeight: '600', color: scrapStats.avg > qualityTargets.initialScrapTarget ? t.errorFg : t.successFg }}>
              {scrapStats.avg > qualityTargets.initialScrapTarget ? `>${qualityTargets.initialScrapTarget}%` : `≤${qualityTargets.initialScrapTarget}%`}
            </div>
          )}
        </Card>
      </SectionGrid>

      <SectionGrid cols="1fr 1fr">
        <Card t={t}>
          <CardTitle t={t}>Distribución de Costos</CardTitle>
          {typeData.length > 0
            ? <ChartWidget type="donut" data={typeData} height={220} />
            : <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px 0', fontSize: '13px' }}>Sin datos de costos aún</div>
          }
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Desglose por Tipo</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {[
              { label: 'Scrap',      value: byType.scrap       || 0, color: '#ef4444' },
              { label: 'Rework',     value: byType.rework      || 0, color: '#f97316' },
              { label: 'Inversión',  value: byType.investment  || 0, color: '#3b82f6' },
              { label: 'T. Extra',   value: byType.overtime    || 0, color: '#8b5cf6' },
              { label: 'Logística',  value: byType.logistics   || 0, color: '#06b6d4' },
              { label: 'Ahorros',    value: fi.totalSavings    || 0, color: '#166534' },
            ].map(row => {
              const total = (fi.totalCost || 0) + (fi.totalSavings || 0) || 1;
              const pct = Math.round(row.value / total * 100);
              return (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: t.text }}>{row.label}</span>
                    <span style={{ fontWeight: '600', color: row.color }}>{fmt$(row.value)}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: row.color, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </SectionGrid>
    </div>
  );
};

// ─── 4️⃣ Tab Calidad & Riesgo ─────────────────────────────────────────────────
const CapabilityAvgCard = ({ stats, title, subtitle, t, target = 1.33 }) => {
  const s = stats || {};
  const marginalMin = Math.min(target, 1.0);
  return (
    <Card t={t}>
      <CardTitle t={t}>{title}</CardTitle>
      {subtitle && <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '8px' }}>{subtitle}</div>}
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '36px', fontWeight: '600', color: s.avg != null ? (s.avg >= target ? t.successFg : s.avg >= marginalMin ? t.warningFg : t.errorFg) : t.textMuted }}>
          {s.avg != null ? s.avg.toFixed(3) : 'N/D'}
        </div>
        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>Meta: ≥ {target} · {s.total || 0} ECRs con datos</div>
        {s.avg != null && (
          <div style={{ marginTop: '8px', padding: '4px 12px', borderRadius: '12px', display: 'inline-block', fontSize: '12px', fontWeight: '600',
            backgroundColor: s.avg >= target ? t.successBg : s.avg >= marginalMin ? t.warningBg : t.errorBg,
            color: s.avg >= target ? t.successFg : s.avg >= marginalMin ? t.warningFg : t.errorFg
          }}>
            {s.avg >= target ? 'Proceso Capaz' : s.avg >= marginalMin ? 'Marginal' : 'No Capaz'}
          </div>
        )}
      </div>
    </Card>
  );
};

const CapabilityDetailCard = ({ stats, title, t, target = 1.33 }) => {
  const s = stats || {};
  const marginalMin = Math.min(target, 1.0);
  return (
    <Card t={t}>
      <CardTitle t={t}>{title}</CardTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        {[
          { label: `Capaz (≥${target})`,     value: s.capable    || 0, bg: t.successBg, color: t.successFg },
          { label: `Marginal (${marginalMin}–${target})`, value: s.marginal   || 0, bg: t.warningBg, color: t.warningFg },
          { label: `No capaz (<${marginalMin})`,   value: s.notCapable || 0, bg: t.errorBg, color: t.errorFg },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', backgroundColor: row.bg }}>
            <span style={{ fontSize: '12px', color: row.color, fontWeight: '500' }}>{row.label}</span>
            <span style={{ fontSize: '18px', fontWeight: '600', color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const TabCalidadRiesgo = ({ data, t, qualityTargets }) => {
  if (!data) return null;
  const { cpStats, cpkStats, riskMatrix, riskMatrixMeta, topAreas } = data;
  const cpTarget = qualityTargets?.cpTarget || 1.33;
  const cpkTarget = qualityTargets?.cpkTarget || 1.33;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionGrid cols="repeat(4, 1fr)">
        <CapabilityAvgCard    stats={cpStats}  title="CP — Capacidad Potencial"  subtitle="Promedio post-cambio" t={t} target={cpTarget} />
        <CapabilityDetailCard stats={cpStats}  title="Detalle CP" t={t} target={cpTarget} />
        <CapabilityAvgCard    stats={cpkStats} title="CPK — Capacidad Real"      subtitle="Promedio post-cambio" t={t} target={cpkTarget} />
        <CapabilityDetailCard stats={cpkStats} title="Detalle CPK" t={t} target={cpkTarget} />
      </SectionGrid>

      <SectionGrid cols="1fr 1fr">
        <Card t={t}>
          <CardTitle t={t}>Matriz de Riesgo (Severity × Occurrence)</CardTitle>
          <RiskHeatmapWidget riskMatrix={riskMatrix} riskMatrixMeta={riskMatrixMeta} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Áreas Más Impactadas</CardTitle>
          <RankingWidget data={topAreas} nameKey="name" valueKey="count" color="#2E7D32" />
        </Card>
      </SectionGrid>
    </div>
  );
};

// ─── 5️⃣ Tab Proceso & Auditoría ──────────────────────────────────────────────
const TabProcesoAuditoria = ({ data, t }) => {
  if (!data) return null;
  const { ppapStats, closureAuditStats, agingStats } = data;
  const ag = agingStats || {};
  const ps = ppapStats || {};
  const cas = closureAuditStats || {};

  const auditJudgmentData = [
    { name: 'OK',  value: cas.byJudgment?.ok  || 0, color: '#166534' },
    { name: 'NOK', value: cas.byJudgment?.nok || 0, color: '#991b1b' },
    { name: 'OBS', value: cas.byJudgment?.obs || 0, color: '#C77700' },
    { name: 'N/A', value: cas.byJudgment?.na  || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const ppapChartData = (ps.byLevel || []).map(r => ({ name: `Nivel ${r.level}`, value: r.count }));

  const completedPct = cas.totalItems > 0 ? Math.round(cas.completed / cas.totalItems * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Antigüedad ECRs Abiertos */}
      <Card t={t}>
        <CardTitle t={t}>Días Abierto — ECRs en Proceso</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '38px', fontWeight: '600', color: ag.avgDaysOpen != null ? (ag.avgDaysOpen <= 7 ? t.successFg : ag.avgDaysOpen <= 30 ? t.warningFg : t.errorFg) : t.textMuted }}>
              {ag.avgDaysOpen != null ? `${ag.avgDaysOpen}` : 'N/D'}
            </div>
            <div style={{ fontSize: '11px', color: t.textMuted }}>días promedio · {ag.openTotal || 0} abiertos</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: '0–7 días',   value: ag.open07,     color: '#166534', bg: '#dcfce7' },
              { label: '8–30 días',  value: ag.open830,    color: '#C77700', bg: '#fef3c7' },
              { label: '31–90 días', value: ag.open3190,   color: '#c2410c', bg: '#ffedd5' },
              { label: '+90 días',   value: ag.open90plus, color: '#991b1b', bg: '#fee2e2' },
            ].map(row => {
              const total = ag.openTotal || 1;
              const pct = Math.min(Math.round((row.value / total) * 100), 100);
              return (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span style={{ color: t.text }}>{row.label}</span>
                    <span style={{ fontWeight: '600', color: row.color }}>{row.value}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: row.color, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* PPAP */}
      <Card t={t}>
        <CardTitle t={t}>Estado PPAP por Nivel</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ChartWidget type="bar" data={ppapChartData} height={180} showLegend={false} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            {(ps.byLevel || []).map(r => (
              <div key={r.level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', backgroundColor: t.bg, borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', color: t.text }}>Nivel {r.level}</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: t.accent }}>{r.count}</span>
              </div>
            ))}
            {(ps.byLevel || []).length === 0 && (
              <div style={{ fontSize: '13px', color: t.textMuted, textAlign: 'center' }}>Sin datos de PPAP aún</div>
            )}
          </div>
        </div>
      </Card>

      {/* Auditoría de Cierre */}
      <SectionGrid cols="repeat(3, 1fr)">
        <Card t={t}>
          <CardTitle t={t}>Progreso Auditoría</CardTitle>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '600', color: completedPct >= 80 ? t.successFg : completedPct >= 50 ? t.warningFg : t.errorFg }}>
              {completedPct}%
            </div>
            <div style={{ fontSize: '12px', color: t.textMuted }}>{cas.completed || 0} de {cas.totalItems || 0} items completados</div>
            <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', marginTop: '12px' }}>
              <div style={{ height: '100%', width: `${completedPct}%`, backgroundColor: completedPct >= 80 ? t.success : completedPct >= 50 ? t.warning : t.error, borderRadius: '4px', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px' }}>{cas.ecrsWithAudit || 0} ECRs con auditoría activa</div>
          </div>
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Juicios de Auditoría</CardTitle>
          {auditJudgmentData.length > 0
            ? <ChartWidget type="donut" data={auditJudgmentData} height={180} />
            : <div style={{ textAlign: 'center', color: t.textMuted, padding: '40px 0', fontSize: '13px' }}>Sin juicios registrados aún</div>
          }
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Detalle Auditoría</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {[
              { label: 'OK',   value: cas.byJudgment?.ok  || 0, color: t.successFg, bg: t.successBg },
              { label: 'NOK',  value: cas.byJudgment?.nok || 0, color: t.errorFg, bg: t.errorBg },
              { label: 'OBS',  value: cas.byJudgment?.obs || 0, color: t.warningFg, bg: t.warningBg },
              { label: 'N/A',  value: cas.byJudgment?.na  || 0, color: t.textMuted, bg: t.bg },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: row.bg }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: row.color }}>{row.label}</span>
                <span style={{ fontSize: '18px', fontWeight: '600', color: row.color }}>{row.value}</span>
              </div>
            ))}
            {cas.avgRounds != null && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: t.textMuted, textAlign: 'center' }}>
                Rondas promedio: <strong style={{ color: t.text }}>{cas.avgRounds}</strong>
              </div>
            )}
          </div>
        </Card>
      </SectionGrid>
    </div>
  );
};

// ─── 6️⃣ Tab Cliente & Negocio ────────────────────────────────────────────────
const TabClienteNegocio = ({ data, t }) => {
  if (!data) return null;
  const { topClients, topAreas } = data;

  const total = (topClients || []).reduce((s, c) => s + (Number(c.count) || 0), 0) || 1;
  const clientPct = (topClients || []).slice(0, 8).map(c => ({
    name: c.name,
    value: Math.round((Number(c.count) || 0) / total * 100)
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionGrid cols="repeat(2, 1fr)">
        <Card t={t}>
          <CardTitle t={t}>Top Clientes por Volumen</CardTitle>
          <RankingWidget data={topClients} nameKey="name" valueKey="count" color={t.accent} />
        </Card>
        <Card t={t}>
          <CardTitle t={t}>Participación por Cliente</CardTitle>
          <ChartWidget type="horizontalBar" data={clientPct} valueSuffix="%" height={220} />
        </Card>
      </SectionGrid>
      <Card t={t}>
        <CardTitle t={t}>Top Áreas más Impactadas</CardTitle>
        <ChartWidget type="horizontalBar" data={topAreas || []} dataKey="count" height={220} />
      </Card>
    </div>
  );
};

// ─── EcrSortableCell ─────────────────────────────────────────────────────────
const SIZE_COLS = { sm: 1, md: 2, lg: 3, xl: 4 };

const EcrSortableCell = ({ widget, isEditMode, onRemove, children }) => {
  const cols = SIZE_COLS[widget.size] || 1;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.uid });
  const cellStyle = {
    gridColumn: `span ${cols}`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={cellStyle}>
      <DashboardWidget
        id={widget.uid}
        title={widget.title}
        isEditMode={isEditMode}
        onRemove={onRemove}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        style={{ minHeight: cols === 1 ? '140px' : '280px' }}
      >
        {children}
      </DashboardWidget>
    </div>
  );
};

// ─── EcrDragGhost ─────────────────────────────────────────────────────────────
const EcrDragGhost = ({ widget, t }) => (
  <div style={{ backgroundColor: t.bgCard, border: `2px solid ${t.accent}`, borderRadius: '12px', padding: '14px', boxShadow: `0 16px 40px ${t.accent}44`, opacity: 0.95, minWidth: '200px', transform: 'rotate(2deg)' }}>
    <div style={{ fontSize: '12px', fontWeight: '600', color: t.accent }}>{widget?.title}</div>
    <div style={{ fontSize: '11px', color: t.textMuted }}>Arrastrando…</div>
  </div>
);

// ─── 7️⃣ Tab Mi Dashboard (drag & drop) ───────────────────────────────────────
const TabPersonalizado = ({ data, ecrs, t, isAdmin, onDelete, sensors, onSaveConfig, onResetConfig }) => {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('ecr-custom-dashboard-v2');
      return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    } catch { return DEFAULT_WIDGETS; }
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [pendingWidget, setPendingWidget] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const save = () => {
    localStorage.setItem('ecr-custom-dashboard-v2', JSON.stringify(widgets));
    setHasChanges(false);
    setIsEditMode(false);
    if (onSaveConfig) onSaveConfig(widgets);
  };

  const reset = () => {
    if (window.confirm('¿Restaurar dashboard a configuración por defecto?')) {
      setWidgets(DEFAULT_WIDGETS);
      setHasChanges(true);
    }
  };

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWidgets(prev => {
        const oldIndex = prev.findIndex(w => w.uid === active.id);
        const newIndex = prev.findIndex(w => w.uid === over.id);
        setHasChanges(true);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const addWidget = (size) => {
    if (!pendingWidget) return;
    const newWidget = { ...pendingWidget, uid: `w${Date.now()}`, size };
    setWidgets(prev => [...prev, newWidget]);
    setHasChanges(true);
    setPendingWidget(null);
  };

  const removeWidget = (uid) => {
    setWidgets(prev => prev.filter(w => w.uid !== uid));
    setHasChanges(true);
  };

  const toggleCatalogWidget = (catalogItem) => {
    const active = widgets.some(w => w.id === catalogItem.id);
    if (active) {
      setWidgets(prev => prev.filter(w => w.id !== catalogItem.id));
      setHasChanges(true);
    } else {
      setPendingWidget(catalogItem);
    }
  };

  // Auto-save cuando cambian los widgets
  React.useEffect(() => {
    if (hasChanges) {
      localStorage.setItem('ecr-custom-dashboard-v2', JSON.stringify(widgets));
    }
  }, [widgets, hasChanges]);

  const renderContent = (widget) => {
    if (!data) return <div style={{ padding: '20px', color: t.textMuted, textAlign: 'center' }}>Cargando...</div>;
    const { kpis, trends, byType, byCategory, byPriority, byStatus, adoption, riskMatrix, riskMatrixMeta, topClients, topAreas, topResponsibles, financialImpact, cpkStats } = data;

    switch (widget.type) {
      case 'kpi_total':         return <KPICard value={kpis?.total || 0} label="Total ECRs" icon={<FileText size={22} color={t.accent} />} color={t.accent} />;
      case 'kpi_open':          return <KPICard value={kpis?.open || 0} label="Abiertos" icon={<Clock size={22} color="#C77700" />} color="#C77700" />;
      case 'kpi_approved':      return <KPICard value={kpis?.approved || 0} label="Aprobados" icon={<CheckCircle size={22} color="#2E7D32" />} color="#2E7D32" />;
      case 'kpi_rejected':      return <KPICard value={kpis?.rejected || 0} label="No Adoptables" icon={<XCircle size={22} color="#ef4444" />} color="#ef4444" />;
      case 'kpi_avg_time':      return <KPICard value={kpis?.avgApprovalDays || 0} label="Días Ciclo" icon={<Clock size={22} color="#8b5cf6" />} color="#8b5cf6" format="days" decimals={1} />;
      case 'kpi_effectiveness': return <KPICard value={kpis?.effectivenessRate || 0} label="Efectividad" icon={<Target size={22} color="#ec4899" />} color="#ec4899" format="percentage" decimals={1} />;
      case 'kpi_net_impact':    return <KPICard value={Math.abs(financialImpact?.netImpact || 0)} label="Balance Neto $" icon={<Target size={22} color={(financialImpact?.netImpact||0)<=0?'#166534':'#991b1b'} />} color={(financialImpact?.netImpact||0)<=0?'#166534':'#991b1b'} />;
      case 'kpi_cpk':           return <KPICard value={cpkStats?.avg || 0} label="CPK Promedio" icon={<Target size={22} color={(cpkStats?.avg||0)>=1.33?'#166534':'#991b1b'} />} color={(cpkStats?.avg||0)>=1.33?'#166534':'#991b1b'} decimals={3} />;
      case 'chart_trend':       return <ChartWidget type="line" data={trends||[]} xAxisKey="monthLabel" lines={[{key:'created',color:'#0072CE',name:'Creados'},{key:'approved',color:'#2E7D32',name:'Aprobados'},{key:'rejected',color:'#ef4444',name:'No Adoptables'}]} height={200} />;
      case 'chart_by_type':     return <ChartWidget type="horizontalBar" data={byType||[]} height={200} />;
      case 'chart_by_category': return <ChartWidget type="horizontalBar" data={byCategory||[]} height={200} />;
      case 'chart_by_priority': return <ChartWidget type="horizontalBar" data={byPriority||[]} colorMap="priority" height={200} />;
      case 'chart_by_status':   return <ChartWidget type="bar" data={byStatus||[]} colorMap="status" height={200} showLegend={false} />;
      case 'chart_adoption':    return <AdoptionWidget adoption={adoption} />;
      case 'heatmap_risk':      return <RiskHeatmapWidget riskMatrix={riskMatrix} riskMatrixMeta={riskMatrixMeta} />;
      case 'financial_impact':  return <FinancialWidget data={financialImpact} />;
      case 'chart_cpk':
        const cpkD = [{name:'Capaz',value:cpkStats?.capable||0,color:'#166534'},{name:'Marginal',value:cpkStats?.marginal||0,color:'#C77700'},{name:'No capaz',value:cpkStats?.notCapable||0,color:'#991b1b'}].filter(d=>d.value>0);
        return cpkD.length > 0 ? <ChartWidget type="horizontalBar" data={cpkD} height={200} /> : <div style={{textAlign:'center',color:t.textMuted,padding:'40px 0'}}>Sin datos CPK</div>;
      case 'ranking_clients':       return <RankingWidget data={topClients} nameKey="name" valueKey="count" color={t.accent} />;
      case 'ranking_areas':         return <RankingWidget data={topAreas} nameKey="name" valueKey="count" color="#2E7D32" />;
      case 'ranking_responsibles':  return <RankingWidget data={topResponsibles} nameKey="name" valueKey="count" color="#8b5cf6" />;
      case 'chart_ppap':
        const ppapData = (data.ppapStats?.byLevel || []).map(r => ({ name: `Nivel ${r.level}`, value: r.count }));
        return ppapData.length > 0 ? <ChartWidget type="bar" data={ppapData} height={180} showLegend={false} /> : <div style={{textAlign:'center',color:t.textMuted,padding:'40px 0'}}>Sin datos PPAP</div>;
      case 'chart_audit':
        const cas = data.closureAuditStats || {};
        const auditData = [
          { name: 'OK',  value: cas.byJudgment?.ok  || 0, color: '#166534' },
          { name: 'NOK', value: cas.byJudgment?.nok || 0, color: '#991b1b' },
          { name: 'OBS', value: cas.byJudgment?.obs || 0, color: '#C77700' },
          { name: 'N/A', value: cas.byJudgment?.na  || 0, color: '#6b7280' },
        ].filter(d => d.value > 0);
        return auditData.length > 0 ? <ChartWidget type="donut" data={auditData} height={180} /> : <div style={{textAlign:'center',color:t.textMuted,padding:'40px 0'}}>Sin datos de auditoría</div>;
      default: return <div style={{color:'#ef4444',fontSize:'12px',textAlign:'center',padding:'20px'}}>Widget desconocido</div>;
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {!isEditMode ? (
          <button onClick={() => setIsEditMode(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:`1px solid ${t.border}`, backgroundColor:t.bgCard, color:t.text, cursor:'pointer', fontSize:'13px' }}>
            <Settings size={14} /> Personalizar
          </button>
        ) : (
          <>
            <button onClick={() => setShowCatalog(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:'none', backgroundColor:t.accent, color:'white', cursor:'pointer', fontSize:'13px' }}>
              <Plus size={14} /> Agregar Widget
            </button>
            <button onClick={reset} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:`1px solid ${t.border}`, backgroundColor:t.bgCard, color:t.textMuted, cursor:'pointer', fontSize:'13px' }}>
              <RotateCcw size={14} /> Restaurar
            </button>
            {hasChanges && (
              <button onClick={save} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:'none', backgroundColor: t.success, color:'white', cursor:'pointer', fontSize:'13px' }}>
                <Save size={14} /> Guardar
              </button>
            )}
            <button onClick={() => setIsEditMode(false)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:`1px solid ${t.border}`, backgroundColor:t.bgCard, color:t.textMuted, cursor:'pointer', fontSize:'13px' }}>
              <X size={14} /> Cancelar
            </button>
          </>
        )}
      </div>

      {isEditMode && (
        <div style={{ backgroundColor: t.accentBg, borderRadius:'10px', padding:'10px 16px', marginBottom:'16px', border:`2px dashed ${t.accent}`, fontSize:'13px', color: t.accent, fontWeight:'600' }}>
          Modo edición — Arrastra para reorganizar, usa × para quitar widgets
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map(w => w.uid)} strategy={rectSortingStrategy}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', alignItems:'start' }}>
            {widgets.map(widget => (
              <EcrSortableCell key={widget.uid} widget={widget} isEditMode={isEditMode} onRemove={removeWidget}>
                {renderContent(widget)}
              </EcrSortableCell>
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeId ? <EcrDragGhost widget={widgets.find(w => w.uid === activeId)} t={t} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Catalog Modal */}
      {showCatalog && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => { setShowCatalog(false); setPendingWidget(null); }}>
          <div style={{ backgroundColor:t.bgCard, borderRadius:'16px', padding:'24px', maxWidth:'600px', width:'92%', maxHeight:'82vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div>
                <h2 style={{ margin:0, fontSize:'17px', fontWeight:'600', color:t.text }}>
                  {pendingWidget ? `Tamaño — ${pendingWidget.title}` : 'Widgets del Dashboard'}
                </h2>
                {pendingWidget && (
                  <button onClick={() => setPendingWidget(null)} style={{ background:'none', border:'none', cursor:'pointer', color:t.accent, fontSize:'12px', padding:0, marginTop:'4px' }}>
                    ← Volver al catálogo
                  </button>
                )}
              </div>
              <button onClick={() => { setShowCatalog(false); setPendingWidget(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted }}><X size={20} /></button>
            </div>

            {/* Step 1 — Catálogo por sección con selección múltiple */}
            {!pendingWidget && (() => {
              const sections = [...new Set(ALL_WIDGETS.map(w => w.category))];
              const activeCount = widgets.filter(w => ALL_WIDGETS.some(c => c.id === w.id)).length;
              return (
                <>
                  <p style={{ margin:'0 0 16px', fontSize:'12px', color:t.textMuted }}>
                    {activeCount} widget{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''} — click para quitar, click en inactivo para agregar con tamaño
                  </p>
                  {sections.map(section => {
                    const items = ALL_WIDGETS.filter(w => w.category === section);
                    return (
                      <div key={section} style={{ marginBottom:'20px' }}>
                        <div style={{ fontSize:'11px', fontWeight:'700', color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px', paddingBottom:'4px', borderBottom:`1px solid ${t.border}` }}>{section}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                          {items.map(item => {
                            const active = widgets.some(w => w.id === item.id);
                            return (
                              <button key={item.id} onClick={() => toggleCatalogWidget(item)}
                                style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 12px', borderRadius:'8px', border:`2px solid ${active ? t.accent : t.border}`, backgroundColor: active ? t.accent + '18' : t.bgPanel, color: active ? t.accent : t.text, cursor:'pointer', fontSize:'12px', fontWeight: active ? '600' : '500', transition:'all 0.15s' }}>
                                <span>{item.title}</span>
                                {active && <span style={{ fontSize:'11px', fontWeight:'600' }}></span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* Step 2 — Selector de tamaño */}
            {pendingWidget && (
              <div>
                <p style={{ fontSize:'13px', color:t.textMuted, marginBottom:'20px' }}>Selecciona qué espacio ocupará en el grid (4 columnas total):</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  {WIDGET_SIZES.map(sz => (
                    <button key={sz.key} onClick={() => addWidget(sz.key)}
                      style={{ padding:'18px 16px', borderRadius:'10px', border:`2px solid ${sz.key === pendingWidget.defaultSize ? t.accent : t.border}`, backgroundColor: sz.key === pendingWidget.defaultSize ? t.accent + '15' : t.bgPanel, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.backgroundColor = t.accent + '15'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = sz.key === pendingWidget.defaultSize ? t.accent : t.border; e.currentTarget.style.backgroundColor = sz.key === pendingWidget.defaultSize ? t.accent + '15' : t.bgPanel; }}>
                      <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ height:'10px', flex:1, borderRadius:'3px', backgroundColor: i <= sz.cols ? t.accent : t.border }} />
                        ))}
                      </div>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:t.text }}>{sz.label}</div>
                      <div style={{ fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>{sz.desc}</div>
                      {sz.key === pendingWidget.defaultSize && <div style={{ fontSize:'10px', color:t.accent, fontWeight:'600', marginTop:'4px' }}>Recomendado</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

// ─── 8️⃣ Tab Alertas ──────────────────────────────────────────────────────────
const TabAlertas = ({ data, ecrs, t, navigate }) => {
  if (!data) return null;
  const { kpis, cpkStats, financialImpact, closureAuditStats } = data;

  const ALERT_DAYS = 30;
  const now = new Date();
  const overdue = ecrs.filter(e => {
    if (!['draft','submitted'].includes(e.status)) return false;
    const created = new Date(e.createdAt);
    return (now - created) / 86400000 > ALERT_DAYS;
  });

  const alerts = [
    cpkStats?.notCapable > 0 && {
      level: 'error', title: `${cpkStats.notCapable} ECR(s) con CPK < 1.0`,
      desc: 'Procesos no capaces según IATF 8.3.2.3 — requieren acción inmediata'
    },
    cpkStats?.marginal > 0 && {
      level: 'warning', title: `${cpkStats.marginal} ECR(s) con CPK marginal (1.0–1.33)`,
      desc: 'Procesos marginales — requieren monitoreo estricto'
    },
    (financialImpact?.netImpact || 0) > 0 && {
      level: 'warning', title: `Balance neto negativo: ${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0}).format(financialImpact.netImpact)}`,
      desc: 'Los costos superan los ahorros en el período seleccionado'
    },
    overdue.length > 0 && {
      level: 'error', title: `${overdue.length} ECR(s) abiertos más de ${ALERT_DAYS} días`,
      desc: `ECRs sin cerrar: ${overdue.map(e => e.ecrNumber).join(', ')}`
    },
    closureAuditStats?.byJudgment?.nok > 0 && {
      level: 'warning', title: `${closureAuditStats.byJudgment.nok} item(s) de auditoría con NOK`,
      desc: 'Items de auditoría de cierre con juicio negativo pendientes de resolución'
    },
  ].filter(Boolean);

  const colors = {
    error:   { bg: t.errorBg, border: t.error, text: t.errorFg },
    warning: { bg: t.warningBg, border: t.warning, text: t.warningFg },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {alerts.length === 0 ? (
        <Card t={t}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: t.textMuted }}>Sin alertas activas</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>Todos los indicadores dentro de parámetros</div>
          </div>
        </Card>
      ) : (
        alerts.map((alert, idx) => {
          const c = colors[alert.level];
          return (
            <div key={idx} style={{ padding: '16px 20px', borderRadius: '10px', backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={20} color={c.text} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', color: c.text, fontSize: '14px' }}>{alert.title}</div>
                  <div style={{ fontSize: '12px', color: c.text, opacity: 0.8, marginTop: '4px' }}>{alert.desc}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ECRDashboardAdvanced = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const isAdmin = isUserAdmin(user);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ecr-dashboard-tab') || 'resumen');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [qualityTargets, setQualityTargets] = useState({ cpTarget: 1.33, cpkTarget: 1.33, processStabilityTarget: 95, initialScrapTarget: 5 });
  const [ecrs, setEcrs] = useState([]);
  const [preset, setPreset] = useState(() => localStorage.getItem('ecr-dashboard-preset') || 'Mes actual');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', clientId: '', department: '', riskLevel: '', status: '' });

  const applyPreset = useCallback((name) => {
    setPreset(name);
    localStorage.setItem('ecr-dashboard-preset', name);
    const p = PRESETS.find(p => p.label === name);
    if (!p) return;
    const to = localToday();
    if (p.days === null) { setFilters(f => ({ ...f, startDate: '', endDate: '' })); return; }
    if (p.days === 0)    { setFilters(f => ({ ...f, startDate: to, endDate: to })); return; }
    const d = new Date(); d.setDate(d.getDate() - p.days);
    const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setFilters(f => ({ ...f, startDate: from, endDate: to }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('ecr-dashboard-tab', tab);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [statsRes, ecrsRes, targetsRes] = await Promise.all([
        ecrService.getDashboardStats(filters),
        ecrService.getAllECRs(),
        fetch('http://localhost:5000/ecr/quality-targets', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null)
      ]);
      if (targetsRes?.success && targetsRes.targets) {
        const d = targetsRes.targets;
        setQualityTargets({ cpTarget: parseFloat(d.cp_target), cpkTarget: parseFloat(d.cpk_target), processStabilityTarget: parseFloat(d.process_stability_target), initialScrapTarget: parseFloat(d.initial_scrap_target) });
      }
      if (statsRes.success) {
        const d = statsRes.data;
        setStats({
          ...d,
          trends:           convertToNumbers(d.trends),
          byType:           convertToNumbers(d.byType),
          byCategory:       convertToNumbers(d.byCategory),
          byPriority:       convertToNumbers(d.byPriority),
          byDepartment:     convertToNumbers(d.byDepartment),
          byStatus:         convertToNumbers(d.byStatus),
          topClients:       convertToNumbers(d.topClients),
          topAreas:         convertToNumbers(d.topAreas),
          topResponsibles:  convertToNumbers(d.topResponsibles),
        });
      }
      if (ecrsRes.success) setEcrs(ecrsRes.ecrs || []);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { applyPreset(localStorage.getItem('ecr-dashboard-preset') || 'Mes actual'); }, [applyPreset]);

  const handleDeleteECR = async (ecrId) => {
    await ecrService.deleteECR(ecrId);
    loadData();
  };

  // Filter ECRs based on date and status filters
  const filteredEcrs = useMemo(() => {
    return ecrs.filter(ecr => {
      // Date filter
      if (filters.startDate || filters.endDate) {
        const ecrDate = ecr.createdAt ? ecr.createdAt.split('T')[0] : '';
        if (filters.startDate && ecrDate < filters.startDate) return false;
        if (filters.endDate && ecrDate > filters.endDate) return false;
      }
      // Status filter
      if (filters.status && ecr.status !== filters.status) return false;
      // Client filter
      if (filters.clientId && ecr.clientId !== parseInt(filters.clientId)) return false;
      return true;
    });
  }, [ecrs, filters]);

  const inputStyle = { padding: '8px 12px', borderRadius: '6px', border: `1px solid ${t.border}`, fontSize: '13px', backgroundColor: t.bgCard, color: t.text };
  const btnStyle = (variant) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
    ...(variant === 'primary'   ? { backgroundColor: t.accent,   color: 'white' } :
        variant === 'success'   ? { backgroundColor: t.success,  color: 'white' } :
        { backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}` })
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: '24px' }}>
      {/* Header */}
      <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '16px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontSize: '14px' }}>← Volver</button>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: t.text }}>ECR Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <ThemeSelector />
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: t.border }} />
          <button style={btnStyle('secondary')} onClick={() => navigate('/ecr-dashboard-simple')}>
            <FileText size={14} /> Listado ECR
          </button>
          {isAdmin && (
            <button style={btnStyle('secondary')} onClick={() => navigate('/ecr-config')}>
              <Settings size={14} /> Configuración
            </button>
          )}
          <button style={btnStyle('success')} onClick={() => navigate('/ecr-workflow')}>
            <Plus size={14} /> Nuevo ECR
          </button>
        </div>
      </div>

      {/* Filter Bar — always visible */}
      <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label)} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: `1px solid ${t.border}`, cursor: 'pointer', backgroundColor: preset === p.label ? t.accent : t.bgPanel, color: preset === p.label ? '#fff' : t.text }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '28px', backgroundColor: t.border }} />
        {/* Date range */}
        <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
        <span style={{ color: t.textMuted, fontSize: '12px' }}>→</span>
        <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPreset(''); }} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }} />
        <div style={{ width: '1px', height: '28px', backgroundColor: t.border }} />
        {/* Dropdowns */}
        <select value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
          <option value="">Departamento</option>
          {stats?.filters?.departments?.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.riskLevel} onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value }))} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
          <option value="">Nivel de Riesgo</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="critico">Crítico</option>
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}>
          <option value="">Estado</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviado</option>
          <option value="pending_approval">Pend. Aprobación</option>
          <option value="approved">Aprobado</option>
          <option value="pending_closure">Pend. Cierre</option>
          <option value="closed">Cerrado</option>
          <option value="closed_rejected">No Adoptable</option>
        </select>
        <button onClick={() => { setFilters({ startDate: '', endDate: '', clientId: '', department: '', riskLevel: '', status: '' }); applyPreset('Mes actual'); }} style={{ padding: '5px 10px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>↺ Reset</button>
      </div>

      {/* Content */}
      <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <TabBar tabs={TABS} active={activeTab} onSelect={handleTabChange} t={t} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
            Cargando dashboard...
          </div>
        ) : (
          <>
            {activeTab === 'resumen'      && <TabResumen          data={stats} ecrs={filteredEcrs} t={t} isAdmin={isAdmin} onDelete={handleDeleteECR} />}
            {activeTab === 'volumen'      && <TabVolumen          data={stats} t={t} />}
            {activeTab === 'financiero'   && <TabFinanciero       data={stats} t={t} qualityTargets={qualityTargets} />}
            {activeTab === 'calidad'      && <TabCalidadRiesgo    data={stats} t={t} qualityTargets={qualityTargets} />}
            {activeTab === 'proceso'      && <TabProcesoAuditoria data={stats} t={t} />}
            {activeTab === 'cliente'      && <TabClienteNegocio   data={stats} t={t} />}
            {activeTab === 'personalizado'&& <TabPersonalizado    data={stats} ecrs={filteredEcrs} t={t} isAdmin={isAdmin} onDelete={handleDeleteECR} sensors={sensors} />}
            {activeTab === 'alertas'      && <TabAlertas          data={stats} ecrs={filteredEcrs} t={t} navigate={navigate} />}
          </>
        )}
      </div>
    </div>
  );
};

export default ECRDashboardAdvanced;
