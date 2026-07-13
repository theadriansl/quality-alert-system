const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const stationConfigService = {
  // Get all stations with assigned parts count
  async getStations() {
    const response = await fetch(`${API_BASE}/station-config/stations`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.stations;
  },

  // Get station configuration (parts and items)
  async getStationConfig(stationId) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/config`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { station: data.station, parts: data.parts };
  },

  // Add part to station
  async addPartToStation(stationId, partId) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/parts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ partId })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Remove part from station
  async removePartFromStation(stationId, partId) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/parts/${partId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Get available items (defects/specs not yet assigned)
  async getAvailableItems(stationId, partId) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/parts/${partId}/available`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return {
      availableDefects: data.availableDefects,
      availableSpecs: data.availableSpecs
    };
  },

  // Add items (defects/specs) to station+part
  async addItemsToStationPart(stationId, partId, defectIds, specIds) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/parts/${partId}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ defectIds, specIds })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Remove item from station
  async removeItem(stationId, itemId) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Bulk update items for station+part
  async updateStationPartItems(stationId, partId, defectIds, specIds) {
    const response = await fetch(`${API_BASE}/station-config/stations/${stationId}/parts/${partId}/items`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ defectIds, specIds })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Get all parts (for adding to stations)
  async getAllParts() {
    const response = await fetch(`${API_BASE}/clients/parts/all`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.parts;
  }
};

export default stationConfigService;
