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
// Card - Simple wrapper with border and padding
// ─────────────────────────────────────────────────────────────
export const Card = ({ children, t, style = {} }) => (
  <div style={{
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: 16,
    ...style
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// KpiTile - KPI display tile
// - No icon prop (emojis removed)
// - Value always in t.text, monospace 22px
// - Alert dot (5px) next to label for warning/error states
// - valueColor only for cases where number IS the state (SLA, overdue)
// ─────────────────────────────────────────────────────────────
export const KpiTile = ({
  label,
  value,
  unit = '',
  sub,
  alertType,      // 'warning' | 'error' | null
  valueColor,     // Only use when number IS the state (SLA below target, etc)
  accentBorder,   // Optional top border accent color
  t
}) => {
  const alertDotColor = alertType === 'error' ? t.errorFg
    : alertType === 'warning' ? t.warningFg
    : null;

  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding: '12px 14px',
      borderTop: accentBorder ? `3px solid ${accentBorder}` : undefined
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

      {/* Value - monospace, 22px */}
      <div style={{
        fontSize: 22,
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
// Score in mono 40px/500, chip status, bar 6px, factor list
// ─────────────────────────────────────────────────────────────
export const RiskScoreCard = ({
  score,
  factors,  // Array of { label, value, color? }
  t
}) => {
  const riskLevel = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  const riskLabel = score >= 60 ? 'ALTO' : score >= 35 ? 'MEDIO' : 'BAJO';

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
      padding: 16
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
        INDICE DE RIESGO
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
          color: c.fg,
          lineHeight: 1
        }}>
          {score}
        </span>
        <span style={{
          padding: '3px 10px',
          borderRadius: 4,
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

      {/* Factors breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8
      }}>
        {factors.map((f, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 10px',
            backgroundColor: t.bgPanel,
            borderRadius: 4
          }}>
            <span style={{
              fontSize: 11,
              color: t.textMuted
            }}>
              {f.label}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              color: f.color || t.text
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
