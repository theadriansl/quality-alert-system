/**
 * SharedComponents.js - Shared presentation components for dashboards
 * Used by: EightDDashboard, QARDashboard, WorkloadDashboard
 * All styling via theme tokens, no hardcoded colors
 */
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Section Title - Micro title style (uppercase 10.5px)
// Compatible with D6Components signature: ({ children, t })
// Extended with optional sub for dashboard use
// ─────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, label, sub, t }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: t.textDim,
      whiteSpace: 'nowrap'
    }}>
      {children || label}
    </div>
    {sub && (
      <div style={{
        fontSize: 11,
        color: t.textMuted,
        marginTop: 2,
        fontWeight: 400,
        textTransform: 'none',
        letterSpacing: 'normal'
      }}>
        {sub}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Card - Simple wrapper with border, padding and subtle shadow
// ─────────────────────────────────────────────────────────────
export const Card = ({ children, t, style = {} }) => (
  <div style={{
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    ...style
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// KpiTile - KPI display tile
// - borderAccent: 'left' | 'top' | 'none' (default: 'none')
// - accentColor: color for border accent (default: t.accent)
// - size: 'sm' | 'md' | 'lg' (default: 'md') - affects value fontSize
// - alertType: 'warning' | 'error' | null - shows dot next to label
// - valueColor: override value color (use when number IS the state)
// ─────────────────────────────────────────────────────────────
export const KpiTile = ({
  label,
  value,
  unit = '',
  sub,
  alertType,
  valueColor,
  borderAccent = 'none',  // 'left' | 'top' | 'none'
  accentColor,            // defaults to t.accent if borderAccent set
  size = 'md',            // 'sm' | 'md' | 'lg'
  t
}) => {
  const alertDotColor = alertType === 'error' ? t.errorFg
    : alertType === 'warning' ? t.warningFg
    : null;

  // Size variants
  const sizeConfig = {
    sm: { valueFontSize: 20, padding: '10px 12px' },
    md: { valueFontSize: 22, padding: '12px 14px' },
    lg: { valueFontSize: 28, padding: '14px 16px' }
  };
  const { valueFontSize, padding } = sizeConfig[size] || sizeConfig.md;

  // Border accent styling
  const accentStyle = borderAccent === 'left'
    ? { borderLeft: `4px solid ${accentColor || t.accent}` }
    : borderAccent === 'top'
    ? { borderTop: `3px solid ${accentColor || t.accent}` }
    : {};

  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      ...accentStyle
    }}>
      {/* Label row with optional alert dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
      }}>
        {alertDotColor && (
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: alertDotColor,
            flexShrink: 0
          }} />
        )}
        <span style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: t.textDim,
          whiteSpace: 'nowrap'
        }}>
          {label}
        </span>
      </div>

      {/* Value - monospace */}
      <div style={{
        fontSize: valueFontSize,
        fontWeight: 500,
        fontFamily: "'IBM Plex Mono', monospace",
        color: valueColor || t.text,
        lineHeight: 1.1
      }}>
        {value}
        {unit && (
          <span style={{
            fontSize: 12,
            fontWeight: 400,
            marginLeft: 3,
            color: t.textMuted
          }}>
            {unit}
          </span>
        )}
      </div>

      {/* Optional sub text */}
      {sub && (
        <div style={{
          fontSize: 11,
          color: t.textMuted,
          marginTop: 4
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// RiskScoreCard - Risk index with breakdown
// Score in mono 40px/500 (t.text), pill chip status, 6px bar, factor list
// ─────────────────────────────────────────────────────────────
export const RiskScoreCard = ({
  score,
  title = 'Índice de Riesgo',
  factors,  // Array of { label, value }
  t
}) => {
  const riskLevel = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  const riskLabel = score >= 60 ? 'Alto' : score >= 35 ? 'Moderado' : 'Bajo';

  const colors = {
    high: { fg: t.errorFg, bg: t.errorBg, border: t.errorBorder },
    medium: { fg: t.warningFg, bg: t.warningBg, border: t.warningBorder },
    low: { fg: t.successFg, bg: t.successBg, border: t.successBorder }
  };
  const c = colors[riskLevel];

  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding: 16,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{
        fontSize: 10.5,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: t.textDim,
        marginBottom: 12
      }}>
        {title}
      </div>

      {/* Score + Chip row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
      }}>
        <span style={{
          fontSize: 40,
          fontWeight: 500,
          fontFamily: "'IBM Plex Mono', monospace",
          color: t.text,
          lineHeight: 1
        }}>
          {score}
        </span>
        <span style={{
          padding: '3px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: c.bg,
          border: `1px solid ${c.border}`,
          color: c.fg
        }}>
          {riskLabel}
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 6,
        backgroundColor: t.bgPanel,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 14
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, score)}%`,
          backgroundColor: c.fg,
          borderRadius: 3
        }} />
      </div>

      {/* Factors breakdown - flat list with 1px separator */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {factors.map((f, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderTop: i > 0 ? `1px solid ${t.line || t.border}` : undefined
          }}>
            <span style={{
              fontSize: 12,
              color: t.textMuted
            }}>
              {f.label}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              color: t.text
            }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AlertCountChip - Small mono chip for tab badge
// Used in tab labels to show count of items needing attention
// ─────────────────────────────────────────────────────────────
export const AlertCountChip = ({ count, t }) => {
  if (!count || count <= 0) return null;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 9,
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "'IBM Plex Mono', monospace",
      backgroundColor: t.errorBg,
      border: `1px solid ${t.errorBorder}`,
      color: t.errorFg,
      marginLeft: 6
    }}>
      {count}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// HBar - Horizontal bar with label and value
// ─────────────────────────────────────────────────────────────
export const HBar = ({ label, value, max, color, fmt, t }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 3
      }}>
        <span style={{
          fontSize: 12,
          color: t.text,
          fontWeight: 500
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
          color: color || t.text
        }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <div style={{
        height: 6,
        backgroundColor: t.bgPanel,
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color || t.accent,
          borderRadius: 3,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
};

const SharedComponents = {
  SectionTitle,
  Card,
  KpiTile,
  RiskScoreCard,
  AlertCountChip,
  HBar
};

export default SharedComponents;
