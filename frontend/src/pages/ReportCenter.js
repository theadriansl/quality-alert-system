import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, Download, Clock, CheckCircle, XCircle, RefreshCw,
  Trash2, Play, Calendar, Filter, Loader, MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ReportCenter() {
  const [reportTypes, setReportTypes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [stations, setStations] = useState([]);
  const [params, setParams] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    stationIds: [],
    serialNumber: '',
    partNumber: '',
    lotNumber: ''
  });

  const token = localStorage.getItem('token');

  // Load stations for traceability report
  const loadStations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/station-config/stations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        setStations(Array.isArray(data) ? data : (data.stations || data || []));
      }
    } catch (e) {
      console.error('Error loading stations:', e);
    }
  }, [token]);

  const loadData = useCallback(async () => {
    try {
      const [typesRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/report-jobs/types`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/report-jobs?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const typesData = await typesRes.json();
      const jobsData = await jobsRes.json();

      if (typesData.success) setReportTypes(typesData.types);
      if (jobsData.success) setJobs(jobsData.jobs);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    // Poll for job updates every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load stations when traceability report is selected
  useEffect(() => {
    if (selectedType?.code === 'station_traceability' && stations.length === 0) {
      loadStations();
    }
  }, [selectedType, stations.length, loadStations]);

  const toggleStation = (stationId) => {
    setParams(p => ({
      ...p,
      stationIds: p.stationIds.includes(stationId)
        ? p.stationIds.filter(id => id !== stationId)
        : [...p.stationIds, stationId]
    }));
  };

  const selectAllStations = () => {
    setParams(p => ({ ...p, stationIds: stations.map(s => s.id) }));
  };

  const clearAllStations = () => {
    setParams(p => ({ ...p, stationIds: [] }));
  };

  const handleGenerate = async () => {
    if (!selectedType) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/report-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reportType: selectedType.code, params })
      });
      const data = await res.json();

      if (data.success) {
        setJobs(prev => [data.job, ...prev]);
        setSelectedType(null);
      } else {
        alert(data.message || 'Error al generar reporte');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (job) => {
    window.open(`${API_URL}/report-jobs/${job.id}/download?token=${token}`, '_blank');
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;

    try {
      const res = await fetch(`${API_URL}/report-jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock size={16} className="text-yellow-500" />;
      case 'PROCESSING': return <Loader size={16} className="text-blue-500 animate-spin" />;
      case 'COMPLETED': return <CheckCircle size={16} className="text-green-500" />;
      case 'FAILED': return <XCircle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'PENDING': 'Pendiente',
      'PROCESSING': 'Procesando',
      'COMPLETED': 'Completado',
      'FAILED': 'Error'
    };
    return labels[status] || status;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FileSpreadsheet size={28} style={{ color: '#1e40af' }} />
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1e3a5f', margin: 0 }}>
          Centro de Reportes
        </h1>
        <button
          onClick={loadData}
          style={{
            marginLeft: 'auto', padding: '8px 16px', background: '#f3f4f6',
            border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        {/* Left Panel - Generate Report */}
        <div style={{
          background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
          padding: '20px', height: 'fit-content'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            <Play size={18} style={{ display: 'inline', marginRight: '8px' }} />
            Generar Nuevo Reporte
          </h2>

          {/* Report Type Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#6b7280' }}>
              Tipo de Reporte
            </label>
            <select
              value={selectedType?.code || ''}
              onChange={(e) => setSelectedType(reportTypes.find(t => t.code === e.target.value))}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '14px', background: '#fff'
              }}
            >
              <option value="">Seleccionar tipo...</option>
              {reportTypes.map(t => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedType && (
            <>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                {selectedType.description}
              </p>

              {/* Date Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Desde
                  </label>
                  <input
                    type="date"
                    value={params.dateFrom}
                    onChange={(e) => setParams(p => ({ ...p, dateFrom: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px', border: '1px solid #d1d5db',
                      borderRadius: '6px', fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={params.dateTo}
                    onChange={(e) => setParams(p => ({ ...p, dateTo: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px', border: '1px solid #d1d5db',
                      borderRadius: '6px', fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* MRB Campaign ID for specific reports */}
              {selectedType.requiresParams?.includes('mrbCampaignId') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                    ID Campaña MRB
                  </label>
                  <input
                    type="number"
                    value={params.mrbCampaignId || ''}
                    onChange={(e) => setParams(p => ({ ...p, mrbCampaignId: parseInt(e.target.value) || null }))}
                    placeholder="Ej: 16"
                    style={{
                      width: '100%', padding: '8px', border: '1px solid #d1d5db',
                      borderRadius: '6px', fontSize: '13px'
                    }}
                  />
                </div>
              )}

              {/* Station Traceability specific filters */}
              {selectedType.code === 'station_traceability' && (
                <>
                  {/* Multi-station selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Estaciones ({params.stationIds.length} seleccionadas)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={selectAllStations}
                          style={{ fontSize: '10px', color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={clearAllStations}
                          style={{ fontSize: '10px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Ninguna
                        </button>
                      </div>
                    </div>
                    <div style={{
                      border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px',
                      maxHeight: '150px', overflowY: 'auto', background: '#f9fafb'
                    }}>
                      {stations.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                          Cargando estaciones...
                        </div>
                      ) : (
                        stations.map(station => (
                          <label
                            key={station.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px',
                              cursor: 'pointer', borderRadius: '4px', fontSize: '12px',
                              background: params.stationIds.includes(station.id) ? '#dbeafe' : 'transparent'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={params.stationIds.includes(station.id)}
                              onChange={() => toggleStation(station.id)}
                              style={{ margin: 0 }}
                            />
                            <span style={{ fontWeight: params.stationIds.includes(station.id) ? '500' : '400' }}>
                              {station.name}
                            </span>
                            {station.stationType && (
                              <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>
                                {station.stationType}
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                      Dejar vacío para incluir todas las estaciones
                    </div>
                  </div>

                  {/* Additional filters */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                      Filtros adicionales (opcional)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={params.serialNumber || ''}
                        onChange={(e) => setParams(p => ({ ...p, serialNumber: e.target.value }))}
                        placeholder="Serial (parcial)"
                        style={{
                          width: '100%', padding: '8px', border: '1px solid #d1d5db',
                          borderRadius: '6px', fontSize: '12px'
                        }}
                      />
                      <input
                        type="text"
                        value={params.partNumber || ''}
                        onChange={(e) => setParams(p => ({ ...p, partNumber: e.target.value }))}
                        placeholder="Parte (parcial)"
                        style={{
                          width: '100%', padding: '8px', border: '1px solid #d1d5db',
                          borderRadius: '6px', fontSize: '12px'
                        }}
                      />
                      <input
                        type="text"
                        value={params.lotNumber || ''}
                        onChange={(e) => setParams(p => ({ ...p, lotNumber: e.target.value }))}
                        placeholder="Lote (parcial)"
                        style={{
                          width: '100%', padding: '8px', border: '1px solid #d1d5db',
                          borderRadius: '6px', fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleGenerate}
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px', background: '#1e40af', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
                {submitting ? 'Generando...' : 'Generar Reporte'}
              </button>
            </>
          )}
        </div>

        {/* Right Panel - Jobs List */}
        <div style={{
          background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Filter size={18} style={{ color: '#6b7280' }} />
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#374151' }}>
              Mis Reportes ({jobs.length})
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              No hay reportes generados. Selecciona un tipo y genera uno nuevo.
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Reporte</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Progreso</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Tamaño</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Fecha</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827' }}>
                          {job.reportTypeName || job.reportType}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          ID: {job.id}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getStatusIcon(job.status)}
                          <span style={{ fontSize: '13px' }}>{getStatusLabel(job.status)}</span>
                        </div>
                        {job.errorMessage && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                            {job.errorMessage.substring(0, 50)}...
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {job.status === 'PROCESSING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '60px', height: '6px', background: '#e5e7eb',
                              borderRadius: '3px', overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${job.progress || 0}%`, height: '100%',
                                background: '#3b82f6', transition: 'width 0.3s'
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{job.progress || 0}%</span>
                          </div>
                        ) : job.status === 'COMPLETED' ? (
                          <span style={{ fontSize: '12px', color: '#10b981' }}>100%</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                        {formatFileSize(job.fileSize)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          {job.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleDownload(job)}
                              title="Descargar"
                              style={{
                                padding: '6px', background: '#10b981', color: '#fff',
                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                              }}
                            >
                              <Download size={14} />
                            </button>
                          )}
                          {['PENDING', 'COMPLETED', 'FAILED'].includes(job.status) && (
                            <button
                              onClick={() => handleDelete(job.id)}
                              title="Eliminar"
                              style={{
                                padding: '6px', background: '#fee2e2', color: '#dc2626',
                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
