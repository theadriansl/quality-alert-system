const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// ============================================================================
// MIDDLEWARE: Verificar permisos por módulo
// ============================================================================
async function checkPermission(module, action = null, section = null) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      // Verificar permiso usando la función de BD
      const result = await query(
        'SELECT check_user_permission($1, $2, $3, $4) as has_permission',
        [userId, module, action, section]
      );

      if (!result.rows[0]?.has_permission) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado al módulo ${module}`,
          requiredPermission: { module, action, section }
        });
      }

      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
      });
    }
  };
}

// ============================================================================
// GET /roles - Listar todos los roles
// ============================================================================
async function getRoles(req, res) {
  try {
    const { includeSystem = 'true', organizationId = null } = req.query;

    let whereClause = '';
    const params = [];

    if (includeSystem === 'false') {
      whereClause = 'WHERE is_system = FALSE';
    }

    if (organizationId) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      params.push(organizationId);
      whereClause += `(organization_id = $${params.length} OR organization_id IS NULL)`;
    }

    const result = await query(`
      SELECT
        r.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id AND ur.is_active = TRUE) as users_count
      FROM roles r
      LEFT JOIN users u ON r.created_by = u.id
      ${whereClause}
      ORDER BY r.is_system DESC, r.name
    `, params);

    const roles = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles',
      error: error.message
    });
  }
}

// ============================================================================
// GET /roles/:id - Obtener rol por ID
// ============================================================================
async function getRoleById(req, res) {
  try {
    const roleId = parseInt(req.params.id);

    const result = await query(`
      SELECT
        r.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM roles r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1
    `, [roleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    const role = transformToCamelCase(result.rows[0]);

    // Obtener usuarios con este rol
    const usersResult = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.department,
        ur.assigned_at, ur.expires_at,
        assigner.first_name || ' ' || assigner.last_name as assigned_by_name
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      LEFT JOIN users assigner ON ur.assigned_by = assigner.id
      WHERE ur.role_id = $1 AND ur.is_active = TRUE
      ORDER BY u.last_name, u.first_name
    `, [roleId]);

    role.users = usersResult.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      role
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rol',
      error: error.message
    });
  }
}

// ============================================================================
// POST /roles - Crear nuevo rol (solo Admin)
// ============================================================================
async function createRole(req, res) {
  try {
    const { name, description, permissions, clearanceLevel = 1, organizationId = null } = req.body;
    const createdBy = req.user.id;

    // Validar nombre
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es requerido'
      });
    }

    // Verificar que no exista un rol con el mismo nombre en la organización
    const existing = await query(
      'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND (organization_id = $2 OR (organization_id IS NULL AND $2 IS NULL))',
      [name.trim(), organizationId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un rol con ese nombre'
      });
    }

    // Insertar rol
    const result = await query(`
      INSERT INTO roles (name, description, permissions, clearance_level, organization_id, is_custom, created_by)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6)
      RETURNING *
    `, [name.trim(), description, JSON.stringify(permissions || {}), clearanceLevel, organizationId, createdBy]);

    const role = transformToCamelCase(result.rows[0]);

    res.status(201).json({
      success: true,
      message: `Rol "${name}" creado exitosamente`,
      role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear rol',
      error: error.message
    });
  }
}

// ============================================================================
// PUT /roles/:id - Actualizar rol (system roles: solo permisos/descripción, no nombre)
// ============================================================================
async function updateRole(req, res) {
  try {
    const roleId = parseInt(req.params.id);
    const { name, description, permissions, clearanceLevel } = req.body;
    const updatedBy = req.user.id;

    // Verificar que el rol existe
    const existing = await query('SELECT * FROM roles WHERE id = $1', [roleId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Los roles del sistema se pueden editar (permisos, descripción, clearance)
    // pero NO se puede cambiar el nombre
    const isSystemRole = existing.rows[0].is_system;
    if (isSystemRole && name !== undefined && name.trim() !== existing.rows[0].name) {
      return res.status(403).json({
        success: false,
        message: 'No se puede cambiar el nombre de un rol del sistema'
      });
    }

    // Construir query de actualización
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (permissions !== undefined) {
      paramCount++;
      updates.push(`permissions = $${paramCount}`);
      values.push(JSON.stringify(permissions));
    }

    if (clearanceLevel !== undefined) {
      paramCount++;
      updates.push(`clearance_level = $${paramCount}`);
      values.push(clearanceLevel);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    updates.push(`created_by = $${paramCount}`); // Para el trigger de auditoría
    values.push(updatedBy);

    paramCount++;
    values.push(roleId);

    const result = await query(`
      UPDATE roles
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const role = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      message: `Rol "${role.name}" actualizado exitosamente`,
      role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar rol',
      error: error.message
    });
  }
}

// ============================================================================
// DELETE /roles/:id - Eliminar rol (solo custom, no system)
// ============================================================================
async function deleteRole(req, res) {
  try {
    const roleId = parseInt(req.params.id);

    // Verificar que el rol existe y no es del sistema
    const existing = await query('SELECT * FROM roles WHERE id = $1', [roleId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    if (existing.rows[0].is_system) {
      return res.status(403).json({
        success: false,
        message: 'No se pueden eliminar roles del sistema'
      });
    }

    // Verificar si hay usuarios con este rol
    const usersCount = await query(
      'SELECT COUNT(*) FROM user_roles WHERE role_id = $1 AND is_active = TRUE',
      [roleId]
    );

    if (parseInt(usersCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: hay ${usersCount.rows[0].count} usuario(s) con este rol asignado`
      });
    }

    // Eliminar
    await query('DELETE FROM roles WHERE id = $1', [roleId]);

    res.json({
      success: true,
      message: `Rol "${existing.rows[0].name}" eliminado exitosamente`
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar rol',
      error: error.message
    });
  }
}

// ============================================================================
// POST /users/:userId/roles - Asignar rol a usuario
// ============================================================================
async function assignRoleToUser(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    const { roleId, expiresAt = null } = req.body;
    const assignedBy = req.user.id;

    // Verificar que el usuario existe
    const userExists = await query('SELECT id, first_name, last_name FROM users WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que el rol existe
    const roleExists = await query('SELECT id, name, permissions FROM roles WHERE id = $1', [roleId]);
    if (roleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Verificar herencia: el que asigna debe tener permisos >= al rol que asigna
    // (Esto se puede expandir según necesidades)
    const canAssign = await query(
      'SELECT can_assign_permission($1, $2, $3) as can_assign',
      [assignedBy, 'users', 'full'] // Simplificado por ahora
    );

    // Verificar si ya tiene el rol asignado
    const existing = await query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (existing.rows.length > 0) {
      // Reactivar si estaba inactivo
      await query(`
        UPDATE user_roles
        SET is_active = TRUE, assigned_by = $3, assigned_at = CURRENT_TIMESTAMP, expires_at = $4
        WHERE user_id = $1 AND role_id = $2
      `, [userId, roleId, assignedBy, expiresAt]);
    } else {
      // Insertar nueva asignación
      await query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [userId, roleId, assignedBy, expiresAt]);
    }

    const user = userExists.rows[0];
    const role = roleExists.rows[0];

    res.json({
      success: true,
      message: `Rol "${role.name}" asignado a ${user.first_name} ${user.last_name}`
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar rol',
      error: error.message
    });
  }
}

// ============================================================================
// DELETE /users/:userId/roles/:roleId - Revocar rol de usuario
// ============================================================================
async function revokeRoleFromUser(req, res) {
  try {
    const userId = parseInt(req.params.userId);
    const roleId = parseInt(req.params.roleId);

    const result = await query(`
      UPDATE user_roles
      SET is_active = FALSE
      WHERE user_id = $1 AND role_id = $2
      RETURNING *
    `, [userId, roleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Rol revocado exitosamente'
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al revocar rol',
      error: error.message
    });
  }
}

// ============================================================================
// GET /users/:userId/roles - Obtener roles de un usuario
// ============================================================================
async function getUserRoles(req, res) {
  try {
    const userId = parseInt(req.params.userId);

    const result = await query(`
      SELECT
        r.*,
        ur.assigned_at,
        ur.expires_at,
        ur.is_active,
        assigner.first_name || ' ' || assigner.last_name as assigned_by_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN users assigner ON ur.assigned_by = assigner.id
      WHERE ur.user_id = $1
      ORDER BY ur.is_active DESC, r.name
    `, [userId]);

    const roles = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles del usuario',
      error: error.message
    });
  }
}

// ============================================================================
// GET /users/:userId/permissions - Obtener permisos efectivos de un usuario
// ============================================================================
async function getUserEffectivePermissions(req, res) {
  try {
    const userId = parseInt(req.params.userId);

    // Obtener todos los roles activos del usuario
    const rolesResult = await query(`
      SELECT r.permissions, r.clearance_level
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `, [userId]);

    // Combinar permisos (el más permisivo gana)
    const effectivePermissions = {};
    let maxClearance = 1;

    for (const row of rolesResult.rows) {
      const perms = row.permissions || {};
      maxClearance = Math.max(maxClearance, row.clearance_level);

      for (const [module, modulePerms] of Object.entries(perms)) {
        if (!effectivePermissions[module]) {
          effectivePermissions[module] = { ...modulePerms };
        } else {
          // Combinar: el acceso más alto gana
          const currentAccess = effectivePermissions[module].access;
          const newAccess = modulePerms.access;
          const accessOrder = { none: 0, view: 1, partial: 2, full: 3 };

          if ((accessOrder[newAccess] || 0) > (accessOrder[currentAccess] || 0)) {
            effectivePermissions[module].access = newAccess;
          }

          // Combinar secciones (OR lógico)
          if (modulePerms.sections) {
            if (!effectivePermissions[module].sections) {
              effectivePermissions[module].sections = {};
            }
            for (const [section, allowed] of Object.entries(modulePerms.sections)) {
              effectivePermissions[module].sections[section] =
                effectivePermissions[module].sections[section] || allowed;
            }
          }

          // Combinar acciones (unión de arrays)
          if (modulePerms.actions) {
            if (!effectivePermissions[module].actions) {
              effectivePermissions[module].actions = [];
            }
            effectivePermissions[module].actions = [
              ...new Set([...effectivePermissions[module].actions, ...modulePerms.actions])
            ];
          }
        }
      }
    }

    res.json({
      success: true,
      userId,
      clearanceLevel: maxClearance,
      permissions: effectivePermissions,
      rolesCount: rolesResult.rows.length
    });
  } catch (error) {
    console.error('Error fetching effective permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener permisos efectivos',
      error: error.message
    });
  }
}

// ============================================================================
// GET /permission-audit-log - Obtener log de auditoría
// ============================================================================
async function getPermissionAuditLog(req, res) {
  try {
    const { limit = 100, offset = 0, action = null, userId = null } = req.query;

    let whereClause = '';
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      whereClause += `WHERE action = $${paramCount}`;
      params.push(action);
    }

    if (userId) {
      paramCount++;
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `(actor_user_id = $${paramCount} OR target_user_id = $${paramCount})`;
      params.push(userId);
    }

    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(parseInt(offset));

    const result = await query(`
      SELECT
        pal.*,
        actor.first_name || ' ' || actor.last_name as actor_name,
        target.first_name || ' ' || target.last_name as target_user_name,
        r.name as role_name
      FROM permission_audit_log pal
      LEFT JOIN users actor ON pal.actor_user_id = actor.id
      LEFT JOIN users target ON pal.target_user_id = target.id
      LEFT JOIN roles r ON pal.target_role_id = r.id
      ${whereClause}
      ORDER BY pal.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, params);

    const logs = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      logs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener log de auditoría',
      error: error.message
    });
  }
}

// ============================================================================
// GET /modules - Obtener lista de módulos disponibles (para UI)
// ============================================================================
async function getAvailableModules(req, res) {
  // Lista estática de módulos del sistema
  const modules = [
    {
      id: '8d',
      name: '8D',
      description: 'Sistema de resolución de problemas 8D',
      icon: '📊',
      sections: [
        { id: 'creation', name: 'Creación (D1-D3)', description: 'Formación de equipo, descripción, contención' },
        { id: 'analysis', name: 'Análisis (D4-D6)', description: 'Causa raíz, acciones correctivas, implementación' },
        { id: 'closure', name: 'Cierre (D7-D8)', description: 'Validación, seguimiento, cierre' }
      ],
      actions: ['create', 'edit', 'view', 'approve', 'reject', 'close']
    },
    {
      id: 'quality_alert',
      name: 'Quality Alert',
      description: 'Alertas de calidad y captura de defectos',
      icon: '⚠️',
      sections: null,
      actions: ['create', 'view', 'respond', 'validate']
    },
    {
      id: 'mrb',
      name: 'MRB',
      description: 'Material Review Board',
      icon: '🔬',
      sections: null,
      actions: ['create', 'view', 'execute', 'validate', 'capture']
    },
    {
      id: 'ecr',
      name: 'ECR/ECO',
      description: 'Cambios de Ingeniería',
      icon: '⚙️',
      sections: [
        { id: 'request', name: 'Solicitud (ECR-1,2)', description: 'Creación y descripción del cambio' },
        { id: 'analysis', name: 'Análisis (ECR-2B,3)', description: 'Análisis de impacto y validación' },
        { id: 'closure', name: 'Cierre (ECR-4)', description: 'Confirmación y cierre' }
      ],
      actions: ['create', 'edit', 'view', 'approve', 'reject']
    },
    {
      id: 'audits',
      name: 'Auditorías',
      description: 'Auditorías internas ISO',
      icon: '📋',
      sections: [
        { id: 'programs', name: 'Programas', description: 'Gestión de programas de auditoría' },
        { id: 'checklists', name: 'Checklists', description: 'Gestión de checklists' },
        { id: 'execution', name: 'Ejecución', description: 'Ejecutar auditorías' },
        { id: 'nc', name: 'No Conformidades', description: 'Gestión de NCs' }
      ],
      actions: ['create', 'edit', 'view', 'execute', 'close_nc']
    },
    {
      id: 'defects',
      name: 'Defectos',
      description: 'Captura y consulta de defectos',
      icon: '🔍',
      sections: [
        { id: 'capture', name: 'Captura', description: 'Capturar defectos' },
        { id: 'query', name: 'Consulta', description: 'Consultar defectos' },
        { id: 'catalogs', name: 'Catálogos', description: 'Administrar catálogos' }
      ],
      actions: ['capture', 'view', 'export', 'config']
    },
    {
      id: 'clients',
      name: 'Clientes',
      description: 'Gestión de clientes y BOM',
      icon: '🏢',
      sections: null,
      actions: ['create', 'edit', 'view', 'delete', 'import', 'export']
    },
    {
      id: 'workload',
      name: 'Workload',
      description: 'Gestión de carga de trabajo',
      icon: '📊',
      sections: null,
      actions: ['view', 'assign', 'edit']
    },
    {
      id: 'users',
      name: 'Usuarios',
      description: 'Gestión de usuarios y roles',
      icon: '👥',
      sections: null,
      actions: ['create', 'edit', 'view', 'delete', 'assign_roles']
    },
    {
      id: 'statistical_tools',
      name: 'Statistical Tools',
      description: 'Herramientas estadísticas: Cp/Cpk, Gage R&R, Pareto, SPC, Taguchi DOE',
      icon: '📈',
      sections: [
        { id: 'cpk', name: 'Cp/Cpk', description: 'Análisis de capacidad de proceso' },
        { id: 'gagerr', name: 'Gage R&R', description: 'Estudios de repetibilidad y reproducibilidad' },
        { id: 'pareto', name: 'Pareto', description: 'Análisis de Pareto' },
        { id: 'spc', name: 'SPC', description: 'Control estadístico de proceso' },
        { id: 'taguchi', name: 'Taguchi DOE', description: 'Diseño de experimentos Taguchi' }
      ],
      actions: ['view', 'create', 'analyze', 'export']
    },
    {
      id: 'work_instructions',
      name: 'Work Instructions',
      description: 'Instrucciones de trabajo con versionamiento',
      icon: '📝',
      sections: null,
      actions: ['create', 'edit', 'view', 'approve', 'publish']
    }
  ];

  res.json({
    success: true,
    modules
  });
}

module.exports = {
  // Middleware
  checkPermission,

  // Roles CRUD
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,

  // User-Role management
  assignRoleToUser,
  revokeRoleFromUser,
  getUserRoles,
  getUserEffectivePermissions,

  // Audit & Utilities
  getPermissionAuditLog,
  getAvailableModules
};
