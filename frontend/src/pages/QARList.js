import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

const QARList = () => {
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const API_URL = 'http://localhost:5000';

  const [allQars, setAllQars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Period filter
  const [periodo, setPeriodo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Column filters (inline)
  const [colFilters, setColFilters] = useState({
    alertNumber: '',
    title: '',
    clientName: '',
    partNumber: '',
    departmentName: '',
    severityCode: '',
    status: '',
    createdAt: ''
  });

  // Dropdown state for column filters
  const [openDropdown, setOpenDropdown] = useState(null);

  const STATUS_CONFIG = {
    EMITIDO: { label: 'Emitido', color: t.warning },
    RESPONDIDO: { label: 'Respondido', color: t.accent },
    RECHAZADO: { label: 'Rechazado', color: t.error },
    CERRADO: { label: 'Cerrado', color: t.success }
  };

  // Calculate date range based on period
  const getDateRange = useCallback((period) => {
    const today = new Date();
    let desde = '';
    let hasta = today.toISOString().split('T')[0];

    if (period === 'semana') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      desde = startOfWeek.toISOString().split('T')[0];
    } else if (period === 'mes') {
      desde = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (period === 'trimestre') {
      const quarter = Math.floor(today.getMonth() / 3);
      desde = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
    } else if (period === 'year') {
      desde = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else {
      desde = '';
      hasta = '';
    }
    return { desde, hasta };
  }, []);

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setPeriodo(newPeriod);
    const { desde, hasta } = getDateRange(newPeriod);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const qarsRes = await fetch(`${API_URL}/qar`, { headers });
      const qarsData = await qarsRes.json();
      setAllQars(qarsData.qars || []);

    } catch (err) {
      console.error('Error loading QARs:', err);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket: Escuchar eventos de QAR para actualización en tiempo real
  useEffect(() => {
    const unsubscribe = subscribe('qar:created', (data) => {
      console.log('WebSocket [qar:created]:', data);
      loadData();
    });
    return () => unsubscribe();
  }, [subscribe]);

  // Get unique values for column filters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniqueValues = useMemo(() => ({
    alertNumber: [...new Set(allQars.map(q => q.alertNumber).filter(Boolean))].sort(),
    title: [...new Set(allQars.map(q => q.title).filter(Boolean))].sort(),
    clientName: [...new Set(allQars.map(q => q.clientName).filter(Boolean))].sort(),
    partNumber: [...new Set(allQars.map(q => q.partNumber).filter(Boolean))].sort(),
    departmentName: [...new Set(allQars.map(q => q.departmentName).filter(Boolean))].sort(),
    severityCode: [...new Set(allQars.map(q => q.severityCode || q.severityName).filter(Boolean))].sort(),
    status: Object.keys(STATUS_CONFIG),
    createdAt: [...new Set(allQars.map(q => q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-MX') : null).filter(Boolean))].sort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [allQars]);

  // Filtered data
  const filteredQars = useMemo(() => {
    return allQars.filter(qar => {
      // Date filter
      if (fechaDesde || fechaHasta) {
        const qarDate = qar.createdAt ? new Date(qar.createdAt).toISOString().split('T')[0] : '';
        if (fechaDesde && qarDate < fechaDesde) return false;
        if (fechaHasta && qarDate > fechaHasta) return false;
      }

      // Column filters
      if (colFilters.alertNumber && qar.alertNumber !== colFilters.alertNumber) return false;
      if (colFilters.title && qar.title !== colFilters.title) return false;
      if (colFilters.clientName && qar.clientName !== colFilters.clientName) return false;
      if (colFilters.partNumber && qar.partNumber !== colFilters.partNumber) return false;
      if (colFilters.departmentName && qar.departmentName !== colFilters.departmentName) return false;
      if (colFilters.severityCode && (qar.severityCode || qar.severityName) !== colFilters.severityCode) return false;
      if (colFilters.status && qar.status !== colFilters.status) return false;
      if (colFilters.createdAt) {
        const qarDateStr = qar.createdAt ? new Date(qar.createdAt).toLocaleDateString('es-MX') : '';
        if (qarDateStr !== colFilters.createdAt) return false;
      }

      return true;
    });
  }, [allQars, fechaDesde, fechaHasta, colFilters]);

  // Count QARs by status (from filtered data for accuracy)
  const statusCounts = useMemo(() => ({
    EMITIDO: filteredQars.filter(q => q.status === 'EMITIDO').length,
    RESPONDIDO: filteredQars.filter(q => q.status === 'RESPONDIDO').length,
    RECHAZADO: filteredQars.filter(q => q.status === 'RECHAZADO').length,
    CERRADO: filteredQars.filter(q => q.status === 'CERRADO').length
  }), [filteredQars]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.EMITIDO;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        backgroundColor: `${config.color}15`,
        border: `1px solid ${config.color}30`,
        color: config.color,
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600
      }}>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: config.color
        }} />
        {config.label}
      </span>
    );
  };

  // Export to Excel
  const exportToExcel = useCallback(() => {
    setExportingExcel(true);
    try {
      const dataToExport = filteredQars.map(q => ({
        'Número': q.alertNumber || '',
        'Título': q.title || '',
        'Cliente': q.clientName || '',
        'Parte': q.partNumber || '',
        'Departamento': q.departmentName || '',
        'Severidad': q.severityCode || q.severityName || '',
        'Estado': q.status || '',
        'Fecha Creación': q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-MX') : ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Column widths
      ws['!cols'] = [
        { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'QARs');
      const fileName = `QAR_List_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Error al exportar a Excel');
    } finally {
      setExportingExcel(false);
    }
  }, [filteredQars]);

  // Clear all filters
  const clearFilters = () => {
    setPeriodo('todos');
    setFechaDesde('');
    setFechaHasta('');
    setColFilters({
      alertNumber: '',
      title: '',
      clientName: '',
      partNumber: '',
      departmentName: '',
      severityCode: '',
      status: '',
      createdAt: ''
    });
  };

  const hasActiveFilters = fechaDesde || fechaHasta || Object.values(colFilters).some(v => v);

  // Column filter dropdown component
  const ColumnFilter = ({ field, label }) => {
    const isOpen = openDropdown === field;
    const hasFilter = colFilters[field];

    return (
      <th style={{
        textAlign: 'left',
        padding: '0 12px',
        height: 34,
        backgroundColor: t.field,
        color: t.textMuted,
        fontWeight: 600,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${t.line}`,
        position: 'relative',
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : field);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            cursor: 'pointer'
          }}
        >
          <span style={{ color: hasFilter ? t.accent : t.textMuted }}>{label}</span>
          <ChevronDown
            size={12}
            color={hasFilter ? t.accent : t.textMuted}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s'
            }}
          />
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              minWidth: 150,
              maxHeight: 250,
              overflowY: 'auto',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              marginTop: 4
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clear option */}
            <div
              onClick={() => {
                setColFilters(prev => ({ ...prev, [field]: '' }));
                setOpenDropdown(null);
              }}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                color: t.textMuted,
                cursor: 'pointer',
                borderBottom: `1px solid ${t.border}`,
                backgroundColor: !hasFilter ? (t.accentBg) : 'transparent'
              }}
            >
              (Todos)
            </div>

            {/* Options */}
            {uniqueValues[field]?.map(val => (
              <div
                key={val}
                onClick={() => {
                  setColFilters(prev => ({ ...prev, [field]: val }));
                  setOpenDropdown(null);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  color: t.text,
                  cursor: 'pointer',
                  backgroundColor: colFilters[field] === val ? (t.accentBg) : 'transparent',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => {
                  if (colFilters[field] !== val) e.currentTarget.style.backgroundColor = t.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colFilters[field] === val ? (t.accentBg) : 'transparent';
                }}
              >
                {val}
              </div>
            ))}
          </div>
        )}
      </th>
    );
  };

  // Action labels by status
  const getActionLabel = (status) => {
    switch (status) {
      case 'EMITIDO': return 'Responder';
      case 'RESPONDIDO': return 'Validar';
      case 'RECHAZADO': return 'Corregir';
      default: return 'Ver';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: t.text, fontSize: 24, fontWeight: 700, margin: 0 }}>
          Quality Alert Reports (QAR)
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => navigate('/qar-create')}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: t.primary,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            + {language === 'es' ? 'Nueva QAR' : 'New QAR'}
          </button>
          <button
            onClick={() => navigate('/defect-capture')}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            {language === 'es' ? 'Inspección' : 'Inspection'}
          </button>
          <button
            onClick={() => navigate('/defect-dashboard')}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Status Cards - Compact tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { key: 'EMITIDO', label: 'Pendientes', color: t.warning },
          { key: 'RESPONDIDO', label: 'Por Validar', color: t.accent },
          { key: 'RECHAZADO', label: 'Rechazados', color: t.error },
          { key: 'CERRADO', label: 'Cerrados', color: t.success }
        ].map(({ key, label, color }) => {
          const isFiltering = colFilters.status === key;
          return (
            <div
              key={key}
              onClick={() => setColFilters(prev => ({ ...prev, status: prev.status === key ? '' : key }))}
              style={{
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                border: isFiltering ? `1px solid ${t.accentBorder}` : `1px solid ${t.border}`,
                backgroundColor: isFiltering ? (t.accentBg) : t.bgCard,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: color
                }} />
                <span style={{ color: t.textMuted, fontSize: 11.5 }}>
                  {label}
                </span>
                {isFiltering && (
                  <span style={{ fontSize: 10, color: t.accent, marginLeft: 'auto' }}>
                    Filtrando
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 500,
                fontFamily: "'IBM Plex Mono', monospace",
                color: t.text
              }}>
                {statusCounts[key]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Period Filters + Date Range + Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: t.bgCard,
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 16,
        border: `1px solid ${t.border}`
      }}>
        {/* Period Buttons - Segmented */}
        <div style={{
          display: 'flex',
          backgroundColor: t.bgPanel,
          borderRadius: 6,
          padding: 2,
          gap: 2
        }}>
          {[
            { key: 'semana', label: 'Semana' },
            { key: 'mes', label: 'Mes' },
            { key: 'trimestre', label: 'Trimestre' },
            { key: 'year', label: 'Año' },
            { key: 'todos', label: 'Todos' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodChange(key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: periodo === key ? t.bgCard : 'transparent',
                color: periodo === key ? t.text : t.textMuted,
                boxShadow: periodo === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                whiteSpace: 'nowrap',
                height: 30
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date Inputs + Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setFechaDesde(e.target.value); setPeriodo(''); }}
            style={{
              padding: '0 10px',
              height: 30,
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              backgroundColor: t.bgCard,
              color: t.text
            }}
          />
          <span style={{ fontSize: 12, color: t.textMuted }}>—</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setFechaHasta(e.target.value); setPeriodo(''); }}
            style={{
              padding: '0 10px',
              height: 30,
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              backgroundColor: t.bgCard,
              color: t.text
            }}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: t.accent,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0 8px',
                height: 30
              }}
            >
              Restablecer
            </button>
          )}

          <button
            onClick={loadData}
            style={{
              padding: '0 12px',
              height: 30,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Actualizar
          </button>

          <button
            onClick={exportToExcel}
            disabled={exportingExcel || filteredQars.length === 0}
            style={{
              padding: '0 14px',
              height: 30,
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: (exportingExcel || filteredQars.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (exportingExcel || filteredQars.length === 0) ? 0.5 : 1,
              fontSize: 12,
              fontWeight: 500
            }}
          >
            {exportingExcel ? '...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
        Mostrando <strong style={{ color: t.text }}>{filteredQars.length}</strong> de <strong style={{ color: t.text }}>{allQars.length}</strong> QARs
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: t.textMuted }}>Cargando...</div>
        ) : filteredQars.length === 0 && allQars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: t.textMuted }}>
            <p>No hay QARs registrados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', minWidth: 900 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <ColumnFilter field="alertNumber" label="Número" />
                  <ColumnFilter field="title" label="Título" />
                  <ColumnFilter field="clientName" label="Cliente" />
                  <ColumnFilter field="partNumber" label="Parte" />
                  <ColumnFilter field="departmentName" label="Depto" />
                  <ColumnFilter field="severityCode" label="Sev" />
                  <ColumnFilter field="status" label="Estado" />
                  <ColumnFilter field="createdAt" label="Fecha" />
                  <th style={{
                    textAlign: 'left',
                    padding: '0 12px',
                    height: 34,
                    backgroundColor: t.field,
                    color: t.textMuted,
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `1px solid ${t.line}`,
                    width: 80
                  }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredQars.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: t.textMuted }}>
                      No se encontraron QARs con los filtros seleccionados.{' '}
                      <button
                        onClick={clearFilters}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.accent,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Restablecer filtros
                      </button>
                    </td>
                  </tr>
                ) : filteredQars.map(qar => (
                  <tr
                    key={qar.id}
                    style={{
                      borderBottom: `1px solid ${t.line}`,
                      cursor: 'pointer',
                      height: 44
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = t.hover}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/qar-detail/${qar.id}`)}
                  >
                    <td style={{ padding: '0 12px', color: t.text, fontSize: 13 }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 600,
                        color: t.accent
                      }}>
                        {qar.alertNumber}
                      </span>
                    </td>
                    <td style={{
                      padding: '0 12px',
                      color: t.text,
                      fontSize: 13,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {qar.title}
                    </td>
                    <td style={{ padding: '0 12px', color: t.text, fontSize: 13 }}>{qar.clientName || '-'}</td>
                    <td style={{ padding: '0 12px', color: t.text, fontSize: 13 }}>{qar.partNumber || '-'}</td>
                    <td style={{ padding: '0 12px', fontSize: 12, color: t.textMuted }}>{qar.departmentName || '-'}</td>
                    <td style={{ padding: '0 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          backgroundColor: qar.severityColor || t.textMuted
                        }} />
                        <span style={{ fontSize: 12, color: t.textMuted }}>
                          {qar.severityCode || qar.severityName || '-'}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '0 12px' }}>{getStatusBadge(qar.status)}</td>
                    <td style={{ padding: '0 12px', fontSize: 12, color: t.textMuted }}>{formatDate(qar.createdAt)}</td>
                    <td style={{ padding: '0 12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/qar-detail/${qar.id}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.accent,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {getActionLabel(qar.status)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QARList;
