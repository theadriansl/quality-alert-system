const express = require('express');
const router = express.Router();
const {
  getAllImpactAreas,
  getImpactAreaById,
  createImpactArea,
  updateImpactArea,
  deleteImpactArea,
  reorderImpactAreas
} = require('../endpoints/impactAreasEndpoints');
const authenticateToken = require('../middleware/auth');

// Impact areas configuration endpoints
router.get('/', authenticateToken, getAllImpactAreas);
router.get('/:id', authenticateToken, getImpactAreaById);
router.post('/', authenticateToken, createImpactArea);
router.put('/:id', authenticateToken, updateImpactArea);
router.delete('/:id', authenticateToken, deleteImpactArea);
router.post('/reorder', authenticateToken, reorderImpactAreas);

module.exports = router;
