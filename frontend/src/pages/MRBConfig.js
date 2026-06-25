import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isUserAdmin } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MRBConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const L = {
    en: {
      loading: 'Loading...',
      errorLoading: 'Error loading MRB configuration',
      errorUpdating: 'Error updating validator',
      accessRestricted: 'Access restricted to administrators.',
      mrbConfig: 'MRB Configuration',
      mrbValidators: 'MRB Validators',
      defectsCatalog: 'Defects Catalog',
      validatorsInfo: 'Validators can approve or reject MRB campaign responses in which they are assigned as validators.',
      user: 'User',
      department: 'Department',
      role: 'Role',
      canValidateMrb: 'Can Validate MRB',
      noUsers: 'No users.',
      yes: 'Yes',
      no: 'No',
      defectsAdmin: 'Defects Administration',
      defectsInfo: 'If a defect does not appear in MRB capture, add it from the global defects catalog.',
      goToDefectsAdmin: 'Go to Defects Admin →'
    },
    es: {
      loading: 'Cargando...',
      errorLoading: 'Error cargando configuración MRB',
      errorUpdating: 'Error actualizando validador',
      accessRestricted: 'Acceso restringido a administradores.',
      mrbConfig: 'Configuración MRB',
      mrbValidators: 'Validadores MRB',
      defectsCatalog: 'Catálogo de Defectos',
      validatorsInfo: 'Los validadores pueden aprobar o rechazar respuestas de campañas MRB en las que están asignados como validadores.',
      user: 'Usuario',
      department: 'Departamento',
      role: 'Rol',
      canValidateMrb: 'Puede Validar MRB',
      noUsers: 'No hay usuarios.',
      yes: 'Sí',
      no: 'No',
      defectsAdmin: 'Administración de Defectos',
      defectsInfo: 'Si un defecto no aparece en la captura MRB, agrégalo desde el catálogo global de defectos.',
      goToDefectsAdmin: 'Ir a Admin Defectos →'
    }
  }[language] || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('validators');
  const [mrbValidators, setMrbValidators] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, valRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/users/mrb-validators`, { headers: getAuthHeaders() })
      ]);
      const meData = await meRes.json();
      const valData = await valRes.json();
      setCurrentUser(meData.user || null);
      setMrbValidators(valData.users || []);
    } catch {
      setError(L.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleMrbValidator = async (user) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/mrb-validator`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ canValidateMrb: !user.canValidateMrb })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error actualizando validador');
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
      const refreshRes = await fetch(`${API_BASE_URL}/users/mrb-validators`, { headers: getAuthHeaders() });
      const refreshData = await refreshRes.json();
      setMrbValidators(refreshData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const styles = {
    container: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
    backBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: t.textMuted, fontSize: '20px', padding: '4px 8px'
    },
    title: { fontSize: '22px', fontWeight: 700, color: t.text, margin: 0 },
    tabs: { display: 'flex', gap: '4px', borderBottom: `2px solid ${t.border}`, marginBottom: '24px' },
    tab: (active) => ({
      padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600,
      fontSize: '14px', background: 'none',
      color: active ? '#1d4ed8' : t.textMuted,
      borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
      marginBottom: '-2px'
    }),
    card: {
      background: t.cardBg, border: `1px solid ${t.border}`,
      borderRadius: '8px', overflow: 'hidden'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      padding: '12px 16px', textAlign: 'left', fontSize: '12px',
      fontWeight: 600, color: t.textMuted, background: t.bg,
      borderBottom: `1px solid ${t.border}`, textTransform: 'uppercase', letterSpacing: '0.05em'
    },
    td: { padding: '12px 16px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: '14px' },
    toggleBtn: (active) => ({
      padding: '4px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
      fontWeight: 600, fontSize: '13px', minWidth: '60px',
      backgroundColor: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#166534' : '#B00020'
    }),
    linkCard: {
      background: t.cardBg, border: `1px solid ${t.border}`,
      borderRadius: '8px', padding: '20px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between'
    },
    linkBtn: {
      padding: '8px 18px', background: '#1d4ed8', color: '#fff',
      border: 'none', borderRadius: '6px', cursor: 'pointer',
      fontWeight: 600, fontSize: '13px'
    },
    alert: (type) => ({
      padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
      background: type === 'error' ? '#fee2e2' : '#dcfce7',
      color: type === 'error' ? '#B00020' : '#166534',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#86efac'}`
    })
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>{L.loading}</div>;

  if (!isUserAdmin(currentUser)) {
    return <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>{L.accessRestricted}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/mrb-dashboard')}>←</button>
        <h1 style={styles.title}>{L.mrbConfig}</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>

      {error && <div style={styles.alert('error')}>{error} <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button></div>}
      {success && <div style={styles.alert('success')}>{success}</div>}

      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'validators')} onClick={() => setActiveTab('validators')}>
          {L.mrbValidators}
        </button>
        <button style={styles.tab(activeTab === 'defects')} onClick={() => setActiveTab('defects')}>
          {L.defectsCatalog}
        </button>
      </div>

      {activeTab === 'validators' && (
        <div style={styles.card}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}` }}>
            <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>
              {L.validatorsInfo}
            </p>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{L.user}</th>
                <th style={styles.th}>{L.department}</th>
                <th style={styles.th}>{L.role}</th>
                <th style={styles.th}>{L.canValidateMrb}</th>
              </tr>
            </thead>
            <tbody>
              {mrbValidators.length === 0 ? (
                <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: t.textMuted }}>{L.noUsers}</td></tr>
              ) : mrbValidators.map(user => (
                <tr key={user.id}>
                  <td style={styles.td}>
                    <strong>{user.firstName} {user.lastName}</strong>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>{user.email}</div>
                  </td>
                  <td style={styles.td}>{user.department || '-'}</td>
                  <td style={styles.td}>{user.role || '-'}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.toggleBtn(user.canValidateMrb)}
                      onClick={() => handleToggleMrbValidator(user)}
                      disabled={saving}
                    >
                      {user.canValidateMrb ? L.yes : L.no}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'defects' && (
        <div style={styles.linkCard}>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: t.text }}>{L.defectsAdmin}</p>
            <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>
              {L.defectsInfo}
            </p>
          </div>
          <button style={styles.linkBtn} onClick={() => navigate('/defect-admin')}>
            {L.goToDefectsAdmin}
          </button>
        </div>
      )}
    </div>
  );
};

export default MRBConfig;
