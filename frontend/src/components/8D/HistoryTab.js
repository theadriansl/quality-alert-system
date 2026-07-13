import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const HistoryTab = ({ data }) => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const styles = getStyles(t);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [revisions, setRevisions] = useState([]);

  // Filters
  const [filterUser, setFilterUser] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (actionType) => {
    const icons = {
      created: '',
      section_updated: '',
      draft_saved: '',
      approved: '',
      rejected: '',
      status_changed: '',
      delay_added: '',
      sent_to_approval: '',
      submitted_for_approval: '',
      pending: '',
      completed: '',
      file_uploaded: '',
      file_deleted: '',
      archived: '',
      revision_created: ''
    };
    return icons[actionType] || '';
  };

  const getEventColor = (actionType) => {
    const colors = {
      created: '#0072CE',
      section_updated: '#8b5cf6',
      draft_saved: '#6366f1',
      approved: '#2E7D32',
      rejected: '#ef4444',
      status_changed: '#C77700',
      delay_added: '#C77700',
      sent_to_approval: '#C77700',
      submitted_for_approval: '#C77700',
      pending: '#6366f1',
      completed: '#2E7D32',
      file_uploaded: '#0891b2',
      file_deleted: '#dc2626',
      archived: '#7c3aed',
      revision_created: '#059669'
    };
    return colors[actionType] || '#6b7280';
  };

  // Load users for filter
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/users/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setUsers(result.users || []);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  // Load revision family
  useEffect(() => {
    const loadRevisions = async () => {
      if (!data?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/8d/reports/${data.id}/revisions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setRevisions(result.revisions || []);
        }
      } catch (error) {
        console.error('Error loading revisions:', error);
      }
    };
    loadRevisions();
  }, [data?.id]);

  // Load audit log
  useEffect(() => {
    const loadAuditLog = async () => {
      if (!data || !data.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Build query params
        const params = new URLSearchParams();
        if (filterUser) params.append('userId', filterUser);
        if (filterStartDate) params.append('startDate', new Date(filterStartDate).toISOString());
        if (filterEndDate) params.append('endDate', new Date(filterEndDate).toISOString());

        const url = `http://localhost:5000/8d/reports/${data.id}/audit-log?${params.toString()}`;

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          const auditEntries = result.auditLog || [];

          const auditEvents = auditEntries.map(entry => ({
            type: entry.actionType,
            icon: getEventIcon(entry.actionType),
            color: getEventColor(entry.actionType),
            title: formatActionTitle(entry),
            userName: entry.userName,
            userId: entry.userId,
            date: entry.createdAt,
            description: entry.description,
            section: entry.sectionName
          }));

          setTimeline(auditEvents);
        } else {
          setTimeline([]);
        }
      } catch (error) {
        console.error('Error loading audit log:', error);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };

    loadAuditLog();
  }, [data, filterUser, filterStartDate, filterEndDate]);

  const formatActionTitle = (entry) => {
    if (entry.actionType === 'approved') {
      const level = entry.newValue ? JSON.parse(entry.newValue).level : '?';
      return `Aprobador ${level}`;
    }
    if (entry.actionType === 'rejected') {
      const level = entry.newValue ? JSON.parse(entry.newValue).level : '?';
      return `Rechazado Nivel ${level}`;
    }
    if (entry.actionType === 'section_updated') {
      return entry.sectionName?.toUpperCase().replace('_', '-') || 'Sección';
    }
    if (entry.actionType === 'draft_saved') {
      return `Borrador ${entry.sectionName?.toUpperCase().replace('_', '-') || ''}`;
    }
    if (entry.actionType === 'submitted_for_approval' || entry.actionType === 'sent_to_approval') {
      return `Enviado ${entry.sectionName?.toUpperCase().replace('_', '-') || ''}`;
    }
    if (entry.actionType === 'file_uploaded') {
      return 'Archivo subido';
    }
    if (entry.actionType === 'delay_added') {
      return 'Atraso D4';
    }
    if (entry.actionType === 'created') {
      return 'Creado';
    }
    if (entry.actionType === 'archived') {
      const newValue = entry.newValue ? JSON.parse(entry.newValue) : {};
      return `Archivado → ${newValue.newRevisionId || 'Nueva Rev'}`;
    }
    if (entry.actionType === 'revision_created') {
      const newValue = entry.newValue ? JSON.parse(entry.newValue) : {};
      return `Nueva Revisión R${newValue.revisionNumber || '?'}`;
    }
    return entry.description?.substring(0, 25) || 'Evento';
  };

  const clearFilters = () => {
    setFilterUser('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  if (!data) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyText}>No hay datos del reporte</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyText}>Cargando historial...</p>
      </div>
    );
  }

  // Helper function to get user name from ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Usuario desconocido';
  };

  // Format approval cell content
  const formatApprovalCell = (status, userId, date, hasApprover = true) => {
    // Si no hay aprobador asignado para este nivel, mostrar N/A
    if (!hasApprover) {
      return { icon: '', text: 'N/A', color: t.textDim };
    }

    const userName = userId ? getUserName(userId) : '';
    const formattedDate = date ? formatDate(date) : '';

    // No status and no user assigned
    if (!status && !userName) {
      return { icon: '', text: 'Pendiente', color: '#C77700' };
    }

    // Pending with user assigned
    if (!status && userName) {
      return { icon: '', text: userName, color: '#C77700' };
    }

    // Approved
    if (status === 'approved') {
      return { icon: '', text: `${userName} (${formattedDate})`, color: '#2E7D32' };
    }

    // Rejected
    if (status === 'rejected') {
      return { icon: '', text: `${userName} (${formattedDate})`, color: '#ef4444' };
    }

    return { icon: '', text: userName || 'Pendiente', color: '#C77700' };
  };

  // Get submitter info - shows who is assigned to submit/submitted
  const getSubmitterInfo = (statusField, sectionLabel) => {
    const isDraft = !data[statusField] || data[statusField] === 'draft';

    // Determine which user group is responsible for this section
    let assignedUserId = null;
    const escalationPath = data.escalationPath || {};

    if (statusField === 'd1D2D3ApprovalStatus') {
      // D1-D2-D3: Issue users
      assignedUserId = escalationPath.issue_users?.[0];
    } else if (statusField === 'd3MfgStatus') {
      // D3-MFG: Countermeasure users
      assignedUserId = escalationPath.countermeasure_users?.[0];
    } else if (['d4Status', 'd5Status', 'd6Status', 'd7Status'].includes(statusField)) {
      // D4-D7: Countermeasure users
      assignedUserId = escalationPath.countermeasure_users?.[0];
    } else if (statusField === 'd8Status') {
      // D8: Confirmation users
      assignedUserId = escalationPath.confirmation_users?.[0];
    }

    const assignedUserName = assignedUserId ? getUserName(assignedUserId) : null;

    if (isDraft) {
      if (assignedUserName) {
        return { icon: '', text: assignedUserName, color: t.textDim };
      }
      return { icon: '', text: 'No asignado', color: t.textDim };
    }

    // Find who actually submitted in timeline
    const sectionMap = {
      'd1D2D3ApprovalStatus': 'd1',
      'd3MfgStatus': 'd3_mfg',
      'd4Status': 'd4',
      'd5Status': 'd5',
      'd6Status': 'd6',
      'd7Status': 'd7',
      'd8Status': 'd8'
    };

    const sectionName = sectionMap[statusField];
    const submissionEvent = timeline.find(event =>
      event.type === 'submitted_for_approval' &&
      event.section?.toLowerCase() === sectionName
    );

    if (submissionEvent && submissionEvent.userName) {
      return { icon: '', text: submissionEvent.userName, color: '#0072CE' };
    }

    // Fallback: show assigned user if submitted but no event found
    if (assignedUserName) {
      return { icon: '', text: assignedUserName, color: '#0072CE' };
    }

    return { icon: '', text: 'Enviado', color: '#0072CE' };
  };

  // Build approval sections data with assigned users from escalationPath
  const escalationPath = data.escalationPath || {};
  const issueUsers = escalationPath.issue_users || [];
  const countermeasureUsers = escalationPath.countermeasure_users || [];
  const confirmationUsers = escalationPath.confirmation_users || [];

  // Check if D3-MFG has any approval history (even if rejected and back to draft)
  const hasD3MfgApprovalHistory = data.d3MfgApproval1Status || data.d3MfgApproval2Status || data.d3MfgApproval3Status;

  const approvalSections = [
    {
      label: 'D1-D2-D3',
      statusField: 'd1D2D3ApprovalStatus',
      approval1: { status: data.approval_1Status, by: data.approval_1By || issueUsers[1], at: data.approval_1At, hasApprover: !!issueUsers[1] },
      approval2: { status: data.approval_2Status, by: data.approval_2By || issueUsers[2], at: data.approval_2At, hasApprover: !!issueUsers[2] },
      approval3: { status: data.approval_3Status, by: data.approval_3By || issueUsers[3], at: data.approval_3At, hasApprover: !!issueUsers[3] }
    },
    ...(data.d3MfgStatus && (data.d3MfgStatus !== 'draft' || hasD3MfgApprovalHistory) ? [{
      label: 'D3-MFG',
      statusField: 'd3MfgStatus',
      approval1: { status: data.d3MfgApproval1Status, by: data.d3MfgApproval1By || countermeasureUsers[1], at: data.d3MfgApproval1At, hasApprover: !!countermeasureUsers[1] },
      approval2: { status: data.d3MfgApproval2Status, by: data.d3MfgApproval2By || countermeasureUsers[2], at: data.d3MfgApproval2At, hasApprover: !!countermeasureUsers[2] },
      approval3: { status: data.d3MfgApproval3Status, by: data.d3MfgApproval3By || countermeasureUsers[3], at: data.d3MfgApproval3At, hasApprover: !!countermeasureUsers[3] }
    }] : []),
    {
      label: 'D4',
      statusField: 'd4Status',
      approval1: { status: data.d4Approval1Status, by: data.d4Approval1By || countermeasureUsers[1], at: data.d4Approval1At, hasApprover: !!countermeasureUsers[1] },
      approval2: { status: data.d4Approval2Status, by: data.d4Approval2By || countermeasureUsers[2], at: data.d4Approval2At, hasApprover: !!countermeasureUsers[2] },
      approval3: { status: data.d4Approval3Status, by: data.d4Approval3By || countermeasureUsers[3], at: data.d4Approval3At, hasApprover: !!countermeasureUsers[3] }
    },
    {
      label: 'D5',
      statusField: 'd5Status',
      approval1: { status: data.d5Approval1Status, by: data.d5Approval1By || countermeasureUsers[1], at: data.d5Approval1At, hasApprover: !!countermeasureUsers[1] },
      approval2: { status: data.d5Approval2Status, by: data.d5Approval2By || countermeasureUsers[2], at: data.d5Approval2At, hasApprover: !!countermeasureUsers[2] },
      approval3: { status: data.d5Approval3Status, by: data.d5Approval3By || countermeasureUsers[3], at: data.d5Approval3At, hasApprover: !!countermeasureUsers[3] }
    },
    {
      label: 'D6',
      statusField: 'd6Status',
      approval1: { status: data.d6Approval1Status, by: data.d6Approval1By || countermeasureUsers[1], at: data.d6Approval1At, hasApprover: !!countermeasureUsers[1] },
      approval2: { status: data.d6Approval2Status, by: data.d6Approval2By || countermeasureUsers[2], at: data.d6Approval2At, hasApprover: !!countermeasureUsers[2] },
      approval3: { status: data.d6Approval3Status, by: data.d6Approval3By || countermeasureUsers[3], at: data.d6Approval3At, hasApprover: !!countermeasureUsers[3] }
    },
    {
      label: 'D7',
      statusField: 'd7Status',
      approval1: { status: data.d7Approval1Status, by: data.d7Approval1By || confirmationUsers[1], at: data.d7Approval1At, hasApprover: !!confirmationUsers[1] },
      approval2: { status: data.d7Approval2Status, by: data.d7Approval2By || confirmationUsers[2], at: data.d7Approval2At, hasApprover: !!confirmationUsers[2] },
      approval3: { status: data.d7Approval3Status, by: data.d7Approval3By || confirmationUsers[3], at: data.d7Approval3At, hasApprover: !!confirmationUsers[3] }
    },
    {
      label: 'D8',
      statusField: 'd8Status',
      approval1: { status: data.d8Approval1Status, by: data.d8Approval1By || confirmationUsers[1], at: data.d8Approval1At, hasApprover: !!confirmationUsers[1] },
      approval2: { status: data.d8Approval2Status, by: data.d8Approval2By || confirmationUsers[2], at: data.d8Approval2At, hasApprover: !!confirmationUsers[2] },
      approval3: { status: data.d8Approval3Status, by: data.d8Approval3By || confirmationUsers[3], at: data.d8Approval3At, hasApprover: !!confirmationUsers[3] }
    }
  ];

  return (
    <div style={styles.container}>

      {/* Revision Family Panel */}
      {revisions.length > 1 && (
        <div style={{
          backgroundColor: t.bgPanel || t.bg,
          border: `1px solid ${t.border || '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.text }}>
             Revisiones del Reporte
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {revisions.map((rev) => {
              const isCurrent = rev.id === data.id;
              const revLabel = rev.revisionNumber ? `R${rev.revisionNumber}` : 'Original';
              const date = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
              return (
                <div key={rev.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: isCurrent ? (t.accent + '15') : 'transparent',
                  border: `1px solid ${isCurrent ? t.accent : (t.border || '#e5e7eb')}`
                }}>
                  <div style={{ minWidth: '80px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: '700',
                      color: isCurrent ? t.accent : t.textMuted,
                      backgroundColor: isCurrent ? (t.accent + '20') : (t.border || '#e5e7eb'),
                      padding: '2px 8px', borderRadius: '4px'
                    }}>
                      {revLabel}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {isCurrent ? (
                        <span style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{rev.reportId}</span>
                      ) : (
                        <a
                          href={`/8d-workflow?reportId=${rev.id}`}
                          style={{ fontSize: '13px', fontWeight: '600', color: t.accent, textDecoration: 'none' }}
                        >
                          {rev.reportId} →
                        </a>
                      )}
                      <span style={{ fontSize: '11px', color: t.textMuted }}>{date}</span>
                      {rev.isArchived && (
                        <span style={{ fontSize: '11px', color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '1px 6px', borderRadius: '4px' }}>
                          Archivado
                        </span>
                      )}
                      {isCurrent && (
                        <span style={{ fontSize: '11px', color: '#059669', backgroundColor: '#d1fae5', padding: '1px 6px', borderRadius: '4px' }}>
                          Actual
                        </span>
                      )}
                    </div>
                    {rev.isArchived && rev.archivedReason && (
                      <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                        Motivo de revert: {rev.archivedReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval Status Summary - Excel Style Table */}
      <div style={styles.approvalSummary}>
        <h3 style={styles.approvalTitle}> Resumen de Aprobaciones</h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Sección</th>
              <th style={styles.th}>Emisor</th>
              <th style={styles.th}>Aprobador 1</th>
              <th style={styles.th}>Aprobador 2</th>
              <th style={styles.th}>Aprobador 3</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {approvalSections.map((section) => {
              const submitter = getSubmitterInfo(section.statusField, section.label);
              const app1 = formatApprovalCell(section.approval1.status, section.approval1.by, section.approval1.at, section.approval1.hasApprover);
              const app2 = formatApprovalCell(section.approval2.status, section.approval2.by, section.approval2.at, section.approval2.hasApprover);
              const app3 = formatApprovalCell(section.approval3.status, section.approval3.by, section.approval3.at, section.approval3.hasApprover);

              // Determine overall status based on main status field
              const overallStatus = data[section.statusField] === 'approved' ? ' Completo' :
                                    data[section.statusField] === 'under_review' ? ' Pendiente' :
                                    data[section.statusField] === 'rejected' ? ' Rechazado' : ' No enviado';

              return (
                <tr key={section.label} style={styles.tr}>
                  <td style={styles.td}><strong>{section.label}</strong></td>
                  <td style={{ ...styles.td, color: submitter.color }}>{submitter.icon} {submitter.text}</td>
                  <td style={{ ...styles.td, color: app1.color }}>{app1.icon} {app1.text}</td>
                  <td style={{ ...styles.td, color: app2.color }}>{app2.icon} {app2.text}</td>
                  <td style={{ ...styles.td, color: app3.color }}>{app3.icon} {app3.text}</td>
                  <td style={styles.td}><strong>{overallStatus}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Header compacto */}
      <div style={styles.header}>
        <h3 style={styles.title}> Historial ({timeline.length} eventos)</h3>

        {/* Filtros en una línea */}
        <div style={styles.filters}>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={styles.select}
          >
            <option value="">Todos los usuarios</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            style={styles.dateInput}
            placeholder="Desde"
          />

          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            style={styles.dateInput}
            placeholder="Hasta"
          />

          <button onClick={clearFilters} style={styles.clearBtn}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Timeline compacto */}
      {timeline.length === 0 ? (
        <p style={styles.emptyText}>No hay eventos que mostrar</p>
      ) : (
        <div style={styles.timeline}>
          {timeline.map((event, index) => (
            <div key={index} style={styles.row}>
              <span style={{ ...styles.icon, color: event.color }}>
                {event.icon}
              </span>
              <span style={styles.date}>{formatDate(event.date)}</span>
              <span style={styles.eventTitle}>{event.title}</span>
              <span style={styles.user}>{event.userName}</span>
              <span style={styles.description}>{event.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getStyles = (t) => ({
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '4px',
    padding: '16px',
    fontSize: '13px'
  },
  approvalSummary: {
    backgroundColor: '#fef3c7',
    border: '2px solid #C77700',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  approvalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    margin: '0 0 12px 0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: t.bgCard,
    fontSize: '11px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  th: {
    backgroundColor: '#C77700',
    color: '#fff',
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '11px',
    border: '1px solid #C77700',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: `1px solid ${t.border}`
  },
  td: {
    padding: '6px 10px',
    border: `1px solid ${t.border}`,
    fontSize: '11px',
    verticalAlign: 'middle',
    lineHeight: '1.4'
  },
  header: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${t.border}`
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 12px 0'
  },
  filters: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  select: {
    padding: '6px 10px',
    border: `1px solid ${t.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: t.bgCard,
    cursor: 'pointer',
    minWidth: '180px'
  },
  dateInput: {
    padding: '6px 10px',
    border: `1px solid ${t.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    minWidth: '130px'
  },
  clearBtn: {
    padding: '6px 12px',
    backgroundColor: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    color: t.text
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '30px 100px 100px 150px 1fr',
    gap: '12px',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: `1px solid ${t.bg}`,
    fontSize: '12px',
    transition: 'background 0.15s',
    cursor: 'default'
  },
  icon: {
    fontSize: '16px',
    textAlign: 'center'
  },
  date: {
    color: t.textMuted,
    fontSize: '11px',
    whiteSpace: 'nowrap'
  },
  eventTitle: {
    fontWeight: '600',
    color: t.text
  },
  user: {
    color: t.textMuted,
    fontSize: '11px'
  },
  description: {
    color: t.textDim,
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  emptyText: {
    textAlign: 'center',
    color: t.textDim,
    padding: '40px 20px',
    fontSize: '13px'
  }
});

export default HistoryTab;
