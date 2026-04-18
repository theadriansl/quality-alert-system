const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

// ============ DATASETS ============

export const getDatasets = async () => {
  const response = await fetch(`${API_URL}/api/stat/datasets`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

export const getDataset = async (id) => {
  const response = await fetch(`${API_URL}/api/stat/datasets/${id}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

export const createDataset = async (data) => {
  const response = await fetch(`${API_URL}/api/stat/datasets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateDataset = async (id, data) => {
  const response = await fetch(`${API_URL}/api/stat/datasets/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteDataset = async (id) => {
  const response = await fetch(`${API_URL}/api/stat/datasets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/stat/datasets/upload-csv`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  return response.json();
};

// ============ ANALYSIS ============

export const analyzeHistogram = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/histogram`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzePareto = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/pareto`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzeCapability = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/capability`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzeControlCharts = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/control-charts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzeRegression = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/regression`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const analyzeGageRR = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/gage-rr`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

export const getTaguchiArray = async (arrayType) => {
  const response = await fetch(`${API_URL}/api/stat/taguchi/${arrayType}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

export const analyzeTaguchi = async (params) => {
  const response = await fetch(`${API_URL}/api/stat/taguchi`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  return response.json();
};

// ============ HISTORY ============

export const saveAnalysis = async (data) => {
  const response = await fetch(`${API_URL}/api/stat/history`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return response.json();
};

export const getAnalysisHistory = async (type = null) => {
  const url = type
    ? `${API_URL}/api/stat/history?type=${type}`
    : `${API_URL}/api/stat/history`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  return response.json();
};

export const getAnalysis = async (id) => {
  const response = await fetch(`${API_URL}/api/stat/history/${id}`, {
    headers: getAuthHeaders()
  });
  return response.json();
};

export const deleteAnalysis = async (id) => {
  const response = await fetch(`${API_URL}/api/stat/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

export default {
  getDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  uploadCSV,
  analyzeHistogram,
  analyzePareto,
  analyzeCapability,
  analyzeControlCharts,
  analyzeRegression,
  analyzeGageRR,
  getTaguchiArray,
  analyzeTaguchi,
  saveAnalysis,
  getAnalysisHistory,
  getAnalysis,
  deleteAnalysis
};
