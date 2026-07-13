import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ApprovalModal from './ApprovalModal';
import ApprovalTimeline from './ApprovalTimeline';
import { getApprovalStatus, submitForApproval, canUserApprove } from '../../services/approvalsService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ApprovalPanel = ({ reportId, currentUser, onStatusChange, section = 'issue' }) => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadApprovalStatus();
    }
  }, [reportId]);

  const loadApprovalStatus = async () => {
    try {
      setLoading(true);
      const status = await getApprovalStatus(reportId);
      setApprovalStatus(status);
    } catch (error) {
      console.error('Error al cargar estado de aprobación:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!window.confirm('¿Estás seguro de que quieres enviar este reporte a aprobación?')) {
      return;
    }

    try {
      setSubmitting(true);
      await submitForApproval(reportId);
      alert(' Reporte enviado a aprobación exitosamente');
      await loadApprovalStatus();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      alert(` Error: ${error.error || 'No se pudo enviar a aprobación'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalSuccess = async (result) => {
    await loadApprovalStatus();
    if (onStatusChange) onStatusChange();
  };

  if (loading) {
    return (
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: t.bgCard }}>
        <p style={{ color: t.textMuted }}>Cargando estado de aprobación...</p>
      </div>
    );
  }

  if (!approvalStatus) {
    return (
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: t.bgCard }}>
        <p style={{ color: t.textMuted }}>No se pudo cargar el estado de aprobación</p>
      </div>
    );
  }

  const { current_status, pending_approver, approval_history } = approvalStatus;
  const canApprove = currentUser && pending_approver && canUserApprove(currentUser, pending_approver);

  return (
    <div className="space-y-6">
      {/* Estado Actual */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: t.bgCard }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: t.text }}>
           Estado de Aprobación {section === 'd4' ? '- D4 Análisis de Causa Raíz' : ''}
        </h3>

        <div className="mb-4">
          <p className="text-sm mb-2" style={{ color: t.textMuted }}>Estado Actual:</p>
          <StatusBadge status={current_status} />
        </div>

        {/* Botón de enviar a aprobación (solo si está en draft) */}
        {current_status === 'draft' && approvalStatus.created_by === currentUser?.id && (
          <div className="mt-4">
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="font-bold py-2 px-6 rounded transition duration-150"
              style={{ backgroundColor: t.accent, color: 'white' }}
            >
              {submitting ? 'Enviando...' : ' Enviar a Aprobación'}
            </button>
            <p className="text-xs mt-2" style={{ color: t.textMuted }}>
              Al enviar a aprobación, comenzará el flujo de aprobaciones en cascada
            </p>
          </div>
        )}

        {/* Información del aprobador pendiente */}
        {pending_approver && (
          <div className="mt-4 p-4 rounded" style={{ backgroundColor: `${t.warning}15`, border: `1px solid ${t.warning}` }}>
            <p className="font-semibold mb-2" style={{ color: t.warning }}>
               Esperando Aprobación
            </p>
            <p className="text-sm" style={{ color: t.text }}>
              <span className="font-medium">Sección:</span>{' '}
              {pending_approver.section === 'issue' ? 'Issue (D1-D2-D3)' :
               pending_approver.section === 'countermeasure' ? 'Countermeasure (D4-D5-D6)' :
               'Confirmation (D7-D8)'}
            </p>
            <p className="text-sm" style={{ color: t.text }}>
              <span className="font-medium">Nivel:</span> Aprobador {pending_approver.level}
            </p>

            {pending_approver.users && pending_approver.users.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1" style={{ color: t.text }}>Aprobadores asignados:</p>
                <ul className="list-disc list-inside text-sm" style={{ color: t.textMuted }}>
                  {pending_approver.users.map((user, index) => (
                    <li key={index}>
                      {user.firstName} {user.lastName} - {user.position}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón de aprobar/rechazar (solo si el usuario actual puede aprobar) */}
            {canApprove && (
              <div className="mt-4">
                <button
                  onClick={() => setShowModal(true)}
                  className="font-bold py-2 px-4 rounded transition duration-150"
                  style={{ backgroundColor: t.success, color: 'white' }}
                >
                   Revisar y Aprobar/Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Estado completado */}
        {current_status === 'closed' && (
          <div className="mt-4 p-4 rounded" style={{ backgroundColor: `${t.success}15`, border: `1px solid ${t.success}` }}>
            <p className="font-semibold" style={{ color: t.success }}>
               8D Completado y Cerrado
            </p>
            <p className="text-sm mt-1" style={{ color: t.text }}>
              Todas las aprobaciones han sido completadas exitosamente
            </p>
          </div>
        )}
      </div>

      {/* Timeline de Aprobaciones */}
      {approval_history && approval_history.length > 0 && (
        <ApprovalTimeline approvalHistory={approval_history} />
      )}

      {/* Modal de Aprobación */}
      {canApprove && (
        <ApprovalModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          reportId={reportId}
          section={pending_approver.section}
          level={pending_approver.level}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  );
};

export default ApprovalPanel;
