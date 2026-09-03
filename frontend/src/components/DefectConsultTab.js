/**
 * DefectConsultTab - Tab de consulta de defectos por serial/lote
 * Integrado en DefectCapture, muestra lista de defectos con acciones según perfil
 */

import React, { useState, useEffect } from 'react';
import {
  X, Search, ChevronDown, ChevronRight, Clock, User, Wrench, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, FileText, Archive, Trash2
} from 'lucide-react';
import * as repairService from '../services/repairService';
import RepairModal from './RepairModal';
import ReleaseModal from './ReleaseModal';
import { useLanguage } from '../context/LanguageContext';

const DefectConsultTab = ({ isOpen, onClose, serial, clientId, theme }) => {
  const t = theme;
  const { t: tr, language, changeLanguage } = useLanguage();

  // State
  const [loading, setLoading] = useState(false);
  const [defects, setDefects] = useState([]);
  const [counts, setCounts] = useState({});
  const [unit, setUnit] = useState(null);
  const [history, setHistory] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});
  const [searchSerial, setSearchSerial] = useState(serial || '');

  // Catalogs
  const [repairTypes, setRepairTypes] = useState([]);
  const [releaseReasons, setReleaseReasons] = useState([]);
  const [rootCauses, setRootCauses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modals
  const [repairModal, setRepairModal] = useState({ open: false, defect: null });
  const [releaseModal, setReleaseModal] = useState({ open: false, defect: null });

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      loadCatalogs();
      if (clientId) {
        loadPermissions();
      }
      if (serial) {
        setSearchSerial(serial);
        loadDefects(serial);
      }
    }
  }, [isOpen, serial, clientId]);

  const loadCatalogs = async () => {
    try {
      const [repairTypesRes, releaseReasonsRes, rootCausesRes] = await Promise.all([
        repairService.getRepairTypes(),
        repairService.getReleaseReasons(),
        repairService.getRootCauses()
      ]);
      setRepairTypes(repairTypesRes.repairTypes || []);
      setReleaseReasons(releaseReasonsRes.releaseReasons || []);
      setRootCauses(rootCausesRes.rootCauses || []);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await repairService.checkPermissions(clientId);
      setPermissions(res.permissions || {});
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const loadDefects = async (serialToSearch) => {
    if (!serialToSearch?.trim()) return;

    setLoading(true);
    try {
      const res = await repairService.getDefectsBySerial(serialToSearch, {
        clientId,
        includeHistory: true
      });

      if (res.success) {
        setDefects(res.defects || []);
        setCounts(res.counts || {});
        setUnit(res.unit);
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Error loading defects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchSerial.trim()) {
      loadDefects(searchSerial.trim());
    }
  };

  const handleRefresh = () => {
    loadDefects(searchSerial);
  };

  // Toggle history expansion for a defect
  const toggleHistory = (defectId) => {
    setExpandedHistory(prev => ({
      ...prev,
      [defectId]: !prev[defectId]
    }));
  };

  // Get progress bar width based on status
  const getProgressWidth = (status) => {
    const progressMap = {
      'OPEN': '10%',
      'IN_REPAIR': '30%',
      'PENDING_REPAIR_APPROVAL': '45%',
      'REPAIRED': '55%',
      'IN_VALIDATION': '70%',
      'PENDING_RELEASE_APPROVAL': '85%',
      'PENDING_APPROVAL': '85%',
      'CLOSED': '100%',
      'REJECTED': '30%',
      'QUARANTINE': '50%',
      'SCRAPPED': '100%'
    };
    return progressMap[status] || '0%';
  };

  // Get progress bar color
  const getProgressColor = (status) => {
    if (status === 'CLOSED') return '#22c55e';
    if (status === 'SCRAPPED') return '#1f2937';
    if (status === 'QUARANTINE') return '#6b7280';
    if (status === 'REJECTED') return '#ef4444';
    if (['REPAIRED', 'IN_VALIDATION', 'PENDING_APPROVAL', 'PENDING_RELEASE_APPROVAL'].includes(status)) return '#f59e0b';
    return '#ef4444';
  };

  // Handle repair actions
  const handleStartRepair = async (defect) => {
    try {
      const res = await repairService.startRepair(defect.id);
      if (res.success) {
        handleRefresh();
      }
    } catch (err) {
      console.error('Error starting repair:', err);
    }
  };

  const handleCompleteRepair = (defect) => {
    setRepairModal({ open: true, defect });
  };

  const handleRepairSubmit = async (data) => {
    try {
      const res = await repairService.completeRepair(repairModal.defect.id, data);
      if (res.success) {
        setRepairModal({ open: false, defect: null });
        handleRefresh();
      }
      return res;
    } catch (err) {
      console.error('Error completing repair:', err);
      return { success: false, message: err.message };
    }
  };

  // Handle release actions
  const handleRelease = (defect) => {
    setReleaseModal({ open: true, defect });
  };

  const handleReleaseSubmit = async (data) => {
    try {
      const res = await repairService.releaseDefect(releaseModal.defect.id, data);
      if (res.success) {
        setReleaseModal({ open: false, defect: null });
        handleRefresh();
      }
      return res;
    } catch (err) {
      console.error('Error releasing defect:', err);
      return { success: false, message: err.message };
    }
  };

  const handleReject = async (defect) => {
    const notes = window.prompt('Motivo del rechazo:');
    if (notes !== null) {
      try {
        const res = await repairService.rejectDefect(defect.id, notes);
        if (res.success) {
          handleRefresh();
        }
      } catch (err) {
        console.error('Error rejecting defect:', err);
      }
    }
  };

  // Handle supervisor approval
  const handleApprove = async (defect, approveType) => {
    const approved = window.confirm(
      approveType === 'repair'
        ? '¿Aprobar esta reparación?'
        : '¿Aprobar esta liberación?'
    );
    const notes = approved ? '' : window.prompt('Motivo del rechazo:');

    if (approved || notes !== null) {
      try {
        const res = await repairService.approveDefect(defect.id, approved, notes || '');
        if (res.success) {
          handleRefresh();
        }
      } catch (err) {
        console.error('Error approving defect:', err);
      }
    }
  };

  // Handle quarantine (cannot repair, pending decision)
  const handleQuarantine = async (defect) => {
    const notes = window.prompt('Motivo de cuarentena (no se puede reparar):');
    if (notes !== null) {
      try {
        const res = await repairService.quarantineDefect(defect.id, notes);
        if (res.success) {
          handleRefresh();
        }
      } catch (err) {
        console.error('Error quarantining defect:', err);
      }
    }
  };

  // Handle scrap (discard piece)
  const handleScrap = async (defect) => {
    const confirmed = window.confirm('¿Confirmas enviar a SCRAP? Esta acción no se puede deshacer.');
    if (confirmed) {
      const notes = window.prompt('Motivo del scrap:');
      if (notes !== null) {
        try {
          const res = await repairService.scrapDefect(defect.id, notes);
          if (res.success) {
            handleRefresh();
          }
        } catch (err) {
          console.error('Error scrapping defect:', err);
        }
      }
    }
  };

  // Double click handler - abre modal según estado
  const handleDoubleClick = (defect) => {
    const status = defect.repairStatus;

    if (status === 'OPEN' && permissions.canRepair) {
      handleStartRepair(defect);
    } else if (status === 'IN_REPAIR' && permissions.canRepair) {
      handleCompleteRepair(defect);
    } else if (status === 'PENDING_REPAIR_APPROVAL' && permissions.canApproveRepair) {
      handleApprove(defect, 'repair');
    } else if ((status === 'REPAIRED' || status === 'OPEN') && permissions.canRelease) {
      handleRelease(defect);
    } else if (status === 'PENDING_RELEASE_APPROVAL' && permissions.canApproveRelease) {
      handleApprove(defect, 'release');
    } else if (status === 'REJECTED' && permissions.canRepair) {
      handleCompleteRepair(defect);
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      width: '95%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    header: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.bg
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: t.textMuted,
      padding: '8px'
    },
    searchBar: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    searchInput: {
      flex: 1,
      padding: '10px 14px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    searchBtn: {
      padding: '10px 20px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontWeight: '600'
    },
    counters: {
      display: 'flex',
      gap: '12px',
      marginLeft: 'auto'
    },
    counter: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '16px 20px'
    },
    defectCard: {
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      marginBottom: '12px',
      overflow: 'hidden'
    },
    defectHeader: {
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    defectInfo: {
      flex: 1
    },
    defectTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '4px'
    },
    defectMeta: {
      fontSize: '12px',
      color: t.textMuted,
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    },
    progressBar: {
      height: '6px',
      backgroundColor: t.border,
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    progressFill: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s ease'
    },
    statusBadge: {
      padding: '4px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600'
    },
    actions: {
      display: 'flex',
      gap: '8px'
    },
    actionBtn: {
      padding: '6px 12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    historyToggle: {
      padding: '8px 16px',
      borderTop: `1px solid ${t.border}`,
      backgroundColor: t.bg,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: t.textMuted
    },
    historyContent: {
      padding: '12px 16px',
      borderTop: `1px solid ${t.border}`,
      backgroundColor: t.bg
    },
    historyItem: {
      display: 'flex',
      gap: '12px',
      padding: '8px 0',
      borderBottom: `1px dashed ${t.border}`,
      fontSize: '12px'
    },
    historyIcon: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            <FileText size={20} />
            Consulta de Defectos
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <form style={styles.searchBar} onSubmit={handleSearch}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Escanear o ingresar serial/lote..."
            value={searchSerial}
            onChange={e => setSearchSerial(e.target.value)}
            autoFocus
          />
          <button type="submit" style={styles.searchBtn}>
            <Search size={16} />
            Buscar
          </button>
          <button
            type="button"
            style={{ ...styles.searchBtn, backgroundColor: t.textMuted }}
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
          </button>

          {/* Counters */}
          {defects.length > 0 && (
            <div style={styles.counters}>
              <span style={{ ...styles.counter, backgroundColor: '#fef2f2', color: '#ef4444' }}>
                Abiertos: {counts.open || 0}
              </span>
              <span style={{ ...styles.counter, backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                En Proceso: {(counts.inRepair || 0) + (counts.repaired || 0) + (counts.inValidation || 0)}
              </span>
              <span style={{ ...styles.counter, backgroundColor: '#f0fdf4', color: '#22c55e' }}>
                Cerrados: {counts.closed || 0}
              </span>
            </div>
          )}
        </form>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.emptyState}>Cargando...</div>
          ) : defects.length === 0 ? (
            <div style={styles.emptyState}>
              {searchSerial ? 'No se encontraron defectos para este serial/lote' : 'Ingresa un serial o lote para buscar'}
            </div>
          ) : (
            defects.map(defect => {
              const statusInfo = repairService.getStatusInfo(defect.repairStatus);
              const defectHistory = history.filter(h => h.defectId === defect.id);
              const isExpanded = expandedHistory[defect.id];

              return (
                <div
                  key={defect.id}
                  style={styles.defectCard}
                  onDoubleClick={() => handleDoubleClick(defect)}
                  title="Doble click para acción rápida"
                >
                  <div style={styles.defectHeader}>
                    {/* Status Badge */}
                    <div
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: statusInfo.bgColor,
                        color: statusInfo.color
                      }}
                    >
                      {statusInfo.label}
                    </div>

                    {/* Defect Info */}
                    <div style={styles.defectInfo}>
                      <div style={styles.defectTitle}>
                        {defect.defectName || defect.defectCode}
                        {defect.severityName && (
                          <span style={{ marginLeft: '8px', color: defect.severityColor }}>
                            [{defect.severityName}]
                          </span>
                        )}
                      </div>
                      <div style={styles.defectMeta}>
                        <span><Clock size={12} /> {new Date(defect.createdAt).toLocaleString()}</span>
                        <span><User size={12} /> {defect.capturedByName}</span>
                        {defect.departmentName && <span>Depto: {defect.departmentName}</span>}
                        {defect.repairAttempts > 0 && (
                          <span style={{ color: '#f59e0b' }}>
                            Intentos: {defect.repairAttempts}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: getProgressWidth(defect.repairStatus),
                            backgroundColor: getProgressColor(defect.repairStatus)
                          }}
                        />
                      </div>
                    </div>

                    {/* Time Color Indicator */}
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor:
                          defect.timeColor === 'GREEN' ? '#22c55e' :
                          defect.timeColor === 'YELLOW' ? '#f59e0b' : '#ef4444'
                      }}
                      title={`${Math.round(defect.hoursOpen || 0)} horas`}
                    />

                    {/* Actions */}
                    <div style={styles.actions}>
                      {/* Repair Actions */}
                      {permissions.canRepair && defect.repairStatus === 'OPEN' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#3b82f6', color: 'white' }}
                          onClick={() => handleStartRepair(defect)}
                        >
                          <Wrench size={14} />
                          Iniciar
                        </button>
                      )}
                      {permissions.canRepair && defect.repairStatus === 'IN_REPAIR' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#22c55e', color: 'white' }}
                          onClick={() => handleCompleteRepair(defect)}
                        >
                          <CheckCircle size={14} />
                          Completar
                        </button>
                      )}
                      {permissions.canRepair && defect.repairStatus === 'REJECTED' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#f59e0b', color: 'white' }}
                          onClick={() => handleCompleteRepair(defect)}
                        >
                          <RefreshCw size={14} />
                          Re-trabajar
                        </button>
                      )}

                      {/* Quarantine & Scrap - when cannot repair */}
                      {permissions.canRepair && ['IN_REPAIR', 'REJECTED'].includes(defect.repairStatus) && (
                        <>
                          <button
                            style={{ ...styles.actionBtn, backgroundColor: '#6b7280', color: 'white' }}
                            onClick={() => handleQuarantine(defect)}
                            title="Enviar a cuarentena (no se puede reparar)"
                          >
                            <Archive size={14} />
                            Cuarentena
                          </button>
                          <button
                            style={{ ...styles.actionBtn, backgroundColor: '#1f2937', color: 'white' }}
                            onClick={() => handleScrap(defect)}
                            title="Enviar a scrap (descartar)"
                          >
                            <Trash2 size={14} />
                            Scrap
                          </button>
                        </>
                      )}

                      {/* From Quarantine: can go to Scrap or retry repair */}
                      {permissions.canRepair && defect.repairStatus === 'QUARANTINE' && (
                        <>
                          <button
                            style={{ ...styles.actionBtn, backgroundColor: '#3b82f6', color: 'white' }}
                            onClick={() => handleStartRepair(defect)}
                          >
                            <Wrench size={14} />
                            Reintentar
                          </button>
                          <button
                            style={{ ...styles.actionBtn, backgroundColor: '#1f2937', color: 'white' }}
                            onClick={() => handleScrap(defect)}
                          >
                            <Trash2 size={14} />
                            Scrap
                          </button>
                        </>
                      )}

                      {/* Supervisor Repair Approval */}
                      {permissions.canApproveRepair && defect.repairStatus === 'PENDING_REPAIR_APPROVAL' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#8b5cf6', color: 'white' }}
                          onClick={() => handleApprove(defect, 'repair')}
                        >
                          <CheckCircle size={14} />
                          Aprobar Rep.
                        </button>
                      )}

                      {/* Release Actions */}
                      {permissions.canRelease && ['REPAIRED', 'OPEN'].includes(defect.repairStatus) && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#8b5cf6', color: 'white' }}
                          onClick={() => handleRelease(defect)}
                        >
                          <CheckCircle size={14} />
                          Liberar
                        </button>
                      )}
                      {permissions.canRelease && defect.repairStatus === 'REPAIRED' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#ef4444', color: 'white' }}
                          onClick={() => handleReject(defect)}
                        >
                          <XCircle size={14} />
                          Rechazar
                        </button>
                      )}

                      {/* Supervisor Release Approval */}
                      {permissions.canApproveRelease && defect.repairStatus === 'PENDING_RELEASE_APPROVAL' && (
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#8b5cf6', color: 'white' }}
                          onClick={() => handleApprove(defect, 'release')}
                        >
                          <CheckCircle size={14} />
                          Aprobar Lib.
                        </button>
                      )}
                    </div>
                  </div>

                  {/* History Toggle */}
                  {defectHistory.length > 0 && (
                    <>
                      <div
                        style={styles.historyToggle}
                        onClick={() => toggleHistory(defect.id)}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Historial ({defectHistory.length})
                      </div>

                      {/* History Content */}
                      {isExpanded && (
                        <div style={styles.historyContent}>
                          {defectHistory.map(event => (
                            <div key={event.id} style={styles.historyItem}>
                              <div
                                style={{
                                  ...styles.historyIcon,
                                  backgroundColor:
                                    event.eventType.includes('REPAIR') ? '#dbeafe' :
                                    event.eventType.includes('RELEASE') ? '#dcfce7' :
                                    event.eventType.includes('REJECT') ? '#fef2f2' : '#f3f4f6'
                                }}
                              >
                                {event.eventType.includes('REPAIR') && <Wrench size={12} color="#3b82f6" />}
                                {event.eventType.includes('RELEASE') && <CheckCircle size={12} color="#22c55e" />}
                                {event.eventType.includes('REJECT') && <XCircle size={12} color="#ef4444" />}
                                {event.eventType === 'CREATED' && <AlertTriangle size={12} color="#6b7280" />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: t.text }}>
                                  {event.eventType.replace(/_/g, ' ')}
                                </div>
                                <div style={{ color: t.textMuted }}>
                                  {event.comments || event.description}
                                </div>
                                {event.timeMinutes && (
                                  <div style={{ color: t.accent }}>
                                    Tiempo: {event.timeMinutes} min
                                  </div>
                                )}
                              </div>
                              <div style={{ color: t.textMuted, fontSize: '11px', textAlign: 'right' }}>
                                <div>{event.performedByName}</div>
                                <div>{new Date(event.eventAt).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Repair Modal */}
      <RepairModal
        isOpen={repairModal.open}
        onClose={() => setRepairModal({ open: false, defect: null })}
        defect={repairModal.defect}
        repairTypes={repairTypes}
        rootCauses={rootCauses}
        departments={departments}
        onSubmit={handleRepairSubmit}
        theme={t}
      />

      {/* Release Modal */}
      <ReleaseModal
        isOpen={releaseModal.open}
        onClose={() => setReleaseModal({ open: false, defect: null })}
        defect={releaseModal.defect}
        releaseReasons={releaseReasons}
        onSubmit={handleReleaseSubmit}
        theme={t}
      />
    </div>
  );
};

/**
 * DefectCounter - Contador clickeable de defectos
 * Muestra: [Defectos: X Abiertos | Y Cerrados]
 */
export const DefectCounter = ({ serial, clientId, onClick, theme }) => {
  const [counts, setCounts] = useState({ open: 0, closed: 0, inProcess: 0, scrapped: 0, quarantine: 0 });
  const [loading, setLoading] = useState(false);

  const t = theme || {
    bg: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb'
  };

  useEffect(() => {
    if (serial?.trim()) {
      loadCounts();
    } else {
      setCounts({ open: 0, closed: 0, inProcess: 0, scrapped: 0, quarantine: 0 });
    }
  }, [serial, clientId]);

  const loadCounts = async () => {
    setLoading(true);
    try {
      const res = await repairService.getDefectsBySerial(serial, { clientId });
      if (res.success) {
        const defects = res.defects || [];
        const open = defects.filter(d => d.repairStatus === 'OPEN').length;
        const closed = defects.filter(d => d.repairStatus === 'CLOSED').length;
        const inProcess = defects.filter(d =>
          ['IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'PENDING_REPAIR_APPROVAL', 'PENDING_RELEASE_APPROVAL', 'REJECTED'].includes(d.repairStatus)
        ).length;
        const scrapped = defects.filter(d =>
          ['SCRAPPED', 'SCRAP_CONFIRMED'].includes(d.repairStatus)
        ).length;
        const quarantine = defects.filter(d => d.repairStatus === 'QUARANTINE').length;
        setCounts({ open, closed, inProcess, scrapped, quarantine });
      }
    } catch (err) {
      console.error('Error loading defect counts:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = counts.open + counts.closed + counts.inProcess + (counts.scrapped || 0) + (counts.quarantine || 0);
  if (!serial || total === 0) return null;

  const hasOpen = counts.open > 0 || counts.inProcess > 0;
  const hasScrapped = counts.scrapped > 0;

  const styles = {
    container: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: onClick ? 'pointer' : 'default',
      backgroundColor: hasScrapped ? '#1f2937' : (hasOpen ? '#fef2f2' : '#f0fdf4'),
      border: `1px solid ${hasScrapped ? '#374151' : (hasOpen ? '#fecaca' : '#bbf7d0')}`,
      transition: 'all 0.2s'
    },
    label: {
      color: hasScrapped ? '#9ca3af' : t.textMuted
    },
    open: {
      color: hasScrapped ? '#fca5a5' : '#ef4444'
    },
    inProcess: {
      color: hasScrapped ? '#fcd34d' : '#f59e0b'
    },
    closed: {
      color: hasScrapped ? '#86efac' : '#22c55e'
    },
    scrapped: {
      color: '#ef4444',
      fontWeight: '600'
    },
    quarantine: {
      color: hasScrapped ? '#fdba74' : '#f97316'
    },
    separator: {
      color: hasScrapped ? '#6b7280' : t.textMuted
    }
  };

  return (
    <div
      style={styles.container}
      onClick={onClick}
      title="Click para ver defectos"
    >
      {loading ? (
        <span style={styles.label}>Cargando...</span>
      ) : (
        <>
          <span style={styles.label}>Defectos:</span>
          <span style={styles.open}>{counts.open} Abiertos</span>
          {counts.inProcess > 0 && (
            <>
              <span style={styles.separator}>|</span>
              <span style={styles.inProcess}>{counts.inProcess} En Proceso</span>
            </>
          )}
          <span style={styles.separator}>|</span>
          <span style={styles.closed}>{counts.closed} Cerrados</span>
          {counts.quarantine > 0 && (
            <>
              <span style={styles.separator}>|</span>
              <span style={styles.quarantine}>{counts.quarantine} MRB</span>
            </>
          )}
          {counts.scrapped > 0 && (
            <>
              <span style={styles.separator}>|</span>
              <span style={styles.scrapped}>{counts.scrapped} SCRAP</span>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DefectConsultTab;
