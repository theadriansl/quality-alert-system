import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WebhookKeysManager from './WebhookKeysManager';
import { checkMyHospitalPermissions } from '../services/hospitalRolesService';

const API_URL = 'http://localhost:5000';

const ProductionTab = ({ theme: t }) => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Permisos
  const [canUpload, setCanUpload] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Data
  const [entries, setEntries] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [parts, setParts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [unmatchedParts, setUnmatchedParts] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    partId: '',
    status: '',
    workOrder: '',
    dateFrom: '',
    dateTo: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  // Sorting for list view
  const [sortField, setSortField] = useState('producedAt');
  const [sortDir, setSortDir] = useState('desc');

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeView, setActiveView] = useState('coverage'); // 'coverage' | 'list' | 'import' | 'unmatched'

  // Import
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [manualEntry, setManualEntry] = useState({
    serialNumber: '',
    partId: '',
    partNumberRaw: '',
    lotNumber: '',
    workOrder: '',
    producedAt: ''
  });

  // Preview modal para CSV
  const [previewModal, setPreviewModal] = useState({
    open: false,
    file: null,
    preview: null
  });
  const [dragOver, setDragOver] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const result = await checkMyHospitalPermissions();
        if (result.success && result.data) {
          setCanUpload(result.data.canUploadProduction || result.data.isSystemAdmin || result.data.isHospitalAdmin);
        }
      } catch (err) {
        console.error('Error checking production permissions:', err);
        setCanUpload(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };
    checkPermissions();
  }, []);

  // Fetch parts on mount
  useEffect(() => {
    fetchParts();
    fetchShifts();
    fetchUnmatchedParts();
  }, []);

  // Fetch data when view or filters change
  useEffect(() => {
    if (activeView === 'coverage') {
      fetchCoverage();
    } else if (activeView === 'list') {
      fetchEntries();
    } else if (activeView === 'unmatched') {
      fetchUnmatchedParts();
    }
  }, [activeView, filters, pagination.page]);

  const fetchParts = async () => {
    try {
      const res = await fetch(`${API_URL}/clients/parts/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setParts(data.parts || []);
      }
    } catch (err) {
      console.error('Error fetching parts:', err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_URL}/inspection-catalogs/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error('Error fetching shifts:', err);
    }
  };

  const fetchUnmatchedParts = async () => {
    try {
      const res = await fetch(`${API_URL}/production/unmatched-parts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUnmatchedParts(data.unmatchedParts || []);
      }
    } catch (err) {
      console.error('Error fetching unmatched parts:', err);
    }
  };

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.partId) params.append('partId', filters.partId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.workOrder) params.append('workOrder', filters.workOrder);

      const res = await fetch(`${API_URL}/production/coverage?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCoverage(data.coverage);
      }
    } catch (err) {
      setError('Error cargando cobertura');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });
      if (filters.partId) params.append('partId', filters.partId);
      if (filters.status) params.append('status', filters.status);
      if (filters.workOrder) params.append('workOrder', filters.workOrder);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const res = await fetch(`${API_URL}/production/entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      setError('Error cargando entradas');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_URL}/production/template`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error descargando template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'production_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error descargando template: ' + err.message);
    }
  };

  // Paso 1: Preview del CSV (detecta duplicados)
  const handleCSVUpload = async (e) => {
    if (!canUpload) {
      setError('No tienes permiso para subir datos de producción');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (manualEntry.partId) {
        formData.append('defaultPartId', manualEntry.partId);
      }

      const res = await fetch(`${API_URL}/production/import/csv/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        // Mostrar modal de preview
        setPreviewModal({
          open: true,
          file: file,
          preview: data.preview
        });
      } else {
        setError(data.error || 'Error analizando CSV');
      }
    } catch (err) {
      setError('Error analizando archivo');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      // Simular evento de input file
      handleCSVUpload({ target: { files: [file], value: '' } });
    } else {
      setError('Solo se permiten archivos CSV');
    }
  };

  // Paso 2: Confirmar importación
  const handleConfirmImport = async () => {
    if (!canUpload) {
      setError('No tienes permiso para subir datos de producción');
      return;
    }
    if (!previewModal.file) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', previewModal.file);
      if (manualEntry.partId) {
        formData.append('defaultPartId', manualEntry.partId);
      }

      const res = await fetch(`${API_URL}/production/import/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setImportResults(data.results);
        let msg = `Importados: ${data.results.inserted}`;
        if (data.results.duplicates) {
          msg += `, Omitidos (duplicados): ${data.results.duplicates}`;
        }
        setSuccess(msg);
        fetchCoverage();
        fetchUnmatchedParts();
        setPreviewModal({ open: false, file: null, preview: null });
      } else {
        setError(data.error || 'Error importando CSV');
      }
    } catch (err) {
      setError('Error importando archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualEntry.serialNumber) {
      setError('Serial es requerido');
      return;
    }
    if (!manualEntry.partId && !manualEntry.partNumberRaw) {
      setError('Seleccione una parte o ingrese un número de parte');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/production/entries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serialNumber: manualEntry.serialNumber,
          partId: manualEntry.partId || null,
          partNumberRaw: manualEntry.partNumberRaw || null,
          lotNumber: manualEntry.lotNumber,
          workOrder: manualEntry.workOrder,
          source: 'MANUAL',
          producedAt: manualEntry.producedAt || new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        let msg = 'Entrada registrada';
        if (data.warning) {
          msg += ` - ${data.warning}`;
        }
        setSuccess(msg);
        setManualEntry({
          serialNumber: '',
          partId: manualEntry.partId,
          partNumberRaw: '',
          lotNumber: '',
          workOrder: '',
          producedAt: ''
        });
        fetchCoverage();
        if (data.warning) {
          fetchUnmatchedParts();
        }
      } else {
        setError(data.error || 'Error registrando entrada');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };


  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sort entries
  const sortedEntries = [...entries].sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'serialNumber':
        valA = (a.serialNumber || '').toLowerCase();
        valB = (b.serialNumber || '').toLowerCase();
        break;
      case 'partNumber':
        valA = (a.partNumber || a.partNumberRaw || '').toLowerCase();
        valB = (b.partNumber || b.partNumberRaw || '').toLowerCase();
        break;
      case 'lotNumber':
        valA = (a.lotNumber || '').toLowerCase();
        valB = (b.lotNumber || '').toLowerCase();
        break;
      case 'workOrder':
        valA = (a.workOrder || '').toLowerCase();
        valB = (b.workOrder || '').toLowerCase();
        break;
      case 'producedAt':
        valA = new Date(a.producedAt || 0).getTime();
        valB = new Date(b.producedAt || 0).getTime();
        break;
      case 'inspectionStatus':
        valA = (a.inspectionStatus || '').toLowerCase();
        valB = (b.inspectionStatus || '').toLowerCase();
        break;
      case 'source':
        valA = (a.source || '').toLowerCase();
        valB = (b.source || '').toLowerCase();
        break;
      default:
        valA = '';
        valB = '';
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const getCoverageColor = (percent) => {
    if (percent >= 95) return '#22c55e';
    if (percent >= 80) return '#eab308';
    return '#ef4444';
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

  // Styles
  const styles = {
    container: { padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '24px', fontWeight: '600', color: t.text },
    tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    tab: {
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      backgroundColor: t.bgPanel,
      color: t.textSecondary,
      border: 'none',
      fontSize: '14px',
      transition: 'all 0.2s',
      position: 'relative'
    },
    tabActive: { backgroundColor: t.primary, color: '#fff' },
    tabBadge: {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      backgroundColor: '#ef4444',
      color: '#fff',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      fontSize: '11px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600'
    },
    card: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      border: `1px solid ${t.border}`
    },
    warningCard: {
      backgroundColor: '#fef3c7',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px',
      border: '1px solid #fcd34d',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' },
    statCard: {
      backgroundColor: t.bgContent,
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center'
    },
    statValue: { fontSize: '32px', fontWeight: '600', color: t.text },
    statLabel: { fontSize: '14px', color: t.textSecondary, marginTop: '4px' },
    progressBar: {
      height: '8px',
      backgroundColor: t.bgContent,
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', textAlign: 'left', borderBottom: `2px solid ${t.border}`, color: t.textSecondary, fontSize: '12px', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text },
    badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
    filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
    input: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgContent,
      color: t.text,
      fontSize: '14px'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      backgroundColor: t.bgContent,
      color: t.text,
      fontSize: '14px',
      minWidth: '150px'
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
    btnWarning: { backgroundColor: '#f59e0b', color: '#fff' },
    btnDanger: { backgroundColor: '#ef4444', color: '#fff' },
    uploadZone: {
      border: `2px dashed ${t.border}`,
      borderRadius: '12px',
      padding: '40px',
      textAlign: 'center',
      backgroundColor: t.bgContent,
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    alert: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    alertSuccess: { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    alertError: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
    alertWarning: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '12px', fontWeight: '500', color: t.textSecondary },
    pendingList: { maxHeight: '300px', overflowY: 'auto' },
    pendingItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: t.bgContent,
      borderRadius: '6px',
      marginBottom: '4px'
    },
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
      minWidth: '400px',
      maxWidth: '90%'
    },
    unmatchedCard: {
      backgroundColor: t.bgContent,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      border: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Control de Producción</h1>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeView === 'coverage' ? styles.tabActive : {}) }}
            onClick={() => setActiveView('coverage')}
          >
            Cobertura
          </button>
          <button
            style={{ ...styles.tab, ...(activeView === 'list' ? styles.tabActive : {}) }}
            onClick={() => setActiveView('list')}
          >
            Lista
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeView === 'import' ? styles.tabActive : {}),
              ...(canUpload ? {} : { opacity: 0.5, cursor: 'not-allowed' })
            }}
            onClick={() => canUpload && setActiveView('import')}
            disabled={!canUpload}
            title={!canUpload ? 'No tienes permiso para subir datos de producción' : ''}
          >
            Importar {!canUpload && '🔒'}
          </button>
          <button
            style={{ ...styles.tab, ...(activeView === 'unmatched' ? styles.tabActive : {}) }}
            onClick={() => setActiveView('unmatched')}
          >
            Sin Configurar
            {unmatchedParts.length > 0 && (
              <span style={styles.tabBadge}>{unmatchedParts.length}</span>
            )}
          </button>
          <button
            style={{ ...styles.tab, ...(activeView === 'apikeys' ? styles.tabActive : {}) }}
            onClick={() => setActiveView('apikeys')}
          >
            API Keys
          </button>
        </div>
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

      {/* Warning banner for unmatched parts */}
      {unmatchedParts.length > 0 && activeView !== 'unmatched' && (
        <div style={styles.warningCard}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#92400e' }}>
              {unmatchedParts.length} número(s) de parte sin configurar, afectando a {unmatchedParts.reduce((sum, p) => sum + p.entryCount, 0)} entrada(s)
            </strong>
            <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '14px' }}>
              Estas entradas no pueden vincularse porque sus partes no existen en el sistema.
            </p>
          </div>
          <button
            style={{ ...styles.btn, ...styles.btnWarning }}
            onClick={() => setActiveView('unmatched')}
          >
            Configurar
          </button>
        </div>
      )}

      {/* Filters (except for unmatched view) */}
      {activeView !== 'unmatched' && (
        <div style={styles.card}>
          <div style={styles.filterRow}>
            <select
              style={styles.select}
              value={filters.partId}
              onChange={(e) => setFilters({ ...filters, partId: e.target.value })}
            >
              <option value="">Todas las partes</option>
              {parts.map(p => (
                <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>
              ))}
            </select>
            {activeView === 'list' && (
              <select
                style={styles.select}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="INSPECTED">Inspeccionado</option>
                <option value="PARTIAL">Parcial</option>
                <option value="SKIPPED">Omitido</option>
              </select>
            )}
            <input
              style={styles.input}
              type="text"
              placeholder="Orden de trabajo..."
              value={filters.workOrder}
              onChange={(e) => setFilters({ ...filters, workOrder: e.target.value })}
            />
            <input
              style={styles.input}
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
            <input
              style={styles.input}
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => setFilters({ partId: '', status: '', workOrder: '', dateFrom: '', dateTo: '' })}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Coverage View */}
      {activeView === 'coverage' && coverage && (
        <>
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{coverage.totalProduced}</div>
              <div style={styles.statLabel}>Total Producido</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#22c55e' }}>{coverage.totalInspected}</div>
              <div style={styles.statLabel}>Inspeccionados</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#eab308' }}>{coverage.pending}</div>
              <div style={styles.statLabel}>Pendientes</div>
            </div>
            {/* Desglose por estado de unit_registry */}
            {coverage.totalOk > 0 && (
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: '#22c55e' }}>{coverage.totalOk}</div>
                <div style={styles.statLabel}>OK</div>
              </div>
            )}
            {coverage.totalDefective > 0 && (
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: '#ef4444' }}>{coverage.totalDefective}</div>
                <div style={styles.statLabel}>Con Defectos</div>
              </div>
            )}
            {coverage.totalScrapped > 0 && (
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: '#6b7280' }}>{coverage.totalScrapped}</div>
                <div style={styles.statLabel}>Scrap</div>
              </div>
            )}
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: getCoverageColor(coverage.coveragePercent) }}>
                {coverage.coveragePercent}%
              </div>
              <div style={styles.statLabel}>Cobertura</div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${coverage.coveragePercent}%`,
                    backgroundColor: getCoverageColor(coverage.coveragePercent)
                  }}
                />
              </div>
            </div>
            {coverage.unmatchedCount > 0 && (
              <div style={{ ...styles.statCard, border: '2px solid #f59e0b' }}>
                <div style={{ ...styles.statValue, color: '#f59e0b' }}>{coverage.unmatchedCount}</div>
                <div style={styles.statLabel}>Sin Configurar</div>
              </div>
            )}
          </div>

          {/* By Part */}
          {coverage.byPart && coverage.byPart.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ color: t.text, marginBottom: '16px' }}>Cobertura por Parte</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Parte</th>
                    <th style={styles.th}>Producidos</th>
                    <th style={styles.th}>Inspeccionados</th>
                    <th style={styles.th}>Pendientes</th>
                    <th style={styles.th}>Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.byPart.map((row, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <strong>{row.partNumber}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: t.textSecondary }}>{row.partName}</span>
                      </td>
                      <td style={styles.td}>{row.produced}</td>
                      <td style={styles.td}>{row.inspected}</td>
                      <td style={styles.td}>{row.pending}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: getCoverageColor(row.coveragePercent) + '20',
                          color: getCoverageColor(row.coveragePercent)
                        }}>
                          {row.coveragePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pending Serials */}
          {coverage.pendingSerials && coverage.pendingSerials.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ color: t.text, marginBottom: '16px' }}>
                Seriales Pendientes (más antiguos)
              </h3>
              <div style={styles.pendingList}>
                {coverage.pendingSerials.map((item, i) => (
                  <div key={i} style={styles.pendingItem}>
                    <div>
                      <strong style={{ color: t.text }}>{item.serialNumber}</strong>
                      <span style={{ color: t.textSecondary, marginLeft: '8px' }}>{item.partNumber}</span>
                    </div>
                    <span style={{ color: t.textSecondary, fontSize: '12px' }}>
                      {formatDate(item.producedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* List View */}
      {activeView === 'list' && (
        <div style={styles.card}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>
              Cargando...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>
              No hay entradas de producción
            </div>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      { field: 'serialNumber', label: 'Serial' },
                      { field: 'partNumber', label: 'Parte' },
                      { field: 'lotNumber', label: 'Lote' },
                      { field: 'workOrder', label: 'Orden' },
                      { field: 'producedAt', label: 'Producido' },
                      { field: 'inspectionStatus', label: 'Estado' },
                      { field: 'source', label: 'Fuente' }
                    ].map(col => (
                      <th
                        key={col.field}
                        style={{ ...styles.th, cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort(col.field)}
                      >
                        {col.label} {sortField === col.field && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map(entry => (
                    <tr key={entry.id}>
                      <td style={styles.td}><strong>{entry.serialNumber}</strong></td>
                      <td style={styles.td}>
                        {entry.partNumber || (
                          <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                            {entry.partNumberRaw || 'Sin parte'}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{entry.lotNumber || '-'}</td>
                      <td style={styles.td}>{entry.workOrder || '-'}</td>
                      <td style={styles.td}>{formatDate(entry.producedAt)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor:
                            entry.unitStatus === 'OK' ? '#dcfce7' :
                            entry.unitStatus === 'DEFECTIVE' ? '#fee2e2' :
                            entry.unitStatus === 'SCRAPPED' ? '#e5e7eb' :
                            entry.unitId ? '#dbeafe' : '#fef3c7',
                          color:
                            entry.unitStatus === 'OK' ? '#166534' :
                            entry.unitStatus === 'DEFECTIVE' ? '#991b1b' :
                            entry.unitStatus === 'SCRAPPED' ? '#6b7280' :
                            entry.unitId ? '#1e40af' : '#92400e'
                        }}>
                          {entry.unitStatus || (entry.unitId ? 'REGISTRADO' : 'PENDIENTE')}
                        </span>
                        {entry.partStatus === 'UNMATCHED' && (
                          <span style={{ ...styles.badge, backgroundColor: '#fee2e2', color: '#991b1b', marginLeft: '4px' }}>
                            SIN CONFIG
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: t.bgContent, color: t.textSecondary }}>
                          {entry.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ color: t.textSecondary, fontSize: '14px' }}>
                  Mostrando {entries.length} de {pagination.total}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  >
                    Anterior
                  </button>
                  <span style={{ padding: '8px', color: t.text }}>
                    {pagination.page} / {pagination.pages || 1}
                  </span>
                  <button
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    disabled={pagination.page >= (pagination.pages || 1)}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Import View */}
      {activeView === 'import' && (
        <>
          {/* CSV Upload */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: t.text, margin: 0 }}>Importar CSV</h3>
              <button
                onClick={downloadTemplate}
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Descargar Template
              </button>
            </div>

            <div style={{ backgroundColor: t.bgContent, padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ color: t.text, fontSize: '13px', margin: '0 0 8px', fontWeight: '500' }}>Columnas del CSV:</p>
              <table style={{ fontSize: '12px', color: t.textSecondary }}>
                <tbody>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>serial_number</code></td><td><strong style={{ color: '#ef4444' }}>*</strong> Número de serie</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>part_number</code></td><td><strong style={{ color: '#ef4444' }}>*</strong> Número de parte</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>lot_number</code></td><td>Número de lote</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>work_order</code></td><td>Orden de trabajo</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>produced_at</code></td><td>Fecha (YYYY-MM-DD HH:MM:SS)</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0' }}><code>shift</code></td><td>Código de turno (SHIFT_1, SHIFT_2...)</td></tr>
                </tbody>
              </table>
            </div>

            <p style={{ color: '#f59e0b', fontSize: '13px', marginBottom: '16px' }}>
              <strong>Nota:</strong> Si un part_number no existe en el sistema, se registrará para configuración posterior.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <div
                style={{
                  ...styles.uploadZone,
                  borderColor: dragOver ? '#3b82f6' : undefined,
                  backgroundColor: dragOver ? 'rgba(59, 130, 246, 0.1)' : undefined
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {importing ? (
                  <span style={{ color: t.text }}>Importando...</span>
                ) : (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>{dragOver ? '📥' : '📄'}</div>
                    <div style={{ color: dragOver ? '#3b82f6' : t.text, fontWeight: '500' }}>
                      {dragOver ? 'Suelta el archivo aquí' : 'Arrastra un archivo CSV o haz clic para seleccionar'}
                    </div>
                    <div style={{ color: t.textSecondary, fontSize: '14px', marginTop: '4px' }}>
                      Máximo 10MB
                    </div>
                  </>
                )}
              </div>
            </label>

            {importResults && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: t.bgContent, borderRadius: '8px' }}>
                <h4 style={{ color: t.text, marginBottom: '8px' }}>Resultados:</h4>
                <p style={{ color: '#22c55e' }}>Insertados: {importResults.inserted}</p>
                <p style={{ color: '#6b7280' }}>Duplicados: {importResults.duplicates}</p>
                {importResults.unmatched > 0 && (
                  <p style={{ color: '#f59e0b' }}>Sin configurar: {importResults.unmatched}</p>
                )}
                {importResults.warnings && importResults.warnings.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {importResults.warnings.map((w, i) => (
                      <div key={i} style={{ ...styles.alert, ...styles.alertWarning, marginBottom: '8px' }}>
                        <strong>⚠️ {w.message}</strong>
                        {w.parts && (
                          <ul style={{ margin: '8px 0 0 20px', fontSize: '13px' }}>
                            {w.parts.map((p, j) => (
                              <li key={j}>{p}</li>
                            ))}
                          </ul>
                        )}
                        {w.action && (
                          <p style={{ marginTop: '8px', fontSize: '13px' }}>{w.action}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {importResults.errors && importResults.errors.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ color: '#ef4444' }}>Errores: {importResults.errors.length}</p>
                    <ul style={{ fontSize: '12px', color: t.textSecondary, maxHeight: '100px', overflow: 'auto' }}>
                      {importResults.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>Fila {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div style={styles.card}>
            <h3 style={{ color: t.text, marginBottom: '16px' }}>Entrada Manual</h3>
            <form onSubmit={handleManualSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Serial *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={manualEntry.serialNumber}
                    onChange={(e) => setManualEntry({ ...manualEntry, serialNumber: e.target.value })}
                    placeholder="Número de serial"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Parte (seleccionar)</label>
                  <select
                    style={styles.select}
                    value={manualEntry.partId}
                    onChange={(e) => setManualEntry({ ...manualEntry, partId: e.target.value, partNumberRaw: '' })}
                  >
                    <option value="">-- Sin seleccionar --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>O ingresar número de parte</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={manualEntry.partNumberRaw}
                    onChange={(e) => setManualEntry({ ...manualEntry, partNumberRaw: e.target.value, partId: '' })}
                    placeholder="Ej: ABC-123-NEW"
                    disabled={!!manualEntry.partId}
                  />
                  <span style={{ fontSize: '11px', color: '#f59e0b' }}>
                    Si no existe, se guardará para configurar después
                  </span>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lote</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={manualEntry.lotNumber}
                    onChange={(e) => setManualEntry({ ...manualEntry, lotNumber: e.target.value })}
                    placeholder="Número de lote"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Orden de Trabajo</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={manualEntry.workOrder}
                    onChange={(e) => setManualEntry({ ...manualEntry, workOrder: e.target.value })}
                    placeholder="WO-XXXXX"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha/Hora Producción</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    value={manualEntry.producedAt}
                    onChange={(e) => setManualEntry({ ...manualEntry, producedAt: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Unmatched Parts View */}
      {activeView === 'unmatched' && (
        <div style={styles.card}>
          <h3 style={{ color: t.text, marginBottom: '8px' }}>Partes No Configuradas</h3>
          <p style={{ color: t.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
            Estos números de parte fueron importados pero no existen en el catálogo de partes.
            Deben crearse en <strong>Clientes → [Cliente] → Partes</strong> antes de poder procesar su producción.
          </p>

          {unmatchedParts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>
              <span style={{ fontSize: '48px' }}>✅</span>
              <p style={{ marginTop: '12px' }}>Todas las partes están configuradas</p>
            </div>
          ) : (
            unmatchedParts.map((item, i) => (
              <div key={i} style={styles.unmatchedCard}>
                <div>
                  <div style={{ fontWeight: '600', color: t.text, fontSize: '16px' }}>
                    {item.partNumberRaw}
                  </div>
                  <div style={{ color: t.textSecondary, fontSize: '13px', marginTop: '4px' }}>
                    {item.entryCount} entradas • {formatDate(item.firstProduced)} - {formatDate(item.lastProduced)}
                  </div>
                  {item.workOrders && item.workOrders.length > 0 && (
                    <div style={{ color: t.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                      OTs: {item.workOrders.slice(0, 3).join(', ')}{item.workOrders.length > 3 ? '...' : ''}
                    </div>
                  )}
                </div>
                <button
                  style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                  onClick={() => navigate('/clients')}
                  title="Crear esta parte en el catálogo de clientes"
                >
                  Ir a Clientes
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* API Keys View */}
      {activeView === 'apikeys' && (
        <WebhookKeysManager theme={t} />
      )}

      {/* Modal de Preview CSV */}
      {previewModal.open && previewModal.preview && (
        <div style={styles.modal} onClick={() => setPreviewModal({ open: false, file: null, preview: null, allowDuplicates: false })}>
          <div style={{ ...styles.modalContent, maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: t.text, marginBottom: '16px' }}>
              Preview de Importación
            </h3>

            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: t.cardBg, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: t.text }}>{previewModal.preview.total}</div>
                <div style={{ fontSize: '12px', color: t.textSecondary }}>Total en CSV</div>
              </div>
              <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#166534' }}>{previewModal.preview.newCount}</div>
                <div style={{ fontSize: '12px', color: '#166534' }}>Nuevos</div>
              </div>
              <div style={{ background: previewModal.preview.duplicateCount > 0 ? '#fef3c7' : '#f3f4f6', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: previewModal.preview.duplicateCount > 0 ? '#92400e' : '#6b7280' }}>{previewModal.preview.duplicateCount}</div>
                <div style={{ fontSize: '12px', color: previewModal.preview.duplicateCount > 0 ? '#92400e' : '#6b7280' }}>Ya existen</div>
              </div>
            </div>

            {/* Warning de duplicados */}
            {previewModal.preview.duplicateCount > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                  ⚠️ {previewModal.preview.duplicateCount} serial(es) ya existen y serán omitidos
                </div>

                {/* Lista de duplicados (máx 10) */}
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '13px', color: '#78350f' }}>
                  {previewModal.preview.duplicates.slice(0, 10).map((dup, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #fcd34d' }}>
                      <strong>{dup.serialNumber}</strong>
                      {dup.partNumber && <span> - {dup.partNumber}</span>}
                      {dup.workOrder && <span> (OT: {dup.workOrder})</span>}
                    </div>
                  ))}
                  {previewModal.preview.duplicateCount > 10 && (
                    <div style={{ padding: '8px 0', fontStyle: 'italic' }}>
                      ...y {previewModal.preview.duplicateCount - 10} más
                    </div>
                  )}
                </div>

                {/* Botón descargar CSV de duplicados */}
                <button
                  style={{ ...styles.btn, marginTop: '12px', background: '#f59e0b', color: 'white', fontSize: '13px' }}
                  onClick={() => {
                    const csvContent = 'serial_number,part_number,work_order\n' +
                      previewModal.preview.duplicates.map(d =>
                        `${d.serialNumber},${d.partNumber || ''},${d.workOrder || ''}`
                      ).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'seriales_duplicados.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Descargar detalle de duplicados (.csv)
                </button>
              </div>
            )}

            {/* Warning de partes no configuradas */}
            {previewModal.preview.unmatchedCount > 0 && (
              <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>
                  ⚠️ {previewModal.preview.unmatchedCount} parte(s) no configurada(s)
                </div>
                <div style={{ fontSize: '13px', color: '#991b1b' }}>
                  {previewModal.preview.unmatchedParts.join(', ')}
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => setPreviewModal({ open: false, file: null, preview: null })}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={handleConfirmImport}
                disabled={importing || previewModal.preview.newCount === 0}
              >
                {importing ? 'Importando...' : `Importar ${previewModal.preview.newCount} registro(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && activeView === 'coverage' && (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>
          Cargando datos...
        </div>
      )}
    </div>
  );
};

export default ProductionTab;
