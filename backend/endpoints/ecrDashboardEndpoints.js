const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// ECR DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /ecr/dashboard-stats
 * Obtiene estadisticas agregadas para el dashboard
 * Query params: startDate, endDate, clientId, department, changeType
 */
async function getDashboardStats(req, res) {
  try {
    const { startDate, endDate, clientId, department, changeType } = req.query;

    // Construir filtros dinamicos
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (clientId) {
      whereConditions.push(`client_id = $${paramIndex++}`);
      params.push(parseInt(clientId));
    }
    if (department) {
      whereConditions.push(`requestor_department = $${paramIndex++}`);
      params.push(department);
    }
    if (changeType) {
      whereConditions.push(`change_type = $${paramIndex++}`);
      params.push(changeType);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // ========================================
    // KPIs Principales
    // ========================================
    const kpisQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE status IN ('draft', 'submitted')) as open,
        AVG(
          CASE WHEN status = 'approved' AND closed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400
          END
        ) as avg_approval_days,
        CASE
          WHEN COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE status = 'approved')::numeric /
            COUNT(*) FILTER (WHERE status IN ('approved', 'rejected'))::numeric * 100,
            1
          )
          ELSE 0
        END as effectiveness_rate
      FROM ecr_reports
      ${whereClause}
    `;

    const kpisResult = await query(kpisQuery, params);
    const kpis = kpisResult.rows[0];

    // ========================================
    // Tendencia Mensual (ultimos 12 meses)
    // ========================================
    const trendsQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month_label,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'closed') as closed
      FROM ecr_reports
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const trendsResult = await query(trendsQuery);

    // ========================================
    // Por Tipo de Cambio
    // ========================================
    const byTypeQuery = `
      SELECT
        COALESCE(change_type, 'Other') as name,
        COUNT(*) as value
      FROM ecr_reports
      ${whereClause}
      GROUP BY change_type
      ORDER BY value DESC
    `;

    const byTypeResult = await query(byTypeQuery, params);

    // ========================================
    // Por Categoria
    // ========================================
    const byCategoryQuery = `
      SELECT
        COALESCE(change_category, 'Sin categoria') as name,
        COUNT(*) as value
      FROM ecr_reports
      ${whereClause}
      GROUP BY change_category
      ORDER BY value DESC
    `;

    const byCategoryResult = await query(byCategoryQuery, params);

    // ========================================
    // Por Prioridad
    // ========================================
    const byPriorityQuery = `
      SELECT
        COALESCE(priority, 'medium') as name,
        COUNT(*) as value
      FROM ecr_reports
      ${whereClause}
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `;

    const byPriorityResult = await query(byPriorityQuery, params);

    // ========================================
    // Por Status
    // ========================================
    const byStatusQuery = `
      SELECT
        status as name,
        COUNT(*) as value
      FROM ecr_reports
      ${whereClause}
      GROUP BY status
      ORDER BY value DESC
    `;

    const byStatusResult = await query(byStatusQuery, params);

    // ========================================
    // Adopcion por Etapa
    // ========================================
    const adoptionQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE (stage_completion_status->'ecr1'->>'completed')::boolean = true) as ecr1,
        COUNT(*) FILTER (WHERE (stage_completion_status->'ecr2'->>'completed')::boolean = true) as ecr2,
        COUNT(*) FILTER (WHERE (stage_completion_status->'ecr2b'->>'completed')::boolean = true) as ecr2b,
        COUNT(*) FILTER (WHERE (stage_completion_status->'ecr3'->>'completed')::boolean = true) as ecr3,
        COUNT(*) FILTER (WHERE (stage_completion_status->'ecr4'->>'completed')::boolean = true) as ecr4
      FROM ecr_reports
      ${whereClause}
    `;

    const adoptionResult = await query(adoptionQuery, params);
    const adoptionRaw = adoptionResult.rows[0];
    const total = parseInt(adoptionRaw.total) || 1;

    const adoption = {
      ecr1: { completed: parseInt(adoptionRaw.ecr1) || 0, total, percentage: Math.round((parseInt(adoptionRaw.ecr1) || 0) / total * 100) },
      ecr2: { completed: parseInt(adoptionRaw.ecr2) || 0, total, percentage: Math.round((parseInt(adoptionRaw.ecr2) || 0) / total * 100) },
      ecr2b: { completed: parseInt(adoptionRaw.ecr2b) || 0, total, percentage: Math.round((parseInt(adoptionRaw.ecr2b) || 0) / total * 100) },
      ecr3: { completed: parseInt(adoptionRaw.ecr3) || 0, total, percentage: Math.round((parseInt(adoptionRaw.ecr3) || 0) / total * 100) },
      ecr4: { completed: parseInt(adoptionRaw.ecr4) || 0, total, percentage: Math.round((parseInt(adoptionRaw.ecr4) || 0) / total * 100) }
    };

    // ========================================
    // Top Clientes
    // ========================================
    const topClientsQuery = `
      SELECT
        c.id,
        c.name,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE e.status = 'approved') as approved,
        COUNT(*) FILTER (WHERE e.status = 'rejected') as rejected
      FROM ecr_reports e
      LEFT JOIN clients c ON e.client_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY count DESC
      LIMIT 5
    `;

    const topClientsResult = await query(topClientsQuery, params);

    // ========================================
    // Top Areas Impactadas
    // ========================================
    const topAreasQuery = `
      SELECT
        area->>'areaName' as name,
        COUNT(*) as count
      FROM ecr_reports e,
           jsonb_array_elements(impact_analysis) as area
      ${whereClause.replace('WHERE', whereClause ? 'WHERE' : '')}
      GROUP BY area->>'areaName'
      ORDER BY count DESC
      LIMIT 5
    `;

    let topAreasResult = { rows: [] };
    try {
      topAreasResult = await query(topAreasQuery, params);
    } catch (e) {
      // Si falla (ej: no hay datos), devolver vacio
      console.log('Top areas query failed, returning empty:', e.message);
    }

    // ========================================
    // Top Responsables
    // ========================================
    const topResponsiblesQuery = `
      SELECT
        e.created_by as id,
        COALESCE(u.first_name || ' ' || u.last_name, e.requestor_name, 'Desconocido') as name,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE e.status = 'approved') as approved
      FROM ecr_reports e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      GROUP BY e.created_by, u.first_name, u.last_name, e.requestor_name
      ORDER BY count DESC
      LIMIT 5
    `;

    const topResponsiblesResult = await query(topResponsiblesQuery, params);

    // ========================================
    // Matriz de Riesgo (Heat Map)
    // ========================================
    const riskMatrixQuery = `
      SELECT
        CASE
          WHEN (risk_assessment->>'severity')::int <= 3 THEN 'Low'
          WHEN (risk_assessment->>'severity')::int <= 6 THEN 'Medium'
          ELSE 'High'
        END as severity,
        CASE
          WHEN (risk_assessment->>'occurrence')::int <= 3 THEN 'Low'
          WHEN (risk_assessment->>'occurrence')::int <= 6 THEN 'Medium'
          ELSE 'High'
        END as occurrence,
        COUNT(*) as count
      FROM ecr_reports
      WHERE risk_assessment IS NOT NULL
        AND risk_assessment->>'severity' IS NOT NULL
        AND risk_assessment->>'occurrence' IS NOT NULL
      ${whereClause.replace('WHERE', 'AND')}
      GROUP BY severity, occurrence
    `;

    let riskMatrixResult = { rows: [] };
    try {
      riskMatrixResult = await query(riskMatrixQuery, params);
    } catch (e) {
      console.log('Risk matrix query failed, returning empty:', e.message);
    }

    // Formatear matriz de riesgo
    const riskMatrix = {
      Low: { Low: 0, Medium: 0, High: 0 },
      Medium: { Low: 0, Medium: 0, High: 0 },
      High: { Low: 0, Medium: 0, High: 0 }
    };

    riskMatrixResult.rows.forEach(row => {
      if (riskMatrix[row.severity] && riskMatrix[row.severity][row.occurrence] !== undefined) {
        riskMatrix[row.severity][row.occurrence] = parseInt(row.count);
      }
    });

    // ========================================
    // Departamentos unicos (para filtro)
    // ========================================
    const departmentsQuery = `
      SELECT DISTINCT requestor_department as department
      FROM ecr_reports
      WHERE requestor_department IS NOT NULL
      ORDER BY requestor_department
    `;

    const departmentsResult = await query(departmentsQuery);

    // ========================================
    // Impacto Financiero Agregado
    // ========================================
    const financialQuery = `
      SELECT
        COALESCE(SUM((financial_impact->>'totalCost')::numeric), 0) as total_cost,
        COALESCE(SUM((financial_impact->>'totalSavings')::numeric), 0) as total_savings,
        COALESCE(SUM((financial_impact->>'netImpact')::numeric), 0) as net_impact,
        COUNT(*) FILTER (WHERE (financial_impact->>'netImpact')::numeric > 0) as positive_count,
        COUNT(*) FILTER (WHERE (financial_impact->>'netImpact')::numeric < 0) as negative_count,
        COUNT(*) FILTER (WHERE financial_impact IS NOT NULL AND financial_impact::text != '{}' AND financial_impact::text != 'null') as with_data
      FROM ecr_reports
      ${whereClause}
    `;

    // Desglose por tipo de impacto financiero
    const financialByTypeQuery = `
      SELECT
        item->>'type' as type,
        COALESCE(SUM((item->>'amount')::numeric), 0) as total
      FROM ecr_reports,
           jsonb_array_elements(financial_impact->'items') as item
      WHERE financial_impact->'items' IS NOT NULL
        AND jsonb_array_length(financial_impact->'items') > 0
      ${whereClause.replace('WHERE', 'AND')}
      GROUP BY item->>'type'
    `;

    let financialImpact = {
      totalCost: 0,
      totalSavings: 0,
      netImpact: 0,
      positiveCount: 0,
      negativeCount: 0,
      withData: 0,
      byType: {
        scrap: 0,
        investment: 0,
        overtime: 0,
        other: 0,
        savings: 0
      }
    };
    try {
      const financialResult = await query(financialQuery, params);
      if (financialResult.rows.length > 0) {
        const row = financialResult.rows[0];
        financialImpact = {
          ...financialImpact,
          totalCost: parseFloat(row.total_cost) || 0,
          totalSavings: parseFloat(row.total_savings) || 0,
          netImpact: parseFloat(row.net_impact) || 0,
          positiveCount: parseInt(row.positive_count) || 0,
          negativeCount: parseInt(row.negative_count) || 0,
          withData: parseInt(row.with_data) || 0
        };
      }

      // Obtener desglose por tipo
      const byTypeResult = await query(financialByTypeQuery, params);
      byTypeResult.rows.forEach(row => {
        if (row.type && financialImpact.byType.hasOwnProperty(row.type)) {
          financialImpact.byType[row.type] = parseFloat(row.total) || 0;
        }
      });
    } catch (e) {
      console.log('Financial impact query failed:', e.message);
    }

    // ========================================
    // Respuesta
    // ========================================
    res.json({
      success: true,
      data: {
        kpis: {
          total: parseInt(kpis.total) || 0,
          draft: parseInt(kpis.draft) || 0,
          submitted: parseInt(kpis.submitted) || 0,
          approved: parseInt(kpis.approved) || 0,
          rejected: parseInt(kpis.rejected) || 0,
          closed: parseInt(kpis.closed) || 0,
          open: parseInt(kpis.open) || 0,
          avgApprovalDays: parseFloat(kpis.avg_approval_days) || 0,
          effectivenessRate: parseFloat(kpis.effectiveness_rate) || 0
        },
        trends: transformToCamelCase(trendsResult.rows),
        byType: transformToCamelCase(byTypeResult.rows),
        byCategory: transformToCamelCase(byCategoryResult.rows),
        byPriority: transformToCamelCase(byPriorityResult.rows),
        byStatus: transformToCamelCase(byStatusResult.rows),
        adoption,
        riskMatrix,
        financialImpact,
        topClients: transformToCamelCase(topClientsResult.rows),
        topAreas: transformToCamelCase(topAreasResult.rows),
        topResponsibles: transformToCamelCase(topResponsiblesResult.rows),
        filters: {
          departments: departmentsResult.rows.map(r => r.department).filter(Boolean)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
}

/**
 * GET /ecr/dashboard-config
 * Obtiene la configuracion del dashboard del usuario actual
 */
async function getDashboardConfig(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Buscar configuracion del usuario
    const result = await query(`
      SELECT * FROM user_dashboard_configs
      WHERE user_id = $1 AND dashboard_type = 'ecr' AND is_active = true
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        config: transformToCamelCase(result.rows[0])
      });
    }

    // Si no tiene configuracion, buscar el default global
    const defaultResult = await query(`
      SELECT * FROM user_dashboard_configs
      WHERE dashboard_type = 'ecr' AND is_default = true
      ORDER BY created_at ASC
      LIMIT 1
    `);

    if (defaultResult.rows.length > 0) {
      return res.json({
        success: true,
        config: transformToCamelCase(defaultResult.rows[0]),
        isGlobalDefault: true
      });
    }

    // Si no hay nada, devolver config vacia
    res.json({
      success: true,
      config: null,
      message: 'No dashboard configuration found'
    });

  } catch (error) {
    console.error('Error fetching dashboard config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard configuration',
      error: error.message
    });
  }
}

/**
 * POST /ecr/dashboard-config
 * Guarda la configuracion del dashboard del usuario
 */
async function saveDashboardConfig(req, res) {
  try {
    const userId = req.user?.id;
    const { config, configName, isDefault } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Config is required'
      });
    }

    // Verificar si ya existe una configuracion del usuario
    const existingResult = await query(`
      SELECT id FROM user_dashboard_configs
      WHERE user_id = $1 AND dashboard_type = 'ecr'
      LIMIT 1
    `, [userId]);

    let result;

    if (existingResult.rows.length > 0) {
      // Actualizar existente
      result = await query(`
        UPDATE user_dashboard_configs
        SET
          config = $1,
          config_name = COALESCE($2, config_name),
          is_default = COALESCE($3, is_default),
          updated_at = NOW()
        WHERE user_id = $4 AND dashboard_type = 'ecr'
        RETURNING *
      `, [JSON.stringify(config), configName, isDefault, userId]);
    } else {
      // Crear nuevo
      result = await query(`
        INSERT INTO user_dashboard_configs (user_id, dashboard_type, config, config_name, is_default)
        VALUES ($1, 'ecr', $2, $3, $4)
        RETURNING *
      `, [userId, JSON.stringify(config), configName || 'Mi Dashboard', isDefault || false]);
    }

    res.json({
      success: true,
      message: 'Dashboard configuration saved',
      config: transformToCamelCase(result.rows[0])
    });

  } catch (error) {
    console.error('Error saving dashboard config:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving dashboard configuration',
      error: error.message
    });
  }
}

/**
 * DELETE /ecr/dashboard-config
 * Elimina la configuracion personalizada y vuelve al default
 */
async function resetDashboardConfig(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await query(`
      DELETE FROM user_dashboard_configs
      WHERE user_id = $1 AND dashboard_type = 'ecr' AND is_default = false
    `, [userId]);

    res.json({
      success: true,
      message: 'Dashboard configuration reset to default'
    });

  } catch (error) {
    console.error('Error resetting dashboard config:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting dashboard configuration',
      error: error.message
    });
  }
}

/**
 * GET /ecr/widget-catalog
 * Obtiene el catalogo de widgets disponibles
 */
async function getWidgetCatalog(req, res) {
  try {
    const result = await query(`
      SELECT * FROM dashboard_widget_catalog
      WHERE is_active = true
      ORDER BY sort_order, display_name
    `);

    res.json({
      success: true,
      widgets: transformToCamelCase(result.rows)
    });

  } catch (error) {
    console.error('Error fetching widget catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching widget catalog',
      error: error.message
    });
  }
}

module.exports = {
  getDashboardStats,
  getDashboardConfig,
  saveDashboardConfig,
  resetDashboardConfig,
  getWidgetCatalog
};
