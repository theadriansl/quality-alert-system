const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// ============================================================================
// GET /departments - Listar departamentos con jerarquía
// ============================================================================
async function getDepartments(req, res) {
  try {
    const userId = req.user?.id;
    const { organizationId, includeInactive = 'false', flat = 'false' } = req.query;

    // Obtener scope del usuario (qué departamentos puede ver)
    const scopeResult = await query(
      'SELECT department_id FROM get_user_department_scope($1)',
      [userId]
    );
    const allowedDepts = scopeResult.rows.map(r => r.department_id);

    // Verificar si es admin (ve todo)
    const userResult = await query(
      "SELECT user_type, system_role FROM users WHERE id = $1",
      [userId]
    );
    const isAdmin = userResult.rows[0]?.user_type === 'super_admin' ||
                    userResult.rows[0]?.system_role === 'admin';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (!isAdmin && allowedDepts.length > 0) {
      params.push(allowedDepts);
      whereClause += ` AND d.id = ANY($${params.length})`;
    }

    if (organizationId) {
      params.push(parseInt(organizationId));
      whereClause += ` AND d.organization_id = $${params.length}`;
    }

    if (includeInactive !== 'true') {
      whereClause += ' AND d.is_active = TRUE';
    }

    const result = await query(`
      SELECT
        d.*,
        o.name as organization_name,
        p.name as parent_name,
        m.first_name || ' ' || m.last_name as manager_name,
        m.email as manager_email,
        (SELECT COUNT(*)::integer FROM users u WHERE u.department_id = d.id) as users_count,
        (SELECT COUNT(*)::integer FROM departments sub WHERE sub.parent_id = d.id) as subdepartments_count
      FROM departments d
      LEFT JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN departments p ON d.parent_id = p.id
      LEFT JOIN users m ON d.manager_id = m.id
      ${whereClause}
      ORDER BY d.organization_id, d.parent_id NULLS FIRST, d.name
    `, params);

    let departments = result.rows.map(row => transformToCamelCase(row));

    // Si no es flat, construir árbol jerárquico
    if (flat !== 'true') {
      departments = buildDepartmentTree(departments);
    }

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener departamentos',
      error: error.message
    });
  }
}

// Función auxiliar para construir árbol
function buildDepartmentTree(departments) {
  const map = {};
  const roots = [];

  // Crear mapa
  departments.forEach(dept => {
    map[dept.id] = { ...dept, children: [] };
  });

  // Construir árbol
  departments.forEach(dept => {
    if (dept.parentId && map[dept.parentId]) {
      map[dept.parentId].children.push(map[dept.id]);
    } else {
      roots.push(map[dept.id]);
    }
  });

  return roots;
}

// ============================================================================
// GET /departments/:id - Obtener departamento por ID
// ============================================================================
async function getDepartmentById(req, res) {
  try {
    const deptId = parseInt(req.params.id);

    const result = await query(`
      SELECT
        d.*,
        o.name as organization_name,
        p.name as parent_name,
        m.first_name || ' ' || m.last_name as manager_name,
        m.email as manager_email
      FROM departments d
      LEFT JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN departments p ON d.parent_id = p.id
      LEFT JOIN users m ON d.manager_id = m.id
      WHERE d.id = $1
    `, [deptId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    const department = transformToCamelCase(result.rows[0]);

    // Obtener usuarios del departamento
    const usersResult = await query(`
      SELECT id, first_name, last_name, email, position
      FROM users
      WHERE department_id = $1
      ORDER BY last_name, first_name
    `, [deptId]);

    department.users = usersResult.rows.map(row => transformToCamelCase(row));

    // Obtener subdepartamentos
    const subResult = await query(`
      SELECT id, name, code
      FROM departments
      WHERE parent_id = $1 AND is_active = TRUE
      ORDER BY name
    `, [deptId]);

    department.subdepartments = subResult.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener departamento',
      error: error.message
    });
  }
}

// ============================================================================
// POST /departments - Crear departamento
// ============================================================================
async function createDepartment(req, res) {
  try {
    const { name, code, description, parentId, managerId, organizationId = 1 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del departamento es requerido'
      });
    }

    // Generar código si no se proporciona
    const deptCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 45);

    // Verificar código único en la organización
    const existing = await query(
      'SELECT id FROM departments WHERE organization_id = $1 AND code = $2',
      [organizationId, deptCode]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un departamento con ese código en la organización'
      });
    }

    // Verificar que el padre existe (si se especifica)
    if (parentId) {
      const parentExists = await query('SELECT id FROM departments WHERE id = $1', [parentId]);
      if (parentExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El departamento padre no existe'
        });
      }
    }

    // Verificar que el manager no está asignado a otro departamento
    if (managerId) {
      const existingManager = await query(`
        SELECT d.id, d.name FROM departments d
        WHERE d.manager_id = $1
      `, [managerId]);

      if (existingManager.rows.length > 0) {
        const otherDept = existingManager.rows[0];
        return res.status(400).json({
          success: false,
          message: `Este usuario ya es manager de "${otherDept.name}". Un usuario solo puede ser manager de un departamento.`,
          conflictDepartment: otherDept.name
        });
      }
    }

    const result = await query(`
      INSERT INTO departments (organization_id, name, code, description, parent_id, manager_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `, [organizationId, name.trim(), deptCode, description, parentId || null, managerId || null]);

    const department = transformToCamelCase(result.rows[0]);

    res.status(201).json({
      success: true,
      message: `Departamento "${name}" creado exitosamente`,
      department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear departamento',
      error: error.message
    });
  }
}

// ============================================================================
// PUT /departments/:id - Actualizar departamento
// ============================================================================
async function updateDepartment(req, res) {
  try {
    const deptId = parseInt(req.params.id);
    const { name, code, description, parentId, managerId, isActive } = req.body;

    // Verificar que existe
    const existing = await query('SELECT * FROM departments WHERE id = $1', [deptId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    // Verificar que no se asigne como su propio padre
    if (parentId === deptId) {
      return res.status(400).json({
        success: false,
        message: 'Un departamento no puede ser su propio padre'
      });
    }

    // Verificar ciclos (el padre no puede ser un subdepartamento)
    if (parentId) {
      const isDescendant = await query(`
        WITH RECURSIVE dept_tree AS (
          SELECT id, parent_id FROM departments WHERE id = $1
          UNION ALL
          SELECT d.id, d.parent_id FROM departments d
          JOIN dept_tree dt ON d.parent_id = dt.id
        )
        SELECT 1 FROM dept_tree WHERE id = $2
      `, [deptId, parentId]);

      if (isDescendant.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede asignar un subdepartamento como padre (ciclo detectado)'
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (code !== undefined) {
      paramCount++;
      updates.push(`code = $${paramCount}`);
      values.push(code);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (parentId !== undefined) {
      paramCount++;
      updates.push(`parent_id = $${paramCount}`);
      values.push(parentId || null);
    }

    if (managerId !== undefined) {
      // Check if this user is already manager of another department
      if (managerId) {
        const existingManager = await query(`
          SELECT d.id, d.name FROM departments d
          WHERE d.manager_id = $1 AND d.id != $2
        `, [managerId, deptId]);

        if (existingManager.rows.length > 0) {
          const otherDept = existingManager.rows[0];
          return res.status(400).json({
            success: false,
            message: `Este usuario ya es manager de "${otherDept.name}". Un usuario solo puede ser manager de un departamento.`,
            conflictDepartment: otherDept.name
          });
        }
      }

      paramCount++;
      updates.push(`manager_id = $${paramCount}`);
      values.push(managerId || null);

      // Cascade: Update all users in this department to have this manager
      if (managerId) {
        await query(`
          UPDATE users
          SET manager_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE department_id = $2 AND id != $1
        `, [managerId, deptId]);
        console.log(`✅ Updated manager for all users in department ${deptId} to user ${managerId}`);
      }
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    paramCount++;
    values.push(deptId);

    const result = await query(`
      UPDATE departments
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const department = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      message: `Departamento "${department.name}" actualizado`,
      department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar departamento',
      error: error.message
    });
  }
}

// ============================================================================
// DELETE /departments/:id - Eliminar departamento
// ============================================================================
async function deleteDepartment(req, res) {
  try {
    const deptId = parseInt(req.params.id);

    // Verificar que existe
    const existing = await query('SELECT * FROM departments WHERE id = $1', [deptId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    // Verificar que no tiene usuarios
    const usersCount = await query(
      'SELECT COUNT(*) FROM users WHERE department_id = $1',
      [deptId]
    );

    if (parseInt(usersCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: hay ${usersCount.rows[0].count} usuario(s) asignados`
      });
    }

    // Verificar que no tiene subdepartamentos
    const subCount = await query(
      'SELECT COUNT(*) FROM departments WHERE parent_id = $1',
      [deptId]
    );

    if (parseInt(subCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: tiene ${subCount.rows[0].count} subdepartamento(s)`
      });
    }

    // Eliminar (o desactivar)
    await query('DELETE FROM departments WHERE id = $1', [deptId]);

    res.json({
      success: true,
      message: `Departamento "${existing.rows[0].name}" eliminado`
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar departamento',
      error: error.message
    });
  }
}

// ============================================================================
// GET /organizations - Listar organizaciones (Solo Super Admin)
// ============================================================================
async function getOrganizations(req, res) {
  try {
    const result = await query(`
      SELECT
        o.*,
        (SELECT COUNT(*)::integer FROM users u WHERE u.organization_id = o.id) as users_count,
        (SELECT COUNT(*)::integer FROM departments d WHERE d.organization_id = o.id) as departments_count
      FROM organizations o
      ORDER BY o.name
    `);

    const organizations = result.rows.map(row => transformToCamelCase(row));

    res.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener organizaciones',
      error: error.message
    });
  }
}

// ============================================================================
// PUT /organizations/:id/modules - Activar/desactivar módulos (Super Admin)
// ============================================================================
async function updateOrganizationModules(req, res) {
  try {
    const orgId = parseInt(req.params.id);
    const { enabledModules } = req.body;

    if (!Array.isArray(enabledModules)) {
      return res.status(400).json({
        success: false,
        message: 'enabledModules debe ser un array'
      });
    }

    const result = await query(`
      UPDATE organizations
      SET enabled_modules = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [orgId, JSON.stringify(enabledModules)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organización no encontrada'
      });
    }

    const organization = transformToCamelCase(result.rows[0]);

    res.json({
      success: true,
      message: 'Módulos actualizados',
      organization
    });
  } catch (error) {
    console.error('Error updating organization modules:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar módulos',
      error: error.message
    });
  }
}

// ============================================================================
// MIDDLEWARE: Verificar auto-aprobación
// ============================================================================
function checkSelfApproval(createdByField = 'created_by') {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const recordId = req.params.id;
      const action = req.body.action || req.query.action;

      // Si no es una acción de aprobación, continuar
      if (!['approve', 'validate', 'close'].includes(action)) {
        return next();
      }

      // Obtener el creador del registro
      // Necesitamos saber qué tabla consultar, esto se puede pasar como parámetro
      const tableName = req.selfApprovalTable;
      if (!tableName) {
        return next();
      }

      const result = await query(
        `SELECT ${createdByField} FROM ${tableName} WHERE id = $1`,
        [recordId]
      );

      if (result.rows.length > 0) {
        const createdBy = result.rows[0][createdByField];

        if (createdBy === userId) {
          return res.status(403).json({
            success: false,
            message: 'No puedes aprobar/validar/cerrar un registro que tú creaste',
            rule: 'no_self_approval'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error checking self-approval:', error);
      next(); // En caso de error, continuar pero logear
    }
  };
}

// ============================================================================
// MIDDLEWARE: Filtrar por scope de departamento
// ============================================================================
function filterByDepartmentScope(departmentField = 'department_id') {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      // Obtener departamentos permitidos
      const scopeResult = await query(
        'SELECT department_id FROM get_user_department_scope($1)',
        [userId]
      );

      const allowedDepts = scopeResult.rows.map(r => r.department_id);

      // Añadir al request para uso posterior
      req.allowedDepartments = allowedDepts;
      req.departmentField = departmentField;

      next();
    } catch (error) {
      console.error('Error getting department scope:', error);
      req.allowedDepartments = [];
      next();
    }
  };
}

module.exports = {
  // Departments CRUD
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Organizations
  getOrganizations,
  updateOrganizationModules,

  // Middlewares
  checkSelfApproval,
  filterByDepartmentScope
};
