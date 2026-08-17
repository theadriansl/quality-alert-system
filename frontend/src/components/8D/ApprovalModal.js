import React, { useState } from 'react';
import { approveSection, rejectSection } from '../../services/approvalsService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ApprovalModal = ({
  isOpen,
  onClose,
  reportId,
  section,
  level,
  onSuccess
}) => {
  const { theme: t } = useTheme();
  useLanguage(); // mantener hook activo
  const [action, setAction] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleApprove = () => {
    setAction('approve');
  };

  const handleReject = () => {
    setAction('reject');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevenir propagación de eventos

    // Prevenir doble-clic: si ya está procesando, ignorar
    if (loading) {
      return;
    }

    if (action === 'reject' && !comments.trim()) {
      setError('Los comentarios son obligatorios al rechazar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (action === 'approve') {
        result = await approveSection(reportId, section, level, comments);
      } else if (action === 'reject') {
        result = await rejectSection(reportId, section, level, comments);
      }

      alert(` ${action === 'approve' ? 'Aprobado' : 'Rechazado'} exitosamente`);
      onSuccess(result);
      handleClose();
    } catch (err) {
      console.error(' Error en aprobación/rechazo:', err);
      setError(err.error || 'Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction(null);
    setComments('');
    setError(null);
    onClose();
  };

  const getSectionName = (sec) => {
    const names = {
      issue: 'Issue (D1-D2-D3)',
      countermeasure: 'Countermeasure (D4-D5-D6)',
      confirmation: 'Confirmation (D7-D8)'
    };
    return names[sec] || sec;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="rounded-lg shadow-xl p-6 w-full max-w-md" style={{ backgroundColor: t.bgCard, color: t.text }}>
        <h2 className="text-2xl font-bold mb-4" style={{ color: t.text }}>Revisar Aprobación</h2>

        <div className="mb-4">
          <p className="text-sm" style={{ color: t.textMuted }}>Sección</p>
          <p className="font-semibold" style={{ color: t.text }}>{getSectionName(section)}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm" style={{ color: t.textMuted }}>Nivel de Aprobador</p>
          <p className="font-semibold" style={{ color: t.text }}>Aprobador {level}</p>
        </div>

        {!action && (
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              className="w-full font-bold py-3 px-4 rounded transition duration-150"
              style={{ backgroundColor: t.success, color: 'white' }}
            >
               Aprobar
            </button>
            <button
              onClick={handleReject}
              className="w-full font-bold py-3 px-4 rounded transition duration-150"
              style={{ backgroundColor: t.error, color: 'white' }}
            >
               Rechazar
            </button>
            <button
              onClick={handleClose}
              className="w-full font-bold py-3 px-4 rounded transition duration-150"
              style={{ backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}` }}
            >
              Cancelar
            </button>
          </div>
        )}

        {action && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: t.textMuted }}>
                Comentarios {action === 'reject' && <span style={{ color: t.error }}>*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
                style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, color: t.text }}
                placeholder={action === 'reject' ? 'Explica la razón del rechazo...' : 'Comentarios adicionales (opcional)'}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p className="text-xs mt-1" style={{ color: t.error }}>
                  Debes proporcionar una razón para rechazar
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: `${t.error}20`, border: `1px solid ${t.error}`, color: t.error }}>
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 font-bold py-2 px-4 rounded transition duration-150 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: action === 'approve' ? t.success : t.error, color: 'white' }}
              >
                {loading ? 'Procesando...' : `Confirmar ${action === 'approve' ? 'Aprobación' : 'Rechazo'}`}
              </button>
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={loading}
                className="flex-1 font-bold py-2 px-4 rounded transition duration-150"
                style={{ backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}` }}
              >
                Atrás
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApprovalModal;
