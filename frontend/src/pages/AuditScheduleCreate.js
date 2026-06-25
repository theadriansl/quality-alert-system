import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { canUserEdit } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditScheduleCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams(); // Si existe, es modo edición
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const initialProgramId = location.state?.programId || '';
  const isEditMode = !!editId;

  const L = {
    en: {
      noPermission: 'You do not have permission to create audits',
      fillRequired: 'Please fill in the required fields',
      selectFrequency: 'Please select recurrence frequency',
      updateError: 'Error updating audit', createError: 'Error creating audit',
      connectionError: 'Connection error',
      editAudit: 'Edit Audit', scheduleAudit: 'Schedule Audit', cancel: 'Cancel',
      generalInfo: 'General Information', auditProgram: 'Audit Program', selectProgram: 'Select program...',
      checklist: 'Checklist to Use', selectChecklist: 'Select checklist...',
      auditName: 'Audit Name *', auditNamePlaceholder: 'E.g.: Q1 Production Process Audit',
      description: 'Description', descPlaceholder: 'Description and specific objectives...',
      auditees: 'Auditees', auditeeNum: 'Auditee', remove: 'Remove',
      person: 'Person', selectPerson: '-- Select person --', department: 'Department',
      noDept: 'No department', autoAssigned: 'Automatically assigned', areaStage: 'Area/Stage',
      configure: '+ Configure', selectStage: '-- Select stage --',
      comments: 'Comments / Notes', commentsPlaceholder: 'Additional notes about this auditee...',
      addAuditee: '+ Add Auditee',
      scheduling: 'Scheduling', startDate: 'Start Date *', endDate: 'End Date *',
      recurrence: 'Recurrence', isRecurring: 'Is recurring audit',
      selectFreqOpt: 'Select frequency... *', weekly: 'Weekly', biweekly: 'Biweekly',
      monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
      auditDays: 'Audit Days', auditDaysNote: 'Select the specific days when the audit will be performed',
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      auditTeam: 'Audit Team', leadAuditor: 'Lead Auditor', selectLeadAuditor: 'Select lead auditor...',
      coAuditors: 'Co-Auditors', coAuditorsNote: '(additional personnel participating in audit)',
      linkEcr: 'Link to ECR (Optional)', linkEcrDesc: 'You can link this audit to an ECR to audit engineering changes',
      removeLink: 'Remove', searchEcr: 'Search ECR',
      link8D: 'Link to 8D (Optional)', link8DDesc: 'You can link this audit to an existing 8D report',
      search8D: 'Search 8D',
      saving: 'Saving...', saveChanges: 'Save Changes', schedule: 'Schedule Audit',
      selectEcrModal: 'Select ECR to Link', searchEcrPlaceholder: 'Search by number, title, client or type...',
      ecrsAvailable: 'ECR(s) available', loadingEcrs: 'Loading ECRs...',
      noEcrsFound: 'No ECRs found', approved: 'Approved', implemented: 'Implemented',
      noTitle: 'No title', client: 'Client', type: 'Type', priority: 'Priority',
      created: 'Created', by: 'by', unknown: 'Unknown',
      select8DModal: 'Select 8D Report to Link', search8DPlaceholder: 'Search by number, title, client or part number...',
      reportsAvailable: '8D report(s) available', loading8Ds: 'Loading 8D reports...',
      no8DsFound: 'No 8D reports found', closed: 'Closed', inProgress: 'In Progress',
      part: 'Part', phase: 'Phase'
    },
    es: {
      noPermission: 'No tienes permisos para crear auditorías',
      fillRequired: 'Por favor complete los campos requeridos',
      selectFrequency: 'Por favor selecciona la frecuencia de recurrencia',
      updateError: 'Error al actualizar auditoría', createError: 'Error al crear auditoría',
      connectionError: 'Error de conexión',
      editAudit: 'Editar Auditoría', scheduleAudit: 'Programar Auditoría', cancel: 'Cancelar',
      generalInfo: 'Información General', auditProgram: 'Programa de Auditoría', selectProgram: 'Seleccionar programa...',
      checklist: 'Checklist a Utilizar', selectChecklist: 'Seleccionar checklist...',
      auditName: 'Nombre de la Auditoría *', auditNamePlaceholder: 'Ej: Auditoría de Proceso de Producción Q1',
      description: 'Descripción', descPlaceholder: 'Descripción y objetivos específicos...',
      auditees: 'Personas Auditadas', auditeeNum: 'Auditado', remove: 'Eliminar',
      person: 'Persona', selectPerson: '-- Seleccionar persona --', department: 'Departamento',
      noDept: 'Sin departamento', autoAssigned: 'Se asigna automáticamente', areaStage: 'Área/Etapa',
      configure: '+ Configurar', selectStage: '-- Seleccionar etapa --',
      comments: 'Comentarios / Anotaciones', commentsPlaceholder: 'Notas adicionales sobre este auditado...',
      addAuditee: '+ Agregar Persona Auditada',
      scheduling: 'Programación', startDate: 'Fecha Inicio *', endDate: 'Fecha Fin *',
      recurrence: 'Recurrencia', isRecurring: 'Es auditoría recurrente',
      selectFreqOpt: 'Seleccionar frecuencia... *', weekly: 'Semanal', biweekly: 'Quincenal',
      monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual',
      auditDays: 'Días de Auditoría', auditDaysNote: 'Selecciona los días específicos en que se realizará la auditoría',
      dayNames: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      auditTeam: 'Equipo Auditor', leadAuditor: 'Auditor Líder', selectLeadAuditor: 'Seleccionar auditor líder...',
      coAuditors: 'Co-Auditores', coAuditorsNote: '(personal adicional participante en auditoría)',
      linkEcr: 'Vincular a ECR (Opcional)', linkEcrDesc: 'Puede vincular esta auditoría a un ECR para auditar cambios de ingeniería',
      removeLink: 'Quitar', searchEcr: 'Buscar ECR',
      link8D: 'Vincular a 8D (Opcional)', link8DDesc: 'Puede vincular esta auditoría a un reporte 8D existente',
      search8D: 'Buscar 8D',
      saving: 'Guardando...', saveChanges: 'Guardar Cambios', schedule: 'Programar Auditoría',
      selectEcrModal: 'Seleccionar ECR para Vincular', searchEcrPlaceholder: 'Buscar por número, título, cliente o tipo...',
      ecrsAvailable: 'ECR(s) disponibles', loadingEcrs: 'Cargando ECRs...',
      noEcrsFound: 'No se encontraron ECRs', approved: 'Aprobado', implemented: 'Implementado',
      noTitle: 'Sin título', client: 'Cliente', type: 'Tipo', priority: 'Prioridad',
      created: 'Creado', by: 'por', unknown: 'Desconocido',
      select8DModal: 'Seleccionar Reporte 8D para Vincular', search8DPlaceholder: 'Buscar por número, título, cliente o número de parte...',
      reportsAvailable: 'reporte(s) 8D disponibles', loading8Ds: 'Cargando reportes 8D...',
      no8DsFound: 'No se encontraron reportes 8D', closed: 'Cerrado', inProgress: 'En Proceso',
      part: 'Parte', phase: 'Fase'
    }
  }[language] || {};

  // Permission check - redirect if no edit access
  const canEdit = canUserEdit('audits');
  useEffect(() => {
    if (!canEdit) {
      alert(L.noPermission);
      navigate('/audit-calendar');
    }
  }, [canEdit, navigate, L.noPermission]);

  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [ecrSearch, setEcrSearch] = useState('');
  const [ecrResults, setEcrResults] = useState([]);
  const [searchingEcr, setSearchingEcr] = useState(false);
  const [showEcrModal, setShowEcrModal] = useState(false);
  const [allEcrs, setAllEcrs] = useState([]);
  const [loadingEcrs, setLoadingEcrs] = useState(false);

  // 8D linking
  const [show8DModal, setShow8DModal] = useState(false);
  const [all8Ds, setAll8Ds] = useState([]);
  const [loading8Ds, setLoading8Ds] = useState(false);
  const [search8D, setSearch8D] = useState('');
  const [selected8D, setSelected8D] = useState(null);

  const [formData, setFormData] = useState({
    programId: initialProgramId,
    auditName: '',
    description: '',
    areaProcess: '',
    department: '',
    plannedStartDate: '',
    plannedEndDate: '',
    isRecurring: false,
    frequency: '',
    frequencyDetails: {},
    leadAuditorId: '',
    coAuditors: [],
    auditees: [{ userId: '', departmentId: '', stageId: '', comments: '' }],
    checklistId: '',
    linkedEcrId: null,
    linked8DId: null
  });

  const [selectedEcr, setSelectedEcr] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Recargar etapas cuando la ventana gana foco (para cuando vuelve de configurar)
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/inspection-catalogs/stages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setStages(data.items || []);
      } catch (err) {
        console.error('Error reloading stages:', err);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Cargar datos de auditoría existente en modo edición
  useEffect(() => {
    if (isEditMode && editId) {
      const loadScheduleData = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/audit/schedules/${editId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          console.log('Schedule data loaded:', data);

          if (data.success && data.schedule) {
            const s = data.schedule;
            setFormData({
              programId: s.programId || '',
              auditName: s.auditName || '',
              description: s.description || '',
              areaProcess: s.areaProcess || '',
              department: s.department || '',
              plannedStartDate: s.plannedStartDate?.split('T')[0] || '',
              plannedEndDate: s.plannedEndDate?.split('T')[0] || '',
              isRecurring: s.isRecurring || false,
              frequency: s.frequency || '',
              frequencyDetails: s.frequencyDetails || {},
              leadAuditorId: s.leadAuditorId || '',
              coAuditors: s.coAuditors || [],
              auditees: s.auditees?.length > 0
                ? s.auditees.map(a => typeof a === 'string'
                    ? { userId: '', departmentId: '', stageId: '', comments: a } // Migrar datos antiguos
                    : { userId: a.userId || '', departmentId: a.departmentId || '', stageId: a.stageId || '', comments: a.comments || '' })
                : [{ userId: '', departmentId: '', stageId: '', comments: '' }],
              checklistId: s.checklistId || '',
              linkedEcrId: s.linkedEcrId || null,
              linked8DId: s.linked8dId || null
            });

            // Cargar ECR vinculado si existe (viene separado del backend)
            if (data.linkedEcr) {
              setSelectedEcr({
                id: data.linkedEcr.id,
                ecrNumber: data.linkedEcr.ecrNumber,
                title: data.linkedEcr.title || ''
              });
            }

            // Cargar 8D vinculado si existe
            if (s.linked8dId) {
              setSelected8D({
                id: s.linked8dId,
                reportNumber: `8D-${s.linked8dId}`,
                title: ''
              });
            }
          }
        } catch (err) {
          console.error('Error loading schedule:', err);
        }
      };

      loadScheduleData();
    }
  }, [isEditMode, editId]);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [programsRes, checklistsRes, auditorsRes, departmentsRes, usersRes, stagesRes] = await Promise.all([
        fetch(`${API_URL}/audit/programs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/checklists?active=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/auditors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/departments?flat=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/users/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/inspection-catalogs/stages`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const programsData = await programsRes.json();
      const checklistsData = await checklistsRes.json();
      const auditorsData = await auditorsRes.json();
      const departmentsData = await departmentsRes.json();
      const usersData = await usersRes.json();
      const stagesData = await stagesRes.json();

      if (programsData.success) setPrograms(programsData.programs || []);
      if (checklistsData.success) setChecklists(checklistsData.checklists || []);
      if (auditorsData.success) setAuditors(auditorsData.auditors || []);
      if (departmentsData.success) setDepartments(departmentsData.departments || []);
      if (usersData.success) setUsers(usersData.users || []);
      if (stagesData.success) setStages(stagesData.items || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const searchEcr = async (search) => {
    if (!search || search.length < 2) {
      setEcrResults([]);
      return;
    }

    setSearchingEcr(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/search-ecr?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEcrResults(data.ecrs || []);
      }
    } catch (err) {
      console.error('Error searching ECR:', err);
    } finally {
      setSearchingEcr(false);
    }
  };

  const selectEcr = (ecr) => {
    setSelectedEcr(ecr);
    const autoName = `${ecr.ecrNumber} — ${ecr.changeTitle || ''}`.trim().replace(/—\s*$/, '');
    setFormData(prev => ({
      ...prev,
      linkedEcrId: ecr.id,
      auditName: prev.auditName ? prev.auditName : autoName,
    }));
    setEcrSearch('');
    setEcrResults([]);
  };

  const removeEcr = () => {
    setSelectedEcr(null);
    setFormData(prev => ({ ...prev, linkedEcrId: null }));
  };

  const openEcrModal = async () => {
    setShowEcrModal(true);
    setLoadingEcrs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/ecr/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAllEcrs(data.ecrs || []);
      }
    } catch (err) {
      console.error('Error loading ECRs:', err);
    } finally {
      setLoadingEcrs(false);
    }
  };

  const filteredEcrs = allEcrs.filter(ecr => {
    if (!ecrSearch) return true;
    const search = ecrSearch.toLowerCase();
    return ecr.ecrNumber?.toLowerCase().includes(search) ||
           ecr.changeTitle?.toLowerCase().includes(search) ||
           ecr.clientName?.toLowerCase().includes(search) ||
           ecr.changeType?.toLowerCase().includes(search);
  });

  // 8D Modal functions
  const open8DModal = async () => {
    setShow8DModal(true);
    setLoading8Ds(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/8d/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAll8Ds(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading 8Ds:', err);
    } finally {
      setLoading8Ds(false);
    }
  };

  const filtered8Ds = all8Ds.filter(report => {
    if (!search8D) return true;
    const search = search8D.toLowerCase();
    return report.reportNumber?.toLowerCase().includes(search) ||
           report.title?.toLowerCase().includes(search) ||
           report.customerName?.toLowerCase().includes(search) ||
           report.partNumber?.toLowerCase().includes(search);
  });

  const remove8D = () => {
    setSelected8D(null);
    setFormData({ ...formData, linked8DId: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.auditName || !formData.plannedStartDate || !formData.plannedEndDate) {
      alert(L.fillRequired);
      return;
    }
    if (formData.isRecurring && !formData.frequency) {
      alert(L.selectFrequency);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditMode
        ? `${API_URL}/audit/schedules/${editId}`
        : `${API_URL}/audit/schedules`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          auditees: formData.auditees.filter(a => a.userId || a.departmentId || a.comments)
        })
      });
      const result = await res.json();

      if (result.success) {
        navigate('/audit-calendar');
      } else {
        alert(result.message || (isEditMode ? L.updateError : L.createError));
      }
    } catch (err) {
      alert(L.connectionError);
    } finally {
      setLoading(false);
    }
  };

  const addAuditee = () => {
    setFormData({ ...formData, auditees: [...formData.auditees, { userId: '', departmentId: '', stageId: '', comments: '' }] });
  };

  const updateAuditee = (index, field, value) => {
    const newAuditees = [...formData.auditees];

    // Si cambia el usuario, autocompletar departamento
    if (field === 'userId' && value) {
      const selectedUser = users.find(u => u.id === parseInt(value));
      if (selectedUser) {
        const userDept = departments.find(d => d.name === selectedUser.department || d.id === selectedUser.departmentId);
        newAuditees[index] = {
          ...newAuditees[index],
          [field]: value,
          departmentId: userDept?.id || ''
        };
      } else {
        newAuditees[index] = { ...newAuditees[index], [field]: value };
      }
    } else {
      newAuditees[index] = { ...newAuditees[index], [field]: value };
    }

    setFormData({ ...formData, auditees: newAuditees });
  };

  const removeAuditee = (index) => {
    const newAuditees = formData.auditees.filter((_, i) => i !== index);
    setFormData({ ...formData, auditees: newAuditees.length ? newAuditees : [{ userId: '', departmentId: '', stageId: '', comments: '' }] });
  };

  const toggleCoAuditor = (auditorId) => {
    const current = formData.coAuditors || [];
    const numId = Number(auditorId);
    if (current.some(id => Number(id) === numId)) {
      setFormData({ ...formData, coAuditors: current.filter(id => Number(id) !== numId) });
    } else {
      setFormData({ ...formData, coAuditors: [...current, numId] });
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
    buttons: {
      display: 'flex',
      gap: '12px'
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
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text,
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      minHeight: '80px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px'
    },
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      color: t.text
    },
    auditorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '8px'
    },
    auditorCard: {
      padding: '12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      color: t.text
    },
    auditorCardSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}10`
    },
    ecrResult: {
      padding: '10px',
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    ecrSelected: {
      padding: '12px',
      backgroundColor: `${t.success}10`,
      border: `1px solid ${t.success}`,
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    inputRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
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
      maxWidth: '600px',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      color: t.text
    },
    ecrList: {
      flex: 1,
      overflowY: 'auto',
      border: `1px solid ${t.border}`,
      borderRadius: '8px'
    },
    ecrItem: {
      padding: '12px',
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      color: t.text
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>{isEditMode ? L.editAudit : L.scheduleAudit}</h1>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate(-1)}
          >
            ← {L.cancel}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.generalInfo}</h2>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{L.auditProgram}</label>
              <select
                value={formData.programId}
                onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                style={styles.select}
              >
                <option value="">{L.selectProgram}</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.year})</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.checklist}</label>
              <select
                value={formData.checklistId}
                onChange={(e) => setFormData({ ...formData, checklistId: e.target.value })}
                style={styles.select}
              >
                <option value="">{L.selectChecklist}</option>
                {checklists.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.standard}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.auditName}</label>
            <input
              type="text"
              value={formData.auditName}
              onChange={(e) => setFormData({ ...formData, auditName: e.target.value })}
              placeholder={L.auditNamePlaceholder}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.description}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={L.descPlaceholder}
              style={styles.textarea}
            />
          </div>

        </div>

        {/* Personas Auditadas */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.auditees}</h2>
          {formData.auditees.map((auditee, index) => {
            const selectedUser = auditee.userId ? users.find(u => u.id === parseInt(auditee.userId)) : null;
            const userDept = selectedUser ? departments.find(d => d.name === selectedUser.department || d.id === selectedUser.departmentId) : null;

            return (
              <div key={index} style={{
                background: t.bgPanel,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: t.textMuted }}>{L.auditeeNum} #{index + 1}</span>
                  {formData.auditees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuditee(index)}
                      style={{ ...styles.button, backgroundColor: t.error, color: 'white', padding: '4px 10px', fontSize: '12px' }}
                    >
                      {L.remove}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>{L.person}</label>
                    <select
                      value={auditee.userId || ''}
                      onChange={(e) => updateAuditee(index, 'userId', e.target.value)}
                      style={styles.input}
                    >
                      <option value="">{L.selectPerson}</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>{L.department}</label>
                    <input
                      type="text"
                      value={userDept?.name || (auditee.userId ? L.noDept : '')}
                      disabled
                      style={{ ...styles.input, backgroundColor: t.bg, color: t.textMuted }}
                      placeholder={L.autoAssigned}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', color: t.textMuted }}>{L.areaStage}</label>
                      <button
                        type="button"
                        onClick={() => window.open('/defect-config#stages', '_blank')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.accent,
                          fontSize: '11px',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        title={L.configure}
                      >
                        {L.configure}
                      </button>
                    </div>
                    <select
                      value={auditee.stageId || ''}
                      onChange={(e) => updateAuditee(index, 'stageId', e.target.value)}
                      style={styles.input}
                    >
                      <option value="">{L.selectStage}</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px', display: 'block' }}>{L.comments}</label>
                  <textarea
                    value={auditee.comments || ''}
                    onChange={(e) => updateAuditee(index, 'comments', e.target.value)}
                    placeholder={L.commentsPlaceholder}
                    rows="2"
                    style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addAuditee}
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
          >
            {L.addAuditee}
          </button>
        </div>

        {/* Schedule */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.scheduling}</h2>

          <div style={styles.grid3}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{L.startDate}</label>
              <input
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.endDate}</label>
              <input
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{L.recurrence}</label>
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                <span>{L.isRecurring}</span>
              </div>
              {formData.isRecurring && (
                <>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    style={{ ...styles.select, marginTop: '8px', borderColor: !formData.frequency ? '#ef4444' : undefined }}
                    required
                  >
                    <option value="">{L.selectFreqOpt}</option>
                    <option value="weekly">{L.weekly}</option>
                    <option value="biweekly">{L.biweekly}</option>
                    <option value="monthly">{L.monthly}</option>
                    <option value="quarterly">{L.quarterly}</option>
                    <option value="yearly">{L.yearly}</option>
                  </select>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ ...styles.label, marginBottom: '8px' }}>{L.auditDays}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {L.dayNames.map((day, idx) => {
                        const recurringDays = formData.frequencyDetails?.recurring_days || [];
                        const isSelected = recurringDays.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const current = formData.frequencyDetails?.recurring_days || [];
                              const newDays = isSelected
                                ? current.filter(d => d !== idx)
                                : [...current, idx].sort((a, b) => a - b);
                              setFormData({
                                ...formData,
                                frequencyDetails: { ...formData.frequencyDetails, recurring_days: newDays }
                              });
                            }}
                            style={{
                              padding: '8px 14px',
                              border: `2px solid ${isSelected ? t.accent : t.border}`,
                              borderRadius: '6px',
                              backgroundColor: isSelected ? `${t.accent}20` : t.bgCard,
                              color: isSelected ? t.accent : t.text,
                              fontWeight: isSelected ? '600' : '400',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '6px' }}>
                      {L.auditDaysNote}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Auditors */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.auditTeam}</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.leadAuditor}</label>
            <select
              value={formData.leadAuditorId}
              onChange={(e) => setFormData({
                ...formData,
                leadAuditorId: e.target.value,
                coAuditors: formData.coAuditors.filter(id => Number(id) !== Number(e.target.value))
              })}
              style={styles.select}
            >
              <option value="">{L.selectLeadAuditor}</option>
              {auditors.filter(a => a.hasAuditorRole).map(a => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName} - {a.department || L.noDept}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.coAuditors} <span style={{ fontWeight: '400', color: t.textMuted }}>{L.coAuditorsNote}</span></label>
            <div style={styles.auditorGrid}>
              {auditors.filter(a => a.id !== parseInt(formData.leadAuditorId)).map(a => (
                <div
                  key={a.id}
                  style={{
                    ...styles.auditorCard,
                    ...(formData.coAuditors.some(id => Number(id) === Number(a.id)) ? styles.auditorCardSelected : {})
                  }}
                  onClick={() => toggleCoAuditor(a.id)}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {a.firstName} {a.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    {a.department || L.noDept}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ECR Link */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.linkEcr}</h2>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>
            {L.linkEcrDesc}
          </p>

          {selectedEcr ? (
            <div style={styles.ecrSelected}>
              <div>
                <div style={{ fontWeight: '700', color: t.accent }}>{selectedEcr.ecrNumber}</div>
                <div style={{ fontSize: '13px', color: t.text, marginTop: '2px' }}>{selectedEcr.title}</div>
              </div>
              <button
                type="button"
                onClick={removeEcr}
                style={{ ...styles.button, backgroundColor: t.error, color: 'white', padding: '6px 12px' }}
              >
                 {L.removeLink}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openEcrModal}
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            >
              {L.searchEcr}
            </button>
          )}
        </div>

        {/* 8D Link */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{L.link8D}</h2>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>
            {L.link8DDesc}
          </p>

          {selected8D ? (
            <div style={styles.ecrSelected}>
              <div>
                <div style={{ fontWeight: '700', color: t.error }}>{selected8D.reportNumber}</div>
                <div style={{ fontSize: '13px', color: t.text, marginTop: '2px' }}>{selected8D.title}</div>
              </div>
              <button
                type="button"
                onClick={remove8D}
                style={{ ...styles.button, backgroundColor: t.error, color: 'white', padding: '6px 12px' }}
              >
                 {L.removeLink}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={open8DModal}
              style={{ ...styles.button, backgroundColor: t.error, color: 'white' }}
            >
              {L.search8D}
            </button>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
          >
            {L.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
          >
            {loading ? L.saving : isEditMode ? ` ${L.saveChanges}` : ` ${L.schedule}`}
          </button>
        </div>
      </form>

      {/* ECR Modal */}
      {showEcrModal && (
        <div style={styles.modal} onClick={() => setShowEcrModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.selectEcrModal}</h2>

            <input
              type="text"
              value={ecrSearch}
              onChange={(e) => setEcrSearch(e.target.value)}
              placeholder={L.searchEcrPlaceholder}
              style={{ ...styles.input, marginBottom: '16px' }}
              autoFocus
            />

            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
              {filteredEcrs.length} {L.ecrsAvailable}
            </div>

            {loadingEcrs ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                {L.loadingEcrs}
              </div>
            ) : filteredEcrs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                {L.noEcrsFound}
              </div>
            ) : (
              <div style={styles.ecrList}>
                {filteredEcrs.map(ecr => (
                  <div
                    key={ecr.id}
                    style={styles.ecrItem}
                    onClick={() => {
                      setSelectedEcr({
                        id: ecr.id,
                        ecrNumber: ecr.ecrNumber,
                        title: ecr.changeTitle
                      });
                      setFormData({ ...formData, linkedEcrId: ecr.id });
                      setShowEcrModal(false);
                      setEcrSearch('');
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${t.accent}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: t.accent, fontSize: '15px' }}>{ecr.ecrNumber}</span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: ecr.status === 'approved' ? `${t.success}20` : ecr.status === 'implemented' ? `${t.accent}20` : '#f3e8ff',
                            color: ecr.status === 'approved' ? t.success : ecr.status === 'implemented' ? t.primary : '#7c3aed',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {ecr.status === 'approved' ? L.approved : ecr.status === 'implemented' ? L.implemented : ecr.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: t.text, fontWeight: '500' }}>
                          {ecr.changeTitle || L.noTitle}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          <span>{L.client}: {ecr.clientName || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>{L.type}: {ecr.changeType || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>{L.priority}: {ecr.priority || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '2px' }}>
                          {L.created}: {new Date(ecr.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')} {L.by} {ecr.createdByName || L.unknown}
                        </div>
                      </div>
                      <div style={{ color: t.accent, fontSize: '18px' }}>→</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEcrModal(false);
                  setEcrSearch('');
                }}
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
              >
                {L.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8D Modal */}
      {show8DModal && (
        <div style={styles.modal} onClick={() => setShow8DModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{L.select8DModal}</h2>

            <input
              type="text"
              value={search8D}
              onChange={(e) => setSearch8D(e.target.value)}
              placeholder={L.search8DPlaceholder}
              style={{ ...styles.input, marginBottom: '16px' }}
              autoFocus
            />

            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
              {filtered8Ds.length} {L.reportsAvailable}
            </div>

            {loading8Ds ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                {L.loading8Ds}
              </div>
            ) : filtered8Ds.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                {L.no8DsFound}
              </div>
            ) : (
              <div style={styles.ecrList}>
                {filtered8Ds.map(report => (
                  <div
                    key={report.id}
                    style={styles.ecrItem}
                    onClick={() => {
                      setSelected8D({
                        id: report.id,
                        reportNumber: report.reportNumber,
                        title: report.title
                      });
                      setFormData({ ...formData, linked8DId: report.id });
                      setShow8DModal(false);
                      setSearch8D('');
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${t.error}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: t.error, fontSize: '15px' }}>{report.reportNumber}</span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: report.status === 'closed' ? `${t.success}20` : report.status === 'in_progress' ? `${t.warning}20` : '#e0e7ff',
                            color: report.status === 'closed' ? t.success : report.status === 'in_progress' ? t.warning : '#3730a3',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {report.status === 'closed' ? L.closed : report.status === 'in_progress' ? L.inProgress : report.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: t.text, fontWeight: '500' }}>
                          {report.title || L.noTitle}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          <span>{L.client}: {report.customerName || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>{L.part}: {report.partNumber || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>{L.phase}: D{report.currentPhase || '?'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '2px' }}>
                          {L.created}: {new Date(report.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
                        </div>
                      </div>
                      <div style={{ color: t.error, fontSize: '18px' }}>→</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setShow8DModal(false);
                  setSearch8D('');
                }}
                style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
              >
                {L.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditScheduleCreate;
