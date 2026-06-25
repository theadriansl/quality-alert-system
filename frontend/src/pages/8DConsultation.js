import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Helpers
const TODAY = new Date().toISOString().split('T')[0];

const formatCurrency = (v) => {
  if (!v || isNaN(v)) return '$0';
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${parseFloat(v).toFixed(0)}`;
};

const STEP_COLORS = {
  D1: '#9ca3af', D2: '#6b7280', D3: '#4b5563', 'D3-MFG': '#374151',
  D4: '#1565C0', D5: '#0072CE', D6: '#8b5cf6', D7: '#C77700', D8: '#2E7D32'
};

const sevColor = (s) => s === 'High' ? '#ef4444' : s === 'Medium' ? '#C77700' : '#2E7D32';
const statusColor = (s, t) => {
  const l = (s || '').toLowerCase();
  if (l === 'closed') return '#2E7D32';
  if (l === 'in progress' || l === 'in_progress') return t?.accent || '#0072CE';
  return t?.textDim || '#6b7280';
};

const EightDConsultation = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fSev, setFSev] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fStep, setFStep] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [fSupplier, setFSupplier] = useState('all');

  // Admin check
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isUserAdmin(currentUser);

  // Load reports directly from dashboard-data endpoint (same source as dashboard)
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/8d/dashboard-data', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        if (result.success && result.data && result.data.recent8Ds) {
          // Use recent8Ds directly - same data format as dashboard
          setReports(result.data.recent8Ds);
        } else {
          setReports([]);
        }
      } catch (err) {
        console.error('Error loading 8D reports:', err);
        setError('Error al cargar los reportes 8D');
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  // Derived data for filters
  const departments = useMemo(() => [...new Set(reports.map(r => r.createdByDepartment).filter(Boolean))].sort(), [reports]);
  const suppliers = useMemo(() => [...new Set(reports.map(r => r.supplierName).filter(Boolean))].sort(), [reports]);

  // Filtered reports
  const filtered = useMemo(() => reports.filter(r => {
    const s = search.toLowerCase();
    return (
      (!s || r.title?.toLowerCase().includes(s) || r.reportId?.toLowerCase().includes(s) || r.supplierName?.toLowerCase().includes(s)) &&
      (fSev === 'all' || r.severity === fSev) &&
      (fStatus === 'all' || r.status === fStatus) &&
      (fStep === 'all' || r.currentStep === fStep) &&
      (fDept === 'all' || r.createdByDepartment === fDept) &&
      (fSupplier === 'all' || r.supplierName === fSupplier)
    );
  }), [reports, search, fSev, fStatus, fStep, fDept, fSupplier]);

  const handleDelete = async (reportId, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el reporte ${reportId}? Esta acción no se puede deshacer.`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/8d/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'No se pudo eliminar'}`);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error al eliminar el reporte');
    }
  };

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/8d-workflow?reportId=${id}&mode=edit`);
  };

  const inputStyle = { padding: '8px 12px', fontSize: '13px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text };
  const hasFilters = search || fSev !== 'all' || fStatus !== 'all' || fStep !== 'all' || fDept !== 'all' || fSupplier !== 'all';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg }}>
      {/* Header */}
      <div style={{ backgroundColor: t.primary, color: 'white', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>📋 Consulta de Reportes 8D</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '10px 20px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Filters Header */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '700', color: t.text }}>📋 Listado de Reportes 8D</span>
                <span style={{ fontSize: '14px', color: t.textMuted, marginLeft: '12px' }}>{filtered.length} de {reports.length} reportes</span>
              </div>
              {hasFilters && (
                <button onClick={() => { setSearch(''); setFSev('all'); setFStatus('all'); setFStep('all'); setFDept('all'); setFSupplier('all'); }}
                  style={{ fontSize: '13px', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer', fontWeight: '600' }}>
                  ✕ Limpiar filtros
                </button>
              )}
            </div>

            {/* Filtros expandidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: '12px', alignItems: 'center' }}>
              <input
                placeholder="🔍 Buscar por ID, título, proveedor..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
                style={{ ...inputStyle, padding: '10px 14px' }}
              />
              <select value={fSev} onChange={e=>setFSev(e.target.value)} style={inputStyle}>
                <option value="all">🎯 Severidad: Todas</option>
                <option value="High">🔴 Alta</option>
                <option value="Medium">🟡 Media</option>
                <option value="Low">🟢 Baja</option>
              </select>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={inputStyle}>
                <option value="all">📊 Estado: Todos</option>
                <option value="Open">Abierto</option>
                <option value="In Progress">En Progreso</option>
                <option value="in_progress">En Progreso</option>
                <option value="Closed">Cerrado</option>
              </select>
              <select value={fStep} onChange={e=>setFStep(e.target.value)} style={inputStyle}>
                <option value="all">📍 Fase: Todas</option>
                {['D1','D2','D3','D3-MFG','D4','D5','D6','D7','D8'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={fDept} onChange={e=>setFDept(e.target.value)} style={inputStyle}>
                <option value="all">🏢 Departamento: Todos</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={fSupplier} onChange={e=>setFSupplier(e.target.value)} style={inputStyle}>
                <option value="all">🏭 Proveedor: Todos</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: t.textMuted, fontSize: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Cargando reportes...
            </div>
          ) : error ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444', fontSize: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
              {error}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: t.bgPanel }}>
                    {['ID', 'Título', 'Proveedor', 'Severidad', 'Estado', 'Fase', 'Días', 'Avance', 'Vence', 'Costo', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: t.textMuted, borderBottom: `2px solid ${t.border}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ padding: '60px', textAlign: 'center', color: t.textMuted, fontSize: '16px' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                        No se encontraron reportes con los filtros seleccionados
                      </td>
                    </tr>
                  ) : filtered.map((r, i) => {
                    const isOverdue = r.targetClosureDate && r.targetClosureDate < TODAY && (r.status || '').toLowerCase() !== 'closed';
                    return (
                      <tr key={r.id || i}
                        onClick={() => navigate(`/8d-workflow?reportId=${r.id}`)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isOverdue ? '#fee2e215' : i % 2 === 0 ? 'transparent' : t.bgPanel + '50',
                          borderBottom: `1px solid ${t.border}`,
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.accent + '15'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = isOverdue ? '#fee2e215' : i % 2 === 0 ? 'transparent' : t.bgPanel + '50'}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontFamily: 'monospace', color: t.accent, fontWeight: '700', fontSize: '12px' }}>{r.reportId}</span>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                          <span style={{ color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: '500' }} title={r.title}>{r.title || '—'}</span>
                        </td>
                        <td style={{ padding: '14px 16px', color: t.textMuted, whiteSpace: 'nowrap' }}>{r.supplierName || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                            backgroundColor: r.severity === 'High' ? '#fee2e2' : r.severity === 'Medium' ? '#fef3c7' : '#dcfce7',
                            color: sevColor(r.severity) }}>
                            {r.severity === 'High' ? 'Alta' : r.severity === 'Medium' ? 'Media' : r.severity === 'Low' ? 'Baja' : r.severity || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: statusColor(r.status, t), fontWeight: '600', fontSize: '12px' }}>{r.status || '—'}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: STEP_COLORS[r.currentStep] || '#6b7280', color: 'white', fontSize: '11px', fontWeight: '700' }}>
                            {r.currentStep || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: (r.daysOpen || 0) > 90 ? '#ef4444' : (r.daysOpen || 0) > 60 ? '#C77700' : (r.daysOpen || 0) > 30 ? t.accent : '#2E7D32', fontWeight: '700', fontSize: '13px' }}>
                            {r.daysOpen != null ? `${r.daysOpen}d` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '8px', backgroundColor: t.bgPanel, borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${r.progressPercentage || 0}%`,
                                backgroundColor: (r.progressPercentage||0) >= 75 ? '#2E7D32' : (r.progressPercentage||0) >= 50 ? t.accent : (r.progressPercentage||0) >= 25 ? '#C77700' : '#ef4444',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', color: t.text, fontWeight: '600', minWidth: '32px' }}>{r.progressPercentage || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          {r.targetClosureDate ? (
                            <span style={{ color: isOverdue ? '#ef4444' : t.textMuted, fontWeight: isOverdue ? '700' : '500', fontSize: '12px' }}>
                              {isOverdue ? '⚠️ ' : ''}{new Date(r.targetClosureDate).toLocaleDateString('es-MX')}
                            </span>
                          ) : <span style={{ color: t.textMuted }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: (parseFloat(r.estimatedCost) || 0) > 100000 ? '#ef4444' : '#2E7D32', fontWeight: '700', fontSize: '12px' }}>
                            {formatCurrency(parseFloat(r.estimatedCost) || 0)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => handleEdit(r.id, e)}
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '8px', transition: 'opacity 0.15s' }}
                            onMouseEnter={e => e.target.style.opacity = '0.85'}
                            onMouseLeave={e => e.target.style.opacity = '1'}
                          >
                            ✏️ Editar
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDelete(r.id, e)}
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                              onMouseEnter={e => e.target.style.opacity = '0.85'}
                              onMouseLeave={e => e.target.style.opacity = '1'}
                            >
                              🗑️ Borrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, backgroundColor: t.bgPanel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: t.textMuted }}>
              Mostrando <strong style={{ color: t.text }}>{filtered.length}</strong> de <strong style={{ color: t.text }}>{reports.length}</strong> reportes
            </span>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
              <span style={{ color: t.textMuted }}>
                Costo total filtrado: <strong style={{ color: '#2E7D32', fontSize: '15px' }}>{formatCurrency(filtered.reduce((s,r) => s + (parseFloat(r.estimatedCost) || 0), 0))}</strong>
              </span>
              <span style={{ color: t.textMuted }}>
                Promedio días: <strong style={{ color: t.accent }}>{filtered.length > 0 ? Math.round(filtered.reduce((s,r) => s + (r.daysOpen || 0), 0) / filtered.length) : 0}d</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EightDConsultation;
