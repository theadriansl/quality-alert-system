/**
 * ConfirmationContext
 * Provides imperative confirmation dialogs as a replacement for window.confirm()
 * Supports multiple variants: confirm (blue), approve (green), delete (red), warning (yellow)
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmationModal from '../components/8D/ConfirmationModal';

const ConfirmationContext = createContext(null);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

export const ConfirmationProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null);
  const resolveRef = useRef(null);

  // Base confirm function
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalConfig({
        isOpen: true,
        title: options.title || 'Confirmar',
        message: options.message || '¿Estás seguro?',
        variant: options.variant || 'confirm',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        icon: options.icon,
        details: options.details,
        showInput: options.showInput,
        inputPlaceholder: options.inputPlaceholder,
        inputRequired: options.inputRequired
      });
    });
  }, []);

  // Convenience methods for common variants
  const confirmAction = useCallback((message, options = {}) => {
    return confirm({
      message,
      variant: 'confirm',
      title: options.title || 'Confirmar acción',
      ...options
    });
  }, [confirm]);

  const confirmApprove = useCallback((message, options = {}) => {
    return confirm({
      message,
      variant: 'approve',
      title: options.title || 'Aprobar',
      confirmText: options.confirmText || 'Aprobar',
      ...options
    });
  }, [confirm]);

  const confirmDelete = useCallback((message, options = {}) => {
    return confirm({
      message,
      variant: 'delete',
      title: options.title || 'Eliminar',
      confirmText: options.confirmText || 'Eliminar',
      ...options
    });
  }, [confirm]);

  const confirmWarning = useCallback((message, options = {}) => {
    return confirm({
      message,
      variant: 'warning',
      title: options.title || 'Advertencia',
      ...options
    });
  }, [confirm]);

  const confirmReject = useCallback((message, options = {}) => {
    return confirm({
      message,
      variant: 'reject',
      title: options.title || 'Rechazar',
      confirmText: options.confirmText || 'Rechazar',
      showInput: true,
      inputPlaceholder: options.inputPlaceholder || 'Comentarios (opcional)',
      ...options
    });
  }, [confirm]);

  // Handle modal close
  const handleClose = useCallback((result) => {
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    setModalConfig(null);
  }, []);

  const value = {
    confirm,
    confirmAction,
    confirmApprove,
    confirmDelete,
    confirmWarning,
    confirmReject
  };

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {modalConfig && (
        <ConfirmationModal
          isOpen={modalConfig.isOpen}
          onClose={() => handleClose(false)}
          onConfirm={(inputValue) => handleClose(inputValue !== undefined ? inputValue : true)}
          title={modalConfig.title}
          message={modalConfig.message}
          variant={modalConfig.variant}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          icon={modalConfig.icon}
          details={modalConfig.details}
          showInput={modalConfig.showInput}
          inputPlaceholder={modalConfig.inputPlaceholder}
          inputRequired={modalConfig.inputRequired}
        />
      )}
    </ConfirmationContext.Provider>
  );
};

export default ConfirmationContext;
