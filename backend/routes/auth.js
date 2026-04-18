const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Login user con array temporal
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body);
    
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        received: { email: !!email, password: !!password }
      });
    }

    // Obtener usuarios del servidor
    const users = req.app.locals.users || [];
    console.log('👥 Available users:', users.map(u => u.email));

    // Buscar usuario
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verificar contraseña (texto plano por ahora)
    if (user.password !== password) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Login successful for:', email);

    // Generar JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      },
      token
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Register user con array temporal
router.post('/register', (req, res) => {
  res.status(501).json({ 
    message: 'Registration not implemented in demo mode. Use test users.',
    testUsers: [
      'admin@8dsystem.com',
      'manager@8dsystem.com', 
      'engineer@8dsystem.com',
      'tech@8dsystem.com'
    ]
  });
});

// Get current user
router.get('/me', require('../middleware/auth'), (req, res) => {
  try {
    console.log('👤 Getting user info for:', req.user);
    
    // Obtener usuarios del servidor
    const users = req.app.locals.users || [];
    
    // Buscar usuario por ID o email
    const user = users.find(u => u.id === req.user.userId || u.email === req.user.email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;