const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const specInspectionService = {
  // Save single spec inspection entry
  async saveEntry(entryData) {
    const response = await fetch(`${API_BASE}/spec-inspection/entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entryData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { entry: data.entry, message: data.message };
  },

  // Save multiple spec inspections (bulk)
  async saveBulk(bulkData) {
    const response = await fetch(`${API_BASE}/spec-inspection/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bulkData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { entries: data.entries, summary: data.summary, message: data.message };
  },

  // Get inspection entries with filters
  async getEntries(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE}/spec-inspection/entries?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { entries: data.entries, total: data.total, limit: data.limit, offset: data.offset };
  },

  // Get statistics
  async getStats(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE}/spec-inspection/stats?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.stats;
  },

  // Get station inspections for a unit
  async getStationInspections(unitId) {
    const response = await fetch(`${API_BASE}/spec-inspection/station-inspections/${unitId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.inspections;
  }
};

export default specInspectionService;
