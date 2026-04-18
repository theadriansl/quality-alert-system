import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const ParetoTab = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
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
  const thStyleDyn = { padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' };
  const tdStyleDyn = { padding: '8px 10px', borderBottom: `1px solid ${theme.border}` };

  const runAnalysis = async () => {
    if (!selectedDataset || !selectedColumn) return;

    setIsLoading(true);
    try {
      const result = await statService.analyzePareto({
        datasetId: parseInt(selectedDataset),
        categoryColumn: selectedColumn
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
    const { data } = results;

    chartInstance.current = new Chart(ctx, {
      data: {
        labels: data.map(d => d.category),
        datasets: [
          {
            type: 'bar',
            label: 'Count',
            data: data.map(d => d.count),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Cumulative %',
            data: data.map(d => d.cumulative),
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: `Pareto Analysis - ${selectedColumn}` },
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Count' },
            beginAtZero: true
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Cumulative %' },
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false }
          }
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

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Category Column</label>
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
            <div style={{ marginBottom: '20px', height: '350px' }}>
              <canvas ref={chartRef}></canvas>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
              <strong>Total Count:</strong> {results.total} |
              <strong style={{ marginLeft: '15px' }}>Categories:</strong> {results.data.length}
            </div>

            {/* Data Table */}
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.bgPanel, position: 'sticky', top: 0 }}>
                    <th style={thStyleDyn}>Rank</th>
                    <th style={thStyleDyn}>Category</th>
                    <th style={thStyleDyn}>Count</th>
                    <th style={thStyleDyn}>%</th>
                    <th style={thStyleDyn}>Cumulative %</th>
                  </tr>
                </thead>
                <tbody>
                  {results.data.map((item, i) => (
                    <tr key={i} style={{ backgroundColor: item.cumulative <= 80 ? '#dcfce7' : theme.bgCard }}>
                      <td style={tdStyleDyn}>{i + 1}</td>
                      <td style={tdStyleDyn}>{item.category}</td>
                      <td style={tdStyleDyn}>{item.count}</td>
                      <td style={tdStyleDyn}>{item.percentage.toFixed(1)}%</td>
                      <td style={tdStyleDyn}>{item.cumulative.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 80/20 Rule Highlight */}
            {(() => {
              const vital = results.data.filter(d => d.cumulative <= 80);
              return (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #f59e0b'
                }}>
                  <strong>80/20 Rule:</strong> {vital.length} categories ({((vital.length / results.data.length) * 100).toFixed(0)}%)
                  account for ~80% of occurrences (highlighted in green)
                </div>
              );
            })()}
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

const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#3b82f6', color: 'white' };

export default ParetoTab;
