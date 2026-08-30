import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Risk Matrix Heatmap Widget
 * Shows a dynamic matrix using configured severity, occurrence, and risk rules
 */
const RiskHeatmapWidget = ({ riskMatrix = {}, riskMatrixMeta = {} }) => {
  const { theme: t } = useTheme();

  // Use configured levels or defaults
  const severityLevels = riskMatrixMeta?.severityLevels || [
    { label: 'Low', value: 1 },
    { label: 'Medium', value: 2 },
    { label: 'High', value: 3 }
  ];
  const occurrenceLevels = riskMatrixMeta?.occurrenceLevels || [
    { label: 'Low', value: 1 },
    { label: 'Medium', value: 2 },
    { label: 'High', value: 3 }
  ];
  const riskRules = riskMatrixMeta?.riskRules || [];

  const numCols = occurrenceLevels.length;
  const numRows = severityLevels.length;

  // Get configured risk level for a severity/occurrence combination
  const getRiskLevel = (sevValue, occValue) => {
    const rule = riskRules.find(r => r.severity === sevValue && r.occurrence === occValue);
    return rule?.riskLevel || 'medium';
  };

  // Color based on configured risk level (Bajo, Medio, Alto)
  const getColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low':
        return { bg: t.successBg, text: t.successFg }; // Green - Bajo
      case 'medium':
        return { bg: t.warningBg, text: t.warningFg };  // Yellow - Medio
      case 'high':
        return { bg: t.errorBg, text: t.errorFg }; // Red - Alto
      default:
        return { bg: t.bgPanel, text: t.textMuted }; // Gray - Unknown
    }
  };

  // Short label for display (extract from parentheses or first word)
  const getShortLabel = (label) => {
    if (!label) return '';
    const match = label.match(/\(([^)]+)\)/);
    if (match) return match[1];
    return label.split(' ')[0];
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `80px repeat(${numCols}, 1fr)`,
      gridTemplateRows: `auto repeat(${numRows}, auto) auto`,
      gap: '3px',
    },
    headerCell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '600',
      color: t.textMuted,
      padding: '6px 2px',
      textAlign: 'center'
    },
    rowLabel: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '8px',
      fontSize: '10px',
      fontWeight: '600',
      color: t.textMuted
    },
    cell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      minHeight: '32px'
    },
    axisLabel: {
      gridColumn: '2 / -1',
      textAlign: 'center',
      fontSize: '10px',
      color: t.textMuted,
      paddingTop: '6px'
    },
    legend: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: `1px solid ${t.border}`
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: t.textMuted
    },
    legendColor: {
      width: '12px',
      height: '12px',
      borderRadius: '3px',
      flexShrink: 0
    }
  };

  const legendItems = [
    { label: 'Bajo', color: t.successBg },
    { label: 'Medio', color: t.warningBg },
    { label: 'Alto', color: t.errorBg }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Corner cell */}
        <div></div>

        {/* Column headers (Occurrence) */}
        {occurrenceLevels.map(occ => (
          <div key={`col-${occ.value}`} style={styles.headerCell}>
            {getShortLabel(occ.label)}
          </div>
        ))}

        {/* Rows (Severity) */}
        {severityLevels.map((sev, sevIndex) => (
          <React.Fragment key={`row-${sev.value}`}>
            {/* Row label */}
            <div style={styles.rowLabel}>
              {getShortLabel(sev.label)}
            </div>

            {/* Cells */}
            {occurrenceLevels.map((occ, occIndex) => {
              const value = riskMatrix[sev.label]?.[occ.label] || 0;
              const riskLevel = getRiskLevel(sev.value, occ.value);
              const colors = getColor(riskLevel);

              return (
                <div
                  key={`${sev.value}-${occ.value}`}
                  style={{
                    ...styles.cell,
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}
                  title={`Severidad: ${sev.label}\nOcurrencia: ${occ.label}\nRiesgo: ${riskLevel.toUpperCase()}\nECRs: ${value}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {value}
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* X-Axis Label */}
        <div style={styles.axisLabel}>Ocurrencia →</div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {legendItems.map(item => (
          <div key={item.label} style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: item.color }}></div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Y-Axis Label */}
      <div style={{
        fontSize: '10px',
        color: t.textMuted,
        textAlign: 'center',
        marginTop: '4px'
      }}>
        Severidad ↓
      </div>
    </div>
  );
};

export default RiskHeatmapWidget;
