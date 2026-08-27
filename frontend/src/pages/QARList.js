import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Home, Send, RefreshCw, Download, Calendar, ChevronDown } from 'lucide-react';
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
    EMITIDO: { label: 'Emitido', color: t.warning, icon: AlertTriangle },
    RESPONDIDO: { label: 'Respondido', color: t.accent, icon: Clock },
    RECHAZADO: { label: 'Rechazado', color: t.error, icon: XCircle },
    CERRADO: { label: 'Cerrado', color: t.success, icon: CheckCircle }
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
      console.log('🔄 WebSocket [qar:created]:', data);
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
    const Icon = config.icon;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: `${config.color}20`,
        color: config.color,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        <Icon size={14} />
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

  // Column filter dropdown component - Excel style
  const ColumnFilter = ({ field, label }) => {
    const isOpen = openDropdown === field;
    const hasFilter = colFilters[field];

    return (
      <th style={{ ...styles.th, position: 'relative', userSelect: 'none' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : field);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            cursor: 'pointer',
            padding: '2px 0'
          }}
        >
          <span style={{ color: hasFilter ? t.accent : t.textMuted }}>{label}</span>
          <ChevronDown
            size={14}
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
              minWidth: '150px',
              maxHeight: '250px',
              overflowY: 'auto',
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              marginTop: '4px'
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
                fontSize: '12px',
                color: t.textMuted,
                cursor: 'pointer',
                borderBottom: `1px solid ${t.border}`,
                backgroundColor: !hasFilter ? t.bgPanel : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !hasFilter ? t.bgPanel : 'transparent'}
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
                  fontSize: '12px',
                  color: t.text,
                  cursor: 'pointer',
                  backgroundColor: colFilters[field] === val ? t.accent + '20' : 'transparent',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colFilters[field] === val ? t.accent + '20' : 'transparent'}
              >
                {val}
              </div>
            ))}
          </div>
        )}
      </th>
    );
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      color: t.text,
      fontSize: '24px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerButtons: {
      display: 'flex',
      gap: '12px'
    },
    homeButton: {
      padding: '10px 16px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px 12px',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontWeight: '600',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: `2px solid ${t.border}`
    },
    tr: {
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer',
      transition: 'background-color 0.15s'
    },
    td: {
      padding: '12px 12px',
      color: t.text,
      fontSize: '13px'
    },
    qarNumber: {
      fontFamily: 'monospace',
      fontWeight: '600',
      color: t.accent
    },
    severity: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px',
      color: t.textMuted
    },
    viewButton: {
      padding: '6px 12px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px'
    },
    periodButton: (active) => ({
      padding: '8px 16px',
      backgroundColor: active ? t.accent : t.bgCard,
      color: active ? 'white' : t.text,
      border: `1px solid ${active ? t.accent : t.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.15s'
    }),
    dateInput: {
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '13px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <AlertTriangle size={28} color={t.warning} />
          Quality Alert Reports (QAR)
        </h1>
        <div style={styles.headerButtons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button style={{ ...styles.homeButton, backgroundColor: t.success }} onClick={() => navigate('/qar-create')}>
            {language === 'es' ? '+ Nuevo QAR' : '+ New QAR'}
          </button>
          <button style={styles.homeButton} onClick={() => navigate('/defect-capture')}>
            Inspección
          </button>
          <button style={{ ...styles.homeButton, backgroundColor: t.textMuted }} onClick={() => navigate('/defect-dashboard')}>
            <Home size={18} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[
          { key: 'EMITIDO', label: 'Pendientes', color: t.warning, icon: AlertTriangle },
          { key: 'RESPONDIDO', label: 'Por Validar', color: t.accent, icon: Clock },
          { key: 'RECHAZADO', label: 'Rechazados', color: t.error, icon: XCircle },
          { key: 'CERRADO', label: 'Cerrados', color: t.success, icon: CheckCircle }
        ].map(({ key, label, color, icon: Icon }) => (
          <div
            key={key}
            onClick={() => setColFilters(prev => ({ ...prev, status: prev.status === key ? '' : key }))}
            style={{
              flex: 1,
              backgroundColor: colFilters.status === key ? color : t.bgCard,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: `2px solid ${colFilters.status === key ? color : t.border}`,
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={20} color={colFilters.status === key ? 'white' : color} />
              <span style={{ color: colFilters.status === key ? 'white' : t.textMuted, fontSize: '13px' }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colFilters.status === key ? 'white' : t.text }}>
              {statusCounts[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Period Filters + Date Range + Excel Export */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: t.bgCard,
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: `1px solid ${t.border}`
      }}>
        {/* Period Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={18} color={t.textMuted} />
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
              style={styles.periodButton(periodo === key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date Inputs + Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: t.textMuted }}>Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPeriodo(''); }}
              style={styles.dateInput}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: t.textMuted }}>Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPeriodo(''); }}
              style={styles.dateInput}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: t.error,
                border: `1px solid ${t.error}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              ✕ Limpiar
            </button>
          )}

          <button
            onClick={loadData}
            style={{
              padding: '8px 14px',
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={exportToExcel}
            disabled={exportingExcel || filteredQars.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (exportingExcel || filteredQars.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (exportingExcel || filteredQars.length === 0) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <Download size={14} />
            {exportingExcel ? '...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: '12px', fontSize: '13px', color: t.textMuted }}>
        Mostrando <strong style={{ color: t.text }}>{filteredQars.length}</strong> de <strong style={{ color: t.text }}>{allQars.length}</strong> QARs
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.emptyState}>Cargando...</div>
        ) : filteredQars.length === 0 && allQars.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No hay QARs registrados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
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
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredQars.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ ...styles.emptyState, padding: '40px' }}>
                      No se encontraron QARs con los filtros seleccionados
                    </td>
                  </tr>
                ) : filteredQars.map(qar => {
                  const actionConfig = {
                    'EMITIDO': { label: 'Responder', color: t.warning, icon: Send },
                    'RESPONDIDO': { label: 'Validar', color: t.accent, icon: CheckCircle },
                    'RECHAZADO': { label: 'Corregir', color: t.error, icon: RefreshCw },
                    'CERRADO': { label: 'Ver', color: t.success, icon: Eye }
                  };
                  const action = actionConfig[qar.status] || actionConfig['CERRADO'];
                  const ActionIcon = action.icon;

                  return (
                    <tr
                      key={qar.id}
                      style={styles.tr}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => navigate(`/qar-detail/${qar.id}`)}
                    >
                      <td style={styles.td}>
                        <span style={styles.qarNumber}>{qar.alertNumber}</span>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {qar.title}
                      </td>
                      <td style={styles.td}>{qar.clientName || '-'}</td>
                      <td style={styles.td}>{qar.partNumber || '-'}</td>
                      <td style={styles.td}>
                        <span style={{ fontSize: '12px', color: t.textMuted }}>
                          {qar.departmentName || '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.severity,
                          backgroundColor: qar.severityColor || t.textMuted,
                          color: 'white'
                        }}>
                          {qar.severityCode || qar.severityName || '-'}
                        </span>
                      </td>
                      <td style={styles.td}>{getStatusBadge(qar.status)}</td>
                      <td style={styles.td}>{formatDate(qar.createdAt)}</td>
                      <td style={styles.td}>
                        <button
                          style={{ ...styles.viewButton, backgroundColor: action.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/qar-detail/${qar.id}`);
                          }}
                        >
                          <ActionIcon size={14} />
                          {action.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QARList;
