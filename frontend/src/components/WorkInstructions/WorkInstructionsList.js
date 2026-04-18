import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import workInstructionsService from '../../services/workInstructionsService';
import clientService from '../../services/clientService';
import { useTheme, ThemeSelector } from '../../context/ThemeContext';

const WorkInstructionsList = () => {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [workInstructions, setWorkInstructions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    clientId: '',
    status: ''
  });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWI, setNewWI] = useState({
    title: '',
    description: '',
    clientId: '',
    validFrom: '',
    validTo: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wiResponse, clientsResponse] = await Promise.all([
        workInstructionsService.getAll(filters),
        clientService.getAllClients()
      ]);
      setWorkInstructions(wiResponse.workInstructions || []);
      setClients(clientsResponse.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWI = async () => {
    if (!newWI.title || !newWI.clientId) {
      alert('Titulo y Cliente son requeridos');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await workInstructionsService.create({
        ...newWI,
        createdBy: user?.id
      });

      if (response.success) {
        setShowCreateModal(false);
        setNewWI({ title: '', description: '', clientId: '', validFrom: '', validTo: '' });
        navigate(`/work-instructions/${response.workInstruction.id}`);
      }
    } catch (err) {
      alert('Error al crear Work Instruction: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: { bg: t.textMuted, label: 'Borrador' },
      active: { bg: t.success, label: 'Activa' },
      archived: { bg: t.warning, label: 'Archivada' }
    };
    const s = statusStyles[status] || statusStyles.draft;
    return (
      <span style={{
        backgroundColor: s.bg,
        color: 'white',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: t.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: t.primary }}>Work Instructions</h2>
          <p style={{ margin: '5px 0 0', color: t.textMuted }}>
            Gestiona las instrucciones de trabajo para tus proyectos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ThemeSelector />
          <button
            onClick={() => navigate('/work-instructions-dashboard')}
            style={{
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/work-instructions-config')}
            style={{
              backgroundColor: t.bgPanel,
              color: t.text,
              border: `1px solid ${t.border}`,
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Plantas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: t.primary,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Nueva Work Instruction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: t.bgCard,
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <label style={{ fontSize: '12px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Cliente</label>
          <select
            value={filters.clientId}
            onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '4px', border: `1px solid ${t.border}`, minWidth: '200px', backgroundColor: t.bgCard, color: t.text }}
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Estado</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '4px', border: `1px solid ${t.border}`, minWidth: '150px', backgroundColor: t.bgCard, color: t.text }}
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="active">Activa</option>
            <option value="archived">Archivada</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', color: t.textMuted, fontSize: '14px' }}>
          {workInstructions.length} instrucciones
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ backgroundColor: t.id === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2', color: t.error, padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: t.bgCard, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: t.bgPanel }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Titulo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Cliente</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Rev.</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Proyectos</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Parts</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Steps</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Validez</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: '600' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {workInstructions.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                  No hay work instructions. Crea una nueva para comenzar.
                </td>
              </tr>
            ) : (
              workInstructions.map(wi => (
                <tr key={wi.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '500', color: t.primary }}>{wi.title}</div>
                    {wi.description && (
                      <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>
                        {wi.description.length > 60 ? wi.description.substring(0, 60) + '...' : wi.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: t.text }}>{wi.clientName || wi.clientAlias}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: t.id === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe',
                      color: t.info,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Rev. {wi.currentRevision || 1}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: t.text }}>{wi.totalProjects || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: t.text }}>{wi.totalParts || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: t.text }}>{wi.totalSteps || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: t.textMuted }}>
                    {wi.validFrom ? new Date(wi.validFrom).toLocaleDateString() : '-'}
                    {wi.validTo && <span> - {new Date(wi.validTo).toLocaleDateString()}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {getStatusBadge(wi.status)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/work-instructions/${wi.id}`)}
                      style={{
                        backgroundColor: t.primary,
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            padding: '24px',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: t.primary }}>Nueva Work Instruction</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Cliente *</label>
              <select
                value={newWI.clientId}
                onChange={(e) => setNewWI({ ...newWI, clientId: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Titulo *</label>
              <input
                type="text"
                value={newWI.title}
                onChange={(e) => setNewWI({ ...newWI, title: e.target.value })}
                placeholder="Ej: Inspeccion Visual de Paneles"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Descripcion</label>
              <textarea
                value={newWI.description}
                onChange={(e) => setNewWI({ ...newWI, description: e.target.value })}
                placeholder="Descripcion breve de la instruccion..."
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, resize: 'vertical', backgroundColor: t.bgCard, color: t.text }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Valido desde</label>
                <input
                  type="date"
                  value={newWI.validFrom}
                  onChange={(e) => setNewWI({ ...newWI, validFrom: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: t.text }}>Valido hasta</label>
                <input
                  type="date"
                  value={newWI.validTo}
                  onChange={(e) => setNewWI({ ...newWI, validTo: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWI}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: t.primary,
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkInstructionsList;
