-- Risk Matrix Configuration Table
-- This table stores the configurable risk assessment matrix for ECR/ECO changes

CREATE TABLE IF NOT EXISTS risk_matrix_config (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(100) DEFAULT 'Default Risk Matrix',
  is_active BOOLEAN DEFAULT TRUE,

  -- Configuración de categorías de cambio
  change_categories JSONB DEFAULT '[
    {"value": "emergency", "label": "Emergency", "description": "Urgent/reactive changes"},
    {"value": "planned", "label": "Planned", "description": "Scheduled changes"},
    {"value": "continuous_improvement", "label": "Continuous Improvement", "description": "KAIZEN activities"}
  ]',

  -- Configuración de tipos de cambio
  change_types JSONB DEFAULT '[
    {"value": "design", "label": "Design Change", "description": "Product design modifications"},
    {"value": "process", "label": "Process Change", "description": "Manufacturing process changes"},
    {"value": "material", "label": "Material Change", "description": "Raw material or component changes"},
    {"value": "safety", "label": "Safety Change", "description": "Safety-related modifications"},
    {"value": "administrative", "label": "Administrative", "description": "Documentation/admin updates"},
    {"value": "layout", "label": "Layout Change", "description": "Work area layout modifications"},
    {"value": "other", "label": "Other", "description": "Other types of changes"}
  ]',

  -- Descripción de niveles de riesgo
  risk_levels JSONB DEFAULT '{
    "high": {
      "label": "Alto Riesgo",
      "color": "#ef4444",
      "icon": "🔴",
      "description": "Aprobación de Managers de las Areas involucradas requerida antes de que los cambios sean hechos",
      "disclaimer": "Riesgo de seguridad y riesgo de tiempo alto de paro de producción",
      "examples": [
        "Procesos que necesita hacer backup en caso de que no funcione (actualización de equipos o PLC)",
        "Afectación al sistema de pokayokes, cámaras de visión, registro de trazabilidad de datos",
        "Modificación, adiciones o eliminaciones de equipos o áreas que requiere evaluación de seguridad",
        "Requiere evaluación de seguridad para el cliente o el empleado",
        "Tiene riesgo de incendio y/o necesita una orden de trabajo y setup especial para trabajo de alto riesgo",
        "Nuevas herramientas de torque o cambios significativos en herramientas críticas"
      ]
    },
    "medium": {
      "label": "Riesgo Medio",
      "color": "#f59e0b",
      "icon": "🟡",
      "description": "Se requiere notificar a la gerencia después de que los cambios han sido hechos",
      "disclaimer": "Cambios de riesgo medio requieren validación por áreas directamente afectadas",
      "examples": [
        "Procesos de subensamble: agregar, eliminar o modificar",
        "Kitting: adiciones, eliminaciones o modificaciones",
        "Cambio de hoja de operación, secuencia de montaje o de ajuste",
        "Cambio de herramienta (por modelo, tipo o requerimiento del proceso)",
        "Mejoras de equipos o herramientas (sin afectar seguridad o parámetros críticos)",
        "Cambios de parámetros de equipos de prueba o proceso fuera de lo especificado",
        "Cambios de logística/mejoras de proceso"
      ]
    },
    "low": {
      "label": "Bajo Riesgo",
      "color": "#10b981",
      "icon": "🟢",
      "description": "Acciones no requeridas, el alcance de los futuros proyectos ya está en marcha y su afectación pasa casi desapercibida",
      "disclaimer": "Cambios de bajo riesgo pueden requerir validación simplificada",
      "examples": [
        "Requerimiento de diseño que no involucra Riesgo Alto ni Medio",
        "Cambios en horarios de operaciones (soldadura, ensamble u otros procesos)",
        "Herramientas de torque: reparación a condición original o ajustes dentro de parámetros",
        "Reparaciones de equipos o herramientas en estado original",
        "Ensayos funcionales",
        "Cambios tecnológicos menores o actualizaciones temporales",
        "Cambios en estándares de calidad internos",
        "Cambios en manejo de materiales a granel"
      ]
    }
  }',

  -- Matriz de reglas: Category + Type → Risk Level + Suggested Areas
  risk_matrix_rules JSONB DEFAULT '[
    {
      "category": "emergency",
      "type": "design",
      "riskLevel": "high",
      "suggestedAreas": ["Design/Engineering", "Quality", "Safety", "Manufacturing"],
      "reasoning": "Emergency design changes affect customer satisfaction and safety"
    },
    {
      "category": "emergency",
      "type": "safety",
      "riskLevel": "high",
      "suggestedAreas": ["Safety", "Quality", "Design/Engineering", "Manufacturing", "Maintenance"],
      "reasoning": "Safety emergencies require comprehensive validation"
    },
    {
      "category": "emergency",
      "type": "process",
      "riskLevel": "high",
      "suggestedAreas": ["Manufacturing", "Quality", "Safety", "Design/Engineering"],
      "reasoning": "Emergency process changes require immediate and thorough validation"
    },
    {
      "category": "planned",
      "type": "design",
      "riskLevel": "medium",
      "suggestedAreas": ["Design/Engineering", "Quality", "Manufacturing"],
      "reasoning": "Planned design changes require engineering and quality validation"
    },
    {
      "category": "planned",
      "type": "process",
      "riskLevel": "medium",
      "suggestedAreas": ["Manufacturing", "Quality", "Design/Engineering"],
      "reasoning": "Process improvements require manufacturing and quality validation"
    },
    {
      "category": "planned",
      "type": "material",
      "riskLevel": "medium",
      "suggestedAreas": ["Supply Chain/Purchasing", "Quality", "Design/Engineering", "Manufacturing"],
      "reasoning": "Material changes require supply chain and quality validation"
    },
    {
      "category": "planned",
      "type": "safety",
      "riskLevel": "high",
      "suggestedAreas": ["Safety", "Quality", "Design/Engineering", "Manufacturing"],
      "reasoning": "Planned safety changes still require comprehensive validation"
    },
    {
      "category": "continuous_improvement",
      "type": "process",
      "riskLevel": "low",
      "suggestedAreas": ["Manufacturing", "Quality"],
      "reasoning": "KAIZEN process improvements typically have low risk"
    },
    {
      "category": "continuous_improvement",
      "type": "layout",
      "riskLevel": "low",
      "suggestedAreas": ["Manufacturing", "Quality"],
      "reasoning": "Layout changes for continuous improvement typically have low risk"
    },
    {
      "category": "continuous_improvement",
      "type": "administrative",
      "riskLevel": "low",
      "suggestedAreas": ["Quality"],
      "reasoning": "Administrative updates require minimal validation"
    },
    {
      "category": "planned",
      "type": "administrative",
      "riskLevel": "low",
      "suggestedAreas": ["Quality"],
      "reasoning": "Planned administrative changes are typically low risk"
    }
  ]',

  -- Disclaimer legal
  legal_disclaimer TEXT DEFAULT '⚠️ IMPORTANTE: Las sugerencias de riesgo y áreas son únicamente orientativas basadas en la configuración definida por su organización. La Review Board es responsable de evaluar cada caso específico y determinar las áreas de validación necesarias según el contexto y los estándares de calidad aplicables.',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- Insert default configuration
INSERT INTO risk_matrix_config (config_name, is_active, created_at)
VALUES ('Default Risk Matrix Configuration', TRUE, NOW())
ON CONFLICT DO NOTHING;

-- Index for quick lookup of active configuration
CREATE INDEX IF NOT EXISTS idx_risk_matrix_active ON risk_matrix_config(is_active);

-- Comments for documentation
COMMENT ON TABLE risk_matrix_config IS 'Configurable risk assessment matrix for ECR/ECO changes';
COMMENT ON COLUMN risk_matrix_config.change_categories IS 'Array of available change categories (emergency, planned, continuous_improvement)';
COMMENT ON COLUMN risk_matrix_config.change_types IS 'Array of available change types (design, process, material, etc.)';
COMMENT ON COLUMN risk_matrix_config.risk_levels IS 'Object defining risk levels (high, medium, low) with labels, colors, and descriptions';
COMMENT ON COLUMN risk_matrix_config.risk_matrix_rules IS 'Array of rules mapping category+type to risk level and suggested areas';
COMMENT ON COLUMN risk_matrix_config.legal_disclaimer IS 'Legal disclaimer text shown to users';
