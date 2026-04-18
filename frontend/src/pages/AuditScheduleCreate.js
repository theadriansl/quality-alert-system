import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { canUserEdit } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000';

const AuditScheduleCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: t } = useTheme();
  const initialProgramId = location.state?.programId || '';

  // Permission check - redirect if no edit access
  const canEdit = canUserEdit('audits');
  useEffect(() => {
    if (!canEdit) {
      alert('No tienes permisos para crear auditorías');
      navigate('/audit-calendar');
    }
  }, [canEdit, navigate]);

  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [auditors, setAuditors] = useState([]);
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
    leadAuditorId: '',
    coAuditors: [],
    auditees: [''],
    checklistId: '',
    linkedEcrId: null,
    linked8DId: null
  });

  const [selectedEcr, setSelectedEcr] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [programsRes, checklistsRes, auditorsRes] = await Promise.all([
        fetch(`${API_URL}/audit/programs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/checklists?active=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/audit/auditors`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const programsData = await programsRes.json();
      const checklistsData = await checklistsRes.json();
      const auditorsData = await auditorsRes.json();

      if (programsData.success) setPrograms(programsData.programs || []);
      if (checklistsData.success) setChecklists(checklistsData.checklists || []);
      if (auditorsData.success) setAuditors(auditorsData.auditors || []);
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
    setFormData({ ...formData, linkedEcrId: ecr.id });
    setEcrSearch('');
    setEcrResults([]);
  };

  const removeEcr = () => {
    setSelectedEcr(null);
    setFormData({ ...formData, linkedEcrId: null });
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
      alert('Por favor complete los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          auditees: formData.auditees.filter(a => a.trim())
        })
      });
      const result = await res.json();

      if (result.success) {
        navigate('/audit-calendar');
      } else {
        alert(result.message || 'Error al crear auditoría');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const addAuditee = () => {
    setFormData({ ...formData, auditees: [...formData.auditees, ''] });
  };

  const updateAuditee = (index, value) => {
    const newAuditees = [...formData.auditees];
    newAuditees[index] = value;
    setFormData({ ...formData, auditees: newAuditees });
  };

  const removeAuditee = (index) => {
    const newAuditees = formData.auditees.filter((_, i) => i !== index);
    setFormData({ ...formData, auditees: newAuditees.length ? newAuditees : [''] });
  };

  const toggleCoAuditor = (auditorId) => {
    const current = formData.coAuditors || [];
    if (current.includes(auditorId)) {
      setFormData({ ...formData, coAuditors: current.filter(id => id !== auditorId) });
    } else {
      setFormData({ ...formData, coAuditors: [...current, auditorId] });
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
        <h1 style={styles.title}>Programar Auditoría</h1>
        <div style={styles.buttons}>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate(-1)}
          >
            ← Cancelar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Informacion General</h2>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Programa de Auditoría</label>
              <select
                value={formData.programId}
                onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                style={styles.select}
              >
                <option value="">Seleccionar programa...</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.year})</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Checklist a Utilizar</label>
              <select
                value={formData.checklistId}
                onChange={(e) => setFormData({ ...formData, checklistId: e.target.value })}
                style={styles.select}
              >
                <option value="">Seleccionar checklist...</option>
                {checklists.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.standard}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre de la Auditoría *</label>
            <input
              type="text"
              value={formData.auditName}
              onChange={(e) => setFormData({ ...formData, auditName: e.target.value })}
              placeholder="Ej: Auditoría de Proceso de Producción Q1"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción y objetivos específicos..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Área/Proceso a Auditar</label>
              <input
                type="text"
                value={formData.areaProcess}
                onChange={(e) => setFormData({ ...formData, areaProcess: e.target.value })}
                placeholder="Ej: Producción, Almacén, Calidad..."
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Departamento</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ej: Manufactura"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Programacion</h2>

          <div style={styles.grid3}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Fecha Inicio *</label>
              <input
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Fecha Fin *</label>
              <input
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Recurrencia</label>
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                <span>Es auditoría recurrente</span>
              </div>
              {formData.isRecurring && (
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Seleccionar frecuencia...</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Auditors */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Equipo Auditor</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Auditor Líder</label>
            <select
              value={formData.leadAuditorId}
              onChange={(e) => setFormData({ ...formData, leadAuditorId: e.target.value })}
              style={styles.select}
            >
              <option value="">Seleccionar auditor líder...</option>
              {auditors.map(a => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName} - {a.department || 'Sin depto'}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Co-Auditores</label>
            <div style={styles.auditorGrid}>
              {auditors.filter(a => a.id !== parseInt(formData.leadAuditorId)).map(a => (
                <div
                  key={a.id}
                  style={{
                    ...styles.auditorCard,
                    ...(formData.coAuditors.includes(a.id) ? styles.auditorCardSelected : {})
                  }}
                  onClick={() => toggleCoAuditor(a.id)}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {a.firstName} {a.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    {a.department || 'Sin depto'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Auditados (Personas/Áreas)</label>
            {formData.auditees.map((auditee, index) => (
              <div key={index} style={styles.inputRow}>
                <input
                  type="text"
                  value={auditee}
                  onChange={(e) => updateAuditee(index, e.target.value)}
                  placeholder="Nombre o área del auditado"
                  style={{ ...styles.input, flex: 1 }}
                />
                {formData.auditees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAuditee(index)}
                    style={{ ...styles.button, backgroundColor: t.error, color: 'white', padding: '8px 12px' }}
                  >

                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addAuditee}
              style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            >
              + Agregar Auditado
            </button>
          </div>
        </div>

        {/* ECR Link */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Vincular a ECR (Opcional)</h2>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>
            Puede vincular esta auditoría a un ECR para auditar cambios de ingeniería
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
                 Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openEcrModal}
              style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            >
              Buscar ECR
            </button>
          )}
        </div>

        {/* 8D Link */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Vincular a 8D (Opcional)</h2>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>
            Puede vincular esta auditoría a un reporte 8D existente
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
                 Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={open8DModal}
              style={{ ...styles.button, backgroundColor: t.error, color: 'white' }}
            >
              Buscar 8D
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
          >
            {loading ? 'Guardando...' : ' Programar Auditoría'}
          </button>
        </div>
      </form>

      {/* ECR Modal */}
      {showEcrModal && (
        <div style={styles.modal} onClick={() => setShowEcrModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Seleccionar ECR para Vincular</h2>

            <input
              type="text"
              value={ecrSearch}
              onChange={(e) => setEcrSearch(e.target.value)}
              placeholder="Buscar por número, título, cliente o tipo..."
              style={{ ...styles.input, marginBottom: '16px' }}
              autoFocus
            />

            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
              {filteredEcrs.length} ECR(s) disponibles
            </div>

            {loadingEcrs ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                Cargando ECRs...
              </div>
            ) : filteredEcrs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                No se encontraron ECRs
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
                            {ecr.status === 'approved' ? 'Aprobado' : ecr.status === 'implemented' ? 'Implementado' : ecr.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: t.text, fontWeight: '500' }}>
                          {ecr.changeTitle || 'Sin título'}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          <span>Cliente: {ecr.clientName || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>Tipo: {ecr.changeType || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>Prioridad: {ecr.priority || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '2px' }}>
                          Creado: {new Date(ecr.createdAt).toLocaleDateString('es-MX')} por {ecr.createdByName || 'Desconocido'}
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
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8D Modal */}
      {show8DModal && (
        <div style={styles.modal} onClick={() => setShow8DModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Seleccionar Reporte 8D para Vincular</h2>

            <input
              type="text"
              value={search8D}
              onChange={(e) => setSearch8D(e.target.value)}
              placeholder="Buscar por número, título, cliente o número de parte..."
              style={{ ...styles.input, marginBottom: '16px' }}
              autoFocus
            />

            <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
              {filtered8Ds.length} reporte(s) 8D disponibles
            </div>

            {loading8Ds ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                Cargando reportes 8D...
              </div>
            ) : filtered8Ds.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: t.textMuted }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                No se encontraron reportes 8D
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
                            {report.status === 'closed' ? 'Cerrado' : report.status === 'in_progress' ? 'En Proceso' : report.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: t.text, fontWeight: '500' }}>
                          {report.title || 'Sin título'}
                        </div>
                        <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                          <span>Cliente: {report.customerName || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>Parte: {report.partNumber || 'N/A'}</span>
                          <span style={{ margin: '0 8px' }}>-</span>
                          <span>Fase: D{report.currentPhase || '?'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '2px' }}>
                          Creado: {new Date(report.createdAt).toLocaleDateString('es-MX')}
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
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditScheduleCreate;
