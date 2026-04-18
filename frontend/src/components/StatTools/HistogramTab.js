import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const HistogramTab = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [bins, setBins] = useState(10);
  const [columns, setColumns] = useState([]);
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

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: theme.text };
  const selectStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };
  const inputStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };

  const runAnalysis = async () => {
    if (!selectedDataset || !selectedColumn) return;

    setIsLoading(true);
    try {
      const result = await statService.analyzeHistogram({
        datasetId: parseInt(selectedDataset),
        column: selectedColumn,
        bins: parseInt(bins)
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
    const { histogram, statistics } = results;

    // Generate normal curve data
    const normalCurve = histogram.map(bin => {
      const x = (bin.binStart + bin.binEnd) / 2;
      const z = (x - statistics.mean) / statistics.stdDev;
      const pdf = Math.exp(-0.5 * z * z) / (statistics.stdDev * Math.sqrt(2 * Math.PI));
      return pdf * statistics.n * (bin.binEnd - bin.binStart);
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
            borderColor: 'rgba(239, 68, 68, 1)',
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
          title: { display: true, text: `Histogram - ${selectedColumn}` },
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* Input Panel */}
      <div style={{ width: '280px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Parameters</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>Dataset</label>
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select dataset...</option>
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={labelStyle}>Measurement Column</label>
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            style={selectStyle}
            disabled={!selectedDataset}
          >
            <option value="">Select column...</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Number of Bins</label>
          <input
            type="number"
            value={bins}
            onChange={(e) => setBins(e.target.value)}
            min="5"
            max="50"
            style={inputStyle}
          />
        </div>

        <button
          onClick={runAnalysis}
          disabled={!selectedDataset || !selectedColumn || isLoading}
          style={{
            ...btnStyle,
            width: '100%',
            opacity: (!selectedDataset || !selectedColumn || isLoading) ? 0.5 : 1
          }}
        >
          {isLoading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Results Panel */}
      <div style={{ flex: 1 }}>
        {results ? (
          <>
            {/* Chart */}
            <div style={{ marginBottom: '20px', height: '300px' }}>
              <canvas ref={chartRef}></canvas>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <StatBox label="N" value={results.statistics.n} />
              <StatBox label="Mean" value={results.statistics.mean.toFixed(4)} />
              <StatBox label="Std Dev" value={results.statistics.stdDev.toFixed(4)} />
              <StatBox label="Median" value={results.statistics.median.toFixed(4)} />
              <StatBox label="Min" value={results.statistics.min.toFixed(4)} />
              <StatBox label="Max" value={results.statistics.max.toFixed(4)} />
              <StatBox label="Skewness" value={results.statistics.skewness.toFixed(4)} />
              <StatBox label="Kurtosis" value={results.statistics.kurtosis.toFixed(4)} />
            </div>

            {/* Normality Test */}
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: results.normality.isNormal ? '#dcfce7' : '#fef3c7',
              borderRadius: '6px',
              border: `1px solid ${results.normality.isNormal ? '#22c55e' : '#f59e0b'}`
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Anderson-Darling Normality Test</h4>
              <div style={{ display: 'flex', gap: '30px' }}>
                <div>
                  <span style={{ color: theme.textMuted, fontSize: '12px' }}>AD Statistic:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '600' }}>{results.normality.andersonDarling.toFixed(4)}</span>
                </div>
                <div>
                  <span style={{ color: theme.textMuted, fontSize: '12px' }}>P-Value:</span>
                  <span style={{ marginLeft: '8px', fontWeight: '600' }}>{results.normality.pValue.toFixed(4)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: '600', color: results.normality.isNormal ? '#16a34a' : '#d97706' }}>
                    {results.normality.isNormal ? '✓ Normal Distribution' : '⚠ Non-Normal Distribution'}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: theme.textDim }}>
            Select parameters and run analysis
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value }) => (
  <div style={{
    padding: '12px',
    borderRadius: '6px'
  }}>
    <div style={{ fontSize: '11px', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: '600' }}>{value}</div>
  </div>
);

const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#3b82f6', color: 'white' };

export default HistogramTab;
