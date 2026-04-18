const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getEightdReports,
  getOpenReports,
  createEightdReport,
  getEightdReportById,
  updateEightdReport,
  getMyAssignedReports
} = require('../controllers/eightdController');
const authenticateToken = require('../middleware/auth');

// Dashboard metrics
router.get('/dashboard/metrics', authenticateToken, getDashboardMetrics);

// Reports endpoints
router.get('/reports', authenticateToken, getEightdReports);
router.get('/reports/open', authenticateToken, getOpenReports);
router.get('/reports/my-assigned', authenticateToken, getMyAssignedReports); // ⭐ NUEVO
router.get('/reports/:id', authenticateToken, getEightdReportById);
router.post('/reports', authenticateToken, createEightdReport);
router.put('/reports/:id', authenticateToken, updateEightdReport);

module.exports = router;