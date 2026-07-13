const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const unitRegistryService = {
  // Register new unit (serial/lot)
  async registerUnit(unitData) {
    const response = await fetch(`${API_BASE}/unit-registry`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(unitData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { unit: data.unit, isNew: data.isNew, message: data.message };
  },

  // Get unit by serial number
  async getBySerial(serialNumber, clientId = null, partId = null) {
    let url = `${API_BASE}/unit-registry/by-serial/${encodeURIComponent(serialNumber)}`;
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (partId) params.append('partId', partId);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.unit;
  },

  // Search units with filters
  async searchUnits(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE}/unit-registry/search?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { units: data.units, total: data.total, limit: data.limit, offset: data.offset };
  },

  // Get unit by ID with details
  async getUnit(id) {
    const response = await fetch(`${API_BASE}/unit-registry/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.unit;
  },

  // Update unit status
  async updateStatus(id, status, notes = null, stationId = null, shiftId = null) {
    const response = await fetch(`${API_BASE}/unit-registry/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes, stationId, shiftId })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { unit: data.unit, message: data.message };
  },

  // Get unit history
  async getHistory(id) {
    const response = await fetch(`${API_BASE}/unit-registry/${id}/history`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.history;
  },

  // Add note to unit history
  async addNote(id, note, stationId = null) {
    const response = await fetch(`${API_BASE}/unit-registry/${id}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ note, stationId })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Get statistics by status
  async getStatsByStatus(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE}/unit-registry/stats/by-status?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.stats;
  }
};

export default unitRegistryService;
