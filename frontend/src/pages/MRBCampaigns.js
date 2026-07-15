import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Home, Send, RefreshCw, FileText, List } from 'lucide-react';

const API_URL_CAMPAIGNS = 'http://localhost:5000';

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
        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: t.accent, marginRight: '6px' }}>{item.campaignNumber}</span>
        <span style={{ color: t.textMuted, fontSize: '11px' }}>{item.title}</span>
      </td>
      <td style={{ padding: '5px 8px', color: t.text, fontSize: '12px' }}>
        {item.shiftCode || '—'} <span style={{ color: t.textMuted, fontSize: '11px' }}>{item.shiftName}</span>
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing
          ? <input type="number" min="0.5" max="24" step="0.5" value={edit.hrs} autoFocus
              onChange={e => onEditChange(rowKey, { hrs: parseFloat(e.target.value) || 0 })}
              style={{ width: '64px', padding: '4px', textAlign: 'center', border: `1px solid ${t.accent}`, borderRadius: '4px', backgroundColor: t.bgPanel, color: t.text, fontSize: '13px', fontWeight: '700' }} />
          : <span style={{ fontWeight: '700', color: t.text }}>{edit.hrs} hrs</span>
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
      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', color: '#C77700', fontSize: '12px' }}>
        ${cost.toFixed(2)}
      </td>
      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
        {editing ? (
          <button onClick={() => setEditing(false)}
            style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
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
  const { t: tr, language, changeLanguage } = useLanguage();
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
  const [filterClient, setFilterClient] = useState(savedFilters.client || '');
  const [clients, setClients] = useState([]);
  const [unregisteredShifts, setUnregisteredShifts] = useState([]);
  const [shiftEdits, setShiftEdits] = useState({});
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [bulkRegistering, setBulkRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState(savedFilters.tab || 'campaigns');
  const [sortField, setSortField] = useState(savedFilters.sortField || 'campaignNumber');
  const [sortDir, setSortDir] = useState(savedFilters.sortDir || 'asc');

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('mrbCampaignsFilters', JSON.stringify({
      status: filterStatus,
      client: filterClient,
      tab: activeTab,
      sortField,
      sortDir
    }));
  }, [filterStatus, filterClient, activeTab, sortField, sortDir]);

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
  }, [filterStatus, filterClient]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterClient) params.set('clientId', filterClient);

      const [mrbsRes, allMrbsRes, clientsRes, unregRes] = await Promise.all([
        fetch(`${API_URL}/mrb?${params.toString()}`, { headers }),
        fetch(`${API_URL}/mrb`, { headers }),
        fetch(`${API_URL}/clients/list`, { headers }),
        fetch(`${API_URL}/mrb/unregistered-shifts`, { headers })
      ]);

      const mrbsData = await mrbsRes.json();
      const allMrbsData = await allMrbsRes.json();
      const clientsData = await clientsRes.json();
      const unregData = await unregRes.json();

      setMrbs(mrbsData.mrbs || mrbsData.campaigns || []);
      setAllMrbs(allMrbsData.mrbs || allMrbsData.campaigns || []);
      setClients(clientsData.clients || []);
      setUnregisteredShifts(unregData.unregistered || []);

    } catch (err) {
      console.error('Error loading MRBs:', err);
    } finally {
      setLoading(false);
    }
  };


  // Count MRBs by status
  const statusCounts = {
    BORRADOR: allMrbs.filter(m => m.status === 'BORRADOR').length,
    ABIERTA: allMrbs.filter(m => m.status === 'ABIERTA').length,
    EN_PROCESO: allMrbs.filter(m => m.status === 'EN_PROCESO').length,
    CANCELADA: allMrbs.filter(m => m.status === 'CANCELADA').length,
    CERRADA: allMrbs.filter(m => m.status === 'CERRADA').length
  };

  const SORT_FIELDS = {
    campaignNumber: m => m.campaignNumber || '',
    sourceType:     m => m.sourceType || '',
    title:          m => m.title || '',
    clientName:     m => m.clientName || '',
    partNumber:     m => m.partNumber || '',
    departmentName: m => m.departmentName || '',
    severityCode:   m => m.severityCode || m.severityName || '',
    status:         m => m.status || '',
    createdAt:      m => m.createdAt || '',
    reportedByName: m => m.reportedByName || ''
  };

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedMrbs = [...mrbs].sort((a, b) => {
    const fn = SORT_FIELDS[sortField] || (m => '');
    const av = fn(a).toLowerCase(), bv = fn(b).toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const SortTh = ({ field, label, align = 'left' }) => {
    const active = sortField === field;
    return (
      <th onClick={() => handleSort(field)} style={{
        ...styles.th, textAlign: align, cursor: 'pointer', userSelect: 'none',
        color: active ? currentTheme.accent : currentTheme.textDim,
        whiteSpace: 'nowrap'
      }}>
        {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : <span style={{ opacity: 0.3 }}>⇅</span>}
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
      fontFamily: 'monospace',
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
          <AlertTriangle size={28} color="#7c3aed" />
          Material Review Board (MRB)
        </h1>
        <div style={styles.headerButtons}>
          <button style={{ ...styles.homeButton, backgroundColor: '#2E7D32' }} onClick={() => navigate('/mrb-create')}>
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
            fontWeight: activeTab === id ? '700' : '500',
            color: alert ? '#ef4444' : activeTab === id ? currentTheme.accent : currentTheme.textDim,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === id ? (alert ? '#ef4444' : currentTheme.accent) : 'transparent'}`,
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
                  padding: '9px 20px', fontSize: '13px', fontWeight: '700',
                  backgroundColor: bulkRegistering || selectedKeys.size === 0 ? '#6b7280' : '#7c3aed',
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
                      <th key={h} style={{ padding: '10px 8px', textAlign: [L.date, L.campaign, L.shift].includes(h) ? 'left' : 'center', color: currentTheme.textDim, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
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
              backgroundColor: filterStatus === key ? color : '#374151',
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
            <div style={{ fontSize: '28px', fontWeight: '700', color: filterStatus === key ? 'white' : '#F4F6F8' }}>
              {statusCounts[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        <select
          style={styles.filterSelect}
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">Todos los clientes</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          style={{ ...styles.filterSelect, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={loadData}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
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
                <SortTh field="campaignNumber" label="Número" />
                <SortTh field="sourceType"     label="Origen" />
                <SortTh field="title"          label="Título" />
                <SortTh field="clientName"     label="Cliente" />
                <SortTh field="partNumber"     label="Parte" />
                <SortTh field="departmentName" label="Depto" />
                <SortTh field="severityCode"   label="Sev" align="center" />
                <SortTh field="status"         label="Estado" align="center" />
                <SortTh field="createdAt"      label="Fecha" />
                <SortTh field="reportedByName" label="Emitida por" />
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
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
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
                            backgroundColor: mrb.sourceType === 'QAR' ? '#C7770033' : '#0072CE33',
                            color: mrb.sourceType === 'QAR' ? '#C77700' : currentTheme.accent,
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
