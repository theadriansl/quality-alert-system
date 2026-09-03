import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = 'http://localhost:5000';

const AuditChecklistDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  const L = {
    en: {
      connectionError: 'Connection error', questionRequired: 'Question is required',
      addError: 'Error adding question', updateError: 'Error updating question',
      confirmDelete: 'Delete this question?', deleteError: 'Error deleting question',
      loading: 'Loading checklist...', notFound: 'Checklist not found',
      backToChecklists: 'Back to Checklists', noDescription: 'No description',
      addQuestion: '+ Add Question', back: 'Back', questions: 'questions', critical: 'critical',
      newQuestion: 'New Question', clause: 'Clause', clausePlaceholder: 'E.g.: 8.5.1',
      category: 'Category', categoryPlaceholder: 'E.g.: Operation, Leadership...',
      questionLabel: 'Question *', questionPlaceholder: 'Audit question?',
      auditorGuidance: 'Auditor Guidance', guidancePlaceholder: 'Guidance on what to verify...',
      evidenceRequired: 'Evidence Required', evidencePlaceholder: 'E.g.: Records, documents, observation...',
      isCritical: 'Critical question (failure = automatic Major NC)',
      cancel: 'Cancel', addBtn: 'Add Question',
      noQuestions: 'No questions in this checklist', addToComplete: 'Add questions to complete the checklist',
      guidance: 'Guidance', evidence: 'Evidence',
      moveUp: 'Move up', moveDown: 'Move down', edit: 'Edit', delete: 'Delete',
      save: 'Save', criticalBadge: 'CRITICAL'
    },
    es: {
      connectionError: 'Error de conexión', questionRequired: 'La pregunta es requerida',
      addError: 'Error al agregar pregunta', updateError: 'Error al actualizar pregunta',
      confirmDelete: '¿Eliminar esta pregunta?', deleteError: 'Error al eliminar pregunta',
      loading: 'Cargando checklist...', notFound: 'Checklist no encontrado',
      backToChecklists: 'Volver a Checklists', noDescription: 'Sin descripción',
      addQuestion: '+ Agregar Pregunta', back: 'Volver', questions: 'preguntas', critical: 'críticas',
      newQuestion: 'Nueva Pregunta', clause: 'Cláusula', clausePlaceholder: 'Ej: 8.5.1',
      category: 'Categoría', categoryPlaceholder: 'Ej: Operación, Liderazgo...',
      questionLabel: 'Pregunta *', questionPlaceholder: '¿Pregunta de auditoría?',
      auditorGuidance: 'Guía para el Auditor', guidancePlaceholder: 'Orientación sobre qué verificar...',
      evidenceRequired: 'Evidencia Requerida', evidencePlaceholder: 'Ej: Registros, documentos, observación...',
      isCritical: 'Pregunta crítica (falla = NC Mayor automática)',
      cancel: 'Cancelar', addBtn: 'Agregar Pregunta',
      noQuestions: 'No hay preguntas en este checklist', addToComplete: 'Agrega preguntas para completar el checklist',
      guidance: 'Guía', evidence: 'Evidencia',
      moveUp: 'Mover arriba', moveDown: 'Mover abajo', edit: 'Editar', delete: 'Eliminar',
      save: 'Guardar', criticalBadge: 'CRÍTICO'
    }
  }[language] || {};

  const [checklist, setChecklist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    clause: '',
    question: '',
    guidance: '',
    evidenceRequired: '',
    category: '',
    isCritical: false
  });

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setChecklist(result.checklist);
        setItems(result.items || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(L.connectionError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const addItem = async () => {
    if (!newItem.question) {
      alert(L.questionRequired);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists/${id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newItem)
      });
      const result = await res.json();

      if (result.success) {
        setItems([...items, result.item]);
        setShowAddItem(false);
        setNewItem({ clause: '', question: '', guidance: '', evidenceRequired: '', category: '', isCritical: false });
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.addError);
    }
  };

  const updateItem = async (itemId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists/${id}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const result = await res.json();

      if (result.success) {
        setItems(items.map(item => item.id === itemId ? result.item : item));
        setEditingItem(null);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.updateError);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm(L.confirmDelete)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit/checklists/${id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        setItems(items.filter(item => item.id !== itemId));
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(L.deleteError);
    }
  };

  const moveItem = async (itemId, direction) => {
    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];

    // Update order in UI immediately
    setItems(newItems);

    // Save new order to backend
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/audit/checklists/${id}/items/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: newItems.map((item, idx) => ({ id: item.id, itemOrder: idx + 1 }))
        })
      });
    } catch (err) {
      console.error('Error saving order:', err);
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
      alignItems: 'flex-start',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: t.textMuted,
      marginTop: '4px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
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
    meta: {
      display: 'flex',
      gap: '24px',
      fontSize: '13px',
      color: t.textMuted,
      flexWrap: 'wrap',
      marginBottom: '16px'
    },
    itemCard: {
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: t.bgCard
    },
    itemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    },
    itemClause: {
      display: 'inline-block',
      padding: '2px 8px',
      backgroundColor: t.bgPanel,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      marginRight: '8px',
      color: t.text
    },
    itemQuestion: {
      fontSize: '14px',
      fontWeight: '500',
      color: t.text,
      flex: 1
    },
    itemDetails: {
      fontSize: '13px',
      color: t.textMuted,
      marginTop: '8px'
    },
    itemActions: {
      display: 'flex',
      gap: '4px'
    },
    iconButton: {
      padding: '6px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      backgroundColor: t.bgPanel,
      fontSize: '14px',
      color: t.text
    },
    critical: {
      display: 'inline-block',
      padding: '2px 6px',
      backgroundColor: `${t.error}20`,
      color: t.error,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      marginLeft: '8px'
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
      minHeight: '60px',
      resize: 'vertical',
      backgroundColor: t.bgCard,
      color: t.text
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: t.text
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    empty: {
      textAlign: 'center',
      padding: '32px',
      color: t.textMuted
    },
    category: {
      display: 'inline-block',
      padding: '2px 8px',
      backgroundColor: `${t.accent}20`,
      color: t.accent,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
          {L.loading}
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderLeft: `4px solid ${t.error}` }}>
          <p style={{ color: t.error }}>{error || L.notFound}</p>
          <button
            style={{ ...styles.button, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/audit-checklists')}
          >
            {L.backToChecklists}
          </button>
        </div>
      </div>
    );
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{checklist.name}</h1>
          <p style={styles.subtitle}>{checklist.description || L.noDescription}</p>
        </div>
        <div style={styles.buttons}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
            onClick={() => setShowAddItem(true)}
          >
            {L.addQuestion}
          </button>
          <button
            style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
            onClick={() => navigate('/audit-checklists')}
          >
            ← {L.back}
          </button>
        </div>
      </div>

      {/* Checklist Info */}
      <div style={styles.card}>
        <div style={styles.meta}>
          <span> {checklist.standard}</span>
          <span> v{checklist.version}</span>
          {checklist.process && <span> {checklist.process}</span>}
          <span> {items.length} {L.questions}</span>
          <span> {items.filter(i => i.isCritical).length} {L.critical}</span>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}> {L.newQuestion}</h2>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{L.clause}</label>
              <input
                type="text"
                value={newItem.clause}
                onChange={(e) => setNewItem({ ...newItem, clause: e.target.value })}
                placeholder={L.clausePlaceholder}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{L.category}</label>
              <input
                type="text"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                placeholder={L.categoryPlaceholder}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.questionLabel}</label>
            <textarea
              value={newItem.question}
              onChange={(e) => setNewItem({ ...newItem, question: e.target.value })}
              placeholder={L.questionPlaceholder}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.auditorGuidance}</label>
            <textarea
              value={newItem.guidance}
              onChange={(e) => setNewItem({ ...newItem, guidance: e.target.value })}
              placeholder={L.guidancePlaceholder}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{L.evidenceRequired}</label>
            <input
              type="text"
              value={newItem.evidenceRequired}
              onChange={(e) => setNewItem({ ...newItem, evidenceRequired: e.target.value })}
              placeholder={L.evidencePlaceholder}
              style={styles.input}
            />
          </div>

          <div style={styles.checkbox}>
            <input
              type="checkbox"
              checked={newItem.isCritical}
              onChange={(e) => setNewItem({ ...newItem, isCritical: e.target.checked })}
            />
            <span>{L.isCritical}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
              onClick={() => setShowAddItem(false)}
            >
              {L.cancel}
            </button>
            <button
              style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
              onClick={addItem}
            >
              {L.addBtn}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.empty}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>{L.noQuestions}</p>
            <p>{L.addToComplete}</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.category}>{category}</span>
              <span style={{ marginLeft: 'auto', fontSize: '13px', color: t.textMuted }}>
                {categoryItems.length} {L.questions}
              </span>
            </h2>

            {categoryItems.map((item, index) => (
              <div key={item.id} style={styles.itemCard}>
                {editingItem === item.id ? (
                  // Edit Mode
                  <div>
                    <div style={styles.grid2}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{L.clause}</label>
                        <input
                          type="text"
                          defaultValue={item.clause}
                          id={`clause-${item.id}`}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>{L.category}</label>
                        <input
                          type="text"
                          defaultValue={item.category}
                          id={`category-${item.id}`}
                          style={styles.input}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{L.questionLabel}</label>
                      <textarea
                        defaultValue={item.question}
                        id={`question-${item.id}`}
                        style={styles.textarea}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{L.guidance}</label>
                      <textarea
                        defaultValue={item.guidance}
                        id={`guidance-${item.id}`}
                        style={styles.textarea}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        style={{ ...styles.button, backgroundColor: t.bgPanel, color: t.text }}
                        onClick={() => setEditingItem(null)}
                      >
                        {L.cancel}
                      </button>
                      <button
                        style={{ ...styles.button, backgroundColor: t.success, color: 'white' }}
                        onClick={() => {
                          updateItem(item.id, {
                            clause: document.getElementById(`clause-${item.id}`).value,
                            category: document.getElementById(`category-${item.id}`).value,
                            question: document.getElementById(`question-${item.id}`).value,
                            guidance: document.getElementById(`guidance-${item.id}`).value
                          });
                        }}
                      >
                        {L.save}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div style={styles.itemHeader}>
                      <div style={{ flex: 1 }}>
                        {item.clause && <span style={styles.itemClause}>{item.clause}</span>}
                        <span style={styles.itemQuestion}>{item.question}</span>
                        {item.isCritical && <span style={styles.critical}>{L.criticalBadge}</span>}
                      </div>
                      <div style={styles.itemActions}>
                        <button
                          style={styles.iconButton}
                          onClick={() => moveItem(item.id, 'up')}
                          disabled={index === 0}
                          title={L.moveUp}
                        >
                          ↑
                        </button>
                        <button
                          style={styles.iconButton}
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === categoryItems.length - 1}
                          title={L.moveDown}
                        >
                          ↓
                        </button>
                        <button
                          style={{ ...styles.iconButton, backgroundColor: `${t.accent}20` }}
                          onClick={() => setEditingItem(item.id)}
                          title={L.edit}
                        >

                        </button>
                        <button
                          style={{ ...styles.iconButton, backgroundColor: `${t.error}20` }}
                          onClick={() => deleteItem(item.id)}
                          title={L.delete}
                        >

                        </button>
                      </div>
                    </div>
                    {(item.guidance || item.evidenceRequired) && (
                      <div style={styles.itemDetails}>
                        {item.guidance && <div><strong>{L.guidance}:</strong> {item.guidance}</div>}
                        {item.evidenceRequired && <div><strong>{L.evidence}:</strong> {item.evidenceRequired}</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default AuditChecklistDetail;
