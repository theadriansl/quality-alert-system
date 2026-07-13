const express = require('express');
const router = express.Router();
const {
  getAllECRReports,
  getECRById,
  createECRReport,
  updateECRReport,
  submitECRForValidation,
  closeECR,
  deleteECRReport,
  getCustomAreasHistory,
  uploadECREvidence,
  upload,
  // Closure Audit Items
  getClosureAuditItems,
  saveClosureAuditItems,
  deleteClosureAuditItem,
  uploadClosureAuditItemFile,
  deleteClosureAuditItemFile,
  resendClosureAuditItem,
  revertClosureAuditItem,
  getClosureAuditItemHistory,
  closureAuditUpload,
  getECRAuditLog
} = require('../endpoints/ecrEndpoints');
const {
  getECRApprovalStatus,
  submitECRForApproval,
  approveECR,
  rejectECR,
  approveClosureECR,
  rejectClosureECR,
  submitClosureForApproval
} = require('../endpoints/ecrApprovalEndpoints');
const {
  getDashboardStats,
  getDashboardConfig,
  saveDashboardConfig,
  resetDashboardConfig,
  getWidgetCatalog
} = require('../endpoints/ecrDashboardEndpoints');
const { getQualityTargets, updateQualityTargets } = require('../endpoints/ecrQualityTargetsEndpoints');
const authenticateToken = require('../middleware/auth');

// ECR Reports endpoints
router.get('/reports', authenticateToken, getAllECRReports);
router.get('/reports/:id', authenticateToken, getECRById);
router.post('/reports', authenticateToken, createECRReport);
router.put('/reports/:id', authenticateToken, updateECRReport);
router.delete('/reports/:id', authenticateToken, deleteECRReport);

// ECR workflow actions
router.post('/reports/:id/submit', authenticateToken, submitECRForValidation);
router.post('/reports/:id/close', authenticateToken, closeECR);

// ECR custom areas history
router.get('/custom-areas-history', authenticateToken, getCustomAreasHistory);

// ECR Dashboard endpoints (MUST be before /:id routes to avoid conflicts)
router.get('/dashboard-stats', authenticateToken, getDashboardStats);
router.get('/dashboard-config', authenticateToken, getDashboardConfig);
router.post('/dashboard-config', authenticateToken, saveDashboardConfig);
router.delete('/dashboard-config', authenticateToken, resetDashboardConfig);
router.get('/widget-catalog', authenticateToken, getWidgetCatalog);

// Quality Targets (must be before /:id routes)
router.get('/quality-targets', authenticateToken, getQualityTargets);
router.put('/quality-targets', authenticateToken, updateQualityTargets);

// ECR evidence upload
router.post('/:id/upload-evidence', authenticateToken, upload.array('evidence', 10), uploadECREvidence);

// ECR approval endpoints (ECR-3)
router.get('/:id/approval-status', authenticateToken, getECRApprovalStatus);
router.post('/:id/submit-for-approval', authenticateToken, submitECRForApproval);
router.post('/:id/approve', authenticateToken, approveECR);
router.post('/:id/reject', authenticateToken, rejectECR);

// ECR closure approval endpoints (ECR-4)
router.post('/:id/closure-submit', authenticateToken, submitClosureForApproval);
router.post('/:id/closure-approve', authenticateToken, approveClosureECR);
router.post('/:id/closure-reject', authenticateToken, rejectClosureECR);

// ECR Closure Audit Items endpoints
router.get('/:id/closure-audit-items', authenticateToken, getClosureAuditItems);
router.put('/:id/closure-audit-items', authenticateToken, saveClosureAuditItems);
router.delete('/:id/closure-audit-items/:itemId', authenticateToken, deleteClosureAuditItem);
router.post('/:id/closure-audit-items/:itemId/files', authenticateToken, closureAuditUpload.single('file'), uploadClosureAuditItemFile);
router.delete('/:id/closure-audit-items/:itemId/files/:fileId', authenticateToken, deleteClosureAuditItemFile);
router.post('/:id/closure-audit-items/:itemId/resend', authenticateToken, resendClosureAuditItem);
router.post('/:id/closure-audit-items/:itemId/revert', authenticateToken, revertClosureAuditItem);
router.get('/:id/closure-audit-items/:itemId/history', authenticateToken, getClosureAuditItemHistory);

// ECR Audit Log
router.get('/:id/audit-log', authenticateToken, getECRAuditLog);

module.exports = router;
