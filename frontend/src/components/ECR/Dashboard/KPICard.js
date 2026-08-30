import React from 'react';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * KPI Card Widget
 * Displays a key performance indicator with optional trend
 */
const KPICard = ({
  value = 0,
  label,
  icon,
  color = '#0072CE',
  trend = null, // { value: 5, direction: 'up' | 'down' | 'neutral' }
  format = 'number', // 'number' | 'percentage' | 'days'
  decimals = 0,
  suffix = '',
  prefix = ''
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: { days: 'days', vsPrevMonth: 'vs previous month' },
    es: { days: 'días', vsPrevMonth: 'vs mes anterior' }
  }[language] || {};
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '8px'
    },
    iconContainer: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '12px',
      fontSize: '24px'
    },
    value: {
      fontSize: '32px',
      fontWeight: '600',
      color: t.text,
      lineHeight: 1,
      marginBottom: '4px'
    },
    label: {
      fontSize: '13px',
      color: t.textMuted,
      textAlign: 'center'
    },
    trend: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginTop: '8px',
      fontSize: '12px',
      fontWeight: '500'
    },
    trendUp: {
      color: t.success
    },
    trendDown: {
      color: t.error
    },
    trendNeutral: {
      color: t.textMuted
    }
  };

  const formatValue = (val) => {
    if (format === 'percentage') return `${val}%`;
    if (format === 'days') return `${val} ${tr.days}`;
    return val;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp size={14} />;
    if (trend.direction === 'down') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const getTrendStyle = () => {
    if (!trend) return {};
    if (trend.direction === 'up') return styles.trendUp;
    if (trend.direction === 'down') return styles.trendDown;
    return styles.trendNeutral;
  };

  return (
    <div style={styles.container}>
      {icon && (
        <div style={{ ...styles.iconContainer, backgroundColor: `${color}15` }}>
          {icon}
        </div>
      )}

      <div style={{ ...styles.value, color }}>
        {prefix}
        <CountUp
          end={value}
          duration={1.5}
          decimals={decimals}
          separator=","
        />
        {format === 'percentage' && '%'}
        {format === 'days' && <span style={{ fontSize: '16px', marginLeft: '4px' }}>{tr.days}</span>}
        {suffix}
      </div>

      <div style={styles.label}>{label}</div>

      {trend && (
        <div style={{ ...styles.trend, ...getTrendStyle() }}>
          {getTrendIcon()}
          <span>{trend.value}% {tr.vsPrevMonth}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
