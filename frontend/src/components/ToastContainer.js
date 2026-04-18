import React from 'react';
import Toast from './Toast';

const ToastContainer = ({ toasts, removeToast }) => {
  // Toast component handles its own theming
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            marginTop: index > 0 ? '10px' : '0'
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
