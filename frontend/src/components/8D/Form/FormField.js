/**
 * FormField Component
 * Atomic form field component with consistent styling across all 8D sections
 * Supports: text, textarea, select, date, number, checkbox, file
 */
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const FormField = ({
  type = 'text',
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  tooltip,
  options = [], // For select type
  rows = 3, // For textarea
  min,
  max,
  step,
  accept, // For file type
  multiple = false, // For file/select
  maxLength,
  pattern,
  autoComplete,
  className,
  style,
  inputStyle,
  labelStyle,
  onBlur,
  onFocus,
  language = 'es'
}) => {
  const { theme: t } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const translations = {
    es: {
      required: 'Requerido',
      optional: 'Opcional',
      selectOption: 'Seleccionar...',
      dragDrop: 'Arrastra archivos aquí o',
      browse: 'buscar',
      uploading: 'Subiendo...',
      characters: 'caracteres'
    },
    en: {
      required: 'Required',
      optional: 'Optional',
      selectOption: 'Select...',
      dragDrop: 'Drag files here or',
      browse: 'browse',
      uploading: 'Uploading...',
      characters: 'characters'
    }
  };

  const tr = translations[language] || translations.es;

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    if (type === 'file') {
      onChange?.(e.target.files);
    } else if (type === 'checkbox') {
      onChange?.(e.target.checked);
    } else {
      onChange?.(e.target.value);
    }
  };

  // File handling
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      onChange?.(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const baseInputStyles = {
    width: '100%',
    padding: type === 'textarea' ? '12px' : '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: disabled ? t.textMuted : t.text,
    backgroundColor: disabled ? t.bgPanel : t.bgCard,
    border: `1px solid ${error ? t.error : isFocused ? t.accent : t.border}`,
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'text',
    ...inputStyle
  };

  const styles = {
    container: {
      marginBottom: '16px',
      ...style
    },
    labelRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '6px'
    },
    labelLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      ...labelStyle
    },
    requiredBadge: {
      fontSize: '9px',
      padding: '2px 6px',
      borderRadius: '4px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: required ? t.error + '15' : t.bgPanel,
      color: required ? t.error : t.textMuted
    },
    tooltipTrigger: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      color: t.textMuted,
      cursor: 'help',
      position: 'relative'
    },
    tooltip: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 12px',
      backgroundColor: t.text,
      color: t.bgCard,
      borderRadius: '6px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      marginBottom: '6px',
      zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    inputWrapper: {
      position: 'relative'
    },
    input: baseInputStyles,
    textarea: {
      ...baseInputStyles,
      resize: 'vertical',
      minHeight: '80px'
    },
    select: {
      ...baseInputStyles,
      cursor: disabled ? 'not-allowed' : 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23${t.textMuted.replace('#', '')}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
      paddingRight: '36px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    checkboxInput: {
      width: '18px',
      height: '18px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      accentColor: t.accent
    },
    checkboxLabel: {
      fontSize: '14px',
      color: t.text
    },
    fileDropzone: {
      border: `2px dashed ${dragOver ? t.accent : t.border}`,
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'center',
      backgroundColor: dragOver ? t.accent + '10' : t.bgPanel,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease'
    },
    fileIcon: {
      color: t.textMuted,
      marginBottom: '8px'
    },
    fileText: {
      fontSize: '13px',
      color: t.textMuted
    },
    fileLink: {
      color: t.accent,
      fontWeight: '500',
      cursor: 'pointer'
    },
    helperText: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginTop: '6px',
      fontSize: '12px',
      color: error ? t.error : t.textMuted
    },
    charCount: {
      fontSize: '11px',
      color: t.textMuted,
      textAlign: 'right',
      marginTop: '4px'
    },
    statusIcon: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center'
    }
  };

  // Render different input types
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            name={name}
            value={value || ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            rows={rows}
            maxLength={maxLength}
            style={styles.textarea}
          />
        );

      case 'select':
        return (
          <select
            name={name}
            value={value || ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            multiple={multiple}
            style={styles.select}
          >
            {!required && <option value="">{tr.selectOption}</option>}
            {options.map((opt, idx) => (
              <option
                key={opt.value || opt.id || idx}
                value={opt.value || opt.id}
              >
                {opt.label || opt.name || opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name={name}
              checked={value || false}
              onChange={handleChange}
              disabled={disabled}
              style={styles.checkboxInput}
            />
            <span style={styles.checkboxLabel}>{placeholder || label}</span>
          </label>
        );

      case 'file':
        return (
          <div
            style={styles.fileDropzone}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              name={name}
              onChange={handleChange}
              accept={accept}
              multiple={multiple}
              disabled={disabled}
              style={{ display: 'none' }}
            />
            <Upload size={24} style={styles.fileIcon} />
            <p style={styles.fileText}>
              {tr.dragDrop}{' '}
              <span style={styles.fileLink}>{tr.browse}</span>
            </p>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            name={name}
            value={value || ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            style={styles.input}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            name={name}
            value={value ?? ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            step={step}
            style={styles.input}
          />
        );

      default:
        return (
          <input
            type={type}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
            style={styles.input}
          />
        );
    }
  };

  // Don't show label row for checkbox (label is inline)
  if (type === 'checkbox') {
    return (
      <div style={styles.container} className={className}>
        {renderInput()}
        {(error || helperText) && (
          <div style={styles.helperText}>
            {error && <AlertCircle size={12} />}
            <span>{error || helperText}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      {/* Label Row */}
      {label && (
        <div style={styles.labelRow}>
          <div style={styles.labelLeft}>
            <label style={styles.label}>{label}</label>
            <span style={styles.requiredBadge}>
              {required ? tr.required : tr.optional}
            </span>
          </div>

          {tooltip && (
            <div
              style={styles.tooltipTrigger}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <HelpCircle size={14} />
              {showTooltip && (
                <motion.div
                  style={styles.tooltip}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {tooltip}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={styles.inputWrapper}>
        {renderInput()}

        {/* Status Icon */}
        {!disabled && type !== 'textarea' && type !== 'select' && type !== 'file' && (
          <div style={styles.statusIcon}>
            {error ? (
              <AlertCircle size={16} color={t.error} />
            ) : value && !error ? (
              <CheckCircle size={16} color={t.success} />
            ) : null}
          </div>
        )}
      </div>

      {/* Character count for textarea */}
      {type === 'textarea' && maxLength && (
        <div style={styles.charCount}>
          {(value || '').length}/{maxLength} {tr.characters}
        </div>
      )}

      {/* Helper/Error Text */}
      {(error || helperText) && (
        <div style={styles.helperText}>
          {error && <AlertCircle size={12} />}
          <span>{error || helperText}</span>
        </div>
      )}
    </div>
  );
};

export default FormField;
