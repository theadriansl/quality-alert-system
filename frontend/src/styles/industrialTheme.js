/**
 * Industrial Design System - B2B Enterprise Theme
 * Corporate Industrial Style (Siemens-inspired)
 *
 * Color Distribution: 70% whites/grays, 25% industrial blue, 5% status colors
 */

export const INDUSTRIAL_COLORS = {
  // Primary Colors
  primary: '#0F3B5F',
  secondary: '#5C6770',
  accent: '#0072CE',

  // Background Colors
  background: '#F4F6F8',
  surface: '#FFFFFF',
  section: '#E6EAEE',

  // Status Colors - Use sparingly (5%)
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#C77700',
  warningLight: '#FFF3E0',
  error: '#B00020',
  errorLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Text Colors
  text: {
    primary: '#1C1F23',
    secondary: '#6B7280',
    muted: '#A0A4A8'
  },

  // Neutral Grays - Technical (70%)
  gray: {
    50: '#FAFBFC',
    100: '#F4F6F8',
    200: '#E6EAEE',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#5C6770',
    700: '#4B5563',
    800: '#374151',
    900: '#1C1F23'
  },

  // Borders
  border: {
    light: '#E6EAEE',
    medium: '#D1D5DB',
    dark: '#9CA3AF'
  }
};

export const INDUSTRIAL_STYLES = {
  // Page
  page: {
    minHeight: '100vh',
    backgroundColor: INDUSTRIAL_COLORS.background,
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },

  // Header
  header: {
    backgroundColor: INDUSTRIAL_COLORS.surface,
    borderBottom: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },

  // Card
  card: {
    backgroundColor: INDUSTRIAL_COLORS.surface,
    border: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    padding: '24px'
  },

  // Card Title
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: INDUSTRIAL_COLORS.text.primary,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '0.01em'
  },

  // Chart Indicator
  chartIndicator: {
    width: '3px',
    height: '14px',
    borderRadius: '2px'
  },

  // Buttons
  btnPrimary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: INDUSTRIAL_COLORS.primary,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'filter 0.15s ease'
  },

  btnSecondary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: INDUSTRIAL_COLORS.text.secondary,
    backgroundColor: INDUSTRIAL_COLORS.gray[100],
    border: `1px solid ${INDUSTRIAL_COLORS.border.medium}`,
    borderRadius: '4px',
    cursor: 'pointer'
  },

  btnAccent: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: INDUSTRIAL_COLORS.accent,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },

  btnDanger: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: INDUSTRIAL_COLORS.error,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },

  // KPI Card
  kpiCard: {
    backgroundColor: INDUSTRIAL_COLORS.surface,
    border: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    padding: '20px'
  },

  kpiLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: INDUSTRIAL_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },

  kpiValue: {
    fontSize: '28px',
    fontWeight: '600',
    color: INDUSTRIAL_COLORS.text.primary,
    letterSpacing: '-0.01em'
  },

  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },

  th: {
    backgroundColor: INDUSTRIAL_COLORS.gray[50],
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: INDUSTRIAL_COLORS.text.secondary,
    borderBottom: `2px solid ${INDUSTRIAL_COLORS.border.medium}`
  },

  td: {
    padding: '12px 16px',
    borderBottom: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    color: INDUSTRIAL_COLORS.text.primary
  },

  // Status Badge
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '4px'
  },

  // Tabs
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    marginBottom: '24px',
    gap: '0'
  },

  tab: {
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: INDUSTRIAL_COLORS.text.muted,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px'
  },

  tabActive: {
    color: INDUSTRIAL_COLORS.primary,
    borderBottomColor: INDUSTRIAL_COLORS.primary
  },

  // Form Elements
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: `1px solid ${INDUSTRIAL_COLORS.border.medium}`,
    borderRadius: '4px',
    backgroundColor: INDUSTRIAL_COLORS.surface,
    color: INDUSTRIAL_COLORS.text.primary
  },

  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: `1px solid ${INDUSTRIAL_COLORS.border.medium}`,
    borderRadius: '4px',
    backgroundColor: INDUSTRIAL_COLORS.surface,
    color: INDUSTRIAL_COLORS.text.primary
  },

  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: INDUSTRIAL_COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px'
  },

  // Sidebar
  sidebar: {
    backgroundColor: INDUSTRIAL_COLORS.secondary,
    color: 'white'
  },

  sidebarItemActive: {
    borderLeft: `4px solid ${INDUSTRIAL_COLORS.accent}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },

  // Loading
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${INDUSTRIAL_COLORS.gray[200]}`,
    borderTopColor: INDUSTRIAL_COLORS.primary,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  // Tooltip style for Recharts
  tooltipStyle: {
    backgroundColor: INDUSTRIAL_COLORS.surface,
    border: `1px solid ${INDUSTRIAL_COLORS.border.light}`,
    borderRadius: '4px',
    fontSize: '13px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },

  // Section
  section: {
    backgroundColor: INDUSTRIAL_COLORS.section,
    borderRadius: '4px',
    padding: '24px',
    marginBottom: '24px'
  }
};

// Chart color palette - Industrial (NO red except for errors)
export const CHART_COLORS = [
  INDUSTRIAL_COLORS.primary,      // #0F3B5F - Dark blue
  INDUSTRIAL_COLORS.accent,       // #0072CE - Bright blue
  INDUSTRIAL_COLORS.secondary,    // #5C6770 - Gray
  INDUSTRIAL_COLORS.info,         // #1565C0 - Info blue
  INDUSTRIAL_COLORS.gray[400],    // #9CA3AF - Light gray
  INDUSTRIAL_COLORS.gray[600]     // #5C6770 - Medium gray
];

// Chart colors for specific data types
export const CHART_COLORS_EXTENDED = {
  // For pie charts, bar charts
  series: [
    '#0F3B5F',  // Primary
    '#0072CE',  // Accent
    '#5C6770',  // Secondary
    '#1565C0',  // Info
    '#78909C',  // Blue gray
    '#90A4AE'   // Light blue gray
  ],
  // For positive/negative comparison
  positive: '#2E7D32',
  negative: '#B00020',
  neutral: '#5C6770',
  // For trend lines
  trend: '#0072CE',
  // Grid lines
  grid: '#E6EAEE',
  // Axis
  axis: '#9CA3AF'
};

// Status color mapping
export const STATUS_COLORS = {
  // General
  active: INDUSTRIAL_COLORS.accent,
  inactive: INDUSTRIAL_COLORS.gray[400],
  pending: INDUSTRIAL_COLORS.warning,
  completed: INDUSTRIAL_COLORS.success,
  cancelled: INDUSTRIAL_COLORS.error,

  // Audit specific
  planned: INDUSTRIAL_COLORS.gray[500],
  in_progress: INDUSTRIAL_COLORS.accent,
  open: INDUSTRIAL_COLORS.error,
  closed: INDUSTRIAL_COLORS.success,

  // Severity - Only use for critical indicators
  high: INDUSTRIAL_COLORS.error,
  medium: INDUSTRIAL_COLORS.warning,
  low: INDUSTRIAL_COLORS.success,

  // Priority
  critical: INDUSTRIAL_COLORS.error,
  urgent: INDUSTRIAL_COLORS.warning,
  normal: INDUSTRIAL_COLORS.info
};

// Status badge styles
export const STATUS_BADGE_STYLES = {
  success: {
    backgroundColor: INDUSTRIAL_COLORS.successLight,
    color: INDUSTRIAL_COLORS.success
  },
  warning: {
    backgroundColor: INDUSTRIAL_COLORS.warningLight,
    color: INDUSTRIAL_COLORS.warning
  },
  error: {
    backgroundColor: INDUSTRIAL_COLORS.errorLight,
    color: INDUSTRIAL_COLORS.error
  },
  info: {
    backgroundColor: INDUSTRIAL_COLORS.infoLight,
    color: INDUSTRIAL_COLORS.info
  },
  neutral: {
    backgroundColor: INDUSTRIAL_COLORS.gray[100],
    color: INDUSTRIAL_COLORS.text.secondary
  }
};

export default {
  COLORS: INDUSTRIAL_COLORS,
  STYLES: INDUSTRIAL_STYLES,
  CHART_COLORS,
  CHART_COLORS_EXTENDED,
  STATUS_COLORS,
  STATUS_BADGE_STYLES
};
