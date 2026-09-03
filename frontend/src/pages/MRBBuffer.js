/**
 * MRBBuffer.js
 * Gestión del buffer de MRB - Material en QUARANTINE sin campaña asignada
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getMRBBuffer,
  getMRBBufferSummary,
  assignBufferToCampaign,
  batchAssignToCampaign
} from '../services/hospitalDashboardService';

const API_URL = 'http://localhost:5000';

const COLORS = {
  green: '#16a34a',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#0072CE',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const AGING_COLORS = { GREEN: COLORS.green, YELLOW: COLORS.yellow, RED: COLORS.red, GRAY: COLORS.gray };

// Colores para departamentos (se asignan dinámicamente)
const DEPT_COLORS = ['#0072CE', '#16a34a', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const fmtN = v => v == null ? '—' : Number(v).toLocaleString('es-MX');
const fmt$ = v => v == null ? '$0' : v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${Number(v).toFixed(0)}`;

const MRBBuffer = () => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [buffer, setBuffer] = useState([]);
  const [summary, setSummary] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('ALL');

  // Obtener color para departamento
  const getDeptColor = (deptId) => {
    const idx = departments.findIndex(d => d.id === deptId);
    return DEPT_COLORS[idx % DEPT_COLORS.length] || COLORS.gray;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const [bufferRes, summaryRes, campaignsRes, deptsRes] = await Promise.all([
        getMRBBuffer(),
        getMRBBufferSummary(),
        fetch(`${API_URL}/mrb?status=ABIERTA&limit=100`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`${API_URL}/departments`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        }).then(r => r.json())
      ]);

      setBuffer(bufferRes.data || []);
      setSummary(summaryRes.data || []);
      setCampaigns(campaignsRes.campaigns || []);
      setDepartments(deptsRes.departments || []);
    } catch (err) {
      console.error('Error loading buffer:', err);
      setError('Error al cargar el buffer');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignDepartment = async (defectId, departmentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mrb/buffer/${defectId}/assign-department`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departmentId: departmentId ? parseInt(departmentId) : null })
      }).then(r => r.json());

      if (res.success) {
        setSuccess('Departamento asignado correctamente');
        loadData();
      } else {
        setError(res.message || 'Error al asignar departamento');
      }
    } catch (err) {
      setError('Error al asignar departamento');
    }
    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  const handleAssignCampaign = async () => {
    if (!selectedCampaignId || selectedIds.length === 0) return;

    try {
      const res = await batchAssignToCampaign(selectedIds, parseInt(selectedCampaignId));
      if (res.success) {
        setSuccess(`${res.assignedCount} defecto(s) asignado(s) a campaña`);
        setSelectedIds([]);
        setShowAssignModal(false);
        setSelectedCampaignId('');
        loadData();
      } else {
        setError(res.message || 'Error al asignar campaña');
      }
    } catch (err) {
      setError('Error al asignar campaña');
    }
    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filtered = filteredBuffer.map(d => d.id);
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered);
    }
  };

  const filteredBuffer = filterDeptId === 'ALL'
    ? buffer
    : filterDeptId === 'NULL'
      ? buffer.filter(d => !d.departmentId)
      : buffer.filter(d => d.departmentId === parseInt(filterDeptId));

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
            Buffer MRB
          </h1>
          <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
            Material en QUARANTINE pendiente de asignación a campaña
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => navigate('/mrb-dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              color: t.text,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ← MRB Dashboard
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: COLORS.blue,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px'
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: COLORS.red + '20', border: `1px solid ${COLORS.red}`, borderRadius: '8px', color: COLORS.red, marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: COLORS.green + '20', border: `1px solid ${COLORS.green}`, borderRadius: '8px', color: COLORS.green, marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {/* Resumen por departamento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {summary.map((s, i) => (
          <div
            key={i}
            onClick={() => setFilterDeptId(s.departmentId ? String(s.departmentId) : 'NULL')}
            style={{
              backgroundColor: t.bgCard,
              border: `1px solid ${filterDeptId === (s.departmentId ? String(s.departmentId) : 'NULL') ? COLORS.blue : t.border}`,
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              borderLeft: `4px solid ${s.departmentId ? getDeptColor(s.departmentId) : COLORS.gray}`
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
              {s.departmentName || 'Sin Asignar'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: t.text }}>{fmtN(s.totalCount)}</div>
            <div style={{ fontSize: '11px', color: t.textMuted }}>
              {fmt$(s.totalCost)} · Prom: {s.avgHoursWaiting ? Number(s.avgHoursWaiting).toFixed(1) : '0'}h
            </div>
            {s.criticalCount > 0 && (
              <div style={{ fontSize: '11px', color: COLORS.red, marginTop: '4px' }}>
                ⚠️ {s.criticalCount} críticos (&gt;72h)
              </div>
            )}
          </div>
        ))}
        <div
          onClick={() => setFilterDeptId('ALL')}
          style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${filterDeptId === 'ALL' ? COLORS.blue : t.border}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted }}>VER TODOS</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: t.text }}>{fmtN(buffer.length)}</div>
          </div>
        </div>
      </div>

      {/* Acciones batch */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          backgroundColor: COLORS.blue + '10',
          border: `1px solid ${COLORS.blue}`,
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <span style={{ fontWeight: '600', color: t.text }}>
            {selectedIds.length} seleccionado(s)
          </span>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: COLORS.blue,
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Asignar a Campaña
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{
              padding: '6px 12px',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              color: t.text,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      {/* Tabla de buffer */}
      <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: t.bgPanel, borderBottom: `2px solid ${t.border}` }}>
              <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredBuffer.length && filteredBuffer.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Serial</th>
              <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Parte</th>
              <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Defecto</th>
              <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Ubicación</th>
              <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Horas</th>
              <th style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Aging</th>
              <th style={{ padding: '12px', textAlign: 'left', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Área Resp.</th>
              <th style={{ padding: '12px', textAlign: 'right', color: t.textMuted, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                  Cargando...
                </td>
              </tr>
            ) : filteredBuffer.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                  No hay material en buffer
                </td>
              </tr>
            ) : (
              filteredBuffer.map((d, i) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: `1px solid ${t.border}`,
                    backgroundColor: selectedIds.includes(d.id) ? COLORS.blue + '10' : (i % 2 === 0 ? 'transparent' : t.bgPanel)
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(d.id)}
                      onChange={() => toggleSelect(d.id)}
                    />
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600', color: t.text }}>{d.serialNumber || d.entryNumber}</td>
                  <td style={{ padding: '12px', color: t.text }}>
                    <div>{d.partNumber}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{d.partName}</div>
                  </td>
                  <td style={{ padding: '12px', color: t.text }}>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: t.bgPanel,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {d.defectTypeCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: t.textMuted, fontSize: '12px' }}>
                    {d.locationCode || '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>
                    {d.hoursInBuffer ? Number(d.hoursInBuffer).toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: AGING_COLORS[d.agingColor] || COLORS.gray
                    }} />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={d.departmentId || ''}
                      onChange={(e) => handleAssignDepartment(d.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: t.bgPanel,
                        border: `1px solid ${t.border}`,
                        borderRadius: '4px',
                        color: t.text,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: t.text }}>
                    {fmt$(d.unitCost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal asignar campaña */}
      {showAssignModal && (
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
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: t.text }}>
              Asignar a Campaña MRB
            </h3>
            <p style={{ color: t.textMuted, marginBottom: '16px' }}>
              {selectedIds.length} defecto(s) seleccionado(s)
            </p>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: t.bgPanel,
                border: `1px solid ${t.border}`,
                borderRadius: '6px',
                color: t.text,
                fontSize: '14px',
                marginBottom: '16px'
              }}
            >
              <option value="">Seleccionar campaña...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.campaignNumber} - {c.title}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAssignModal(false); setSelectedCampaignId(''); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.bgPanel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignCampaign}
                disabled={!selectedCampaignId}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCampaignId ? COLORS.blue : t.bgPanel,
                  border: 'none',
                  borderRadius: '6px',
                  color: selectedCampaignId ? '#fff' : t.textMuted,
                  cursor: selectedCampaignId ? 'pointer' : 'not-allowed'
                }}
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBBuffer;
