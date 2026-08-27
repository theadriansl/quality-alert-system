const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { emitToUser } = require('../config/socket');

// ============================================================================
// GET /hospital-roles - Listar todos los usuarios con roles de hospital
// ============================================================================
async function getHospitalUsers(req, res) {
  try {
    const result = await query(`
      SELECT * FROM v_hospital_users
      ORDER BY full_name
    `);

    res.json({
      success: true,
      data: result.rows.map(transformToCamelCase)
    });
  } catch (error) {
    console.error('Error getting hospital users:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios de hospital',
      error: error.message
    });
  }
}

// ============================================================================
// GET /hospital-roles/user/:userId - Obtener roles de hospital de un usuario
// ============================================================================
async function getUserHospitalRoles(req, res) {
  try {
    const { userId } = req.params;

    const result = await query(`
      SELECT
        hr.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email,
        cb.first_name || ' ' || cb.last_name as created_by_name
      FROM hospital_user_roles hr
      JOIN users u ON hr.user_id = u.id
      LEFT JOIN users cb ON hr.created_by = cb.id
      WHERE hr.user_id = $1
      ORDER BY hr.hospital_role
    `, [userId]);

    res.json({
      success: true,
      data: result.rows.map(transformToCamelCase)
    });
  } catch (error) {
    console.error('Error getting user hospital roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles de hospital del usuario',
      error: error.message
    });
  }
}

// ============================================================================
// GET /hospital-roles/check/:userId - Verificar permisos de hospital de un usuario
// ============================================================================
async function checkUserHospitalPermissions(req, res) {
  try {
    const { userId } = req.params;

    // Primero verificar si es admin del sistema
    const userResult = await query(`
      SELECT system_role, user_type FROM users WHERE id = $1
    `, [userId]);

    const user = userResult.rows[0];
    const isSystemAdmin = user?.system_role === 'admin' || user?.user_type === 'super_admin';

    // Si es admin del sistema, tiene todos los permisos
    if (isSystemAdmin) {
      return res.json({
        success: true,
        data: {
          userId: parseInt(userId),
          isSystemAdmin: true,
          canRepair: true,
          canRelease: true,
          canScrap: true,
          canUploadProduction: true,
          isHospitalAdmin: true,
          canManageRoles: true,
          canManageDeviations: true,
          hospitalRoles: ['admin']
        }
      });
    }

    // Obtener roles de hospital
    const rolesResult = await query(`
      SELECT hospital_role, assigned_stations, can_manage_roles, can_manage_deviations, can_scrap, can_upload_production
      FROM hospital_user_roles
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    const roles = rolesResult.rows;
    const hospitalRoles = roles.map(r => r.hospital_role);

    const canRepair = hospitalRoles.includes('repairer') || hospitalRoles.includes('admin');
    const canRelease = hospitalRoles.includes('inspector') || hospitalRoles.includes('admin');
    const isHospitalAdmin = hospitalRoles.includes('admin');
    const canManageRoles = roles.some(r => r.can_manage_roles) || isHospitalAdmin;
    const canManageDeviations = roles.some(r => r.can_manage_deviations) || isHospitalAdmin;
    const canScrap = roles.some(r => r.can_scrap) || isHospitalAdmin;
    const canUploadProduction = roles.some(r => r.can_upload_production) || isHospitalAdmin;

    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        isSystemAdmin: false,
        canRepair,
        canRelease,
        canScrap,
        canUploadProduction,
        isHospitalAdmin,
        canManageRoles,
        canManageDeviations,
        hospitalRoles,
        assignedStations: roles.reduce((acc, r) => {
          if (r.assigned_stations) {
            acc[r.hospital_role] = r.assigned_stations;
          }
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error checking hospital permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar permisos de hospital',
      error: error.message
    });
  }
}

// ============================================================================
// POST /hospital-roles - Asignar rol de hospital a usuario
// ============================================================================
async function assignHospitalRole(req, res) {
  try {
    const { userId, hospitalRole, assignedStations = null, canManageRoles = false, canManageDeviations = false, canScrap = false, canUploadProduction = false, notes = null } = req.body;
    const createdBy = req.user?.id;

    // Validar rol
    if (!['repairer', 'inspector', 'admin'].includes(hospitalRole)) {
      return res.status(400).json({
        success: false,
        message: 'Rol de hospital inválido. Debe ser: repairer, inspector, o admin'
      });
    }

    // Verificar si ya existe
    const existing = await query(`
      SELECT id FROM hospital_user_roles
      WHERE user_id = $1 AND hospital_role = $2
    `, [userId, hospitalRole]);

    if (existing.rows.length > 0) {
      // Actualizar existente
      const result = await query(`
        UPDATE hospital_user_roles
        SET is_active = true,
            assigned_stations = $1,
            can_manage_roles = $2,
            can_manage_deviations = $3,
            can_scrap = $4,
            can_upload_production = $5,
            notes = $6,
            updated_at = NOW()
        WHERE user_id = $7 AND hospital_role = $8
        RETURNING *
      `, [assignedStations, canManageRoles, canManageDeviations, canScrap, canUploadProduction, notes, userId, hospitalRole]);

      // Emit WebSocket event
      emitToUser(userId, 'user:hospital-role-updated', {
        userId,
        hospitalRole,
        requiresRefresh: true
      });

      return res.json({
        success: true,
        message: 'Rol de hospital actualizado',
        data: transformToCamelCase(result.rows[0])
      });
    }

    // Crear nuevo
    const result = await query(`
      INSERT INTO hospital_user_roles (user_id, hospital_role, assigned_stations, can_manage_roles, can_manage_deviations, can_scrap, can_upload_production, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [userId, hospitalRole, assignedStations, canManageRoles, canManageDeviations, canScrap, canUploadProduction, notes, createdBy]);

    // Emit WebSocket event
    emitToUser(userId, 'user:hospital-role-assigned', {
      userId,
      hospitalRole,
      requiresRefresh: true
    });

    res.status(201).json({
      success: true,
      message: 'Rol de hospital asignado',
      data: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error assigning hospital role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar rol de hospital',
      error: error.message
    });
  }
}

// ============================================================================
// PUT /hospital-roles/:id - Actualizar rol de hospital
// ============================================================================
async function updateHospitalRole(req, res) {
  try {
    const { id } = req.params;
    const { assignedStations, canManageRoles, canManageDeviations, notes, isActive } = req.body;

    const result = await query(`
      UPDATE hospital_user_roles
      SET assigned_stations = COALESCE($1, assigned_stations),
          can_manage_roles = COALESCE($2, can_manage_roles),
          can_manage_deviations = COALESCE($3, can_manage_deviations),
          notes = COALESCE($4, notes),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [assignedStations, canManageRoles, canManageDeviations, notes, isActive, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol de hospital no encontrado'
      });
    }

    // Emit WebSocket event
    const userId = result.rows[0].user_id;
    emitToUser(userId, 'user:hospital-role-updated', {
      userId,
      hospitalRole: result.rows[0].hospital_role,
      requiresRefresh: true
    });

    res.json({
      success: true,
      message: 'Rol de hospital actualizado',
      data: transformToCamelCase(result.rows[0])
    });
  } catch (error) {
    console.error('Error updating hospital role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar rol de hospital',
      error: error.message
    });
  }
}

// ============================================================================
// DELETE /hospital-roles/:id - Eliminar rol de hospital
// ============================================================================
async function deleteHospitalRole(req, res) {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM hospital_user_roles
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol de hospital no encontrado'
      });
    }

    // Emit WebSocket event
    const userId = result.rows[0].user_id;
    emitToUser(userId, 'user:hospital-role-revoked', {
      userId,
      hospitalRole: result.rows[0].hospital_role,
      requiresRefresh: true
    });

    res.json({
      success: true,
      message: 'Rol de hospital eliminado'
    });
  } catch (error) {
    console.error('Error deleting hospital role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar rol de hospital',
      error: error.message
    });
  }
}

// ============================================================================
// DELETE /hospital-roles/user/:userId/role/:role - Quitar rol específico
// ============================================================================
async function removeUserHospitalRole(req, res) {
  try {
    const { userId, role } = req.params;

    const result = await query(`
      DELETE FROM hospital_user_roles
      WHERE user_id = $1 AND hospital_role = $2
      RETURNING *
    `, [userId, role]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol de hospital no encontrado para este usuario'
      });
    }

    res.json({
      success: true,
      message: 'Rol de hospital removido del usuario'
    });
  } catch (error) {
    console.error('Error removing user hospital role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al remover rol de hospital',
      error: error.message
    });
  }
}

module.exports = {
  getHospitalUsers,
  getUserHospitalRoles,
  checkUserHospitalPermissions,
  assignHospitalRole,
  updateHospitalRole,
  deleteHospitalRole,
  removeUserHospitalRole
};
