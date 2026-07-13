/**
 * BOM Field Configuration Panel
 * Admin-only UI for managing custom BOM fields
 */

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import bomFieldService from '../services/bomFieldService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Numero' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Lista (Select)' },
  { value: 'boolean', label: 'Si/No (Boolean)' }
];

const BomFieldConfigPanel = ({ onClose, isAdmin }) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const { showError, showSuccess } = useToast();

  const translations = {
    en: {
      nameKeyRequired: 'Name and Key are required',
      errorCreating: 'Error creating field',
      errorUpdating: 'Error updating field',
      errorDeleting: 'Error deleting field',
      errorChangingStatus: 'Error changing status'
    },
    es: {
      nameKeyRequired: 'Nombre y Clave son requeridos',
      errorCreating: 'Error al crear campo',
      errorUpdating: 'Error al actualizar campo',
      errorDeleting: 'Error al eliminar campo',
      errorChangingStatus: 'Error al cambiar estado'
    }
  };

  const tr = (key) => translations[language]?.[key] || key;

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New field form state
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldKey: '',
    fieldType: 'text',
    isRequired: false,
    description: '',
    showInTable: true,
    showInForm: true,
    showInTemplate: true,
    options: [],
    defaultValue: '',
    minValue: '',
    maxValue: '',
    maxLength: ''
  });

  // Options input for select type
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await bomFieldService.getAllFieldConfigs()
        : await bomFieldService.getFieldConfigs();
      setFields(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.fieldName || !newField.fieldKey) {
      showError(tr('nameKeyRequired'));
      return;
    }

    try {
      setSaving(true);
      const fieldData = {
        ...newField,
        minValue: newField.minValue ? parseFloat(newField.minValue) : null,
        maxValue: newField.maxValue ? parseFloat(newField.maxValue) : null,
        maxLength: newField.maxLength ? parseInt(newField.maxLength) : null,
        options: newField.fieldType === 'select' ? newField.options : null
      };

      await bomFieldService.createFieldConfig(fieldData);
      await loadFields();
      setShowAddForm(false);
      resetNewField();
    } catch (err) {
      showError(`${tr('errorCreating')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField.fieldName || !editingField.fieldKey) {
      showError(tr('nameKeyRequired'));
      return;
    }

    try {
      setSaving(true);
      const fieldData = {
        ...editingField,
        minValue: editingField.minValue ? parseFloat(editingField.minValue) : null,
        maxValue: editingField.maxValue ? parseFloat(editingField.maxValue) : null,
        maxLength: editingField.maxLength ? parseInt(editingField.maxLength) : null,
        options: editingField.fieldType === 'select' ? editingField.options : null
      };

      await bomFieldService.updateFieldConfig(editingField.id, fieldData);
      await loadFields();
      setEditingField(null);
    } catch (err) {
      showError(`${tr('errorUpdating')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (id, fieldName) => {
    if (!window.confirm(`Desactivar el campo "${fieldName}"? El campo no se eliminara permanentemente.`)) {
      return;
    }

    try {
      await bomFieldService.deleteFieldConfig(id);
      await loadFields();
    } catch (err) {
      showError(`${tr('errorDeleting')}: ${err.message}`);
    }
  };

  const handleToggleActive = async (field) => {
    try {
      await bomFieldService.updateFieldConfig(field.id, { isActive: !field.isActive });
      await loadFields();
    } catch (err) {
      showError(`${tr('errorChangingStatus')}: ${err.message}`);
    }
  };

  const resetNewField = () => {
    setNewField({
      fieldName: '',
      fieldKey: '',
      fieldType: 'text',
      isRequired: false,
      description: '',
      showInTable: true,
      showInForm: true,
      showInTemplate: true,
      options: [],
      defaultValue: '',
      minValue: '',
      maxValue: '',
      maxLength: ''
    });
    setNewOption('');
  };

  const addOption = (isEditing = false) => {
    if (!newOption.trim()) return;

    if (isEditing && editingField) {
      setEditingField({
        ...editingField,
        options: [...(editingField.options || []), newOption.trim()]
      });
    } else {
      setNewField({
        ...newField,
        options: [...newField.options, newOption.trim()]
      });
    }
    setNewOption('');
  };

  const removeOption = (index, isEditing = false) => {
    if (isEditing && editingField) {
      setEditingField({
        ...editingField,
        options: editingField.options.filter((_, i) => i !== index)
      });
    } else {
      setNewField({
        ...newField,
        options: newField.options.filter((_, i) => i !== index)
      });
    }
  };

  const renderFieldForm = (field, setField, isEditing = false) => (
    <div style={{
      backgroundColor: isEditing ? (t.id === 'dark' ? 'rgba(251, 191, 36, 0.1)' : '#fef3c7') : (t.id === 'dark' ? 'rgba(134, 239, 172, 0.1)' : '#f0fdf4'),
      border: `1px solid ${isEditing ? t.warning : t.success}`,
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px'
    }}>
      <h4 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: isEditing ? t.warning : t.success
      }}>
        {isEditing ? 'Editar Campo' : 'Nuevo Campo'}
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {/* Field Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
            Nombre del Campo *
          </label>
          <input
            type="text"
            placeholder="Ej: ECR Number"
            value={field.fieldName}
            onChange={(e) => setField({ ...field, fieldName: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: t.bgCard,
              color: t.text
            }}
          />
        </div>

        {/* Field Key */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
            Clave Interna *
          </label>
          <input
            type="text"
            placeholder="Ej: ECR Number"
            value={field.fieldKey}
            onChange={(e) => setField({ ...field, fieldKey: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: t.bgCard,
              color: t.text
            }}
          />
        </div>

        {/* Field Type */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
            Tipo de Campo
          </label>
          <select
            value={field.fieldType}
            onChange={(e) => setField({ ...field, fieldType: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: t.bgCard,
              color: t.text
            }}
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Default Value */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
            Valor por Defecto
          </label>
          <input
            type="text"
            placeholder="Opcional"
            value={field.defaultValue || ''}
            onChange={(e) => setField({ ...field, defaultValue: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: t.bgCard,
              color: t.text
            }}
          />
        </div>

        {/* Number-specific fields */}
        {field.fieldType === 'number' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
                Valor Minimo
              </label>
              <input
                type="number"
                placeholder="Opcional"
                value={field.minValue || ''}
                onChange={(e) => setField({ ...field, minValue: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: t.bgCard,
                  color: t.text
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
                Valor Maximo
              </label>
              <input
                type="number"
                placeholder="Opcional"
                value={field.maxValue || ''}
                onChange={(e) => setField({ ...field, maxValue: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: t.bgCard,
                  color: t.text
                }}
              />
            </div>
          </>
        )}

        {/* Text-specific fields */}
        {field.fieldType === 'text' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
              Longitud Maxima
            </label>
            <input
              type="number"
              placeholder="Opcional"
              value={field.maxLength || ''}
              onChange={(e) => setField({ ...field, maxLength: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${t.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: t.bgCard,
                color: t.text
              }}
            />
          </div>
        )}

        {/* Select-specific fields - Options */}
        {field.fieldType === 'select' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
              Opciones
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Agregar opcion"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addOption(isEditing)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: t.bgCard,
                  color: t.text
                }}
              />
              <button
                type="button"
                onClick={() => addOption(isEditing)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Agregar
              </button>
            </div>
            {(field.options || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {field.options.map((opt, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: t.id === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                      color: t.accent,
                      borderRadius: '12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => removeOption(idx, isEditing)}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: t.accent
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: t.text }}>
          Descripcion / Ayuda
        </label>
        <input
          type="text"
          placeholder="Texto de ayuda para el usuario"
          value={field.description || ''}
          onChange={(e) => setField({ ...field, description: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: t.bgCard,
            color: t.text
          }}
        />
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: t.text }}>
          <input
            type="checkbox"
            checked={field.isRequired}
            onChange={(e) => setField({ ...field, isRequired: e.target.checked })}
          />
          Requerido
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: t.text }}>
          <input
            type="checkbox"
            checked={field.showInTable}
            onChange={(e) => setField({ ...field, showInTable: e.target.checked })}
          />
          Mostrar en Tabla
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: t.text }}>
          <input
            type="checkbox"
            checked={field.showInForm}
            onChange={(e) => setField({ ...field, showInForm: e.target.checked })}
          />
          Mostrar en Formulario
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: t.text }}>
          <input
            type="checkbox"
            checked={field.showInTemplate}
            onChange={(e) => setField({ ...field, showInTemplate: e.target.checked })}
          />
          Incluir en Plantilla Excel
        </label>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => isEditing ? setEditingField(null) : setShowAddForm(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: t.bgCard,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={isEditing ? handleUpdateField : handleAddField}
          disabled={saving}
          style={{
            padding: '8px 16px',
            backgroundColor: saving ? t.textDim : t.accent,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Save size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: t.bgCard,
        borderRadius: '12px',
        maxWidth: '900px',
        maxHeight: '90vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: t.bgPanel
        }}>
          <div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: t.text
            }}>
              <Settings size={24} color={t.accent} />
              Configuracion de Campos BOM
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>
              Administra los campos personalizados del BOM Global (Solo Administradores)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: t.id === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              color: t.error,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: t.bgCard }}>
          {/* Info Box */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: t.id === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe',
            border: `1px solid ${t.info}`,
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '13px',
            color: t.primary
          }}>
            <strong>Campos Fijos del Sistema:</strong> Activo, Cliente, Numero de Parte, Nombre, Descripcion, Revision, LVL BOM, Costo.
            <br />
            Estos campos NO son editables aqui ya que son parte del sistema base.
          </div>

          {/* Add Button */}
          {isAdmin && !showAddForm && !editingField && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: t.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              <Plus size={16} />
              Agregar Nuevo Campo
            </button>
          )}

          {/* Add Form */}
          {showAddForm && renderFieldForm(newField, setNewField, false)}

          {/* Edit Form */}
          {editingField && renderFieldForm(editingField, setEditingField, true)}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px', color: t.textMuted }}>
              Cargando campos...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: t.id === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
              color: t.error,
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              Error: {error}
            </div>
          )}

          {/* Fields List */}
          {!loading && fields.length > 0 && (
            <div style={{
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: t.bgPanel, borderBottom: `2px solid ${t.border}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: t.text }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: t.text }}>Clave</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Tabla</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Form</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Excel</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Estado</th>
                    {isAdmin && <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr
                      key={field.id}
                      style={{
                        borderBottom: `1px solid ${t.border}`,
                        backgroundColor: !field.isActive ? (t.id === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2') : (index % 2 === 0 ? t.bgCard : t.bgPanel)
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: '500', color: t.text }}>{field.fieldName}</td>
                      <td style={{ padding: '12px', color: t.textMuted, fontFamily: 'monospace', fontSize: '12px' }}>{field.fieldKey}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: t.id === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                          color: t.accent,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {FIELD_TYPES.find(ft => ft.value === field.fieldType)?.label || field.fieldType}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>
                        {field.showInTable ? '' : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>
                        {field.showInForm ? '' : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: t.text }}>
                        {field.showInTemplate ? '' : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '500',
                          backgroundColor: field.isActive ? (t.id === 'dark' ? 'rgba(46, 125, 50, 0.2)' : '#d1fae5') : (t.id === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                          color: field.isActive ? t.success : t.error
                        }}>
                          {field.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => setEditingField({ ...field, options: field.options || [] })}
                              style={{
                                padding: '6px',
                                backgroundColor: t.accent,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(field)}
                              style={{
                                padding: '6px',
                                backgroundColor: field.isActive ? t.warning : t.success,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title={field.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {field.isActive ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id, field.fieldName)}
                              style={{
                                padding: '6px',
                                backgroundColor: t.error,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && fields.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
              <Settings size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '16px', fontWeight: '500' }}>No hay campos configurados</p>
              <p style={{ fontSize: '14px' }}>Agregue campos personalizados para el BOM</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${t.border}`,
          backgroundColor: t.bgPanel,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: t.textMuted }}>
            {fields.filter(f => f.isActive).length} campo(s) activo(s) de {fields.length} total
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: t.accent,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BomFieldConfigPanel;
