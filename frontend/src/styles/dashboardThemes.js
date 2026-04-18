/**
 * Dashboard Themes - Shared theme definitions for all dashboards
 * Corporate B2B Industrial Design System
 */

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
    bgPanel: '#1C1F23',
    border: '#334155',
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
    name: 'Océano',
    bg: '#eff6ff',
    bgCard: '#dbeafe',
    bgPanel: '#bfdbfe',
    border: '#93c5fd',
    text: '#1e3a5f',
    textMuted: '#0072CE',
    textDim: '#60a5fa',
    primary: '#0F3B5F',
    accent: '#0072CE',
    success: '#2E7D32',
    warning: '#C77700',
    error: '#B00020',
    info: '#1565C0'
  }
};

// Chart colors based on theme
export const getChartColors = (theme) => {
  const t = THEMES[theme] || THEMES.industrial;
  return [
    t.primary,
    t.accent,
    t.info || '#1565C0',
    '#5C6770',
    '#78909C',
    '#90A4AE'
  ];
};

// Status colors (consistent across themes)
export const STATUS_COLORS = {
  success: '#2E7D32',
  warning: '#C77700',
  error: '#B00020',
  info: '#1565C0',
  neutral: '#6B7280'
};

// Theme selector component styles
export const getThemeSelectorStyles = (currentTheme, th) => ({
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  label: {
    fontSize: '12px',
    color: th.textMuted,
    marginRight: '8px'
  },
  button: (themeKey) => ({
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: currentTheme === themeKey ? `2px solid ${th.accent}` : `2px solid ${th.border}`,
    cursor: 'pointer',
    backgroundColor: THEMES[themeKey].bgCard,
    boxShadow: currentTheme === themeKey ? `0 0 0 2px rgba(0,114,206,0.3)` : 'none',
    transition: 'all 0.15s ease'
  })
});

// Helper to get theme from localStorage with fallback
export const getStoredTheme = (storageKey, defaultTheme = 'industrial') => {
  const saved = localStorage.getItem(storageKey);
  return saved && THEMES[saved] ? saved : defaultTheme;
};

// Helper to save theme to localStorage
export const saveTheme = (storageKey, theme) => {
  localStorage.setItem(storageKey, theme);
};

export default THEMES;
