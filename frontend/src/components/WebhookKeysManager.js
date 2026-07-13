import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

const WebhookKeysManager = ({ theme: t }) => {
  const token = localStorage.getItem('token');

  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' | 'logs'

  // Form state
  const [form, setForm] = useState({
    systemName: '',
    description: '',
    permissions: ['production:write', 'production:read'],
    allowedIps: '',
    rateLimitPerMinute: 100
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/webhook/admin/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
      }
    } catch (err) {
      setError('Error cargando API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/webhook/admin/logs?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      setError('Error cargando logs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        systemName: form.systemName,
        description: form.description || null,
        permissions: form.permissions,
        rateLimitPerMinute: parseInt(form.rateLimitPerMinute) || 100
      };

      if (form.allowedIps.trim()) {
        payload.allowedIps = form.allowedIps.split(',').map(ip => ip.trim());
      }

      const res = await fetch(`${API_URL}/webhook/admin/keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setNewKeyData(data);
        setShowCreateModal(false);
        setShowKeyModal(true);
        setForm({
          systemName: '',
          description: '',
          permissions: ['production:write', 'production:read'],
          allowedIps: '',
          rateLimitPerMinute: 100
        });
        fetchKeys();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error creando API key');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (key) => {
    try {
      const res = await fetch(`${API_URL}/webhook/admin/keys/${key.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !key.isActive })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Key ${key.isActive ? 'desactivada' : 'activada'}`);
        fetchKeys();
      }
    } catch (err) {
      setError('Error actualizando key');
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`¿Eliminar API key de "${key.systemName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/webhook/admin/keys/${key.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('API key eliminada');
        fetchKeys();
      }
    } catch (err) {
      setError('Error eliminando key');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copiado al portapapeles');
  };

  const styles = {
    container: { padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: 'bold', color: t.text },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: {
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      backgroundColor: t.bgPanel,
      color: t.textSecondary,
      border: 'none',
      fontSize: '14px'
    },
    tabActive: { backgroundColor: t.primary, color: '#fff' },
    card: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: `1px solid ${t.border}`
    },
    keyCard: {
      backgroundColor: t.bgContent,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      border: `1px solid ${t.border}`
    },
    btn: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    btnPrimary: { backgroundColor: t.primary, color: '#fff' },
    btnSecondary: { backgroundColor: t.bgContent, color: t.text, border: `1px solid ${t.border}` },
    btnDanger: { backgroundColor: '#ef4444', color: '#fff' },
    btnSmall: { padding: '4px 8px', fontSize: '12px' },
    badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
    alert: { padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
    alertSuccess: { backgroundColor: '#dcfce7', color: '#166534' },
    alertError: { backgroundColor: '#fee2e2', color: '#991b1b' },
    modal: {
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
    },
    modalContent: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '24px',
      minWidth: '450px',
      maxWidth: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: t.textSecondary },
    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgContent,
      color: t.text,
      fontSize: '14px'
    },
    textarea: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgContent,
      color: t.text,
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical'
    },
    checkbox: { marginRight: '8px' },
    apiKeyBox: {
      backgroundColor: '#1e293b',
      color: '#22c55e',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '13px',
      wordBreak: 'break-all',
      marginBottom: '16px'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, color: t.textSecondary, fontSize: '12px' },
    td: { padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: '13px' }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>API Keys para Webhooks</h2>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => setShowCreateModal(true)}
        >
          + Nueva API Key
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          {success}
          <button onClick={() => setSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'keys' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('keys')}
        >
          API Keys ({keys.length})
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'logs' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <div>
          {keys.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', color: t.textSecondary }}>
              No hay API keys configuradas. Crea una para integrar sistemas externos.
            </div>
          ) : (
            keys.map(key => (
              <div key={key.id} style={styles.keyCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: t.text }}>
                      {key.systemName}
                      <span style={{
                        ...styles.badge,
                        marginLeft: '8px',
                        backgroundColor: key.isActive ? '#dcfce7' : '#fee2e2',
                        color: key.isActive ? '#166534' : '#991b1b'
                      }}>
                        {key.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {key.description && (
                      <div style={{ color: t.textSecondary, fontSize: '13px', marginTop: '4px' }}>
                        {key.description}
                      </div>
                    )}
                    <div style={{ marginTop: '12px', fontSize: '12px', color: t.textSecondary }}>
                      <code style={{ backgroundColor: t.bgPanel, padding: '2px 6px', borderRadius: '4px' }}>
                        {key.apiKeyPrefix}...
                      </code>
                      <span style={{ marginLeft: '16px' }}>
                        Usos: {key.usageCount || 0}
                      </span>
                      {key.lastUsedAt && (
                        <span style={{ marginLeft: '16px' }}>
                          Último uso: {formatDate(key.lastUsedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                      onClick={() => handleToggleActive(key)}
                    >
                      {key.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(key)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div style={styles.card}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: t.textSecondary, padding: '40px' }}>
              No hay logs de llamadas
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Sistema</th>
                  <th style={styles.th}>Endpoint</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Registros</th>
                  <th style={styles.th}>Duración</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={styles.td}>{formatDate(log.receivedAt)}</td>
                    <td style={styles.td}>{log.systemName || '-'}</td>
                    <td style={styles.td}>
                      <code style={{ fontSize: '11px' }}>{log.endpoint}</code>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: log.success ? '#dcfce7' : '#fee2e2',
                        color: log.success ? '#166534' : '#991b1b'
                      }}>
                        {log.responseStatus}
                      </span>
                    </td>
                    <td style={styles.td}>{log.recordsProcessed || 0}</td>
                    <td style={styles.td}>{log.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: t.text, marginBottom: '20px' }}>Crear API Key</h3>
            <form onSubmit={handleCreate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre del Sistema *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={form.systemName}
                  onChange={e => setForm({ ...form, systemName: e.target.value })}
                  placeholder="Ej: SAP, MES_LINEA_1, EPICOR"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <textarea
                  style={styles.textarea}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción opcional del sistema..."
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>IPs Permitidas (separadas por coma)</label>
                <input
                  style={styles.input}
                  type="text"
                  value={form.allowedIps}
                  onChange={e => setForm({ ...form, allowedIps: e.target.value })}
                  placeholder="Dejar vacío para permitir todas"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Rate Limit (requests/min)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={form.rateLimitPerMinute}
                  onChange={e => setForm({ ...form, rateLimitPerMinute: e.target.value })}
                  min="1"
                  max="1000"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show Key Modal */}
      {showKeyModal && newKeyData && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{ color: t.text, marginBottom: '20px' }}>API Key Creada</h3>

            <div style={{ ...styles.alert, backgroundColor: '#fef3c7', color: '#92400e', marginBottom: '20px' }}>
              <strong>⚠️ Importante:</strong> Copia esta API Key ahora. No podrás verla de nuevo.
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>API Key</label>
              <div style={styles.apiKeyBox}>
                {newKeyData.apiKey}
              </div>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => copyToClipboard(newKeyData.apiKey)}
              >
                Copiar al Portapapeles
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: t.bgContent, borderRadius: '8px' }}>
              <p style={{ color: t.textSecondary, fontSize: '13px', margin: 0 }}>
                <strong>Uso:</strong> Incluir en header de requests:
              </p>
              <code style={{ fontSize: '12px', color: t.text }}>
                X-API-Key: {newKeyData.apiKey}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => {
                  setShowKeyModal(false);
                  setNewKeyData(null);
                }}
              >
                Entendido, ya la copié
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookKeysManager;
