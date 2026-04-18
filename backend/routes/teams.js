const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Simple teams route for now
router.get('/', auth, async (req, res) => {
  try {
    res.json({ 
      message: 'Teams endpoint working',
      teams: []
    });
  } catch (error) {
    console.error('Teams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;