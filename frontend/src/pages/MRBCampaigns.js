import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Home, Send, RefreshCw, FileText, List, ChevronDown, Download, Calendar } from 'lucide-react';


const fmtShiftDate = d => {
  const s = typeof d === 'string' ? d.substring(0, 10) : d;
  return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
};

const UnregisteredRow = ({ item, rowKey, edit, selected, t, onEditChange, onToggleSelect }) => {
  const [editing, setEditing] = React.useState(false);
  const inspRate = parseFloat(item.inspectorUnitCost || 0);
  const supRate  = parseFloat(item.supervisorUnitCost || 0);
  const cost = (parseFloat(edit.insp) * parseFloat(edit.hrs) * inspRate) + (parseFloat(edit.sup) * parseFloat(edit.hrs) * supRate);

  return (
    <tr style={{ borderBottom: `1px solid ${t.border}`, opacity: selected ? 1 : 0.45 }}>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(rowKey)}
          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: t.accent }} />
      </td>
      <td style={{ padding: '5px 8px', color: t.text, fontSize: '12px' }}>{fmtShiftDate(item.inspectionDate)}</td>
      <td style={{ padding: '5px 8px', fontSize: '12px' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600', color: t.accent, marginRight: '6px' }}>{item.campaignNumber}</span>
        <span style={{ color: t.textMuted, fontSize: '11px' }}>{item.title}</span>
      </td>
      <td style={{ padding: '5px 8px', color: t.text, fontSize: '12px' }}>
        {item.shiftCode || '—'} <span style={{ color: t.textMuted, fontSize: '11px' }}>{item.shiftName}</span>
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing
          ? <input type="number" min="0.5" max="24" step="0.5" value={edit.hrs} autoFocus
              onChange={e => onEditChange(rowKey, { hrs: parseFloat(e.target.value) || 0 })}
              style={{ width: '64px', padding: '4px', textAlign: 'center', border: `1px solid ${t.accent}`, borderRadius: '4px', backgroundColor: t.bgPanel, color: t.text, fontSize: '13px', fontWeight: '600' }} />
          : <span style={{ fontWeight: '600', color: t.text }}>{edit.hrs} hrs</span>
        }
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: '12px' }}>
        {editing ? (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
            <input type="number" min="0" step="1" value={edit.insp}
              onChange={e => onEditChange(rowKey, { insp: parseFloat(e.target.value) || 0 })}
              style={{ width: '44px', padding: '3px', textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgPanel, color: t.text, fontSize: '12px' }} />
            <span style={{ color: t.textMuted }}>insp</span>
            <input type="number" min="0" step="1" value={edit.sup}
              onChange={e => onEditChange(rowKey, { sup: parseFloat(e.target.value) || 0 })}
              style={{ width: '44px', padding: '3px', textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgPanel, color: t.text, fontSize: '12px' }} />
            <span style={{ color: t.textMuted }}>sup</span>
          </div>
        ) : <span style={{ color: t.textMuted }}>{edit.insp} insp · {edit.sup} sup</span>}
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '600', color: t.warning, fontSize: '12px' }}>
        ${cost.toFixed(2)}
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing ? (
          <button onClick={() => setEditing(false)}
            style={{ padding: '4px 10px', backgroundColor: t.success, color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            ✓ Ok
          </button>
        ) : (
          <button onClick={() => setEditing(true)}
            style={{ padding: '4px 8px', backgroundColor: t.bgPanel, color: t.accent, border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
            ✎ Editar
          </button>
        )}
      </td>
    </tr>
  );
};

const MRBCampaigns = () => {
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();
  const { language } = useLanguage();
  const { subscribe } = useSocket();
  const API_URL = 'http://localhost:5000';

  // Traducciones locales
  const L = {
    en: {
      campaigns: 'Campaigns', unregisteredShifts: 'Unregistered Shifts',
      draft: 'Draft', open: 'Open', inProcess: 'In Process', cancelled: 'Cancelled', closed: 'Closed',
      drafts: 'Drafts', openItems: 'Open', inProcessItems: 'In Process', cancelledItems: 'Cancelled', closedItems: 'Closed',
      complete: 'Complete', dispose: 'Dispose', validate: 'Validate', view: 'View',
      date: 'Date', campaign: 'Campaign', shift: 'Shift', hoursWorked: 'Hours Worked', resources: 'Resources', cost: 'Cost',
    },
    es: {
      campaigns: 'Campañas', unregisteredShifts: 'Turnos sin registrar',
      draft: 'Borrador', open: 'Abierto', inProcess: 'En Proceso', cancelled: 'Cancelado', closed: 'Cerrado',
      drafts: 'Borradores', openItems: 'Abiertos', inProcessItems: 'En Proceso', cancelledItems: 'Cancelados', closedItems: 'Cerrados',
      complete: 'Completar', dispose: 'Disponer', validate: 'Validar', view: 'Ver',
      date: 'Fecha', campaign: 'Campaña', shift: 'Turno', hoursWorked: 'Horas Trabajadas', resources: 'Recursos', cost: 'Costo',
    }
  }[language] || {};

  const [mrbs, setMrbs] = useState([]);
  const [allMrbs, setAllMrbs] = useState([]); // For counting
  const [loading, setLoading] = useState(true);

  // Initialize filters from localStorage for memory persistence
  const savedFilters = JSON.parse(localStorage.getItem('mrbCampaignsFilters') || '{}');
  const [filterStatus, setFilterStatus] = useState(savedFilters.status || '');
  const [unregisteredShifts, setUnregisteredShifts] = useState([]);
  const [shiftEdits, setShiftEdits] = useState({});
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [bulkRegistering, setBulkRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState(savedFilters.tab || 'campaigns');

  // Period & date filters
  const [periodo, setPeriodo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Column filters (inline Excel-style)
  const [colFilters, setColFilters] = useState({
    campaignNumber: '',
    sourceType: '',
    title: '',
    clientName: '',
    partNumber: '',
    departmentName: '',
    severityCode: '',
    status: '',
    createdAt: '',
    reportedByName: ''
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('mrbCampaignsFilters', JSON.stringify({
      status: filterStatus,
      tab: activeTab
    }));
  }, [filterStatus, activeTab]);

  useEffect(() => {
    if (!unregisteredShifts.length) return;
    const edits = {};
    const keys = new Set();
    unregisteredShifts.forEach(item => {
      const k = `${item.campaignId}-${item.shiftId}-${item.inspectionDate}`;
      edits[k] = { hrs: 8, insp: item.inspectorCount || 1, sup: item.supervisorCount || 0 };
      keys.add(k);
    });
    setShiftEdits(edits);
    setSelectedKeys(keys);
  }, [unregisteredShifts]);

  const handleEditChange = (key, patch) =>
    setShiftEdits(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleToggleSelect = key =>
    setSelectedKeys(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const handleSelectAll = checked => {
    if (checked) setSelectedKeys(new Set(unregisteredShifts.map(i => `${i.campaignId}-${i.shiftId}-${i.inspectionDate}`)));
    else setSelectedKeys(new Set());
  };

  const handleBulkRegister = async () => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = `${storedUser.firstName || ''} ${storedUser.lastName || ''}`.trim() || 'Usuario';
    const toRegister = unregisteredShifts.filter(item => selectedKeys.has(`${item.campaignId}-${item.shiftId}-${item.inspectionDate}`));
    if (!toRegister.length) return;
    setBulkRegistering(true);
    try {
      await Promise.all(toRegister.map(async item => {
        const key = `${item.campaignId}-${item.shiftId}-${item.inspectionDate}`;
        const { hrs, insp, sup } = shiftEdits[key] || { hrs: 8, insp: 1, sup: 0 };
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        await fetch(`${API_URL}/mrb/${item.campaignId}/shift-hours`, {
          method: 'PUT', headers,
          body: JSON.stringify({ shiftId: item.shiftId, inspectionDate: item.inspectionDate, inspectorCount: insp, supervisorCount: sup, hoursWorked: hrs })
        });
        const shiftLabel = item.shiftCode ? `${item.shiftCode} — ${item.shiftName}` : (item.shiftName || 'Sin turno');
        const dateLabel = fmtShiftDate(item.inspectionDate);
        await fetch(`${API_URL}/mrb/${item.campaignId}/comments`, {
          method: 'POST', headers,
          body: JSON.stringify({ comment: `📋 Turno registrado retroactivamente: ${shiftLabel} · ${dateLabel} · ${hrs}h · ${insp} insp · ${sup} sup — registrado por ${userName} desde Lista de Campañas`, commentType: 'note' })
        });
      }));
      const registeredKeys = new Set(toRegister.map(i => `${i.campaignId}-${i.shiftId}-${i.inspectionDate}`));
      setUnregisteredShifts(prev => prev.filter(i => !registeredKeys.has(`${i.campaignId}-${i.shiftId}-${i.inspectionDate}`)));
    } catch (e) { console.error('Error bulk registering shifts:', e); }
    finally { setBulkRegistering(false); }
  };

  const STATUS_CONFIG = {
    BORRADOR: { label: L.draft, color: '#6b7280', icon: FileText },
    ABIERTA: { label: L.open, color: '#C77700', icon: AlertTriangle },
    EN_PROCESO: { label: L.inProcess, color: currentTheme.accent, icon: Clock },
    CANCELADA: { label: L.cancelled, color: '#B00020', icon: XCircle },
    CERRADA: { label: L.closed, color: '#22c55e', icon: CheckCircle }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  // WebSocket: actualizar en tiempo real
  useEffect(() => {
    const events = ['mrb:created', 'mrb:updated', 'mrb:inspection', 'mrb:closed', 'package:created', 'package:received'];
    const unsubscribes = events.map(event => subscribe(event, () => loadData()));
    return () => unsubscribes.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);

      const [mrbsRes, allMrbsRes, unregRes] = await Promise.all([
        fetch(`${API_URL}/mrb?${params.toString()}`, { headers }),
        fetch(`${API_URL}/mrb`, { headers }),
        fetch(`${API_URL}/mrb/unregistered-shifts`, { headers })
      ]);

      const mrbsData = await mrbsRes.json();
      const allMrbsData = await allMrbsRes.json();
      const unregData = await unregRes.json();

      setMrbs(mrbsData.mrbs || mrbsData.campaigns || []);
      setAllMrbs(allMrbsData.mrbs || allMrbsData.campaigns || []);
      setUnregisteredShifts(unregData.unregistered || []);

    } catch (err) {
      console.error('Error loading MRBs:', err);
    } finally {
      setLoading(false);
    }
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

  const handlePeriodChange = (newPeriod) => {
    setPeriodo(newPeriod);
    const { desde, hasta } = getDateRange(newPeriod);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Get unique values for column filters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniqueValues = useMemo(() => ({
    campaignNumber: [...new Set(allMrbs.map(m => m.campaignNumber).filter(Boolean))].sort(),
    sourceType: [...new Set(allMrbs.map(m => m.sourceType).filter(Boolean))].sort(),
    title: [...new Set(allMrbs.map(m => m.title).filter(Boolean))].sort(),
    clientName: [...new Set(allMrbs.map(m => m.clientName).filter(Boolean))].sort(),
    partNumber: [...new Set(allMrbs.map(m => m.partNumber).filter(Boolean))].sort(),
    departmentName: [...new Set(allMrbs.map(m => m.departmentName).filter(Boolean))].sort(),
    severityCode: [...new Set(allMrbs.map(m => m.severityCode || m.severityName).filter(Boolean))].sort(),
    status: Object.keys(STATUS_CONFIG),
    createdAt: [...new Set(allMrbs.map(m => m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-MX') : null).filter(Boolean))].sort(),
    reportedByName: [...new Set(allMrbs.map(m => m.reportedByName).filter(Boolean))].sort()
  }), [allMrbs]);

  // Filtered data
  const filteredMrbs = useMemo(() => {
    return allMrbs.filter(mrb => {
      // Date filter
      if (fechaDesde || fechaHasta) {
        const mrbDate = mrb.createdAt ? new Date(mrb.createdAt).toISOString().split('T')[0] : '';
        if (fechaDesde && mrbDate < fechaDesde) return false;
        if (fechaHasta && mrbDate > fechaHasta) return false;
      }
      // Column filters
      if (colFilters.campaignNumber && mrb.campaignNumber !== colFilters.campaignNumber) return false;
      if (colFilters.sourceType && mrb.sourceType !== colFilters.sourceType) return false;
      if (colFilters.title && mrb.title !== colFilters.title) return false;
      if (colFilters.clientName && mrb.clientName !== colFilters.clientName) return false;
      if (colFilters.partNumber && mrb.partNumber !== colFilters.partNumber) return false;
      if (colFilters.departmentName && mrb.departmentName !== colFilters.departmentName) return false;
      if (colFilters.severityCode && (mrb.severityCode || mrb.severityName) !== colFilters.severityCode) return false;
      if (colFilters.status && mrb.status !== colFilters.status) return false;
      if (colFilters.createdAt) {
        const mrbDateStr = mrb.createdAt ? new Date(mrb.createdAt).toLocaleDateString('es-MX') : '';
        if (mrbDateStr !== colFilters.createdAt) return false;
      }
      if (colFilters.reportedByName && mrb.reportedByName !== colFilters.reportedByName) return false;
      return true;
    });
  }, [allMrbs, fechaDesde, fechaHasta, colFilters]);

  // Alias for filtered data (sin sort)
  const sortedMrbs = filteredMrbs;

  // Status counts from filtered data
  const filteredStatusCounts = useMemo(() => ({
    BORRADOR: filteredMrbs.filter(m => m.status === 'BORRADOR').length,
    ABIERTA: filteredMrbs.filter(m => m.status === 'ABIERTA').length,
    EN_PROCESO: filteredMrbs.filter(m => m.status === 'EN_PROCESO').length,
    CANCELADA: filteredMrbs.filter(m => m.status === 'CANCELADA').length,
    CERRADA: filteredMrbs.filter(m => m.status === 'CERRADA').length
  }), [filteredMrbs]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    setExportingExcel(true);
    try {
      const dataToExport = sortedMrbs.map(m => ({
        'Número': m.campaignNumber || '',
        'Origen': m.sourceType || '',
        'Título': m.title || '',
        'Cliente': m.clientName || '',
        'Parte': m.partNumber || '',
        'Departamento': m.departmentName || '',
        'Severidad': m.severityCode || m.severityName || '',
        'Estado': m.status || '',
        'Fecha Creación': m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-MX') : '',
        'Emitida por': m.reportedByName || ''
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws['!cols'] = [
        { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'MRB Campaigns');
      const fileName = `MRB_Campaigns_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Error al exportar a Excel');
    } finally {
      setExportingExcel(false);
    }
  }, [sortedMrbs]);

  // Clear all filters
  const clearFilters = () => {
    setPeriodo('todos');
    setFechaDesde('');
    setFechaHasta('');
    setColFilters({
      campaignNumber: '', sourceType: '', title: '', clientName: '', partNumber: '',
      departmentName: '', severityCode: '', status: '', createdAt: '', reportedByName: ''
    });
    setFilterStatus('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || filterStatus || Object.values(colFilters).some(v => v);

  // Column filter component - Excel style (sin sort)
  const ColumnFilter = ({ field, label, align = 'left' }) => {
    const isOpen = openDropdown === field;
    const hasFilter = colFilters[field];

    return (
      <th style={{ ...styles.th, position: 'relative', userSelect: 'none', textAlign: align }}>
        <div
          onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : field); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'space-between', gap: '4px', cursor: 'pointer', padding: '2px 0' }}
        >
          <span style={{ color: hasFilter ? currentTheme.accent : currentTheme.textDim }}>{label}</span>
          <ChevronDown
            size={14}
            color={hasFilter ? currentTheme.accent : currentTheme.textDim}
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          />
        </div>

        {isOpen && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, minWidth: '150px', maxHeight: '250px',
              overflowY: 'auto', backgroundColor: currentTheme.bgCard, border: `1px solid ${currentTheme.border}`,
              borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, marginTop: '4px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={() => { setColFilters(prev => ({ ...prev, [field]: '' })); setOpenDropdown(null); }}
              style={{
                padding: '8px 12px', fontSize: '12px', color: currentTheme.textDim, cursor: 'pointer',
                borderBottom: `1px solid ${currentTheme.border}`, backgroundColor: !hasFilter ? currentTheme.bgPanel : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.bgPanel}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !hasFilter ? currentTheme.bgPanel : 'transparent'}
            >
              (Todos)
            </div>
            {uniqueValues[field]?.map(val => (
              <div
                key={val}
                onClick={() => { setColFilters(prev => ({ ...prev, [field]: val })); setOpenDropdown(null); }}
                style={{
                  padding: '8px 12px', fontSize: '12px', color: currentTheme.text, cursor: 'pointer',
                  backgroundColor: colFilters[field] === val ? currentTheme.accent + '20' : 'transparent',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.bgPanel}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colFilters[field] === val ? currentTheme.accent + '20' : 'transparent'}
              >
                {val}
              </div>
            ))}
          </div>
        )}
      </th>
    );
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.ABIERTA;
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

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: currentTheme.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      color: currentTheme.text,
      fontSize: '24px',
      fontWeight: '600',
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
      backgroundColor: currentTheme.accent,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600'
    },
    filters: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px'
    },
    filterSelect: {
      padding: '10px 16px',
      backgroundColor: currentTheme.bgCard,
      border: `1px solid ${currentTheme.border}`,
      borderRadius: '8px',
      color: currentTheme.text,
      fontSize: '14px',
      minWidth: '180px'
    },
    card: {
      backgroundColor: currentTheme.bgCard,
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${currentTheme.border}`
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '14px 16px',
      backgroundColor: currentTheme.bgPanel,
      color: currentTheme.textDim,
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    tr: {
      borderBottom: `1px solid ${currentTheme.border}`,
      cursor: 'pointer',
      transition: 'background-color 0.15s'
    },
    td: {
      padding: '14px 16px',
      color: currentTheme.text,
      fontSize: '14px'
    },
    qarNumber: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: '600',
      color: currentTheme.accent
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
      color: currentTheme.textDim
    },
    viewButton: {
      padding: '6px 12px',
      backgroundColor: currentTheme.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <AlertTriangle size={28} color={currentTheme.accent} />
          Material Review Board (MRB)
        </h1>
        <div style={styles.headerButtons}>
          <button style={{ ...styles.homeButton, backgroundColor: currentTheme.success }} onClick={() => navigate('/mrb-create')}>
            + Nuevo MRB
          </button>
          <button style={styles.homeButton} onClick={() => navigate('/mrb-capture')}>
            Inspección MRB
          </button>
          <button style={{ ...styles.homeButton, backgroundColor: currentTheme.textDim }} onClick={() => navigate('/mrb-dashboard')}>
            <Home size={18} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `2px solid ${currentTheme.border}` }}>
        {[
          { id: 'campaigns', label: L.campaigns, icon: List },
          { id: 'unregistered', label: `${L.unregisteredShifts}${unregisteredShifts.length ? ` (${unregisteredShifts.length})` : ''}`, icon: AlertTriangle, alert: unregisteredShifts.length > 0 }
        ].map(({ id, label, icon: Icon, alert }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === id ? '600' : '500',
            color: alert ? currentTheme.error : activeTab === id ? currentTheme.accent : currentTheme.textDim,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === id ? (alert ? currentTheme.error : currentTheme.accent) : 'transparent'}`,
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'unregistered' && (
        <>
          {unregisteredShifts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: currentTheme.textDim }}>
                {selectedKeys.size} de {unregisteredShifts.length} seleccionado{selectedKeys.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleBulkRegister}
                disabled={bulkRegistering || selectedKeys.size === 0}
                style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600',
                  backgroundColor: bulkRegistering || selectedKeys.size === 0 ? currentTheme.textMuted : currentTheme.accent,
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: bulkRegistering || selectedKeys.size === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {bulkRegistering ? 'Registrando…' : `✓ Registrar seleccionados (${selectedKeys.size})`}
              </button>
            </div>
          )}
          <div style={styles.card}>
            {unregisteredShifts.length === 0 ? (
              <div style={styles.emptyState}>
                <CheckCircle size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p>Todos los turnos están registrados</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${currentTheme.border}` }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '36px' }}>
                      <input type="checkbox"
                        checked={selectedKeys.size === unregisteredShifts.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: currentTheme.accent }} />
                    </th>
                    {[L.date, L.campaign, L.shift, L.hoursWorked, L.resources, L.cost, ''].map(h => (
                      <th key={h} style={{ padding: '10px 8px', textAlign: [L.date, L.campaign, L.shift].includes(h) ? 'left' : 'center', color: currentTheme.textDim, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unregisteredShifts.map(item => {
                    const key = `${item.campaignId}-${item.shiftId}-${item.inspectionDate}`;
                    return (
                      <UnregisteredRow
                        key={key}
                        rowKey={key}
                        item={item}
                        edit={shiftEdits[key] || { hrs: 8, insp: 1, sup: 0 }}
                        selected={selectedKeys.has(key)}
                        t={currentTheme}
                        onEditChange={handleEditChange}
                        onToggleSelect={handleToggleSelect}
                      />
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'campaigns' && <>
      {/* Status Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[
          { key: 'BORRADOR', label: L.drafts, color: '#6b7280', icon: FileText },
          { key: 'ABIERTA', label: L.openItems, color: '#C77700', icon: AlertTriangle },
          { key: 'EN_PROCESO', label: L.inProcessItems, color: currentTheme.accent, icon: Clock },
          { key: 'CANCELADA', label: L.cancelledItems, color: '#B00020', icon: XCircle },
          { key: 'CERRADA', label: L.closedItems, color: '#22c55e', icon: CheckCircle }
        ].map(({ key, label, color, icon: Icon }) => (
          <div
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            style={{
              flex: 1,
              backgroundColor: filterStatus === key ? color : currentTheme.bgPanel,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: `2px solid ${filterStatus === key ? color : 'transparent'}`,
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={20} color={filterStatus === key ? 'white' : color} />
              <span style={{ color: filterStatus === key ? 'white' : currentTheme.textDim, fontSize: '13px' }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: filterStatus === key ? 'white' : currentTheme.text }}>
              {filteredStatusCounts[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Period Filters + Date Range + Excel Export */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: currentTheme.bgCard, padding: '16px 20px', borderRadius: '12px',
        marginBottom: '16px', border: `1px solid ${currentTheme.border}`
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={18} color={currentTheme.textDim} />
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
                padding: '8px 16px', backgroundColor: periodo === key ? currentTheme.accent : currentTheme.bgCard,
                color: periodo === key ? 'white' : currentTheme.text,
                border: `1px solid ${periodo === key ? currentTheme.accent : currentTheme.border}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: currentTheme.textDim }}>Desde:</span>
            <input
              type="date" value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPeriodo(''); }}
              style={{ padding: '8px 12px', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', backgroundColor: currentTheme.bgCard, color: currentTheme.text, fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: currentTheme.textDim }}>Hasta:</span>
            <input
              type="date" value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPeriodo(''); }}
              style={{ padding: '8px 12px', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', backgroundColor: currentTheme.bgCard, color: currentTheme.text, fontSize: '13px' }}
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{
              padding: '8px 14px', backgroundColor: 'transparent', color: currentTheme.error,
              border: `1px solid ${currentTheme.error}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
            }}>
              ✕ Limpiar
            </button>
          )}

          <button onClick={loadData} style={{
            padding: '8px 14px', backgroundColor: currentTheme.bgPanel, color: currentTheme.text,
            border: `1px solid ${currentTheme.border}`, borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
          }}>
            <RefreshCw size={14} />
          </button>

          <button
            onClick={exportToExcel}
            disabled={exportingExcel || sortedMrbs.length === 0}
            style={{
              padding: '8px 16px', backgroundColor: currentTheme.success, color: 'white', border: 'none', borderRadius: '6px',
              cursor: (exportingExcel || sortedMrbs.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (exportingExcel || sortedMrbs.length === 0) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600'
            }}
          >
            <Download size={14} />
            {exportingExcel ? '...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: '12px', fontSize: '13px', color: currentTheme.textDim }}>
        Mostrando <strong style={{ color: currentTheme.text }}>{sortedMrbs.length}</strong> de <strong style={{ color: currentTheme.text }}>{allMrbs.length}</strong> campañas MRB
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.emptyState}>Cargando...</div>
        ) : mrbs.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No hay casos MRB registrados</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <ColumnFilter field="campaignNumber" label="Número" />
                <ColumnFilter field="sourceType" label="Origen" />
                <ColumnFilter field="title" label="Título" />
                <ColumnFilter field="clientName" label="Cliente" />
                <ColumnFilter field="partNumber" label="Parte" />
                <ColumnFilter field="departmentName" label="Depto" />
                <ColumnFilter field="severityCode" label="Sev" align="center" />
                <ColumnFilter field="status" label="Estado" align="center" />
                <ColumnFilter field="createdAt" label="Fecha" />
                <ColumnFilter field="reportedByName" label="Emitida por" />
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedMrbs.map(mrb => {
                const actionConfig = {
                  'BORRADOR': { label: L.complete, color: '#6b7280', icon: FileText },
                  'ABIERTA': { label: L.dispose, color: '#C77700', icon: Send },
                  'EN_PROCESO': { label: L.validate, color: currentTheme.accent, icon: CheckCircle },
                  'CANCELADA': { label: L.view, color: '#B00020', icon: Eye },
                  'CERRADA': { label: L.view, color: '#22c55e', icon: Eye }
                };
                const action = actionConfig[mrb.status] || actionConfig['CERRADA'];
                const ActionIcon = action.icon;

                return (
                  <tr
                    key={mrb.id}
                    style={styles.tr}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = currentTheme.bgHover}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/mrb-campaign/${mrb.id}`)}
                  >
                    <td style={styles.td}>
                      <span style={styles.qarNumber}>{mrb.campaignNumber}</span>
                    </td>
                    <td style={styles.td}>
                      {mrb.sourceType ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: mrb.sourceType === 'QAR' ? `${currentTheme.warning}33` : `${currentTheme.info}33`,
                            color: mrb.sourceType === 'QAR' ? currentTheme.warning : currentTheme.info,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mrb.sourceType === 'QAR' && mrb.sourceQarId) {
                              navigate(`/qar/${mrb.sourceQarId}`);
                            } else if (mrb.sourceType === '8D' && mrb.source8dId) {
                              navigate(`/8d-workflow?reportId=${mrb.source8dId}`);
                            }
                          }}
                          title={`Ver ${mrb.sourceType} origen`}
                        >
                          {mrb.sourceType}: {mrb.sourceFolio || mrb.sourceQarFolio || mrb.source8dFolio || '-'}
                        </span>
                      ) : (
                        <span style={{ color: currentTheme.textDim, fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mrb.title}
                    </td>
                    <td style={styles.td}>{mrb.clientName || '-'}</td>
                    <td style={styles.td}>{mrb.partNumber || '-'}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '12px', color: currentTheme.textDim }}>
                        {mrb.departmentName || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.severity,
                        backgroundColor: mrb.severityColor || currentTheme.textDim,
                        color: 'white'
                      }}>
                        {mrb.severityCode || mrb.severityName || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>{getStatusBadge(mrb.status)}</td>
                    <td style={styles.td}>{formatDate(mrb.createdAt)}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '12px', color: currentTheme.text }}>
                        {mrb.reportedByName || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.viewButton, backgroundColor: action.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/mrb-campaign/${mrb.id}`);
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
        )}
      </div>
      </>}
    </div>
  );
};

export default MRBCampaigns;
