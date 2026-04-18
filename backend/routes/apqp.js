const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Simple APQP routes for now
router.get('/phases', auth, async (req, res) => {
  try {
    res.json({ 
      message: 'APQP phases endpoint working',
      phases: [
        { id: 1, name: 'Plan & Define Program' },
        { id: 2, name: 'Product Design & Development' },
        { id: 3, name: 'Process Design & Development' },
        { id: 4, name: 'Product & Process Validation' },
        { id: 5, name: 'Feedback & Corrective Action' }
      ]
    });
  } catch (error) {
    console.error('APQP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;