/**
 * ConfirmationModal Component
 * Beautiful confirmation modal to replace window.confirm()
 * Variants: confirm (blue), approve (green), delete (red), warning (yellow), reject (red)
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Trash2, HelpCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'confirm', // 'confirm', 'approve', 'delete', 'warning', 'reject'
  confirmText,
  cancelText,
  icon: CustomIcon,
  details,
  showInput = false,
  inputPlaceholder,
  inputRequired = false
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      approve: 'Approve',
      delete: 'Delete',
      continue: 'Continue',
      reject: 'Reject',
      writeHere: 'Write here...'
    },
    es: {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      approve: 'Aprobar',
      delete: 'Eliminar',
      continue: 'Continuar',
      reject: 'Rechazar',
      writeHere: 'Escribe aquí...'
    }
  }[language] || {};

  const defaultTitle = title || tr.confirm;
  const defaultCancelText = cancelText || tr.cancel;
  const defaultInputPlaceholder = inputPlaceholder || tr.writeHere;
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (showInput && inputRef.current) {
        inputRef.current.focus();
      } else if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }
  }, [isOpen, showInput]);

  // Reset input when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !showInput) {
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showInput]);

  // Variant configurations
  const variantConfig = {
    confirm: {
      color: t.accent,
      bgColor: t.accent + '15',
      icon: HelpCircle,
      buttonText: tr.confirm
    },
    approve: {
      color: t.success,
      bgColor: t.success + '15',
      icon: CheckCircle,
      buttonText: tr.approve
    },
    delete: {
      color: t.error,
      bgColor: t.error + '15',
      icon: Trash2,
      buttonText: tr.delete
    },
    warning: {
      color: t.warning,
      bgColor: t.warning + '15',
      icon: AlertTriangle,
      buttonText: tr.continue
    },
    reject: {
      color: t.error,
      bgColor: t.error + '15',
      icon: XCircle,
      buttonText: tr.reject
    }
  };

  const config = variantConfig[variant] || variantConfig.confirm;
  const Icon = CustomIcon || config.icon;
  const buttonText = confirmText || config.buttonText;

  const handleConfirm = () => {
    if (inputRequired && !inputValue.trim()) {
      inputRef.current?.focus();
      return;
    }
    onConfirm(showInput ? inputValue : true);
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    },
    modal: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      maxWidth: '420px',
      width: '100%',
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    iconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: config.bgColor,
      color: config.color
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    closeButton: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      color: t.textMuted,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    body: {
      padding: '20px'
    },
    message: {
      fontSize: '14px',
      lineHeight: '1.6',
      color: t.text,
      margin: 0,
      whiteSpace: 'pre-wrap'
    },
    details: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      fontSize: '13px',
      color: t.textMuted,
      border: `1px solid ${t.border}`
    },
    inputWrapper: {
      marginTop: '16px'
    },
    input: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      backgroundColor: t.bgCard,
      color: t.text,
      outline: 'none',
      transition: 'border-color 0.2s',
      resize: 'vertical',
      minHeight: '80px'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '16px 20px',
      borderTop: `1px solid ${t.border}`,
      backgroundColor: t.bgPanel
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    cancelButton: {
      backgroundColor: t.bgCard,
      color: t.text,
      border: `1px solid ${t.border}`
    },
    confirmButton: {
      backgroundColor: config.color,
      color: 'white'
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            style={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <div style={styles.iconWrapper}>
                  <Icon size={20} />
                </div>
                <h3 style={styles.title}>{defaultTitle}</h3>
              </div>
              <button
                style={styles.closeButton}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = t.bgPanel;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={styles.body}>
              <p style={styles.message}>{message}</p>

              {details && (
                <div style={styles.details}>{details}</div>
              )}

              {showInput && (
                <div style={styles.inputWrapper}>
                  <textarea
                    ref={inputRef}
                    style={styles.input}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={defaultInputPlaceholder}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = config.color;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = t.border;
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <button
                style={{ ...styles.button, ...styles.cancelButton }}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = t.bgPanel;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = t.bgCard;
                }}
              >
                {defaultCancelText}
              </button>
              <button
                ref={confirmButtonRef}
                style={{ ...styles.button, ...styles.confirmButton }}
                onClick={handleConfirm}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Icon size={16} />
                {buttonText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
