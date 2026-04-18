const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { checkWritePermission } = require('./permissionMiddleware');

// Middleware para autenticar token (soporta tanto JWT real como fake tokens)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'No token provided in Authorization header'
    });
  }

  // Check if it's a fake token (for development)
  if (token.startsWith('fake-jwt-token-')) {
    const userId = parseInt(token.replace('fake-jwt-token-', ''));

    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'User not found'
        });
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].system_role
      };

      // Check write permissions
      return checkWritePermission(req, res, next);
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(500).json({
        error: 'Server error',
        message: 'Token verification failed'
      });
    }
  }

  // Verificar el token JWT real
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      console.log('JWT verification error:', err.message);
      return res.status(403).json({
        error: 'Invalid or expired token',
        message: 'Token verification failed'
      });
    }

    // El token es válido, agregar la info del usuario a req
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // Check write permissions
    checkWritePermission(req, res, next);
  });
};

// Exportar el middleware
module.exports = authenticateToken;