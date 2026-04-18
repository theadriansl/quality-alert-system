/**
 * FormGrid Component
 * Responsive grid layout for organizing form fields
 * Supports various column configurations
 */
import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

const FormGrid = ({
  children,
  columns = 2, // 1, 2, 3, 4 or 'auto'
  gap = '16px',
  rowGap,
  columnGap,
  minChildWidth = '250px', // For auto columns
  alignItems = 'start',
  className,
  style
}) => {
  const { theme: t } = useTheme();

  const getGridTemplateColumns = () => {
    if (columns === 'auto') {
      return `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`;
    }
    return `repeat(${columns}, 1fr)`;
  };

  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: getGridTemplateColumns(),
      gap: gap,
      rowGap: rowGap || gap,
      columnGap: columnGap || gap,
      alignItems: alignItems,
      ...style
    }
  };

  return (
    <div style={styles.grid} className={className}>
      {children}
    </div>
  );
};

// FormRow for single-row layouts with specific column ratios
export const FormRow = ({
  children,
  ratio = '1:1', // e.g., '1:1', '2:1', '1:2:1', '1:1:1:1'
  gap = '16px',
  alignItems = 'end',
  className,
  style
}) => {
  const ratioArray = ratio.split(':').map(Number);
  const templateColumns = ratioArray.map(r => `${r}fr`).join(' ');

  const styles = {
    row: {
      display: 'grid',
      gridTemplateColumns: templateColumns,
      gap: gap,
      alignItems: alignItems,
      ...style
    }
  };

  return (
    <div style={styles.row} className={className}>
      {children}
    </div>
  );
};

// FormColumn for spanning multiple columns
export const FormColumn = ({
  children,
  span = 1,
  start, // Grid column start position
  className,
  style
}) => {
  const styles = {
    column: {
      gridColumn: start ? `${start} / span ${span}` : `span ${span}`,
      ...style
    }
  };

  return (
    <div style={styles.column} className={className}>
      {children}
    </div>
  );
};

// FormGroup for grouping related fields with optional label
export const FormGroup = ({
  children,
  label,
  required = false,
  inline = false,
  gap = '12px',
  className,
  style
}) => {
  const { theme: t } = useTheme();

  const styles = {
    group: {
      marginBottom: '16px',
      ...style
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px'
    },
    requiredStar: {
      color: t.error,
      marginLeft: '2px'
    },
    content: {
      display: inline ? 'flex' : 'block',
      flexWrap: inline ? 'wrap' : undefined,
      gap: inline ? gap : undefined
    }
  };

  return (
    <div style={styles.group} className={className}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.requiredStar}>*</span>}
        </label>
      )}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
};

// Spacer for adding vertical space
export const FormSpacer = ({ size = '16px' }) => (
  <div style={{ height: size }} />
);

// FormActions for button rows at the end of forms
export const FormActions = ({
  children,
  align = 'right', // 'left', 'center', 'right', 'space-between'
  gap = '12px',
  sticky = false,
  className,
  style
}) => {
  const { theme: t } = useTheme();

  const getJustifyContent = () => {
    switch (align) {
      case 'left': return 'flex-start';
      case 'center': return 'center';
      case 'space-between': return 'space-between';
      default: return 'flex-end';
    }
  };

  const styles = {
    actions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: getJustifyContent(),
      gap: gap,
      paddingTop: '20px',
      borderTop: `1px solid ${t.border}`,
      marginTop: '20px',
      ...(sticky && {
        position: 'sticky',
        bottom: 0,
        backgroundColor: t.bgCard,
        padding: '16px 0',
        marginTop: '24px',
        zIndex: 10
      }),
      ...style
    }
  };

  return (
    <div style={styles.actions} className={className}>
      {children}
    </div>
  );
};

// Common Button component for form actions
export const FormButton = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'success', 'danger', 'ghost'
  size = 'medium', // 'small', 'medium', 'large'
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  style
}) => {
  const { theme: t } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: t.bgPanel,
          color: t.text,
          border: `1px solid ${t.border}`,
          hoverBg: t.border
        };
      case 'success':
        return {
          backgroundColor: t.success,
          color: 'white',
          border: 'none',
          hoverBg: t.success + 'dd'
        };
      case 'danger':
        return {
          backgroundColor: t.error,
          color: 'white',
          border: 'none',
          hoverBg: t.error + 'dd'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: t.text,
          border: 'none',
          hoverBg: t.bgPanel
        };
      default: // primary
        return {
          backgroundColor: t.primary,
          color: 'white',
          border: 'none',
          hoverBg: t.primary + 'dd'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: '6px 12px', fontSize: '12px' };
      case 'large':
        return { padding: '14px 24px', fontSize: '16px' };
      default: // medium
        return { padding: '10px 18px', fontSize: '14px' };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const styles = {
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: '500',
      borderRadius: '6px',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
      ...sizeStyles,
      ...variantStyles,
      ...style
    }
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...styles.button,
        backgroundColor: isHovered && !disabled ? variantStyles.hoverBg : variantStyles.backgroundColor
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {loading ? (
        <span className="spinner" style={{ width: '14px', height: '14px' }} />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'small' ? 14 : 16} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'small' ? 14 : 16} />}
        </>
      )}
    </button>
  );
};

export default FormGrid;
