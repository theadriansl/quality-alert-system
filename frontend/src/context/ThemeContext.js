/**
 * Global Theme Context
 * Provides consistent theming across the entire application
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme definitions
export const THEMES = {
  industrial: {
    id: 'industrial',
    name: 'Industrial',
    bg: '#F4F6F8',
    bgCard: '#FFFFFF',
    bgPanel: '#E6EAEE',
    border: '#D1D5DB',
    text: '#1C1F23',
    textMuted: '#6B7280',
    textDim: '#A0A4A8',
    primary: '#0F3B5F',
    accent: '#0072CE',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#B00020',
    info: '#1565C0'
  },
  dark: {
    id: 'dark',
    name: 'Oscuro',
    bg: '#0f172a',
    bgCard: '#1e293b',
    bgPanel: '#334155',
    border: '#475569',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    primary: '#0072CE',
    accent: '#3b82f6',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#ef4444',
    info: '#60a5fa'
  },
  white: {
    id: 'white',
    name: 'Blanco',
    bg: '#ffffff',
    bgCard: '#f8fafc',
    bgPanel: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#475569',
    textDim: '#64748b',
    primary: '#0F3B5F',
    accent: '#0072CE',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#B00020',
    info: '#1565C0'
  },
  cream: {
    id: 'cream',
    name: 'Crema',
    bg: '#faf7f2',
    bgCard: '#f5f0e8',
    bgPanel: '#ede8df',
    border: '#e8e0d5',
    text: '#374151',
    textMuted: '#6b7280',
    textDim: '#9ca3af',
    primary: '#0F3B5F',
    accent: '#0072CE',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#B00020',
    info: '#1565C0'
  },
  ocean: {
    id: 'ocean',
    name: 'Oceano',
    bg: '#eff6ff',
    bgCard: '#dbeafe',
    bgPanel: '#bfdbfe',
    border: '#93c5fd',
    text: '#1e3a5f',
    textMuted: '#1e40af',
    textDim: '#60a5fa',
    primary: '#0F3B5F',
    accent: '#0072CE',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#B00020',
    info: '#1565C0'
  }
};

// Storage key for global theme
const THEME_STORAGE_KEY = 'qms_global_theme';

// Create context
const ThemeContext = createContext(null);

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && THEMES[saved] ? saved : 'industrial';
  });

  const theme = THEMES[themeName] || THEMES.industrial;

  const setTheme = (newTheme) => {
    if (THEMES[newTheme]) {
      setThemeName(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };

  // Apply theme to document body for global styles
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
  }, [theme]);

  const value = {
    theme,
    themeName,
    setTheme,
    themes: THEMES
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Selector Component - can be used anywhere
export const ThemeSelector = ({ style }) => {
  const { theme, themeName, setTheme, themes } = useTheme();

  const selectorStyle = {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    ...style
  };

  const buttonStyle = (key) => ({
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: themes[key].bgCard,
    border: themeName === key ? `2px solid ${theme.accent}` : `2px solid ${theme.border}`,
    boxShadow: themeName === key ? '0 0 0 2px rgba(0,114,206,0.3)' : 'none'
  });

  return (
    <div style={selectorStyle}>
      {Object.keys(themes).map((key) => (
        <div
          key={key}
          title={themes[key].name}
          onClick={() => setTheme(key)}
          style={buttonStyle(key)}
        />
      ))}
    </div>
  );
};

// Helper function to get common styles based on theme
export const getThemeStyles = (theme) => ({
  page: {
    minHeight: '100vh',
    backgroundColor: theme.bg,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  header: {
    backgroundColor: theme.bgCard,
    borderBottom: `1px solid ${theme.border}`,
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },
  card: {
    backgroundColor: theme.bgCard,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  input: {
    backgroundColor: theme.bgCard,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    color: theme.text
  },
  select: {
    backgroundColor: theme.bgCard,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    color: theme.text
  },
  btnPrimary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: theme.primary,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btnSecondary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: theme.text,
    backgroundColor: theme.bgPanel,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btnAccent: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: theme.accent,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    backgroundColor: theme.bgPanel,
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.textMuted,
    borderBottom: `2px solid ${theme.border}`
  },
  td: {
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.border}`,
    color: theme.text
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px'
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${theme.border}`,
    marginBottom: '24px'
  },
  tab: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: theme.textMuted,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px'
  },
  tabActive: {
    color: theme.primary,
    borderBottomColor: theme.primary
  }
});

export default ThemeContext;
