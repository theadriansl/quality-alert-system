import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Settings } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Wrapper component for dashboard widgets
 * Provides drag-and-drop functionality and common styling
 */
const DashboardWidget = ({
  id,
  title,
  icon,
  children,
  isEditMode = false,
  onRemove,
  onConfigure,
  style = {},
  className = ''
}) => {
  const { theme: t } = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: !isEditMode });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  const styles = {
    widget: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: isEditMode ? `2px dashed ${t.accent}` : `1px solid ${t.border}`,
      ...style
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      backgroundColor: t.bgPanel
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dragHandle: {
      cursor: isEditMode ? 'grab' : 'default',
      color: isEditMode ? t.accent : t.border,
      display: 'flex',
      alignItems: 'center'
    },
    title: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    icon: {
      fontSize: '16px'
    },
    actions: {
      display: 'flex',
      gap: '4px'
    },
    actionButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      color: t.textMuted,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    content: {
      flex: 1,
      padding: '16px',
      overflow: 'auto'
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...styles.widget, ...dragStyle }}
      className={className}
    >
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {isEditMode && (
            <div
              style={styles.dragHandle}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </div>
          )}
          {icon && <span style={styles.icon}>{icon}</span>}
          <h3 style={styles.title}>{title}</h3>
        </div>

        {isEditMode && (
          <div style={styles.actions}>
            {onConfigure && (
              <button
                style={styles.actionButton}
                onClick={() => onConfigure(id)}
                title="Configurar"
              >
                <Settings size={16} />
              </button>
            )}
            {onRemove && (
              <button
                style={{
                  ...styles.actionButton,
                  color: '#ef4444'
                }}
                onClick={() => onRemove(id)}
                title="Eliminar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default DashboardWidget;
