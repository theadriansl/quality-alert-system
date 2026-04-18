import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Send, Check, Clock, User, MapPin,
  FileText, Camera, MessageSquare, CheckCircle, XCircle, Users,
  List, PlusCircle, LayoutDashboard, ClipboardCheck,
  Paperclip, Trash2, Download, File, Image
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const QARDetail = () => {
  const { theme: t } = useTheme();
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
  const [responseFiles, setResponseFiles] = useState([]);   // already uploaded
  const [uploadingFile, setUploadingFile] = useState(false);

  // Validation form
  const [rejectionReason, setRejectionReason] = useState('');

  // New comment
  const [newComment, setNewComment] = useState('');

  const [submitting, setSubmitting] = useState(false);

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
        alert(data.message || 'Error al subir archivo');
      }
    } catch (err) {
      alert('Error al subir archivo');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteResponseFile = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/qar/${id}/response-files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setResponseFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert('Error al eliminar archivo');
    }
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

  const handleSubmitResponse = async () => {
    if (!rootCause.trim() || !correctiveAction.trim()) {
      alert('Causa raíz y acción correctiva son requeridas');
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
        alert(data.message);
        loadQar();
      } else {
        alert(data.message || 'Error al enviar respuesta');
      }
    } catch (err) {
      alert('Error al enviar respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = async (approved) => {
    if (!approved && !rejectionReason.trim()) {
      alert('Por favor indica el motivo del rechazo');
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
        alert(data.message);
        setRejectionReason('');
        loadQar();
      } else {
        alert(data.message || 'Error en validación');
      }
    } catch (err) {
      alert('Error en validación');
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
      alert('Error al agregar comentario');
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

  const isImage = (mimetype) => mimetype?.startsWith('image/');

  const getStatusConfig = (status) => {
    const configs = {
      'EMITIDO': { color: t.warning, label: 'Pendiente de Respuesta', icon: AlertTriangle },
      'RESPONDIDO': { color: t.accent, label: 'Pendiente de Validación', icon: Clock },
      'CERRADO': { color: t.success, label: 'Cerrado', icon: CheckCircle },
      'RECHAZADO': { color: t.error, label: 'Rechazado - Requiere Corrección', icon: XCircle }
    };
    return configs[status] || { color: t.textMuted, label: status, icon: AlertTriangle };
  };

  const responseRecipients = recipients.filter(r => r.recipientType === 'response');
  const validationRecipients = recipients.filter(r => r.recipientType === 'validation');

  const canRespond = qar?.status === 'EMITIDO' || qar?.status === 'RECHAZADO';
  const canValidate = qar?.status === 'RESPONDIDO';

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: t.textMuted,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      marginBottom: '16px',
      fontSize: '14px'
    },
    header: {
      backgroundColor: qar?.severityColor || t.error,
      color: 'white',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '24px'
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    qarNumber: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '8px',
      fontFamily: 'monospace',
      letterSpacing: '1px'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600'
    },
    headerMeta: {
      display: 'flex',
      gap: '20px',
      fontSize: '13px',
      opacity: 0.9,
      flexWrap: 'wrap'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '24px'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    infoItem: {
      marginBottom: '8px'
    },
    infoLabel: {
      color: t.textMuted,
      fontSize: '11px',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      color: t.text,
      fontSize: '14px',
      fontWeight: '500'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      fontWeight: '600',
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '10px 12px',
      color: t.text,
      borderBottom: `1px solid ${t.border}`
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      marginBottom: '12px'
    },
    textareaSmall: {
      width: '100%',
      padding: '10px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '13px',
      minHeight: '60px',
      resize: 'vertical'
    },
    responseDisplay: {
      backgroundColor: t.bgPanel,
      padding: '14px',
      borderRadius: '8px',
      marginBottom: '12px'
    },
    label: {
      display: 'block',
      color: t.textMuted,
      fontSize: '12px',
      marginBottom: '6px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    buttonRow: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    buttonPrimary: {
      flex: 1,
      padding: '14px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSuccess: {
      flex: 1,
      padding: '14px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonDanger: {
      flex: 1,
      padding: '14px',
      backgroundColor: t.error,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSecondary: {
      padding: '10px 16px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    recipientChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      margin: '4px'
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    photoBox: {
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      padding: '12px',
      textAlign: 'center'
    },
    photo: {
      maxWidth: '100%',
      maxHeight: '180px',
      borderRadius: '8px'
    },
    timeline: {
      position: 'relative'
    },
    timelineItem: {
      position: 'relative',
      paddingLeft: '28px',
      paddingBottom: '16px',
      borderLeft: `2px solid ${t.border}`,
      marginLeft: '8px'
    },
    timelineDot: {
      position: 'absolute',
      left: '-9px',
      top: '0',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: `2px solid ${t.bgCard}`
    },
    closedBanner: {
      backgroundColor: `${t.success}20`,
      border: `1px solid ${t.success}`,
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center'
    },
    rejectedBanner: {
      backgroundColor: `${t.error}20`,
      border: `1px solid ${t.error}`,
      borderRadius: '8px',
      padding: '16px'
    },
    fileZone: {
      border: `2px dashed ${t.border}`,
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      backgroundColor: t.bgPanel,
      transition: 'border-color 0.2s'
    },
    fileChip: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      fontSize: '13px',
      color: t.text
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ color: t.text, textAlign: 'center', padding: '60px' }}>Cargando...</div>
      </div>
    );
  }

  if (!qar) {
    return (
      <div style={styles.container}>
        <div style={{ color: t.text, textAlign: 'center', padding: '60px' }}>QAR no encontrado</div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(qar.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div style={styles.container}>
      {/* Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button style={styles.backButton} onClick={() => navigate('/qar-list')}>
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/qar-list')}
            style={{ padding: '8px 14px', backgroundColor: t.bgCard, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <List size={16} />
            Lista QAR
          </button>
          <button
            onClick={() => navigate('/qar-create')}
            style={{ padding: '8px 14px', backgroundColor: t.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <PlusCircle size={16} />
            Nuevo QAR
          </button>
          <button
            onClick={() => navigate('/defect-capture')}
            style={{ padding: '8px 14px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ClipboardCheck size={16} />
            Inspección
          </button>
          <button
            onClick={() => navigate('/defect-dashboard')}
            style={{ padding: '8px 14px', backgroundColor: t.textMuted, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.qarNumber}>{qar.alertNumber}</div>
            <h1 style={styles.headerTitle}>
              <AlertTriangle size={24} />
              {qar.title}
            </h1>
          </div>
          <div style={{ ...styles.statusBadge, backgroundColor: statusConfig.color }}>
            <StatusIcon size={16} />
            {statusConfig.label}
          </div>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.metaItem}>
            <User size={14} />
            Emitido por: {qar.reportedByName || '-'}
          </span>
          <span style={styles.metaItem}>
            <Clock size={14} />
            {formatDate(qar.createdAt)}
          </span>
          <span style={styles.metaItem}>
            <MapPin size={14} />
            {qar.departmentName || 'N/A'}
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* ====== LEFT COLUMN ====== */}
        <div>
          {/* Info Card */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <FileText size={18} />
              Información General
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Cliente</div>
                <div style={styles.infoValue}>{qar.clientName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Proyecto</div>
                <div style={styles.infoValue}>{qar.projectName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Parte</div>
                <div style={styles.infoValue}>{qar.partNumber || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Severidad</div>
                <div style={styles.infoValue}>
                  <span style={{
                    backgroundColor: qar.severityColor || t.textMuted,
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {qar.severityName}
                  </span>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Departamento Responsable</div>
                <div style={styles.infoValue}>{qar.departmentName || '-'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Defectos Relacionados</div>
                <div style={styles.infoValue}>{defects.length}</div>
              </div>
            </div>
            {qar.description && (
              <div style={{ marginTop: '16px' }}>
                <div style={styles.infoLabel}>Descripción</div>
                <div style={{ color: t.textMuted, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {qar.description}
                </div>
              </div>
            )}
          </div>

          {/* Defects Table */}
          {defects.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <AlertTriangle size={18} color={t.warning} />
                Defectos Asociados ({defects.length})
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Folio</th>
                    <th style={styles.th}>Defecto</th>
                    <th style={styles.th}>Estación</th>
                    <th style={styles.th}>Inspector</th>
                    <th style={styles.th}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((d, idx) => (
                    <tr key={idx}>
                      <td style={{ ...styles.td, fontWeight: '600', color: t.accent }}>{d.entryNumber}</td>
                      <td style={styles.td}>{d.defectName}</td>
                      <td style={styles.td}>{d.stationName || '-'}</td>
                      <td style={styles.td}>{d.inspectorName || '-'}</td>
                      <td style={styles.td}>{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ====== RESPONSE SECTION ====== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Send size={18} color={t.accent} />
              Respuesta al QAR
              {qar.status === 'EMITIDO' && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: t.warning, fontWeight: '500' }}>
                  PENDIENTE
                </span>
              )}
              {(qar.status === 'RESPONDIDO' || qar.status === 'CERRADO') && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: t.success, fontWeight: '500' }}>
                  COMPLETADO
                </span>
              )}
              {qar.status === 'RECHAZADO' && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: t.error, fontWeight: '500' }}>
                  REQUIERE CORRECCIÓN
                </span>
              )}
            </div>

            {qar.status === 'RECHAZADO' && (
              <div style={styles.rejectedBanner}>
                <div style={{ color: t.error, fontWeight: '600', marginBottom: '8px' }}>
                  <XCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  Respuesta Rechazada
                </div>
                <div style={{ color: t.text, fontSize: '13px' }}>
                  El validador rechazó la respuesta. Por favor revisa y corrige.
                </div>
              </div>
            )}

            {/* Show existing response or form */}
            {(qar.rootCause || qar.correctiveAction) && !canRespond ? (
              <>
                <div style={styles.responseDisplay}>
                  <div style={styles.label}>Causa Raíz</div>
                  <div style={{ color: t.text, fontSize: '14px' }}>{qar.rootCause || '-'}</div>
                </div>
                <div style={styles.responseDisplay}>
                  <div style={styles.label}>Acción Correctiva</div>
                  <div style={{ color: t.text, fontSize: '14px' }}>{qar.correctiveAction || '-'}</div>
                </div>
                {qar.resolutionNotes && (
                  <div style={styles.responseDisplay}>
                    <div style={styles.label}>Notas Adicionales</div>
                    <div style={{ color: t.text, fontSize: '14px' }}>{qar.resolutionNotes}</div>
                  </div>
                )}
                {/* Adjuntos de respuesta (solo lectura) */}
                {responseFiles.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ ...styles.label, marginBottom: '8px' }}>
                      <Paperclip size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Archivos Adjuntos ({responseFiles.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {responseFiles.map(f => (
                        <div key={f.id} style={styles.fileChip}>
                          {isImage(f.mimetype)
                            ? <Image size={16} color={t.accent} />
                            : <File size={16} color={t.textMuted} />
                          }
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.originalName}
                          </span>
                          <span style={{ fontSize: '11px', color: t.textMuted }}>
                            {formatFileSize(f.fileSize)}
                          </span>
                          <a
                            href={`${API_URL}${f.url}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver / Descargar"
                            style={{ color: t.accent, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', textDecoration: 'none' }}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qar.respondedByName && (
                  <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '8px' }}>
                    Respondido por: {qar.respondedByName} el {formatDate(qar.responseDate)}
                  </div>
                )}
              </>
            ) : canRespond ? (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Causa Raíz *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe la causa raíz del problema..."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Acción Correctiva *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe la acción correctiva implementada..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Notas Adicionales</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Notas o comentarios adicionales (opcional)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>
                {/* ── Adjuntos de respuesta ── */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={styles.label}>
                    <Paperclip size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    Archivos Adjuntos (evidencias, fotos, documentos)
                  </label>

                  {/* Archivos ya subidos */}
                  {responseFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                      {responseFiles.map(f => (
                        <div key={f.id} style={styles.fileChip}>
                          {isImage(f.mimetype)
                            ? <Image size={16} color={t.accent} />
                            : <File size={16} color={t.textMuted} />
                          }
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.originalName}
                          </span>
                          <span style={{ fontSize: '11px', color: t.textMuted, flexShrink: 0 }}>
                            {formatFileSize(f.fileSize)}
                          </span>
                          <a
                            href={`${API_URL}${f.url}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Descargar"
                            style={{ color: t.accent, display: 'flex' }}
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => handleDeleteResponseFile(f.id)}
                            title="Eliminar"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.error, padding: 0, display: 'flex' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Zona de carga */}
                  <label
                    htmlFor="response-file-input"
                    style={{
                      ...styles.fileZone,
                      borderColor: uploadingFile ? t.accent : t.border,
                      cursor: uploadingFile ? 'wait' : 'pointer'
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
                    <Paperclip size={20} color={t.textMuted} style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', color: t.textMuted }}>
                      {uploadingFile ? 'Subiendo...' : 'Haz clic o arrastra un archivo aquí'}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
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
                  style={{ ...styles.buttonPrimary, opacity: submitting ? 0.7 : 1 }}
                  onClick={handleSubmitResponse}
                  disabled={submitting}
                >
                  <Send size={18} />
                  {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin respuesta aún</p>
            )}
          </div>

          {/* ====== VALIDATION SECTION ====== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <CheckCircle size={18} color={t.success} />
              Validación
            </div>

            {qar.status === 'CERRADO' ? (
              <div style={styles.closedBanner}>
                <CheckCircle size={40} color={t.success} style={{ marginBottom: '12px' }} />
                <div style={{ color: t.success, fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>
                  QAR Cerrado y Validado
                </div>
                {qar.validatedByName && (
                  <div style={{ color: t.textMuted, fontSize: '13px' }}>
                    Validado por: {qar.validatedByName} el {formatDate(qar.validationDate)}
                  </div>
                )}
              </div>
            ) : canValidate ? (
              <>
                <p style={{ color: t.textMuted, fontSize: '13px', marginBottom: '16px' }}>
                  Revisa la respuesta proporcionada y decide si aprobar el cierre o rechazar para corrección.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Motivo de Rechazo (si aplica)</label>
                  <textarea
                    style={styles.textareaSmall}
                    placeholder="Indica el motivo si vas a rechazar..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div style={styles.buttonRow}>
                  <button
                    style={{ ...styles.buttonSuccess, opacity: submitting ? 0.7 : 1 }}
                    onClick={() => handleValidation(true)}
                    disabled={submitting}
                  >
                    <CheckCircle size={18} />
                    Aprobar y Cerrar
                  </button>
                  <button
                    style={{ ...styles.buttonDanger, opacity: submitting ? 0.7 : 1 }}
                    onClick={() => handleValidation(false)}
                    disabled={submitting}
                  >
                    <XCircle size={18} />
                    Rechazar
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: t.textMuted, fontSize: '13px' }}>
                {qar.status === 'EMITIDO' && 'Esperando respuesta antes de poder validar.'}
                {qar.status === 'RECHAZADO' && 'Esperando corrección de la respuesta.'}
              </p>
            )}
          </div>
        </div>

        {/* ====== RIGHT COLUMN ====== */}
        <div>
          {/* Recipients */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Users size={18} />
              Destinatarios
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={styles.label}>Respuesta ({responseRecipients.length})</div>
              <div>
                {responseRecipients.map((r, idx) => (
                  <span key={idx} style={{
                    ...styles.recipientChip,
                    backgroundColor: r.acknowledgedAt ? `${t.success}33` : `${t.warning}33`,
                    color: r.acknowledgedAt ? t.success : t.warning
                  }}>
                    {r.firstName} {r.lastName}
                    {r.acknowledgedAt && <Check size={12} />}
                  </span>
                ))}
                {responseRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Ninguno</span>
                )}
              </div>
            </div>

            <div>
              <div style={styles.label}>Validación ({validationRecipients.length})</div>
              <div>
                {validationRecipients.map((r, idx) => (
                  <span key={idx} style={{
                    ...styles.recipientChip,
                    backgroundColor: `${t.accent}33`,
                    color: t.accent
                  }}>
                    {r.firstName} {r.lastName}
                  </span>
                ))}
                {validationRecipients.length === 0 && (
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Ninguno</span>
                )}
              </div>
            </div>
          </div>

          {/* Photos */}
          {(qar.photoNokPath || qar.photoOkPath) && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <Camera size={18} />
                Evidencia Fotográfica
              </div>
              <div style={styles.photoGrid}>
                <div style={styles.photoBox}>
                  <div style={{ fontSize: '11px', color: t.error, marginBottom: '8px', fontWeight: '600' }}>
                    NOK (Defecto)
                  </div>
                  {qar.photoNokPath ? (
                    <img src={`${API_URL}${qar.photoNokPath}`} alt="NOK" style={styles.photo} />
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>Sin foto</span>
                  )}
                </div>
                <div style={styles.photoBox}>
                  <div style={{ fontSize: '11px', color: t.success, marginBottom: '8px', fontWeight: '600' }}>
                    OK (Referencia)
                  </div>
                  {qar.photoOkPath ? (
                    <img src={`${API_URL}${qar.photoOkPath}`} alt="OK" style={styles.photo} />
                  ) : (
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>Sin foto</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comments Timeline */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <MessageSquare size={18} />
              Historial ({comments.length})
            </div>

            <div style={styles.timeline}>
              {comments.map((c, idx) => {
                const dotColor =
                  c.commentType === 'status_change' ? t.accent :
                  c.commentType === 'response' ? t.success :
                  c.commentType === 'validation' ? t.success :
                  c.commentType === 'rejection' ? t.error : t.textMuted;

                return (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={{ ...styles.timelineDot, backgroundColor: dotColor }} />
                    <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      {c.userName} - {formatDate(c.createdAt)}
                    </div>
                    <div style={{ fontSize: '13px', color: t.text }}>
                      {c.comment}
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin comentarios aún</p>
              )}
            </div>

            {/* Add comment */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
              <textarea
                style={{ ...styles.textareaSmall, marginBottom: '8px' }}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar comentario..."
              />
              <button
                style={styles.buttonSecondary}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QARDetail;
