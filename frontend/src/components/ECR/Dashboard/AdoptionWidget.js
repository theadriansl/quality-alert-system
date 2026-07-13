import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Stage Adoption Progress Widget
 * Shows completion rate for each ECR stage
 */
const AdoptionWidget = ({ adoption = {} }) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      ecr1: 'Change Request Board',
      ecr2: 'Change Description',
      ecr2b: 'Impact Analysis',
      ecr3: 'Validation & Implementation',
      ecr4: 'Closure & Confirmation'
    },
    es: {
      ecr1: 'Tablero de Solicitud',
      ecr2: 'Descripción del Cambio',
      ecr2b: 'Análisis de Impacto',
      ecr3: 'Validación e Implementación',
      ecr4: 'Cierre y Confirmación'
    }
  }[language] || {};

  const stages = [
    { id: 'ecr1', label: 'ECR-1', name: tr.ecr1, color: '#0072CE' },
    { id: 'ecr2', label: 'ECR-2', name: tr.ecr2, color: '#2E7D32' },
    { id: 'ecr2b', label: 'ECR-2B', name: tr.ecr2b, color: '#C77700' },
    { id: 'ecr3', label: 'ECR-3', name: tr.ecr3, color: '#8b5cf6' },
    { id: 'ecr4', label: 'ECR-4', name: tr.ecr4, color: '#ec4899' }
  ];

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    stageRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    labelContainer: {
      width: '70px',
      flexShrink: 0
    },
    label: {
      fontSize: '13px',
      fontWeight: '600'
    },
    name: {
      fontSize: '10px',
      color: t.textMuted,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    progressContainer: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    progressBarOuter: {
      flex: 1,
      height: '8px',
      backgroundColor: t.bgPanel,
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressBarInner: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.5s ease'
    },
    percentage: {
      width: '45px',
      textAlign: 'right',
      fontSize: '14px',
      fontWeight: '700'
    },
    count: {
      width: '60px',
      textAlign: 'right',
      fontSize: '11px',
      color: t.textMuted
    }
  };

  return (
    <div style={styles.container}>
      {stages.map(stage => {
        const stageData = adoption[stage.id] || { completed: 0, total: 0, percentage: 0 };
        const percentage = stageData.percentage || 0;

        return (
          <div key={stage.id} style={styles.stageRow}>
            <div style={styles.labelContainer}>
              <div style={{ ...styles.label, color: stage.color }}>{stage.label}</div>
              <div style={styles.name}>{stage.name}</div>
            </div>

            <div style={styles.progressContainer}>
              <div style={styles.progressBarOuter}>
                <div
                  style={{
                    ...styles.progressBarInner,
                    width: `${percentage}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>

              <div style={{ ...styles.percentage, color: stage.color }}>
                {percentage}%
              </div>

              <div style={styles.count}>
                {stageData.completed}/{stageData.total}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdoptionWidget;
