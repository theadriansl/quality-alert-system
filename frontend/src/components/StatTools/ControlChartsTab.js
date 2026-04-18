import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const ControlChartsTab = () => {
  const { theme: t } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const [chartType, setChartType] = useState('imr');
  const [subgroupSize, setSubgroupSize] = useState(5);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const chart1Ref = useRef(null);
  const chart2Ref = useRef(null);
  const chart1Instance = useRef(null);
  const chart2Instance = useRef(null);

  useEffect(() => {
    loadDatasets();
    return () => {
      if (chart1Instance.current) chart1Instance.current.destroy();
      if (chart2Instance.current) chart2Instance.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (selectedDataset) loadDatasetColumns(selectedDataset);
  }, [selectedDataset]);

  useEffect(() => {
    if (results) renderCharts();
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
    if (!selectedDataset || !selectedColumn) return;

    setIsLoading(true);
    try {
      const result = await statService.analyzeControlCharts({
        datasetId: parseInt(selectedDataset),
        column: selectedColumn,
        chartType,
        subgroupSize: parseInt(subgroupSize)
      });
      if (result.success) setResults(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCharts = () => {
    if (chart1Instance.current) chart1Instance.current.destroy();
    if (chart2Instance.current) chart2Instance.current.destroy();

    if (chartType === 'xbar-r') {
      renderXbarChart();
      renderRChart();
    } else {
      renderIndividualsChart();
      renderMRChart();
    }
  };

  const renderXbarChart = () => {
    if (!chart1Ref.current || !results.xbar) return;
    const ctx = chart1Ref.current.getContext('2d');
    const { data, cl, ucl, lcl } = results.xbar;

    chart1Instance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          { label: 'X-bar', data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: false, tension: 0.1 },
          { label: 'UCL', data: Array(data.length).fill(ucl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 },
          { label: 'CL', data: Array(data.length).fill(cl), borderColor: '#22c55e', pointRadius: 0 },
          { label: 'LCL', data: Array(data.length).fill(lcl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'X-bar Chart' } } }
    });
  };

  const renderRChart = () => {
    if (!chart2Ref.current || !results.r) return;
    const ctx = chart2Ref.current.getContext('2d');
    const { data, cl, ucl, lcl } = results.r;

    chart2Instance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          { label: 'Range', data, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: false, tension: 0.1 },
          { label: 'UCL', data: Array(data.length).fill(ucl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 },
          { label: 'CL', data: Array(data.length).fill(cl), borderColor: '#22c55e', pointRadius: 0 },
          { label: 'LCL', data: Array(data.length).fill(lcl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'R Chart' } } }
    });
  };

  const renderIndividualsChart = () => {
    if (!chart1Ref.current || !results.individuals) return;
    const ctx = chart1Ref.current.getContext('2d');
    const { data, cl, ucl, lcl } = results.individuals;

    chart1Instance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          { label: 'Individual', data, borderColor: '#3b82f6', fill: false, tension: 0.1 },
          { label: 'UCL', data: Array(data.length).fill(ucl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 },
          { label: 'CL', data: Array(data.length).fill(cl), borderColor: '#22c55e', pointRadius: 0 },
          { label: 'LCL', data: Array(data.length).fill(lcl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Individuals Chart (I)' } } }
    });
  };

  const renderMRChart = () => {
    if (!chart2Ref.current || !results.mr) return;
    const ctx = chart2Ref.current.getContext('2d');
    const { data, cl, ucl, lcl } = results.mr;

    chart2Instance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          { label: 'Moving Range', data, borderColor: '#8b5cf6', fill: false, tension: 0.1 },
          { label: 'UCL', data: Array(data.length).fill(ucl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 },
          { label: 'CL', data: Array(data.length).fill(cl), borderColor: '#22c55e', pointRadius: 0 },
          { label: 'LCL', data: Array(data.length).fill(Math.max(0, lcl)), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 }
        ]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Moving Range Chart (MR)' } } }
    });
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: t.textMuted };
  const selectStyle = { width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '13px', backgroundColor: t.bgCard, color: t.text };
  const inputStyle = { width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '13px', backgroundColor: t.bgCard, color: t.text };
  const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: t.accent, color: 'white' };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* Input Panel */}
      <div style={{ width: '280px', borderRight: `1px solid ${t.border}`, paddingRight: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: t.text }}>Parameters</h3>

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
          <label style={labelStyle}>Chart Type</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)} style={selectStyle}>
            <option value="imr">I-MR (Individuals)</option>
            <option value="xbar-r">X-bar R (Subgroups)</option>
          </select>
        </div>

        {chartType === 'xbar-r' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Subgroup Size</label>
            <input type="number" value={subgroupSize} onChange={(e) => setSubgroupSize(e.target.value)} min="2" max="10" style={inputStyle} />
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={!selectedDataset || !selectedColumn || isLoading}
          style={{ ...btnStyle, width: '100%', opacity: (!selectedDataset || !selectedColumn || isLoading) ? 0.5 : 1 }}
        >
          {isLoading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Results Panel */}
      <div style={{ flex: 1 }}>
        {results ? (
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '20px', height: '500px' }}>
            <div><canvas ref={chart1Ref}></canvas></div>
            <div><canvas ref={chart2Ref}></canvas></div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: t.textDim }}>
            Select parameters and run analysis
          </div>
        )}
      </div>
    </div>
  );
};


export default ControlChartsTab;
