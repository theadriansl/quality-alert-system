import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import GanttChart from '../components/8D/GanttChart';
import UserFormModal from '../components/UserFormModal';
import WorkloadDashboard from '../components/WorkloadDashboard';
import {
  ListHeader,
  ListTabs,
  ActivityRowCollapsed,
  ActivityRowExpanded
} from '../components/Workload/ListViewComponents';

// ============================================================================
// OrgChart Component - Horizontal layout with auto-adjusting boxes
// ============================================================================
const OrgChart = ({ users, hierarchyLevels, onEditUser }) => {
  const { theme: t } = useTheme();
  const defaultLevels = [
    { levelOrder: 0, name: 'Director', color: t.accent },
    { levelOrder: 1, name: 'Gerente', color: t.primary },
    { levelOrder: 2, name: 'Supervisor', color: t.success },
    { levelOrder: 3, name: 'Ingeniero', color: t.warning },
    { levelOrder: 4, name: 'Staff', color: t.textMuted }
  ];

  const levels = (hierarchyLevels && hierarchyLevels.length > 0)
    ? hierarchyLevels.map(l => ({
        levelOrder: l.levelOrder ?? l.value ?? 0,
        name: l.name || l.label || 'Nivel',
        color: l.color || t.textMuted
      }))
    : defaultLevels;

  const buildTree = (users) => {
    const userMap = {};
    const roots = [];
    users.forEach(user => { userMap[user.id] = { ...user, children: [] }; });
    users.forEach(user => {
      if (user.managerId && userMap[user.managerId]) {
        userMap[user.managerId].children.push(userMap[user.id]);
      } else {
        roots.push(userMap[user.id]);
      }
    });
    const sortRecursive = (node) => {
      if (node.children?.length > 0) {
        node.children.sort((a, b) => {
          const levelDiff = (a.hierarchyLevel ?? 99) - (b.hierarchyLevel ?? 99);
          return levelDiff !== 0 ? levelDiff : (a.firstName || '').localeCompare(b.firstName || '');
        });
        node.children.forEach(sortRecursive);
      }
    };
    roots.sort((a, b) => {
      const levelDiff = (a.hierarchyLevel ?? 99) - (b.hierarchyLevel ?? 99);
      return levelDiff !== 0 ? levelDiff : (a.firstName || '').localeCompare(b.firstName || '');
    });
    roots.forEach(sortRecursive);
    return roots;
  };

  const getLevelConfig = (level) => levels.find(l => l.levelOrder === level) || levels[levels.length - 1];

  // Card styles
  const cardStyle = {
    width: '190px',
    padding: '10px 12px',
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxSizing: 'border-box',
    flexShrink: 0
  };

  // Recursive node - uses table layout for perfect alignment
  const TreeNode = ({ user, isLast = false }) => {
    const levelConfig = getLevelConfig(user.hierarchyLevel ?? 4);
    const hasChildren = user.children && user.children.length > 0;
    const dept = user.departmentName || user.department;

    return (
      <tr>
        {/* Card cell */}
        <td style={{ verticalAlign: 'middle', paddingRight: '0' }}>
          <div
            onClick={() => onEditUser && onEditUser(user)}
            style={{
              ...cardStyle,
              borderLeft: `4px solid ${levelConfig.color}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: levelConfig.color,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600',
              flexShrink: 0
            }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '12px', color: t.text }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '10px', color: t.textMuted }}>
                {user.position || levelConfig.name}
              </div>
              {dept && (
                <div style={{ fontSize: '9px', color: t.textDim, marginTop: '1px' }}>
                  {dept}
                </div>
              )}
              {/* Managed departments badges */}
              {user.managedDepartments && user.managedDepartments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
                  {user.managedDepartments.map((md, idx) => (
                    <span key={idx} style={{
                      background: `${t.success}20`,
                      color: t.success,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      fontWeight: '600'
                    }}>
                      Gestiona: {md.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {hasChildren && (
              <div style={{
                backgroundColor: `${t.accent}20`,
                color: t.accent,
                fontSize: '10px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {user.children.length}
              </div>
            )}
          </div>
        </td>

        {/* Connector + Children cell */}
        {hasChildren && (
          <>
            {/* Horizontal line from card */}
            <td style={{ verticalAlign: 'middle', width: '24px' }}>
              <div style={{ width: '24px', height: '2px', backgroundColor: t.border }} />
            </td>

            {/* Vertical line + children */}
            <td style={{ verticalAlign: 'middle', padding: '0' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {user.children.map((child, idx) => (
                    <tr key={child.id}>
                      {/* Vertical connector segment */}
                      <td style={{
                        width: '24px',
                        verticalAlign: 'middle',
                        position: 'relative'
                      }}>
                        {/* Horizontal line to child */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          width: '24px',
                          height: '2px',
                          backgroundColor: t.border
                        }} />
                        {/* Vertical line segment */}
                        {user.children.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: idx === 0 ? '50%' : 0,
                            bottom: idx === user.children.length - 1 ? '50%' : 0,
                            width: '2px',
                            backgroundColor: t.border
                          }} />
                        )}
                        <div style={{ width: '24px', height: '100%', minHeight: '48px' }} />
                      </td>
                      {/* Child subtree */}
                      <td style={{ padding: '4px 0' }}>
                        <table style={{ borderCollapse: 'collapse' }}>
                          <tbody>
                            <TreeNode user={child} isLast={idx === user.children.length - 1} />
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </>
        )}
      </tr>
    );
  };

  const tree = buildTree(users);
  const unassignedUsers = users.filter(u => !u.managerId && (u.hierarchyLevel ?? 99) > 1);

  if (tree.length === 0 && unassignedUsers.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, backgroundColor: t.bg, borderRadius: '8px' }}>
        <p style={{ margin: 0 }}>No hay usuarios con jerarquía definida</p>
        <p style={{ fontSize: '13px', margin: '8px 0 0' }}>Ve a "Gestión Personal" para configurar</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px',
        padding: '10px 14px',
        backgroundColor: t.bg,
        borderRadius: '8px',
        border: `1px solid ${t.border}`,
        flexWrap: 'wrap'
      }}>
        {levels.map(level => (
          <div key={level.levelOrder} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: level.color, borderRadius: '3px' }} />
            <span style={{ fontSize: '12px', color: t.textMuted }}>{level.name}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: t.textMuted }}>
          Click en tarjeta para editar
        </span>
      </div>

      {/* Chart */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '600px',
        padding: '20px',
        backgroundColor: t.bg,
        borderRadius: '10px',
        border: `1px solid ${t.border}`
      }}>
        {tree.map(root => (
          <table key={root.id} style={{ borderCollapse: 'collapse', marginBottom: '16px' }}>
            <tbody>
              <TreeNode user={root} />
            </tbody>
          </table>
        ))}
      </div>

      {/* Unassigned */}
      {unassignedUsers.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '14px',
          backgroundColor: `${t.warning}15`,
          borderRadius: '8px',
          border: '1px solid ${t.warning}60'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: t.warning, marginBottom: '10px' }}>
             Sin jefe asignado ({unassignedUsers.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unassignedUsers.map(user => {
              const levelConfig = getLevelConfig(user.hierarchyLevel);
              return (
                <div
                  key={user.id}
                  onClick={() => onEditUser && onEditUser(user)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: t.bgCard,
                    borderLeft: `3px solid ${levelConfig.color}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{user.firstName} {user.lastName}</span>
                  <span style={{ color: t.textMuted, marginLeft: '6px' }}>({levelConfig.name})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ObjectivesTreeView Component - Cascading objectives visualization
// ============================================================================
const ObjectivesTreeView = ({ tree, onEdit, onDelete, onRefresh }) => {
  const { theme: t } = useTheme();
  const getLevelLabel = (level) => {
    const labels = { 0: 'Dirección', 1: 'Gerencia', 2: 'Supervisión', 3: 'Staff' };
    return labels[level] || 'Staff';
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': { bg: `${t.success}15`, text: t.success },
      'completed': { bg: `${t.accent}15`, text: t.primary },
      'draft': { bg: t.bg, text: t.textMuted },
      'cancelled': { bg: `${t.error}15`, text: t.error }
    };
    return colors[status] || colors['draft'];
  };

  const getProgressColor = (progress) => {
    if (progress >= 90) return t.success;
    if (progress >= 70) return t.accent;
    if (progress >= 50) return t.warning;
    return t.error;
  };

  const renderObjective = (obj, level = 0) => {
    const statusColor = getStatusColor(obj.status);
    const hasChildren = obj.children && obj.children.length > 0;

    return (
      <div key={obj.id} style={{ marginLeft: level * 24 + 'px' }}>
        <div style={{
          padding: '16px',
          marginBottom: '12px',
          backgroundColor: t.bgCard,
          borderRadius: '8px',
          border: `1px solid ${t.border}`,
          borderLeft: `4px solid ${obj.kpiColor || t.textMuted}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>{obj.kpiIcon || ''}</span>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: obj.kpiColor || t.textMuted,
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {obj.code}
                </span>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: statusColor.bg,
                  color: statusColor.text,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {obj.status}
                </span>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: `${t.accent}20`,
                  color: t.accent,
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  {getLevelLabel(obj.ownerLevel)}
                </span>
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: t.text }}>
                {obj.name}
              </h4>
              {obj.ownerName && (
                <p style={{ margin: 0, fontSize: '12px', color: t.textMuted }}>
                   {obj.ownerName}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onEdit(obj)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: t.bgPanel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: t.text
                }}
              >
                 Editar
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(obj)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: `${t.error}10`,
                    border: '1px solid ${t.error}40',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: t.error
                  }}
                >
                   Eliminar
                </button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: t.textMuted }}>
                Meta: {obj.targetValue} {obj.targetUnit}
              </span>
              <span style={{ fontWeight: '600', color: getProgressColor(obj.progressPercent) }}>
                {obj.progressPercent.toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '8px',
              backgroundColor: t.bgPanel,
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, obj.progressPercent)}%`,
                height: '100%',
                backgroundColor: getProgressColor(obj.progressPercent),
                transition: 'width 0.3s'
              }} />
            </div>
          </div>

          {/* Contribution indicator for children */}
          {level > 0 && obj.contributionPercent && (
            <div style={{
              fontSize: '11px',
              color: t.textMuted,
              backgroundColor: t.bg,
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Contribuye {obj.contributionPercent}% al objetivo padre
            </div>
          )}

          {/* Children count */}
          {hasChildren && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: t.textMuted
            }}>
               {obj.children.length} objetivo(s) vinculado(s)
            </div>
          )}
        </div>

        {/* Render children */}
        {hasChildren && (
          <div style={{ borderLeft: `2px solid ${t.border}`, marginLeft: '16px', paddingLeft: '8px' }}>
            {obj.children.map(child => renderObjective(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {tree.map(obj => renderObjective(obj, 0))}
    </div>
  );
};

// ============================================================================
// ObjectiveFormModal Component - Create/Edit objectives
// ============================================================================
const ObjectiveFormModal = ({ objective, objectives, users, kpis, fiscalYear, onClose, onSave }) => {
  const { theme: t } = useTheme();
  const [formData, setFormData] = useState({
    code: objective?.code || 'Q',
    name: objective?.name || '',
    description: objective?.description || '',
    targetValue: objective?.targetValue || '',
    targetUnit: objective?.targetUnit || '%',
    baselineValue: objective?.baselineValue || 0,
    ownerId: objective?.ownerId || '',
    ownerLevel: objective?.ownerLevel ?? 0,
    department: objective?.department || '',
    parentObjectiveId: objective?.parentObjectiveId || '',
    contributionPercent: objective?.contributionPercent || 100,
    status: objective?.status || 'active',
    notes: objective?.notes || ''
  });

  const ownerLevels = [
    { value: 0, label: 'Dirección' },
    { value: 1, label: 'Gerencia' },
    { value: 2, label: 'Supervisión' },
    { value: 3, label: 'Staff' }
  ];

  const targetUnits = ['%', 'PPM', 'count', 'hours', '$', 'days'];

  const modalStyles = {
    overlay: {
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
    modal: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${t.border}`
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: t.text
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: t.textMuted
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '4px',
      fontSize: '13px',
      fontWeight: '500',
      color: t.text
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text,
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      minHeight: '80px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    row3: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '16px'
    },
    actions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: `1px solid ${t.border}`
    },
    btnCancel: {
      padding: '10px 20px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      backgroundColor: t.bgCard,
      color: t.text,
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    btnSave: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: t.accent,
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    }
  };

  // Track if fields were inherited from parent
  const [inheritedFromParent, setInheritedFromParent] = useState(false);

  // Auto-fill fields when selecting parent objective
  const handleParentChange = (e) => {
    const parentId = e.target.value ? parseInt(e.target.value) : '';
    if (parentId) {
      const parent = objectives.find(o => o.id === parentId);
      if (parent) {
        setFormData({
          ...formData,
          parentObjectiveId: parentId,
          code: parent.code || formData.code,
          name: parent.name ? `${parent.name} - ` : formData.name,
          description: parent.description || formData.description,
          targetValue: parent.targetValue ?? formData.targetValue,
          targetUnit: parent.targetUnit || formData.targetUnit,
          baselineValue: parent.baselineValue ?? formData.baselineValue,
          department: parent.department || formData.department,
          notes: parent.notes || formData.notes,
          ownerLevel: (parent.ownerLevel ?? -1) + 1, // Child is one level below parent
          contributionPercent: 100
        });
        setInheritedFromParent(true);
        return;
      }
    }
    setFormData({ ...formData, parentObjectiveId: parentId });
    setInheritedFromParent(false);
  };

  // Auto-fill department and ownerLevel when selecting owner
  const handleOwnerChange = (e) => {
    const userId = e.target.value ? parseInt(e.target.value) : '';
    if (userId) {
      const selectedUser = users.find(u => u.id === userId);
      if (selectedUser) {
        setFormData({
          ...formData,
          ownerId: userId,
          department: selectedUser.department || formData.department,
          ownerLevel: selectedUser.hierarchyLevel ?? formData.ownerLevel
        });
        return;
      }
    }
    setFormData({ ...formData, ownerId: userId });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      alert('Nombre y código son requeridos');
      return;
    }
    onSave(formData);
  };

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>
            {objective ? 'Editar Objetivo' : 'Nuevo Objetivo'} - {fiscalYear}
          </h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Parent Objective - FIRST for inheritance */}
          <div style={{
            padding: '16px',
            marginBottom: '16px',
            backgroundColor: inheritedFromParent ? `${t.success}10` : t.bg,
            borderRadius: '8px',
            border: inheritedFromParent ? '2px solid ${t.success}60' : `1px solid ${t.border}`
          }}>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>
                   Objetivo Padre (Cascadeo)
                  {inheritedFromParent && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: t.success, fontWeight: 'normal' }}>
                       Campos heredados del padre
                    </span>
                  )}
                </label>
                <select
                  style={{
                    ...modalStyles.select,
                    border: `1px solid ${inheritedFromParent ? `${t.success}60` : t.border}`
                  }}
                  value={formData.parentObjectiveId}
                  onChange={handleParentChange}
                >
                  <option value="">-- Sin padre (objetivo independiente) --</option>
                  {objectives.filter(o => o.id !== objective?.id).map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} - {p.owner?.name || p.ownerName || 'Sin dueño'}
                    </option>
                  ))}
                </select>
              </div>
              {formData.parentObjectiveId && (
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>% Contribución al Padre</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    style={modalStyles.input}
                    value={formData.contributionPercent}
                    onChange={(e) => setFormData({ ...formData, contributionPercent: e.target.value })}
                  />
                </div>
              )}
            </div>
            {inheritedFromParent && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: t.success }}>
                 Los campos fueron pre-llenados del objetivo padre. Puedes editarlos según necesites.
              </p>
            )}
          </div>

          {/* KPI Category and Level */}
          <div style={modalStyles.row}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Categoría QCTSP</label>
              <select
                style={modalStyles.select}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              >
                {kpis.map(kpi => (
                  <option key={kpi.code} value={kpi.code}>
                    {kpi.icon} {kpi.code} - {kpi.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Nivel Organizacional</label>
              <select
                style={modalStyles.select}
                value={formData.ownerLevel}
                onChange={(e) => setFormData({
                  ...formData,
                  ownerLevel: parseInt(e.target.value)
                })}
              >
                {ownerLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Nombre del Objetivo *</label>
            <input
              style={modalStyles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Reducir PPM de cliente en 20%"
              required
            />
          </div>

          {/* Description */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Descripción</label>
            <textarea
              style={modalStyles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalle del objetivo..."
            />
          </div>

          {/* Target */}
          <div style={modalStyles.row3}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Valor Meta</label>
              <input
                type="number"
                step="0.01"
                style={modalStyles.input}
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                placeholder="Ej: 500"
              />
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Unidad</label>
              <select
                style={modalStyles.select}
                value={formData.targetUnit}
                onChange={(e) => setFormData({ ...formData, targetUnit: e.target.value })}
              >
                {targetUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Valor Base (Actual)</label>
              <input
                type="number"
                step="0.01"
                style={modalStyles.input}
                value={formData.baselineValue}
                onChange={(e) => setFormData({ ...formData, baselineValue: e.target.value })}
                placeholder="Ej: 800"
              />
            </div>
          </div>

          {/* Owner and Department */}
          <div style={modalStyles.row}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Responsable</label>
              <select
                style={modalStyles.select}
                value={formData.ownerId}
                onChange={handleOwnerChange}
              >
                <option value="">-- Seleccionar --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.position || 'Sin puesto'})
                  </option>
                ))}
              </select>
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Departamento</label>
              <input
                style={modalStyles.input}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ej: Quality, Operations"
              />
            </div>
          </div>

          {/* Status */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Estado</label>
            <select
              style={modalStyles.select}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Notes */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notas</label>
            <textarea
              style={modalStyles.textarea}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>

          <div style={modalStyles.actions}>
            <button type="button" style={modalStyles.btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" style={modalStyles.btnSave}>
              {objective ? 'Guardar Cambios' : 'Crear Objetivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// FeedbackFormModal Component - Quarterly performance review form
// ============================================================================
const FeedbackFormModal = ({ feedback, users, fiscalYear, fiscalQuarter, onClose, onSave, onSign }) => {
  const { theme: t } = useTheme();
  const isNew = !feedback;
  const isEditable = !feedback || feedback.status === 'draft' || feedback.status === 'in_review';

  const [formData, setFormData] = useState({
    employeeId: feedback?.employeeId || '',
    employeeLevel: feedback?.employeeLevel || 3,
    // Factors
    activitiesPlanned: feedback?.activitiesPlanned || 0,
    activitiesCompleted: feedback?.activitiesCompleted || 0,
    activitiesUnplanned: feedback?.activitiesUnplanned || 0,
    hoursAvailable: feedback?.hoursAvailable || 0,
    hoursPlanned: feedback?.hoursPlanned || 0,
    hoursActual: feedback?.hoursActual || 0,
    completionRate: feedback?.completionRate || 0,
    // Results
    kpiScores: feedback?.kpiScores || { Q: 0, C: 0, T: 0, S: 0, P: 0 },
    overallScore: feedback?.overallScore || 0,
    // Feedback
    strengths: feedback?.strengths || '',
    areasOfImprovement: feedback?.areasOfImprovement || '',
    comments: feedback?.comments || '',
    recognitions: feedback?.recognitions || '',
    // Commitments
    trainingNeeds: feedback?.trainingNeeds || '',
    kpiAdjustments: feedback?.kpiAdjustments || '',
    status: feedback?.status || 'draft'
  });

  const modalStyles = {
    overlay: {
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
    modal: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '700px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${t.border}`
    },
    section: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: t.bg,
      borderRadius: '8px'
    },
    sectionTitle: {
      margin: '0 0 12px 0',
      fontSize: '14px',
      fontWeight: '600',
      color: t.text
    },
    formGroup: {
      marginBottom: '12px'
    },
    label: {
      display: 'block',
      marginBottom: '4px',
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted
    },
    input: {
      width: '100%',
      padding: '8px 10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '8px 10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      minHeight: '60px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '8px 10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text,
      boxSizing: 'border-box'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px'
    },
    row3: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px'
    },
    kpiRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '8px'
    }
  };

  const handleKpiChange = (code, value) => {
    const newScores = { ...formData.kpiScores, [code]: parseFloat(value) || 0 };
    const avg = Object.values(newScores).reduce((a, b) => a + b, 0) / 5;
    setFormData({ ...formData, kpiScores: newScores, overallScore: avg });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNew && !formData.employeeId) {
      alert('Selecciona un empleado');
      return;
    }
    onSave({
      ...formData,
      fiscalYear,
      fiscalQuarter
    });
  };

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {isNew ? 'Nueva Evaluación' : 'Evaluación de Desempeño'} - Q{fiscalQuarter} {fiscalYear}
          </h3>
          <button
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee Selection (only for new) */}
          {isNew && (
            <div style={modalStyles.section}>
              <h4 style={modalStyles.sectionTitle}> Empleado a Evaluar</h4>
              <div style={modalStyles.row}>
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>Empleado *</label>
                  <select
                    style={modalStyles.select}
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.position || 'Sin puesto'})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={modalStyles.formGroup}>
                  <label style={modalStyles.label}>Nivel</label>
                  <select
                    style={modalStyles.select}
                    value={formData.employeeLevel}
                    onChange={(e) => setFormData({ ...formData, employeeLevel: parseInt(e.target.value) })}
                  >
                    <option value={0}>Dirección</option>
                    <option value={1}>Gerencia</option>
                    <option value={2}>Supervisión</option>
                    <option value={3}>Staff</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Employee info for existing */}
          {!isNew && feedback?.employee && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <strong>{feedback.employee.name}</strong>
              <span style={{ color: t.textMuted, marginLeft: '12px' }}>
                {feedback.employee.position} - {feedback.employee.department}
              </span>
            </div>
          )}

          {/* FACTORES Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}> Factores (Inputs del Trimestre)</h4>
            <div style={modalStyles.row3}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Actividades Planeadas</label>
                <input
                  type="number"
                  style={modalStyles.input}
                  value={formData.activitiesPlanned}
                  onChange={(e) => setFormData({ ...formData, activitiesPlanned: parseInt(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Actividades Completadas</label>
                <input
                  type="number"
                  style={modalStyles.input}
                  value={formData.activitiesCompleted}
                  onChange={(e) => setFormData({ ...formData, activitiesCompleted: parseInt(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Actividades No Planeadas</label>
                <input
                  type="number"
                  style={modalStyles.input}
                  value={formData.activitiesUnplanned}
                  onChange={(e) => setFormData({ ...formData, activitiesUnplanned: parseInt(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
            </div>
            <div style={modalStyles.row3}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Horas Disponibles</label>
                <input
                  type="number"
                  step="0.5"
                  style={modalStyles.input}
                  value={formData.hoursAvailable}
                  onChange={(e) => setFormData({ ...formData, hoursAvailable: parseFloat(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Horas Planeadas</label>
                <input
                  type="number"
                  step="0.5"
                  style={modalStyles.input}
                  value={formData.hoursPlanned}
                  onChange={(e) => setFormData({ ...formData, hoursPlanned: parseFloat(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Horas Reales</label>
                <input
                  type="number"
                  step="0.5"
                  style={modalStyles.input}
                  value={formData.hoursActual}
                  onChange={(e) => setFormData({ ...formData, hoursActual: parseFloat(e.target.value) || 0 })}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* RESULTADOS Section - KPI Scores */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}> Resultados (KPIs del Trimestre)</h4>
            <div style={modalStyles.kpiRow}>
              {['Q', 'C', 'T', 'S', 'P'].map(code => (
                <div key={code} style={modalStyles.formGroup}>
                  <label style={{ ...modalStyles.label, textAlign: 'center' }}>
                    {code === 'Q' ? ' Quality' :
                     code === 'C' ? ' Cost' :
                     code === 'T' ? ' Time' :
                     code === 'S' ? ' Safety' : ' People'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    style={{ ...modalStyles.input, textAlign: 'center' }}
                    value={formData.kpiScores[code] || 0}
                    onChange={(e) => handleKpiChange(code, e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: t.textMuted }}>Puntuación General: </span>
              <span style={{
                fontSize: '24px',
                fontWeight: '600',
                color: formData.overallScore >= 80 ? t.success :
                       formData.overallScore >= 60 ? t.warning : t.error
              }}>
                {formData.overallScore.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* FEEDBACK Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}> Feedback Cualitativo</h4>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Fortalezas</label>
                <textarea
                  style={modalStyles.textarea}
                  value={formData.strengths}
                  onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                  placeholder="¿Qué hizo bien el empleado?"
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Áreas de Mejora</label>
                <textarea
                  style={modalStyles.textarea}
                  value={formData.areasOfImprovement}
                  onChange={(e) => setFormData({ ...formData, areasOfImprovement: e.target.value })}
                  placeholder="¿Qué puede mejorar?"
                  disabled={!isEditable}
                />
              </div>
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Comentarios Generales</label>
              <textarea
                style={modalStyles.textarea}
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Comentarios adicionales..."
                disabled={!isEditable}
              />
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Reconocimientos</label>
              <textarea
                style={modalStyles.textarea}
                value={formData.recognitions}
                onChange={(e) => setFormData({ ...formData, recognitions: e.target.value })}
                placeholder="Logros especiales a reconocer..."
                disabled={!isEditable}
              />
            </div>
          </div>

          {/* COMPROMISOS Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}> Compromisos para Próximo Trimestre</h4>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Necesidades de Capacitación</label>
                <textarea
                  style={modalStyles.textarea}
                  value={formData.trainingNeeds}
                  onChange={(e) => setFormData({ ...formData, trainingNeeds: e.target.value })}
                  placeholder="Cursos, entrenamientos..."
                  disabled={!isEditable}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Ajustes a KPIs</label>
                <textarea
                  style={modalStyles.textarea}
                  value={formData.kpiAdjustments}
                  onChange={(e) => setFormData({ ...formData, kpiAdjustments: e.target.value })}
                  placeholder="Cambios en metas..."
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* Signatures */}
          {!isNew && (
            <div style={{ ...modalStyles.section, backgroundColor: `${t.success}10` }}>
              <h4 style={modalStyles.sectionTitle}> Firmas</h4>
              <div style={modalStyles.row}>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '8px' }}>Empleado</div>
                  {feedback?.employeeSignature ? (
                    <div style={{ color: t.success, fontWeight: '600' }}>
                       Firmado {feedback.employeeSignedAt ? new Date(feedback.employeeSignedAt).toLocaleDateString() : ''}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSign('employee')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: t.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Firmar como Empleado
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '8px' }}>Evaluador</div>
                  {feedback?.reviewerSignature ? (
                    <div style={{ color: t.success, fontWeight: '600' }}>
                       Firmado {feedback.reviewerSignedAt ? new Date(feedback.reviewerSignedAt).toLocaleDateString() : ''}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSign('reviewer')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: t.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Firmar como Evaluador
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: `1px solid ${t.border}`
          }}>
            <div>
              {isEditable && !isNew && (
                <select
                  style={{ ...modalStyles.select, width: '150px' }}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="draft">Borrador</option>
                  <option value="in_review">En Revisión</option>
                  <option value="pending_signature">Pendiente Firma</option>
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
              {isEditable && (
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: t.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {isNew ? 'Iniciar Evaluación' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// ActivityFormModal Component - Enhanced activity form with all new fields
// ============================================================================
const ActivityFormModal = ({
  activity, users, kpis, projects, objectives, deliverableTypes,
  subordinates, onClose, onSave, onFetchObjectivesByKpi, defaultAssignedTo
}) => {
  const { theme: t } = useTheme();
  const isNew = !activity;
  const [selectedKpiCode, setSelectedKpiCode] = useState(activity?.kpi_code || '');

  // Helper to format date to YYYY-MM-DD
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Otherwise parse and format
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    title: activity?.title || '',
    description: activity?.description || '',
    activity_type: activity?.activity_type || 'assigned',
    kpi_id: activity?.kpi_id?.toString() || '',
    project_id: activity?.project_id?.toString() || '',
    objective_id: activity?.objective_id?.toString() || '',
    assigned_to: activity?.assigned_to?.toString() || defaultAssignedTo?.toString() || '',
    start_date: formatDateForInput(activity?.start_date),
    end_date: formatDateForInput(activity?.end_date),
    estimated_hours: activity?.estimated_hours || '',
    actual_hours: activity?.actual_hours || '',
    priority: activity?.priority || 'medium',
    // New fields
    deliverable_type: activity?.deliverable_type || '',
    moscow_priority: activity?.moscow_priority || '',
    weight_percent: activity?.weight_percent || 0,
    requires_evidence: activity?.requires_evidence || false,
    // Recurring
    is_recurring: activity?.is_recurring || false,
    frequency: activity?.frequency || '',
    recurring_duration: activity?.recurring_duration || '',
    recurring_days: (() => {
      // Extraer recurring_days de frequency_details
      let details = activity?.frequency_details || {};
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (e) { details = {}; }
      }
      return details.recurring_days || [];
    })()
  });

  const handleKpiChange = (kpiId) => {
    const kpi = kpis.find(k => k.id === parseInt(kpiId));
    setSelectedKpiCode(kpi?.code || '');
    setFormData({ ...formData, kpi_id: kpiId, objective_id: '' });
    if (kpi?.code && onFetchObjectivesByKpi) {
      onFetchObjectivesByKpi(kpi.code);
    }
  };

  const moscowOptions = [
    { value: '', label: 'Sin prioridad MoSCoW' },
    { value: 'must', label: 'Must - Obligatorio, critico' },
    { value: 'should', label: 'Should - Importante, deberia hacerse' },
    { value: 'could', label: 'Could - Deseable si hay tiempo' },
    { value: 'wont', label: 'Won\'t - No se hara este periodo' }
  ];

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' }
  ];

  // Días de la semana (0=Domingo en JavaScript, pero mostramos L-D)
  const weekDays = [
    { value: 1, label: 'L', fullLabel: 'Lunes' },
    { value: 2, label: 'M', fullLabel: 'Martes' },
    { value: 3, label: 'X', fullLabel: 'Miércoles' },
    { value: 4, label: 'J', fullLabel: 'Jueves' },
    { value: 5, label: 'V', fullLabel: 'Viernes' },
    { value: 6, label: 'S', fullLabel: 'Sábado' },
    { value: 0, label: 'D', fullLabel: 'Domingo' }
  ];

  const toggleDay = (dayValue) => {
    const currentDays = formData.recurring_days || [];
    if (currentDays.includes(dayValue)) {
      setFormData({ ...formData, recurring_days: currentDays.filter(d => d !== dayValue) });
    } else {
      setFormData({ ...formData, recurring_days: [...currentDays, dayValue] });
    }
  };

  const durationOptions = [
    { value: '3_months', label: '3 meses' },
    { value: '6_months', label: '6 meses' },
    { value: '1_year', label: '1 ano' },
    { value: '2_years', label: '2 anos' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date) {
      alert('Titulo y fecha de inicio son requeridos');
      return;
    }
    if (formData.is_recurring) {
      if (!formData.frequency || !formData.recurring_duration) {
        alert('Para actividades recurrentes, selecciona frecuencia y duración');
        return;
      }
      if (!formData.recurring_days || formData.recurring_days.length === 0) {
        alert('Selecciona al menos un día de la semana para la actividad recurrente');
        return;
      }
    }
    onSave(formData);
  };

  const modalStyles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modal: {
      backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
      width: '700px', maxHeight: '90vh', overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${t.border}`
    },
    section: {
      marginBottom: '20px', padding: '16px', backgroundColor: t.bg,
      borderRadius: '8px', border: `1px solid ${t.border}`
    },
    sectionTitle: {
      margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.text
    },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
    formGroup: { marginBottom: '12px' },
    label: {
      display: 'block', marginBottom: '4px', fontSize: '13px',
      fontWeight: '500', color: t.text
    },
    input: {
      width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
      borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
      backgroundColor: t.bgCard, color: t.text
    },
    select: {
      width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
      borderRadius: '8px', fontSize: '14px', backgroundColor: t.bgCard,
      color: t.text, boxSizing: 'border-box'
    },
    textarea: {
      width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
      borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
      minHeight: '60px', resize: 'vertical',
      backgroundColor: t.bgCard, color: t.text
    },
    checkbox: { marginRight: '8px' }
  };

  // Build assignee options: self + subordinates (indented)
  const assigneeOptions = [];
  if (subordinates?.self) {
    assigneeOptions.push({
      id: subordinates.self.id,
      name: `${subordinates.self.name} (Yo)`,
      depth: 0
    });
  }
  if (subordinates?.subordinates) {
    subordinates.subordinates.forEach(sub => {
      assigneeOptions.push({
        id: sub.id,
        name: `${'  '.repeat(sub.depth)}${sub.name} (${sub.position || 'Staff'})`,
        depth: sub.depth
      });
    });
  }

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>
            {isNew ? 'Nueva Actividad' : 'Editar Actividad'}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted
          }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>Informacion Basica</h4>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Titulo *</label>
              <input
                style={modalStyles.input}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nombre de la actividad"
                required
              />
            </div>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Tipo de Entregable</label>
                <select
                  style={modalStyles.select}
                  value={formData.deliverable_type}
                  onChange={(e) => setFormData({ ...formData, deliverable_type: e.target.value })}
                >
                  <option value="">Sin especificar</option>
                  {deliverableTypes.map(dt => (
                    <option key={dt.code} value={dt.code}>{dt.icon} {dt.name}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Prioridad MoSCoW</label>
                <select
                  style={modalStyles.select}
                  value={formData.moscow_priority}
                  onChange={(e) => setFormData({ ...formData, moscow_priority: e.target.value })}
                >
                  {moscowOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Descripcion</label>
              <textarea
                style={modalStyles.textarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripcion de la actividad"
              />
            </div>
          </div>

          {/* Assignment Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>Asignacion</h4>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Asignar a</label>
                <select
                  style={modalStyles.select}
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Yo mismo</option>
                  {assigneeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Proyecto</label>
                <select
                  style={modalStyles.select}
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">Sin proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KPI and Objective Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>KPI y Objetivo</h4>
            <div style={modalStyles.row}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>KPI</label>
                <select
                  style={modalStyles.select}
                  value={formData.kpi_id}
                  onChange={(e) => handleKpiChange(e.target.value)}
                >
                  <option value="">Sin KPI</option>
                  {kpis.map(k => (
                    <option key={k.id} value={k.id}>{k.icon} {k.code} - {k.name}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Objetivo (filtrado por KPI)</label>
                <select
                  style={modalStyles.select}
                  value={formData.objective_id}
                  onChange={(e) => setFormData({ ...formData, objective_id: e.target.value })}
                  disabled={!selectedKpiCode}
                >
                  <option value="">Sin objetivo</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name} (Meta: {obj.targetValue} {obj.targetUnit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates and Time Section */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>Fechas y Tiempo</h4>

            {/* Warning for missing estimated hours */}
            {activity?.source_type === '8D' && !formData.estimated_hours && (
              <div style={{
                backgroundColor: `${t.warning}15`,
                border: '1px solid ${t.warning}',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}></span>
                <div>
                  <div style={{ fontWeight: '600', color: t.warning, fontSize: '13px' }}>
                    Horas no estimadas
                  </div>
                  <div style={{ fontSize: '12px', color: t.warning }}>
                    Esta actividad proviene de 8D. Por favor capture las horas estimadas antes de cerrarla.
                  </div>
                </div>
              </div>
            )}

            <div style={modalStyles.row3}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Fecha Inicio *</label>
                <input
                  type="date"
                  style={modalStyles.input}
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Fecha Fin</label>
                <input
                  type="date"
                  style={modalStyles.input}
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Horas Estimadas</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  style={{
                    ...modalStyles.input,
                    border: `1px solid ${activity?.source_type === '8D' && !formData.estimated_hours ? t.warning : t.border}`
                  }}
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div style={modalStyles.row3}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Horas Reales (calculado)</label>
                <div style={{
                  ...modalStyles.input,
                  backgroundColor: t.bgPanel,
                  color: t.textMuted,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {(() => {
                    // Calculate from daily_progress
                    const dailyHours = (activity?.daily_progress || []).reduce((sum, d) => sum + (d.hours || 0), 0);
                    return dailyHours.toFixed(1);
                  })()}h
                  <span style={{ marginLeft: '8px', fontSize: '10px', color: t.textDim }}>
                    (suma de actividades diarias)
                  </span>
                </div>
                {formData.estimated_hours && (
                  <div style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    color: (() => {
                      const dailyHours = (activity?.daily_progress || []).reduce((sum, d) => sum + (d.hours || 0), 0);
                      return dailyHours > parseFloat(formData.estimated_hours) ? t.error : t.success;
                    })()
                  }}>
                    {(() => {
                      const dailyHours = (activity?.daily_progress || []).reduce((sum, d) => sum + (d.hours || 0), 0);
                      const diff = dailyHours - parseFloat(formData.estimated_hours);
                      return diff > 0
                        ? ` +${diff.toFixed(1)}h sobre estimado`
                        : ` ${Math.abs(diff).toFixed(1)}h bajo estimado`;
                    })()}
                  </div>
                )}
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Peso/Impacto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={modalStyles.input}
                  value={formData.weight_percent}
                  onChange={(e) => setFormData({ ...formData, weight_percent: e.target.value })}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={{ ...modalStyles.label, marginTop: '24px' }}>
                  <input
                    type="checkbox"
                    style={modalStyles.checkbox}
                    checked={formData.requires_evidence}
                    onChange={(e) => setFormData({ ...formData, requires_evidence: e.target.checked })}
                  />
                  Requiere evidencia obligatoria
                </label>
              </div>
            </div>
          </div>

          {/* Recurring Section - Show for new activities OR existing recurring activities */}
          {(isNew || formData.is_recurring) && (
            <div style={modalStyles.section}>
              <h4 style={modalStyles.sectionTitle}>
                {isNew ? (
                  <label>
                    <input
                      type="checkbox"
                      style={modalStyles.checkbox}
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    />
                    Actividad Recurrente
                  </label>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     Configuración de Recurrencia
                  </span>
                )}
              </h4>
              {formData.is_recurring && (
                <div>
                  {/* Selector de días de la semana */}
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Días de la semana</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          title={day.fullLabel}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: `2px solid ${(formData.recurring_days || []).includes(day.value) ? t.accent : t.border}`,
                            backgroundColor: (formData.recurring_days || []).includes(day.value) ? t.accent : t.bgCard,
                            color: (formData.recurring_days || []).includes(day.value) ? 'white' : t.text,
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {formData.recurring_days && formData.recurring_days.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: t.textMuted }}>
                        Seleccionados: {formData.recurring_days
                          .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                          .map(d => weekDays.find(wd => wd.value === d)?.fullLabel)
                          .join(', ')}
                      </div>
                    )}
                  </div>

                  <div style={modalStyles.row}>
                    <div style={modalStyles.formGroup}>
                      <label style={modalStyles.label}>Frecuencia</label>
                      <select
                        style={modalStyles.select}
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {frequencyOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={modalStyles.formGroup}>
                      <label style={modalStyles.label}>Duración</label>
                      <select
                        style={modalStyles.select}
                        value={formData.recurring_duration}
                        onChange={(e) => setFormData({ ...formData, recurring_duration: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {durationOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', border: `1px solid ${t.border}`, borderRadius: '8px',
              backgroundColor: t.bgCard, color: t.text, cursor: 'pointer'
            }}>Cancelar</button>
            <button type="submit" style={{
              padding: '10px 20px', border: 'none', borderRadius: '8px',
              backgroundColor: t.success, color: 'white', cursor: 'pointer', fontWeight: '600'
            }}>{isNew ? 'Crear Actividad' : 'Guardar Cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// CoverageFormModal Component - Vacation/Sick leave coverage
// ============================================================================
const CoverageFormModal = ({ coverage, users, activities, onClose, onSave }) => {
  const { theme: t } = useTheme();
  const isNew = !coverage;

  const [formData, setFormData] = useState({
    originalAssigneeId: coverage?.originalAssigneeId || '',
    substituteId: coverage?.substituteId || '',
    activityId: coverage?.activityId || '',
    startDate: coverage?.startDate || new Date().toISOString().split('T')[0],
    endDate: coverage?.endDate || '',
    reason: coverage?.reason || 'vacation',
    reasonNotes: coverage?.reasonNotes || ''
  });

  const reasonOptions = [
    { value: 'vacation', label: 'Vacaciones' },
    { value: 'sick_leave', label: 'Incapacidad medica' },
    { value: 'training', label: 'Capacitacion' },
    { value: 'temporary_assignment', label: 'Asignacion temporal' },
    { value: 'maternity_leave', label: 'Licencia maternidad' },
    { value: 'paternity_leave', label: 'Licencia paternidad' },
    { value: 'other', label: 'Otro' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.originalAssigneeId || !formData.substituteId || !formData.startDate || !formData.endDate) {
      alert('Completa los campos requeridos');
      return;
    }
    if (formData.originalAssigneeId === formData.substituteId) {
      alert('El sustituto debe ser diferente al empleado ausente');
      return;
    }
    onSave(formData);
  };

  const modalStyles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modal: {
      backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
      width: '500px', maxHeight: '90vh', overflowY: 'auto'
    },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: t.text },
    input: {
      width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
      borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
      backgroundColor: t.bgCard, color: t.text
    },
    select: {
      width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
      borderRadius: '8px', fontSize: '14px', backgroundColor: t.bgCard,
      color: t.text, boxSizing: 'border-box'
    },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
  };

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {isNew ? 'Nueva Cobertura' : 'Editar Cobertura'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Empleado Ausente *</label>
            <select
              style={modalStyles.select}
              value={formData.originalAssigneeId}
              onChange={(e) => setFormData({ ...formData, originalAssigneeId: e.target.value })}
              required
            >
              <option value="">Seleccionar empleado...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Sustituto *</label>
            <select
              style={modalStyles.select}
              value={formData.substituteId}
              onChange={(e) => setFormData({ ...formData, substituteId: e.target.value })}
              required
            >
              <option value="">Seleccionar sustituto...</option>
              {users.filter(u => u.id !== parseInt(formData.originalAssigneeId)).map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.row}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Fecha Inicio *</label>
              <input
                type="date"
                style={modalStyles.input}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Fecha Fin *</label>
              <input
                type="date"
                style={modalStyles.input}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Motivo *</label>
            <select
              style={modalStyles.select}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            >
              {reasonOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Actividad Especifica (opcional)</label>
            <select
              style={modalStyles.select}
              value={formData.activityId}
              onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
            >
              <option value="">Todas las actividades</option>
              {activities.filter(a => a.assigned_to === parseInt(formData.originalAssigneeId)).map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notas adicionales</label>
            <textarea
              style={{ ...modalStyles.input, minHeight: '60px' }}
              value={formData.reasonNotes}
              onChange={(e) => setFormData({ ...formData, reasonNotes: e.target.value })}
              placeholder="Informacion adicional..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', border: `1px solid ${t.border}`, borderRadius: '8px',
              backgroundColor: t.bgCard, color: t.text, cursor: 'pointer'
            }}>Cancelar</button>
            <button type="submit" style={{
              padding: '10px 20px', border: 'none', borderRadius: '8px',
              backgroundColor: t.accent, color: 'white', cursor: 'pointer', fontWeight: '600'
            }}>{isNew ? 'Crear Cobertura' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SupervisorFeedbackModal Component - Add feedback to employee/activity
// ============================================================================
const SupervisorFeedbackModal = ({ activity, users, onClose, onSave }) => {
  const { theme: t } = useTheme();
  const [formData, setFormData] = useState({
    activityId: activity?.id || '',
    employeeId: activity?.assigned_to || '',
    feedbackType: 'note',
    title: '',
    comment: '',
    isVisibleToEmployee: true,
    severity: '',
    requiresFollowup: false,
    followupDate: ''
  });

  const feedbackTypes = [
    { value: 'recognition', label: 'Felicitacion', icon: '', color: t.success },
    { value: 'warning', label: 'Llamada de atencion', icon: '', color: t.warning },
    { value: 'coaching', label: 'Retroalimentacion constructiva', icon: '', color: t.accent },
    { value: 'achievement', label: 'Logro destacado', icon: '', color: t.accent },
    { value: 'improvement_needed', label: 'Area de mejora', icon: '', color: t.error },
    { value: 'note', label: 'Nota general', icon: '', color: t.textMuted }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.feedbackType || !formData.comment) {
      alert('Completa los campos requeridos');
      return;
    }
    onSave(formData);
  };

  const selectedType = feedbackTypes.find(t => t.value === formData.feedbackType);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px',
        width: '500px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}>
            Agregar Feedback {activity && `- ${activity.title}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
              Tipo de Feedback *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {feedbackTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, feedbackType: type.value })}
                  style={{
                    padding: '10px',
                    border: formData.feedbackType === type.value ? `2px solid ${type.color}` : `1px solid ${t.border}`,
                    borderRadius: '8px',
                    backgroundColor: formData.feedbackType === type.value ? `${type.color}10` : t.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{type.icon}</span>
                  <span style={{ marginLeft: '8px', fontSize: '13px' }}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!activity && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Empleado *
              </label>
              <select
                style={{
                  width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
                  borderRadius: '8px', fontSize: '14px', backgroundColor: t.bgCard, color: t.text
                }}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
              >
                <option value="">Seleccionar empleado...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
              Titulo (opcional)
            </label>
            <input
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
                borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                backgroundColor: t.bgCard, color: t.text
              }}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titulo breve del feedback"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
              Comentario *
            </label>
            <textarea
              style={{
                width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
                borderRadius: '8px', fontSize: '14px', minHeight: '100px', boxSizing: 'border-box',
                backgroundColor: t.bgCard, color: t.text
              }}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Describe el feedback en detalle..."
              required
            />
          </div>

          {(formData.feedbackType === 'warning' || formData.feedbackType === 'improvement_needed') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Severidad
              </label>
              <select
                style={{
                  width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
                  borderRadius: '8px', fontSize: '14px', backgroundColor: t.bgCard, color: t.text
                }}
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="">Sin especificar</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px', display: 'flex', gap: '20px' }}>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.isVisibleToEmployee}
                onChange={(e) => setFormData({ ...formData, isVisibleToEmployee: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Visible para el empleado
            </label>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.requiresFollowup}
                onChange={(e) => setFormData({ ...formData, requiresFollowup: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Requiere seguimiento
            </label>
          </div>

          {formData.requiresFollowup && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Fecha de seguimiento
              </label>
              <input
                type="date"
                style={{
                  width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`,
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                  backgroundColor: t.bgCard, color: t.text
                }}
                value={formData.followupDate}
                onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', border: `1px solid ${t.border}`, borderRadius: '8px',
              backgroundColor: t.bgCard, color: t.text, cursor: 'pointer'
            }}>Cancelar</button>
            <button type="submit" style={{
              padding: '10px 20px', border: 'none', borderRadius: '8px',
              backgroundColor: selectedType?.color || t.accent, color: 'white',
              cursor: 'pointer', fontWeight: '600'
            }}>Guardar Feedback</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper para calcular días hábiles entre dos fechas
const countBusinessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No sábado ni domingo
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Calcular límite diario para actividades recurrentes
const getDailyProgressLimit = (activity) => {
  if (!activity.is_recurring) return null;
  const businessDays = countBusinessDays(activity.start_date, activity.end_date);
  if (businessDays <= 0) return null;
  return Math.round((100 / businessDays) * 100) / 100; // Redondear a 2 decimales
};

// ============================================================================
// ExportActivitiesModal Component
// ============================================================================
const ExportActivitiesModal = ({ users, onClose }) => {
  const { theme: t } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [selectedUserIds, setSelectedUserIds] = useState(users.map(u => u.id));
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);

  const toggleUser = (id) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedUserIds(users.map(u => u.id));
  const clearAll = () => setSelectedUserIds([]);

  const statusLabel = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completado', cancelled: 'Cancelado', blocked: 'Bloqueado' };
  const typeLabel = { planned: 'Planeada', assigned: 'Asignada', unplanned: 'No Planeada', recurring: 'Recurrente' };
  const priorityLabel = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };

  const handleExport = async () => {
    if (selectedUserIds.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        user_ids: selectedUserIds.join(','),
        start_date: startDate,
        end_date: endDate
      });
      const response = await fetch(`http://localhost:5000/workload/activities/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      const XLSX = await import('xlsx');
      const rows = data.activities.map(a => ({
        'Persona': a.assigned_to_name || '',
        'Puesto': a.position || '',
        'Departamento': a.department || '',
        'Actividad': a.title || '',
        'Descripción': a.description || '',
        'Tipo': typeLabel[a.activity_type] || a.activity_type || '',
        'KPI': a.kpi_name || '',
        'Proyecto': a.project_name || '',
        'Cliente': a.project_client || '',
        'Prioridad': priorityLabel[a.priority] || a.priority || '',
        'Estado': statusLabel[a.status] || a.status || '',
        'Fecha Inicio': a.start_date ? new Date(a.start_date).toLocaleDateString('es-MX') : '',
        'Fecha Fin': a.end_date ? new Date(a.end_date).toLocaleDateString('es-MX') : '',
        'Horas Estimadas': parseFloat(a.estimated_hours) || 0,
        'Horas Reales': parseFloat(a.actual_hours) || 0,
        '% Avance': a.progress || 0,
        'Diferencia Horas': parseFloat(a.hours_diff) || 0,
        'Asignado Por': a.assigned_by_name || '',
        'Fecha Creación': a.created_at ? new Date(a.created_at).toLocaleDateString('es-MX') : ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      // Column widths
      ws['!cols'] = [
        {wch:20},{wch:20},{wch:18},{wch:35},{wch:40},{wch:14},{wch:10},
        {wch:20},{wch:16},{wch:12},{wch:14},{wch:14},{wch:14},
        {wch:16},{wch:14},{wch:10},{wch:16},{wch:20},{wch:16}
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
      const fileName = `Actividades_${startDate}_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      onClose();
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: t.bg, borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: t.text }}> Exportar Actividades</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: t.textMuted }}>×</button>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Fecha inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${t.border || t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, display: 'block', marginBottom: '4px' }}>Fecha fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${t.border || t.border}`, backgroundColor: t.bgPanel, color: t.text, fontSize: '13px' }} />
          </div>
        </div>

        {/* User selector */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted }}>Personas ({selectedUserIds.length}/{users.length})</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={selectAll} style={{ fontSize: '11px', color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Todos</button>
              <button onClick={clearAll} style={{ fontSize: '11px', color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Ninguno</button>
            </div>
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto', border: `1px solid ${t.border || t.border}`, borderRadius: '8px', padding: '8px' }}>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: selectedUserIds.includes(u.id) ? `${t.accent}10` : 'transparent' }}>
                <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} style={{ accentColor: t.accent }} />
                <span style={{ fontSize: '13px', color: t.text, fontWeight: selectedUserIds.includes(u.id) ? '600' : '400' }}>
                  {u.firstName} {u.lastName}
                </span>
                <span style={{ fontSize: '11px', color: t.textMuted }}>{u.position}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${t.border || t.border}`, backgroundColor: 'transparent', color: t.text, cursor: 'pointer', fontSize: '14px' }}>
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={loading || selectedUserIds.length === 0}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: selectedUserIds.length === 0 ? t.border : t.success, color: 'white', cursor: selectedUserIds.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            {loading ? ' Generando...' : ` Exportar Excel (${selectedUserIds.length} personas)`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main WorkloadManager Component
// ============================================================================
const WorkloadManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Helper to update URL params without losing other params
  const updateUrlParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value !== null && value !== undefined && value !== '') {
        newParams.set(key, value.toString());
      } else {
        newParams.delete(key);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // State with URL persistence
  const [activeTab, setActiveTabState] = useState(() => {
    return searchParams.get('tab') || localStorage.getItem('workload_active_tab') || 'dashboard';
  });
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('workload_active_tab', tab);
    updateUrlParam('tab', tab);
  };

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [recurring, setRecurring] = useState([]);

  const [selectedUser, setSelectedUserState] = useState(null);
  const setSelectedUser = useCallback((userId) => {
    setSelectedUserState(userId);
    updateUrlParam('user', userId);
  }, [updateUrlParam]);

  const [weeklySummary, setWeeklySummary] = useState(null);
  const [teamSummary, setTeamSummary] = useState([]);

  const [teamSubTab, setTeamSubTabState] = useState(() => {
    return searchParams.get('subtab') || 'workload';
  });

  // Member being viewed in "Mis Actividades" (null = current user)
  const [viewingMemberId, setViewingMemberId] = useState(null);

  // Workload view mode: weekly or daily
  const [workloadViewMode, setWorkloadViewMode] = useState('weekly');
  const setTeamSubTab = (subtab) => {
    setTeamSubTabState(subtab);
    updateUrlParam('subtab', subtab);
  };

  const [editingUser, setEditingUser] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [objectivesTree, setObjectivesTree] = useState([]);

  const [selectedFiscalYear, setSelectedFiscalYearState] = useState(() => {
    const urlYear = searchParams.get('year');
    return urlYear ? parseInt(urlYear) : new Date().getFullYear();
  });
  const setSelectedFiscalYear = (year) => {
    setSelectedFiscalYearState(year);
    updateUrlParam('year', year);
  };

  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);

  const [selectedQuarter, setSelectedQuarterState] = useState(() => {
    const urlQuarter = searchParams.get('quarter');
    if (urlQuarter) return parseInt(urlQuarter);
    const month = new Date().getMonth() + 1;
    return Math.ceil(month / 3);
  });
  const setSelectedQuarter = (quarter) => {
    setSelectedQuarterState(quarter);
    updateUrlParam('quarter', quarter);
  };
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [hierarchyLevels, setHierarchyLevels] = useState([]);
  const [, setDepartments] = useState([]);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  // Project form states
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [systemClients, setSystemClients] = useState([]);
  const [projectClientMode, setProjectClientMode] = useState('select'); // 'select' or 'custom'
  const [selectedProjectClientId, setSelectedProjectClientId] = useState(null);
  const [clientProjectsList, setClientProjectsList] = useState([]);
  const [projectNameMode, setProjectNameMode] = useState('select'); // 'select' or 'custom'
  // New states for activity enhancements
  const [subordinates, setSubordinates] = useState({ self: null, subordinates: [] });
  const [coverageList, setCoverageList] = useState([]);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState(null);
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [objectivesByKpi, setObjectivesByKpi] = useState([]);
  const [, setSupervisorFeedbackLog] = useState([]);
  const [showSupervisorFeedbackModal, setShowSupervisorFeedbackModal] = useState(false);
  const [selectedActivityForFeedback, setSelectedActivityForFeedback] = useState(null);
  const [activityFeedbackMap, setActivityFeedbackMap] = useState({}); // Map of activityId -> feedback[]
  const [allSupervisorFeedback, setAllSupervisorFeedback] = useState([]); // All feedback for log view
  const [feedbackPersonFilter, setFeedbackPersonFilter] = useState(''); // Filter feedback by person
  const [activeCoverages, setActiveCoverages] = useState({ coveringForMe: [], iAmCovering: [] });
  const [uploadingEvidence, setUploadingEvidence] = useState(null); // activityId currently uploading
  // Activity Log states (like ECR-3)
  const [dailyEntries, setDailyEntries] = useState({}); // { activityId: { date, progress, activities } }
  const [expandedActivityLog, setExpandedActivityLog] = useState({}); // { activityId: boolean } - show add form
  const [collapsedHistory, setCollapsedHistory] = useState(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('workload_collapsed_history');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  }); // { activityId: boolean } - collapse history with persistence
  // Activity filters (multi-select) with persistence
  const [activityFilters, setActivityFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('workload_activity_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          kpis: parsed.kpis || [],
          projects: parsed.projects || [],
          users: parsed.users || [],
          statuses: parsed.statuses || [],
          types: parsed.types || [],
          priorities: parsed.priorities || []
        };
      }
    } catch {}
    return { kpis: [], projects: [], users: [], statuses: [], types: [], priorities: [] };
  });

  // Filter options for types and priorities
  const ACTIVITY_TYPES = [
    { id: 'planned', label: 'Planeada', color: '#3b82f6' },
    { id: 'recurring', label: 'Recurrente', color: '#8b5cf6' },
    { id: 'assigned', label: 'Asignada', color: '#f59e0b' },
    { id: 'unplanned', label: 'No planeada', color: '#ef4444' }
  ];

  const PRIORITY_OPTIONS = [
    { id: 'critical', label: 'Crítica', color: '#dc2626' },
    { id: 'high', label: 'Alta', color: '#f97316' },
    { id: 'medium', label: 'Media', color: '#eab308' },
    { id: 'low', label: 'Baja', color: '#22c55e' }
  ];
  const [showFilters, setShowFilters] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null); // 'kpis' | 'projects' | 'users' | 'statuses' | 'types' | 'priorities' | null

  // Period/date filters with persistence
  const [periodPreset, setPeriodPreset] = useState(() => {
    return localStorage.getItem('workload_period_preset') || 'month';
  });
  const [dateFrom, setDateFrom] = useState(() => {
    const saved = localStorage.getItem('workload_date_from');
    if (saved) return saved;
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const saved = localStorage.getItem('workload_date_to');
    if (saved) return saved;
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0); // Last day of current month
    return d.toISOString().split('T')[0];
  });

  // Period presets
  const PERIOD_PRESETS = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'all', label: 'Todo' }
  ];

  const applyPeriodPreset = (presetId) => {
    setPeriodPreset(presetId);
    const today = new Date();
    let from, to;

    switch (presetId) {
      case 'week':
        // Current week (Monday to Sunday)
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        from = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        break;
      case 'month':
        // Current month
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'quarter':
        // Current quarter
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        from = new Date(today.getFullYear(), quarterMonth, 1);
        to = new Date(today.getFullYear(), quarterMonth + 3, 0);
        break;
      case 'all':
        // All time - 1 year back to 1 year forward
        from = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        to = new Date(today.getFullYear() + 1, today.getMonth(), 0);
        break;
      default:
        return;
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });

  // View mode for activities (table/gantt)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('workload_view_mode') || 'gantt';
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('workload_activity_filters', JSON.stringify(activityFilters));
  }, [activityFilters]);

  useEffect(() => {
    localStorage.setItem('workload_period_preset', periodPreset);
  }, [periodPreset]);

  useEffect(() => {
    localStorage.setItem('workload_date_from', dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    localStorage.setItem('workload_date_to', dateTo);
  }, [dateTo]);

  // Permission checks
  const canEdit = canUserEdit('workload');
  const readOnly = isReadOnly('workload');

  // Sub-tabs for activities: 'pending' or 'completed'
  const [activityStatusTab, setActivityStatusTab] = useState('pending');

  // Collapsed activities state with localStorage persistence
  const [collapsedActivities, setCollapsedActivities] = useState(() => {
    const saved = localStorage.getItem('workload_collapsed_activities');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleActivityCollapse = (activityId) => {
    setCollapsedActivities(prev => {
      const newState = { ...prev, [activityId]: !prev[activityId] };
      localStorage.setItem('workload_collapsed_activities', JSON.stringify(newState));
      return newState;
    });
  };

  const toggleCollapseAll = (activities, collapse) => {
    const newState = {};
    activities.forEach(activity => {
      newState[activity.id] = collapse;
    });
    setCollapsedActivities(prev => {
      const merged = { ...prev, ...newState };
      localStorage.setItem('workload_collapsed_activities', JSON.stringify(merged));
      return merged;
    });
  };

  const updateViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('workload_view_mode', mode);
  };

  const updateActiveTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('workload_active_tab', tab);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Fetch all data in parallel
      const [usersRes, kpisRes, projectsRes, recurringRes, levelsRes, clientsRes, deptsRes] = await Promise.all([
        fetch('http://localhost:5000/users/list', { headers }),
        fetch('http://localhost:5000/workload/kpis', { headers }),
        fetch('http://localhost:5000/workload/projects', { headers }),
        fetch('http://localhost:5000/workload/recurring', { headers }),
        fetch('http://localhost:5000/workload/hierarchy-levels', { headers }),
        fetch('http://localhost:5000/clients/list', { headers }),
        fetch('http://localhost:5000/departments?flat=true', { headers })
      ]);

      const [usersData, kpisData, projectsData, recurringData, levelsData, clientsData, deptsData] = await Promise.all([
        usersRes.json(),
        kpisRes.json(),
        projectsRes.json(),
        recurringRes.json(),
        levelsRes.json(),
        clientsRes.json(),
        deptsRes.json()
      ]);

      setUsers(usersData.users || []);
      setKpis(kpisData.kpis || []);
      setProjects(projectsData.projects || []);
      setRecurring(recurringData.recurring || []);
      setHierarchyLevels(levelsData.levels || []);
      setSystemClients(clientsData.clients || clientsData || []);
      setDepartments(deptsData.departments || []);

      // Set selected user from URL param or current user as default
      if (!selectedUser) {
        const urlUserId = searchParams.get('user');
        if (urlUserId && usersData.users?.some(u => u.id === parseInt(urlUserId))) {
          setSelectedUser(parseInt(urlUserId));
        } else if (user) {
          setSelectedUser(user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [user, selectedUser, showError, searchParams, setSelectedUser]);

  // Fetch activities for selected user AND their team (subordinates)
  const fetchActivities = useCallback(async () => {
    if (!selectedUser) return;

    // Always fetch only the target user's activities (no subordinates)
    // Use /activities?user_id=X for single-user view (fast)
    const targetUserId = viewingMemberId || selectedUser;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/activities?user_id=${targetUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, [selectedUser, viewingMemberId]);

  // Fetch weekly summary
  const fetchWeeklySummary = useCallback(async () => {
    if (!selectedUser) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/summary/weekly/${selectedUser}?week_start=${weekStart}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setWeeklySummary(data.summary);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    }
  }, [selectedUser, weekStart]);

  // Fetch team summary
  const fetchTeamSummary = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/summary/team?week_start=${weekStart}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setTeamSummary(data.team || []);
    } catch (error) {
      console.error('Error fetching team summary:', error);
    }
  }, [weekStart]);

  // Fetch objectives tree
  const fetchObjectivesTree = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/objectives-tree?fiscal_year=${selectedFiscalYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setObjectivesTree(data.tree || []);
      }
    } catch (error) {
      console.error('Error fetching objectives tree:', error);
    }
  }, [selectedFiscalYear]);

  // Fetch all objectives (flat list)
  const fetchObjectives = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/objectives?fiscal_year=${selectedFiscalYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setObjectives(data.objectives || []);
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
    }
  }, [selectedFiscalYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedUser) {
      fetchActivities();
      fetchWeeklySummary();
    }
  }, [selectedUser, viewingMemberId, fetchActivities, fetchWeeklySummary]);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamSummary();
    }
  }, [activeTab, fetchTeamSummary]);

  useEffect(() => {
    if (activeTab === 'team' && teamSubTab === 'objectives') {
      fetchObjectivesTree();
      fetchObjectives();
    }
  }, [activeTab, teamSubTab, fetchObjectivesTree, fetchObjectives]);

  // Fetch feedback list
  const fetchFeedback = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/feedback?fiscal_year=${selectedFiscalYear}&fiscal_quarter=${selectedQuarter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setFeedbackList(data.feedback || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  }, [selectedFiscalYear, selectedQuarter]);

  useEffect(() => {
    if (activeTab === 'team' && teamSubTab === 'feedback') {
      fetchFeedback();
    }
  }, [activeTab, teamSubTab, fetchFeedback]);

  // Fetch subordinates for current user
  const fetchSubordinates = useCallback(async () => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/subordinates/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setSubordinates({ self: data.self, subordinates: data.subordinates || [] });
      }
    } catch (error) {
      console.error('Error fetching subordinates:', error);
    }
  }, [user?.id]);

  // Fetch coverage list
  const fetchCoverageList = useCallback(async () => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/coverage?user_id=${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setCoverageList(data.coverages || []);
      }
    } catch (error) {
      console.error('Error fetching coverages:', error);
    }
  }, [user?.id]);

  // Fetch active coverages for selected user
  const fetchActiveCoverages = useCallback(async () => {
    if (!selectedUser) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/coverage/active/${selectedUser}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setActiveCoverages({
          coveringForMe: data.coveringForMe || [],
          iAmCovering: data.iAmCovering || []
        });
      }
    } catch (error) {
      console.error('Error fetching active coverages:', error);
    }
  }, [selectedUser]);

  // Fetch deliverable types
  const fetchDeliverableTypes = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        'http://localhost:5000/workload/deliverable-types',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setDeliverableTypes(data.deliverableTypes || []);
      }
    } catch (error) {
      console.error('Error fetching deliverable types:', error);
    }
  }, []);

  // Fetch objectives by KPI code
  const fetchObjectivesByKpi = useCallback(async (kpiCode) => {
    if (!kpiCode) {
      setObjectivesByKpi([]);
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/objectives/by-kpi/${kpiCode}?fiscal_year=${selectedFiscalYear}&status=active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setObjectivesByKpi(data.objectives || []);
      }
    } catch (error) {
      console.error('Error fetching objectives by KPI:', error);
    }
  }, [selectedFiscalYear]);

  // Fetch supervisor feedback log for an employee
  const fetchSupervisorFeedbackLog = useCallback(async (employeeId) => {
    if (!employeeId) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/supervisor-feedback?employee_id=${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setSupervisorFeedbackLog(data.feedbackLog || []);
      }
    } catch (error) {
      console.error('Error fetching supervisor feedback:', error);
    }
  }, []);

  // Fetch ALL supervisor feedback (for supervisor's log view and activity display)
  const fetchAllSupervisorFeedback = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `http://localhost:5000/workload/supervisor-feedback?supervisor_id=${user?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        const feedbackList = data.feedbackLog || [];
        setAllSupervisorFeedback(feedbackList);

        // Build map of activityId -> feedback[]
        const feedbackMap = {};
        feedbackList.forEach(fb => {
          if (fb.activityId) {
            if (!feedbackMap[fb.activityId]) {
              feedbackMap[fb.activityId] = [];
            }
            feedbackMap[fb.activityId].push(fb);
          }
        });
        setActivityFeedbackMap(feedbackMap);
      }
    } catch (error) {
      console.error('Error fetching all supervisor feedback:', error);
    }
  }, [user?.id]);

  // Fetch initial data for enhancements
  useEffect(() => {
    fetchSubordinates();
    fetchDeliverableTypes();
  }, [fetchSubordinates, fetchDeliverableTypes]);

  useEffect(() => {
    if (selectedUser) {
      fetchActiveCoverages();
    }
  }, [selectedUser, fetchActiveCoverages]);

  useEffect(() => {
    if (activeTab === 'team' && teamSubTab === 'coverage') {
      fetchCoverageList();
    }
  }, [activeTab, teamSubTab, fetchCoverageList]);

  // Fetch supervisor feedback when on activities tab or team/feedback tab
  useEffect(() => {
    if (user?.id) {
      if (activeTab === 'activities' || (activeTab === 'team' && teamSubTab === 'feedback')) {
        fetchAllSupervisorFeedback();
      }
    }
  }, [activeTab, teamSubTab, user?.id, fetchAllSupervisorFeedback]);

  // Activity handlers
  const handleAddActivity = async (activityData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/workload/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activityData,
          assigned_to: viewingMemberId || selectedUser
        })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Actividad creada');
        fetchActivities();
        fetchWeeklySummary();
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      showError('Error al crear actividad');
    }
  };

  // Callback para GanttChart - memoizado para evitar re-renders
  const handleGanttUpdate = useCallback((id, updates) => {
    const totalActualHours = Math.round((updates.dailyProgress?.reduce((sum, entry) => {
      return sum + (entry.hours || 0);
    }, 0) || 0) * 100) / 100;

    const mappedUpdates = {
      progress: Math.round(updates.actualProgress || 0),
      daily_progress: updates.dailyProgress,
      actual_hours: totalActualHours,
      status: updates.status
    };

    // Actualización optimista del estado local
    setActivities(prev => prev.map(a =>
      a.id === id ? { ...a, ...mappedUpdates } : a
    ));

    // Backend en background
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/workload/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(mappedUpdates)
    }).catch(err => console.error('Error updating:', err));
  }, []);

  const handleUpdateActivity = useCallback(async (id, updates) => {
    const token = localStorage.getItem('token');

    // Auto-update status based on progress
    const finalUpdates = { ...updates };
    if (finalUpdates.progress !== undefined) {
      if (finalUpdates.progress >= 100) {
        finalUpdates.status = 'completed';
        finalUpdates.progress = 100;
      } else if (finalUpdates.progress > 0 && finalUpdates.status !== 'completed') {
        finalUpdates.status = 'in_progress';
      }
    }

    // Actualización optimista del estado local
    setActivities(prev => prev.map(a =>
      a.id === id ? { ...a, ...finalUpdates, daily_progress: finalUpdates.daily_progress ?? a.daily_progress } : a
    ));

    // Backend en background
    fetch(`http://localhost:5000/workload/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(finalUpdates)
    }).catch(err => console.error('Error updating:', err));
  }, []);

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('¿Eliminar esta actividad?')) return;

    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/workload/activities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Actividad eliminada');
      fetchActivities();
      fetchWeeklySummary();
    } catch (error) {
      showError('Error al eliminar actividad');
    }
  };

  // Evidence handlers
  const handleUploadEvidence = async (activityId, file, description = '') => {
    console.log('[handleUploadEvidence] Called with activityId:', activityId, 'file:', file?.name);
    setUploadingEvidence(activityId);
    const token = localStorage.getItem('token');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      console.log('[handleUploadEvidence] Sending request to:', `http://localhost:5000/workload/activities/${activityId}/evidence`);

      const response = await fetch(`http://localhost:5000/workload/activities/${activityId}/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Evidencia subida exitosamente');
        // Update the activity in local state with new evidence
        setActivities(prev => prev.map(a =>
          a.id === activityId
            ? { ...a, evidence_files: data.allEvidence }
            : a
        ));
      } else {
        showError(data.message || 'Error al subir evidencia');
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      showError('Error al subir evidencia');
    } finally {
      setUploadingEvidence(null);
    }
  };

  const handleDeleteEvidence = async (activityId, fileId) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/workload/activities/${activityId}/evidence/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Evidencia eliminada');
        // Update the activity in local state
        setActivities(prev => prev.map(a =>
          a.id === activityId
            ? { ...a, evidence_files: data.evidence }
            : a
        ));
      } else {
        showError(data.message || 'Error al eliminar evidencia');
      }
    } catch (error) {
      showError('Error al eliminar evidencia');
    }
  };

  const handleDownloadEvidence = (activityId, fileId, fileName) => {
    const token = localStorage.getItem('token');
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = `http://localhost:5000/workload/activities/${activityId}/evidence/${fileId}/download`;
    link.download = fileName;
    // We need to use fetch with authorization for protected downloads
    fetch(link.href, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => showError('Error al descargar archivo'));
  };

  // Activity Log handlers (like ECR-3)
  const toggleActivityLogForm = (activityId) => {
    if (!expandedActivityLog[activityId]) {
      // Initialize with today's date when opening
      const today = new Date().toISOString().split('T')[0];
      setDailyEntries(prev => ({
        ...prev,
        [activityId]: { date: today, progress: '', activities: '' }
      }));
    }
    setExpandedActivityLog(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  const handleAddDailyProgress = async (activityId) => {
    const entry = dailyEntries[activityId];
    if (!entry || !entry.date || entry.progress === undefined || entry.progress === '') {
      showError('Debes ingresar una fecha y un progreso');
      return;
    }

    const progressValue = parseFloat(entry.progress);
    if (progressValue < 0 || progressValue > 100) {
      showError('El progreso debe estar entre 0 y 100');
      return;
    }

    // Find the activity
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    // Validar límite diario para actividades recurrentes
    const dailyLimit = getDailyProgressLimit(activity);
    if (dailyLimit && progressValue > dailyLimit) {
      const businessDays = countBusinessDays(activity.start_date, activity.end_date);
      const confirmExceed = window.confirm(
        ` ACTIVIDAD RECURRENTE\n\n` +
        `El progreso ingresado (${progressValue}%) excede el límite diario sugerido (${dailyLimit}%).\n\n` +
        `Esta actividad tiene ${businessDays} días hábiles, ` +
        `por lo que el avance máximo recomendado por día es ${dailyLimit}%.\n\n` +
        `¿Deseas continuar de todos modos?`
      );
      if (!confirmExceed) return;
    }

    const existingProgress = activity.daily_progress || [];
    const existingEntry = existingProgress.find(d => d.date === entry.date);

    if (existingEntry) {
      const confirmUpdate = window.confirm(
        ` Ya existe una actividad para ${new Date(entry.date).toLocaleDateString('es-MX')}:\n\n` +
        `Progreso: ${existingEntry.progress}%\n` +
        `Horas: ${existingEntry.hours || 0}h\n` +
        `Actividades: ${existingEntry.activities || '(sin descripción)'}\n\n` +
        `¿Deseas reemplazarla con los nuevos datos?`
      );
      if (!confirmUpdate) return;
    }

    // Parse hours
    const hoursValue = entry.hours ? parseFloat(entry.hours) : null;

    // Build new daily progress array
    let newDailyProgress;
    if (existingEntry) {
      newDailyProgress = existingProgress.map(d =>
        d.date === entry.date
          ? { ...d, progress: progressValue, activities: entry.activities || '', hours: hoursValue }
          : d
      );
    } else {
      newDailyProgress = [...existingProgress, {
        date: entry.date,
        progress: progressValue,
        accumulated: 0,
        activities: entry.activities || '',
        hours: hoursValue
      }];
    }

    // Sort by date
    newDailyProgress.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate accumulated
    let accumulated = 0;
    const updatedProgress = newDailyProgress.map(d => {
      accumulated += d.progress;
      return { ...d, accumulated: Math.min(100, accumulated) };
    });

    const totalProgress = updatedProgress.length > 0
      ? Math.round(updatedProgress[updatedProgress.length - 1].accumulated)
      : 0;

    // Calculate total actual hours from all daily entries (rounded to 2 decimals)
    const totalActualHours = Math.round(updatedProgress.reduce((sum, d) => sum + (d.hours || 0), 0) * 100) / 100;

    // Update activity with new daily progress
    await handleUpdateActivity(activityId, {
      daily_progress: updatedProgress,
      progress: totalProgress,
      actual_hours: totalActualHours
    });

    // Reset form
    setDailyEntries(prev => ({
      ...prev,
      [activityId]: { date: new Date().toISOString().split('T')[0], progress: '', activities: '', hours: '' }
    }));
    setExpandedActivityLog(prev => ({ ...prev, [activityId]: false }));
    showSuccess('Actividad agregada al historial');
  };

  // Coverage handlers
  const handleCreateCoverage = async (coverageData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/workload/coverage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(coverageData)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(data.message || 'Cobertura creada');
        fetchCoverageList();
        fetchActiveCoverages();
        setShowCoverageModal(false);
        setEditingCoverage(null);
      } else {
        showError(data.message || 'Error al crear cobertura');
      }
    } catch (error) {
      console.error('Error creating coverage:', error);
      showError('Error al crear cobertura');
    }
  };

  const handleUpdateCoverage = async (id, coverageData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/workload/coverage/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(coverageData)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Cobertura actualizada');
        fetchCoverageList();
        fetchActiveCoverages();
        setShowCoverageModal(false);
        setEditingCoverage(null);
      }
    } catch (error) {
      console.error('Error updating coverage:', error);
      showError('Error al actualizar cobertura');
    }
  };

  // Supervisor feedback handlers
  const handleCreateSupervisorFeedback = async (feedbackData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/workload/supervisor-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(feedbackData)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(data.message || 'Feedback registrado');
        setShowSupervisorFeedbackModal(false);
        setSelectedActivityForFeedback(null);
        // Refresh feedback lists
        if (feedbackData.employeeId) {
          fetchSupervisorFeedbackLog(feedbackData.employeeId);
        }
        fetchAllSupervisorFeedback(); // Refresh all feedback for activity display
      } else {
        showError(data.message || 'Error al crear feedback');
      }
    } catch (error) {
      console.error('Error creating supervisor feedback:', error);
      showError('Error al crear feedback');
    }
  };

  // Recurring activity handler
  const handleCreateRecurringActivity = async (activityData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/workload/activities/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activityData,
          assigned_to: activityData.assigned_to || selectedUser
        })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(data.message || 'Actividades recurrentes creadas');
        fetchActivities();
        fetchWeeklySummary();
        setShowActivityModal(false);
        setEditingActivity(null);
      } else {
        showError(data.message || 'Error al crear actividades');
      }
    } catch (error) {
      console.error('Error creating recurring activities:', error);
      showError('Error al crear actividades recurrentes');
    }
  };

  // Update existing recurring activity
  const handleUpdateRecurringActivity = async (activityId, activityData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/workload/activities/recurring/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(activityData)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(data.message || 'Actividad recurrente actualizada');
        fetchActivities();
        fetchWeeklySummary();
        setShowActivityModal(false);
        setEditingActivity(null);
      } else {
        showError(data.message || 'Error al actualizar actividad');
      }
    } catch (error) {
      console.error('Error updating recurring activity:', error);
      showError('Error al actualizar actividad recurrente');
    }
  };

  // Enhanced activity handler (includes new fields)
  const handleCreateEnhancedActivity = async (activityData) => {
    const token = localStorage.getItem('token');

    // If it's recurring, use the recurring endpoint
    if (activityData.is_recurring && activityData.frequency) {
      return handleCreateRecurringActivity(activityData);
    }

    try {
      const response = await fetch('http://localhost:5000/workload/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activityData,
          assigned_to: activityData.assigned_to || selectedUser
        })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Actividad creada');
        fetchActivities();
        fetchWeeklySummary();
        setShowActivityModal(false);
        setEditingActivity(null);
      } else {
        showError(data.message || 'Error al crear actividad');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      showError('Error al crear actividad');
    }
  };

  // New activity form state
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    activity_type: 'assigned',
    kpi_id: '',
    project_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    estimated_hours: '',
    priority: 'medium'
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleNewActivitySubmit = () => {
    if (!newActivity.title || !newActivity.start_date || !newActivity.end_date) {
      showError('Completa los campos requeridos');
      return;
    }
    handleAddActivity(newActivity);
    setNewActivity({
      title: '',
      description: '',
      activity_type: 'assigned',
      kpi_id: '',
      project_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      estimated_hours: '',
      priority: 'medium'
    });
    setShowAddForm(false);
  };

  // Filter activities based on selected filters
  const filteredActivities = activities
    .filter(a => {
      // Date range filter (activity visible if overlaps with filter range)
      if (dateFrom && dateTo) {
        const actStart = a.start_date;
        const actEnd = a.end_date || a.start_date;
        // Activity is visible if: ends >= dateFrom AND starts <= dateTo
        if (actEnd < dateFrom || actStart > dateTo) {
          return false;
        }
      }
      // KPI filter
      if (activityFilters.kpis.length > 0 && !activityFilters.kpis.includes(a.kpi_id)) {
        return false;
      }
      // Project filter
      if (activityFilters.projects.length > 0 && !activityFilters.projects.includes(a.project_id)) {
        return false;
      }
      // User filter
      if (activityFilters.users.length > 0 && !activityFilters.users.includes(a.assigned_to)) {
        return false;
      }
      // Status filter
      if (activityFilters.statuses.length > 0 && !activityFilters.statuses.includes(a.status)) {
        return false;
      }
      // Type filter
      if (activityFilters.types.length > 0 && !activityFilters.types.includes(a.activity_type)) {
        return false;
      }
      // Priority filter
      if (activityFilters.priorities.length > 0 && !activityFilters.priorities.includes(a.priority)) {
        return false;
      }
      return true;
    })
    // Sort by ID (order of creation)
    .sort((a, b) => a.id - b.id);

  // Separate pending and completed activities
  const pendingActivities = filteredActivities.filter(a => (a.progress || 0) < 100);
  const completedActivities = filteredActivities.filter(a => (a.progress || 0) >= 100);

  // Get activities based on selected tab
  const displayedActivities = activityStatusTab === 'pending' ? pendingActivities : completedActivities;

  // Transform activities for Gantt (memoizado para evitar recálculos innecesarios)
  const ganttTasks = useMemo(() => filteredActivities.map(a => ({
    id: a.id,
    action: a.title,
    result: a.description,
    area: a.kpi_code || 'General',
    responsible: a.assigned_to,
    startDate: a.start_date,
    endDate: a.end_date,
    status: a.status === 'completed' ? 'completed' : a.status === 'in_progress' ? 'in_progress' : a.status === 'cancelled' ? 'cancelled' : 'pending',
    actualProgress: a.progress || 0,
    dailyProgress: a.daily_progress || [],
    recoveryPlan: '',
    evidenceFiles: a.evidence_files || [],
    // Additional workload fields
    estimated_hours: a.estimated_hours,
    actual_hours: a.actual_hours,
    kpi_color: a.kpi_color,
    priority: a.priority,
    // Recurring activity fields
    isRecurring: a.isRecurring || a.is_recurring,
    frequency: a.frequency,
    frequencyDetails: a.frequencyDetails || a.frequency_details,
    recurringDuration: a.recurringDuration || a.recurring_duration,
    // Grouping fields (passthrough)
    source_type: a.source_type,
    project_name: a.project_name
  })), [filteredActivities]);

  // Dynamic filter options - only show options that have matching activities
  const getAvailableFilterOptions = () => {
    // Apply each filter to calculate available options for OTHER filters
    const applyFilters = (excludeFilter) => {
      return activities.filter(a => {
        if (excludeFilter !== 'kpis' && activityFilters.kpis.length > 0 && !activityFilters.kpis.includes(a.kpi_id)) return false;
        if (excludeFilter !== 'projects' && activityFilters.projects.length > 0 && !activityFilters.projects.includes(a.project_id)) return false;
        if (excludeFilter !== 'users' && activityFilters.users.length > 0 && !activityFilters.users.includes(a.assigned_to)) return false;
        if (excludeFilter !== 'statuses' && activityFilters.statuses.length > 0 && !activityFilters.statuses.includes(a.status)) return false;
        return true;
      });
    };

    // Get unique values from filtered activities
    const forKpis = applyFilters('kpis');
    const forProjects = applyFilters('projects');
    const forUsers = applyFilters('users');
    const forStatuses = applyFilters('statuses');

    return {
      kpis: [...new Set(forKpis.map(a => a.kpi_id).filter(Boolean))],
      projects: [...new Set(forProjects.map(a => a.project_id).filter(Boolean))],
      users: [...new Set(forUsers.map(a => a.assigned_to).filter(Boolean))],
      statuses: [...new Set(forStatuses.map(a => a.status).filter(Boolean))]
    };
  };

  const availableOptions = getAvailableFilterOptions();

  // Get current user name
  const getSelectedUserName = () => {
    const u = users.find(u => u.id === selectedUser);
    return u ? `${u.firstName} ${u.lastName}` : 'Usuario';
  };

  // Calculate compliance (Real vs Expected) for activities
  const calculateCompliance = (activitiesList) => {
    if (!activitiesList || activitiesList.length === 0) {
      return { real: 0, expected: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalReal = 0;
    let totalExpected = 0;
    let countActive = 0;

    activitiesList.forEach(activity => {
      if (!activity.start_date || !activity.end_date) return;
      if (activity.status === 'completed') {
        // Completed activities: 100% real, 100% expected
        totalReal += 100;
        totalExpected += 100;
        countActive++;
        return;
      }

      const startDate = new Date(activity.start_date);
      const endDate = new Date(activity.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // Only count activities that have started
      if (today < startDate) return;

      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
      const daysPassed = Math.min(totalDays, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1);

      const expectedProgress = (daysPassed / totalDays) * 100;
      const realProgress = activity.progress || 0;

      totalExpected += expectedProgress;
      totalReal += realProgress;
      countActive++;
    });

    if (countActive === 0) return { real: 0, expected: 0 };

    return {
      real: Math.round(totalReal / countActive),
      expected: Math.round(totalExpected / countActive)
    };
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg
    },
    header: {
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      padding: '12px 24px',
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`
    },
    tab: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    content: {
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px'
    },
    statCard: {
      padding: '20px',
      borderRadius: '12px',
      border: `1px solid ${t.border}`
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${t.border}`,
            borderTop: `4px solid ${t.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: t.textMuted }}>Cargando Workload Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Read-only banner */}
      {readOnly && (
        <div style={{
          backgroundColor: `${t.warning}15`,
          borderBottom: '2px solid ${t.warning}',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}></span>
          <span style={{ color: t.warning, fontWeight: '600', fontSize: '14px' }}>
            Modo Solo Lectura - No tienes permisos para modificar la carga de trabajo
          </span>
        </div>
      )}
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: t.bgPanel,
              border: `1px solid ${t.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: t.text,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Menú Principal
          </button>
          <div style={styles.logo}>
            <span style={{ fontSize: '28px' }}></span>
            <div>
              <h1 style={styles.title}>Workload Manager</h1>
              <span style={{ fontSize: '12px', color: t.textMuted }}>Gestión de Carga de Trabajo y KPIs</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select
            style={{ ...styles.select, width: '250px' }}
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(parseInt(e.target.value))}
          >
            <option value="">Seleccionar usuario...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} - {u.position}
              </option>
            ))}
          </select>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <ThemeSelector />
          <span style={{ fontSize: '14px', color: t.textMuted }}>
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { id: 'dashboard', label: ' Dashboard', icon: '' },
          { id: 'activities', label: viewingMemberId ? ` ${users.find(u => u.id === viewingMemberId)?.firstName || 'Miembro'}` : ' Mis Actividades', icon: '' },
          { id: 'team', label: ' Equipo', icon: '' },
          { id: 'config', label: ' Configuración', icon: '' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => updateActiveTab(tab.id)}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === tab.id ? t.accent : t.bgPanel,
              color: activeTab === tab.id ? 'white' : t.text
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            {/* WorkloadDashboard KPI */}
            {(() => {
              const dashUserIds = [
                ...(subordinates.self ? [subordinates.self.id] : (user?.id ? [user.id] : [])),
                ...(subordinates.subordinates || []).map(u => u.id)
              ];
              return <WorkloadDashboard userIds={dashUserIds} />;
            })()}

            {/* Personal Week Summary - B2B Sobrio */}
            {weeklySummary && (
              <div style={{
                backgroundColor: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: '16px 20px',
                marginTop: 8
              }}>
                {/* Header with week selector */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: t.textMuted
                  }}>
                    Resumen Semanal Personal
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="date"
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      style={{ ...styles.input, width: 150, fontSize: 13 }}
                    />
                    <span style={{ fontSize: 12, color: t.textMuted }}>
                      {getSelectedUserName()}
                    </span>
                  </div>
                </div>

                {/* KPI Distribution - B2B grid */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: t.textMuted,
                  marginBottom: 12
                }}>
                  Distribución por KPI
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {kpis.map(kpi => {
                    const hours = weeklySummary.kpi_distribution[kpi.code] || 0;
                    const percent = weeklySummary.hours_actual > 0
                      ? (hours / weeklySummary.hours_actual * 100).toFixed(0)
                      : 0;
                    return (
                      <div key={kpi.id} style={{
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: 10,
                        padding: '14px 16px'
                      }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: t.textMuted,
                          marginBottom: 8
                        }}>
                          {kpi.name}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 600, color: kpi.color, lineHeight: 1 }}>
                          {hours.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                          hrs · {percent}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Activities Summary - B2B grid */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: t.textMuted,
                  marginBottom: 12
                }}>
                  Resumen de Actividades
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {/* Cumplimiento */}
                  {(() => {
                    const compliance = calculateCompliance(activities);
                    const isOnTrack = compliance.real >= compliance.expected;
                    return (
                      <div style={{
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: t.textMuted,
                          marginBottom: 8
                        }}>
                          Cumplimiento
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: isOnTrack ? t.success : t.error, lineHeight: 1 }}>
                          {compliance.real}%
                        </div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                          vs {compliance.expected}% esperado
                        </div>
                      </div>
                    );
                  })()}
                  {/* Actividades */}
                  <div style={{
                    backgroundColor: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      marginBottom: 8
                    }}>
                      Completadas
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: t.accent, lineHeight: 1 }}>
                      {weeklySummary.activities_completed}/{weeklySummary.activities_total}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                      actividades
                    </div>
                  </div>
                  {/* Pendientes */}
                  <div style={{
                    backgroundColor: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      marginBottom: 8
                    }}>
                      Pendientes
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: t.warning, lineHeight: 1 }}>
                      {weeklySummary.activities_pending}
                    </div>
                  </div>
                  {/* No Planeadas */}
                  <div style={{
                    backgroundColor: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: t.textMuted,
                      marginBottom: 8
                    }}>
                      No Planeadas
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: t.error, lineHeight: 1 }}>
                      {weeklySummary.activities_unplanned}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <>
            {/* View Toggle & Add Button */}
            <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => updateViewMode('gantt')}
                  style={{
                    ...styles.button,
                    backgroundColor: viewMode === 'gantt' ? t.accent : t.bgPanel,
                    color: viewMode === 'gantt' ? 'white' : t.text
                  }}
                >
                   Vista Gantt
                </button>
                <button
                  onClick={() => updateViewMode('table')}
                  style={{
                    ...styles.button,
                    backgroundColor: viewMode === 'table' ? t.accent : t.bgPanel,
                    color: viewMode === 'table' ? 'white' : t.text
                  }}
                >
                   Vista Lista
                </button>

                {/* Team member selector - only direct reports */}
                {(() => {
                  // Get all subordinates recursively
                  const getAllSubordinates = (managerId) => {
                    const direct = users.filter(u => u.managerId === managerId);
                    return direct.reduce((acc, u) => [...acc, u, ...getAllSubordinates(u.id)], []);
                  };
                  const directReports = getAllSubordinates(user?.id);
                  if (directReports.length === 0) return null;
                  const viewingMember = viewingMemberId ? users.find(u => u.id === viewingMemberId) : null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', borderLeft: `1px solid ${t.border || t.border}`, paddingLeft: '12px' }}>
                      <span style={{ fontSize: '13px', color: t.textMuted }}> Ver:</span>
                      <select
                        value={viewingMemberId || ''}
                        onChange={(e) => setViewingMemberId(e.target.value ? parseInt(e.target.value) : null)}
                        style={{
                          ...styles.select,
                          width: '180px',
                          fontSize: '13px',
                          borderColor: viewingMemberId ? t.accent : (t.border || t.border),
                          backgroundColor: viewingMemberId ? `${t.accent}10` : t.bg
                        }}
                      >
                        <option value="">Mis actividades</option>
                        {directReports.map(u => {
                          // Calculate depth relative to current user
                          let depth = 0;
                          let parentId = u.managerId;
                          while (parentId && parentId !== user?.id) {
                            depth++;
                            parentId = users.find(p => p.id === parentId)?.managerId;
                          }
                          const indent = '\u00A0\u00A0'.repeat(depth);
                          const prefix = depth > 0 ? '└ ' : '';
                          return (
                            <option key={u.id} value={u.id}>
                              {indent}{prefix}{u.firstName} {u.lastName} {u.position ? `- ${u.position}` : ''}
                            </option>
                          );
                        })}
                      </select>
                      {viewingMember && (
                        <span style={{ fontSize: '12px', color: t.accent, fontWeight: '600' }}>
                          {viewingMember.firstName} {viewingMember.lastName}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    ...styles.button,
                    backgroundColor: showFilters || Object.values(activityFilters).some(f => f.length > 0) ? t.warning : t.bgPanel,
                    color: showFilters || Object.values(activityFilters).some(f => f.length > 0) ? 'white' : t.text
                  }}
                >
                   Filtros {Object.values(activityFilters).flat().length > 0 && `(${Object.values(activityFilters).flat().length})`}
                </button>
                {canEdit && (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                      ...styles.button,
                      backgroundColor: showAddForm ? t.textMuted : t.success,
                      color: 'white'
                    }}
                  >
                    {showAddForm ? ' Cancelar' : '+ Rápida'}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => { setEditingActivity(null); setShowActivityModal(true); }}
                    style={{
                      ...styles.button,
                      backgroundColor: t.accent,
                      color: 'white'
                    }}
                  >
                    + Avanzada / Recurrente
                  </button>
                )}
                <button
                  onClick={() => setShowExportModal(true)}
                  style={{
                    ...styles.button,
                    backgroundColor: t.success,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⬇ Exportar Excel
                </button>
              </div>
            </div>

            {/* Activity Filters - Compact Dropdowns */}
            {showFilters && (
              <div style={{ ...styles.card, backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Period Presets */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {PERIOD_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => applyPeriodPreset(p.id)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          border: `1px solid ${t.border}`,
                          cursor: 'pointer',
                          backgroundColor: periodPreset === p.id ? t.accent : t.bgCard,
                          color: periodPreset === p.id ? 'white' : t.text
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ width: '1px', height: '28px', backgroundColor: t.border }} />

                  {/* Date Range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setPeriodPreset(''); }}
                      style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}
                    />
                    <span style={{ color: t.textMuted, fontSize: '12px' }}>→</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setPeriodPreset(''); }}
                      style={{ padding: '5px 8px', fontSize: '12px', border: `1px solid ${t.border}`, borderRadius: '6px', backgroundColor: t.bgCard, color: t.text }}
                    />
                  </div>

                  <div style={{ width: '1px', height: '28px', backgroundColor: t.border }} />

                  {/* Type Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'types' ? null : 'types')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.types.length > 0 ? t.accent : t.bgCard,
                        color: activityFilters.types.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Tipo {activityFilters.types.length > 0 && `(${activityFilters.types.length})`} ▼
                    </button>
                    {openFilterDropdown === 'types' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '160px'
                      }}>
                        {ACTIVITY_TYPES.map(type => (
                          <label key={type.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            borderBottom: `1px solid ${t.bgPanel}`
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.types.includes(type.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, types: [...activityFilters.types, type.id] });
                                } else {
                                  setActivityFilters({ ...activityFilters, types: activityFilters.types.filter(id => id !== type.id) });
                                }
                              }}
                            />
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: type.color }} />
                            <span style={{ color: t.text }}>{type.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'priorities' ? null : 'priorities')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.priorities.length > 0 ? t.accent : t.bgCard,
                        color: activityFilters.priorities.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Prioridad {activityFilters.priorities.length > 0 && `(${activityFilters.priorities.length})`} ▼
                    </button>
                    {openFilterDropdown === 'priorities' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '140px'
                      }}>
                        {PRIORITY_OPTIONS.map(pri => (
                          <label key={pri.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            borderBottom: `1px solid ${t.bgPanel}`
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.priorities.includes(pri.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, priorities: [...activityFilters.priorities, pri.id] });
                                } else {
                                  setActivityFilters({ ...activityFilters, priorities: activityFilters.priorities.filter(id => id !== pri.id) });
                                }
                              }}
                            />
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pri.color }} />
                            <span style={{ color: t.text }}>{pri.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KPI Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'kpis' ? null : 'kpis')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.kpis.length > 0 ? t.accent : t.bgCard,
                        color: activityFilters.kpis.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                       KPI {activityFilters.kpis.length > 0 && `(${activityFilters.kpis.length})`} ▼
                    </button>
                    {openFilterDropdown === 'kpis' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '180px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {kpis.filter(k => availableOptions.kpis.includes(k.id) || activityFilters.kpis.includes(k.id)).map(k => (
                          <label key={k.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            borderBottom: `1px solid ${t.bgPanel}`,
                            opacity: availableOptions.kpis.includes(k.id) ? 1 : 0.5
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.kpis.includes(k.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, kpis: [...activityFilters.kpis, k.id] });
                                } else {
                                  setActivityFilters({ ...activityFilters, kpis: activityFilters.kpis.filter(id => id !== k.id) });
                                }
                              }}
                            />
                            <span style={{ color: k.color || t.text, fontWeight: '500' }}>{k.code}</span>
                            <span style={{ color: t.textMuted, fontSize: '11px' }}>{k.name}</span>
                          </label>
                        ))}
                        {kpis.filter(k => availableOptions.kpis.includes(k.id) || activityFilters.kpis.includes(k.id)).length === 0 && (
                          <div style={{ padding: '12px', color: t.textDim, fontSize: '12px', textAlign: 'center' }}>Sin opciones</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Project Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'projects' ? null : 'projects')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.projects.length > 0 ? t.accent : t.bgCard,
                        color: activityFilters.projects.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                       Proyecto {activityFilters.projects.length > 0 && `(${activityFilters.projects.length})`} ▼
                    </button>
                    {openFilterDropdown === 'projects' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '200px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {projects.filter(p => availableOptions.projects.includes(p.id) || activityFilters.projects.includes(p.id)).map(p => (
                          <label key={p.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: t.text,
                            borderBottom: `1px solid ${t.bgPanel}`,
                            opacity: availableOptions.projects.includes(p.id) ? 1 : 0.5
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.projects.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, projects: [...activityFilters.projects, p.id] });
                                } else {
                                  setActivityFilters({ ...activityFilters, projects: activityFilters.projects.filter(id => id !== p.id) });
                                }
                              }}
                            />
                            {p.name}
                          </label>
                        ))}
                        {projects.filter(p => availableOptions.projects.includes(p.id) || activityFilters.projects.includes(p.id)).length === 0 && (
                          <div style={{ padding: '12px', color: t.textDim, fontSize: '12px', textAlign: 'center' }}>Sin opciones</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'users' ? null : 'users')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.users.length > 0 ? t.success : t.bgCard,
                        color: activityFilters.users.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                       Persona {activityFilters.users.length > 0 && `(${activityFilters.users.length})`} ▼
                    </button>
                    {openFilterDropdown === 'users' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '200px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {users.filter(u => availableOptions.users.includes(u.id) || activityFilters.users.includes(u.id)).map(u => (
                          <label key={u.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: t.text,
                            borderBottom: `1px solid ${t.bgPanel}`,
                            opacity: availableOptions.users.includes(u.id) ? 1 : 0.5
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.users.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, users: [...activityFilters.users, u.id] });
                                } else {
                                  setActivityFilters({ ...activityFilters, users: activityFilters.users.filter(id => id !== u.id) });
                                }
                              }}
                            />
                            {u.firstName} {u.lastName}
                          </label>
                        ))}
                        {users.filter(u => availableOptions.users.includes(u.id) || activityFilters.users.includes(u.id)).length === 0 && (
                          <div style={{ padding: '12px', color: t.textDim, fontSize: '12px', textAlign: 'center' }}>Sin opciones</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenFilterDropdown(openFilterDropdown === 'statuses' ? null : 'statuses')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: activityFilters.statuses.length > 0 ? t.warning : t.bgCard,
                        color: activityFilters.statuses.length > 0 ? 'white' : t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                       Estado {activityFilters.statuses.length > 0 && `(${activityFilters.statuses.length})`} ▼
                    </button>
                    {openFilterDropdown === 'statuses' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: t.bgCard,
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        minWidth: '160px'
                      }}>
                        {[
                          { value: 'pending', label: 'Pendiente', icon: '' },
                          { value: 'in_progress', label: 'En Progreso', icon: '' },
                          { value: 'completed', label: 'Completado', icon: '' },
                          { value: 'cancelled', label: 'Cancelado', icon: '' }
                        ].filter(s => availableOptions.statuses.includes(s.value) || activityFilters.statuses.includes(s.value)).map(status => (
                          <label key={status.value} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: t.text,
                            borderBottom: `1px solid ${t.bgPanel}`,
                            opacity: availableOptions.statuses.includes(status.value) ? 1 : 0.5
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}>
                            <input
                              type="checkbox"
                              checked={activityFilters.statuses.includes(status.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActivityFilters({ ...activityFilters, statuses: [...activityFilters.statuses, status.value] });
                                } else {
                                  setActivityFilters({ ...activityFilters, statuses: activityFilters.statuses.filter(s => s !== status.value) });
                                }
                              }}
                            />
                            {status.icon} {status.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clear & Count */}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: t.textMuted }}>
                      {filteredActivities.length} de {activities.length} actividades
                    </span>
                    <button
                      onClick={() => {
                        setActivityFilters({ kpis: [], projects: [], users: [], statuses: [], types: [], priorities: [] });
                        setOpenFilterDropdown(null);
                        applyPeriodPreset('month');
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        backgroundColor: t.bgCard,
                        color: t.textMuted,
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ↺ Reset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Activity Form */}
            {showAddForm && (
              <div style={{ ...styles.card, backgroundColor: `${t.success}10`, border: '2px solid ${t.success}60' }}>
                <h4 style={{ margin: '0 0 16px 0', color: t.success }}>Nueva Actividad</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      Título *
                    </label>
                    <input
                      style={styles.input}
                      value={newActivity.title}
                      onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                      placeholder="Nombre de la actividad"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      Tipo
                    </label>
                    <select
                      style={styles.select}
                      value={newActivity.activity_type}
                      onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                    >
                      <option value="assigned">Asignada</option>
                      <option value="planned">Planeada</option>
                      <option value="unplanned">No Planeada</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      KPI
                    </label>
                    <select
                      style={styles.select}
                      value={newActivity.kpi_id}
                      onChange={(e) => setNewActivity({ ...newActivity, kpi_id: e.target.value })}
                    >
                      <option value="">Sin KPI</option>
                      {kpis.map(k => (
                        <option key={k.id} value={k.id}>{k.icon} {k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      Fecha Inicio *
                    </label>
                    <input
                      type="date"
                      style={styles.input}
                      value={newActivity.start_date}
                      onChange={(e) => setNewActivity({ ...newActivity, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      Fecha Fin *
                    </label>
                    <input
                      type="date"
                      style={styles.input}
                      value={newActivity.end_date}
                      onChange={(e) => setNewActivity({ ...newActivity, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                      Horas Estimadas
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      style={styles.input}
                      value={newActivity.estimated_hours}
                      onChange={(e) => setNewActivity({ ...newActivity, estimated_hours: e.target.value })}
                      placeholder="0.0"
                    />
                  </div>
                </div>
                <button
                  onClick={handleNewActivitySubmit}
                  style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                >
                   Crear Actividad
                </button>
              </div>
            )}

            {/* Activities View */}
            {viewMode === 'gantt' ? (
              <div style={styles.card}>
                {ganttTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                    No hay actividades. Crea la primera actividad arriba.
                  </div>
                ) : (
                  <GanttChart
                    tasks={ganttTasks}
                    users={users}
                    onTaskUpdate={handleGanttUpdate}
                    viewScale="Week"
                  />
                )}
              </div>
            ) : (
              <div style={styles.card}>
                {/* Tabs con subrayado - usando componente */}
                <ListTabs
                  activeTab={activityStatusTab}
                  pendingCount={pendingActivities.length}
                  completedCount={completedActivities.length}
                  onTabChange={setActivityStatusTab}
                  onCollapseAll={() => {
                    const allCollapsed = displayedActivities.every(a => collapsedActivities[a.id]);
                    toggleCollapseAll(displayedActivities, !allCollapsed);
                  }}
                  allCollapsed={displayedActivities.every(a => collapsedActivities[a.id])}
                  t={t}
                />

                {displayedActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                    {activityStatusTab === 'pending'
                      ? 'No hay actividades pendientes'
                      : 'No hay actividades completadas aún'}
                  </div>
                ) : (
                  <div style={{ border: `1px solid ${t.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                    {/* Header de tabla */}
                    <ListHeader t={t} />

                    {/* Filas de actividades */}
                    {displayedActivities.map(activity => {
                      const activityCompliance = calculateCompliance([activity]);
                      const isCollapsed = collapsedActivities[activity.id];

                      return (
                        <React.Fragment key={activity.id}>
                          {/* Fila colapsada */}
                          <ActivityRowCollapsed
                            activity={activity}
                            compliance={activityCompliance}
                            isCollapsed={isCollapsed}
                            onToggleCollapse={() => toggleActivityCollapse(activity.id)}
                            onEdit={() => { setEditingActivity(activity); setShowActivityModal(true); }}
                            onFeedback={() => { setSelectedActivityForFeedback(activity); setShowSupervisorFeedbackModal(true); }}
                            onDelete={() => handleDeleteActivity(activity.id)}
                            canEdit={canEdit}
                            t={t}
                          />

                          {/* Fila expandida */}
                          {!isCollapsed && (
                            <ActivityRowExpanded
                              activity={activity}
                              compliance={activityCompliance}
                              dailyEntries={dailyEntries[activity.id]}
                              expandedActivityLog={expandedActivityLog[activity.id]}
                              collapsedHistory={collapsedHistory[activity.id]}
                              uploadingEvidence={uploadingEvidence === activity.id}
                              feedbackList={activityFeedbackMap[activity.id]}
                              getDailyProgressLimit={getDailyProgressLimit}
                              onToggleActivityLog={() => toggleActivityLogForm(activity.id)}
                              onDailyEntryChange={(newEntry) => setDailyEntries(prev => ({
                                ...prev,
                                [activity.id]: newEntry
                              }))}
                              onAddDailyProgress={() => handleAddDailyProgress(activity.id)}
                              onToggleHistory={() => setCollapsedHistory(prev => {
                                const newState = { ...prev, [activity.id]: !prev[activity.id] };
                                localStorage.setItem('workload_collapsed_history', JSON.stringify(newState));
                                return newState;
                              })}
                              onUploadEvidence={(file) => handleUploadEvidence(activity.id, file)}
                              onDownloadEvidence={(file) => handleDownloadEvidence(activity.id, file.id, file.originalName || file.file_name || file.name)}
                              onDeleteEvidence={(file) => handleDeleteEvidence(activity.id, file.id)}
                              t={t}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
              <ExportActivitiesModal
                users={[
                  ...(subordinates.self ? [subordinates.self] : []),
                  ...(subordinates.subordinates || [])
                ]}
                onClose={() => setShowExportModal(false)}
              />
            )}

            {/* Activity Form Modal (Advanced/Recurring) */}
            {showActivityModal && (
              <ActivityFormModal
                activity={editingActivity}
                defaultAssignedTo={!editingActivity && viewingMemberId ? viewingMemberId : undefined}
                kpis={kpis}
                projects={projects}
                objectives={objectives}
                subordinates={subordinates}
                deliverableTypes={deliverableTypes}
                objectivesByKpi={objectivesByKpi}
                onFetchObjectivesByKpi={fetchObjectivesByKpi}
                onClose={() => { setShowActivityModal(false); setEditingActivity(null); }}
                onSave={async (activityData) => {
                  const isRecurring = activityData.is_recurring || activityData.isRecurring;
                  const isEditing = !!editingActivity?.id;

                  if (isEditing) {
                    // Update existing activity
                    if (isRecurring) {
                      await handleUpdateRecurringActivity(editingActivity.id, activityData);
                    } else {
                      await handleUpdateActivity(editingActivity.id, activityData);
                    }
                  } else {
                    // Create new activity
                    if (isRecurring) {
                      await handleCreateRecurringActivity(activityData);
                    } else {
                      await handleCreateEnhancedActivity(activityData);
                    }
                  }
                  setShowActivityModal(false);
                  setEditingActivity(null);
                }}
              />
            )}

          </>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <>
            {/* Team Sub-Tabs */}
            <div style={{ ...styles.card, padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'workload', label: ' Carga de Trabajo' },
                  { id: 'orgchart', label: ' Organigrama' },
                  { id: 'management', label: ' Gestión Personal' },
                  { id: 'objectives', label: ' Objetivos' },
                  { id: 'feedback', label: ' Feedback' },
                  { id: 'coverage', label: ' Coberturas' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setTeamSubTab(sub.id)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: teamSubTab === sub.id ? t.accent : t.bgPanel,
                      color: teamSubTab === sub.id ? 'white' : t.text,
                      transition: 'all 0.2s'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-TAB: Carga de Trabajo */}
            {teamSubTab === 'workload' && (
              <>
                <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', color: t.text }}>Semana:</span>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    style={{ ...styles.input, width: '180px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', borderLeft: `1px solid ${t.border}`, paddingLeft: '16px' }}>
                    <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: '500' }}>Ver por:</span>
                    {['weekly', 'daily'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setWorkloadViewMode(mode)}
                        style={{
                          padding: '5px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: workloadViewMode === mode ? t.accent : t.bgPanel,
                          color: workloadViewMode === mode ? 'white' : t.text,
                          transition: 'all 0.2s'
                        }}
                      >
                        {mode === 'weekly' ? ' Semana' : ' Día'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setTeamSubTab('management')}
                    style={{
                      marginLeft: '8px',
                      padding: '5px 12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: t.textMuted,
                      backgroundColor: 'transparent'
                    }}
                    title="Configurar horas disponibles por persona"
                  >
                     Configurar horas
                  </button>
                </div>

                <div style={styles.card}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Carga de Trabajo del Equipo
                    <span style={{ fontSize: '12px', fontWeight: '400', color: t.textMuted, marginLeft: '8px' }}>
                      {workloadViewMode === 'daily' ? '(promedio diario)' : '(total semanal)'}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamSummary.map(member => {
                      const divisor = workloadViewMode === 'daily' ? 5 : 1;
                      const hoursAvailable = parseFloat(member.hours_available) / divisor;
                      const hoursPlanned = parseFloat(member.hours_planned) / divisor;
                      const hoursActual = parseFloat(member.hours_actual) / divisor;
                      const diff = hoursAvailable - hoursPlanned;
                      const isOver = diff < 0;
                      const utilizationPct = hoursAvailable > 0 ? Math.round((hoursActual / hoursAvailable) * 1000) / 10 : 0;
                      const unit = workloadViewMode === 'daily' ? 'h/día' : 'h';

                      return (
                      <div key={member.id} style={{
                        padding: '16px',
                        backgroundColor: isOver ? `${t.error}10` : t.bg,
                        borderRadius: '8px',
                        border: isOver ? '1px solid ${t.error}40' : `1px solid ${t.border}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontWeight: '600', fontSize: '15px' }}>
                              {member.first_name} {member.last_name}
                            </span>
                            <span style={{ color: t.textMuted, fontSize: '13px', marginLeft: '12px' }}>
                              {member.position} - {member.departmentName || member.department_name || member.department || 'Sin depto'}
                            </span>
                            {/* Managed departments badges */}
                            {member.managedDepartments && member.managedDepartments.length > 0 && member.managedDepartments.map((md, idx) => (
                              <span key={idx} style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: t.success,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                marginLeft: '8px'
                              }}>
                                Gestiona: {md.name}
                              </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Diferencia disponible vs planeado */}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: isOver ? `${t.error}15` : `${t.success}15`,
                              color: isOver ? t.error : t.success
                            }}>
                              {isOver ? '' : ''} {isOver ? '' : '+'}{diff.toFixed(1)}{unit}
                            </span>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: '600',
                              backgroundColor: isOver ? `${t.error}15` : `${t.success}15`,
                              color: isOver ? t.error : t.success
                            }}>
                              {utilizationPct}%
                            </span>
                            {isOver && (
                              <span style={{ fontSize: '12px', color: t.error, fontWeight: '600' }}>
                                 SOBRECARGA
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: t.textMuted, flexWrap: 'wrap' }}>
                          <span> Disponible: {hoursAvailable.toFixed(1)}{unit}</span>
                          <span> Planeadas: {hoursPlanned.toFixed(1)}{unit}</span>
                          <span> Reales: {hoursActual.toFixed(1)}{unit}</span>
                          <span> Actividades: {member.completed_count} / {member.activities_count}</span>
                          {(() => {
                            const memberActivities = activities.filter(a => a.assigned_to === member.id);
                            const compliance = calculateCompliance(memberActivities);
                            const isOnTrack = compliance.real >= compliance.expected;
                            return (
                              <span style={{ color: isOnTrack ? t.success : t.error, fontWeight: '600' }}>
                                 Cumplimiento: {compliance.real}% / {compliance.expected}%
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{
                          marginTop: '12px',
                          height: '8px',
                          backgroundColor: t.bgPanel,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, utilizationPct)}%`,
                            height: '100%',
                            backgroundColor: isOver ? t.error : t.success,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* SUB-TAB: Organigrama */}
            {teamSubTab === 'orgchart' && (
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    Organigrama Interactivo
                  </h3>
                  {canEdit && (
                    <span style={{ fontSize: '12px', color: t.textMuted }}>
                      Click en empleado para editar
                    </span>
                  )}
                </div>
                <OrgChart
                  users={users}
                  hierarchyLevels={hierarchyLevels}
                  onEditUser={canEdit ? (user) => setEditingUser(user) : null}
                />
              </div>
            )}

            {/* SUB-TAB: Gestión Personal */}
            {teamSubTab === 'management' && (
              <div style={styles.card}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
                  Gestión de Personal
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {users.map(member => (
                    <div key={member.id} style={{
                      padding: '16px',
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: `1px solid ${t.border}`,
                      borderLeft: `4px solid ${
                        member.hierarchyLevel === 0 ? t.accent :
                        member.hierarchyLevel === 1 ? t.accent :
                        member.hierarchyLevel === 2 ? t.success :
                        member.hierarchyLevel === 3 ? t.warning : t.textMuted
                      }`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '15px' }}>
                            {member.firstName} {member.lastName}
                          </span>
                          <span style={{
                            marginLeft: '12px',
                            padding: '2px 8px',
                            backgroundColor: `${t.accent}20`,
                            color: t.accent,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {member.hierarchyLevel === 0 ? 'DIRECTOR' :
                             member.hierarchyLevel === 1 ? 'GERENTE' :
                             member.hierarchyLevel === 2 ? 'SUPERVISOR' :
                             member.hierarchyLevel === 3 ? 'INGENIERO' : 'STAFF'}
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => setEditingUser(member)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: t.accent,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '20px', fontSize: '13px', color: t.textMuted, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span> {member.position || 'Sin puesto'}</span>
                        <span> {member.departmentName || member.department || 'Sin departamento'}</span>
                        <span> Jefe: {member.manager ? member.manager.name : 'Sin asignar'}</span>
                        {/* Managed departments badges */}
                        {member.managedDepartments && member.managedDepartments.length > 0 && member.managedDepartments.map((md, idx) => (
                          <span key={idx} style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: t.success,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            Gestiona: {md.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Edit User Modal - Shared Component (light theme) */}
            {editingUser && (
              <UserFormModal
                user={editingUser}
                users={users}
                onClose={() => setEditingUser(null)}
                onSave={async (updatedData) => {
                  const token = localStorage.getItem('token');
                  try {
                    const response = await fetch(`http://localhost:5000/users/${editingUser.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify(updatedData)
                    });
                    const data = await response.json();
                    if (data.success) {
                      // Save hours_per_week to workload config if provided
                      if (updatedData.hoursPerWeek) {
                        await fetch(`http://localhost:5000/workload/user-config/${editingUser.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({ hours_per_week: parseFloat(updatedData.hoursPerWeek) })
                        });
                      }
                      showSuccess('Usuario actualizado');
                      setEditingUser(null);
                      fetchData();
                      fetchTeamSummary();
                    } else {
                      showError(data.message || 'Error al actualizar');
                    }
                  } catch (error) {
                    showError('Error al actualizar usuario');
                  }
                }}
                allowCreate={false}
                theme="light"
              />
            )}

            {/* SUB-TAB: Objetivos */}
            {teamSubTab === 'objectives' && (
              <>
                {/* Header with year selector and add button */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontWeight: '600', color: t.text }}>Año Fiscal:</span>
                    <select
                      style={{ ...styles.select, width: '120px' }}
                      value={selectedFiscalYear}
                      onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                    >
                      {[2024, 2025, 2026, 2027].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingObjective(null); setShowObjectiveForm(true); }}
                      style={{
                        ...styles.button,
                        backgroundColor: t.success,
                        color: 'white'
                      }}
                    >
                      + Nuevo Objetivo
                    </button>
                  )}
                </div>

                {/* Objectives Tree View */}
                <div style={styles.card}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
                    Cascadeo de Objetivos QCTSP - {selectedFiscalYear}
                  </h3>

                  {objectivesTree.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: t.textMuted,
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: `2px dashed ${t.border}`
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></span>
                      <p style={{ margin: 0, fontSize: '15px' }}>No hay objetivos para {selectedFiscalYear}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Crea el primer objetivo organizacional</p>
                    </div>
                  ) : (
                    <ObjectivesTreeView
                      tree={objectivesTree}
                      onEdit={async (obj) => {
                        // Fetch full objective data before editing
                        const token = localStorage.getItem('token');
                        try {
                          const response = await fetch(`http://localhost:5000/workload/objectives/${obj.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const result = await response.json();
                          if (result.success) {
                            setEditingObjective(result.objective);
                          } else {
                            setEditingObjective(obj); // Fallback to tree data
                          }
                        } catch (error) {
                          setEditingObjective(obj); // Fallback to tree data
                        }
                        setShowObjectiveForm(true);
                      }}
                      onDelete={async (obj) => {
                        if (!window.confirm(`¿Eliminar objetivo "${obj.name}"?`)) return;
                        const token = localStorage.getItem('token');
                        try {
                          const response = await fetch(`http://localhost:5000/workload/objectives/${obj.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const result = await response.json();
                          if (result.success) {
                            showSuccess('Objetivo eliminado');
                            fetchObjectivesTree();
                            fetchObjectives();
                          } else {
                            showError(result.message || 'Error al eliminar');
                          }
                        } catch (error) {
                          showError('Error al eliminar objetivo');
                        }
                      }}
                      onRefresh={() => { fetchObjectivesTree(); fetchObjectives(); }}
                    />
                  )}
                </div>

                {/* Objective Form Modal */}
                {showObjectiveForm && (
                  <ObjectiveFormModal
                    objective={editingObjective}
                    objectives={objectives}
                    users={users}
                    kpis={kpis}
                    fiscalYear={selectedFiscalYear}
                    onClose={() => { setShowObjectiveForm(false); setEditingObjective(null); }}
                    onSave={async (data) => {
                      const token = localStorage.getItem('token');
                      const url = editingObjective
                        ? `http://localhost:5000/workload/objectives/${editingObjective.id}`
                        : 'http://localhost:5000/workload/objectives';
                      const method = editingObjective ? 'PUT' : 'POST';

                      try {
                        const response = await fetch(url, {
                          method,
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({ ...data, fiscalYear: selectedFiscalYear })
                        });
                        const result = await response.json();
                        if (result.success) {
                          showSuccess(editingObjective ? 'Objetivo actualizado' : 'Objetivo creado');
                          setShowObjectiveForm(false);
                          setEditingObjective(null);
                          fetchObjectivesTree();
                          fetchObjectives();
                        } else {
                          showError(result.message || 'Error al guardar');
                        }
                      } catch (error) {
                        showError('Error al guardar objetivo');
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* SUB-TAB: Feedback */}
            {teamSubTab === 'feedback' && (
              <>
                {/* Header with period selector, person filter and add button */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', color: t.text }}>Período:</span>
                    <select
                      style={{ ...styles.select, width: '100px' }}
                      value={selectedFiscalYear}
                      onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                    >
                      {[2024, 2025, 2026, 2027].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4].map(q => (
                        <button
                          key={q}
                          onClick={() => setSelectedQuarter(q)}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: selectedQuarter === q ? t.accent : t.bgPanel,
                            color: selectedQuarter === q ? 'white' : t.text
                          }}
                        >
                          Q{q}
                        </button>
                      ))}
                    </div>
                    <div style={{ borderLeft: `1px solid ${t.border}`, paddingLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600', color: t.text }}>Persona:</span>
                      <select
                        style={{ ...styles.select, width: '180px' }}
                        value={feedbackPersonFilter}
                        onChange={(e) => setFeedbackPersonFilter(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {(subordinates.subordinates || []).map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.firstName} {sub.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingFeedback(null); setShowFeedbackForm(true); }}
                      style={{
                        ...styles.button,
                        backgroundColor: t.success,
                        color: 'white'
                      }}
                    >
                      + Nueva Evaluación
                    </button>
                  )}
                </div>

                {/* Feedback List */}
                <div style={styles.card}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
                    Evaluaciones Q{selectedQuarter} {selectedFiscalYear}
                  </h3>

                  {(() => {
                    const filteredFeedbackList = feedbackPersonFilter
                      ? feedbackList.filter(fb => String(fb.employee?.id || fb.employeeId) === feedbackPersonFilter)
                      : feedbackList;
                    return filteredFeedbackList.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: t.textMuted,
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: `2px dashed ${t.border}`
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></span>
                      <p style={{ margin: 0, fontSize: '15px' }}>No hay evaluaciones para Q{selectedQuarter} {selectedFiscalYear}{feedbackPersonFilter && ' para esta persona'}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Inicia una nueva evaluación de desempeño</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredFeedbackList.map(fb => (
                        <div key={fb.id} style={{
                          padding: '16px',
                          backgroundColor: t.bgCard,
                          borderRadius: '8px',
                          border: `1px solid ${t.border}`,
                          borderLeft: `4px solid ${
                            fb.status === 'completed' ? t.success :
                            fb.status === 'pending_signature' ? t.warning :
                            fb.status === 'in_review' ? t.accent : t.textMuted
                          }`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '600', fontSize: '15px' }}>
                                  {fb.employee?.name}
                                </span>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  backgroundColor:
                                    fb.status === 'completed' ? `${t.success}15` :
                                    fb.status === 'pending_signature' ? `${t.warning}15` :
                                    fb.status === 'in_review' ? `${t.accent}15` : t.bg,
                                  color:
                                    fb.status === 'completed' ? t.success :
                                    fb.status === 'pending_signature' ? t.warning :
                                    fb.status === 'in_review' ? t.primary : t.textMuted
                                }}>
                                  {fb.status === 'completed' ? 'Completada' :
                                   fb.status === 'pending_signature' ? 'Pendiente Firma' :
                                   fb.status === 'in_review' ? 'En Revisión' : 'Borrador'}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: t.textMuted }}>
                                {fb.employee?.position} - {fb.employee?.department}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {fb.overallScore > 0 && (
                                <div style={{
                                  fontSize: '24px',
                                  fontWeight: '600',
                                  color: fb.overallScore >= 80 ? t.success :
                                         fb.overallScore >= 60 ? t.warning : t.error
                                }}>
                                  {fb.overallScore.toFixed(0)}%
                                </div>
                              )}
                              {(canEdit || fb.status !== 'draft') && (
                                <button
                                  onClick={() => { setEditingFeedback(fb); setShowFeedbackForm(true); }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: t.bgPanel,
                                    border: `1px solid ${t.border}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: t.text
                                  }}
                                >
                                  {fb.status === 'draft' ? 'Editar' : 'Ver'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick metrics */}
                          <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            gap: '24px',
                            fontSize: '12px',
                            color: t.textMuted
                          }}>
                            <span> Actividades: {fb.activitiesCompleted}/{fb.activitiesPlanned}</span>
                            <span> Horas: {fb.hoursActual.toFixed(1)}/{fb.hoursPlanned.toFixed(1)}</span>
                            <span> Cumplimiento: {fb.completionRate.toFixed(0)}%</span>
                            {fb.employeeSignature && <span> Firmado por empleado</span>}
                            {fb.reviewerSignature && <span> Firmado por evaluador</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                  })()}
                </div>

                {/* Feedback Form Modal */}
                {showFeedbackForm && (
                  <FeedbackFormModal
                    feedback={editingFeedback}
                    users={users}
                    fiscalYear={selectedFiscalYear}
                    fiscalQuarter={selectedQuarter}
                    onClose={() => { setShowFeedbackForm(false); setEditingFeedback(null); }}
                    onSave={async (data) => {
                      const token = localStorage.getItem('token');
                      const url = editingFeedback
                        ? `http://localhost:5000/workload/feedback/${editingFeedback.id}`
                        : 'http://localhost:5000/workload/feedback';
                      const method = editingFeedback ? 'PUT' : 'POST';

                      try {
                        const response = await fetch(url, {
                          method,
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify(data)
                        });
                        const result = await response.json();
                        if (result.success) {
                          showSuccess(editingFeedback ? 'Evaluación actualizada' : 'Evaluación iniciada');
                          setShowFeedbackForm(false);
                          setEditingFeedback(null);
                          fetchFeedback();
                        } else {
                          showError(result.message || 'Error al guardar');
                        }
                      } catch (error) {
                        showError('Error al guardar evaluación');
                      }
                    }}
                    onSign={async (signatureType) => {
                      if (!editingFeedback) return;
                      const token = localStorage.getItem('token');
                      try {
                        const response = await fetch(
                          `http://localhost:5000/workload/feedback/${editingFeedback.id}/sign`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ signatureType })
                          }
                        );
                        const result = await response.json();
                        if (result.success) {
                          showSuccess(result.message);
                          fetchFeedback();
                          setShowFeedbackForm(false);
                        } else {
                          showError(result.message);
                        }
                      } catch (error) {
                        showError('Error al firmar');
                      }
                    }}
                  />
                )}

                {/* Supervisor Quick Feedback Log */}
                <div style={{ ...styles.card, marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                       Log de Feedback Rápido
                    </h3>
                    <button
                      onClick={() => { setSelectedActivityForFeedback(null); setShowSupervisorFeedbackModal(true); }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: t.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      + Agregar Feedback
                    </button>
                  </div>

                  {(() => {
                    const filteredQuickFeedback = feedbackPersonFilter
                      ? allSupervisorFeedback.filter(fb => String(fb.employee?.id || fb.employeeId) === feedbackPersonFilter)
                      : allSupervisorFeedback;
                    return filteredQuickFeedback.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: t.textMuted,
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: `2px dashed ${t.border}`
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></span>
                      <p style={{ margin: 0, fontSize: '15px' }}>No hay feedback registrado{feedbackPersonFilter && ' para esta persona'}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                        Usa el botón de feedback () en las actividades o el botón de arriba
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredQuickFeedback.map(fb => {
                        const typeConfig = {
                          recognition: { icon: '', color: t.success, label: 'Felicitación', bg: `${t.success}15` },
                          warning: { icon: '', color: t.warning, label: 'Llamada de atención', bg: `${t.warning}15` },
                          coaching: { icon: '', color: t.accent, label: 'Retroalimentación', bg: `${t.accent}15` },
                          achievement: { icon: '', color: t.accent, label: 'Logro destacado', bg: `${t.accent}15` },
                          improvement_needed: { icon: '', color: t.error, label: 'Área de mejora', bg: `${t.error}15` },
                          note: { icon: '', color: t.textMuted, label: 'Nota general', bg: t.bgPanel }
                        }[fb.feedbackType] || { icon: '', color: t.textMuted, label: 'Nota', bg: t.bgPanel };

                        return (
                          <div key={fb.id} style={{
                            padding: '16px',
                            backgroundColor: t.bgCard,
                            borderRadius: '8px',
                            border: `1px solid ${t.border}`,
                            borderLeft: `4px solid ${typeConfig.color}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: typeConfig.bg,
                                    color: typeConfig.color
                                  }}>
                                    {typeConfig.icon} {typeConfig.label}
                                  </span>
                                  {fb.title && (
                                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{fb.title}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '14px', color: t.text, marginBottom: '8px' }}>
                                  {fb.comment}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: t.textMuted }}>
                                  <span> Para: <strong>{fb.employee?.firstName} {fb.employee?.lastName}</strong></span>
                                  {fb.activityTitle && (
                                    <span> Actividad: {fb.activityTitle}</span>
                                  )}
                                  {fb.severity && (
                                    <span style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: fb.severity === 'high' ? `${t.error}15` : fb.severity === 'medium' ? `${t.warning}15` : t.bg,
                                      color: fb.severity === 'high' ? t.error : fb.severity === 'medium' ? t.warning : t.textMuted
                                    }}>
                                      Severidad: {fb.severity === 'high' ? 'Alta' : fb.severity === 'medium' ? 'Media' : 'Baja'}
                                    </span>
                                  )}
                                </div>
                                {fb.requiresFollowup && (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '6px 10px',
                                    backgroundColor: `${t.warning}10`,
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: t.warning
                                  }}>
                                     Requiere seguimiento
                                    {fb.followupDate && ` - Fecha: ${new Date(fb.followupDate).toLocaleDateString('es-MX')}`}
                                    {fb.followupCompleted && '  Completado'}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: t.textDim, textAlign: 'right' }}>
                                {new Date(fb.createdAt).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                  })()}
                </div>
              </>
            )}

            {/* SUB-TAB: Coberturas */}
            {teamSubTab === 'coverage' && (
              <>
                {/* Header */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>Gestión de Coberturas</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textMuted }}>
                      Administra vacaciones, incapacidades y asignaciones temporales
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingCoverage(null); setShowCoverageModal(true); }}
                      style={{
                        ...styles.button,
                        backgroundColor: t.success,
                        color: 'white'
                      }}
                    >
                      + Nueva Cobertura
                    </button>
                  )}
                </div>

                {/* Active Coverages Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {/* Coverages for me (someone covering my work) */}
                  <div style={styles.card}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.success }}>
                       Mis Ausencias Cubiertas ({activeCoverages.coveringForMe?.length || 0})
                    </h4>
                    {activeCoverages.coveringForMe?.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>No tienes coberturas activas</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeCoverages.coveringForMe?.map(cov => (
                          <div key={cov.id} style={{
                            padding: '10px 12px',
                            backgroundColor: `${t.success}10`,
                            borderRadius: '6px',
                            border: '1px solid ${t.success}40'
                          }}>
                            <div style={{ fontWeight: '500', fontSize: '13px' }}>
                              Cubierto por: {cov.substitute?.firstName} {cov.substitute?.lastName}
                            </div>
                            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                              {new Date(cov.startDate).toLocaleDateString()} - {new Date(cov.endDate).toLocaleDateString()}
                              <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>({cov.reason?.replace('_', ' ')})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Coverages I'm providing */}
                  <div style={styles.card}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: t.accent }}>
                       Estoy Cubriendo ({activeCoverages.iAmCovering?.length || 0})
                    </h4>
                    {activeCoverages.iAmCovering?.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>No estás cubriendo a nadie</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeCoverages.iAmCovering?.map(cov => (
                          <div key={cov.id} style={{
                            padding: '10px 12px',
                            backgroundColor: `${t.info}10`,
                            borderRadius: '6px',
                            border: '1px solid ${t.accent}40'
                          }}>
                            <div style={{ fontWeight: '500', fontSize: '13px' }}>
                              Cubriendo a: {cov.originalAssignee?.firstName} {cov.originalAssignee?.lastName}
                            </div>
                            <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                              {new Date(cov.startDate).toLocaleDateString()} - {new Date(cov.endDate).toLocaleDateString()}
                              <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>({cov.reason?.replace('_', ' ')})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* All Coverages List */}
                <div style={styles.card}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Todas las Coberturas
                  </h3>

                  {coverageList.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: t.textMuted,
                      backgroundColor: t.bg,
                      borderRadius: '8px',
                      border: `2px dashed ${t.border}`
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></span>
                      <p style={{ margin: 0, fontSize: '15px' }}>No hay coberturas registradas</p>
                      <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Crea una cobertura para vacaciones o ausencias</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {coverageList.map(cov => (
                        <div key={cov.id} style={{
                          padding: '16px',
                          backgroundColor: t.bgCard,
                          borderRadius: '8px',
                          border: `1px solid ${t.border}`,
                          borderLeft: `4px solid ${
                            cov.status === 'active' ? t.success :
                            cov.status === 'pending' ? t.warning :
                            cov.status === 'completed' ? t.textMuted : t.error
                          }`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                  {cov.originalAssignee?.firstName} {cov.originalAssignee?.lastName}
                                </span>
                                <span style={{ color: t.textDim }}>→</span>
                                <span style={{ fontWeight: '500', fontSize: '14px', color: t.accent }}>
                                  {cov.substitute?.firstName} {cov.substitute?.lastName}
                                </span>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  backgroundColor:
                                    cov.status === 'active' ? `${t.success}15` :
                                    cov.status === 'pending' ? `${t.warning}15` :
                                    cov.status === 'completed' ? t.bg : `${t.error}15`,
                                  color:
                                    cov.status === 'active' ? t.success :
                                    cov.status === 'pending' ? t.warning :
                                    cov.status === 'completed' ? t.textMuted : t.error
                                }}>
                                  {cov.status === 'active' ? 'Activa' :
                                   cov.status === 'pending' ? 'Pendiente' :
                                   cov.status === 'completed' ? 'Completada' : 'Cancelada'}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: t.textMuted }}>
                                <span style={{ textTransform: 'capitalize' }}>{cov.reason?.replace('_', ' ')}</span>
                                {cov.reasonNotes && ` - ${cov.reasonNotes}`}
                              </div>
                              <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
                                 {new Date(cov.startDate).toLocaleDateString()} - {new Date(cov.endDate).toLocaleDateString()}
                                {cov.activity && (
                                  <span style={{ marginLeft: '12px' }}>
                                     Actividad: {cov.activity?.title}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {cov.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(`http://localhost:5000/workload/coverage/${cov.id}/approve`, {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      const result = await response.json();
                                      if (result.success) {
                                        showSuccess('Cobertura aprobada');
                                        fetchCoverageList();
                                        fetchActiveCoverages();
                                      } else {
                                        showError(result.message);
                                      }
                                    } catch (error) {
                                      showError('Error al aprobar');
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: t.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                   Aprobar
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => { setEditingCoverage(cov); setShowCoverageModal(true); }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: t.bgCard,
                                    color: t.accent,
                                    border: `1px solid ${t.accent}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Editar
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm('¿Eliminar esta cobertura?')) return;
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`http://localhost:5000/workload/coverage/${cov.id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    const result = await response.json();
                                    if (result.success) {
                                      showSuccess('Cobertura eliminada');
                                      fetchCoverageList();
                                      fetchActiveCoverages();
                                    } else {
                                      showError(result.message);
                                    }
                                  } catch (error) {
                                    showError('Error al eliminar');
                                  }
                                }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: t.bgCard,
                                    color: t.error,
                                    border: '1px solid ${t.error}',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coverage Modal */}
                {showCoverageModal && (
                  <CoverageFormModal
                    coverage={editingCoverage}
                    users={subordinates.subordinates || []}
                    activities={activities}
                    onClose={() => { setShowCoverageModal(false); setEditingCoverage(null); }}
                    onSave={async (coverageData) => {
                      if (editingCoverage) {
                        await handleUpdateCoverage(editingCoverage.id, coverageData);
                      } else {
                        await handleCreateCoverage(coverageData);
                      }
                      setShowCoverageModal(false);
                      setEditingCoverage(null);
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <>
            {/* KPIs Config */}
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                KPIs Configurados
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {kpis.map(kpi => (
                  <div key={kpi.id} style={{
                    padding: '16px',
                    backgroundColor: t.bg,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${kpi.color}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{kpi.icon}</div>
                    <div style={{ fontWeight: '600', color: t.text }}>{kpi.code}</div>
                    <div style={{ fontSize: '13px', color: t.textMuted }}>{kpi.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Config */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                   Proyectos ({projects.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={() => { setEditingProject(null); setProjectClientMode('select'); setSelectedProjectClientId(null); setClientProjectsList([]); setProjectNameMode('select'); setShowProjectForm(true); }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: t.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    + Nuevo Proyecto
                  </button>
                )}
              </div>

              {/* Project Form */}
              {showProjectForm && (
                <div style={{
                  padding: '16px',
                  marginBottom: '16px',
                  backgroundColor: `${t.success}10`,
                  borderRadius: '8px',
                  border: '1px solid ${t.success}60'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                    {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                  </h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    // Handle client: get name from id or custom input
                    const clientSelectVal = formData.get('clientSelect');
                    const clientCustom = formData.get('clientCustom');
                    let clientName = null;
                    if (clientSelectVal === '__other__') {
                      clientName = clientCustom;
                    } else if (clientSelectVal) {
                      const selectedClient = systemClients.find(c => c.id === parseInt(clientSelectVal));
                      clientName = selectedClient?.name || null;
                    }
                    // Handle project name: from select, custom input, or direct input
                    const projectSelect = formData.get('projectSelect');
                    const projectCustom = formData.get('projectCustom');
                    const projectDirect = formData.get('name'); // For when client is custom
                    let projectName = null;
                    if (projectDirect) {
                      projectName = projectDirect;
                    } else if (projectSelect === '__other__') {
                      projectName = projectCustom;
                    } else {
                      projectName = projectSelect;
                    }
                    if (!projectName) {
                      showError('Por favor selecciona o escribe un nombre de proyecto');
                      return;
                    }
                    const data = {
                      name: projectName,
                      description: formData.get('description'),
                      client: clientName,
                      status: formData.get('status'),
                      color: formData.get('color')
                    };
                    const token = localStorage.getItem('token');
                    try {
                      const response = await fetch('http://localhost:5000/workload/projects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(data)
                      });
                      const result = await response.json();
                      if (result.success) {
                        showSuccess('Proyecto creado');
                        setShowProjectForm(false);
                        setProjectClientMode('select');
                        setSelectedProjectClientId(null);
                        setClientProjectsList([]);
                        setProjectNameMode('select');
                        // Refresh projects
                        const projRes = await fetch('http://localhost:5000/workload/projects', {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        const projData = await projRes.json();
                        setProjects(projData.projects || []);
                      } else {
                        showError(result.message || 'Error al crear proyecto');
                      }
                    } catch (error) {
                      showError('Error al crear proyecto');
                    }
                  }}>
                    {/* Cliente */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Cliente *</label>
                      <select
                        name="clientSelect"
                        defaultValue={editingProject?.client ? (systemClients.find(c => c.name === editingProject.client)?.id || '__other__') : ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val === '__other__') {
                            setProjectClientMode('custom');
                            setSelectedProjectClientId(null);
                            setClientProjectsList([]);
                            setProjectNameMode('custom');
                          } else if (val) {
                            setProjectClientMode('select');
                            setSelectedProjectClientId(val);
                            setProjectNameMode('select');
                            // Fetch projects for this client
                            try {
                              const token = localStorage.getItem('token');
                              const res = await fetch(`http://localhost:5000/clients/${val}/projects`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              const data = await res.json();
                              setClientProjectsList(data.projects || []);
                            } catch (err) {
                              console.error('Error fetching client projects:', err);
                              setClientProjectsList([]);
                            }
                          } else {
                            setProjectClientMode('select');
                            setSelectedProjectClientId(null);
                            setClientProjectsList([]);
                          }
                        }}
                        style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                      >
                        <option value="">-- Seleccionar cliente --</option>
                        {systemClients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                        <option value="__other__"> Otro (escribir manualmente)</option>
                      </select>
                      {projectClientMode === 'custom' && (
                        <input
                          name="clientCustom"
                          defaultValue={editingProject?.client && !systemClients.some(c => c.name === editingProject.client) ? editingProject.client : ''}
                          style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box', marginTop: '8px' }}
                          placeholder="Escribir nombre del cliente..."
                        />
                      )}
                    </div>

                    {/* Proyecto del Cliente */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                        Proyecto {selectedProjectClientId ? `(${clientProjectsList.length} proyectos del cliente)` : ''} *
                      </label>
                      {projectClientMode === 'custom' ? (
                        <input
                          name="name"
                          required
                          defaultValue={editingProject?.name || ''}
                          style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                          placeholder="Nombre del proyecto..."
                        />
                      ) : (
                        <>
                          <select
                            name="projectSelect"
                            defaultValue={editingProject?.name || ''}
                            onChange={(e) => {
                              if (e.target.value === '__other__') {
                                setProjectNameMode('custom');
                              } else {
                                setProjectNameMode('select');
                              }
                            }}
                            style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                          >
                            <option value="">-- Seleccionar proyecto --</option>
                            {clientProjectsList.map(proj => (
                              <option key={proj.id} value={proj.projectName}>
                                {proj.projectNumber} - {proj.projectName}
                              </option>
                            ))}
                            <option value="__other__"> Otro (escribir manualmente)</option>
                          </select>
                          {projectNameMode === 'custom' && (
                            <input
                              name="projectCustom"
                              defaultValue=""
                              style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box', marginTop: '8px' }}
                              placeholder="Escribir nombre del proyecto..."
                            />
                          )}
                        </>
                      )}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Descripción</label>
                      <textarea
                        name="description"
                        defaultValue={editingProject?.description || ''}
                        style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box', minHeight: '60px' }}
                        placeholder="Descripción del proyecto..."
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Estado</label>
                        <select
                          name="status"
                          defaultValue={editingProject?.status || 'active'}
                          style={{ width: '100%', padding: '8px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                          <option value="active">Activo</option>
                          <option value="on_hold">En Pausa</option>
                          <option value="completed">Completado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Color</label>
                        <input
                          name="color"
                          type="color"
                          defaultValue={editingProject?.color || t.accent}
                          style={{ width: '100%', height: '38px', padding: '2px', border: `1px solid ${t.border}`, borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => { setShowProjectForm(false); setProjectClientMode('select'); setSelectedProjectClientId(null); setClientProjectsList([]); setProjectNameMode('select'); }}
                        style={{ padding: '8px 16px', backgroundColor: t.bgPanel, border: 'none', borderRadius: '6px', cursor: 'pointer', color: t.text }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: t.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {projects.length === 0 && !showProjectForm ? (
                <p style={{ color: t.textMuted, textAlign: 'center', padding: '20px' }}>
                  No hay proyectos configurados. Crea uno para agrupar actividades.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {projects.map(project => (
                    <div key={project.id} style={{
                      padding: '12px 16px',
                      backgroundColor: t.bg,
                      borderRadius: '6px',
                      borderLeft: `4px solid ${project.color || t.accent}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600' }}>{project.name}</span>
                        {project.client && (
                          <span style={{ color: t.textMuted, marginLeft: '12px', fontSize: '13px' }}>
                             {project.client}
                          </span>
                        )}
                        {project.description && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textMuted }}>
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: project.status === 'active' ? `${t.success}15` :
                                          project.status === 'completed' ? `${t.accent}15` : t.bg,
                          color: project.status === 'active' ? t.success :
                                project.status === 'completed' ? t.primary : t.textMuted
                        }}>
                          {project.status === 'active' ? 'Activo' :
                           project.status === 'completed' ? 'Completado' :
                           project.status === 'on_hold' ? 'En Pausa' : 'Cancelado'}
                        </span>
                        {canEdit && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar proyecto "${project.name}"?`)) return;
                              const token = localStorage.getItem('token');
                              try {
                                const response = await fetch(`http://localhost:5000/workload/projects/${project.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const result = await response.json();
                                if (result.success) {
                                  showSuccess('Proyecto eliminado');
                                  setProjects(projects.filter(p => p.id !== project.id));
                                } else {
                                  showError(result.message || 'Error al eliminar');
                                }
                              } catch (error) {
                                showError('Error al eliminar proyecto');
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: `${t.error}15`,
                              color: t.error,
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Activities */}
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                Actividades Recurrentes ({recurring.length})
              </h3>
              {recurring.length === 0 ? (
                <p style={{ color: t.textMuted }}>No hay actividades recurrentes configuradas</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recurring.map(rec => (
                    <div key={rec.id} style={{
                      padding: '12px 16px',
                      backgroundColor: t.bg,
                      borderRadius: '6px',
                      borderLeft: `4px solid ${rec.kpi_color || t.textMuted}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: '600' }}>{rec.name}</span>
                          <span style={{ color: t.textMuted, marginLeft: '12px', fontSize: '13px' }}>
                            {rec.kpi_name} • {rec.frequency} • {rec.estimated_hours}h
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', color: t.textMuted }}>
                          → {rec.assigned_to_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hierarchy Levels Config */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  Niveles Jerárquicos ({hierarchyLevels.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingLevel(null);
                      setShowLevelForm(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: t.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    + Agregar Nivel
                  </button>
                )}
              </div>
              <p style={{ color: t.textMuted, fontSize: '13px', marginBottom: '16px' }}>
                Define los niveles de tu estructura organizacional. El orden determina la jerarquía (0 = más alto).
              </p>
              {hierarchyLevels.length === 0 ? (
                <p style={{ color: t.textMuted }}>No hay niveles configurados</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...hierarchyLevels].sort((a, b) => a.levelOrder - b.levelOrder).map(level => (
                    <div key={level.id} style={{
                      padding: '12px 16px',
                      backgroundColor: t.bg,
                      borderRadius: '6px',
                      borderLeft: `4px solid ${level.color || t.textMuted}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: level.color || t.textMuted,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {level.levelOrder}
                        </span>
                        <div>
                          <div style={{ fontWeight: '600' }}>{level.name}</div>
                          {level.description && (
                            <div style={{ fontSize: '12px', color: t.textMuted }}>{level.description}</div>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingLevel(level);
                              setShowLevelForm(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: t.bgCard,
                              color: t.accent,
                              border: `1px solid ${t.accent}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar nivel "${level.name}"?`)) return;
                              try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`http://localhost:5000/workload/hierarchy-levels/${level.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const result = await response.json();
                                if (result.success) {
                                  showSuccess('Nivel eliminado');
                                  fetchData();
                                } else {
                                  showError(result.message);
                                }
                              } catch (error) {
                                showError('Error al eliminar');
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: t.bgCard,
                              color: t.error,
                              border: '1px solid ${t.error}',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hierarchy Level Form Modal */}
            {showLevelForm && (
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
                  borderRadius: '12px',
                  padding: '24px',
                  width: '90%',
                  maxWidth: '450px',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ margin: '0 0 20px 0' }}>
                    {editingLevel ? 'Editar Nivel Jerárquico' : 'Nuevo Nivel Jerárquico'}
                  </h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const data = {
                      levelOrder: parseInt(formData.get('levelOrder')),
                      name: formData.get('name'),
                      color: formData.get('color'),
                      description: formData.get('description') || null
                    };
                    try {
                      const token = localStorage.getItem('token');
                      const url = editingLevel
                        ? `http://localhost:5000/workload/hierarchy-levels/${editingLevel.id}`
                        : 'http://localhost:5000/workload/hierarchy-levels';
                      const response = await fetch(url, {
                        method: editingLevel ? 'PUT' : 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(data)
                      });
                      const result = await response.json();
                      if (result.success) {
                        showSuccess(editingLevel ? 'Nivel actualizado' : 'Nivel creado');
                        setShowLevelForm(false);
                        fetchData();
                      } else {
                        showError(result.message);
                      }
                    } catch (error) {
                      showError('Error al guardar');
                    }
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                        Orden (0 = más alto)
                      </label>
                      <input
                        name="levelOrder"
                        type="number"
                        min="0"
                        defaultValue={editingLevel?.levelOrder ?? hierarchyLevels.length}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                        Nombre del Nivel
                      </label>
                      <input
                        name="name"
                        type="text"
                        defaultValue={editingLevel?.name || ''}
                        placeholder="Ej: Director, Gerente, Supervisor..."
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                        Color
                      </label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          name="color"
                          type="color"
                          defaultValue={editingLevel?.color || t.textMuted}
                          style={{
                            width: '50px',
                            height: '40px',
                            padding: '2px',
                            border: `1px solid ${t.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ color: t.textMuted, fontSize: '13px' }}>
                          Selecciona un color para identificar este nivel
                        </span>
                      </div>
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                        Descripción (opcional)
                      </label>
                      <textarea
                        name="description"
                        defaultValue={editingLevel?.description || ''}
                        placeholder="Descripción del nivel jerárquico..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowLevelForm(false)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: t.bgPanel,
                          color: t.text,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        style={{
                          padding: '10px 20px',
                          backgroundColor: t.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {editingLevel ? 'Guardar Cambios' : 'Crear Nivel'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Supervisor Feedback Modal - Available in all tabs */}
        {showSupervisorFeedbackModal && (
          <SupervisorFeedbackModal
            activity={selectedActivityForFeedback}
            users={subordinates.subordinates || []}
            onClose={() => { setShowSupervisorFeedbackModal(false); setSelectedActivityForFeedback(null); }}
            onSave={async (feedbackData) => {
              await handleCreateSupervisorFeedback(feedbackData);
              setShowSupervisorFeedbackModal(false);
              setSelectedActivityForFeedback(null);
              // Refresh the feedback list
              fetchAllSupervisorFeedback();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default WorkloadManager;
