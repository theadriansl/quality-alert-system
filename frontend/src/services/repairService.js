/**
 * Repair & Release Service
 * Handles all API calls for defect repair and release functionality
 */

const API_URL = 'http://localhost:5000';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

// ============================================================================
// DEFECT CONSULTATION
// ============================================================================

/**
 * Get defects by serial/lot number
 */
export const getDefectsBySerial = async (serial, options = {}) => {
  const params = new URLSearchParams();
  if (options.clientId) params.append('clientId', options.clientId);
  if (options.partId) params.append('partId', options.partId);
  if (options.includeHistory) params.append('includeHistory', 'true');

  const res = await fetch(
    `${API_URL}/defects-v2/by-serial/${encodeURIComponent(serial)}?${params}`,
    { headers: getHeaders() }
  );
  return res.json();
};

/**
 * Get defect events/history
 */
export const getDefectEvents = async (defectId) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/events`, {
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// REPAIR ACTIONS
// ============================================================================

/**
 * Start repair on a defect
 * @param {number} defectId - ID of the defect
 * @param {number} repairStationId - Optional repair station ID
 */
export const startRepair = async (defectId, repairStationId = null) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/repair/start`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ repairStationId })
  });
  return res.json();
};

/**
 * Complete repair on a defect
 */
export const completeRepair = async (defectId, data) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/repair/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

// ============================================================================
// RELEASE ACTIONS
// ============================================================================

/**
 * Release a defect
 */
export const releaseDefect = async (defectId, data) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/release`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Reject a repaired defect (send to repair, scrap, or quarantine)
 * @param {number} defectId - Defect ID
 * @param {string} notes - Rejection reason/notes
 * @param {string} destination - 'REPAIR', 'SCRAP', or 'QUARANTINE'
 * @param {number} repairStationId - Station ID (required when destination is REPAIR)
 */
export const rejectDefect = async (defectId, notes, destination = 'REPAIR', repairStationId = null) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes, destination, repairStationId })
  });
  return res.json();
};

/**
 * Approve a defect (supervisor action)
 */
export const approveDefect = async (defectId, approved, notes) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/approve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ approved, notes })
  });
  return res.json();
};

/**
 * Send defect to quarantine (cannot be repaired, pending decision)
 */
export const quarantineDefect = async (defectId, notes) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/quarantine`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes })
  });
  return res.json();
};

/**
 * Scrap a defect (cannot be repaired, discard)
 */
export const scrapDefect = async (defectId, notes) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/scrap`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes })
  });
  return res.json();
};

// ============================================================================
// CATALOGS
// ============================================================================

/**
 * Get repair types catalog
 */
export const getRepairTypes = async () => {
  const res = await fetch(`${API_URL}/defects-v2/repair-types`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get release reasons catalog
 */
export const getReleaseReasons = async () => {
  const res = await fetch(`${API_URL}/defects-v2/release-reasons`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get root causes catalog
 */
export const getRootCauses = async () => {
  const res = await fetch(`${API_URL}/defects-v2/root-causes`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get departments
 */
export const getDepartments = async () => {
  const res = await fetch(`${API_URL}/inspection-catalogs/departments`, {
    headers: getHeaders()
  });
  const data = await res.json();
  return data.items || data.departments || [];
};

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Check user permissions for repair/release
 */
export const checkPermissions = async (clientId) => {
  const res = await fetch(`${API_URL}/defects-v2/check-permissions?clientId=${clientId}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get authorized users for a client
 */
export const getAuthorizedUsers = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/authorized-users${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Save authorized user
 */
export const saveAuthorizedUser = async (data) => {
  const res = await fetch(`${API_URL}/defects-v2/authorized-users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Delete authorized user
 */
export const deleteAuthorizedUser = async (id) => {
  const res = await fetch(`${API_URL}/defects-v2/authorized-users/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get defect type configs for a client
 */
export const getTypeConfigs = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/type-config${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Save defect type config
 */
export const saveTypeConfig = async (data) => {
  const res = await fetch(`${API_URL}/defects-v2/type-config`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Get general repair/release config for a client
 */
export const getRepairConfig = async (clientId) => {
  const res = await fetch(`${API_URL}/defects-v2/repair-config/${clientId}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Save general repair/release config
 */
export const saveRepairConfig = async (data) => {
  const res = await fetch(`${API_URL}/defects-v2/repair-config`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * Get ALL defects (General tab - no status filter) with pagination
 */
export const getAllDefects = async (clientId, options = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', clientId);
  if (options.status) params.append('status', options.status);
  if (options.page) params.append('page', options.page);
  if (options.pageSize) params.append('pageSize', options.pageSize);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/defects-v2/all${queryString}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get pending repairs (hospital view)
 */
export const getPendingRepairs = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/pending-repairs${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get active serials with defect counts (for RepairStation)
 * Returns serials grouped with pending/repaired/released counts
 */
export const getActiveSerials = async () => {
  const res = await fetch(`${API_URL}/defects-v2/active-serials`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get pending releases
 */
export const getPendingReleases = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/pending-releases${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get defects pending handoff (REPAIRED status - ready to send to QA/SCRAP/MRB)
 */
export const getPendingHandoff = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/pending-handoff${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Handoff defects to QA, SCRAP, or QUARANTINE (MRB)
 * @param {number[]} defectIds - Array of defect IDs
 * @param {string} destination - 'QA', 'SCRAP', or 'QUARANTINE'
 * @param {string} notes - Optional notes
 * @param {number} releaseStationId - Optional release station ID (for QA)
 * @param {number} mrbLocationId - Optional MRB location ID (for QUARANTINE/SCRAP)
 * @param {number} mrbCampaignId - Optional MRB campaign ID (for QUARANTINE/SCRAP)
 */
export const handoffDefects = async (defectIds, destination, notes = '', releaseStationId = null, mrbLocationId = null, mrbCampaignId = null) => {
  const res = await fetch(`${API_URL}/defects-v2/handoff`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ defectIds, destination, notes, releaseStationId, mrbLocationId, mrbCampaignId })
  });
  return res.json();
};

// ============================================================================
// MRB ACTIONS (Quarantine & Scrap)
// ============================================================================

/**
 * Get defects in QUARANTINE status
 */
export const getQuarantineDefects = async () => {
  const res = await fetch(`${API_URL}/defects-v2/quarantine`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get defects in SCRAPPED status (pending confirmation)
 */
export const getScrappedDefects = async () => {
  const res = await fetch(`${API_URL}/defects-v2/scrapped`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Return defect from quarantine to repair
 */
export const returnToRepair = async (defectId, notes = '', repairStationId = null) => {
  const res = await fetch(`${API_URL}/defects-v2/quarantine/${defectId}/return-to-repair`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes, repairStationId })
  });
  return res.json();
};

/**
 * Send defect from quarantine to scrap
 */
export const quarantineToScrap = async (defectId, notes = '') => {
  const res = await fetch(`${API_URL}/defects-v2/quarantine/${defectId}/to-scrap`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes })
  });
  return res.json();
};

/**
 * Release defect from quarantine with deviation
 */
export const releaseWithDeviation = async (defectId, deviationId, notes = '', releaseStationId = null) => {
  const res = await fetch(`${API_URL}/defects-v2/quarantine/${defectId}/release-with-deviation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ deviationId, notes, releaseStationId })
  });
  return res.json();
};

/**
 * Confirm scrap (final disposition)
 */
export const confirmScrap = async (defectId, notes = '') => {
  const res = await fetch(`${API_URL}/defects-v2/scrapped/${defectId}/confirm`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes })
  });
  return res.json();
};

/**
 * Return defect from scrap to quarantine
 */
export const scrapToQuarantine = async (defectId, notes = '') => {
  const res = await fetch(`${API_URL}/defects-v2/scrapped/${defectId}/return-to-quarantine`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes })
  });
  return res.json();
};

/**
 * Get defects currently in repair (IN_REPAIR status)
 */
export const getInRepair = async (clientId) => {
  const params = clientId ? `?clientId=${clientId}` : '';
  const res = await fetch(`${API_URL}/defects-v2/in-repair${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get complete serial/lot history with all defects
 */
export const getSerialHistory = async (clientId, serial = null) => {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', clientId);
  if (serial) params.append('serial', serial);

  const res = await fetch(`${API_URL}/defects-v2/serial-history?${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get stations by type (INSPECTION, REPAIR, RELEASE, MRB)
 */
export const getStationsByType = async (type) => {
  const res = await fetch(`${API_URL}/station-config/stations?type=${type}`, {
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// LOCATION CODES (Trazabilidad física)
// ============================================================================

/**
 * Lookup location code by scanning
 */
export const lookupLocationCode = async (code) => {
  const res = await fetch(`${API_URL}/location-codes/lookup/${encodeURIComponent(code)}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Assign serials to a location (batch)
 */
export const assignToLocation = async (locationCode, serials) => {
  const res = await fetch(`${API_URL}/location-codes/assign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ locationCode, serials })
  });
  return res.json();
};

/**
 * Get WIP by location (real-time dashboard)
 */
export const getWIPByLocation = async () => {
  const res = await fetch(`${API_URL}/location-codes/wip`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get all location codes (for selection)
 */
export const getLocationCodes = async (type = null) => {
  const params = new URLSearchParams({ activeOnly: 'true' });
  if (type) params.append('type', type);
  const res = await fetch(`${API_URL}/location-codes?${params}`, {
    headers: getHeaders()
  });
  return res.json();
};

// ============================================================================
// TRANSFER PACKAGES (Hospital <-> MRB)
// ============================================================================

/**
 * Get pending transfer packages for a destination
 */
export const getPendingTransferPackages = async (destination) => {
  const res = await fetch(`${API_URL}/transfer-packages/pending/${destination}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get serials already in pending packages (for validation)
 */
export const getPendingSerials = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/pending-serials`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get transfer package details
 */
export const getTransferPackageDetails = async (packageId) => {
  const res = await fetch(`${API_URL}/transfer-packages/${packageId}`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Create a transfer package
 * @param {string} originType - 'HOSPITAL' or 'MRB'
 * @param {string} destinationType - 'HOSPITAL' or 'MRB'
 * @param {number[]} defectIds - Array of defect IDs
 * @param {object} options - Optional parameters
 * @param {number} options.mrbCampaignId - MRB Campaign ID
 * @param {number} options.qarId - QAR ID
 * @param {number} options.source8dId - 8D Report ID
 * @param {number} options.alertUserId - User ID to notify on alert
 * @param {string} options.notes - Notes
 * @param {number} options.alertHours - Hours before alert (default 24)
 */
export const createTransferPackage = async (originType, destinationType, defectIds, options = {}) => {
  const {
    mrbCampaignId = null,
    qarId = null,
    source8dId = null,
    alertUserId = null,
    destinationLocationId = null,
    notes = '',
    alertHours = 24
  } = options;

  const res = await fetch(`${API_URL}/transfer-packages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      originType,
      destinationType,
      defectIds,
      mrbCampaignId,
      qarId,
      source8dId,
      alertUserId,
      destinationLocationId,
      notes,
      alertHours
    })
  });
  return res.json();
};

/**
 * Receive a transfer package
 */
export const receiveTransferPackage = async (packageId, notes = '', mrbCampaignId = null, locationId = null) => {
  const res = await fetch(`${API_URL}/transfer-packages/${packageId}/receive`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ notes, mrbCampaignId, locationId })
  });
  return res.json();
};

/**
 * Cancel a transfer package
 */
export const cancelTransferPackage = async (packageId, reason = '') => {
  const res = await fetch(`${API_URL}/transfer-packages/${packageId}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  return res.json();
};

/**
 * Get transfer package alerts (exceeded time)
 */
export const getTransferPackageAlerts = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/status/alerts`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get transfer package stats
 */
export const getTransferPackageStats = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/status/stats`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get summary of material without campaign
 */
export const getNoCampaignSummary = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/summary/no-campaign`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get REWORK defects pending transfer to Hospital
 */
export const getReworkPendingTransfer = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/rework/pending`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get pending packages summary for Hospital (from MRB)
 */
export const getHospitalPendingSummary = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/hospital/pending-summary`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Get campaign assignment matrix for pending packages
 */
export const getCampaignAssignmentMatrix = async () => {
  const res = await fetch(`${API_URL}/transfer-packages/campaign-assignment-matrix`, {
    headers: getHeaders()
  });
  return res.json();
};

/**
 * Bulk assign campaigns to serials
 * @param {Array} assignments - Array of {serialNumber, campaignId, defectId, partId}
 */
export const assignCampaignsBulk = async (assignments) => {
  const res = await fetch(`${API_URL}/transfer-packages/assign-campaigns-bulk`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ assignments })
  });
  return res.json();
};

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get time color based on hours open and config
 */
export const getTimeColor = (hoursOpen, config = {}) => {
  const greenMax = config.colorGreenMaxHours || 24;
  const yellowMax = config.colorYellowMaxHours || 48;

  if (hoursOpen <= greenMax) return 'GREEN';
  if (hoursOpen <= yellowMax) return 'YELLOW';
  return 'RED';
};

/**
 * Get status display info
 */
export const getStatusInfo = (status) => {
  const statusMap = {
    'OPEN': { label: 'Abierto', color: '#ef4444', bgColor: '#fef2f2' },
    'IN_REPAIR': { label: 'En Reparación', color: '#f59e0b', bgColor: '#fffbeb' },
    'PENDING_REPAIR_APPROVAL': { label: 'Aprobación Rep.', color: '#f97316', bgColor: '#fff7ed' },
    'REPAIRED': { label: 'Reparado', color: '#3b82f6', bgColor: '#eff6ff' },
    'IN_VALIDATION': { label: 'En Validación', color: '#8b5cf6', bgColor: '#f5f3ff' },
    'PENDING_RELEASE_APPROVAL': { label: 'Aprobación Lib.', color: '#f97316', bgColor: '#fff7ed' },
    'PENDING_APPROVAL': { label: 'Pendiente Aprobación', color: '#f97316', bgColor: '#fff7ed' },
    'CLOSED': { label: 'Cerrado', color: '#22c55e', bgColor: '#f0fdf4' },
    'RELEASED': { label: 'Cerrado', color: '#22c55e', bgColor: '#f0fdf4' },
    'REJECTED': { label: 'Rechazado', color: '#dc2626', bgColor: '#fef2f2' },
    'QUARANTINE': { label: 'Cuarentena', color: '#6b7280', bgColor: '#f3f4f6' },
    'SCRAPPED': { label: 'Scrap', color: '#1f2937', bgColor: '#e5e7eb' }
  };
  return statusMap[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
};

// ============================================================================
// INLINE REPAIR/RELEASE - Para reparación/liberación en línea (simplificado)
// ============================================================================

/**
 * Repair inline - Mark defect as REPAIRED directly (no IN_REPAIR step)
 */
export const repairInline = async (defectId, data = {}) => {
  console.log('>>> repairService.repairInline called:', { defectId, data });
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/repair-inline`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  console.log('>>> repairService.repairInline result:', result);
  return result;
};

/**
 * Release inline - Mark defect as RELEASED/CLOSED directly
 */
export const releaseInline = async (defectId, data = {}) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/release-inline`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Reject inline - Reject repair, return to OPEN
 */
export const rejectInline = async (defectId, data = {}) => {
  const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/reject-inline`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

/**
 * Check if a serial can receive disposition (MRB validation)
 * Verifies no pending MRB campaign inspections
 * @returns { success, canDispose, reason?, pendingCampaigns? }
 */
export const checkCanDispose = async (serialNumber = null, defectId = null) => {
  const res = await fetch(`${API_URL}/mrb/check-can-dispose`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ serialNumber, defectId })
  });
  return res.json();
};

export default {
  getDefectsBySerial,
  getDefectEvents,
  startRepair,
  completeRepair,
  releaseDefect,
  rejectDefect,
  approveDefect,
  quarantineDefect,
  scrapDefect,
  getRepairTypes,
  getReleaseReasons,
  getRootCauses,
  getDepartments,
  checkPermissions,
  getAuthorizedUsers,
  saveAuthorizedUser,
  deleteAuthorizedUser,
  getTypeConfigs,
  saveTypeConfig,
  getRepairConfig,
  saveRepairConfig,
  getPendingRepairs,
  getPendingReleases,
  getInRepair,
  getSerialHistory,
  getStationsByType,
  lookupLocationCode,
  assignToLocation,
  getWIPByLocation,
  getLocationCodes,
  getTimeColor,
  getStatusInfo,
  // MRB functions
  getQuarantineDefects,
  getScrappedDefects,
  returnToRepair,
  quarantineToScrap,
  releaseWithDeviation,
  confirmScrap,
  scrapToQuarantine,
  // Transfer Packages
  getPendingTransferPackages,
  getPendingSerials,
  getTransferPackageDetails,
  createTransferPackage,
  receiveTransferPackage,
  cancelTransferPackage,
  getTransferPackageAlerts,
  getTransferPackageStats,
  getNoCampaignSummary,
  getReworkPendingTransfer,
  getHospitalPendingSummary,
  getCampaignAssignmentMatrix,
  assignCampaignsBulk,
  // Inline repair/release (line flow)
  repairInline,
  releaseInline,
  rejectInline
};
