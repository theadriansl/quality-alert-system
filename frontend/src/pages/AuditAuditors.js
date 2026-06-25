import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AREAS = ['proceso', 'sistema', 'producto', 'proveedor'];
const CERTIFICATIONS = ['ISO 9001', 'IATF 16949', 'VDA 6.3', 'ISO 14001', 'ISO 45001'];

const AuditAuditors = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const [auditors, setAuditors] = useState([]);

  const L = {
    en: {
      connectionError: 'Connection error', updateError: 'Error updating', loading: 'Loading auditors...',
      title: 'Auditors', subtitle: 'Auditor competencies and certifications management',
      list: 'List', matrix: 'Matrix', addAuditor: '+ Add Auditor', dashboard: 'Dashboard', home: 'Home',
      totalAuditors: 'Total Auditors', noAuditors: 'No auditors registered',
      noAuditorsDesc: 'Add users as auditors or assign the "Auditor" role in Settings',
      byRole: 'By Role', noDepartment: 'No department', edit: 'Edit',
      removeAuditorConfirm: 'Remove as auditor?', areas: 'Areas:', noAreas: 'No areas assigned',
      certifications: 'Certifications:', noCertifications: 'No certifications',
      auditor: 'Auditor', department: 'Department', role: 'Role',
      editCompetencies: 'Edit Competencies', auditAreas: 'Audit Areas',
      cancel: 'Cancel', saveChanges: 'Save Changes', addAuditorTitle: 'Add Auditor',
      accessLevelNote: 'Only users with access level 2 or higher can be auditors.',
      noEligibleUsers: 'No eligible users available', level: 'Level',
      noAuditorRole: 'No Auditor role', add: '+ Add', close: 'Close',
      noAuditorRoleWarning: 'does not have the "Auditor" role assigned.\n\nDo you want to add them as auditor anyway?'
    },
    es: {
      connectionError: 'Error de conexión', updateError: 'Error al actualizar', loading: 'Cargando auditores...',
      title: 'Auditores', subtitle: 'Gestión de competencias y certificaciones de auditores',
      list: 'Lista', matrix: 'Matriz', addAuditor: '+ Agregar Auditor', dashboard: 'Dashboard', home: 'Inicio',
      totalAuditors: 'Auditores Totales', noAuditors: 'No hay auditores registrados',
      noAuditorsDesc: 'Agrega usuarios como auditores o asigna el rol "Auditor" en Configuración',
      byRole: 'Por Rol', noDepartment: 'Sin departamento', edit: 'Editar',
      removeAuditorConfirm: '¿Quitar como auditor?', areas: 'Áreas:', noAreas: 'Sin áreas asignadas',
      certifications: 'Certificaciones:', noCertifications: 'Sin certificaciones',
      auditor: 'Auditor', department: 'Departamento', role: 'Rol',
      editCompetencies: 'Editar Competencias', auditAreas: 'Áreas de Auditoría',
      cancel: 'Cancelar', saveChanges: 'Guardar Cambios', addAuditorTitle: 'Agregar Auditor',
      accessLevelNote: 'Solo usuarios con nivel de acceso 2 o superior pueden ser auditores.',
      noEligibleUsers: 'No hay usuarios elegibles disponibles', level: 'Nivel',
      noAuditorRole: 'Sin rol Auditor', add: '+ Agregar', close: 'Cerrar',
      noAuditorRoleWarning: 'no tiene el rol "Auditor" asignado.\n\n¿Desea agregarlo de todas formas como auditor?'
    }
  }[language] || {};
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'matrix'
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [auditorsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/audit/auditors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/users/list`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const auditorsData = await auditorsRes.json();
      const usersData = await usersRes.json();

      if (auditorsData.success) {
        setAuditors(auditorsData.auditors);
      }

      if (usersData.success) {
        setAllUsers(usersData.users || []);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateAuditor = async (userId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/auditors/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const result = await res.json();

      if (result.success) {
        loadData();
        setEditingUser(null);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.updateError);
    }
  };

  const toggleAuditor = async (userId, isAuditor) => {
    await updateAuditor(userId, { isAuditor });
    setShowAddModal(false);
  };

  const toggleArea = (area) => {
    const current = editData.auditorAreas || [];
    if (current.includes(area)) {
      setEditData({ ...editData, auditorAreas: current.filter(a => a !== area) });
    } else {
      setEditData({ ...editData, auditorAreas: [...current, area] });
    }
  };

  const toggleCertification = (cert) => {
    const current = editData.auditorCertifications || [];
    if (current.includes(cert)) {
      setEditData({ ...editData, auditorCertifications: current.filter(c => c !== cert) });
    } else {
      setEditData({ ...editData, auditorCertifications: [...current, cert] });
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    viewToggle: {
      display: 'flex',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      padding: '4px'
    },
    viewButton: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '13px',
      backgroundColor: 'transparent',
      color: t.textMuted
    },
    viewButtonActive: {
      backgroundColor: t.bgCard,
      color: t.text,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    },
    auditorCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
      border: '1px solid transparent',
      transition: 'all 0.2s'
    },
    auditorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    auditorName: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text
    },
    auditorDept: {
      fontSize: '13px',
      color: t.textMuted,
      marginTop: '4px'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      marginRight: '6px',
      marginBottom: '6px'
    },
    badgeArea: {
      backgroundColor: `${t.accent}20`,
      color: t.accent
    },
    badgeCert: {
      backgroundColor: `${t.success}20`,
      color: t.success
    },
    tags: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '12px 8px',
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      borderBottom: `1px solid ${t.border}`,
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px 8px',
      borderBottom: `1px solid ${t.border}`,
      verticalAlign: 'middle',
      color: t.text
    },
    checkbox: {
      width: '20px',
      height: '20px',
      cursor: 'pointer'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '80vh',
      overflowY: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    checkboxGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '16px'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: t.border,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      color: t.text
    },
    checkboxLabelSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}10`
    },
    empty: {
      textAlign: 'center',
      padding: '48px',
      color: t.textMuted
    },
    summary: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    summaryCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    summaryValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: t.accent
    },
    summaryLabel: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '4px'
    }
  };

  // Helper to check if user has Auditor role
  const hasAuditorRole = (user) => {
    return user.assignedRoles?.some(r => r.name === 'Auditor');
  };

  // Helper to get max clearance level from user's roles
  const getMaxClearanceLevel = (user) => {
    if (!user.assignedRoles || user.assignedRoles.length === 0) return 0;
    return Math.max(...user.assignedRoles.map(r => r.clearanceLevel || 1));
  };

  // Handler to add auditor with warning if no Auditor role
  const handleAddAuditor = (user) => {
    if (!hasAuditorRole(user)) {
      if (!window.confirm(`${user.firstName} ${user.lastName} ${L.noAuditorRoleWarning}`)) {
        return;
      }
    }
    toggleAuditor(user.id, true);
  };

  // Combine auditors from both sources: manual (isAuditor) and role-based
  const roleBasedAuditors = allUsers.filter(u => hasAuditorRole(u) && !u.isAuditor);
  const combinedAuditors = [
    ...auditors,
    ...roleBasedAuditors.map(u => ({
      ...u,
      auditorAreas: u.auditorAreas || [],
      auditorCertifications: u.auditorCertifications || [],
      fromRole: true // Flag to indicate this is from role assignment
    }))
  ];

  // Non-auditor users for adding (exclude both manual and role-based auditors, and require clearance level >= 2)
  const nonAuditors = allUsers.filter(u =>
    !u.isAuditor &&
    !hasAuditorRole(u) &&
    getMaxClearanceLevel(u) >= 2
  );

  if (loading && auditors.length === 0 && allUsers.length === 0) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          {L.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{L.title}</h1>
          <p style={styles.subtitle}>{L.subtitle}</p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'list' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('list')}
            >
               {L.list}
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'matrix' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('matrix')}
            >
               {L.matrix}
            </button>
          </div>
          <button
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
            onClick={() => setShowAddModal(true)}
          >
            {L.addAuditor}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-dashboard')}
          >
             {L.dashboard}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/')}
          >
            ← {L.home}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{combinedAuditors.length}</div>
          <div style={styles.summaryLabel}>{L.totalAuditors}</div>
        </div>
        {AREAS.map(area => (
          <div key={area} style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, fontSize: '24px' }}>
              {combinedAuditors.filter(a => a.auditorAreas?.includes(area)).length}
            </div>
            <div style={styles.summaryLabel}>{area.charAt(0).toUpperCase() + area.slice(1)}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        combinedAuditors.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noAuditors}</p>
            <p>{L.noAuditorsDesc}</p>
          </div>
        ) : (
          combinedAuditors.map(auditor => (
            <div key={auditor.id} style={styles.auditorCard}>
              <div style={styles.auditorHeader}>
                <div>
                  <div style={styles.auditorName}>
                    {auditor.firstName} {auditor.lastName}
                    {auditor.fromRole && (
                      <span style={{
                        fontSize: '10px',
                        color: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginLeft: '8px'
                      }}>
                        {L.byRole}
                      </span>
                    )}
                  </div>
                  <div style={styles.auditorDept}>
                    {auditor.department || L.noDepartment} • {auditor.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.button, padding: '6px 12px', backgroundColor: t.accent, color: 'white' }}
                    onClick={() => {
                      setEditingUser(auditor.id);
                      setEditData({
                        auditorAreas: auditor.auditorAreas || [],
                        auditorCertifications: auditor.auditorCertifications || []
                      });
                    }}
                  >
                     {L.edit}
                  </button>
                  <button
                    style={{ ...styles.button, padding: '6px 12px', backgroundColor: t.error, color: 'white' }}
                    onClick={() => {
                      if (window.confirm(`${L.removeAuditorConfirm} ${auditor.firstName} ${auditor.lastName}`)) {
                        toggleAuditor(auditor.id, false);
                      }
                    }}
                  >

                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>{L.areas}</div>
                <div style={styles.tags}>
                  {(auditor.auditorAreas || []).length > 0 ? (
                    auditor.auditorAreas.map(area => (
                      <span key={area} style={{ ...styles.badge, ...styles.badgeArea }}>
                        {area}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: t.textDim }}>{L.noAreas}</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px' }}>{L.certifications}</div>
                <div style={styles.tags}>
                  {(auditor.auditorCertifications || []).length > 0 ? (
                    auditor.auditorCertifications.map(cert => (
                      <span key={cert} style={{ ...styles.badge, ...styles.badgeCert }}>
                        {cert}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: t.textDim }}>{L.noCertifications}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )
      )}

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div style={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{L.auditor}</th>
                  <th style={styles.th}>{L.department}</th>
                  {AREAS.map(area => (
                    <th key={area} style={{ ...styles.th, textAlign: 'center' }}>
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </th>
                  ))}
                  {CERTIFICATIONS.map(cert => (
                    <th key={cert} style={{ ...styles.th, textAlign: 'center' }}>
                      {cert}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {combinedAuditors.map(auditor => (
                  <tr key={auditor.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>
                        {auditor.firstName} {auditor.lastName}
                        {auditor.fromRole && <span style={{ fontSize: '10px', color: '#8b5cf6', marginLeft: '6px' }}>({L.role})</span>}
                      </div>
                    </td>
                    <td style={styles.td}>{auditor.department || '-'}</td>
                    {AREAS.map(area => (
                      <td key={area} style={{ ...styles.td, textAlign: 'center' }}>
                        {auditor.auditorAreas?.includes(area) ? (
                          <span style={{ color: t.success, fontSize: '18px' }}></span>
                        ) : (
                          <span style={{ color: t.border }}>-</span>
                        )}
                      </td>
                    ))}
                    {CERTIFICATIONS.map(cert => (
                      <td key={cert} style={{ ...styles.td, textAlign: 'center' }}>
                        {auditor.auditorCertifications?.includes(cert) ? (
                          <span style={{ color: t.success, fontSize: '18px' }}></span>
                        ) : (
                          <span style={{ color: t.border }}>-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div style={styles.modal} onClick={() => setEditingUser(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.editCompetencies}</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: t.text }}>
                {L.auditAreas}
              </label>
              <div style={styles.checkboxGroup}>
                {AREAS.map(area => (
                  <div
                    key={area}
                    style={{
                      ...styles.checkboxLabel,
                      ...(editData.auditorAreas?.includes(area) ? styles.checkboxLabelSelected : {})
                    }}
                    onClick={() => toggleArea(area)}
                  >
                    {editData.auditorAreas?.includes(area) ? ' ' : ''}{area.charAt(0).toUpperCase() + area.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: t.text }}>
                {L.certifications}
              </label>
              <div style={styles.checkboxGroup}>
                {CERTIFICATIONS.map(cert => (
                  <div
                    key={cert}
                    style={{
                      ...styles.checkboxLabel,
                      ...(editData.auditorCertifications?.includes(cert) ? styles.checkboxLabelSelected : {})
                    }}
                    onClick={() => toggleCertification(cert)}
                  >
                    {editData.auditorCertifications?.includes(cert) ? ' ' : ''}{cert}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setEditingUser(null)}
              >
                {L.cancel}
              </button>
              <button
                style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                onClick={() => updateAuditor(editingUser, editData)}
              >
                {L.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Auditor Modal */}
      {showAddModal && (
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.addAuditorTitle}</h2>

            <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '12px' }}>
              {L.accessLevelNote}
            </p>
            {nonAuditors.length === 0 ? (
              <p style={{ color: t.textMuted }}>{L.noEligibleUsers}</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {nonAuditors.map(user => (
                  <div
                    key={user.id}
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${t.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: t.text }}>
                        {user.firstName} {user.lastName}
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: `${t.accent}15`,
                          color: t.accent
                        }}>
                          {L.level} {getMaxClearanceLevel(user)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: t.textMuted }}>
                        {user.department || L.noDepartment}
                        {!hasAuditorRole(user) && (
                          <span style={{ color: t.warning, marginLeft: '8px' }}> {L.noAuditorRole}</span>
                        )}
                      </div>
                    </div>
                    <button
                      style={{ ...styles.button, padding: '6px 12px', backgroundColor: t.success, color: 'white' }}
                      onClick={() => handleAddAuditor(user)}
                    >
                      {L.add}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowAddModal(false)}
              >
                {L.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditAuditors;
