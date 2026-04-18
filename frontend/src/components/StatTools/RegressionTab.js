import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const RegressionTab = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
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
      setXColumn('');
      setYColumn('');
    }
  };

  const runAnalysis = async () => {
    if (!selectedDataset || !xColumn || !yColumn) return;

    setIsLoading(true);
    try {
      const result = await statService.analyzeRegression({
        datasetId: parseInt(selectedDataset),
        xColumn,
        yColumn
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
    const { points, regression } = results;

    // Calculate regression line points
    const xValues = points.map(p => p.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const linePoints = [
      { x: minX, y: regression.intercept + regression.slope * minX },
      { x: maxX, y: regression.intercept + regression.slope * maxX }
    ];

    chartInstance.current = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Data Points',
            data: points,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            pointRadius: 5
          },
          {
            label: 'Regression Line',
            data: linePoints,
            type: 'line',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: `${yColumn} vs ${xColumn}` },
          legend: { display: true, position: 'top' }
        },
        scales: {
          x: { title: { display: true, text: xColumn } },
          y: { title: { display: true, text: yColumn } }
        }
      }
    });
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: theme.text };
  const selectStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };

  const getCorrelationStrength = (r) => {
    const absR = Math.abs(r);
    if (absR >= 0.9) return { label: 'Very Strong', color: '#22c55e' };
    if (absR >= 0.7) return { label: 'Strong', color: '#84cc16' };
    if (absR >= 0.5) return { label: 'Moderate', color: '#f59e0b' };
    if (absR >= 0.3) return { label: 'Weak', color: '#f97316' };
    return { label: 'Very Weak', color: '#ef4444' };
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
          <label style={labelStyle}>X Variable (Independent)</label>
          <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} style={selectStyle} disabled={!selectedDataset}>
            <option value="">Select column...</option>
            {columns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Y Variable (Dependent)</label>
          <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} style={selectStyle} disabled={!selectedDataset}>
            <option value="">Select column...</option>
            {columns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!selectedDataset || !xColumn || !yColumn || isLoading}
          style={{ ...btnStyle, width: '100%', opacity: (!selectedDataset || !xColumn || !yColumn || isLoading) ? 0.5 : 1 }}
        >
          {isLoading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Results Panel */}
      <div style={{ flex: 1 }}>
        {results ? (
          <>
            {/* Chart */}
            <div style={{ marginBottom: '20px', height: '350px' }}>
              <canvas ref={chartRef}></canvas>
            </div>

            {/* Regression Equation */}
            <div style={{
              padding: '15px',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '5px' }}>Regression Equation</div>
              <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace' }}>
                {results.regression.equation}
              </div>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div style={{
                padding: '15px',
                backgroundColor: theme.bg,
                borderRadius: '6px',
                textAlign: 'center',
                border: `2px solid ${getCorrelationStrength(results.correlation).color}`
              }}>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Correlation (r)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getCorrelationStrength(results.correlation).color }}>
                  {results.correlation.toFixed(4)}
                </div>
                <div style={{ fontSize: '11px', color: getCorrelationStrength(results.correlation).color }}>
                  {getCorrelationStrength(results.correlation).label}
                  {results.correlation >= 0 ? ' Positive' : ' Negative'}
                </div>
              </div>

              <div style={{ padding: '15px', backgroundColor: theme.bg, borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>R² (Coefficient of Determination)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{results.regression.r2.toFixed(4)}</div>
                <div style={{ fontSize: '11px', color: theme.textMuted }}>
                  {(results.regression.r2 * 100).toFixed(1)}% variance explained
                </div>
              </div>

              <div style={{ padding: '15px', backgroundColor: theme.bg, borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Sample Size</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{results.points.length}</div>
                <div style={{ fontSize: '11px', color: theme.textMuted }}>data points</div>
              </div>
            </div>

            {/* Coefficients */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div style={{ padding: '12px', backgroundColor: theme.bg, borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Slope (b)</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{results.regression.slope.toFixed(6)}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: theme.bg, borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Intercept (a)</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{results.regression.intercept.toFixed(6)}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: theme.textDim }}>
            Select X and Y variables and run analysis
          </div>
        )}
      </div>
    </div>
  );
};

const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#3b82f6', color: 'white' };

export default RegressionTab;
