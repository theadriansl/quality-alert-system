import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Risk Matrix Heatmap Widget
 * Shows a 3x3 matrix of Severity vs Occurrence
 */
const RiskHeatmapWidget = ({ riskMatrix = {} }) => {
  const { theme: t } = useTheme();
  const levels = ['High', 'Medium', 'Low'];
  const occurrenceLevels = ['Low', 'Medium', 'High'];

  // Default empty matrix
  const defaultMatrix = {
    Low: { Low: 0, Medium: 0, High: 0 },
    Medium: { Low: 0, Medium: 0, High: 0 },
    High: { Low: 0, Medium: 0, High: 0 }
  };

  const matrix = riskMatrix && Object.keys(riskMatrix).length > 0 ? riskMatrix : defaultMatrix;

  // Color scale based on risk level
  const getColor = (severity, occurrence) => {
    const severityLevel = levels.indexOf(severity);
    const occurrenceLevel = occurrenceLevels.indexOf(occurrence);

    // Risk = Severity index (0=High, 1=Med, 2=Low) + Occurrence index (0=Low, 1=Med, 2=High)
    // Lower total = lower risk, Higher total = higher risk
    const riskScore = (2 - severityLevel) + occurrenceLevel;

    // riskScore: 0-1 = green, 2 = yellow, 3-4 = red
    if (riskScore <= 1) return { bg: '#dcfce7', text: '#166534' }; // Green
    if (riskScore === 2) return { bg: '#fef9c3', text: '#854d0e' }; // Yellow
    if (riskScore === 3) return { bg: '#fed7aa', text: '#9a3412' }; // Orange
    return { bg: '#fee2e2', text: '#991b1b' }; // Red
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '70px repeat(3, 1fr)',
      gridTemplateRows: 'auto repeat(3, 1fr) auto',
      gap: '4px',
      flex: 1
    },
    cornerCell: {
      // Empty corner
    },
    headerCell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      padding: '8px 4px'
    },
    rowLabel: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '12px',
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted
    },
    cell: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      minHeight: '50px'
    },
    axisLabel: {
      gridColumn: '2 / -1',
      textAlign: 'center',
      fontSize: '11px',
      color: t.textMuted,
      paddingTop: '8px'
    },
    yAxisLabel: {
      position: 'absolute',
      left: '-20px',
      top: '50%',
      transform: 'rotate(-90deg) translateX(-50%)',
      fontSize: '11px',
      color: t.textMuted,
      whiteSpace: 'nowrap'
    },
    legend: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: `1px solid ${t.border}`
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: t.textMuted
    },
    legendColor: {
      width: '16px',
      height: '16px',
      borderRadius: '4px'
    }
  };

  const legendItems = [
    { label: 'Bajo', color: '#dcfce7' },
    { label: 'Medio', color: '#fef9c3' },
    { label: 'Alto', color: '#fed7aa' },
    { label: 'Critico', color: '#fee2e2' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Corner cell */}
        <div style={styles.cornerCell}></div>

        {/* Column headers (Occurrence) */}
        {occurrenceLevels.map(level => (
          <div key={`col-${level}`} style={styles.headerCell}>
            {level === 'Low' ? 'Baja' : level === 'Medium' ? 'Media' : 'Alta'}
          </div>
        ))}

        {/* Rows (Severity from High to Low) */}
        {levels.map(severity => (
          <React.Fragment key={`row-${severity}`}>
            {/* Row label */}
            <div style={styles.rowLabel}>
              {severity === 'High' ? 'Alta' : severity === 'Medium' ? 'Media' : 'Baja'}
            </div>

            {/* Cells */}
            {occurrenceLevels.map(occurrence => {
              const value = matrix[severity]?.[occurrence] || 0;
              const colors = getColor(severity, occurrence);

              return (
                <div
                  key={`${severity}-${occurrence}`}
                  style={{
                    ...styles.cell,
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}
                  title={`Severidad: ${severity}, Ocurrencia: ${occurrence}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
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
        <div style={styles.axisLabel}>Ocurrencia</div>
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
    </div>
  );
};

export default RiskHeatmapWidget;
