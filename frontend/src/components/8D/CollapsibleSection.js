/**
 * CollapsibleSection Component
 * Reusable accordion-style collapsible section with smooth animations
 * Uses Framer Motion for animations and integrates with ThemeContext
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const CollapsibleSection = ({
  title,
  subtitle,
  children,
  defaultExpanded = true,
  isExpanded: controlledExpanded,
  onToggle,
  icon: Icon,
  status, // 'complete', 'incomplete', 'warning', 'locked'
  badge,
  disabled = false,
  headerActions,
  completionInfo, // { completed: 5, total: 8 }
  id
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  const tr = {
    en: {
      complete: 'Complete',
      incomplete: 'Incomplete',
      warning: 'Warning',
      locked: 'Locked'
    },
    es: {
      complete: 'Completado',
      incomplete: 'Incompleto',
      warning: 'Atención',
      locked: 'Bloqueado'
    }
  }[language] || {};

  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (disabled) return;

    if (onToggle) {
      onToggle(!isExpanded);
    } else {
      setInternalExpanded(!isExpanded);
    }
  };

  // Status colors and icons
  const getStatusConfig = () => {
    switch (status) {
      case 'complete':
        return { color: t.success, icon: CheckCircle, label: tr.complete };
      case 'incomplete':
        return { color: t.warning, icon: AlertCircle, label: tr.incomplete };
      case 'warning':
        return { color: t.warning, icon: AlertCircle, label: tr.warning };
      case 'locked':
        return { color: t.textMuted, icon: Lock, label: tr.locked };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig?.icon;

  // Calculate completion percentage if completionInfo provided
  const completionPercentage = completionInfo
    ? Math.round((completionInfo.completed / completionInfo.total) * 100)
    : null;

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return t.success;
    if (percentage >= 50) return t.warning;
    return t.error;
  };

  const styles = {
    container: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      marginBottom: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      backgroundColor: isExpanded ? t.bgPanel : t.bgCard,
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.2s ease',
      borderBottom: isExpanded ? `1px solid ${t.border}` : 'none',
      opacity: disabled ? 0.6 : 1
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      backgroundColor: t.accent + '15',
      color: t.accent
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
      backgroundColor: t.accent + '20',
      color: t.accent
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '500'
    },
    completionBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    completionTrack: {
      width: '60px',
      height: '4px',
      backgroundColor: t.border,
      borderRadius: '2px',
      overflow: 'hidden'
    },
    completionFill: {
      height: '100%',
      borderRadius: '2px',
      transition: 'width 0.3s ease'
    },
    completionText: {
      fontSize: '11px',
      fontWeight: '500',
      minWidth: '36px'
    },
    chevron: {
      color: t.textMuted,
      transition: 'transform 0.2s ease'
    },
    content: {
      padding: '20px',
      backgroundColor: t.bgCard
    },
    actionsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginRight: '8px'
    }
  };

  return (
    <div style={styles.container} id={id}>
      <div
        style={styles.header}
        onClick={handleToggle}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div style={styles.headerLeft}>
          {/* Chevron Icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            style={styles.chevron}
          >
            <ChevronDown size={20} />
          </motion.div>

          {/* Custom Icon */}
          {Icon && (
            <div style={styles.iconWrapper}>
              <Icon size={18} />
            </div>
          )}

          {/* Title and Subtitle */}
          <div style={styles.titleWrapper}>
            <h3 style={styles.title}>{title}</h3>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>

          {/* Badge */}
          {badge && <span style={styles.badge}>{badge}</span>}
        </div>

        <div style={styles.headerRight}>
          {/* Header Actions (stops propagation) */}
          {headerActions && (
            <div
              style={styles.actionsContainer}
              onClick={(e) => e.stopPropagation()}
            >
              {headerActions}
            </div>
          )}

          {/* Completion Progress Bar */}
          {completionInfo && (
            <div style={styles.completionBar}>
              <div style={styles.completionTrack}>
                <div
                  style={{
                    ...styles.completionFill,
                    width: `${completionPercentage}%`,
                    backgroundColor: getCompletionColor(completionPercentage)
                  }}
                />
              </div>
              <span style={{
                ...styles.completionText,
                color: getCompletionColor(completionPercentage)
              }}>
                {completionInfo.completed}/{completionInfo.total}
              </span>
            </div>
          )}

          {/* Status Badge */}
          {statusConfig && (
            <div style={{
              ...styles.statusBadge,
              backgroundColor: statusConfig.color + '15',
              color: statusConfig.color
            }}>
              <StatusIcon size={12} />
              <span>{statusConfig.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: 'easeInOut' },
              opacity: { duration: 0.2 }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div style={styles.content}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsibleSection;
