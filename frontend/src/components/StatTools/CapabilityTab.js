import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const CapabilityTab = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const [lsl, setLsl] = useState('');
  const [usl, setUsl] = useState('');
  const [target, setTarget] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    loadDatasets();
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, []);

  useEffect(() => {
    if (selectedDataset) loadDatasetColumns(selectedDataset);
  }, [selectedDataset]);

  useEffect(() => {
    if (results) renderChart();
  }, [results]);

  const loadDatasets = async () => {
    const result = await statService.getDatasets();
    if (result.success) setDatasets(result.data);
  };

  const loadDatasetColumns = async (id) => {
    const result = await statService.getDataset(id);
    if (result.success) {
      setColumns(result.data.columns || []);
      setSelectedColumn('');
    }
  };

  const runAnalysis = async () => {
    if (!selectedDataset || !selectedColumn || !lsl || !usl) return;

    setIsLoading(true);
    try {
      const result = await statService.analyzeCapability({
        datasetId: parseInt(selectedDataset),
        column: selectedColumn,
        lsl: parseFloat(lsl),
        usl: parseFloat(usl),
        target: target ? parseFloat(target) : null
      });
      if (result.success) setResults(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current || !results) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const { histogram, capability } = results;

    // Generate normal curve
    const binWidth = histogram[0].binEnd - histogram[0].binStart;
    const normalCurve = histogram.map(bin => {
      const x = (bin.binStart + bin.binEnd) / 2;
      const z = (x - capability.mean) / capability.stdDev;
      const pdf = Math.exp(-0.5 * z * z) / (capability.stdDev * Math.sqrt(2 * Math.PI));
      return pdf * capability.n * binWidth;
    });

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: histogram.map(b => b.label),
        datasets: [
          {
            label: 'Frequency',
            data: histogram.map(b => b.count),
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Normal Curve',
            data: normalCurve,
            type: 'line',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Process Capability Analysis' },
          legend: { display: true, position: 'top' },
          annotation: {
            annotations: {
              lslLine: {
                type: 'line',
                xMin: 0,
                xMax: 0,
                borderColor: 'red',
                borderWidth: 2,
                label: { content: 'LSL', enabled: true }
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }
        }
      }
    });
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: theme.text };
  const selectStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };
  const inputStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };

  const getCapabilityColor = (value) => {
    if (value >= 1.33) return '#22c55e';
    if (value >= 1.0) return '#f59e0b';
    return '#ef4444';
  };

  const getCapabilityLabel = (value) => {
    if (value >= 1.67) return 'Excellent';
    if (value >= 1.33) return 'Good';
    if (value >= 1.0) return 'Marginal';
    return 'Poor';
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* Input Panel */}
      <div style={{ width: '280px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Parameters</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>Dataset</label>
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={selectStyle}>
            <option value="">Select dataset...</option>
            {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>Measurement Column</label>
          <select value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)} style={selectStyle} disabled={!selectedDataset}>
            <option value="">Select column...</option>
            {columns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>LSL (Lower Spec Limit) *</label>
          <input type="number" value={lsl} onChange={(e) => setLsl(e.target.value)} style={inputStyle} step="any" />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>USL (Upper Spec Limit) *</label>
          <input type="number" value={usl} onChange={(e) => setUsl(e.target.value)} style={inputStyle} step="any" />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Target (Optional)</label>
          <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle} step="any" />
        </div>

        <button
          onClick={runAnalysis}
          disabled={!selectedDataset || !selectedColumn || !lsl || !usl || isLoading}
          style={{ ...btnStyle, width: '100%', opacity: (!selectedDataset || !selectedColumn || !lsl || !usl || isLoading) ? 0.5 : 1 }}
        >
          {isLoading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Results Panel */}
      <div style={{ flex: 1 }}>
        {results ? (
          <>
            {/* Chart */}
            <div style={{ marginBottom: '20px', height: '280px' }}>
              <canvas ref={chartRef}></canvas>
            </div>

            {/* Capability Indices */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <CapabilityBox label="Cp" value={results.capability.cp} getColor={getCapabilityColor} getLabel={getCapabilityLabel} />
              <CapabilityBox label="Cpk" value={results.capability.cpk} getColor={getCapabilityColor} getLabel={getCapabilityLabel} />
              <CapabilityBox label="Pp" value={results.capability.pp} getColor={getCapabilityColor} getLabel={getCapabilityLabel} />
              <CapabilityBox label="Ppk" value={results.capability.ppk} getColor={getCapabilityColor} getLabel={getCapabilityLabel} />
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <StatBox label="N" value={results.capability.n} />
              <StatBox label="Mean" value={results.capability.mean.toFixed(4)} />
              <StatBox label="Std Dev" value={results.capability.stdDev.toFixed(4)} />
              <StatBox label="LSL" value={results.capability.lsl} />
              <StatBox label="USL" value={results.capability.usl} />
            </div>

            {/* Interpretation */}
            <div style={{
              padding: '15px',
              backgroundColor: results.capability.cpk >= 1.33 ? '#dcfce7' : results.capability.cpk >= 1.0 ? '#fef3c7' : '#fee2e2',
              borderRadius: '6px'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>Interpretation</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                <li><strong>Cp = {results.capability.cp.toFixed(3)}:</strong> Process spread vs specification width</li>
                <li><strong>Cpk = {results.capability.cpk.toFixed(3)}:</strong> Process centering relative to specs
                  {results.capability.cpk < results.capability.cp && ' (process not centered)'}
                </li>
                <li><strong>Target:</strong> Cpk ≥ 1.33 for capable process, ≥ 1.67 for excellent</li>
              </ul>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: theme.textDim }}>
            Enter spec limits and run analysis
          </div>
        )}
      </div>
    </div>
  );
};

const CapabilityBox = ({ label, value, getColor, getLabel }) => (
  <div style={{
    padding: '15px',
    borderRadius: '8px',
    border: `2px solid ${getColor(value)}`,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '12px', marginBottom: '5px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: getColor(value) }}>{value.toFixed(3)}</div>
    <div style={{ fontSize: '11px', color: getColor(value), fontWeight: '500' }}>{getLabel(value)}</div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div style={{ padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
    <div style={{ fontSize: '11px' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: '600' }}>{value}</div>
  </div>
);

const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#3b82f6', color: 'white' };

export default CapabilityTab;
