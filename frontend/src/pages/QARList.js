import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Home, Send, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const QARList = () => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const API_URL = 'http://localhost:5000';

  const [qars, setQars] = useState([]);
  const [allQars, setAllQars] = useState([]); // For counting
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clients, setClients] = useState([]);

  const STATUS_CONFIG = {
    EMITIDO: { label: 'Emitido', color: t.warning, icon: AlertTriangle },
    RESPONDIDO: { label: 'Respondido', color: t.accent, icon: Clock },
    RECHAZADO: { label: 'Rechazado', color: t.error, icon: XCircle },
    CERRADO: { label: 'Cerrado', color: t.success, icon: CheckCircle }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterClient]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Build query params
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterClient) params.set('clientId', filterClient);

      const [qarsRes, allQarsRes, clientsRes] = await Promise.all([
        fetch(`${API_URL}/qar?${params.toString()}`, { headers }),
        fetch(`${API_URL}/qar`, { headers }), // All for counting
        fetch(`${API_URL}/clients/list`, { headers })
      ]);

      const qarsData = await qarsRes.json();
      const allQarsData = await allQarsRes.json();
      const clientsData = await clientsRes.json();

      setQars(qarsData.qars || []);
      setAllQars(allQarsData.qars || []);
      setClients(clientsData.clients || []);

    } catch (err) {
      console.error('Error loading QARs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Count QARs by status
  const statusCounts = {
    EMITIDO: allQars.filter(q => q.status === 'EMITIDO').length,
    RESPONDIDO: allQars.filter(q => q.status === 'RESPONDIDO').length,
    RECHAZADO: allQars.filter(q => q.status === 'RECHAZADO').length,
    CERRADO: allQars.filter(q => q.status === 'CERRADO').length
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
    filters: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px'
    },
    filterSelect: {
      padding: '10px 16px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '14px',
      minWidth: '180px'
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
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    tr: {
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer',
      transition: 'background-color 0.15s'
    },
    td: {
      padding: '14px 16px',
      color: t.text,
      fontSize: '14px'
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
          <button style={{ ...styles.homeButton, backgroundColor: t.success }} onClick={() => navigate('/qar-create')}>
            + Nuevo QAR
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
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            style={{
              flex: 1,
              backgroundColor: filterStatus === key ? color : t.bgCard,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: `2px solid ${filterStatus === key ? color : t.border}`,
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={20} color={filterStatus === key ? 'white' : color} />
              <span style={{ color: filterStatus === key ? 'white' : t.textMuted, fontSize: '13px' }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: filterStatus === key ? 'white' : t.text }}>
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
        ) : qars.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No hay QARs registrados</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Título</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Parte</th>
                <th style={styles.th}>Depto</th>
                <th style={styles.th}>Sev</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {qars.map(qar => {
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
        )}
      </div>
    </div>
  );
};

export default QARList;
