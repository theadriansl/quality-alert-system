/**
 * ReleaseModal.js
 * Modal para liberar defecto
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ReleaseModal = ({
  isOpen,
  onClose,
  defect,
  releaseReasons = [],
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
    releaseReasonId: '',
    releaseTimeMinutes: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar si el motivo requiere comentario
  const selectedReason = releaseReasons.find(r => r.id === parseInt(formData.releaseReasonId));
  const requiresComment = selectedReason?.requiresComment || false;

  useEffect(() => {
    if (isOpen && releaseReasons.length > 0) {
      setFormData(prev => ({
        ...prev,
        releaseReasonId: releaseReasons[0]?.id || ''
      }));
    }
  }, [isOpen, releaseReasons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.releaseReasonId) {
      setError('Selecciona un motivo de liberación');
      return;
    }
    if (requiresComment && !formData.notes.trim()) {
      setError('Este motivo requiere comentarios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit({
        releaseReasonId: parseInt(formData.releaseReasonId),
        releaseTimeMinutes: parseInt(formData.releaseTimeMinutes) || 1,
        notes: formData.notes
      });

      if (!result.success) {
        setError(result.message || 'Error al liberar defecto');
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
      fontWeight: '600',
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
    hint: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '4px'
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
      backgroundColor: '#8b5cf6',
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
            <CheckCircle size={18} />
            Liberar Defecto
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
                {defect.repairTypeName && (
                  <div><strong>Reparación:</strong> {defect.repairTypeName}</div>
                )}
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Motivo de Liberación *</label>
              <select
                style={styles.select}
                value={formData.releaseReasonId}
                onChange={e => setFormData({ ...formData, releaseReasonId: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {releaseReasons.map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                    {reason.allowsWithoutRepair && ' (sin reparar)'}
                  </option>
                ))}
              </select>
              {selectedReason?.description && (
                <div style={styles.hint}>{selectedReason.description}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tiempo de Inspección (minutos)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.releaseTimeMinutes}
                onChange={e => setFormData({ ...formData, releaseTimeMinutes: e.target.value })}
                min="1"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Notas {requiresComment && '*'}
              </label>
              <textarea
                style={styles.textarea}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder={requiresComment ? 'Comentario requerido para este motivo...' : 'Observaciones opcionales...'}
                required={requiresComment}
              />
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnSubmit} disabled={loading}>
              {loading ? 'Procesando...' : 'Liberar Defecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReleaseModal;
