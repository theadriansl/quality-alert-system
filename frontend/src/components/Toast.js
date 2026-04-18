import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const { theme: t } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Solo auto-cerrar si NO es error
    if (type !== 'error') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  // Handler para cerrar al mover el mouse (solo para success/warning)
  const handleMouseMove = () => {
    if (type !== 'error') {
      setIsVisible(false);
      setTimeout(() => onClose(), 300);
    }
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: t.success,
          borderColor: t.success
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: t.error,
          borderColor: t.error
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: t.warning,
          borderColor: t.warning
        };
      default:
        return {
          icon: CheckCircle2,
          bgColor: t.success,
          borderColor: t.success
        };
    }
  };

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: isVisible
          ? 'translate(-50%, -50%) scale(1)'
          : 'translate(-50%, -50%) scale(0.9)',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px',
        backgroundColor: t.bgCard,
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Icon
        size={20}
        style={{
          color: config.bgColor,
          flexShrink: 0,
          marginTop: '2px'
        }}
      />
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '500',
          color: t.text,
          lineHeight: '1.5'
        }}>
          {message}
        </p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(), 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          color: t.textMuted,
          flexShrink: 0
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
