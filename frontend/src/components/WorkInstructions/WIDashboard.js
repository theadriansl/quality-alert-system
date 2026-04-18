import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const WIDashboard = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/work-instructions')}
            style={{
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px 8px'
            }}
          >
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: t.text }}>
            Dashboard Work Instructions
          </h1>
        </div>
      </div>

      {/* Placeholder Content */}
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: '8px',
        border: `2px dashed ${t.border}`,
        padding: '48px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: t.text, marginBottom: '8px' }}>
            Dashboard en Desarrollo
          </h2>
          <p style={{ color: t.textMuted, marginBottom: '24px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            Aqui se mostraran metricas y KPIs de las Work Instructions:
            cargas de trabajo por linea/estacion, tiempos de ciclo,
            instrucciones pendientes de revision, etc.
          </p>

          {/* Preview Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            maxWidth: '500px',
            margin: '32px auto 0'
          }}>
            <div style={{
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${t.border}`,
              opacity: 0.6
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: t.accent }}>--</div>
              <div style={{ fontSize: '14px', color: t.textMuted }}>WIs Activas</div>
            </div>
            <div style={{
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${t.border}`,
              opacity: 0.6
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: t.success }}>--</div>
              <div style={{ fontSize: '14px', color: t.textMuted }}>Steps Totales</div>
            </div>
            <div style={{
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${t.border}`,
              opacity: 0.6
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: t.warning }}>--</div>
              <div style={{ fontSize: '14px', color: t.textMuted }}>Estaciones</div>
            </div>
          </div>

          {/* Future Features */}
          <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{ fontWeight: '600', color: t.text, marginBottom: '8px', fontSize: '14px' }}>
              Funcionalidades planeadas:
            </h3>
            <ul style={{ fontSize: '14px', color: t.textMuted, listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '4px' }}>- Carga de trabajo por linea de produccion</li>
              <li style={{ marginBottom: '4px' }}>- Distribucion de steps por tipo de estacion</li>
              <li style={{ marginBottom: '4px' }}>- WIs pendientes de actualizacion</li>
              <li style={{ marginBottom: '4px' }}>- Tiempo estimado vs tiempo real por linea</li>
              <li style={{ marginBottom: '4px' }}>- Alertas de Risk Assessment elevado</li>
              <li style={{ marginBottom: '4px' }}>- Historial de revisiones por periodo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WIDashboard;
