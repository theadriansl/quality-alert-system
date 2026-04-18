/**
 * FormSection Component
 * Wrapper for grouping related form fields with consistent section styling
 * Can be used with CollapsibleSection for collapsible functionality
 */
import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

const FormSection = ({
  title,
  subtitle,
  description,
  icon: Icon,
  children,
  actions,
  status, // 'default', 'success', 'warning', 'error'
  badge,
  noPadding = false,
  noBorder = false,
  transparent = false,
  className,
  style,
  headerStyle,
  contentStyle
}) => {
  const { theme: t } = useTheme();

  // Status color mapping
  const getStatusColor = () => {
    switch (status) {
      case 'success': return t.success;
      case 'warning': return t.warning;
      case 'error': return t.error;
      default: return t.accent;
    }
  };

  const statusColor = getStatusColor();

  const styles = {
    container: {
      backgroundColor: transparent ? 'transparent' : t.bgCard,
      border: noBorder ? 'none' : `1px solid ${t.border}`,
      borderRadius: '8px',
      marginBottom: '20px',
      overflow: 'hidden',
      ...style
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`,
      ...headerStyle
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      backgroundColor: statusColor + '15',
      color: statusColor
    },
    titleWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    title: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '12px',
      color: t.textMuted,
      margin: 0
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: statusColor + '15',
      color: statusColor
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    description: {
      padding: '12px 20px',
      backgroundColor: t.bgPanel + '50',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '13px',
      color: t.textMuted,
      lineHeight: '1.5'
    },
    content: {
      padding: noPadding ? 0 : '20px',
      ...contentStyle
    }
  };

  const hasHeader = title || Icon || actions || badge;

  return (
    <div style={styles.container} className={className}>
      {/* Section Header */}
      {hasHeader && (
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {Icon && (
              <div style={styles.iconWrapper}>
                <Icon size={18} />
              </div>
            )}
            {(title || subtitle) && (
              <div style={styles.titleWrapper}>
                {title && <h4 style={styles.title}>{title}</h4>}
                {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
              </div>
            )}
            {badge && <span style={styles.badge}>{badge}</span>}
          </div>
          {actions && (
            <div style={styles.headerRight}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <div style={styles.description}>
          {description}
        </div>
      )}

      {/* Section Content */}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
};

// Divider component for separating content within sections
export const FormDivider = ({ label, style }) => {
  const { theme: t } = useTheme();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: '20px 0',
      ...style
    }}>
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: t.border
      }} />
      {label && (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: t.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
      )}
      <div style={{
        flex: 1,
        height: '1px',
        backgroundColor: t.border
      }} />
    </div>
  );
};

// Info box for displaying helpful information
export const FormInfoBox = ({
  children,
  type = 'info', // 'info', 'success', 'warning', 'error'
  icon: Icon,
  title
}) => {
  const { theme: t } = useTheme();

  const getTypeColor = () => {
    switch (type) {
      case 'success': return t.success;
      case 'warning': return t.warning;
      case 'error': return t.error;
      default: return t.info || t.accent;
    }
  };

  const color = getTypeColor();

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '14px 16px',
      backgroundColor: color + '10',
      border: `1px solid ${color}30`,
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      {Icon && (
        <div style={{
          flexShrink: 0,
          color: color
        }}>
          <Icon size={18} />
        </div>
      )}
      <div>
        {title && (
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: t.text,
            marginBottom: '4px'
          }}>
            {title}
          </div>
        )}
        <div style={{
          fontSize: '13px',
          color: t.text,
          lineHeight: '1.5'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormSection;
