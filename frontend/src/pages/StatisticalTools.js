import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeSelector, useTheme } from '../context/ThemeContext';
import DatasetTab from '../components/StatTools/DatasetTab';
import HistogramTab from '../components/StatTools/HistogramTab';
import ParetoTab from '../components/StatTools/ParetoTab';
import CapabilityTab from '../components/StatTools/CapabilityTab';
import ControlChartsTab from '../components/StatTools/ControlChartsTab';
import RegressionTab from '../components/StatTools/RegressionTab';
import GageRRTab from '../components/StatTools/GageRRTab';
import TaguchiTab from '../components/StatTools/TaguchiTab';

const TABS = [
  { id: 'datasets',    label: 'Datasets',      icon: '📊' },
  { id: 'histogram',   label: 'Histogram',     icon: '📈' },
  { id: 'pareto',      label: 'Pareto',        icon: '📉' },
  { id: 'capability',  label: 'Capability',    icon: '🎯' },
  { id: 'spc',         label: 'Control Charts',icon: '📋' },
  { id: 'regression',  label: 'Regression',    icon: '📐' },
  { id: 'gagerr',      label: 'Gage R&R',      icon: '🔧' },
  { id: 'taguchi',     label: 'Taguchi DOE',   icon: '🧪' }
];

// ── Info content per tab ─────────────────────────────────────────────────────
const TAB_INFO = {
  datasets: {
    title: '📊 Datasets',
    summary: 'Administración de conjuntos de datos para los análisis estadísticos.',
    sections: [
      {
        heading: '¿Qué es?',
        body: 'Un dataset es una tabla de datos que sirve como fuente para cualquier herramienta de análisis. Puede contener columnas numéricas, categóricas o de fecha.'
      },
      {
        heading: 'Formatos soportados',
        items: ['CSV — columnas separadas por coma o punto y coma', 'Excel (.xlsx, .xls) — primera hoja', 'La primera fila debe contener los nombres de columna']
      },
      {
        heading: 'Buenas prácticas',
        items: [
          'Usa nombres de columna descriptivos y sin espacios (ej. "diametro_mm")',
          'Elimina filas en blanco o con datos faltantes antes de subir',
          'Un dataset puede ser reutilizado por múltiples análisis'
        ]
      }
    ]
  },
  histogram: {
    title: '📈 Histograma',
    summary: 'Visualiza la distribución de frecuencias de un conjunto de datos numéricos.',
    sections: [
      {
        heading: '¿Cuándo usarlo?',
        body: 'Cuando necesitas entender cómo se distribuyen tus datos: si son simétricos, sesgados, bimodales o si contienen valores atípicos.'
      },
      {
        heading: 'Cómo interpretar',
        items: [
          'Forma campana (normal) → proceso estable y predecible',
          'Sesgo a la derecha → cola larga en valores altos, mediana < media',
          'Sesgo a la izquierda → cola larga en valores bajos, mediana > media',
          'Bimodal (dos picos) → posiblemente dos poblaciones mezcladas',
          'Barras truncadas → especificaciones o límites de muestreo'
        ]
      },
      {
        heading: 'Parámetros clave',
        items: [
          'Bins (intervalos): más bins = más detalle, menos bins = visión global',
          'Regla de Sturges: bins ≈ 1 + 3.32 × log₁₀(n)',
          'La curva de densidad normal superpuesta ayuda a evaluar normalidad'
        ]
      }
    ]
  },
  pareto: {
    title: '📉 Diagrama de Pareto',
    summary: 'Identifica las causas más frecuentes o costosas aplicando el principio 80/20.',
    sections: [
      {
        heading: 'Principio de Pareto',
        body: 'El 80% de los efectos provienen del 20% de las causas. El diagrama ordena los defectos/causas de mayor a menor frecuencia y muestra el porcentaje acumulado.'
      },
      {
        heading: 'Cómo interpretar',
        items: [
          'Las barras más altas (izquierda) son las prioridades de acción',
          'La línea acumulada al 80% marca el "cuello de botella vital"',
          'Enfoca los recursos en las primeras 2-3 causas para máximo impacto',
          'Si todas las barras son similares, no hay un factor dominante'
        ]
      },
      {
        heading: 'Aplicaciones típicas en QMS',
        items: [
          'Tipos de defectos más frecuentes por línea',
          'Causas raíz de rechazos en MRB',
          'Categorías de no conformidades en auditorías',
          'Clientes con mayor número de alertas (QAR)'
        ]
      }
    ]
  },
  capability: {
    title: '🎯 Análisis de Capacidad de Proceso',
    summary: 'Mide si tu proceso puede cumplir consistentemente con las especificaciones del cliente.',
    sections: [
      {
        heading: 'Índices de capacidad',
        items: [
          'Cp — Capacidad potencial (solo dispersión, ignora centrado)',
          'Cpk — Capacidad real (considera dispersión + descentrado)',
          'Pp / Ppk — Igual que Cp/Cpk pero con desviación estándar total (incluye variación entre subgrupos)',
          'Regla general: Cpk ≥ 1.33 = proceso capaz; Cpk ≥ 1.67 = proceso muy capaz'
        ]
      },
      {
        heading: 'Interpretación de Cpk',
        items: [
          'Cpk < 1.00 → El proceso produce defectos fuera de especificación',
          'Cpk 1.00–1.33 → Apenas capaz; requiere monitoreo estricto',
          'Cpk 1.33–1.67 → Proceso capaz; estándar de la industria automotriz',
          'Cpk ≥ 1.67 → Proceso muy capaz (Six Sigma objetivo: Cpk ≈ 2.0)'
        ]
      },
      {
        heading: 'Requisito previo',
        body: 'El análisis de capacidad asume que los datos siguen una distribución normal y que el proceso está bajo control estadístico. Verifica primero con una carta de control.'
      }
    ]
  },
  spc: {
    title: '📋 Cartas de Control (SPC)',
    summary: 'Monitorea la estabilidad de un proceso en el tiempo y detecta causas especiales de variación.',
    sections: [
      {
        heading: 'Tipos de cartas',
        items: [
          'X̄-R (Xbar-R) — Media y rango de subgrupos pequeños (n = 2–10)',
          'X̄-S (Xbar-S) — Media y desviación estándar (subgrupos grandes n > 10)',
          'I-MR (Individuales) — Un dato por subgrupo; procesos continuos',
          'P — Proporción de defectuosos (tamaño de muestra variable)',
          'NP — Número de defectuosos (tamaño de muestra constante)',
          'C / U — Conteo de defectos por unidad'
        ]
      },
      {
        heading: 'Señales de alarma (Reglas de Nelson)',
        items: [
          '1 punto fuera de los límites de control (UCL/LCL)',
          '9 puntos consecutivos en el mismo lado de la línea central',
          '6 puntos consecutivos con tendencia creciente o decreciente',
          '2 de 3 puntos consecutivos en zona A (> 2σ del centro)',
          '4 de 5 puntos consecutivos en zona B (> 1σ del centro)'
        ]
      },
      {
        heading: 'Variación común vs. especial',
        items: [
          'Variación común (ruido) → inherente al sistema, solo administración puede reducirla',
          'Causa especial (señal) → evento externo; debe investigarse y eliminarse'
        ]
      }
    ]
  },
  regression: {
    title: '📐 Regresión Lineal',
    summary: 'Modela la relación entre una variable dependiente y una o más variables independientes.',
    sections: [
      {
        heading: '¿Cuándo usarla?',
        body: 'Cuando quieres predecir un resultado (Y) a partir de uno o más factores (X), o cuantificar la fuerza y dirección de su relación.'
      },
      {
        heading: 'Métricas clave',
        items: [
          'R² (R-cuadrada) — % de variación de Y explicada por el modelo. R² = 1 es ajuste perfecto',
          'R² ajustada — Penaliza por agregar variables innecesarias (usar en regresión múltiple)',
          'p-valor del coeficiente — Si p < 0.05, el predictor es estadísticamente significativo',
          'Error estándar residual (RSE) — Magnitud típica del error de predicción'
        ]
      },
      {
        heading: 'Interpretación de la pendiente (β)',
        body: 'β = 2.5 significa que por cada unidad que aumenta X, Y aumenta en promedio 2.5 unidades (manteniendo los demás predictores constantes en regresión múltiple).'
      },
      {
        heading: 'Supuestos del modelo',
        items: [
          'Linealidad — La relación X-Y es lineal',
          'Homocedasticidad — Varianza constante de los residuos',
          'Independencia — Las observaciones no están correlacionadas',
          'Normalidad de los residuos — Para inferencia válida'
        ]
      }
    ]
  },
  gagerr: {
    title: '🔧 Gage R&R (MSA)',
    summary: 'Evalúa si el sistema de medición (instrumento + operadores) es adecuado para el proceso.',
    sections: [
      {
        heading: 'Componentes de variación',
        items: [
          'Repetibilidad (EV) — Variación cuando el mismo operador mide la misma pieza varias veces',
          'Reproducibilidad (AV) — Variación entre operadores que miden la misma pieza',
          'Gage R&R — Repetibilidad + Reproducibilidad combinadas',
          'Part-to-Part — Variación real entre piezas (lo que queremos medir)'
        ]
      },
      {
        heading: 'Criterios AIAG MSA',
        items: [
          '%GRR < 10% → Sistema de medición ACEPTABLE ✅',
          '%GRR 10–30% → MARGINAL — aceptable según importancia de la característica ⚠️',
          '%GRR > 30% → INACEPTABLE — el sistema de medición necesita mejorarse ❌'
        ]
      },
      {
        heading: 'NDC (Número de Categorías Distintas)',
        items: [
          'NDC ≥ 5 → El sistema puede distinguir al menos 5 categorías de producto',
          'NDC < 5 → El instrumento no tiene suficiente resolución',
          'NDC = floor(1.41 × σ_parte / σ_GRR)'
        ]
      },
      {
        heading: 'Diseño del estudio',
        body: 'Mínimo recomendado: 10 partes × 3 operadores × 2 réplicas = 60 mediciones. Las partes deben representar el rango completo de la variación del proceso.'
      }
    ]
  },
  taguchi: {
    title: '🧪 Taguchi DOE',
    summary: 'Diseño de experimentos robusto para optimizar un proceso con el mínimo número de corridas.',
    sections: [
      {
        heading: '¿Qué es un Diseño de Experimentos?',
        body: 'Un DOE permite evaluar múltiples factores simultáneamente en vez de cambiar uno a la vez, encontrando la combinación óptima de parámetros de forma eficiente.'
      },
      {
        heading: 'Arrays ortogonales disponibles',
        items: [
          'L4 — 4 corridas, hasta 3 factores a 2 niveles',
          'L8 — 8 corridas, hasta 7 factores a 2 niveles',
          'L9 — 9 corridas, hasta 4 factores a 3 niveles',
          'L16 — 16 corridas, hasta 15 factores a 2 niveles'
        ]
      },
      {
        heading: 'Tipos de señal-ruido (S/N)',
        items: [
          'Menor es mejor (Smaller is Better) — Ej. defectos, tiempo de ciclo, vibración',
          'Mayor es mejor (Larger is Better) — Ej. resistencia, rendimiento, vida útil',
          'Nominal es mejor (Nominal is Best) — Ej. dimensiones con tolerancia bilateral'
        ]
      },
      {
        heading: 'Cómo interpretar los resultados',
        items: [
          'El factor con mayor rango S/N tiene más influencia sobre el resultado',
          'Selecciona el nivel que maximiza S/N para cada factor independientemente',
          'La configuración óptima puede no haberse corrido en el experimento — el modelo la predice'
        ]
      }
    ]
  }
};

// ── Info Modal ───────────────────────────────────────────────────────────────
const InfoModal = ({ tabId, onClose }) => {
  const { theme: t } = useTheme();
  const info = TAB_INFO[tabId];
  if (!info) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: t.bgCard, borderRadius: '12px',
          border: `1px solid ${t.border}`, width: '100%', maxWidth: '580px',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: `1px solid ${t.border}`, flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: t.text }}>
              {info.title}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textMuted }}>
              {info.summary}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: t.textMuted, padding: '4px 8px',
              borderRadius: '6px', lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {info.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: i < info.sections.length - 1 ? '20px' : 0 }}>
              <h3 style={{
                margin: '0 0 8px', fontSize: '13px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: t.accent
              }}>
                {section.heading}
              </h3>
              {section.body && (
                <p style={{ margin: 0, fontSize: '14px', color: t.text, lineHeight: '1.6' }}>
                  {section.body}
                </p>
              )}
              {section.items && (
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {section.items.map((item, j) => (
                    <li key={j} style={{
                      fontSize: '13px', color: t.text, lineHeight: '1.7',
                      paddingLeft: '4px'
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${t.border}`,
          flexShrink: 0, textAlign: 'right'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: '6px',
              backgroundColor: t.accent, color: 'white', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500'
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const StatisticalTools = () => {
  const { theme: t } = useTheme();
  const [activeTab, setActiveTab] = useState('datasets');
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();

  const activeTabData = TABS.find(tab => tab.id === activeTab);
  const hasInfo = !!TAB_INFO[activeTab];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'datasets':   return <DatasetTab />;
      case 'histogram':  return <HistogramTab />;
      case 'pareto':     return <ParetoTab />;
      case 'capability': return <CapabilityTab />;
      case 'spc':        return <ControlChartsTab />;
      case 'regression': return <RegressionTab />;
      case 'gagerr':     return <GageRRTab />;
      case 'taguchi':    return <TaguchiTab />;
      default:           return <DatasetTab />;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: t.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: t.text, margin: 0 }}>
            📊 Statistical Analysis Tools
          </h1>
          <p style={{ color: t.textDim, marginTop: '5px' }}>
            Quality analysis tools for process improvement
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeSelector />
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px', borderRadius: '6px',
              border: `1px solid ${t.border}`, backgroundColor: t.bgCard,
              color: t.text, cursor: 'pointer', fontSize: '13px'
            }}
          >
            ← Módulos
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', backgroundColor: t.bgPanel,
        padding: '4px', borderRadius: '8px', marginBottom: '20px', overflowX: 'auto'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              backgroundColor: activeTab === tab.id ? t.bgCard : 'transparent',
              color: activeTab === tab.id ? t.text : t.textDim,
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        backgroundColor: t.bgCard, borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '500px', overflow: 'hidden'
      }}>
        {/* Content header bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${t.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{activeTabData?.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: t.text }}>
              {activeTabData?.label}
            </span>
          </div>
          {hasInfo && (
            <button
              onClick={() => setShowInfo(true)}
              title="Ver información y ayuda de este módulo"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                border: `1px solid ${t.border}`, backgroundColor: t.bgPanel,
                color: t.textMuted, fontSize: '13px', fontWeight: '500',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '15px' }}>ℹ️</span>
              <span>¿Cómo usar?</span>
            </button>
          )}
        </div>

        <div style={{ padding: '20px' }}>
          {renderTabContent()}
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <InfoModal tabId={activeTab} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
};

export default StatisticalTools;
