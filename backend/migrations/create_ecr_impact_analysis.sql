-- ============================================================================
-- Migration: Create ECR Impact Analysis Table
-- Date: 2026-01-08
-- Description: Sistema simple de análisis de impacto por áreas para ECR
--              Basado en D3MFG pero adaptado para ECR
-- ============================================================================

-- Tabla de análisis de impacto por área
ALTER TABLE ecr_reports ADD COLUMN IF NOT EXISTS impact_analysis JSONB DEFAULT '[]';

COMMENT ON COLUMN ecr_reports.impact_analysis IS
'Array de áreas de impacto analizadas. Estructura:
[{
  areaName: "Producto",
  areaKey: "product",
  icon: "📦",
  responsibleUserId: 123,
  impactDescription: "Cambian dimensiones del bracket...",
  evidenceFiles: [{name: "drawing.pdf", url: "/uploads/...", uploadedAt: "2026-01-08"}],
  status: "pending|completed"
}]';

-- Actualizar tabla si ya existe pero sin la columna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ecr_reports'
    AND column_name = 'impact_analysis'
  ) THEN
    ALTER TABLE ecr_reports ADD COLUMN impact_analysis JSONB DEFAULT '[]';
  END IF;
END $$;

-- ============================================================================
-- Áreas de impacto preconfigur adas (template)
-- ============================================================================
-- Las áreas se guardan directamente en el JSONB del ECR
-- Esto permite flexibilidad sin necesitar tablas adicionales
--
-- Áreas estándar IATF:
-- 1. Producto (📦) - Dimensiones, materiales, especificaciones
-- 2. Proceso (⚙️) - PFMEA, Control Plan, instrucciones
-- 3. Costos (💰) - Material, mano de obra, inversión
-- 4. Logística (🚚) - Inventario, empaque, etiquetas
-- 5. Calidad (✅) - PPAP, validaciones, certificaciones
-- 6. Riesgos (⚠️) - Evaluación de riesgos
-- ============================================================================

-- Index para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_ecr_impact_analysis ON ecr_reports USING GIN (impact_analysis);

-- ============================================================================
-- Ejemplo de estructura de datos
-- ============================================================================
/*
{
  "impact_analysis": [
    {
      "areaName": "Producto",
      "areaKey": "product",
      "icon": "📦",
      "color": "#3b82f6",
      "responsibleUserId": 5,
      "impactDescription": "El cambio afecta las dimensiones del bracket de soporte. Se requiere actualizar el drawing de Rev A a Rev B.",
      "evidenceFiles": [
        {
          "name": "drawing_rev_B.pdf",
          "url": "/uploads/ecr/123/product_drawing_rev_B.pdf",
          "uploadedAt": "2026-01-08T10:30:00Z"
        },
        {
          "name": "dimensional_comparison.xlsx",
          "url": "/uploads/ecr/123/product_dimensional_comparison.xlsx",
          "uploadedAt": "2026-01-08T10:32:00Z"
        }
      ],
      "status": "completed"
    },
    {
      "areaName": "Proceso",
      "areaKey": "process",
      "icon": "⚙️",
      "color": "#10b981",
      "responsibleUserId": 7,
      "impactDescription": "Se requiere ajustar el fixture de ensamble en la estación 3.",
      "evidenceFiles": [
        {
          "name": "process_impact_assessment.pdf",
          "url": "/uploads/ecr/123/process_impact.pdf",
          "uploadedAt": "2026-01-08T11:00:00Z"
        }
      ],
      "status": "completed"
    }
  ]
}
*/

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ecr_reports' AND column_name = 'impact_analysis';
