const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const specCatalogService = {
  // Get measurement units grouped by category
  async getUnits() {
    const response = await fetch(`${API_BASE}/spec-catalog/units`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return { units: data.units, unitsByCategory: data.unitsByCategory };
  },

  // Get specifications for a part
  async getPartSpecs(partId, specType = null) {
    let url = `${API_BASE}/spec-catalog/parts/${partId}/specs`;
    if (specType) url += `?specType=${specType}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return {
      specs: data.specs,
      specsByType: data.specsByType,
      counts: data.counts
    };
  },

  // Get single specification
  async getSpec(specId) {
    const response = await fetch(`${API_BASE}/spec-catalog/specs/${specId}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.spec;
  },

  // Create specification
  async createSpec(partId, specData) {
    const response = await fetch(`${API_BASE}/spec-catalog/parts/${partId}/specs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(specData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.spec;
  },

  // Update specification
  async updateSpec(specId, specData) {
    const response = await fetch(`${API_BASE}/spec-catalog/specs/${specId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(specData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.spec;
  },

  // Delete specification
  async deleteSpec(specId) {
    const response = await fetch(`${API_BASE}/spec-catalog/specs/${specId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Copy specs from another part
  async copySpecs(partId, sourcePartId) {
    const response = await fetch(`${API_BASE}/spec-catalog/parts/${partId}/copy-from/${sourcePartId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Get BOM components for a part
  async getBomComponents(partId) {
    const response = await fetch(`${API_BASE}/spec-catalog/parts/${partId}/bom-components`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.components;
  },

  // Add BOM component spec
  async addBomComponent(partId, bomPartId, referencePhotoUrl, notes) {
    const response = await fetch(`${API_BASE}/spec-catalog/parts/${partId}/bom-components`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bomPartId, referencePhotoUrl, notes })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.spec;
  },

  // Upload reference photo
  async uploadPhoto(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE}/spec-catalog/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const data = await response.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data.url;
  },

  // Get all parts (for sidebar selection)
  async getAllParts() {
    const response = await fetch(`${API_BASE}/clients/parts/all`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.parts;
  },

  // Get specs with stations info
  async getPartSpecsWithStations(partId) {
    const response = await fetch(`${API_BASE}/spec-catalog/parts/${partId}/specs-with-stations`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return {
      specs: data.specs,
      specsByType: data.specsByType,
      counts: data.counts
    };
  },

  // Get stations assigned to a spec
  async getSpecStations(specId) {
    const response = await fetch(`${API_BASE}/spec-catalog/specs/${specId}/stations`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.stations;
  },

  // Update stations for a spec
  async updateSpecStations(specId, stationIds) {
    const response = await fetch(`${API_BASE}/spec-catalog/specs/${specId}/stations`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stationIds })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Get all available stations
  async getAllStations() {
    const response = await fetch(`${API_BASE}/station-config/stations`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.stations;
  }
};

export default specCatalogService;
