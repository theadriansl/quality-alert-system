/**
 * RepairModal.js
 * Modal para completar reparación de defecto
 */

import React, { useState, useEffect } from 'react';
import { X, Wrench } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const RepairModal = ({
  isOpen,
  onClose,
  defect,
  repairTypes = [],
  rootCauses = [],
  onSubmit,
  theme
}) => {
  const { t: tr, language, changeLanguage } = useLanguage();
  const t = theme || {
    bg: '#ffffff',
    bgPanel: '#ffffff',
    bgInput: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    accent: '#3b82f6'
  };

  const [formData, setFormData] = useState({
    repairTypeId: '',
    repairTimeMinutes: 5,
    rootCauseId: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && repairTypes.length > 0) {
      setFormData(prev => ({
        ...prev,
        repairTypeId: repairTypes[0]?.id || ''
      }));
    }
  }, [isOpen, repairTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.repairTypeId) {
      setError('Selecciona un tipo de reparación');
      return;
    }
    if (!formData.repairTimeMinutes || formData.repairTimeMinutes < 1) {
      setError('Ingresa tiempo de reparación válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit({
        repairTypeId: parseInt(formData.repairTypeId),
        repairTimeMinutes: parseInt(formData.repairTimeMinutes),
        rootCauseId: formData.rootCauseId ? parseInt(formData.rootCauseId) : null,
        notes: formData.notes
      });

      if (!result.success) {
        setError(result.message || 'Error al completar reparación');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      width: '90%',
      maxWidth: '450px',
      maxHeight: '85vh',
      overflow: 'auto'
    },
    header: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      fontSize: '16px',
      fontWeight: '700',
      color: t.text,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: t.textMuted,
      padding: '4px'
    },
    body: {
      padding: '20px'
    },
    defectInfo: {
      padding: '12px',
      backgroundColor: t.bgInput,
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '13px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '6px'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical',
      boxSizing: 'border-box'
    },
    error: {
      padding: '10px 12px',
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '13px'
    },
    footer: {
      padding: '16px 20px',
      borderTop: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    },
    btnCancel: {
      padding: '10px 20px',
      backgroundColor: t.bgInput,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    btnSubmit: {
      padding: '10px 20px',
      backgroundColor: '#22c55e',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            <Wrench size={18} />
            Completar Reparación
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.body}>
            {defect && (
              <div style={styles.defectInfo}>
                <div><strong>Entry:</strong> {defect.entryNumber || defect.entry_number}</div>
                <div><strong>Defecto:</strong> {defect.defectName || defect.defectCode}</div>
                <div><strong>Serial:</strong> {defect.serialNumber || defect.lotNumber}</div>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Reparación *</label>
              <select
                style={styles.select}
                value={formData.repairTypeId}
                onChange={e => setFormData({ ...formData, repairTypeId: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {repairTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tiempo de Reparación (minutos) *</label>
              <input
                type="number"
                style={styles.input}
                value={formData.repairTimeMinutes}
                onChange={e => setFormData({ ...formData, repairTimeMinutes: e.target.value })}
                min="1"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Causa Raíz</label>
              <select
                style={styles.select}
                value={formData.rootCauseId}
                onChange={e => setFormData({ ...formData, rootCauseId: e.target.value })}
              >
                <option value="">-- Opcional --</option>
                {rootCauses.map(cause => (
                  <option key={cause.id} value={cause.id}>{cause.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notas</label>
              <textarea
                style={styles.textarea}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Descripción de la reparación realizada..."
              />
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Completar Reparación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RepairModal;
