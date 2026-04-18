const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Get all users (protected route - managers and champions only)
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, email, first_name, last_name, role, department, 
             phone, extension, location, availability, can_assign, is_active
      FROM users 
      WHERE is_active = true 
      ORDER BY role, last_name, first_name
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      extension: user.extension,
      location: user.location,
      availability: user.availability,
      canAssign: user.can_assign,
      isActive: user.is_active
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT u.*, m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = $1 AND u.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department,
        phone: user.phone,
        extension: user.extension,
        location: user.location,
        availability: user.availability,
        emergencyContact: user.emergency_contact,
        canAssign: user.can_assign,
        manager: user.manager_first_name ? {
          name: `${user.manager_first_name} ${user.manager_last_name}`
        } : null,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, extension, location, availability, emergencyContact } = req.body;

    // Check if user can update this profile (self or manager)
    if (req.user.userId !== parseInt(id) && !['manager', 'champion'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const result = await db.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, extension = $4, 
          location = $5, availability = $6, emergency_contact = $7, updated_at = NOW()
      WHERE id = $8 AND is_active = true
      RETURNING id, email, first_name, last_name, role, department
    `, [firstName, lastName, phone, extension, location, availability, emergencyContact, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign manager to user (champions and managers only)
router.put('/:id/assign-manager', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    // Check permissions
    if (!['manager', 'champion'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to assign managers' });
    }

    const result = await db.query(`
      UPDATE users 
      SET manager_id = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING id, first_name, last_name
    `, [managerId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Manager assigned successfully' });

  } catch (error) {
    console.error('Assign manager error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users hierarchy (for org chart)
router.get('/hierarchy/:championId', auth, async (req, res) => {
  try {
    const { championId } = req.params;

    // Get all users under this champion
    const result = await db.query(`
      WITH RECURSIVE user_hierarchy AS (
        SELECT id, email, first_name, last_name, role, department, 
               phone, extension, location, manager_id, can_assign, 0 as level
        FROM users 
        WHERE id = $1 AND is_active = true
        
        UNION ALL
        
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department,
               u.phone, u.extension, u.location, u.manager_id, u.can_assign, h.level + 1
        FROM users u
        INNER JOIN user_hierarchy h ON u.manager_id = h.id
        WHERE u.is_active = true
      )
      SELECT * FROM user_hierarchy ORDER BY level, role, last_name
    `, [championId]);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      extension: user.extension,
      location: user.location,
      managerId: user.manager_id,
      canAssign: user.can_assign,
      level: user.level
    }));

    res.json({ hierarchy: users });

  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;