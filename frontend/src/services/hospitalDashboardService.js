/**
 * Hospital Dashboard Service
 * API calls for Hospital Dashboard analytics
 */

const API_URL = 'http://localhost:5000';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

// Helper to build query string from filters
const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.clientId) params.set('client_id', filters.clientId);
  if (filters.departmentId) params.set('department_id', filters.departmentId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

export const getDashboardSummary = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/summary${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getRepairerStats = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/repairers${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getReleaserStats = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/releasers${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getRepeatDefects = async (filters = {}, limit = 50) => {
  const qs = buildQueryString(filters);
  const sep = qs ? '&' : '?';
  const res = await fetch(`${API_URL}/hospital-dashboard/repeat-defects${qs}${sep}limit=${limit}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getClientStats = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/by-client${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getCostData = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/costs${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getTopDefectTypes = async (filters = {}, limit = 10) => {
  const qs = buildQueryString(filters);
  const sep = qs ? '&' : '?';
  const res = await fetch(`${API_URL}/hospital-dashboard/top-defect-types${qs}${sep}limit=${limit}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getTopParts = async (filters = {}, limit = 10) => {
  const qs = buildQueryString(filters);
  const sep = qs ? '&' : '?';
  const res = await fetch(`${API_URL}/hospital-dashboard/top-parts${qs}${sep}limit=${limit}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getThroughput = async (filters = {}, days = 30) => {
  const qs = buildQueryString(filters);
  const sep = qs ? '&' : '?';
  const res = await fetch(`${API_URL}/hospital-dashboard/throughput${qs}${sep}days=${days}`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getWIPByLocation = async () => {
  const res = await fetch(`${API_URL}/hospital-dashboard/wip-by-location`, {
    headers: getHeaders()
  });
  return res.json();
};

// Export data for Excel generation
export const getExportData = async (filters = {}) => {
  const res = await fetch(`${API_URL}/hospital-dashboard/export${buildQueryString(filters)}`, {
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// MRB BUFFER ENDPOINTS
// ============================================================================

export const getMRBBuffer = async () => {
  const res = await fetch(`${API_URL}/mrb/buffer`, {
    headers: getHeaders()
  });
  return res.json();
};

export const getMRBBufferSummary = async () => {
  const res = await fetch(`${API_URL}/mrb/buffer/summary`, {
    headers: getHeaders()
  });
  return res.json();
};

export const assignBufferArea = async (defectId, responsibleArea) => {
  const res = await fetch(`${API_URL}/mrb/buffer/${defectId}/assign-area`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ responsibleArea })
  });
  return res.json();
};

export const assignBufferToCampaign = async (defectId, campaignId) => {
  const res = await fetch(`${API_URL}/mrb/buffer/${defectId}/assign-campaign`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ campaignId })
  });
  return res.json();
};

export const batchAssignToCampaign = async (defectIds, campaignId) => {
  const res = await fetch(`${API_URL}/mrb/buffer/batch-assign-campaign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ defectIds, campaignId })
  });
  return res.json();
};
