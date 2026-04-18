import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Grid de botones para selección de items de catálogo
 * Estilo visual similar a Excel/botones de selección rápida
 */
const CatalogButtonGrid = ({
  items = [],
  selectedId = null,
  onSelect,
  title,
  columns = 4,
  showCode = false,
  loading = false,
  emptyMessage = 'No hay opciones disponibles'
}) => {
  const { theme: t } = useTheme();

  const styles = {
    container: {
      marginBottom: '16px'
    },
    title: {
      fontSize: '13px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '8px'
    },
    button: {
      padding: '10px 8px',
      border: `2px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text,
      minHeight: '44px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },
    buttonSelected: {
      borderColor: t.accent,
      backgroundColor: t.id === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
      color: t.accent,
      boxShadow: `0 0 0 2px ${t.accent}30`
    },
    buttonWithColor: (color) => ({
      borderLeftWidth: '4px',
      borderLeftColor: color
    }),
    buttonCode: {
      fontSize: '10px',
      color: t.textDim,
      marginTop: '2px'
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: t.textMuted,
      fontSize: '14px'
    },
    empty: {
      textAlign: 'center',
      padding: '20px',
      color: t.textDim,
      fontSize: '13px',
      backgroundColor: t.bgPanel,
      borderRadius: '6px',
      border: `1px dashed ${t.border}`
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.loading}>Cargando...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={styles.container}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.empty}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {title && <div style={styles.title}>{title}</div>}
      <div style={styles.grid}>
        {items.map(item => {
          const isSelected = selectedId === item.id;
          const hasColor = item.color && item.color !== '';

          return (
            <button
              key={item.id}
              type="button"
              style={{
                ...styles.button,
                ...(isSelected ? styles.buttonSelected : {}),
                ...(hasColor ? styles.buttonWithColor(item.color) : {})
              }}
              onClick={() => onSelect(item)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = t.info;
                  e.currentTarget.style.backgroundColor = t.bgPanel;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.backgroundColor = t.bgCard;
                  if (hasColor) {
                    e.currentTarget.style.borderLeftColor = item.color;
                  }
                }
              }}
            >
              <span>{item.icon || ''} {item.name}</span>
              {showCode && <span style={styles.buttonCode}>{item.code}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogButtonGrid;
