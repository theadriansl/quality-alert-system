/**
 * SkillsConfig.js
 * Configuración del módulo de Skills: Escalas, Categorías, Habilidades, Perfiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getScales,
  getCategories,
  getDefinitions,
  getProfiles,
  getProfile,
  createCategory,
  updateCategory,
  deleteCategory,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  createProfile,
  updateProfileSkills
} from '../services/skillsService';

const COLORS = {
  blue: '#0072CE',
  green: '#16a34a',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const SkillsConfig = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  // Traducciones locales
  const L = {
    en: {
      title: 'Skills Configuration',
      subtitle: 'Scales, Categories, Skills and Profiles',
      modules: 'Modules',
      dashboard: 'Dashboard',
      myTeam: 'My Team',
      refresh: 'Refresh',
      // Tabs
      categories: 'Categories',
      skills: 'Skills',
      profiles: 'Profiles',
      // Messages
      errorLoading: 'Error loading data',
      categoryUpdated: 'Category updated',
      categoryCreated: 'Category created',
      categoryDisabled: 'Category disabled',
      skillUpdated: 'Skill updated',
      skillCreated: 'Skill created',
      skillDisabled: 'Skill disabled',
      profileUpdated: 'Profile updated',
      profileCreated: 'Profile created',
      errorSavingCategory: 'Error saving category',
      errorSavingSkill: 'Error saving skill',
      errorSavingProfile: 'Error saving profile',
      errorDeleting: 'Error deleting',
      noDescription: 'No description',
      // Form labels
      name: 'Name',
      code: 'Code',
      description: 'Description',
      color: 'Color',
      scale: 'Scale',
      category: 'Category',
      defaultTarget: 'Default Target',
      retrainingDays: 'Retraining Days',
      noExpiration: 'No expiration',
      // Buttons
      newCategory: 'New Category',
      newSkill: 'New Skill',
      newProfile: 'New Profile',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      // Scale levels
      skillsCount: 'skills',
      scaleDefault: 'Default',
      // Level criteria
      levelCriteria: 'Level Criteria',
      observer: 'Observer',
      underSupervision: 'Under Supervision',
      autonomous: 'Autonomous',
      instructor: 'Instructor',
      observerDesc: 'Can only observe, not execute',
      underSupervisionDesc: 'Can execute under direct supervision',
      autonomousDesc: 'Can execute autonomously',
      instructorDesc: 'Can instruct and certify others'
    },
    es: {
      title: 'Configuración de Skills',
      subtitle: 'Escalas, Categorías, Habilidades y Perfiles',
      modules: 'Módulos',
      dashboard: 'Dashboard',
      myTeam: 'Mi Equipo',
      refresh: 'Actualizar',
      // Tabs
      categories: 'Categorías',
      skills: 'Habilidades',
      profiles: 'Perfiles',
      // Messages
      errorLoading: 'Error al cargar datos',
      categoryUpdated: 'Categoría actualizada',
      categoryCreated: 'Categoría creada',
      categoryDisabled: 'Categoría desactivada',
      skillUpdated: 'Habilidad actualizada',
      skillCreated: 'Habilidad creada',
      skillDisabled: 'Habilidad desactivada',
      profileUpdated: 'Perfil actualizado',
      profileCreated: 'Perfil creado',
      errorSavingCategory: 'Error al guardar categoría',
      errorSavingSkill: 'Error al guardar habilidad',
      errorSavingProfile: 'Error al guardar perfil',
      errorDeleting: 'Error al eliminar',
      noDescription: 'Sin descripción',
      // Form labels
      name: 'Nombre',
      code: 'Código',
      description: 'Descripción',
      color: 'Color',
      scale: 'Escala',
      category: 'Categoría',
      defaultTarget: 'Target por Defecto',
      retrainingDays: 'Días Recapacitación',
      noExpiration: 'Sin vencimiento',
      // Buttons
      newCategory: 'Nueva Categoría',
      newSkill: 'Nueva Habilidad',
      newProfile: 'Nuevo Perfil',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      // Scale levels
      skillsCount: 'habilidades',
      scaleDefault: 'Por defecto',
      // Level criteria
      levelCriteria: 'Criterios por Nivel',
      observer: 'Observador',
      underSupervision: 'Bajo Supervisión',
      autonomous: 'Libre',
      instructor: 'Instructor',
      observerDesc: 'Solo puede observar, no ejecutar',
      underSupervisionDesc: 'Puede ejecutar bajo supervisión directa',
      autonomousDesc: 'Puede ejecutar de forma autónoma',
      instructorDesc: 'Puede instruir y certificar a otros'
    }
  }[language] || {};

  const [activeTab, setActiveTab] = useState('categories');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Data
  const [scales, setScales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Forms
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '', color: '#3b82f6', scaleId: '' });
  const [skillForm, setSkillForm] = useState({ name: '', code: '', description: '', defaultTarget: 3, categoryId: '',
    level1Criteria: '', level2Criteria: '', level3Criteria: '', level4Criteria: '', level5Criteria: '', retrainingDays: '' });
  const [profileForm, setProfileForm] = useState({ name: '', code: '', description: '', skills: [] });
  const [showLevelCriteria, setShowLevelCriteria] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scalesRes, categoriesRes, definitionsRes, profilesRes] = await Promise.all([
        getScales(),
        getCategories(),
        getDefinitions(),
        getProfiles()
      ]);

      setScales(scalesRes.data || []);
      setCategories(categoriesRes.data || []);
      setDefinitions(definitionsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
      setError(L.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 3000);
  };

  // ============================================================================
  // CATEGORÍAS
  // ============================================================================

  const handleSaveCategory = async () => {
    try {
      if (editingItem) {
        await updateCategory(editingItem.id, categoryForm);
        showMessage(L.categoryUpdated);
      } else {
        await createCategory(categoryForm);
        showMessage(L.categoryCreated);
      }
      setShowCategoryModal(false);
      setEditingItem(null);
      setCategoryForm({ name: '', code: '', description: '', color: '#3b82f6', scaleId: '' });
      loadData();
    } catch (err) {
      showMessage(L.errorSavingCategory, true);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Desactivar esta categoría?')) return;
    try {
      await deleteCategory(id);
      showMessage(L.categoryDisabled);
      loadData();
    } catch (err) {
      showMessage(L.errorDeleting, true);
    }
  };

  const openEditCategory = (cat) => {
    setEditingItem(cat);
    setCategoryForm({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      color: cat.color || '#3b82f6',
      scaleId: cat.scaleId || ''
    });
    setShowCategoryModal(true);
  };

  // ============================================================================
  // HABILIDADES
  // ============================================================================

  const handleSaveSkill = async () => {
    try {
      if (editingItem) {
        await updateDefinition(editingItem.id, skillForm);
        showMessage(L.skillUpdated);
      } else {
        await createDefinition(skillForm);
        showMessage(L.skillCreated);
      }
      setShowSkillModal(false);
      setEditingItem(null);
      setSkillForm({ name: '', code: '', description: '', defaultTarget: 3, categoryId: '',
        level1Criteria: '', level2Criteria: '', level3Criteria: '', level4Criteria: '', level5Criteria: '', retrainingDays: '' });
      setShowLevelCriteria(false);
      loadData();
    } catch (err) {
      showMessage(L.errorSavingSkill, true);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm('¿Desactivar esta habilidad?')) return;
    try {
      await deleteDefinition(id);
      showMessage(L.skillDisabled);
      loadData();
    } catch (err) {
      showMessage(L.errorDeleting, true);
    }
  };

  const openEditSkill = (skill) => {
    setEditingItem(skill);
    setSkillForm({
      name: skill.name,
      code: skill.code || '',
      description: skill.description || '',
      defaultTarget: skill.defaultTarget || 3,
      categoryId: skill.categoryId,
      level1Criteria: skill.level1Criteria || '',
      level2Criteria: skill.level2Criteria || '',
      level3Criteria: skill.level3Criteria || '',
      level4Criteria: skill.level4Criteria || '',
      level5Criteria: skill.level5Criteria || '',
      retrainingDays: skill.retrainingDays || ''
    });
    setShowLevelCriteria(!!(skill.level1Criteria || skill.level2Criteria || skill.level3Criteria || skill.level4Criteria || skill.level5Criteria));
    setShowSkillModal(true);
  };

  // ============================================================================
  // PERFILES
  // ============================================================================

  const handleSaveProfile = async () => {
    try {
      if (editingItem) {
        await updateProfileSkills(editingItem.id, profileForm.skills);
        showMessage(L.profileUpdated);
      } else {
        await createProfile(profileForm);
        showMessage(L.profileCreated);
      }
      setShowProfileModal(false);
      setEditingItem(null);
      setProfileForm({ name: '', code: '', description: '', skills: [] });
      loadData();
    } catch (err) {
      showMessage(L.errorSavingProfile, true);
    }
  };

  const toggleSkillInProfile = (skillId, targetLevel = 3) => {
    setProfileForm(prev => {
      const exists = prev.skills.find(s => s.skillId === skillId);
      if (exists) {
        return { ...prev, skills: prev.skills.filter(s => s.skillId !== skillId) };
      } else {
        return { ...prev, skills: [...prev.skills, { skillId, targetLevel, isRequired: true }] };
      }
    });
  };

  const updateSkillTargetInProfile = (skillId, targetLevel) => {
    setProfileForm(prev => ({
      ...prev,
      skills: prev.skills.map(s => s.skillId === skillId ? { ...s, targetLevel: parseInt(targetLevel) } : s)
    }));
  };

  const filteredDefinitions = selectedCategoryId
    ? definitions.filter(d => d.categoryId === parseInt(selectedCategoryId))
    : definitions;

  // ============================================================================
  // RENDER
  // ============================================================================

  const tabs = [
    { id: 'categories', label: 'Categorías' },
    { id: 'skills', label: 'Habilidades' },
    { id: 'profiles', label: 'Perfiles' },
    { id: 'scales', label: 'Escalas' }
  ];

  const btnStyle = (active) => ({
    padding: '10px 20px',
    backgroundColor: active ? COLORS.blue : 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: active ? '#fff' : t.text,
    cursor: 'pointer',
    fontWeight: active ? '600' : '400',
    fontSize: '13px'
  });

  const cardStyle = {
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px'
  };

  return (
    <div style={{ padding: '24px', backgroundColor: t.bgPage, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: t.text }}>
            Configuración de Skills
          </h1>
          <p style={{ color: t.textMuted, marginTop: '4px' }}>
            Administra categorías, habilidades y perfiles de puesto
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Módulos
          </button>
          <button onClick={() => navigate('/skills/dashboard')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Dashboard
          </button>
          <button onClick={() => navigate('/skills/team')} style={{ padding: '8px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>
            Mi Equipo
          </button>
          <ThemeSelector />
        </div>
      </div>

      {/* Messages */}
      {error && <div style={{ padding: '12px', backgroundColor: COLORS.red + '20', color: COLORS.red, borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '12px', backgroundColor: COLORS.green + '20', color: COLORS.green, borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', backgroundColor: t.bgCard, padding: '4px', borderRadius: '8px', marginBottom: '24px', border: `1px solid ${t.border}` }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={btnStyle(activeTab === tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>Cargando...</div>
      ) : (
        <>
          {/* ==================== CATEGORÍAS ==================== */}
          {activeTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: t.text }}>Categorías de Habilidades</h2>
                <button
                  onClick={() => { setEditingItem(null); setCategoryForm({ name: '', code: '', description: '', color: '#3b82f6', scaleId: scales[0]?.id || '' }); setShowCategoryModal(true); }}
                  style={{ padding: '8px 16px', backgroundColor: COLORS.blue, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + {L.newCategory}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ ...cardStyle, borderLeft: `4px solid ${cat.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color, marginBottom: '8px' }} />
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: t.text }}>{cat.name}</h3>
                        <div style={{ fontSize: '12px', color: t.textMuted }}>{cat.code}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEditCategory(cat)} style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                      </div>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: t.textMuted }}>{cat.description || L.noDescription}</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: t.textMuted }}>
                      {cat.skillCount || 0} {L.skillsCount} · {L.scale}: {cat.scaleName || L.scaleDefault}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== HABILIDADES ==================== */}
          {activeTab === 'skills' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: t.text }}>Habilidades</h2>
                  <select
                    value={selectedCategoryId || ''}
                    onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                    style={{ padding: '8px 12px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => { setEditingItem(null); setSkillForm({ name: '', code: '', description: '', defaultTarget: 3, categoryId: selectedCategoryId || categories[0]?.id || '', level1Criteria: '', level2Criteria: '', level3Criteria: '', level4Criteria: '', level5Criteria: '', retrainingDays: '' }); setShowLevelCriteria(false); setShowSkillModal(true); }}
                  style={{ padding: '8px 16px', backgroundColor: COLORS.blue, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + {L.newSkill}
                </button>
              </div>

              <div style={cardStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                      <th style={{ padding: '10px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>Habilidad</th>
                      <th style={{ padding: '10px', textAlign: 'left', color: t.textMuted, fontWeight: '600' }}>Categoría</th>
                      <th style={{ padding: '10px', textAlign: 'center', color: t.textMuted, fontWeight: '600' }}>Target</th>
                      <th style={{ padding: '10px', textAlign: 'right', color: t.textMuted, fontWeight: '600' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDefinitions.map(skill => (
                      <tr key={skill.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: '600', color: t.text }}>{skill.name}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>{skill.code}</div>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ padding: '2px 8px', backgroundColor: skill.categoryColor + '20', color: skill.categoryColor, borderRadius: '4px', fontSize: '11px' }}>
                            {skill.categoryName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{ fontWeight: '600', color: t.text }}>{skill.defaultTarget}</span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button onClick={() => openEditSkill(skill)} style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                          <button onClick={() => handleDeleteSkill(skill.id)} style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== PERFILES ==================== */}
          {activeTab === 'profiles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: t.text }}>Perfiles de Puesto</h2>
                <button
                  onClick={() => { setEditingItem(null); setProfileForm({ name: '', code: '', description: '', skills: [] }); setShowProfileModal(true); }}
                  style={{ padding: '8px 16px', backgroundColor: COLORS.blue, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + {L.newProfile}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {profiles.map(profile => (
                  <div key={profile.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: t.text }}>{profile.name}</h3>
                        <div style={{ fontSize: '12px', color: t.textMuted }}>{profile.code}</div>
                      </div>
                      <button
                        onClick={async () => {
                          setEditingItem(profile);
                          // Cargar habilidades existentes del perfil
                          try {
                            const res = await getProfile(profile.id);
                            if (res.success && res.data.skills) {
                              const existingSkills = res.data.skills.map(s => ({
                                skillId: s.skillId,
                                targetLevel: s.targetLevel,
                                isRequired: s.isRequired
                              }));
                              setProfileForm({ name: profile.name, code: profile.code, description: profile.description || '', skills: existingSkills });
                            } else {
                              setProfileForm({ name: profile.name, code: profile.code, description: profile.description || '', skills: [] });
                            }
                          } catch (err) {
                            setProfileForm({ name: profile.name, code: profile.code, description: profile.description || '', skills: [] });
                          }
                          setShowProfileModal(true);
                        }}
                        style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', cursor: 'pointer' }}
                      >
                        ✏️
                      </button>
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '13px', color: t.textMuted }}>{profile.description || L.noDescription}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: t.textMuted }}>
                      <span>{profile.skillCount || 0} habilidades</span>
                      <span>{profile.userCount || 0} usuarios</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== ESCALAS ==================== */}
          {activeTab === 'scales' && (
            <div>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: t.text }}>Escalas de Evaluación</h2>

              {scales.map(scale => (
                <div key={scale.id} style={{ ...cardStyle, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: t.text }}>
                        {scale.name}
                        {scale.isDefault && <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: COLORS.green + '20', color: COLORS.green, borderRadius: '4px', fontSize: '11px' }}>{L.scaleDefault}</span>}
                      </h3>
                      <div style={{ fontSize: '12px', color: t.textMuted }}>{scale.code} · Rango: {scale.minValue} - {scale.maxValue}</div>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: t.textMuted }}>{scale.description}</p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {scale.levels?.map(level => (
                      <div key={level.levelValue} style={{
                        padding: '8px 12px',
                        backgroundColor: level.color + '20',
                        border: `1px solid ${level.color}`,
                        borderRadius: '8px',
                        minWidth: '150px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: level.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                            {level.levelValue}
                          </span>
                          <span style={{ fontWeight: '600', color: t.text }}>{level.label}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: t.textMuted }}>{level.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ==================== MODAL CATEGORÍA ==================== */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '450px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px 0', color: t.text }}>{editingItem ? 'Editar' : 'Nueva'} Categoría</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Nombre *</label>
              <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Código *</label>
              <input type="text" value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Descripción</label>
              <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                />
                <input
                  type="text"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  style={{ width: '100px', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, fontFamily: "'IBM Plex Mono', monospace" }}
                  placeholder="#3b82f6"
                />
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: categoryForm.color }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Escala</label>
              <select value={categoryForm.scaleId} onChange={(e) => setCategoryForm({ ...categoryForm, scaleId: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}>
                {scales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ padding: '10px 20px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveCategory} disabled={!categoryForm.name || !categoryForm.code} style={{ padding: '10px 20px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL HABILIDAD ==================== */}
      {showSkillModal && (() => {
        // Obtener la escala de la categoría seleccionada
        const selectedCategory = categories.find(c => c.id === parseInt(skillForm.categoryId));
        const categoryScale = selectedCategory ? scales.find(s => s.id === selectedCategory.scaleId) : null;
        const isILUO = categoryScale?.code === 'ILUO';
        const maxLevel = isILUO ? 4 : 5;

        // ILUO level info: I(1), L(2), U(3), O(4)
        const iluoLabels = {
          1: { code: 'I', name: L.observer, color: '#ef4444', desc: L.observerDesc },
          2: { code: 'L', name: L.underSupervision, color: '#f59e0b', desc: L.underSupervisionDesc },
          3: { code: 'U', name: L.autonomous, color: '#22c55e', desc: L.autonomousDesc },
          4: { code: 'O', name: L.instructor, color: '#0ea5e9', desc: L.instructorDesc }
        };

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 20px 0', color: t.text }}>{editingItem ? L.edit : (language === 'es' ? 'Nueva' : 'New')} {language === 'es' ? 'Habilidad' : 'Skill'}</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>{L.category} *</label>
                <select value={skillForm.categoryId} onChange={(e) => setSkillForm({ ...skillForm, categoryId: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}>
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  {categories.map(c => {
                    const catScale = scales.find(s => s.id === c.scaleId);
                    return <option key={c.id} value={c.id}>{c.name} {catScale ? `(${catScale.code})` : ''}</option>;
                  })}
                </select>
                {categoryScale && (
                  <div style={{ marginTop: '6px', padding: '8px', backgroundColor: isILUO ? '#0ea5e920' : '#8b5cf620', borderRadius: '6px', fontSize: '11px' }}>
                    <strong style={{ color: isILUO ? '#0ea5e9' : '#8b5cf6' }}>Escala: {categoryScale.name}</strong>
                    <span style={{ color: t.textMuted, marginLeft: '8px' }}>
                      ({isILUO ? 'O, U, L, I' : '1 - 5'})
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Nombre *</label>
                <input type="text" value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Código</label>
                <input type="text" value={skillForm.code} onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Descripción</label>
                <textarea value={skillForm.description} onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Target por defecto</label>
                  {isILUO ? (
                    <select
                      value={skillForm.defaultTarget}
                      onChange={(e) => setSkillForm({ ...skillForm, defaultTarget: parseInt(e.target.value) })}
                      style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                    >
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} - {iluoLabels[n].code} ({iluoLabels[n].name})</option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" min="1" max="5" value={skillForm.defaultTarget} onChange={(e) => setSkillForm({ ...skillForm, defaultTarget: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Reentrenamiento (días)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Sin vencimiento"
                    value={skillForm.retrainingDays}
                    onChange={(e) => setSkillForm({ ...skillForm, retrainingDays: e.target.value ? parseInt(e.target.value) : '' })}
                    style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }}
                  />
                  <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px' }}>Vacío = no expira</div>
                </div>
              </div>

              {/* Matriz de criterios por nivel */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="showCriteria"
                    checked={showLevelCriteria}
                    onChange={(e) => setShowLevelCriteria(e.target.checked)}
                  />
                  <label htmlFor="showCriteria" style={{ fontSize: '13px', color: t.text, cursor: 'pointer' }}>
                    Definir criterios por nivel (opcional)
                  </label>
                </div>

                {showLevelCriteria && (
                  <div style={{ padding: '16px', backgroundColor: t.bgPanel, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: t.textMuted }}>
                      Define qué competencias se requieren para alcanzar cada nivel
                      {isILUO && <span style={{ color: '#0ea5e9', marginLeft: '4px' }}>(Escala ILUO)</span>}
                    </p>
                    {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => {
                      const levelInfo = isILUO ? iluoLabels[level] : null;
                      return (
                        <div key={level}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px', color: t.textMuted }}>
                            {isILUO ? (
                              <>
                                <span style={{
                                  width: '22px', height: '22px', borderRadius: '4px',
                                  backgroundColor: levelInfo.color,
                                  color: '#fff', display: 'inline-flex', alignItems: 'center',
                                  justifyContent: 'center', fontWeight: '600', fontSize: '11px'
                                }}>
                                  {levelInfo.code}
                                </span>
                                <span>Nivel {level} - {levelInfo.name}</span>
                              </>
                            ) : (
                              <span>Nivel {level}</span>
                            )}
                          </label>
                          <textarea
                            value={skillForm[`level${level}Criteria`]}
                            onChange={(e) => setSkillForm({ ...skillForm, [`level${level}Criteria`]: e.target.value })}
                            placeholder={isILUO ? levelInfo.desc : `Criterios para alcanzar nivel ${level}...`}
                            rows={2}
                            style={{ width: '100%', padding: '8px', backgroundColor: t.bgCard, border: `1px solid ${isILUO ? levelInfo.color + '40' : t.border}`, borderRadius: '6px', color: t.text, fontSize: '12px', resize: 'vertical' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', position: 'sticky', bottom: 0, backgroundColor: t.bgCard, paddingTop: '12px', borderTop: `1px solid ${t.border}` }}>
                <button onClick={() => setShowSkillModal(false)} style={{ padding: '10px 20px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveSkill} disabled={!skillForm.name || !skillForm.categoryId} style={{ padding: '10px 20px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== MODAL PERFIL ==================== */}
      {showProfileModal && (() => {
        // ILUO level info: I(1), L(2), U(3), O(4)
        const iluoLabels = {
          1: { code: 'I', name: 'Observador' },
          2: { code: 'L', name: 'Bajo Supervisión' },
          3: { code: 'U', name: 'Libre' },
          4: { code: 'O', name: 'Instructor' }
        };

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 20px 0', color: t.text }}>{editingItem ? 'Editar' : 'Nuevo'} Perfil</h3>

              {!editingItem && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Nombre *</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: t.textMuted }}>Código *</label>
                    <input type="text" value={profileForm.code} onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text }} />
                  </div>
                </>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '600', color: t.text }}>Habilidades del Perfil</label>

                {categories.map(cat => {
                  const catScale = scales.find(s => s.id === cat.scaleId);
                  const isILUO = catScale?.code === 'ILUO';
                  const maxLevel = isILUO ? 4 : 5;

                  return (
                    <div key={cat.id} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: cat.color, marginBottom: '8px' }}>
                        {cat.name}
                        {catScale && <span style={{ fontSize: '10px', fontWeight: '400', color: t.textMuted }}>({catScale.code})</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {definitions.filter(d => d.categoryId === cat.id).map(skill => {
                          const assigned = profileForm.skills.find(s => s.skillId === skill.id);
                          return (
                            <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: assigned ? COLORS.blue + '10' : 'transparent', borderRadius: '6px' }}>
                              <input type="checkbox" checked={!!assigned} onChange={() => toggleSkillInProfile(skill.id, skill.defaultTarget)} />
                              <span style={{ flex: 1, fontSize: '13px', color: t.text }}>{skill.name}</span>
                              {assigned && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: t.textMuted }}>Target:</span>
                                  <select value={assigned.targetLevel} onChange={(e) => updateSkillTargetInProfile(skill.id, e.target.value)} style={{ padding: '4px 8px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text }}>
                                    {Array.from({ length: maxLevel }, (_, i) => i + 1).map(n => (
                                      <option key={n} value={n}>
                                        {isILUO ? `${n} - ${iluoLabels[n].code}` : n}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', position: 'sticky', bottom: 0, backgroundColor: t.bgCard, paddingTop: '12px', borderTop: `1px solid ${t.border}` }}>
                <button onClick={() => setShowProfileModal(false)} style={{ padding: '10px 20px', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveProfile} disabled={!editingItem && (!profileForm.name || !profileForm.code)} style={{ padding: '10px 20px', backgroundColor: COLORS.blue, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SkillsConfig;
