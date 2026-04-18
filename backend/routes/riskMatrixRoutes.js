const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getActiveRiskMatrix,
  calculateRisk,
  updateRiskMatrix
} = require('../endpoints/riskMatrixEndpoints');

// Get active risk matrix configuration
router.get('/config', authenticateToken, getActiveRiskMatrix);

// Calculate risk level based on category + type
router.post('/calculate', authenticateToken, calculateRisk);

// Update risk matrix configuration (admin only)
router.put('/config', authenticateToken, updateRiskMatrix);

module.exports = router;
