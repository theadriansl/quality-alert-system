import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  blue:    '#0072CE',
  green:   '#16a34a',
  red:     '#ef4444',
  orange:  '#f59e0b',
  purple:  '#8b5cf6',
  cyan:    '#06b6d4',
  gray:    '#6b7280',
  teal:    '#14b8a6',
  pink:    '#ec4899',
  indigo:  '#6366f1',
};

const SEV_COLORS = {
  'Crítico': C.red,
  'ALTA':    C.orange,
  'Mayor':   C.blue,
  'Menor':   C.green,
};

const STATUS_COLORS = {
  'EMITIDO':    C.blue,
  'RESPONDIDO': C.orange,
  'CERRADO':    C.green,
  'RECHAZADO':  C.gray,
};

// ─── Helper sub-components ────────────────────────────────────────────────────

const KpiTile = ({ label, value, sub, color, icon, small }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderTop: `3px solid ${color || C.blue}`,
      borderRadius: '8px',
      padding: small ? '10px 14px' : '14px 18px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: '10px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: small ? '22px' : '28px', fontWeight: '800', color: t.text, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '3px' }}>{sub}</div>}
    </div>
  );
};

const TabBar = ({ tabs, active, onSelect }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ display: 'flex', gap: '2px', borderBottom: `2px solid ${t.border}`, marginBottom: '20px' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            padding: '9px 16px',
            fontSize: '12px',
            fontWeight: active === tab.id ? '700' : '500',
            color: active === tab.id ? C.blue : t.textMuted,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: active === tab.id ? `2px solid ${C.blue}` : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >{tab.icon} {tab.label}</button>
      ))}
    </div>
  );
};

const SectionTitle = ({ title, sub }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>{title}</div>
      {sub && <div style={{ fontSize: '11px', color: t.textMuted }}>{sub}</div>}
    </div>
  );
};

const Card = ({ children, style }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '16px',
      ...style
    }}>
      {children}
    </div>
  );
};

const SevBadge = ({ sev }) => {
  const color = SEV_COLORS[sev] || C.gray;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: '700',
      backgroundColor: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>{sev}</span>
  );
};

const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status] || C.gray;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: '700',
      backgroundColor: color + '22',
      color,
    }}>{status}</span>
  );
};

const SlaBar = ({ value, sla, label }) => {
  const { theme: t } = useTheme();
  const pct = sla ? Math.min(100, (value / sla) * 100) : 0;
  const color = pct > 100 ? C.red : pct > 80 ? C.orange : C.green;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: t.textMuted, marginBottom: '3px' }}>
        <span>{label}</span>
        <span style={{ fontWeight: '600', color }}>{value ? `${value}h` : '—'} / SLA {sla}h</span>
      </div>
      <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, backgroundColor: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
};

const formatHours = (h) => {
  if (h === null || h === undefined) return '—';
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
};

const formatMonth = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const names = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[parseInt(mo)]} ${y.slice(2)}`;
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  const { theme: t } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
      <div style={{ fontWeight: '600', color: t.text, marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

// ─── TAB 1: Volumen & Flujo ───────────────────────────────────────────────────
const TabVolumen = ({ data }) => {
  const { theme: t } = useTheme();
  const volData = (data.volByMonth || []).map(r => ({ ...r, month: formatMonth(r.month) }));
  const pieStatus = (data.byStatus || []).map(r => ({ name: r.status, value: r.count, fill: STATUS_COLORS[r.status] || C.gray }));
  const pieSev = (data.bySeverity || []).map(r => ({ name: r.severity, value: r.count, fill: SEV_COLORS[r.severity] || C.gray }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Volume trend */}
      <Card>
        <SectionTitle title="Tendencia de QARs — últimos 6 meses" sub="Emitidos, cerrados y alta severidad por mes" />
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={volData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.7} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} opacity={0.8} />
            <Line type="monotone" dataKey="altaSev" name="Alta Sev" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* Status pie */}
        <Card>
          <SectionTitle title="Por Estado" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {pieStatus.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            {pieStatus.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: t.textMuted }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: e.fill }} />
                {e.name} ({e.value})
              </div>
            ))}
          </div>
        </Card>

        {/* Severity pie */}
        <Card>
          <SectionTitle title="Por Severidad" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieSev} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {pieSev.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            {pieSev.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: t.textMuted }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: e.fill }} />
                {e.name} ({e.value})
              </div>
            ))}
          </div>
        </Card>

        {/* Trigger type */}
        <Card>
          <SectionTitle title="Por Tipo de Disparo" />
          {(data.byTrigger || []).map((r, i) => {
            const total = (data.byTrigger || []).reduce((s, x) => s + x.count, 0);
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            const color = r.trigger === 'threshold' ? C.red : C.blue;
            return (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.text, marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>
                    {r.trigger === 'threshold' ? '⚡ Umbral automático' : '✋ Manual'}
                  </span>
                  <span style={{ color }}>{r.count} ({pct}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px' }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: '16px', padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: t.textMuted }}>Total acumulado periodo</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: t.text }}>
              {(data.byTrigger || []).reduce((s, r) => s + r.count, 0)}
            </div>
            <div style={{ fontSize: '10px', color: t.textMuted }}>QARs emitidas</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Modal edición SLA ────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SlaConfigModal = ({ slaConfig, onClose, onSaved }) => {
  const { theme: t } = useTheme();
  const [rows, setRows] = useState(() =>
    slaConfig.map(sc => ({ ...sc, response_hours: String(sc.response_hours), closure_hours: String(sc.closure_hours) }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  const handleSave = async () => {
    for (const r of rows) {
      const resp = parseInt(r.response_hours);
      const clos = parseInt(r.closure_hours);
      if (!resp || resp <= 0 || !clos || clos <= 0) {
        setError('Todos los valores deben ser números positivos.');
        return;
      }
      if (resp >= clos) {
        setError(`${r.severity_name}: el tiempo de respuesta debe ser menor al de cierre.`);
        return;
      }
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/qar/sla-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: rows.map(r => ({
            severity_id: r.severity_id,
            response_hours: parseInt(r.response_hours),
            closure_hours: parseInt(r.closure_hours),
          }))
        })
      });
      const result = await res.json();
      if (result.success) {
        onSaved();
      } else {
        setError(result.message || 'Error al guardar');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>⚙️ Configuración SLA</div>
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Tiempos máximos por severidad (horas)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: t.textMuted, lineHeight: 1 }}>✕</button>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: t.bgPanel }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: t.textMuted, fontSize: '11px', borderBottom: `1px solid ${t.border}` }}>Severidad</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: t.textMuted, fontSize: '11px', borderBottom: `1px solid ${t.border}` }}>Respuesta (h)</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: t.textMuted, fontSize: '11px', borderBottom: `1px solid ${t.border}` }}>Cierre (h)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.severity_id} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontWeight: '700', color: SEV_COLORS[r.severity_name] || C.blue }}>{r.severity_name}</span>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <input
                    type="number" min="1" value={r.response_hours}
                    onChange={e => update(i, 'response_hours', e.target.value)}
                    style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px', textAlign: 'center' }}
                  />
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <input
                    type="number" min="1" value={r.closure_hours}
                    onChange={e => update(i, 'closure_hours', e.target.value)}
                    style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px', textAlign: 'center' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Error */}
        {error && (
          <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '12px', color: '#B00020' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: C.blue, color: 'white', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── TAB 2: Tiempo & Respuesta ────────────────────────────────────────────────
const TabTiempo = ({ data, onEditSLA }) => {
  const { theme: t } = useTheme();
  const distRows = data.responseDistribution || [];
  const slaRows = data.slaBySeverity || [];
  const tb = data.topBar || {};

  // SLA compliance bars data
  const slaBarData = slaRows.map(r => ({
    name: r.severity,
    respOk: r.respOk, respLate: r.respLate,
    closeOk: r.closeOk, closeLate: r.closeLate,
    fill: SEV_COLORS[r.severity] || C.gray,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Avg times by severity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card>
          <SectionTitle title="Tiempo Promedio de Respuesta vs SLA" sub="Por nivel de severidad" />
          {distRows.map((r, i) => (
            <SlaBar key={i} label={r.severity} value={r.avgResponseH} sla={r.slaResponse} />
          ))}
          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: t.textMuted }}>Promedio General</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: tb.slaResponsePct >= 80 ? C.green : C.red }}>
              {formatHours(tb.avgResponseHours)}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Tiempo Promedio de Cierre vs SLA" sub="Por nivel de severidad" />
          {distRows.map((r, i) => (
            <SlaBar key={i} label={r.severity} value={r.avgClosureH} sla={r.slaClosure} />
          ))}
          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: t.textMuted }}>Promedio General</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: tb.slaClosurePct >= 80 ? C.green : C.red }}>
              {formatHours(tb.avgClosureHours)}
            </div>
          </div>
        </Card>
      </div>

      {/* SLA Compliance visual bars */}
      <Card>
        <SectionTitle title="Cumplimiento SLA por Severidad" sub="Respuestas y cierres dentro y fuera de SLA" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Respuesta */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              ⚡ Respuesta
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {slaBarData.map((r, i) => {
                const total = (r.respOk || 0) + (r.respLate || 0);
                const pct = total > 0 ? Math.round((r.respOk / total) * 100) : 0;
                const color = pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: SEV_COLORS[r.name] || C.blue }}>{r.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: t.textMuted }}>
                          <span style={{ color: C.green, fontWeight: '600' }}>✓ {r.respOk || 0}</span>
                          {' / '}
                          <span style={{ color: C.red, fontWeight: '600' }}>✗ {r.respLate || 0}</span>
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color, minWidth: '38px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: '10px', backgroundColor: t.bgPanel, borderRadius: '5px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '5px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Cierre */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              🔒 Cierre
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {slaBarData.map((r, i) => {
                const total = (r.closeOk || 0) + (r.closeLate || 0);
                const pct = total > 0 ? Math.round((r.closeOk / total) * 100) : 0;
                const color = pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: SEV_COLORS[r.name] || C.blue }}>{r.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: t.textMuted }}>
                          <span style={{ color: C.green, fontWeight: '600' }}>✓ {r.closeOk || 0}</span>
                          {' / '}
                          <span style={{ color: C.red, fontWeight: '600' }}>✗ {r.closeLate || 0}</span>
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color, minWidth: '38px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: '10px', backgroundColor: t.bgPanel, borderRadius: '5px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '5px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* SLA config reference */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <SectionTitle title="Configuración SLA Vigente" sub="Tiempos máximos por severidad" />
          <button onClick={onEditSLA} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: 'white', backgroundColor: C.blue, border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✏️ Editar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {(data.slaConfig || []).map((sc, i) => (
            <div key={i} style={{
              padding: '12px',
              backgroundColor: t.bgPanel,
              borderRadius: '6px',
              borderLeft: `3px solid ${SEV_COLORS[sc.severity_name] || C.blue}`,
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: SEV_COLORS[sc.severity_name] || C.blue }}>{sc.severity_name}</div>
              <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '6px' }}>Respuesta</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>{sc.response_hours}h</div>
              <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px' }}>Cierre</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>{sc.closure_hours}h</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── TAB 3: Calidad de Respuesta ──────────────────────────────────────────────
const TabCalidad = ({ data }) => {
  const { theme: t } = useTheme();
  const q = data.quality || {};
  const total = q.total || 1;

  const pctRootCause = Math.round((q.withRootCause / total) * 100);
  const pctCA = Math.round((q.withCA / total) * 100);
  const pctValidated = Math.round(((q.validatedApproved + q.validatedRejected) / total) * 100);

  const QualityBar = ({ label, value, total: tot, color }) => {
    const pct = tot > 0 ? Math.round((value / tot) * 100) : 0;
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.text, marginBottom: '4px' }}>
          <span>{label}</span>
          <span style={{ fontWeight: '700', color }}>{value} <span style={{ color: t.textMuted, fontWeight: '400' }}>({pct}%)</span></span>
        </div>
        <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.6s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card>
          <SectionTitle title="Completitud de Documentación" sub="Qué tan bien documentadas están las respuestas" />
          <QualityBar label="Con Causa Raíz documentada" value={q.withRootCause} total={total} color={C.green} />
          <QualityBar label="Con Acción Correctiva documentada" value={q.withCA} total={total} color={C.blue} />
          <QualityBar label="Con algún tipo de respuesta" value={q.withRootCause} total={total} color={C.teal} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '16px' }}>
            {[
              { label: '% C. Raíz', value: `${pctRootCause}%`, color: pctRootCause >= 80 ? C.green : C.red },
              { label: '% Acc. Corr.', value: `${pctCA}%`, color: pctCA >= 80 ? C.green : C.red },
              { label: '% Documentado', value: `${pctValidated}%`, color: pctValidated >= 70 ? C.green : C.orange },
            ].map((k, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: t.textMuted }}>{k.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Validación de Cierres" sub="Estado de validación de QARs cerradas" />
          {[
            { label: '✅ Aprobadas', value: q.validatedApproved, color: C.green },
            { label: '❌ Rechazadas', value: q.validatedRejected, color: C.red },
            { label: '⚠️ Sin validación', value: q.closedNoVal, color: C.orange },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              marginBottom: '8px',
              backgroundColor: t.bgPanel,
              borderRadius: '6px',
              borderLeft: `3px solid ${r.color}`,
            }}>
              <span style={{ fontSize: '12px', color: t.text }}>{r.label}</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: r.color }}>{r.value ?? 0}</span>
            </div>
          ))}
          {q.closedNoVal > 0 && (
            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: C.orange + '18', borderRadius: '6px', border: `1px solid ${C.orange}44` }}>
              <div style={{ fontSize: '11px', color: C.orange, fontWeight: '600' }}>
                ⚠️ {q.closedNoVal} cierre{q.closedNoVal > 1 ? 's' : ''} sin proceso de validación formal
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Validation pie */}
      <Card>
        <SectionTitle title="Distribución de Calidad de Respuesta" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <ResponsiveContainer width={200} height={160}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Aprobadas', value: q.validatedApproved || 0, fill: C.green },
                  { name: 'Rechazadas', value: q.validatedRejected || 0, fill: C.red },
                  { name: 'Sin Validar', value: q.closedNoVal || 0, fill: C.orange },
                  { name: 'Activas', value: q.total - (q.validatedApproved || 0) - (q.validatedRejected || 0) - (q.closedNoVal || 0), fill: C.blue },
                ].filter(d => d.value > 0)}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={65}
              >
                {[C.green, C.red, C.orange, C.blue].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Total QARs', value: q.total, color: C.blue },
                { label: 'Con Causa Raíz', value: `${pctRootCause}%`, color: pctRootCause >= 80 ? C.green : C.red },
                { label: 'Aprobadas', value: q.validatedApproved, color: C.green },
                { label: 'Sin Validación', value: q.closedNoVal, color: q.closedNoVal > 0 ? C.orange : C.green },
              ].map((k, i) => (
                <div key={i} style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>{k.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: k.color }}>{k.value ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── TAB 4: Operación Interna ─────────────────────────────────────────────────
const TabOperacion = ({ data }) => {
  const { theme: t } = useTheme();
  const deptData = (data.byDept || []).map(r => ({
    name: r.department.length > 14 ? r.department.slice(0, 12) + '…' : r.department,
    fullName: r.department,
    total: r.total,
    cerrados: r.cerrados,
    emitidos: r.emitidos,
    respondidos: r.respondidos,
    altaSev: r.altaSev,
    avgResp: r.avgResponseH,
  }));

  const respData = (data.byResponsable || []).map(r => ({
    name: r.name.split(' ')[0],
    fullName: r.name,
    total: r.total,
    cerrados: r.cerrados,
    activos: r.activos,
    vencidas: r.vencidas,
    avgResp: r.avgResponseH,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* By Department */}
      <Card>
        <SectionTitle title="QARs por Departamento" sub="Distribución y estado por área" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
            <Bar dataKey="altaSev" name="Alta Sev" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Dept detail table */}
      <Card>
        <SectionTitle title="Detalle por Departamento" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Departamento', 'Total', 'Activos', 'Cerrados', 'Alta Sev', 'Resp. Prom.'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Departamento' ? 'left' : 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.byDept || []).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '8px 10px', color: t.text, fontWeight: '500' }}>{r.department}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: t.text }}>{r.total}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: C.orange }}>{r.emitidos + r.respondidos}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: C.green }}>{r.cerrados}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: r.altaSev > 0 ? C.red : t.textMuted }}>{r.altaSev}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: t.textMuted }}>{formatHours(r.avgResponseH)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* By Responsable */}
      <Card>
        <SectionTitle title="Carga por Responsable" sub="Top 10 usuarios asignados" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={respData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
            <Bar dataKey="vencidas" name="Vencidas" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>

        {/* Responsable table */}
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Responsable', 'Total', 'Activos', 'Cerrados', 'Vencidas', 'T. Resp. Prom.'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Responsable' ? 'left' : 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.byResponsable || []).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '6px 10px', color: t.text, fontWeight: '500' }}>{r.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: t.text }}>{r.total}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: C.orange }}>{r.activos}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: C.green }}>{r.cerrados}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: r.vencidas > 0 ? C.red : t.textMuted, fontWeight: r.vencidas > 0 ? '700' : '400' }}>{r.vencidas}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: t.textMuted }}>{formatHours(r.avgResponseH)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── TAB 5: Cliente / Proyecto ─────────────────────────────────────────────────
const TabCliente = ({ data }) => {
  const { theme: t } = useTheme();
  const clientData = (data.byClient || []).map(r => ({
    name: r.client.length > 20 ? r.client.slice(0, 18) + '…' : r.client,
    fullName: r.client,
    total: r.total,
    cerrados: r.cerrados,
    altaSev: r.altaSev,
    avgClosure: r.avgClosureH,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card>
        <SectionTitle title="QARs por Cliente" sub="Incidencias y cierres por cliente" />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={clientData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
            <Bar dataKey="altaSev" name="Alta Sev" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Client detail */}
      <Card>
        <SectionTitle title="Detalle por Cliente" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {['Cliente', 'Total', 'Cerrados', '% Cierre', 'Alta Sev', 'T. Cierre Prom.'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Cliente' ? 'left' : 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.byClient || []).map((r, i) => {
                const pctCierre = r.total > 0 ? Math.round((r.cerrados / r.total) * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: '8px 10px', color: t.text, fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.client}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: t.text }}>{r.total}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: C.green }}>{r.cerrados}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ color: pctCierre >= 70 ? C.green : pctCierre >= 40 ? C.orange : C.red, fontWeight: '600' }}>{pctCierre}%</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: r.altaSev > 0 ? C.red : t.textMuted }}>{r.altaSev}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: t.textMuted }}>{formatHours(r.avgClosureH)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Client pie */}
      <Card>
        <SectionTitle title="Distribución de Incidencias por Cliente" />
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={(data.byClient || []).map((r, i) => ({
                name: r.client.length > 20 ? r.client.slice(0, 18) + '…' : r.client,
                value: r.total,
                fill: [C.blue, C.orange, C.green, C.red, C.purple, C.cyan, C.teal][i % 7],
              }))}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {(data.byClient || []).map((_, i) => (
                <Cell key={i} fill={[C.blue, C.orange, C.green, C.red, C.purple, C.cyan, C.teal][i % 7]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ─── TAB 6: Riesgo & Alertas ──────────────────────────────────────────────────
const TabRiesgo = ({ data }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const riskItems = data.riskItems || [];

  // Risk score
  const overdueCount = riskItems.filter(r => r.overdueResponse).length;
  const highSevActive = riskItems.filter(r => ['Crítico', 'ALTA'].includes(r.severity) && ['EMITIDO', 'RESPONDIDO'].includes(r.status)).length;
  const noValClosed = riskItems.filter(r => r.closedNoVal).length;
  const riskScore = Math.min(100, overdueCount * 8 + highSevActive * 6 + noValClosed * 4);
  const riskLabel = riskScore >= 70 ? 'ALTO' : riskScore >= 40 ? 'MEDIO' : 'BAJO';
  const riskColor = riskScore >= 70 ? C.red : riskScore >= 40 ? C.orange : C.green;

  const AlertCard = ({ title, items, emptyMsg, color, renderItem }) => (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text }}>{title}</div>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: color + '22', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color }}>{items.length}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', padding: '10px' }}>✓ {emptyMsg}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
          {items.map(renderItem)}
        </div>
      )}
    </Card>
  );

  const RiskRow = ({ item, extra }) => (
    <div
      onClick={() => navigate(`/qar-detail/${item.id}`)}
      style={{
        padding: '8px 10px',
        backgroundColor: t.bgPanel,
        borderRadius: '6px',
        borderLeft: `3px solid ${SEV_COLORS[item.severity] || C.gray}`,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: t.text }}>{item.alertNumber}</div>
          <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '2px' }}>{item.title?.slice(0, 50)}{item.title?.length > 50 ? '…' : ''}</div>
        </div>
        <SevBadge sev={item.severity} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10px', color: t.textMuted }}>
        <span>👤 {item.responsable}</span>
        <span>🏢 {item.department}</span>
        {extra}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Risk score */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '56px', fontWeight: '900', color: riskColor, lineHeight: 1 }}>{riskScore}</div>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: '12px',
                backgroundColor: riskColor + '22', border: `1px solid ${riskColor}`,
                fontSize: '12px', fontWeight: '700', color: riskColor
              }}>{riskLabel}</span>
            </div>
            <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px' }}>Índice de Riesgo QAR</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Vencidas sin respuesta', value: overdueCount, color: C.red, icon: '🔴' },
                { label: 'Alta sev activas', value: highSevActive, color: C.orange, icon: '🟠' },
                { label: 'Sin validación', value: noValClosed, color: C.orange, icon: '⚠️' },
                { label: 'Total en riesgo', value: riskItems.length, color: C.blue, icon: '📋' },
              ].map((k, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', borderTop: `2px solid ${k.color}` }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{k.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: '10px', color: t.textMuted }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <AlertCard
          title="🔴 Vencidas sin Respuesta"
          color={C.red}
          emptyMsg="Sin alertas vencidas"
          items={riskItems.filter(r => r.overdueResponse)}
          renderItem={(item, i) => (
            <RiskRow key={i} item={item}
              extra={<span style={{ color: C.red }}>⏰ {formatHours(item.ageHours)} / SLA {item.slaResponse}h</span>}
            />
          )}
        />
        <AlertCard
          title="🟠 Alta Severidad Activas"
          color={C.orange}
          emptyMsg="Sin alertas críticas activas"
          items={riskItems.filter(r => ['Crítico', 'ALTA'].includes(r.severity) && ['EMITIDO', 'RESPONDIDO'].includes(r.status))}
          renderItem={(item, i) => (
            <RiskRow key={i} item={item}
              extra={<StatusBadge status={item.status} />}
            />
          )}
        />
      </div>

      {noValClosed > 0 && (
        <AlertCard
          title="⚠️ Cerradas Sin Validación Formal"
          color={C.orange}
          emptyMsg="Sin cierres pendientes de validación"
          items={riskItems.filter(r => r.closedNoVal)}
          renderItem={(item, i) => (
            <RiskRow key={i} item={item}
              extra={<span style={{ color: C.orange }}>Cerrado sin validación</span>}
            />
          )}
        />
      )}
    </div>
  );
};

// ─── ALWAYS-VISIBLE REPORTS TABLE ─────────────────────────────────────────────
const QARTable = ({ data }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const rows = useMemo(() => data.recentQARs || [], [data.recentQARs]);

  const departments = useMemo(() => [...new Set(rows.map(r => r.department))].sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (search && !r.alertNumber?.toLowerCase().includes(search.toLowerCase()) && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (sevFilter && r.severity !== sevFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (deptFilter && r.department !== deptFilter) return false;
    return true;
  }), [rows, search, sevFilter, statusFilter, deptFilter]);

  const inp = { padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.text, outline: 'none' };

  const isOverdue = (row) => {
    if (['CERRADO', 'RECHAZADO'].includes(row.status)) return false;
    if (!row.responseDate && row.slaResponse && row.ageHours > row.slaResponse) return true;
    return false;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: t.text }}>📋 Listado de QARs ({filtered.length})</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="Buscar número / título…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, minWidth: '200px' }} />
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={inp}>
          <option value="">Todas las severidades</option>
          {['Crítico', 'ALTA', 'Mayor', 'Menor'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inp}>
          <option value="">Todos los estados</option>
          {['EMITIDO', 'RESPONDIDO', 'CERRADO', 'RECHAZADO'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={inp}>
          <option value="">Todos los departamentos</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || sevFilter || statusFilter || deptFilter) && (
          <button onClick={() => { setSearch(''); setSevFilter(''); setStatusFilter(''); setDeptFilter(''); }} style={{ ...inp, cursor: 'pointer', color: C.red }}>✕ Limpiar</button>
        )}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${t.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: t.bgPanel, borderBottom: `2px solid ${t.border}` }}>
              {['# QAR', 'Título', 'Severidad', 'Estado', 'Departamento', 'Responsable', 'Cliente', 'Emisión', 'Respuesta', 'Cierre', 'SLA', 'Acción'].map(h => (
                <th key={h} style={{ padding: '9px 10px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const overdue = isOverdue(r);
              const rowBg = overdue ? C.red + '10' : i % 2 === 0 ? 'transparent' : t.bgPanel + '50';
              const actionMap = {
                'EMITIDO':    { label: 'Responder', color: C.orange },
                'RESPONDIDO': { label: 'Validar',   color: C.blue },
                'RECHAZADO':  { label: 'Corregir',  color: C.red },
                'CERRADO':    { label: 'Ver',        color: C.green },
              };
              const action = actionMap[r.status] || actionMap['CERRADO'];
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/qar-detail/${r.id}`)}
                  style={{ backgroundColor: rowBg, borderBottom: `1px solid ${t.border}`, cursor: 'pointer', transition: 'background-color 0.12s' }}
                  onMouseEnter={e => { if (!overdue) e.currentTarget.style.backgroundColor = t.bgPanel; }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = rowBg}
                >
                  <td style={{ padding: '8px 10px', fontWeight: '600', color: C.blue, whiteSpace: 'nowrap' }}>{r.alertNumber}</td>
                  <td style={{ padding: '8px 10px', color: t.text, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}><SevBadge sev={r.severity} /></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '8px 10px', color: t.textMuted, whiteSpace: 'nowrap' }}>{r.department}</td>
                  <td style={{ padding: '8px 10px', color: t.text, whiteSpace: 'nowrap' }}>{r.responsable}</td>
                  <td style={{ padding: '8px 10px', color: t.textMuted, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.client}</td>
                  <td style={{ padding: '8px 10px', color: t.textMuted, whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                  <td style={{ padding: '8px 10px', color: r.responseDate ? C.green : C.orange, whiteSpace: 'nowrap' }}>{formatDate(r.responseDate)}</td>
                  <td style={{ padding: '8px 10px', color: r.closedAt ? C.green : t.textMuted, whiteSpace: 'nowrap' }}>{formatDate(r.closedAt)}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {overdue ? (
                      <span style={{ color: C.red, fontWeight: '700', fontSize: '10px' }}>⏰ VENCIDA</span>
                    ) : r.status === 'CERRADO' ? (
                      <span style={{ color: C.green, fontSize: '10px' }}>✓ OK</span>
                    ) : r.slaResponse ? (
                      <span style={{ color: t.textMuted, fontSize: '10px' }}>
                        {formatHours(r.ageHours)} / {r.slaResponse}h
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/qar-detail/${r.id}`)}
                      style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                        color: 'white', backgroundColor: action.color,
                        border: 'none', borderRadius: '5px', cursor: 'pointer'
                      }}
                    >
                      {action.label}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: '20px', textAlign: 'center', color: t.textMuted }}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── TAB 7: Mi Dashboard (personalizado) ─────────────────────────────────────

const STORAGE_KEY = 'qar-custom-dashboard-v1';

// Catálogo de widgets disponibles
const WIDGET_CATALOG = [
  // ── KPIs numéricos ─────────────────────────────────────────────────────────
  { id: 'kpi-total',     cat: 'KPIs',   label: 'Total QARs',            size: 'sm', icon: '📋' },
  { id: 'kpi-activos',   cat: 'KPIs',   label: 'QARs Activas',          size: 'sm', icon: '🔄' },
  { id: 'kpi-cerrados',  cat: 'KPIs',   label: 'QARs Cerradas',         size: 'sm', icon: '✅' },
  { id: 'kpi-rechazados',cat: 'KPIs',   label: 'Rechazadas',            size: 'sm', icon: '🚫' },
  { id: 'kpi-alta-sev',  cat: 'KPIs',   label: 'Alta Severidad',        size: 'sm', icon: '🔴' },
  { id: 'kpi-vencidas',  cat: 'KPIs',   label: 'Vencidas sin respuesta',size: 'sm', icon: '⏰' },
  { id: 'kpi-sla-resp',  cat: 'KPIs',   label: 'SLA Respuesta %',       size: 'sm', icon: '⚡' },
  { id: 'kpi-sla-cierre',cat: 'KPIs',   label: 'SLA Cierre %',          size: 'sm', icon: '🔒' },
  { id: 'kpi-avg-resp',  cat: 'KPIs',   label: 'T. Promedio Respuesta', size: 'sm', icon: '📨' },
  { id: 'kpi-avg-cierre',cat: 'KPIs',   label: 'T. Promedio Cierre',    size: 'sm', icon: '📦' },
  { id: 'kpi-no-val',    cat: 'KPIs',   label: 'Sin validación',        size: 'sm', icon: '⚠️' },
  { id: 'kpi-root-cause',cat: 'KPIs',   label: '% Con Causa Raíz',      size: 'sm', icon: '🔍' },
  // ── Gráficas ───────────────────────────────────────────────────────────────
  { id: 'chart-vol-mes', cat: 'Gráficas', label: 'Tendencia mensual',     size: 'lg', icon: '📈' },
  { id: 'chart-estado',  cat: 'Gráficas', label: 'Pie por Estado',        size: 'md', icon: '🥧' },
  { id: 'chart-sev',     cat: 'Gráficas', label: 'Pie por Severidad',     size: 'md', icon: '🥧' },
  { id: 'chart-trigger', cat: 'Gráficas', label: 'Tipo de Disparo',       size: 'md', icon: '📡' },
  { id: 'chart-dept',    cat: 'Gráficas', label: 'Barras por Depto.',     size: 'lg', icon: '🏭' },
  { id: 'chart-resp',    cat: 'Gráficas', label: 'Carga por Responsable', size: 'lg', icon: '👤' },
  { id: 'chart-cliente', cat: 'Gráficas', label: 'QARs por Cliente',      size: 'lg', icon: '🤝' },
  { id: 'chart-sla-sev', cat: 'Gráficas', label: 'SLA Compliance barras', size: 'lg', icon: '🎯' },
  // ── Operación & Riesgo ─────────────────────────────────────────────────────
  { id: 'risk-score',    cat: 'Riesgo',   label: 'Índice de Riesgo',      size: 'md', icon: '🚨' },
  { id: 'risk-vencidas', cat: 'Riesgo',   label: 'Lista Vencidas',        size: 'lg', icon: '🔴' },
  { id: 'risk-alta-sev', cat: 'Riesgo',   label: 'Alta Sev. Activas',     size: 'lg', icon: '🟠' },
  { id: 'quality-val',   cat: 'Calidad',  label: 'Estado de Validación',  size: 'md', icon: '✅' },
  { id: 'quality-docs',  cat: 'Calidad',  label: 'Completitud docs.',     size: 'md', icon: '📄' },
  { id: 'sla-config',    cat: 'Config',   label: 'Config. SLA vigente',   size: 'md', icon: '⚙️' },
];

const DEFAULT_WIDGETS = [
  'kpi-total', 'kpi-activos', 'kpi-vencidas', 'kpi-sla-resp',
  'chart-vol-mes', 'chart-estado', 'risk-score', 'quality-val',
];

// Renders a single widget given its id and the dashboard data
const WidgetRenderer = ({ id, data, onEditSLA }) => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const tb = data.topBar || {};
  const q  = data.quality || {};

  const slaRespColor  = tb.slaResponsePct  >= 80 ? C.green : tb.slaResponsePct  >= 60 ? C.orange : C.red;
  const slaCloseColor = tb.slaClosurePct   >= 80 ? C.green : tb.slaClosurePct   >= 60 ? C.orange : C.red;
  const pctRootCause  = q.total > 0 ? Math.round((q.withRootCause / q.total) * 100) : 0;

  // ── KPIs numéricos ─────────────────────────────────────────────────────────
  if (id === 'kpi-total')      return <KpiTile label="Total QARs"             value={tb.total}               sub="en el período"            color={C.blue}   icon="📋" />;
  if (id === 'kpi-activos')    return <KpiTile label="QARs Activas"            value={tb.activos}             sub="Emitidas + Respondidas"   color={C.orange} icon="🔄" />;
  if (id === 'kpi-cerrados')   return <KpiTile label="QARs Cerradas"           value={tb.cerrados}            sub="en el período"            color={C.green}  icon="✅" />;
  if (id === 'kpi-rechazados') return <KpiTile label="Rechazadas"              value={tb.rechazados}          sub="no aplica corrección"     color={C.gray}   icon="🚫" />;
  if (id === 'kpi-alta-sev')   return <KpiTile label="Alta Severidad"          value={tb.altaSeveridad}       sub="Crítico + ALTA"           color={C.red}    icon="🔴" />;
  if (id === 'kpi-vencidas')   return <KpiTile label="Vencidas sin respuesta"  value={tb.vencidasSinRespuesta} sub="fuera de SLA"            color={tb.vencidasSinRespuesta > 0 ? C.red : C.green} icon="⏰" />;
  if (id === 'kpi-sla-resp')   return <KpiTile label="SLA Respuesta"           value={tb.slaResponsePct != null ? `${tb.slaResponsePct}%` : '—'} sub="dentro de tiempo" color={slaRespColor} icon="⚡" />;
  if (id === 'kpi-sla-cierre') return <KpiTile label="SLA Cierre"              value={tb.slaClosurePct != null ? `${tb.slaClosurePct}%` : '—'}   sub="dentro de tiempo" color={slaCloseColor} icon="🔒" />;
  if (id === 'kpi-avg-resp')   return <KpiTile label="T. Prom. Respuesta"      value={formatHours(tb.avgResponseHours)} sub="desde emisión a respuesta" color={C.purple} icon="📨" />;
  if (id === 'kpi-avg-cierre') return <KpiTile label="T. Prom. Cierre"         value={formatHours(tb.avgClosureHours)}  sub="desde emisión a cierre"    color={C.teal}   icon="📦" />;
  if (id === 'kpi-no-val')     return <KpiTile label="Sin Validación"          value={tb.closedNoValidation}  sub="cierres sin validar"      color={tb.closedNoValidation > 0 ? C.orange : C.green} icon="⚠️" />;
  if (id === 'kpi-root-cause') return <KpiTile label="% Con Causa Raíz"        value={`${pctRootCause}%`}     sub="documentación completa"   color={pctRootCause >= 80 ? C.green : C.red} icon="🔍" />;

  // ── Gráficas ───────────────────────────────────────────────────────────────
  if (id === 'chart-vol-mes') {
    const volData = (data.volByMonth || []).map(r => ({ ...r, month: formatMonth(r.month) }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>📈 Tendencia mensual</div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={volData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.7} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
            <Line type="monotone" dataKey="altaSev" name="Alta Sev" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-estado') {
    const pieStatus = (data.byStatus || []).map(r => ({ name: r.status, value: r.count, fill: STATUS_COLORS[r.status] || C.gray }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>🥧 Por Estado</div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pieStatus} dataKey="value" cx="50%" cy="50%" outerRadius={58} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9}>
              {pieStatus.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
          {pieStatus.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: t.textMuted }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: e.fill }} />{e.name}({e.value})
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === 'chart-sev') {
    const pieSev = (data.bySeverity || []).map(r => ({ name: r.severity, value: r.count, fill: SEV_COLORS[r.severity] || C.gray }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>🥧 Por Severidad</div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pieSev} dataKey="value" cx="50%" cy="50%" outerRadius={58} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9}>
              {pieSev.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
          {pieSev.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: t.textMuted }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: e.fill }} />{e.name}({e.value})
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === 'chart-trigger') {
    const total = (data.byTrigger || []).reduce((s, r) => s + r.count, 0);
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>📡 Tipo de Disparo</div>
        {(data.byTrigger || []).map((r, i) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          const color = r.trigger === 'threshold' ? C.red : C.blue;
          return (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: t.text, marginBottom: '3px' }}>
                <span>{r.trigger === 'threshold' ? '⚡ Umbral automático' : '✋ Manual'}</span>
                <span style={{ color, fontWeight: '600' }}>{r.count} ({pct}%)</span>
              </div>
              <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (id === 'chart-dept') {
    const deptData = (data.byDept || []).map(r => ({
      name: r.department.length > 12 ? r.department.slice(0, 10) + '…' : r.department,
      total: r.total, cerrados: r.cerrados, altaSev: r.altaSev,
    }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>🏭 QARs por Departamento</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deptData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
            <Bar dataKey="altaSev" name="Alta Sev" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-resp') {
    const respData = (data.byResponsable || []).slice(0, 7).map(r => ({
      name: r.name.split(' ')[0],
      total: r.total, cerrados: r.cerrados, vencidas: r.vencidas,
    }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>👤 Carga por Responsable</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={respData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="vencidas" name="Vencidas" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-cliente') {
    const clientData = (data.byClient || []).map(r => ({
      name: r.client.split(' ')[0],
      total: r.total, cerrados: r.cerrados, altaSev: r.altaSev,
    }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>🤝 QARs por Cliente</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={clientData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="total" name="Total" fill={C.blue} opacity={0.6} />
            <Bar dataKey="cerrados" name="Cerrados" fill={C.green} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (id === 'chart-sla-sev') {
    const slaData = (data.slaBySeverity || []).map(r => ({
      name: r.severity, respOk: r.respOk, respLate: r.respLate,
    }));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>🎯 SLA Compliance por Severidad</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={slaData}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="respOk" name="En SLA" stackId="a" fill={C.green} />
            <Bar dataKey="respLate" name="Fuera SLA" stackId="a" fill={C.red} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Riesgo ─────────────────────────────────────────────────────────────────
  if (id === 'risk-score') {
    const riskItems    = data.riskItems || [];
    const overdueCount = riskItems.filter(r => r.overdueResponse).length;
    const highSevAct   = riskItems.filter(r => ['Crítico','ALTA'].includes(r.severity) && ['EMITIDO','RESPONDIDO'].includes(r.status)).length;
    const noVal        = riskItems.filter(r => r.closedNoVal).length;
    const score        = Math.min(100, overdueCount * 8 + highSevAct * 6 + noVal * 4);
    const label        = score >= 70 ? 'ALTO' : score >= 40 ? 'MEDIO' : 'BAJO';
    const color        = score >= 70 ? C.red  : score >= 40 ? C.orange : C.green;
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>🚨 Índice de Riesgo QAR</div>
        <div style={{ fontSize: '52px', fontWeight: '900', color, lineHeight: 1 }}>{score}</div>
        <div style={{ marginTop: '6px', marginBottom: '10px' }}>
          <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: '12px', backgroundColor: color + '22', border: `1px solid ${color}`, fontSize: '12px', fontWeight: '700', color }}>{label}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {[
            { l: 'Vencidas', v: overdueCount, c: C.red },
            { l: 'Alta Sev', v: highSevAct,   c: C.orange },
            { l: 'Sin Val.',  v: noVal,        c: C.orange },
          ].map((k, i) => (
            <div key={i} style={{ padding: '6px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: k.c }}>{k.v}</div>
              <div style={{ fontSize: '9px', color: t.textMuted }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === 'risk-vencidas') {
    const vencidas = (data.riskItems || []).filter(r => r.overdueResponse);
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>
          🔴 Vencidas sin Respuesta <span style={{ color: C.red }}>({vencidas.length})</span>
        </div>
        {vencidas.length === 0 ? (
          <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', padding: '12px' }}>✓ Sin alertas vencidas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
            {vencidas.map((r, i) => (
              <div key={i}
                onClick={() => navigate(`/qar-detail/${r.id}`)}
                style={{ padding: '7px 10px', backgroundColor: t.bgPanel, borderRadius: '5px', borderLeft: `3px solid ${SEV_COLORS[r.severity] || C.gray}`, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ fontSize: '11px', fontWeight: '600', color: t.text }}>{r.alertNumber}</div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>{r.department} · {formatHours(r.ageHours)} / SLA {r.slaResponse}h</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (id === 'risk-alta-sev') {
    const alta = (data.riskItems || []).filter(r => ['Crítico','ALTA'].includes(r.severity) && ['EMITIDO','RESPONDIDO'].includes(r.status));
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>
          🟠 Alta Sev. Activas <span style={{ color: C.orange }}>({alta.length})</span>
        </div>
        {alta.length === 0 ? (
          <div style={{ fontSize: '11px', color: t.textMuted, textAlign: 'center', padding: '12px' }}>✓ Sin alertas críticas activas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
            {alta.map((r, i) => (
              <div key={i}
                onClick={() => navigate(`/qar-detail/${r.id}`)}
                style={{ padding: '7px 10px', backgroundColor: t.bgPanel, borderRadius: '5px', borderLeft: `3px solid ${SEV_COLORS[r.severity]}`, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ fontSize: '11px', fontWeight: '600', color: t.text }}>{r.alertNumber} — {r.severity}</div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>{r.responsable} · {r.department}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Calidad ────────────────────────────────────────────────────────────────
  if (id === 'quality-val') {
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>✅ Estado de Validación</div>
        {[
          { label: '✅ Aprobadas',    value: q.validatedApproved, color: C.green },
          { label: '❌ Rechazadas',   value: q.validatedRejected, color: C.red },
          { label: '⚠️ Sin validar',  value: q.closedNoVal,       color: C.orange },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', marginBottom: '6px', backgroundColor: t.bgPanel, borderRadius: '6px', borderLeft: `3px solid ${r.color}` }}>
            <span style={{ fontSize: '11px', color: t.text }}>{r.label}</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: r.color }}>{r.value ?? 0}</span>
          </div>
        ))}
      </div>
    );
  }

  if (id === 'quality-docs') {
    const total = q.total || 1;
    const bars = [
      { label: 'Con Causa Raíz',   value: q.withRootCause, color: C.green },
      { label: 'Con Acc. Correc.',  value: q.withCA,        color: C.blue },
    ];
    return (
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>📄 Completitud de Documentación</div>
        {bars.map((r, i) => {
          const pct = Math.round((r.value / total) * 100);
          return (
            <div key={i} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: t.text, marginBottom: '4px' }}>
                <span>{r.label}</span>
                <span style={{ color: r.color, fontWeight: '700' }}>{r.value} ({pct}%)</span>
              </div>
              <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: r.color, borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (id === 'sla-config') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: t.text }}>⚙️ Config. SLA Vigente</div>
          {onEditSLA && (
            <button onClick={onEditSLA} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', color: 'white', backgroundColor: C.blue, border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              ✏️ Editar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(data.slaConfig || []).map((sc, i) => (
            <div key={i} style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px', borderLeft: `3px solid ${SEV_COLORS[sc.severity_name] || C.blue}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: SEV_COLORS[sc.severity_name] || C.blue }}>{sc.severity_name}</div>
              <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px' }}>Resp: <strong>{sc.response_hours}h</strong></div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>Cierre: <strong>{sc.closure_hours}h</strong></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// Tamaño de columnas según el widget
const SIZE_COLS = { sm: 1, md: 2, lg: 2, xl: 4 };
const WIDGET_SIZES = [
  { key: 'sm', label: 'Pequeño',      cols: 1, desc: '1/4 pantalla' },
  { key: 'md', label: 'Mediano',      cols: 2, desc: '2/4 pantalla' },
  { key: 'lg', label: 'Medio grande', cols: 2, desc: '2/4 pantalla' },
  { key: 'xl', label: 'Grande',       cols: 4, desc: 'Pantalla completa' },
];

const migrateSelected = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'string') return raw.map(id => ({ id, size: WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' }));
  return raw;
};

// ─── Widget sortable wrapper (DnD) ───────────────────────────────────────────
const SortableWidget = ({ id, size, data, editMode, onRemove, onEditSLA }) => {
  const { theme: t } = useTheme();
  const meta = WIDGET_CATALOG.find(w => w.id === id);
  const resolvedSize = size || meta?.size || 'sm';
  const isKpi = resolvedSize === 'sm';

  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    gridColumn: `span ${SIZE_COLS[resolvedSize] || 1}`,
    backgroundColor: t.bgCard,
    border: `1px solid ${isDragging ? C.blue : t.border}`,
    borderRadius: '8px',
    padding: isKpi ? '0' : '14px',
    position: 'relative',
    minHeight: isKpi ? 'auto' : '120px',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    boxShadow: isDragging ? `0 8px 24px ${C.blue}33` : 'none',
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle — siempre visible, resaltado en edit mode */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        title="Arrastrar para mover"
        style={{
          position: 'absolute',
          top: isKpi ? '50%' : '8px',
          left: '6px',
          transform: isKpi ? 'translateY(-50%)' : 'none',
          zIndex: 5,
          cursor: 'grab',
          color: editMode ? C.blue : t.border,
          fontSize: '14px',
          lineHeight: 1,
          padding: '2px',
          borderRadius: '3px',
          transition: 'color 0.15s',
          userSelect: 'none',
          opacity: editMode ? 1 : 0.35,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = C.blue; e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.color = editMode ? C.blue : t.border; e.currentTarget.style.opacity = editMode ? '1' : '0.35'; }}
      >
        ⠿
      </div>

      {/* Remove button en edit mode */}
      {editMode && (
        <button
          onClick={() => onRemove(id)}
          title="Quitar widget"
          style={{
            position: 'absolute', top: '6px', right: '6px', zIndex: 5,
            width: '18px', height: '18px', borderRadius: '50%',
            backgroundColor: C.red, border: 'none',
            color: 'white', fontSize: '10px', fontWeight: '900',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
        >✕</button>
      )}

      {/* Contenido del widget con padding-left para el drag handle */}
      <div style={{ paddingLeft: isKpi ? '20px' : '0' }}>
        <WidgetRenderer id={id} data={data} onEditSLA={onEditSLA} />
      </div>
    </div>
  );
};

// ─── Ghost (overlay mientras se arrastra) ────────────────────────────────────
const DragGhost = ({ id, data }) => {
  const { theme: t } = useTheme();
  const meta = WIDGET_CATALOG.find(w => w.id === id);
  const isKpi = meta?.size === 'sm';
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `2px solid ${C.blue}`,
      borderRadius: '8px',
      padding: isKpi ? '12px 16px' : '14px',
      boxShadow: `0 16px 40px ${C.blue}44`,
      opacity: 0.95,
      minWidth: isKpi ? '180px' : '280px',
      transform: 'rotate(2deg)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: C.blue, marginBottom: '4px' }}>
        {meta?.icon} {meta?.label}
      </div>
      <div style={{ fontSize: '10px', color: t.textMuted }}>Arrastrando…</div>
    </div>
  );
};

// ─── Tab principal ─────────────────────────────────────────────────────────
const TabPersonalizado = ({ data, onEditSLA }) => {
  const { theme: t } = useTheme();

  const [selected, setSelected] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? migrateSelected(JSON.parse(raw)) : DEFAULT_WIDGETS.map(id => ({ id, size: WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' })); }
    catch { return DEFAULT_WIDGETS.map(id => ({ id, size: WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' })); }
  });
  const [editMode,      setEditMode]      = useState(false);
  const [activeId,      setActiveId]      = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [pendingWidget, setPendingWidget] = useState(null);

  const save     = (next) => { setSelected(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const reset    = () => save(DEFAULT_WIDGETS.map(id => ({ id, size: WIDGET_CATALOG.find(c => c.id === id)?.size || 'sm' })));
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

  const cats = [...new Set(WIDGET_CATALOG.map(w => w.cat))];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>⚙️ Mi Dashboard personalizado</div>
          <div style={{ fontSize: '11px', color: t.textMuted }}>
            {selected.length} widget{selected.length !== 1 ? 's' : ''} activo{selected.length !== 1 ? 's' : ''}
            {!editMode && selected.length > 0 && <span style={{ marginLeft: '6px', color: t.border }}>· arrastra ⠿ para reordenar</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editMode && <>
            <button onClick={() => setShowModal(true)} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${C.blue}`, backgroundColor: C.blue + '12', color: C.blue, cursor: 'pointer', fontWeight: '600' }}>＋ Widgets</button>
            <button onClick={reset}    style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>Restablecer</button>
            <button onClick={clearAll} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${C.red}44`, backgroundColor: C.red + '12', color: C.red, cursor: 'pointer' }}>Limpiar</button>
          </>}
          <button onClick={() => setEditMode(e => !e)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: editMode ? `2px solid ${C.blue}` : `1px solid ${t.border}`, backgroundColor: editMode ? C.blue + '18' : t.bgPanel, color: editMode ? C.blue : t.text, cursor: 'pointer' }}>
            {editMode ? '✓ Listo' : '✏️ Personalizar'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {selected.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>Tu dashboard está vacío</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>Haz clic en <strong>✏️ Personalizar</strong> para agregar widgets</div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={selected.map(s => s.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
              {selected.map(item => <SortableWidget key={item.id} id={item.id} size={item.size} data={data} editMode={editMode} onRemove={remove} onEditSLA={onEditSLA} />)}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeId ? <DragGhost id={activeId} data={data} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '92%', maxHeight: '82vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: t.text }}>{pendingWidget ? `Tamaño — ${pendingWidget.label}` : 'Widgets del Dashboard'}</h2>
                {pendingWidget && <button onClick={() => setPendingWidget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, fontSize: '12px', padding: 0, marginTop: '4px' }}>← Volver al catálogo</button>}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>
            {!pendingWidget && (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: t.textMuted }}>{selected.length} activo{selected.length !== 1 ? 's' : ''} — click en activo para quitar, en inactivo para agregar con tamaño</p>
                {cats.map(cat => (
                  <div key={cat} style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid ${t.border}` }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {WIDGET_CATALOG.filter(w => w.cat === cat).map(item => {
                        const active = selected.some(s => s.id === item.id);
                        return (
                          <button key={item.id} onClick={() => toggleWidget(item)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${active ? C.blue : t.border}`, backgroundColor: active ? C.blue + '18' : t.bgPanel, color: active ? C.blue : t.text, cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '500' }}>
                            <span style={{ fontSize: '14px' }}>{item.icon}</span><span>{item.label}</span>{active && <span style={{ fontSize: '11px', fontWeight: '900' }}>✓</span>}
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
                      <button key={sz.key} onClick={() => addWithSize(sz.key)} style={{ padding: '18px 16px', borderRadius: '10px', border: `2px solid ${isRec ? C.blue : t.border}`, backgroundColor: isRec ? C.blue + '15' : t.bgPanel, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.backgroundColor = C.blue + '15'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = isRec ? C.blue : t.border; e.currentTarget.style.backgroundColor = isRec ? C.blue + '15' : t.bgPanel; }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                          {[1,2,3,4].map(i => <div key={i} style={{ height: '10px', flex: 1, borderRadius: '3px', backgroundColor: i <= sz.cols ? C.blue : t.border }} />)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>{sz.label}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{sz.desc}</div>
                        {isRec && <div style={{ fontSize: '10px', color: C.blue, fontWeight: '600', marginTop: '4px' }}>Recomendado</div>}
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

// ─── TAB 0: Resumen ───────────────────────────────────────────────────────────
const TabResumen = ({ data }) => {
  const { theme: t } = useTheme();
  const bySev      = data.bySeverity || [];
  const bySt       = data.byStatus   || [];
  const volByMonth = data.volByMonth  || [];
  const byDept     = (data.byDept    || []).slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card>
          <SectionTitle title="Distribución por Severidad" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bySev} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={85}
                label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {bySev.map((e, i) => <Cell key={i} fill={SEV_COLORS[e.severity] || C.gray} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle title="Distribución por Estado" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bySt} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {bySt.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.status] || C.gray} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Tendencia Mensual" sub="Total emitidas, cerradas y alta severidad" />
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={volByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: t.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: t.textMuted }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total"    name="Total"     fill={C.blue}   radius={[3,3,0,0]} />
            <Bar dataKey="cerrados" name="Cerradas"  fill={C.green}  radius={[3,3,0,0]} />
            <Line type="monotone" dataKey="altaSev"  name="Alta Sev" stroke={C.red} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {byDept.length > 0 && (
        <Card>
          <SectionTitle title="Top Departamentos" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Departamento', 'Total', 'Cerradas', 'Alta Sev', 'Prom. Respuesta'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: t.textMuted, borderBottom: `1px solid ${t.border}`, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDept.map((d, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel + '44' }}>
                  <td style={{ padding: '7px 8px', color: t.text, borderBottom: `1px solid ${t.border}` }}>{d.department}</td>
                  <td style={{ padding: '7px 8px', color: t.text, borderBottom: `1px solid ${t.border}`, fontWeight: '700' }}>{d.total}</td>
                  <td style={{ padding: '7px 8px', color: C.green, borderBottom: `1px solid ${t.border}` }}>{d.cerrados}</td>
                  <td style={{ padding: '7px 8px', color: d.altaSev > 0 ? C.red : t.textMuted, borderBottom: `1px solid ${t.border}` }}>{d.altaSev}</td>
                  <td style={{ padding: '7px 8px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{formatHours(d.avgResponseH)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const QARDashboardComponent = ({ data, onRefresh }) => {
  const { t: tr, language, changeLanguage } = useLanguage();
  const [tab, setTab] = useState(() => localStorage.getItem('qar-dashboard-tab') || 'resumen');
  const [showSlaModal, setShowSlaModal] = useState(false);

  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    localStorage.setItem('qar-dashboard-tab', newTab);
  }, []);

  const handleEditSLA = useCallback(() => setShowSlaModal(true), []);
  const handleSlaSaved = useCallback(async () => {
    setShowSlaModal(false);
    if (onRefresh) await onRefresh();
  }, [onRefresh]);

  if (!data) return null;

  const tb = data.topBar || {};

  const TABS = [
    { id: 'resumen',       label: 'Resumen',                icon: '📋' },
    { id: 'volumen',       label: 'Volumen & Flujo',        icon: '📊' },
    { id: 'tiempo',        label: 'Tiempo & Respuesta',     icon: '⏱️' },
    { id: 'calidad',       label: 'Calidad de Respuesta',   icon: '✅' },
    { id: 'operacion',     label: 'Operación Interna',      icon: '🏭' },
    { id: 'cliente',       label: 'Cliente / Proyecto',     icon: '🤝' },
    { id: 'riesgo',        label: 'Riesgo & Alertas',       icon: '🚨' },
    { id: 'personalizado', label: 'Mi Dashboard',           icon: '⚙️' },
  ];

  // Top-bar KPIs
  const slaRespColor = tb.slaResponsePct >= 80 ? C.green : tb.slaResponsePct >= 60 ? C.orange : C.red;
  const slaCloseColor = tb.slaClosurePct >= 80 ? C.green : tb.slaClosurePct >= 60 ? C.orange : C.red;

  return (
    <div>
      {/* Top KPI bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <KpiTile label="Total QARs" value={tb.total} sub="período seleccionado" color={C.blue} icon="📋" />
        <KpiTile label="Activas" value={tb.activos} sub="Emitidas + Respondidas" color={C.orange} icon="🔄" />
        <KpiTile label="Cerradas" value={tb.cerrados} sub="en período" color={C.green} icon="✅" />
        <KpiTile label="Alta Severidad" value={tb.altaSeveridad} sub="Crítico + ALTA" color={C.red} icon="🔴" />
        <KpiTile label="SLA Respuesta" value={tb.slaResponsePct != null ? `${tb.slaResponsePct}%` : '—'} sub="dentro de tiempo" color={slaRespColor} icon="⚡" />
        <KpiTile label="SLA Cierre" value={tb.slaClosurePct != null ? `${tb.slaClosurePct}%` : '—'} sub="dentro de tiempo" color={slaCloseColor} icon="🔒" />
        <KpiTile label="Vencidas" value={tb.vencidasSinRespuesta} sub="sin respuesta" color={tb.vencidasSinRespuesta > 0 ? C.red : C.green} icon="⏰" />
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} active={tab} onSelect={handleTabChange} />

      {/* Tab content */}
      {tab === 'resumen'       && <TabResumen      data={data} />}
      {tab === 'volumen'       && <TabVolumen      data={data} />}
      {tab === 'tiempo'        && <TabTiempo       data={data} onEditSLA={handleEditSLA} />}
      {tab === 'calidad'       && <TabCalidad      data={data} />}
      {tab === 'operacion'     && <TabOperacion    data={data} />}
      {tab === 'cliente'       && <TabCliente      data={data} />}
      {tab === 'riesgo'        && <TabRiesgo       data={data} />}
      {tab === 'personalizado' && <TabPersonalizado data={data} onEditSLA={handleEditSLA} />}

      {/* Always-visible table */}
      <QARTable data={data} />

      {/* SLA Config Modal */}
      {showSlaModal && (
        <SlaConfigModal
          slaConfig={data.slaConfig || []}
          onClose={() => setShowSlaModal(false)}
          onSaved={handleSlaSaved}
        />
      )}
    </div>
  );
};

export default QARDashboardComponent;
