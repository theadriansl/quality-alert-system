import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import CalibrationEquipmentTab from '../components/CalibrationEquipmentTab';
import CalibrationCostsTab from '../components/CalibrationCostsTab';

const CalibrationPage = () => {
  const { theme: t } = useTheme();
  const [activeTab, setActiveTab] = useState('equipment');

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    border: 'none',
    backgroundColor: isActive ? t.accent : 'transparent',
    color: isActive ? 'white' : t.textMuted,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    transition: 'all 0.2s'
  });

  return (
    <div style={{
      padding: '24px',
      backgroundColor: t.bg,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: t.text,
            margin: 0
          }}>
            Control de Equipos de Medición
          </h1>
          <p style={{
            color: t.textMuted,
            marginTop: '8px',
            fontSize: '14px'
          }}>
            ISO 9001:2015 §7.1.5.2 | IATF 16949 §7.1.5.2.1 - Trazabilidad de Calibración
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: t.bgPanel,
          padding: '4px',
          borderRadius: '10px'
        }}>
          <button
            style={tabStyle(activeTab === 'equipment')}
            onClick={() => setActiveTab('equipment')}
          >
            Equipos
          </button>
          <button
            style={tabStyle(activeTab === 'costs')}
            onClick={() => setActiveTab('costs')}
          >
            Costos
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${t.border}`
      }}>
        {activeTab === 'equipment' && <CalibrationEquipmentTab theme={t} />}
        {activeTab === 'costs' && <CalibrationCostsTab theme={t} />}
      </div>
    </div>
  );
};

export default CalibrationPage;
