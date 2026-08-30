import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Send, Check, Clock, User, MapPin,
  FileText, Camera, MessageSquare, CheckCircle, XCircle, Users,
  List, PlusCircle, LayoutDashboard, ClipboardCheck,
  Paperclip, Download, File, Image, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const QARDetail = () => {
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const API_URL = 'http://localhost:5000';

  const [qar, setQar] = useState(null);
  const [defects, setDefects] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Response form
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Response file attachments
  const [responseFiles, setResponseFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Validation form
  const [rejectionReason, setRejectionReason] = useState('');

  // New comment
  const [newComment, setNewComment] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Modal states for alerts
  const [alertModal, setAlertModal] = useState({ open: false, type: 'info', title: '', message: '', onConfirm: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Helper functions for modals
  const showAlert = (type, title, message) => {
    setAlertModal({ open: true, type, title, message, onConfirm: null });
  };
  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };
  const closeAlert = () => setAlertModal({ ...alertModal, open: false });
  const closeConfirm = () => setConfirmModal({ ...confirmModal, open: false });

  useEffect(() => {
    loadQar();
    loadCurrentUser();
    loadResponseFiles();
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadResponseFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/qar/${id}/response-files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setResponseFiles(data.files || []);
    } catch (err) {
      console.error('Error loading response files:', err);
    }
  };

  const handleUploadResponseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/qar/${id}/response-files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setResponseFiles(prev => [...prev, data.file]);
      } else {
        showAlert('error', 'Error', data.message || 'Error al subir archivo');
      }
    } catch (err) {
      showAlert('error', 'Error', 'Error al subir archivo');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteResponseFile = async (fileId) => {
    showConfirm('Eliminar Archivo', '¿Estás seguro de eliminar este archivo?', async () => {
      closeConfirm();
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/qar/${id}/response-files/${fileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setResponseFiles(prev => prev.filter(f => f.id !== fileId));
      } catch (err) {
        showAlert('error', 'Error', 'Error al eliminar archivo');
      }
    });
  };

  const loadQar = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/qar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setQar(data.qar);
        setDefects(data.defects || []);
        setRecipients(data.recipients || []);
        setComments(data.comments || []);

        // Pre-fill response if exists
        if (data.qar.rootCause) setRootCause(data.qar.rootCause);
        if (data.qar.correctiveAction) setCorrectiveAction(data.qar.correctiveAction);
        if (data.qar.resolutionNotes) setResolutionNotes(data.qar.resolutionNotes);
      }
    } catch (err) {
      console.error('Error loading QAR:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper para generar mailto de notificación
  const openMailto = (toEmails, subject, body) => {
    const to = toEmails.filter(e => e).join('; ');
    if (!to) return;
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSubmitResponse = async () => {
    if (!rootCause.trim() || !correctiveAction.trim()) {
      showAlert('warning', 'Campos Requeridos', 'Causa raíz y acción correctiva son requeridas');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/qar/${id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rootCause,
          correctiveAction,
          resolutionNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        showAlert('success', 'Respuesta Enviada', data.message);
        loadQar();

        // Mailto a validadores para que revisen la respuesta
        const validatorEmails = validationRecipients.map(r => r.email);
        if (validatorEmails.length > 0) {
          const subject = `QAR ${qar?.alertNumber} - Respuesta Enviada - Pendiente de Validación`;
          const body = `Se ha enviado respuesta al QAR ${qar?.alertNumber}.

Título: ${qar?.title || 'N/A'}
Parte: ${qar?.partNumber || 'N/A'} - ${qar?.partName || ''}

Causa Raíz: ${rootCause}

Acción Correctiva: ${correctiveAction}

Por favor revisa y valida la respuesta en el sistema.`;
          openMailto(validatorEmails, subject, body);
        }
      } else {
        showAlert('error', 'Error', data.message || 'Error al enviar respuesta');
      }
    } catch (err) {
      showAlert('error', 'Error', 'Error al enviar respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      showAlert('warning', 'Campo Requerido', 'Por favor indica el motivo del rechazo');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/qar/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          approved,
          rejectionReason
        })
      });

      const data = await res.json();
      if (data.success) {
        showAlert('success', approved ? 'QAR Aprobado' : 'QAR Rechazado', data.message);
        setRejectionReason('');
        loadQar();

        // Mailto según acción
        const allEmails = [...responseRecipients, ...validationRecipients].map(r => r.email);
        const responseEmails = responseRecipients.map(r => r.email);

        if (approved) {
          const subject = `QAR ${qar?.alertNumber} - APROBADO Y CERRADO`;
          const body = `El QAR ${qar?.alertNumber} ha sido aprobado y cerrado.

Título: ${qar?.title || 'N/A'}
Parte: ${qar?.partNumber || 'N/A'} - ${qar?.partName || ''}

El QAR ha sido cerrado exitosamente. Gracias por su colaboración.`;
          openMailto(allEmails, subject, body);
        } else {
          const subject = `QAR ${qar?.alertNumber} - RECHAZADO - Requiere Corrección`;
          const body = `El QAR ${qar?.alertNumber} ha sido rechazado y requiere corrección.

Título: ${qar?.title || 'N/A'}
Parte: ${qar?.partNumber || 'N/A'} - ${qar?.partName || ''}

Motivo del Rechazo:
${rejectionReason}

Por favor revisa y corrige la respuesta en el sistema.`;
          openMailto(responseEmails, subject, body);
        }
      } else {
        showAlert('error', 'Error', data.message || 'Error en validación');
      }
    } catch (err) {
      showAlert('error', 'Error', 'Error en validación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/qar/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: newComment, commentType: 'note' })
      });

      const data = await res.json();
      if (data.success) {
        setNewComment('');
        loadQar();
      }
    } catch (err) {
      showAlert('error', 'Error', 'Error al agregar comentario');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toUpperCase() : '';
  };

  const isImage = (mimetype) => mimetype?.startsWith('image/');

  const getStatusConfig = (status) => {
    const configs = {
      'EMITIDO': { color: t.warning, label: 'Pendiente de Respuesta' },
      'RESPONDIDO': { color: t.accent, label: 'Pendiente de Validación' },
      'CERRADO': { color: t.success, label: 'Cerrado' },
      'RECHAZADO': { color: t.error, label: 'Rechazado' }
    };
    return configs[status] || { color: t.textMuted, label: status };
  };

  const responseRecipients = recipients.filter(r => r.recipientType === 'response');
  const validationRecipients = recipients.filter(r => r.recipientType === 'validation');

  const canRespond = qar?.status === 'EMITIDO' || qar?.status === 'RECHAZADO';
  const canValidate = qar?.status === 'RESPONDIDO';

  // ─── MODAL COMMON STYLES ──────────────────────────────────────────────────────
  const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001
  };

  const modalCard = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
    maxWidth: 420,
    width: '90%',
    overflow: 'hidden'
  };

  const modalHeader = {
    height: 48,
    padding: '0 16px',
    borderBottom: `1px solid ${t.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const modalFooter = {
    height: 56,
    padding: '0 16px',
    backgroundColor: t.field,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10
  };

  const getModalDotColor = (type) => {
    if (type === 'success') return t.success;
    if (type === 'error') return t.error;
    if (type === 'warning') return t.warning;
    return t.accent;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
        <div style={{ color: t.text, textAlign: 'center', padding: 60 }}>Cargando...</div>
      </div>
    );
  }

  if (!qar) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
        <div style={{ color: t.text, textAlign: 'center', padding: 60 }}>QAR no encontrado</div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(qar.status);
  const isReadOnly = qar.status === 'CERRADO';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: 24 }}>
      {/* Read-only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: t.accentBg,
          border: `1px solid ${t.accentBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ color: t.text, fontWeight: 500, fontSize: 13 }}>
            Este QAR está cerrado y es de solo lectura
          </span>
        </div>
      )}

      {/* Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/qar-list')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: t.textMuted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/qar-list')}
            style={{
              padding: '8px 14px',
              backgroundColor: t.bgCard,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13
            }}
          >
            <List size={16} />
            Lista QAR
          </button>
          <button
            onClick={() => navigate('/qar-create')}
            style={{
              padding: '8px 14px',
              backgroundColor: t.primary,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13
            }}
          >
            <PlusCircle size={16} />
            Nuevo QAR
          </button>
          <button
            onClick={() => navigate('/defect-capture')}
            style={{
              padding: '8px 14px',
              backgroundColor: t.bgCard,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13
            }}
          >
            <ClipboardCheck size={16} />
            Inspección
          </button>
          <button
            onClick={() => navigate('/defect-dashboard')}
            style={{
              padding: '8px 14px',
              backgroundColor: t.bgCard,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13
            }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Header - Now normal page header, not slate */}
      <div style={{
        backgroundColor: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                color: t.textMuted,
                letterSpacing: 1
              }}>
                {qar.alertNumber}
              </span>
              <button
                onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
            <h1 style={{
              fontSize: 19,
              fontWeight: 600,
              color: t.text,
              margin: 0
            }}>
              {qar.title}
            </h1>
          </div>
          {/* Status chip */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: `${statusConfig.color}15`,
            color: statusConfig.color,
            border: `1px solid ${statusConfig.color}30`
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusConfig.color }} />
            {statusConfig.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: t.textMuted, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            Emitido por: {qar.reportedByName || '-'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} />
            {formatDate(qar.createdAt)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} />
            {qar.departmentName || 'N/A'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* ====== LEFT COLUMN ====== */}
        <div>
          {/* Info Card */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FileText size={18} />
              Información General
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cliente</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{qar.clientName || '-'}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Proyecto</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{qar.projectName || '-'}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Parte</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{qar.partNumber || '-'}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Severidad</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: qar.severityColor || t.textMuted
                  }} />
                  <span style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{qar.severityName}</span>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Departamento Responsable</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{qar.departmentName || '-'}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Defectos Relacionados</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>{defects.length}</div>
              </div>
            </div>
            {qar.description && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Descripción</div>
                <div style={{ color: t.textMuted, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                  {qar.description}
                </div>
              </div>
            )}
          </div>

          {/* Defects Table */}
          {defects.length > 0 && (
            <div style={{
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.text,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: t.warning }} />
                Defectos Asociados ({defects.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Folio</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Defecto</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Estación</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Inspector</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', backgroundColor: t.field, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.line}`, height: 34 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((d, idx) => (
                    <tr key={idx} style={{ height: 44 }}>
                      <td style={{ padding: '0 12px', fontWeight: 600, color: t.accent, borderBottom: `1px solid ${t.line}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{d.entryNumber}</td>
                      <td style={{ padding: '0 12px', color: t.text, borderBottom: `1px solid ${t.line}`, maxWidth: 150 }}>{d.defectName}</td>
                      <td style={{ padding: '0 12px', color: t.text, borderBottom: `1px solid ${t.line}` }}>{d.stationName || '-'}</td>
                      <td style={{ padding: '0 12px', color: t.text, borderBottom: `1px solid ${t.line}` }}>{d.inspectorName || '-'}</td>
                      <td style={{ padding: '0 12px', color: t.textMuted, borderBottom: `1px solid ${t.line}`, fontSize: 12 }}>{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ====== RESPONSE SECTION ====== */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Send size={18} color={t.accent} />
              Respuesta al QAR
              {qar.status === 'EMITIDO' && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: t.warning, fontWeight: 500 }}>
                  PENDIENTE
                </span>
              )}
              {(qar.status === 'RESPONDIDO' || qar.status === 'CERRADO') && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: t.success, fontWeight: 500 }}>
                  COMPLETADO
                </span>
              )}
              {qar.status === 'RECHAZADO' && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: t.error, fontWeight: 500 }}>
                  REQUIERE CORRECCIÓN
                </span>
              )}
            </div>

            {/* Rejection banner - simple warningBg row */}
            {qar.status === 'RECHAZADO' && (
              <div style={{
                backgroundColor: t.warningBg,
                border: `1px solid ${t.warningBorder}`,
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: t.text
              }}>
                <span style={{ fontWeight: 600 }}>Respuesta rechazada</span> — El validador requiere correcciones.
              </div>
            )}

            {/* Show existing response or form */}
            {(qar.rootCause || qar.correctiveAction) && !canRespond ? (
              <>
                {/* Response sections - micro title + paragraph, no boxes */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Causa Raíz</div>
                  <div style={{ color: t.text, fontSize: 14, lineHeight: 1.5 }}>{qar.rootCause || '-'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Acción Correctiva</div>
                  <div style={{ color: t.text, fontSize: 14, lineHeight: 1.5 }}>{qar.correctiveAction || '-'}</div>
                </div>
                {qar.resolutionNotes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Notas Adicionales</div>
                    <div style={{ color: t.text, fontSize: 14, lineHeight: 1.5 }}>{qar.resolutionNotes}</div>
                  </div>
                )}

                {/* Response files - chip with extension, name, weight · date, × delete */}
                {responseFiles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Paperclip size={13} />
                      Archivos Adjuntos ({responseFiles.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {responseFiles.map(f => (
                        <div key={f.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          backgroundColor: t.bgPanel,
                          borderRadius: 6,
                          border: `1px solid ${t.border}`,
                          fontSize: 13
                        }}>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: t.field,
                            borderRadius: 3,
                            fontSize: 10,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 600,
                            color: t.textMuted
                          }}>
                            {getFileExtension(f.originalName)}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.text }}>
                            {f.originalName}
                          </span>
                          <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap' }}>
                            {formatFileSize(f.fileSize)} · {formatDate(f.uploadedAt || f.createdAt)}
                          </span>
                          <a
                            href={`${API_URL}${f.url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: t.accent, display: 'flex' }}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qar.respondedByName && (
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>
                    Respondido por: {qar.respondedByName} el {formatDate(qar.responseDate)}
                  </div>
                )}
              </>
            ) : canRespond ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Causa Raíz *</label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: t.field,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      fontSize: 14,
                      minHeight: 100,
                      resize: 'vertical'
                    }}
                    placeholder="Describe la causa raíz del problema..."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Acción Correctiva *</label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: t.field,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      fontSize: 14,
                      minHeight: 100,
                      resize: 'vertical'
                    }}
                    placeholder="Describe la acción correctiva implementada..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Notas Adicionales</label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: t.field,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      fontSize: 14,
                      minHeight: 80,
                      resize: 'vertical'
                    }}
                    placeholder="Notas o comentarios adicionales (opcional)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                {/* File attachments */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Paperclip size={13} />
                    Archivos Adjuntos
                  </label>

                  {/* Already uploaded files */}
                  {responseFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {responseFiles.map(f => (
                        <div key={f.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          backgroundColor: t.bgPanel,
                          borderRadius: 6,
                          border: `1px solid ${t.border}`,
                          fontSize: 13
                        }}>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: t.field,
                            borderRadius: 3,
                            fontSize: 10,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 600,
                            color: t.textMuted
                          }}>
                            {getFileExtension(f.originalName)}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.text }}>
                            {f.originalName}
                          </span>
                          <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                            {formatFileSize(f.fileSize)}
                          </span>
                          <a
                            href={`${API_URL}${f.url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: t.accent, display: 'flex' }}
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => handleDeleteResponseFile(f.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.error, padding: 0, display: 'flex', fontSize: 14 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone - 1px dashed border */}
                  <label
                    htmlFor="response-file-input"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px dashed ${uploadingFile ? t.accent : t.border}`,
                      borderRadius: 8,
                      padding: '16px',
                      textAlign: 'center',
                      cursor: uploadingFile ? 'wait' : 'pointer',
                      backgroundColor: t.bgCard,
                      transition: 'border-color 0.2s'
                    }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = t.accent; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = t.border; }}
                    onDrop={async e => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = t.border;
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      const fakeEvent = { target: { files: [file], value: '' } };
                      await handleUploadResponseFile(fakeEvent);
                    }}
                  >
                    <Paperclip size={18} color={t.textMuted} style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: t.textMuted }}>
                      {uploadingFile ? 'Subiendo...' : 'Arrastra o haz clic'}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                      Imágenes, PDF, Word, Excel · Máx. 10 MB
                    </div>
                    <input
                      id="response-file-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      style={{ display: 'none' }}
                      onChange={handleUploadResponseFile}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: 14,
                    backgroundColor: t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: submitting ? 0.7 : 1
                  }}
                  onClick={handleSubmitResponse}
                  disabled={submitting}
                >
                  <Send size={18} />
                  {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: 13 }}>Sin respuesta aún</p>
            )}
          </div>

          {/* ====== VALIDATION SECTION ====== */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle size={18} color={t.success} />
              Validación
            </div>

            {qar.status === 'CERRADO' ? (
              /* Closed banner - simple row with chip, not color block */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                backgroundColor: t.bgPanel,
                borderRadius: 8
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: t.successBg,
                  color: t.successFg,
                  border: `1px solid ${t.successBorder}`
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: t.successFg }} />
                  Cerrado y validado
                </span>
                {qar.validatedByName && (
                  <span style={{ color: t.textMuted, fontSize: 12 }}>
                    por {qar.validatedByName} el {formatDate(qar.validationDate)}
                  </span>
                )}
              </div>
            ) : canValidate ? (
              <>
                <p style={{ color: t.textMuted, fontSize: 13, marginBottom: 16 }}>
                  Revisa la respuesta y decide si aprobar o rechazar.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Motivo de Rechazo (si aplica)</label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: 10,
                      backgroundColor: t.field,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      fontSize: 13,
                      minHeight: 60,
                      resize: 'vertical'
                    }}
                    placeholder="Indica el motivo si vas a rechazar..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {/* Approve - primary (not success) */}
                  <button
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: t.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: submitting ? 0.7 : 1
                    }}
                    onClick={() => handleValidation(true)}
                    disabled={submitting}
                  >
                    <CheckCircle size={18} />
                    Aprobar y Cerrar
                  </button>
                  {/* Reject - secondary with errorBorder and error text */}
                  <button
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: 'transparent',
                      color: t.error,
                      border: `1px solid ${t.errorBorder}`,
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: submitting ? 0.7 : 1
                    }}
                    onClick={() => handleValidation(false)}
                    disabled={submitting}
                  >
                    <XCircle size={18} />
                    Rechazar
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: 13 }}>
                {qar.status === 'EMITIDO' && 'Esperando respuesta antes de poder validar.'}
                {qar.status === 'RECHAZADO' && 'Esperando corrección de la respuesta.'}
              </p>
            )}
          </div>
        </div>

        {/* ====== RIGHT COLUMN ====== */}
        <div>
          {/* Recipients - list with avatar, name, status text */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Users size={18} />
              Destinatarios
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Respuesta ({responseRecipients.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {responseRecipients.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: t.bgPanel,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: t.textMuted
                    }}>
                      {(r.firstName?.[0] || '')}{(r.lastName?.[0] || '')}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: t.text }}>{r.firstName} {r.lastName}</span>
                    <span style={{ fontSize: 11, color: r.acknowledgedAt ? t.successFg : t.textDim }}>
                      {r.acknowledgedAt ? 'confirmado' : 'pendiente'}
                    </span>
                  </div>
                ))}
                {responseRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: 13 }}>Ninguno</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Validación ({validationRecipients.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {validationRecipients.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: t.bgPanel,
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: t.textMuted
                    }}>
                      {(r.firstName?.[0] || '')}{(r.lastName?.[0] || '')}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: t.text }}>{r.firstName} {r.lastName}</span>
                  </div>
                ))}
                {validationRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: 13 }}>Ninguno</span>
                )}
              </div>
            </div>
          </div>

          {/* Photos - normalized frames */}
          {(qar.photoNokPath || qar.photoOkPath) && (
            <div style={{
              backgroundColor: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.text,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Camera size={18} />
                Evidencia Fotográfica
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.error }} />
                    NOK
                  </div>
                  {qar.photoNokPath ? (
                    <img
                      src={`${API_URL}${qar.photoNokPath}`}
                      alt="NOK"
                      style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 4, border: `1px solid ${t.border}` }}
                    />
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: 12 }}>Sin foto</span>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.success }} />
                    OK
                  </div>
                  {qar.photoOkPath ? (
                    <img
                      src={`${API_URL}${qar.photoOkPath}`}
                      alt="OK"
                      style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 4, border: `1px solid ${t.border}` }}
                    />
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: 12 }}>Sin foto</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comments Timeline */}
          <div style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: t.text,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <MessageSquare size={18} />
              Historial ({comments.length})
            </div>

            <div style={{ position: 'relative' }}>
              {comments.map((c, idx) => {
                const dotColor =
                  c.commentType === 'status_change' ? t.accent :
                  c.commentType === 'response' ? t.success :
                  c.commentType === 'validation' ? t.success :
                  c.commentType === 'rejection' ? t.error : t.textMuted;

                return (
                  <div key={idx} style={{
                    position: 'relative',
                    paddingLeft: 28,
                    paddingBottom: 16,
                    borderLeft: `2px solid ${t.border}`,
                    marginLeft: 8
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: -9,
                      top: 0,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      border: `2px solid ${t.bgCard}`
                    }} />
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>
                      {c.userName} - {formatDate(c.createdAt)}
                    </div>
                    <div style={{ fontSize: 13, color: t.text }}>
                      {c.comment}
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p style={{ color: t.textMuted, fontSize: 13 }}>Sin comentarios aún</p>
              )}
            </div>

            {/* Add comment */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
              <textarea
                style={{
                  width: '100%',
                  padding: 10,
                  backgroundColor: t.field,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text,
                  fontSize: 13,
                  minHeight: 60,
                  resize: 'vertical',
                  marginBottom: 8
                }}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar comentario..."
              />
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====== MODAL: Alert ====== */}
      {alertModal.open && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getModalDotColor(alertModal.type) }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{alertModal.title}</span>
              </div>
              <button onClick={closeAlert} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 18 }}>
                ✕
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ color: t.textMuted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
            </div>
            <div style={modalFooter}>
              <button
                onClick={closeAlert}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Confirm ====== */}
      {confirmModal.open && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.warning }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{confirmModal.title}</span>
              </div>
              <button onClick={closeConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 18 }}>
                ✕
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ color: t.textMuted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                {confirmModal.message}
              </p>
            </div>
            <div style={modalFooter}>
              <button
                onClick={closeConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QARDetail;
