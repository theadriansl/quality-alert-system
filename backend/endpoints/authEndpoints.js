const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { transformToCamelCase } = require('../utils/caseTransform');
const { checkWritePermission, getUserPermissions } = require('../middleware/permissionMiddleware');

// POST /auth/login - Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Get user permissions
    const userRole = await getUserPermissions(user.id);
    const permissions = userRole?.permissions || {};
    const clearanceLevel = userRole?.clearance_level || 0;
    const roleName = userRole?.role_name || 'Sin rol';

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        ...transformToCamelCase(userWithoutPassword),
        permissions,
        clearanceLevel,
        roleName
      },
      token: 'fake-jwt-token-' + user.id
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login error',
      error: error.message
    });
  }
}

// Middleware to verify token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.substring(7);

  // Extract user ID from fake token
  const userId = parseInt(token.replace('fake-jwt-token-', ''));

  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = result.rows[0];
    // Check write permissions for POST/PUT/DELETE requests
    checkWritePermission(req, res, next);
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token verification error'
    });
  }
};

// GET /auth/me - Get current user
async function getCurrentUser(req, res) {
  const { password, ...userWithoutPassword } = req.user;

  // Get user permissions
  const userRole = await getUserPermissions(req.user.id);
  const permissions = userRole?.permissions || {};
  const clearanceLevel = userRole?.clearance_level || 0;
  const roleName = userRole?.role_name || 'Sin rol';

  res.json({
    success: true,
    user: {
      ...transformToCamelCase(userWithoutPassword),
      permissions,
      clearanceLevel,
      roleName
    }
  });
}

module.exports = {
  login,
  verifyToken,
  getCurrentUser
};
