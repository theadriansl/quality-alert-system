const { query, pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// ECR DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /ecr/dashboard-stats
 * Obtiene estadisticas agregadas para el dashboard
 * Query params: startDate, endDate, clientId, department, changeType, riskLevel
 */
async function getDashboardStats(req, res) {
  try {
    const { startDate, endDate, clientId, department, changeType, riskLevel } = req.query;

    // Construir filtros dinamicos
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`ecr_reports.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`ecr_reports.created_at < $${paramIndex++}::date + interval '1 day'`);
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
    if (riskLevel) {
      const s = `(risk_assessment->>'severity')::int`;
      const o = `(risk_assessment->>'occurrence')::int`;
      const riskConds = {
        'bajo':    `risk_assessment IS NOT NULL AND GREATEST(${s},${o}) <= 3`,
        'medio':   `risk_assessment IS NOT NULL AND GREATEST(${s},${o}) > 3 AND GREATEST(${s},${o}) <= 6`,
        'alto':    `risk_assessment IS NOT NULL AND GREATEST(${s},${o}) > 6 AND NOT (${s} > 6 AND ${o} > 6)`,
        'critico': `risk_assessment IS NOT NULL AND ${s} > 6 AND ${o} > 6`,
      };
      const cond = riskConds[riskLevel.toLowerCase()];
      if (cond) whereConditions.push(cond);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    // For queries that alias ecr_reports as 'e' — replace table-qualified columns
    const whereClauseE = whereClause.replace(/ecr_reports\./g, 'e.');

    // ========================================
    // KPIs Principales
    // ========================================
    const kpisQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected' OR status = 'closed_rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE status = 'closed_rejected') as closed_rejected,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'closed_rejected', 'rejected')) as open,
        AVG(
          CASE WHEN status IN ('closed', 'closed_rejected') AND closed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400
          END
        ) as avg_approval_days,
        CASE
          WHEN COUNT(*) FILTER (WHERE status IN ('closed', 'closed_rejected')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE status = 'closed')::numeric /
            COUNT(*) FILTER (WHERE status IN ('closed', 'closed_rejected'))::numeric * 100,
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
    // Por Departamento Solicitante
    // ========================================
    const byDepartmentQuery = `
      SELECT
        COALESCE(requestor_department, 'Sin departamento') as name,
        COUNT(*) as value
      FROM ecr_reports
      ${whereClause}
      GROUP BY requestor_department
      ORDER BY value DESC
      LIMIT 10
    `;

    const byDepartmentResult = await query(byDepartmentQuery, params);

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
      ${whereClauseE}
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
      ${whereClauseE}
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
      ${whereClauseE}
      GROUP BY e.created_by, u.first_name, u.last_name, e.requestor_name
      ORDER BY count DESC
      LIMIT 5
    `;

    const topResponsiblesResult = await query(topResponsiblesQuery, params);

    // ========================================
    // Matriz de Riesgo (Heat Map) - Lee configuración dinámica
    // ========================================
    // Primero obtener la configuración activa de la matriz de riesgo
    let severityLevels = [
      { label: 'Low', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'High', value: 3 }
    ];
    let occurrenceLevels = [
      { label: 'Low', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'High', value: 3 }
    ];

    try {
      const riskConfigResult = await query(`
        SELECT severity_levels, occurrence_levels
        FROM risk_matrix_config
        WHERE is_active = TRUE
        LIMIT 1
      `);
      if (riskConfigResult.rows.length > 0) {
        severityLevels = riskConfigResult.rows[0].severity_levels || severityLevels;
        occurrenceLevels = riskConfigResult.rows[0].occurrence_levels || occurrenceLevels;
      }
    } catch (e) {
      console.log('Risk config query failed, using defaults:', e.message);
    }

    // Obtener datos crudos de severity/occurrence
    const riskMatrixQuery = `
      SELECT
        (area->>'severity')::int as severity_val,
        (area->>'occurrence')::int as occurrence_val,
        COUNT(*) as count
      FROM ecr_reports,
           jsonb_array_elements(impact_analysis) as area
      WHERE impact_analysis IS NOT NULL
        AND jsonb_array_length(impact_analysis) > 0
        AND (area->>'severity') IS NOT NULL
        AND (area->>'occurrence') IS NOT NULL
      ${whereClause.replace('WHERE', 'AND')}
      GROUP BY severity_val, occurrence_val
    `;

    let riskMatrixResult = { rows: [] };
    try {
      riskMatrixResult = await query(riskMatrixQuery, params);
    } catch (e) {
      console.log('Risk matrix query failed, returning empty:', e.message);
    }

    // Función para mapear valor a nivel configurado
    const mapToLevel = (val, levels) => {
      // Ordenar por value descendente para encontrar el nivel correcto
      const sorted = [...levels].sort((a, b) => b.value - a.value);
      for (const level of sorted) {
        if (val >= level.value) return level.label;
      }
      return levels[0]?.label || 'Unknown';
    };

    // Inicializar matriz con niveles configurados
    const riskMatrix = {};
    severityLevels.forEach(sev => {
      riskMatrix[sev.label] = {};
      occurrenceLevels.forEach(occ => {
        riskMatrix[sev.label][occ.label] = 0;
      });
    });

    // Poblar matriz con datos
    riskMatrixResult.rows.forEach(row => {
      const sevLabel = mapToLevel(row.severity_val, severityLevels);
      const occLabel = mapToLevel(row.occurrence_val, occurrenceLevels);
      if (riskMatrix[sevLabel] && riskMatrix[sevLabel][occLabel] !== undefined) {
        riskMatrix[sevLabel][occLabel] += parseInt(row.count);
      }
    });

    // Obtener las reglas de riesgo configuradas
    let riskRules = [];
    try {
      const rulesResult = await query(`
        SELECT risk_rules FROM risk_matrix_config WHERE is_active = TRUE LIMIT 1
      `);
      if (rulesResult.rows.length > 0 && rulesResult.rows[0].risk_rules) {
        riskRules = rulesResult.rows[0].risk_rules;
      }
    } catch (e) {
      console.log('Risk rules query failed:', e.message);
    }

    // Incluir metadata de niveles para el frontend
    const riskMatrixMeta = {
      severityLevels: severityLevels.map(l => ({ label: l.label, value: l.value })),
      occurrenceLevels: occurrenceLevels.map(l => ({ label: l.label, value: l.value })),
      riskRules: riskRules // [{severity: 1, occurrence: 1, riskLevel: 'low'}, ...]
    };

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
        rework: 0,
        investment: 0,
        overtime: 0,
        logistics: 0,
        other_expense: 0,
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
    // CP Post-Cambio (Capacidad Potencial)
    // ========================================
    let cpStats = { avg: null, capable: 0, marginal: 0, notCapable: 0, total: 0 };
    try {
      const cpResult = await query(`
        SELECT
          ROUND(AVG(cp_post_change), 3) as avg_cp,
          COUNT(*) FILTER (WHERE cp_post_change >= 1.33) as capable,
          COUNT(*) FILTER (WHERE cp_post_change >= 1.0 AND cp_post_change < 1.33) as marginal,
          COUNT(*) FILTER (WHERE cp_post_change < 1.0) as not_capable,
          COUNT(*) FILTER (WHERE cp_post_change IS NOT NULL) as total
        FROM ecr_reports
        ${whereClause}
      `, params);
      if (cpResult.rows.length > 0) {
        const r = cpResult.rows[0];
        cpStats = {
          avg: r.avg_cp ? parseFloat(r.avg_cp) : null,
          capable: parseInt(r.capable) || 0,
          marginal: parseInt(r.marginal) || 0,
          notCapable: parseInt(r.not_capable) || 0,
          total: parseInt(r.total) || 0
        };
      }
    } catch (e) { console.log('CP query failed:', e.message); }

    // ========================================
    // CPK Post-Cambio (Capacidad Real)
    // ========================================
    let cpkStats = { avg: null, capable: 0, marginal: 0, notCapable: 0, total: 0 };
    try {
      const cpkResult = await query(`
        SELECT
          ROUND(AVG(cpk_post_change), 3) as avg_cpk,
          COUNT(*) FILTER (WHERE cpk_post_change >= 1.33) as capable,
          COUNT(*) FILTER (WHERE cpk_post_change >= 1.0 AND cpk_post_change < 1.33) as marginal,
          COUNT(*) FILTER (WHERE cpk_post_change < 1.0) as not_capable,
          COUNT(*) FILTER (WHERE cpk_post_change IS NOT NULL) as total
        FROM ecr_reports
        ${whereClause}
      `, params);
      if (cpkResult.rows.length > 0) {
        const r = cpkResult.rows[0];
        cpkStats = {
          avg: r.avg_cpk ? parseFloat(r.avg_cpk) : null,
          capable: parseInt(r.capable) || 0,
          marginal: parseInt(r.marginal) || 0,
          notCapable: parseInt(r.not_capable) || 0,
          total: parseInt(r.total) || 0
        };
      }
    } catch (e) { console.log('CPK query failed:', e.message); }

    // ========================================
    // Scrap Inicial Promedio
    // ========================================
    let scrapStats = { avg: null, total: 0 };
    try {
      const scrapResult = await query(`
        SELECT
          ROUND(AVG(initial_scrap), 2) as avg_scrap,
          COUNT(*) FILTER (WHERE initial_scrap IS NOT NULL) as total
        FROM ecr_reports
        ${whereClause}
      `, params);
      if (scrapResult.rows.length > 0) {
        const r = scrapResult.rows[0];
        scrapStats = {
          avg: r.avg_scrap ? parseFloat(r.avg_scrap) : null,
          total: parseInt(r.total) || 0
        };
      }
    } catch (e) { console.log('Scrap query failed:', e.message); }

    // ========================================
    // Antigüedad de ECRs Abiertos (Días Abierto)
    // ========================================
    let agingStats = { avgDaysOpen: null, open07: 0, open830: 0, open3190: 0, open90plus: 0, openTotal: 0 };
    try {
      const agingResult = await query(`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400), 1) as avg_days,
          COUNT(*) FILTER (WHERE status IN ('draft','submitted') AND EXTRACT(EPOCH FROM (NOW() - created_at))/86400 <= 7)  as d0_7,
          COUNT(*) FILTER (WHERE status IN ('draft','submitted') AND EXTRACT(EPOCH FROM (NOW() - created_at))/86400 BETWEEN 8 AND 30) as d8_30,
          COUNT(*) FILTER (WHERE status IN ('draft','submitted') AND EXTRACT(EPOCH FROM (NOW() - created_at))/86400 BETWEEN 31 AND 90) as d31_90,
          COUNT(*) FILTER (WHERE status IN ('draft','submitted') AND EXTRACT(EPOCH FROM (NOW() - created_at))/86400 > 90) as d90plus,
          COUNT(*) FILTER (WHERE status IN ('draft','submitted')) as open_total
        FROM ecr_reports
        ${whereClause}
      `, params);
      if (agingResult.rows.length > 0) {
        const r = agingResult.rows[0];
        agingStats = {
          avgDaysOpen: r.avg_days ? parseFloat(r.avg_days) : null,
          open07:    parseInt(r.d0_7)    || 0,
          open830:   parseInt(r.d8_30)   || 0,
          open3190:  parseInt(r.d31_90)  || 0,
          open90plus:parseInt(r.d90plus) || 0,
          openTotal: parseInt(r.open_total) || 0
        };
      }
    } catch (e) { console.log('Aging query failed:', e.message); }

    // ========================================
    // PPAP por Nivel
    // ========================================
    let ppapStats = { byLevel: [], notRequired: 0, pending: 0, withData: 0 };
    try {
      const ppapResult = await query(`
        SELECT
          ppap_status as level,
          COUNT(*) as count
        FROM ecr_reports
        WHERE ppap_status IS NOT NULL
        ${whereClause.replace('WHERE', 'AND')}
        GROUP BY ppap_status
        ORDER BY ppap_status
      `, params);
      ppapStats.byLevel = ppapResult.rows.map(r => ({ level: r.level, count: parseInt(r.count) }));
      ppapStats.withData = ppapStats.byLevel.reduce((sum, r) => sum + r.count, 0);
    } catch (e) { console.log('PPAP query failed:', e.message); }

    // ========================================
    // Auditoría de Cierre
    // ========================================
    let closureAuditStats = {
      totalItems: 0, completed: 0, pending: 0,
      byJudgment: { ok: 0, nok: 0, obs: 0, na: 0 },
      avgRounds: null, ecrsWithAudit: 0
    };
    try {
      const auditResult = await query(`
        SELECT
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE auditor_completed = true) as completed,
          COUNT(*) FILTER (WHERE auditor_completed = false OR auditor_completed IS NULL) as pending,
          COUNT(*) FILTER (WHERE UPPER(auditor_judgment) = 'OK') as ok,
          COUNT(*) FILTER (WHERE UPPER(auditor_judgment) = 'NOK') as nok,
          COUNT(*) FILTER (WHERE UPPER(auditor_judgment) = 'OBS') as obs,
          COUNT(*) FILTER (WHERE UPPER(auditor_judgment) = 'N/A' OR UPPER(auditor_judgment) = 'NA') as na,
          ROUND(AVG(audit_round), 1) as avg_rounds,
          COUNT(DISTINCT ecr_id) as ecrs_with_audit
        FROM ecr_closure_audit_items cai
        JOIN ecr_reports er ON er.id = cai.ecr_id
        ${whereClause.replace(/ecr_reports\./g, 'er.')}
      `, params);
      if (auditResult.rows.length > 0) {
        const r = auditResult.rows[0];
        closureAuditStats = {
          totalItems: parseInt(r.total_items) || 0,
          completed: parseInt(r.completed) || 0,
          pending: parseInt(r.pending) || 0,
          byJudgment: {
            ok: parseInt(r.ok) || 0,
            nok: parseInt(r.nok) || 0,
            obs: parseInt(r.obs) || 0,
            na: parseInt(r.na) || 0
          },
          avgRounds: r.avg_rounds ? parseFloat(r.avg_rounds) : null,
          ecrsWithAudit: parseInt(r.ecrs_with_audit) || 0
        };
      }
    } catch (e) { console.log('Closure audit query failed:', e.message); }

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
          closedRejected: parseInt(kpis.closed_rejected) || 0,
          open: parseInt(kpis.open) || 0,
          avgApprovalDays: parseFloat(kpis.avg_approval_days) || 0,
          effectivenessRate: parseFloat(kpis.effectiveness_rate) || 0
        },
        trends: transformToCamelCase(trendsResult.rows),
        byType: transformToCamelCase(byTypeResult.rows),
        byCategory: transformToCamelCase(byCategoryResult.rows),
        byPriority: transformToCamelCase(byPriorityResult.rows),
        byDepartment: transformToCamelCase(byDepartmentResult.rows),
        byStatus: transformToCamelCase(byStatusResult.rows),
        adoption,
        riskMatrix,
        riskMatrixMeta,
        financialImpact,
        cpStats,
        cpkStats,
        scrapStats,
        agingStats,
        ppapStats,
        closureAuditStats,
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
