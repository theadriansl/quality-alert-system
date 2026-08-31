import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const ECRConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, fontFamily: 'Inter, sans-serif' }}>
      <header style={{ backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: '600', color: t.text }}>⚙ Configuración ECR</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ThemeSelector />
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => navigate('/ecr-dashboard')}
            style={{ padding: '8px 16px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px' }}>
          Configuración administrativa del módulo ECR
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div
            onClick={() => navigate('/risk-matrix-config')}
            style={{ padding: '24px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '15px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>Matriz de Riesgo</div>
            <div style={{ fontSize: '12px', color: t.textMuted }}>Configurar matriz de evaluación de riesgo (Severidad x Ocurrencia)</div>
          </div>
          <div
            onClick={() => navigate('/impact-analysis-config')}
            style={{ padding: '24px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '15px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>Áreas de Impacto y Equipos</div>
            <div style={{ fontSize: '12px', color: t.textMuted }}>Configurar áreas de impacto y equipos de validación</div>
          </div>
          <div
            onClick={() => navigate('/ecr-quality-targets')}
            style={{ padding: '24px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '15px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>Metas de Calidad</div>
            <div style={{ fontSize: '12px', color: t.textMuted }}>Configurar metas de Cp, Cpk, estabilidad de proceso y scrap inicial</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ECRConfig;
