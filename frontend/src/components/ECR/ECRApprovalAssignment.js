import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const ECRApprovalAssignment = ({ data, onDataUpdate, language = 'es' }) => {
  const { theme: t } = useTheme();
  const { t: tr, language: lang, changeLanguage } = useLanguage();
  const [users, setUsers] = useState([]);
  const [approvers, setApprovers] = useState({
    level1: data.approvers?.level1 || null,
    level2: data.approvers?.level2 || null,
    level3: data.approvers?.level3 || null
  });

  const [activeCell, setActiveCell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/users/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
      } catch (error) {
        console.error(' Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Update parent when approvers change
  useEffect(() => {
    onDataUpdate({ approvers });
  }, [approvers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeCell && !event.target.closest('.approver-cell') && !event.target.closest('.approver-dropdown')) {
        setActiveCell(null);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCell]);

  const handleCellClick = (level) => {
    setActiveCell(level);
    setSearchTerm('');
  };

  const handleSelectUser = (level, user) => {
    setApprovers(prev => ({
      ...prev,
      [level]: user.id
    }));
    setActiveCell(null);
    setSearchTerm('');
  };

  const handleRemoveUser = (level) => {
    setApprovers(prev => ({
      ...prev,
      [level]: null
    }));
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const position = (user.position || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || position.includes(search);
  });

  const getLevelTitle = (level) => {
    if (language === 'es') {
      switch(level) {
        case 'level1': return 'Aprobador 1';
        case 'level2': return 'Aprobador 2';
        case 'level3': return 'Aprobador 3';
        default: return level;
      }
    } else {
      switch(level) {
        case 'level1': return 'Approver 1';
        case 'level2': return 'Approver 2';
        case 'level3': return 'Approver 3';
        default: return level;
      }
    }
  };

  const styles = getStyles(t);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}> {language === 'es' ? 'Asignación de Equipo de Aprobadores' : 'Approver Team Assignment'}</h3>
      <p style={styles.subtitle}>
        {language === 'es' ? 'Asigna los aprobadores secuenciales que revisarán este ECR en la fase de validación' : 'Assign the sequential approvers who will review this ECR in the validation phase'}
      </p>

      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          {language === 'es'
            ? 'ℹ Los aprobadores serán notificados secuencialmente. El proceso comenzará con el Nivel 1, y solo avanzará al siguiente nivel si el anterior aprueba.'
            : 'ℹ Approvers will be notified sequentially. The process will start with Level 1, and will only advance to the next level if the previous one approves.'}
        </p>
      </div>

      <div style={styles.approversGrid}>
        {['level1', 'level2', 'level3'].map((level) => {
          const user = getUserById(approvers[level]);
          const isActive = activeCell === level;

          return (
            <div key={level} style={styles.approverCard}>
              <div style={styles.cardHeader}>
                <h4 style={styles.cardTitle}>{getLevelTitle(level)}</h4>
                <span style={styles.levelBadge}>
                  {level === 'level1' ? '' : level === 'level2' ? '' : ''}
                </span>
              </div>

              {/* User Selection Cell */}
              <div
                className="approver-cell"
                style={{
                  ...styles.userCell,
                  borderColor: isActive ? t.accent : t.border
                }}
                onClick={() => !user && handleCellClick(level)}
              >
                {user ? (
                  <div style={styles.selectedUser}>
                    <div style={styles.userInfo}>
                      <div style={styles.userAvatar}>
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </div>
                      <div>
                        <div style={styles.userName}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={styles.userPosition}>{user.position}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUser(level);
                      }}
                      style={styles.removeButton}
                      title={language === 'es' ? 'Remover usuario' : 'Remove user'}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={styles.emptyCell}>
                    {isActive ? (
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'es' ? 'Buscar por nombre o puesto...' : 'Search by name or position...'}
                        style={styles.searchInput}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span style={styles.placeholderText}>
                        {language === 'es' ? '+ Seleccionar Aprobador' : '+ Select Approver'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Results */}
              {isActive && !user && (
                <div className="approver-dropdown" style={styles.dropdown}>
                  {filteredUsers.length > 0 ? (
                    <div style={styles.userList}>
                      {filteredUsers.map(u => (
                        <div
                          key={u.id}
                          style={styles.userOption}
                          onClick={() => handleSelectUser(level, u)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F6F8'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={styles.userAvatar}>
                            {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                          </div>
                          <div>
                            <div style={styles.userName}>
                              {u.firstName} {u.lastName}
                            </div>
                            <div style={styles.userPosition}>{u.position}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.noResults}>
                      {language === 'es' ? 'No se encontraron usuarios' : 'No users found'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {(approvers.level1 || approvers.level2 || approvers.level3) && (
        <div style={styles.summary}>
          <h4 style={styles.summaryTitle}>{language === 'es' ? 'Resumen del Flujo de Aprobación' : 'Approval Flow Summary'}</h4>
          <div style={styles.flowSteps}>
            {approvers.level1 && (
              <div style={styles.flowStep}>
                <div style={styles.stepNumber}>1</div>
                <div>
                  <div style={styles.stepTitle}>
                    {getUserById(approvers.level1)?.firstName} {getUserById(approvers.level1)?.lastName}
                  </div>
                  <div style={styles.stepSubtitle}>{language === 'es' ? 'Aprobador 1' : 'Approver 1'}</div>
                </div>
              </div>
            )}
            {approvers.level1 && approvers.level2 && <div style={styles.arrow}>→</div>}
            {approvers.level2 && (
              <div style={styles.flowStep}>
                <div style={styles.stepNumber}>2</div>
                <div>
                  <div style={styles.stepTitle}>
                    {getUserById(approvers.level2)?.firstName} {getUserById(approvers.level2)?.lastName}
                  </div>
                  <div style={styles.stepSubtitle}>{language === 'es' ? 'Aprobador 2' : 'Approver 2'}</div>
                </div>
              </div>
            )}
            {approvers.level2 && approvers.level3 && <div style={styles.arrow}>→</div>}
            {approvers.level3 && (
              <div style={styles.flowStep}>
                <div style={styles.stepNumber}>3</div>
                <div>
                  <div style={styles.stepTitle}>
                    {getUserById(approvers.level3)?.firstName} {getUserById(approvers.level3)?.lastName}
                  </div>
                  <div style={styles.stepSubtitle}>{language === 'es' ? 'Aprobador 3' : 'Approver 3'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getStyles = (t) => ({
  container: {
    backgroundColor: t.bgCard,
    borderRadius: '8px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: t.text,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: t.textMuted,
    margin: '0 0 20px 0'
  },
  infoBox: {
    backgroundColor: t.bgPanel,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '24px'
  },
  infoText: {
    fontSize: '13px',
    color: t.primary,
    margin: 0,
    lineHeight: '1.5'
  },
  approversGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  approverCard: {
    backgroundColor: t.bgPanel,
    border: `2px solid ${t.border}`,
    borderRadius: '8px',
    padding: '16px',
    position: 'relative'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.text,
    margin: 0
  },
  levelBadge: {
    fontSize: '20px'
  },
  cardDescription: {
    fontSize: '12px',
    color: t.textMuted,
    marginBottom: '12px',
    lineHeight: '1.4'
  },
  userCell: {
    minHeight: '70px',
    border: '2px solid',
    borderRadius: '6px',
    padding: '12px',
    cursor: 'pointer',
    backgroundColor: t.bgCard,
    transition: 'all 0.2s',
    position: 'relative'
  },
  selectedUser: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: t.accent,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: t.text
  },
  userPosition: {
    fontSize: '12px',
    color: t.textMuted
  },
  removeButton: {
    backgroundColor: `${t.error}15`,
    color: t.error,
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '1',
    fontWeight: '600',
    flexShrink: 0
  },
  emptyCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  placeholderText: {
    fontSize: '14px',
    color: t.textMuted
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: 0,
    backgroundColor: 'transparent',
    color: t.text
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000
  },
  userList: {
    padding: '4px'
  },
  userOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    fontSize: '14px',
    color: t.textMuted
  },
  summary: {
    backgroundColor: `${t.success}10`,
    border: `2px solid ${t.success}50`,
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px'
  },
  summaryTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: t.success,
    margin: '0 0 16px 0'
  },
  flowSteps: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  flowStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: t.bgCard,
    padding: '12px 16px',
    borderRadius: '6px',
    border: `1px solid ${t.success}30`
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: t.success,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600'
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: t.text
  },
  stepSubtitle: {
    fontSize: '12px',
    color: t.textMuted
  },
  arrow: {
    fontSize: '20px',
    color: t.success,
    fontWeight: '600'
  }
});

export default ECRApprovalAssignment;
