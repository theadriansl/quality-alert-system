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

// ─────────────────────────────────────────────────────────────
// Derived Tokens: Calculate tints based on theme luminance
// ─────────────────────────────────────────────────────────────

// Parse hex color to RGB
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
};

// Convert RGB to hex
const rgbToHex = (r, g, b) => {
  const toHex = (c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Calculate relative luminance (0 = black, 1 = white)
const getLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Mix two colors by percentage (0-100)
const mixColors = (color1, color2, percent) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const p = percent / 100;
  return rgbToHex(
    c1.r + (c2.r - c1.r) * p,
    c1.g + (c2.g - c1.g) * p,
    c1.b + (c2.b - c1.b) * p
  );
};

// Generate derived tokens for a theme
const generateDerivedTokens = (baseTheme) => {
  const isDark = getLuminance(baseTheme.bgCard) < 0.4;

  // Mixing percentages based on theme darkness
  const bgMix = isDark ? 20 : 10;
  const borderMix = isDark ? 42 : 30;
  const fgMix = isDark ? 55 : 0; // Lighten text on dark themes

  const white = '#ffffff';
  const black = '#000000';

  return {
    ...baseTheme,

    // Success tints (green)
    successBg: mixColors(baseTheme.bgCard, baseTheme.success, bgMix),
    successBorder: mixColors(baseTheme.bgCard, baseTheme.success, borderMix),
    successFg: isDark ? mixColors(baseTheme.success, white, fgMix) : baseTheme.success,

    // Warning tints (amber/orange)
    warningBg: mixColors(baseTheme.bgCard, baseTheme.warning, bgMix),
    warningBorder: mixColors(baseTheme.bgCard, baseTheme.warning, borderMix),
    warningFg: isDark ? mixColors(baseTheme.warning, white, fgMix) : baseTheme.warning,

    // Error tints (red)
    errorBg: mixColors(baseTheme.bgCard, baseTheme.error, bgMix),
    errorBorder: mixColors(baseTheme.bgCard, baseTheme.error, borderMix),
    errorFg: isDark ? mixColors(baseTheme.error, white, fgMix) : baseTheme.error,

    // Accent tints (blue)
    accentBg: mixColors(baseTheme.bgCard, baseTheme.accent, bgMix),
    accentBorder: mixColors(baseTheme.bgCard, baseTheme.accent, borderMix),
    accentFg: isDark ? mixColors(baseTheme.accent, white, fgMix) : baseTheme.accent,

    // Info tints
    infoBg: mixColors(baseTheme.bgCard, baseTheme.info, bgMix),
    infoBorder: mixColors(baseTheme.bgCard, baseTheme.info, borderMix),
    infoFg: isDark ? mixColors(baseTheme.info, white, fgMix) : baseTheme.info,

    // Utility tokens
    field: isDark ? mixColors(baseTheme.bgCard, black, 15) : baseTheme.bgCard,
    hover: isDark ? mixColors(baseTheme.bgCard, white, 8) : mixColors(baseTheme.bgCard, black, 4),
    line: isDark ? mixColors(baseTheme.border, baseTheme.bgCard, 40) : mixColors(baseTheme.border, baseTheme.bgCard, 50),

    // Meta
    isDark
  };
};

// Create context
const ThemeContext = createContext(null);

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && THEMES[saved] ? saved : 'industrial';
  });

  // Generate theme with derived tokens (calculated once per theme change)
  const theme = generateDerivedTokens(THEMES[themeName] || THEMES.industrial);

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
