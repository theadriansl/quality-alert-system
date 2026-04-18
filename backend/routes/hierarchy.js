// =====================================================
// ARCHIVO: backend/routes/hierarchy.js
// Rutas para gestión de jerarquías
// =====================================================

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { 
  requireRole, 
  requirePermission, 
  roleHierarchy, 
  rolePermissions,
  getSubordinateRoles,
  canManageUser 
} = require('../middleware/roleAuth');

// GET /hierarchy/roles - Obtener información de roles disponibles
router.get('/roles', authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role;
    const subordinateRoles = getSubordinateRoles(userRole);
    
    res.json({
      success: true,
      data: {
        currentUser: {
          role: userRole,
          level: roleHierarchy[userRole],
          permissions: rolePermissions[userRole]
        },
        hierarchy: roleHierarchy,
        subordinateRoles,
        allRoles: Object.keys(roleHierarchy).map(role => ({
          name: role,
          level: roleHierarchy[role],
          permissions: rolePermissions[role]
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error fetching role information',
      details: error.message
    });
  }
});

// GET /hierarchy/dashboard-config - Configuración del dashboard por rol
router.get('/dashboard-config', authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role;
    
    const dashboardConfigs = {
      'Champion': {
        widgets: [
          'executive_summary',
          'all_projects_overview',
          'team_performance',
          'escalated_issues',
          'financial_metrics',
          'strategic_initiatives'
        ],
        permissions: rolePermissions[userRole],
        navigation: [
          { path: '/projects', label: 'All Projects', icon: 'projects' },
          { path: '/teams', label: 'Team Management', icon: 'teams' },
          { path: '/reports', label: 'Executive Reports', icon: 'reports' },
          { path: '/users', label: 'User Management', icon: 'users' },
          { path: '/settings', label: 'System Settings', icon: 'settings' }
        ]
      },
      'Manager': {
        widgets: [
          'team_projects',
          'task_assignments',
          'deliverables_pending',
          'team_workload',
          'milestone_tracker'
        ],
        permissions: rolePermissions[userRole],
        navigation: [
          { path: '/my-projects', label: 'My Projects', icon: 'projects' },
          { path: '/team', label: 'My Team', icon: 'team' },
          { path: '/assignments', label: 'Task Assignments', icon: 'tasks' },
          { path: '/reports', label: 'Team Reports', icon: 'reports' }
        ]
      },
      'Engineer': {
        widgets: [
          'assigned_tasks',
          'current_deliverables',
          'project_timeline',
          'collaboration_tools',
          'technical_resources'
        ],
        permissions: rolePermissions[userRole],
        navigation: [
          { path: '/tasks', label: 'My Tasks', icon: 'tasks' },
          { path: '/projects', label: 'My Projects', icon: 'projects' },
          { path: '/deliverables', label: 'Deliverables', icon: 'deliverables' },
          { path: '/collaboration', label: 'Team Collaboration', icon: 'team' }
        ]
      },
      'Technician': {
        widgets: [
          'daily_tasks',
          'work_instructions',
          'quality_checks',
          'support_requests'
        ],
        permissions: rolePermissions[userRole],
        navigation: [
          { path: '/daily-work', label: 'Daily Tasks', icon: 'tasks' },
          { path: '/instructions', label: 'Work Instructions', icon: 'instructions' },
          { path: '/support', label: 'Request Support', icon: 'support' }
        ]
      }
    };

    res.json({
      success: true,
      data: {
        role: userRole,
        config: dashboardConfigs[userRole],
        hierarchyLevel: roleHierarchy[userRole]
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error fetching dashboard configuration',
      details: error.message
    });
  }
});

// POST /hierarchy/assign-role - Asignar rol a usuario (solo Champions y Managers)
router.post('/assign-role', 
  authenticateToken, 
  requireRole('Manager'),
  (req, res) => {
    try {
      const { targetUserId, newRole } = req.body;
      const managerRole = req.user.role;

      // Validar que el manager puede asignar este rol
      if (!canManageUser(managerRole, newRole)) {
        return res.status(403).json({
          error: 'Cannot assign role',
          message: `${managerRole} cannot assign ${newRole} role`
        });
      }

      // Aquí iría la lógica para actualizar en base de datos
      // Por ahora simulamos la respuesta
      res.json({
        success: true,
        message: `Role ${newRole} assigned to user ${targetUserId}`,
        data: {
          targetUserId,
          newRole,
          assignedBy: req.user.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error assigning role',
        details: error.message
      });
    }
  }
);

// GET /hierarchy/my-team - Obtener equipo bajo supervisión
router.get('/my-team', 
  authenticateToken,
  requirePermission('manage_team_members'),
  (req, res) => {
    try {
      const managerRole = req.user.role;
      const subordinateRoles = getSubordinateRoles(managerRole);

      // Simular datos del equipo (en producción vendría de BD)
      const teamMembers = [
        {
          id: 1,
          name: 'Juan Pérez',
          email: 'juan@apqp.com',
          role: 'Engineer',
          level: roleHierarchy['Engineer'],
          status: 'active',
          currentProjects: 3,
          completedTasks: 15
        },
        {
          id: 2,
          name: 'María García',
          email: 'maria@apqp.com',
          role: 'Technician',
          level: roleHierarchy['Technician'],
          status: 'active',
          currentProjects: 1,
          completedTasks: 8
        }
      ].filter(member => subordinateRoles.includes(member.role));

      res.json({
        success: true,
        data: {
          manager: {
            role: managerRole,
            level: roleHierarchy[managerRole]
          },
          subordinateRoles,
          teamMembers,
          teamStats: {
            totalMembers: teamMembers.length,
            activeProjects: teamMembers.reduce((sum, member) => sum + member.currentProjects, 0),
            completedTasks: teamMembers.reduce((sum, member) => sum + member.completedTasks, 0)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error fetching team information',
        details: error.message
      });
    }
  }
);

module.exports = router;