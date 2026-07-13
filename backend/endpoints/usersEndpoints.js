const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');
const bcrypt = require('bcryptjs');

// Middleware to require admin role
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user.id;

    // Get user's system_role
    const result = await query(
      'SELECT system_role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const systemRole = result.rows[0].system_role;

    if (systemRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking privileges',
      error: error.message
    });
  }
}

// GET /users/list - Get all users with hierarchy information
async function getUsersList(req, res) {
  try {
    const result = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.position,
        u.department, u.department_id, u.phone, u.extension, u.location,
        u.is_tft_member, u.permissions, u.hierarchy_level, u.manager_id,
        u.system_role, u.can_validate_qar, u.user_type, u.is_auditor,
        u.auditor_areas, u.auditor_certifications,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.position as manager_position,
        d.name as department_name,
        d.code as department_code,
        (
          SELECT json_agg(json_build_object(
            'id', r.id,
            'name', r.name,
            'isSystem', r.is_system,
            'clearanceLevel', r.clearance_level
          ))
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND ur.is_active = TRUE
        ) as assigned_roles,
        (
          SELECT json_agg(json_build_object(
            'id', dept.id,
            'name', dept.name,
            'code', dept.code
          ))
          FROM departments dept
          WHERE dept.manager_id = u.id AND dept.is_active = TRUE
        ) as managed_departments
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.hierarchy_level, u.last_name, u.first_name
    `);

    const users = result.rows.map(row => {
      const user = transformToCamelCase(row);
      // Add manager info if exists
      if (row.manager_first_name) {
        user.manager = {
          id: user.managerId,
          firstName: row.manager_first_name,
          lastName: row.manager_last_name,
          position: row.manager_position,
          name: `${row.manager_first_name} ${row.manager_last_name}`
        };
      }
      return user;
    });

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
}

// PUT /users/:id - Update user information
async function updateUser(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const userData = req.body;

    // Convert camelCase to snake_case for database
    const snakeData = transformToSnakeCase(userData);

    // Build update query dynamically based on provided fields
    const allowedFields = [
      'first_name', 'last_name', 'position', 'role', 'department',
      'department_id', 'phone', 'extension', 'location', 'manager_id',
      'hierarchy_level', 'is_tft_member', 'system_role', 'user_type'
    ];

    const updates = [];
    const values = [];
    let paramCount = 0;

    // If department_id is being changed, auto-assign the department's manager
    let autoAssignManagerId = null;
    if (snakeData.department_id && snakeData.manager_id === undefined) {
      const deptResult = await query('SELECT manager_id FROM departments WHERE id = $1', [snakeData.department_id]);
      if (deptResult.rows.length > 0 && deptResult.rows[0].manager_id) {
        autoAssignManagerId = deptResult.rows[0].manager_id;
        // Don't auto-assign if user would be their own manager
        if (autoAssignManagerId === userId) {
          autoAssignManagerId = null;
        }
      }
    }

    // If manager_id is being changed, check if new manager is a department manager
    // If so, move user to that department (bidirectional sync)
    let autoAssignDeptId = null;
    if (snakeData.manager_id && snakeData.department_id === undefined) {
      const deptResult = await query('SELECT id, name FROM departments WHERE manager_id = $1', [snakeData.manager_id]);
      if (deptResult.rows.length > 0) {
        autoAssignDeptId = deptResult.rows[0].id;
        console.log(`✅ Auto-moving user ${userId} to department "${deptResult.rows[0].name}" (manager's department)`);
      }
    }

    Object.keys(snakeData).forEach(key => {
      if (allowedFields.includes(key) && snakeData[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);

        // Convert empty strings to NULL for integer fields
        let value = snakeData[key];
        if ((key === 'manager_id' || key === 'hierarchy_level' || key === 'department_id') && (value === '' || value === null)) {
          value = null;
        }

        values.push(value);
      }
    });

    // Auto-assign manager from department if not explicitly set
    if (autoAssignManagerId && !snakeData.manager_id) {
      paramCount++;
      updates.push(`manager_id = $${paramCount}`);
      values.push(autoAssignManagerId);
      console.log(`✅ Auto-assigned manager ${autoAssignManagerId} from department to user ${userId}`);
    }

    // Auto-assign department from manager if not explicitly set
    if (autoAssignDeptId && !snakeData.department_id) {
      paramCount++;
      updates.push(`department_id = $${paramCount}`);
      values.push(autoAssignDeptId);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Add updated_at (no parameter needed for CURRENT_TIMESTAMP)
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add user ID as last parameter
    paramCount++;
    values.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, position, role, department,
                department_id, phone, extension, location, manager_id, hierarchy_level,
                is_tft_member, permissions, system_role, user_type, created_at, updated_at
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.firstName} ${updatedUser.lastName} updated successfully`
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
}

// GET /users/qar-validators - Get all users with QAR validator status
async function getQarValidators(req, res) {
  try {
    const result = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role,
        u.department, u.can_validate_qar
      FROM users u
      ORDER BY u.can_validate_qar DESC, u.department, u.last_name
    `);

    const users = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error fetching QAR validators:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching QAR validators',
      error: error.message
    });
  }
}

// PUT /users/:id/qar-validator - Toggle QAR validator status (admin only)
async function toggleQarValidator(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const { canValidateQar } = req.body;

    const result = await query(`
      UPDATE users
      SET can_validate_qar = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, department, can_validate_qar
    `, [canValidateQar, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      user: user,
      message: canValidateQar
        ? `${user.firstName} ${user.lastName} ahora puede validar QARs`
        : `${user.firstName} ${user.lastName} ya no puede validar QARs`
    });
  } catch (error) {
    console.error('Error toggling QAR validator:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating QAR validator status',
      error: error.message
    });
  }
}

// GET /users/:id - Get single user by ID
async function getUserById(req, res) {
  try {
    const userId = parseInt(req.params.id);

    const result = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.position,
        u.department, u.department_id, u.phone, u.extension, u.location,
        u.is_tft_member, u.permissions, u.hierarchy_level, u.manager_id,
        u.system_role, u.user_type,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.position as manager_position,
        d.name as department_name,
        (
          SELECT json_agg(json_build_object(
            'id', r.id,
            'name', r.name,
            'isSystem', r.is_system,
            'permissions', r.permissions
          ))
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND ur.is_active = TRUE
        ) as assigned_roles,
        (
          SELECT json_agg(json_build_object(
            'id', dept.id,
            'name', dept.name,
            'code', dept.code
          ))
          FROM departments dept
          WHERE dept.manager_id = u.id AND dept.is_active = TRUE
        ) as managed_departments
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const row = result.rows[0];
    const user = transformToCamelCase(row);

    // Add manager info if exists
    if (row.manager_first_name) {
      user.manager = {
        id: user.managerId,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name,
        position: row.manager_position,
        name: `${row.manager_first_name} ${row.manager_last_name}`
      };
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
}

// POST /users - Create new user
async function createUser(req, res) {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [userData.email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Insert new user
    const result = await query(`
      INSERT INTO users (
        email, password, first_name, last_name, position, role,
        department, department_id, phone, extension, location,
        manager_id, hierarchy_level, is_tft_member, system_role, user_type,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id, email, first_name, last_name, position, role,
                department, department_id, phone, extension, location,
                manager_id, hierarchy_level, is_tft_member, system_role,
                user_type, created_at, updated_at
    `, [
      userData.email,
      hashedPassword,
      userData.firstName || null,
      userData.lastName || null,
      userData.position || null,
      userData.role || 'user',
      userData.department || null,
      userData.departmentId || null,
      userData.phone || null,
      userData.extension || null,
      userData.location || null,
      userData.managerId || null,
      userData.hierarchyLevel || null,
      userData.isTftMember || false,
      userData.systemRole || 'user',
      userData.userType || 'internal'
    ]);

    const newUser = transformToCamelCase(result.rows[0]);

    res.status(201).json({
      success: true,
      user: newUser,
      message: `User ${newUser.firstName || ''} ${newUser.lastName || ''} created successfully`
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
}

// GET /users/mrb-validators - Get all users with MRB validator status
async function getMrbValidators(req, res) {
  try {
    const result = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role,
        u.department, u.can_validate_mrb
      FROM users u
      ORDER BY u.can_validate_mrb DESC, u.department, u.last_name
    `);

    const users = result.rows.map(row => transformToCamelCase(row));

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching MRB validators:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRB validators', error: error.message });
  }
}

// PUT /users/:id/mrb-validator - Toggle MRB validator status (admin only)
async function toggleMrbValidator(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const { canValidateMrb } = req.body;

    const result = await query(`
      UPDATE users
      SET can_validate_mrb = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, department, can_validate_mrb
    `, [canValidateMrb, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      user,
      message: canValidateMrb
        ? `${user.firstName} ${user.lastName} ahora puede validar campañas MRB`
        : `${user.firstName} ${user.lastName} ya no puede validar campañas MRB`
    });
  } catch (error) {
    console.error('Error toggling MRB validator:', error);
    res.status(500).json({ success: false, message: 'Error updating MRB validator status', error: error.message });
  }
}

module.exports = {
  getUsersList,
  createUser,
  updateUser,
  getUserById,
  requireAdmin,
  getQarValidators,
  toggleQarValidator,
  getMrbValidators,
  toggleMrbValidator
};
