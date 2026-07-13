import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Top Ranking Widget
 * Shows top items in a list format with rankings
 */
const RankingWidget = ({
  data = [],
  nameKey = 'name',
  valueKey = 'count',
  valueLabel = 'ECRs',
  showMedals = true,
  maxItems = 5,
  color = '#0072CE'
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      noDataAvailable: 'No data available',
      noName: 'No name',
      approved: 'approved'
    },
    es: {
      noDataAvailable: 'No hay datos disponibles',
      noName: 'Sin nombre',
      approved: 'aprobados'
    }
  }[language] || {};
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      transition: 'background-color 0.2s'
    },
    rankContainer: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    rankNumber: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.textMuted
    },
    info: {
      flex: 1,
      minWidth: 0
    },
    name: {
      fontSize: '14px',
      fontWeight: '500',
      color: t.text,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    subtext: {
      fontSize: '11px',
      color: t.textMuted
    },
    valueContainer: {
      textAlign: 'right'
    },
    value: {
      fontSize: '16px',
      fontWeight: '700',
      color: t.text
    },
    valueLabel: {
      fontSize: '10px',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    emptyState: {
      textAlign: 'center',
      padding: '20px',
      color: t.textMuted,
      fontSize: '13px'
    }
  };

  const getMedalIcon = (rank) => {
    if (!showMedals) return null;

    const iconProps = { size: 20 };

    switch (rank) {
      case 1:
        return <Trophy {...iconProps} color="#fbbf24" fill="#fbbf24" />;
      case 2:
        return <Medal {...iconProps} color="#9ca3af" fill="#9ca3af" />;
      case 3:
        return <Award {...iconProps} color="#cd7f32" fill="#cd7f32" />;
      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div style={styles.emptyState}>
        {tr.noDataAvailable}
      </div>
    );
  }

  const displayData = data.slice(0, maxItems);

  return (
    <div style={styles.container}>
      {displayData.map((item, index) => {
        const rank = index + 1;
        const name = item[nameKey] || tr.noName;
        const value = item[valueKey] || 0;
        const medalIcon = getMedalIcon(rank);

        return (
          <div
            key={`rank-${index}-${name}`}
            style={{
              ...styles.row,
              backgroundColor: rank <= 3 ? `${color}08` : '#FAFBFC'
            }}
          >
            <div style={styles.rankContainer}>
              {medalIcon || (
                <span style={styles.rankNumber}>#{rank}</span>
              )}
            </div>

            <div style={styles.info}>
              <div style={styles.name} title={name}>
                {name}
              </div>
              {item.approved !== undefined && (
                <div style={styles.subtext}>
                  {item.approved} {tr.approved}
                </div>
              )}
            </div>

            <div style={styles.valueContainer}>
              <div style={{ ...styles.value, color }}>
                {value}
              </div>
              <div style={styles.valueLabel}>{valueLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RankingWidget;
