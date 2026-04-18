import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Home, Send, RefreshCw, FileText } from 'lucide-react';

const MRBCampaigns = () => {
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();
  const API_URL = 'http://localhost:5000';

  const [mrbs, setMrbs] = useState([]);
  const [allMrbs, setAllMrbs] = useState([]); // For counting
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clients, setClients] = useState([]);

  const STATUS_CONFIG = {
    BORRADOR: { label: 'Borrador', color: '#6b7280', icon: FileText },
    ABIERTA: { label: 'Abierto', color: '#C77700', icon: AlertTriangle },
    EN_PROCESO: { label: 'En Proceso', color: currentTheme.accent, icon: Clock },
    CANCELADA: { label: 'Cancelado', color: '#B00020', icon: XCircle },
    CERRADA: { label: 'Cerrado', color: '#22c55e', icon: CheckCircle }
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

      const [mrbsRes, allMrbsRes, clientsRes] = await Promise.all([
        fetch(`${API_URL}/mrb?${params.toString()}`, { headers }),
        fetch(`${API_URL}/mrb`, { headers }), // All for counting
        fetch(`${API_URL}/clients/list`, { headers })
      ]);

      const mrbsData = await mrbsRes.json();
      const allMrbsData = await allMrbsRes.json();
      const clientsData = await clientsRes.json();

      setMrbs(mrbsData.mrbs || mrbsData.campaigns || []);
      setAllMrbs(allMrbsData.mrbs || allMrbsData.campaigns || []);
      setClients(clientsData.clients || []);

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

      {/* Status Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[
          { key: 'BORRADOR', label: 'Borradores', color: '#6b7280', icon: FileText },
          { key: 'ABIERTA', label: 'Abiertos', color: '#C77700', icon: AlertTriangle },
          { key: 'EN_PROCESO', label: 'En Proceso', color: currentTheme.accent, icon: Clock },
          { key: 'CANCELADA', label: 'Cancelados', color: '#B00020', icon: XCircle },
          { key: 'CERRADA', label: 'Cerrados', color: '#22c55e', icon: CheckCircle }
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
                <th style={styles.th}>Número</th>
                <th style={styles.th}>Origen</th>
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
              {mrbs.map(mrb => {
                const actionConfig = {
                  'BORRADOR': { label: 'Completar', color: '#6b7280', icon: FileText },
                  'ABIERTA': { label: 'Disponer', color: '#C77700', icon: Send },
                  'EN_PROCESO': { label: 'Validar', color: currentTheme.accent, icon: CheckCircle },
                  'CANCELADA': { label: 'Ver', color: '#B00020', icon: Eye },
                  'CERRADA': { label: 'Ver', color: '#22c55e', icon: Eye }
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
    </div>
  );
};

export default MRBCampaigns;
