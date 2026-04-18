/**
 * SectionProgressIndicator Component
 * Shows completion progress for a form section with color coding
 * Red (<50%), Yellow (50-80%), Green (>80%)
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  calculateSectionCompletion,
  getCompletionColor,
  getCompletionStatusLabel
} from '../../utils/formCompletionRules';

const SectionProgressIndicator = ({
  sectionId,
  data,
  customFields, // Optional: override default field rules
  showMissingFields = true,
  compact = false,
  language = 'es'
}) => {
  const { theme: t } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate completion
  const completion = useMemo(() => {
    return calculateSectionCompletion(sectionId, data);
  }, [sectionId, data]);

  const { completed, total, percentage, missingFields } = completion;
  const color = getCompletionColor(percentage, t);
  const statusLabel = getCompletionStatusLabel(percentage, language);

  // Get appropriate icon
  const getStatusIcon = () => {
    if (percentage === 100) return <CheckCircle size={compact ? 14 : 16} />;
    if (percentage >= 50) return <AlertCircle size={compact ? 14 : 16} />;
    return <XCircle size={compact ? 14 : 16} />;
  };

  const translations = {
    es: {
      fieldsCompleted: 'campos completados',
      missingFieldsTitle: 'Campos pendientes:',
      showDetails: 'Ver detalles',
      hideDetails: 'Ocultar'
    },
    en: {
      fieldsCompleted: 'fields completed',
      missingFieldsTitle: 'Missing fields:',
      showDetails: 'Show details',
      hideDetails: 'Hide'
    }
  };

  const tr = translations[language] || translations.es;

  const styles = {
    container: {
      backgroundColor: color + '10',
      border: `1px solid ${color}30`,
      borderRadius: compact ? '6px' : '8px',
      padding: compact ? '8px 12px' : '12px 16px',
      marginBottom: compact ? '8px' : '12px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: compact ? '8px' : '12px',
      flex: 1
    },
    iconWrapper: {
      color: color,
      display: 'flex',
      alignItems: 'center'
    },
    progressSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    progressTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    progressText: {
      fontSize: compact ? '12px' : '13px',
      fontWeight: '500',
      color: t.text
    },
    statusBadge: {
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: color + '20',
      color: color
    },
    progressBarContainer: {
      width: '100%',
      height: compact ? '4px' : '6px',
      backgroundColor: t.border,
      borderRadius: '3px',
      overflow: 'hidden'
    },
    progressBarFill: {
      height: '100%',
      borderRadius: '3px',
      backgroundColor: color,
      transition: 'width 0.3s ease'
    },
    percentageText: {
      fontSize: compact ? '11px' : '12px',
      fontWeight: '600',
      color: color,
      minWidth: '36px',
      textAlign: 'right'
    },
    expandButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      border: 'none',
      backgroundColor: 'transparent',
      color: t.textMuted,
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    missingFieldsContainer: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: t.bgCard,
      borderRadius: '6px',
      border: `1px solid ${t.border}`
    },
    missingFieldsTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    missingFieldsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    missingFieldItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: t.text
    },
    fieldDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: t.error,
      flexShrink: 0
    }
  };

  // Don't render if no fields defined
  if (total === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.leftSection}>
          <div style={styles.iconWrapper}>
            {getStatusIcon()}
          </div>

          <div style={styles.progressSection}>
            <div style={styles.progressTop}>
              <span style={styles.progressText}>
                {completed}/{total} {tr.fieldsCompleted}
              </span>
              {!compact && (
                <span style={styles.statusBadge}>{statusLabel}</span>
              )}
            </div>

            <div style={styles.progressBarContainer}>
              <motion.div
                style={styles.progressBarFill}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          <span style={styles.percentageText}>{percentage}%</span>
        </div>

        {/* Expand/Collapse button for missing fields */}
        {showMissingFields && missingFields.length > 0 && (
          <button
            style={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = t.bgPanel;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isExpanded ? tr.hideDetails : tr.showDetails}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Missing Fields List */}
      <AnimatePresence>
        {isExpanded && missingFields.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={styles.missingFieldsContainer}>
              <div style={styles.missingFieldsTitle}>{tr.missingFieldsTitle}</div>
              <div style={styles.missingFieldsList}>
                {missingFields.map((field, index) => (
                  <motion.div
                    key={field.key}
                    style={styles.missingFieldItem}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span style={styles.fieldDot} />
                    <span>{field.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Standalone progress bar for use in headers or compact displays
export const MiniProgressBar = ({
  completed,
  total,
  showPercentage = true,
  showLabel = true,
  width = '100px',
  language = 'es'
}) => {
  const { theme: t } = useTheme();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = getCompletionColor(percentage, t);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      {showLabel && (
        <span style={{
          fontSize: '11px',
          color: t.textMuted
        }}>
          {completed}/{total}
        </span>
      )}
      <div style={{
        width,
        height: '4px',
        backgroundColor: t.border,
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      {showPercentage && (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color,
          minWidth: '28px'
        }}>
          {percentage}%
        </span>
      )}
    </div>
  );
};

export default SectionProgressIndicator;
