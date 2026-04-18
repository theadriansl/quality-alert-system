import React, { useState, useEffect, useRef } from 'react';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

const DatasetTab = () => {
  const { theme } = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', columns: [], rows: [] });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const result = await statService.getDatasets();
      if (result.success) setDatasets(result.data);
    } catch (error) {
      console.error('Error loading datasets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataset = async (id) => {
    setIsLoading(true);
    try {
      const result = await statService.getDataset(id);
      if (result.success) {
        setSelectedDataset(result.data);
        setEditData({
          name: result.data.name,
          description: result.data.description || '',
          columns: result.data.columns || [],
          rows: result.data.rows || []
        });
      }
    } catch (error) {
      console.error('Error loading dataset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await statService.uploadCSV(file);
      if (result.success) {
        setEditData({
          name: file.name.replace('.csv', ''),
          description: `Imported from ${file.name}`,
          columns: result.data.columns,
          rows: result.data.rows
        });
        setShowCreateModal(true);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let result;
      if (selectedDataset && !showCreateModal) {
        result = await statService.updateDataset(selectedDataset.id, editData);
      } else {
        result = await statService.createDataset(editData);
      }

      if (result.success) {
        await loadDatasets();
        if (result.data?.id) await loadDataset(result.data.id);
        setShowCreateModal(false);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving dataset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dataset?')) return;

    try {
      await statService.deleteDataset(id);
      setSelectedDataset(null);
      await loadDatasets();
    } catch (error) {
      console.error('Error deleting dataset:', error);
    }
  };

  const updateCell = (rowIndex, colName, value) => {
    const newRows = [...editData.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [colName]: value };
    setEditData({ ...editData, rows: newRows });
  };

  const addRow = () => {
    const newRow = {};
    editData.columns.forEach(col => newRow[col] = '');
    setEditData({ ...editData, rows: [...editData.rows, newRow] });
  };

  const deleteRow = (index) => {
    const newRows = editData.rows.filter((_, i) => i !== index);
    setEditData({ ...editData, rows: newRows });
  };

  const addColumn = () => {
    const colName = prompt('Column name:');
    if (!colName) return;

    const newRows = editData.rows.map(row => ({ ...row, [colName]: '' }));
    setEditData({
      ...editData,
      columns: [...editData.columns, colName],
      rows: newRows
    });
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: theme.text };
  const selectStyle = { width: '100%', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', color: theme.text, backgroundColor: theme.bgCard };
  const inputStyleDyn = { padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px', color: theme.text, backgroundColor: theme.bgCard };
  const thStyleDyn = { padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' };
  const tdStyleDyn = { padding: '8px 10px', borderBottom: `1px solid ${theme.border}` };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
      {/* Left Panel - Dataset List */}
      <div style={{ width: '280px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Datasets</h3>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => {
                setEditData({ name: '', description: '', columns: [], rows: [] });
                setShowCreateModal(true);
                setIsEditing(true);
              }}
              style={btnStyle}
            >
              + New
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>
              📁 CSV
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
          {datasets.map(ds => (
            <div
              key={ds.id}
              onClick={() => loadDataset(ds.id)}
              style={{
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '8px',
                cursor: 'pointer',
                backgroundColor: selectedDataset?.id === ds.id ? '#dbeafe' : theme.bg,
                border: selectedDataset?.id === ds.id ? '1px solid #3b82f6' : `1px solid ${theme.border}`
              }}
            >
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{ds.name}</div>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>
                {ds.row_count} rows • {new Date(ds.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {datasets.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.textDim, padding: '20px' }}>
              No datasets. Create one or upload CSV.
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Dataset Editor/Viewer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(selectedDataset || showCreateModal) ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Dataset name"
                    style={inputStyleDyn}
                  />
                ) : (
                  <h3 style={{ margin: 0 }}>{selectedDataset?.name}</h3>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button onClick={handleSave} disabled={isLoading} style={{ ...btnStyle, backgroundColor: '#22c55e' }}>
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setIsEditing(false); setShowCreateModal(false); }} style={btnStyle}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(true)} style={btnStyle}>Edit</button>
                    <button onClick={() => handleDelete(selectedDataset.id)} style={{ ...btnStyle, backgroundColor: '#ef4444' }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {isEditing && (
              <input
                type="text"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description (optional)"
                style={{ ...inputStyleDyn, width: '100%', marginBottom: '15px' }}
              />
            )}

            {/* Data Table */}
            <div style={{ overflow: 'auto', maxHeight: '480px', border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.bgPanel, position: 'sticky', top: 0 }}>
                    <th style={thStyleDyn}>#</th>
                    {editData.columns.map((col, i) => (
                      <th key={i} style={thStyleDyn}>{col}</th>
                    ))}
                    {isEditing && <th style={thStyleDyn}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {editData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td style={tdStyleDyn}>{rowIndex + 1}</td>
                      {editData.columns.map((col, colIndex) => (
                        <td key={colIndex} style={tdStyleDyn}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={row[col] || ''}
                              onChange={(e) => updateCell(rowIndex, col, e.target.value)}
                              style={{ border: 'none', width: '100%', padding: '2px' }}
                            />
                          ) : (
                            row[col]
                          )}
                        </td>
                      ))}
                      {isEditing && (
                        <td style={tdStyleDyn}>
                          <button onClick={() => deleteRow(rowIndex)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row/Column */}
            {isEditing && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button onClick={addRow} style={btnStyle}>+ Add Row</button>
                <button onClick={addColumn} style={btnStyle}>+ Add Column</button>
              </div>
            )}

            {/* Stats */}
            <div style={{ marginTop: '15px', fontSize: '12px', color: theme.textMuted }}>
              {editData.rows.length} rows • {editData.columns.length} columns
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.textDim }}>
            Select a dataset or create a new one
          </div>
        )}
      </div>
    </div>
  );
};

const btnStyle = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  backgroundColor: '#3b82f6',
  color: 'white'
};

export default DatasetTab;
