-- ============================================================================
-- Migration 010: ECR Dashboard Configuration
-- ============================================================================
-- Tabla para guardar configuraciones personalizadas del dashboard por usuario
-- Permite que cada usuario tenga su propio layout de widgets
-- ============================================================================

-- Tabla de configuraciones de dashboard
CREATE TABLE IF NOT EXISTS user_dashboard_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_type VARCHAR(50) NOT NULL DEFAULT 'ecr', -- 'ecr', '8d', 'defects', etc.
    config_name VARCHAR(100) DEFAULT 'Mi Dashboard',

    -- Configuración completa en JSONB
    -- Estructura esperada:
    -- {
    --   "widgets": [
    --     {
    --       "id": "widget-1",
    --       "type": "kpi", // kpi, pie, bar, line, table, heatmap, ranking
    --       "title": "Total ECRs",
    --       "config": {
    --         "metric": "count",
    --         "filters": {},
    --         "groupBy": null
    --       },
    --       "position": { "x": 0, "y": 0, "w": 2, "h": 1 }
    --     }
    --   ],
    --   "layout": { "columns": 12, "rowHeight": 100 },
    --   "filters": { "defaultPeriod": "thisMonth" }
    -- }
    config JSONB NOT NULL DEFAULT '{}',

    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Un usuario solo puede tener un default por tipo de dashboard
    CONSTRAINT unique_user_dashboard_default UNIQUE (user_id, dashboard_type, is_default)
        DEFERRABLE INITIALLY DEFERRED
);

-- Tabla de widgets disponibles (catálogo)
CREATE TABLE IF NOT EXISTS dashboard_widget_catalog (
    id SERIAL PRIMARY KEY,
    widget_type VARCHAR(50) NOT NULL UNIQUE, -- 'kpi', 'pie', 'bar', 'line', 'table', 'heatmap', 'ranking'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),

    -- Configuración por defecto del widget
    default_config JSONB DEFAULT '{}',

    -- Métricas disponibles para este tipo de widget
    available_metrics JSONB DEFAULT '[]',

    -- Dimensiones por defecto (grid units)
    default_width INTEGER DEFAULT 2,
    default_height INTEGER DEFAULT 2,
    min_width INTEGER DEFAULT 1,
    min_height INTEGER DEFAULT 1,

    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar widgets disponibles para ECR Dashboard
INSERT INTO dashboard_widget_catalog (widget_type, display_name, description, icon, default_config, available_metrics, default_width, default_height, sort_order)
VALUES
    -- KPIs
    ('kpi_total', 'Total ECRs', 'Muestra el total de ECRs', '📊',
     '{"metric": "total", "showTrend": true}',
     '["total", "byStatus", "byPriority"]',
     2, 1, 1),

    ('kpi_open', 'ECRs Abiertos', 'ECRs en estado draft o pending', '📝',
     '{"metric": "open", "statuses": ["draft", "submitted"], "showTrend": true}',
     '["count", "percentage"]',
     2, 1, 2),

    ('kpi_approved', 'ECRs Aprobados', 'ECRs aprobados', '✅',
     '{"metric": "approved", "showTrend": true}',
     '["count", "percentage", "avgTime"]',
     2, 1, 3),

    ('kpi_rejected', 'ECRs Rechazados', 'ECRs rechazados', '❌',
     '{"metric": "rejected", "showTrend": true}',
     '["count", "percentage"]',
     2, 1, 4),

    ('kpi_avg_time', 'Tiempo Promedio', 'Tiempo promedio de aprobacion', '⏱️',
     '{"metric": "avgApprovalDays", "unit": "days"}',
     '["avgApprovalDays", "avgStageTime"]',
     2, 1, 5),

    ('kpi_effectiveness', 'Tasa Efectividad', 'Porcentaje aprobados vs rechazados', '🎯',
     '{"metric": "effectivenessRate", "format": "percentage"}',
     '["effectivenessRate"]',
     2, 1, 6),

    -- Graficas
    ('chart_trend', 'Tendencia Mensual', 'Grafica de lineas con tendencia', '📈',
     '{"chartType": "line", "period": "12months", "metrics": ["created", "approved"]}',
     '["created", "approved", "rejected", "closed"]',
     6, 3, 10),

    ('chart_by_type', 'Por Tipo de Cambio', 'Distribucion por tipo de cambio', '🥧',
     '{"chartType": "pie", "groupBy": "changeType"}',
     '["Design", "Process", "Material", "Safety", "Administrative", "Other"]',
     4, 3, 11),

    ('chart_by_category', 'Por Categoria', 'Distribucion por categoria', '📊',
     '{"chartType": "bar", "groupBy": "changeCategory", "orientation": "horizontal"}',
     '["Emergency", "Planned", "Continuous Improvement"]',
     4, 3, 12),

    ('chart_by_priority', 'Por Prioridad', 'Distribucion por prioridad', '🔥',
     '{"chartType": "pie", "groupBy": "priority"}',
     '["critical", "high", "medium", "low"]',
     4, 3, 13),

    ('chart_adoption', 'Adopcion por Etapa', 'Barras de progreso por etapa ECR', '📶',
     '{"chartType": "progress", "stages": ["ecr1", "ecr2", "ecr2b", "ecr3", "ecr4"]}',
     '["percentage", "count"]',
     6, 2, 14),

    -- Heat Map
    ('heatmap_risk', 'Matriz de Riesgo', 'Heat map severidad vs ocurrencia', '🎯',
     '{"rows": ["Low", "Medium", "High"], "cols": ["Low", "Medium", "High"]}',
     '["severity", "occurrence"]',
     4, 3, 20),

    -- Rankings
    ('ranking_clients', 'Top Clientes', 'Clientes con mas ECRs', '🏆',
     '{"limit": 5, "orderBy": "count", "direction": "desc"}',
     '["count", "approved", "rejected"]',
     4, 3, 30),

    ('ranking_areas', 'Top Areas Impactadas', 'Areas con mas impacto', '📍',
     '{"limit": 5, "orderBy": "count", "direction": "desc"}',
     '["count"]',
     4, 3, 31),

    ('ranking_responsibles', 'Top Responsables', 'Usuarios que mas crean ECRs', '👤',
     '{"limit": 5, "orderBy": "count", "direction": "desc"}',
     '["count", "approved"]',
     4, 3, 32),

    -- Tabla
    ('table_detail', 'Tabla Detalle', 'Lista de ECRs con filtros', '📋',
     '{"columns": ["ecrNumber", "changeTitle", "clientName", "status", "priority", "createdAt"], "pageSize": 10}',
     '["all"]',
     12, 4, 40)

ON CONFLICT (widget_type) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    default_config = EXCLUDED.default_config,
    available_metrics = EXCLUDED.available_metrics;

-- Configuracion por defecto del dashboard ECR (para nuevos usuarios)
-- Esta es la configuracion que se carga si el usuario no tiene una guardada
INSERT INTO user_dashboard_configs (user_id, dashboard_type, config_name, is_default, config)
SELECT
    1, -- Admin user
    'ecr',
    'Dashboard Por Defecto',
    true,
    '{
      "widgets": [
        {"id": "w1", "type": "kpi_total", "position": {"x": 0, "y": 0, "w": 2, "h": 1}},
        {"id": "w2", "type": "kpi_open", "position": {"x": 2, "y": 0, "w": 2, "h": 1}},
        {"id": "w3", "type": "kpi_approved", "position": {"x": 4, "y": 0, "w": 2, "h": 1}},
        {"id": "w4", "type": "kpi_rejected", "position": {"x": 6, "y": 0, "w": 2, "h": 1}},
        {"id": "w5", "type": "kpi_avg_time", "position": {"x": 8, "y": 0, "w": 2, "h": 1}},
        {"id": "w6", "type": "kpi_effectiveness", "position": {"x": 10, "y": 0, "w": 2, "h": 1}},
        {"id": "w7", "type": "chart_trend", "position": {"x": 0, "y": 1, "w": 6, "h": 3}},
        {"id": "w8", "type": "chart_by_type", "position": {"x": 6, "y": 1, "w": 6, "h": 3}},
        {"id": "w9", "type": "chart_by_category", "position": {"x": 0, "y": 4, "w": 4, "h": 3}},
        {"id": "w10", "type": "chart_adoption", "position": {"x": 4, "y": 4, "w": 8, "h": 2}},
        {"id": "w11", "type": "ranking_clients", "position": {"x": 0, "y": 7, "w": 4, "h": 3}},
        {"id": "w12", "type": "ranking_areas", "position": {"x": 4, "y": 7, "w": 4, "h": 3}},
        {"id": "w13", "type": "ranking_responsibles", "position": {"x": 8, "y": 7, "w": 4, "h": 3}},
        {"id": "w14", "type": "table_detail", "position": {"x": 0, "y": 10, "w": 12, "h": 4}}
      ],
      "layout": {"columns": 12, "rowHeight": 80},
      "filters": {"defaultPeriod": "thisMonth"}
    }'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM user_dashboard_configs
    WHERE user_id = 1 AND dashboard_type = 'ecr' AND is_default = true
);

-- Indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON user_dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_type ON user_dashboard_configs(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_type ON user_dashboard_configs(user_id, dashboard_type);

-- Comentarios
COMMENT ON TABLE user_dashboard_configs IS 'Configuraciones personalizadas de dashboards por usuario';
COMMENT ON TABLE dashboard_widget_catalog IS 'Catalogo de widgets disponibles para dashboards';
COMMENT ON COLUMN user_dashboard_configs.config IS 'Configuracion completa del dashboard en formato JSONB';
