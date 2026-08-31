import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const ECRQualityTargets = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [targets, setTargets] = useState({
    cpTarget: 1.33,
    cpkTarget: 1.33,
    processStabilityTarget: 95,
    initialScrapTarget: 5
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:5000/ecr/quality-targets', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      if (r.data.success && r.data.targets) {
        const d = r.data.targets;
        setTargets({
          cpTarget: parseFloat(d.cp_target) || 1.33,
          cpkTarget: parseFloat(d.cpk_target) || 1.33,
          processStabilityTarget: parseFloat(d.process_stability_target) || 95,
          initialScrapTarget: parseFloat(d.initial_scrap_target) || 5
        });
      }
    }).catch(() => showError('Error al cargar metas'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/ecr/quality-targets', targets, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Metas guardadas exitosamente');
    } catch {
      showError('Error al guardar metas');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, unit, description) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="number"
          step="0.01"
          value={targets[key]}
          onChange={e => setTargets(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
          style={{ width: '120px', padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text, fontSize: '14px' }}
        />
        <span style={{ fontSize: '13px', color: t.textMuted }}>{unit}</span>
      </div>
      {description && <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>{description}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, fontFamily: 'Inter, sans-serif' }}>
      <header style={{ backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '20px', fontWeight: '600', color: t.text }}>Metas de Calidad ECR</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ThemeSelector />
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button onClick={() => navigate('/ecr-config')} style={{ padding: '8px 16px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            {language === 'es' ? '← Configuración' : '← Config'}
          </button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '28px' }}>
          Define los umbrales mínimos de aceptación para los indicadores de calidad del proceso. Estos valores se usan como referencia en ECR-4 y en el dashboard.
        </p>

        {loading ? (
          <p style={{ color: t.textMuted }}>Cargando...</p>
        ) : (
          <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '24px' }}>
            {field('Cp mínimo (Centrado de proceso)', 'cpTarget', 'índice', 'Valor mínimo aceptable de Cp. Estándar IATF ≥ 1.33.')}
            {field('Cpk mínimo (Capacidad de proceso)', 'cpkTarget', 'índice', 'Valor mínimo aceptable de Cpk. Estándar IATF ≥ 1.33.')}
            {field('Estabilidad de proceso mínima', 'processStabilityTarget', '%', 'Porcentaje mínimo de estabilidad post-cambio.')}
            {field('Scrap inicial máximo', 'initialScrapTarget', '%', 'Porcentaje máximo aceptable de scrap en producción inicial.')}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 24px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              {saving ? 'Guardando...' : 'Guardar Metas'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ECRQualityTargets;
