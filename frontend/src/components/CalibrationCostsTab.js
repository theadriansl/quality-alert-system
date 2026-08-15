import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const CalibrationCostsTab = ({ theme: t }) => {
  const [data, setData] = useState({
    byEquipment: [],
    byType: [],
    recentWithCost: [],
    totals: {}
  });
  const [loading, setLoading] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadEquipmentTypes();
  }, []);

  useEffect(() => {
    loadCosts();
  }, [startDate, endDate, filterType]);

  const loadEquipmentTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/calibration/types`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setEquipmentTypes(data.types);
    } catch (err) {
      console.error('Error loading types:', err);
    }
  };

  const loadCosts = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/calibration/reports/costs?`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (filterType) url += `equipmentType=${filterType}&`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Error loading costs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const styles = {
    container: { padding: '0' },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    title: { fontSize: '20px', fontWeight: '600', color: t.text, margin: 0 },
    filters: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    filterInput: {
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text,
      fontSize: '14px'
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      padding: '20px',
      borderRadius: '10px',
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`
    },
    statValue: { fontSize: '28px', fontWeight: '700', color: t.text },
    statLabel: { fontSize: '13px', color: t.textMuted, marginTop: '4px' },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '12px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      overflow: 'hidden'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Costos de Calibración</h2>
        <div style={styles.filters}>
          <label style={{ color: t.textMuted, fontSize: '13px' }}>Desde:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.filterInput}
          />
          <label style={{ color: t.textMuted, fontSize: '13px' }}>Hasta:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.filterInput}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterInput}
          >
            <option value="">Todos los tipos</option>
            {equipmentTypes.map(t => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>Cargando...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div style={styles.statsRow}>
            <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>
                {formatCurrency(data.totals.totalCost)}
              </div>
              <div style={styles.statLabel}>Costo Total</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{data.totals.totalCalibrations || 0}</div>
              <div style={styles.statLabel}>Calibraciones</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{data.totals.totalEquipment || 0}</div>
              <div style={styles.statLabel}>Equipos</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{formatCurrency(data.totals.avgCost)}</div>
              <div style={styles.statLabel}>Costo Promedio</div>
            </div>
          </div>

          <div style={styles.grid2}>
            {/* By Equipment */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Costo por Equipo</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Equipo</th>
                      <th style={styles.th}>Calibraciones</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEquipment.filter(e => e.totalCost > 0).map(eq => (
                      <tr key={eq.id}>
                        <td style={styles.td}>
                          <div>
                            <code style={{
                              backgroundColor: t.bgPanel,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>{eq.code}</code>
                            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>
                              {eq.name}
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>{eq.calibrationCount}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(eq.totalCost)}
                        </td>
                      </tr>
                    ))}
                    {data.byEquipment.filter(e => e.totalCost > 0).length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: t.textMuted }}>
                          Sin datos de costos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Type - Chart */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Costo por Tipo de Equipo</h3>
              {data.byType.filter(tp => tp.totalCost > 0).length > 0 ? (
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byType.filter(tp => tp.totalCost > 0)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `$${(value/1000).toFixed(1)}k`}
                        stroke={t.textMuted}
                        fontSize={12}
                      />
                      <YAxis
                        type="category"
                        dataKey="equipmentTypeName"
                        stroke={t.textMuted}
                        fontSize={12}
                        width={90}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value), 'Costo Total']}
                        contentStyle={{
                          backgroundColor: t.bgCard,
                          border: `1px solid ${t.border}`,
                          borderRadius: '8px',
                          color: t.text
                        }}
                        labelStyle={{ color: t.text, fontWeight: '600' }}
                      />
                      <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                        {data.byType.filter(tp => tp.totalCost > 0).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: t.textMuted,
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px'
                }}>
                  Sin datos de costos
                </div>
              )}
            </div>
          </div>

          {/* Recent Calibrations */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Últimas Calibraciones con Costo</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Equipo</th>
                  <th style={styles.th}>Proveedor</th>
                  <th style={styles.th}>Certificado</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Costo</th>
                </tr>
              </thead>
              <tbody>
                {data.recentWithCost.slice(0, 10).map((cal, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      {new Date(cal.calibrationDate).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <code style={{
                        backgroundColor: t.bgPanel,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>{cal.equipmentCode}</code>
                      <span style={{ marginLeft: '8px', color: t.textMuted }}>
                        {cal.equipmentName}
                      </span>
                    </td>
                    <td style={styles.td}>{cal.provider || '-'}</td>
                    <td style={styles.td}>
                      <code style={{ fontSize: '12px' }}>{cal.certificateNumber || '-'}</code>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                      {formatCurrency(cal.cost)}
                    </td>
                  </tr>
                ))}
                {data.recentWithCost.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: t.textMuted }}>
                      No hay calibraciones con costo registrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CalibrationCostsTab;
