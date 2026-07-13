import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Tabla estilo Excel para ingresar inventario de partes afectadas
 * Calcula automáticamente totales y costos
 * Ahora soporta campos personalizados para futuras expansiones (ECR/ECO)
 */
const PartsInventoryTable = ({ parts, onPartsUpdate, customColumns = [], onCustomColumnsUpdate }) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      noPartsSelected: 'No parts selected. Please select parts first.',
      addCustomColumn: 'Add Custom Column',
      newCustomColumn: 'New Custom Column',
      columnName: 'Column Name',
      dataType: 'Data Type',
      text: 'Text',
      number: 'Number',
      date: 'Date',
      add: 'Add',
      cancel: 'Cancel',
      deleteColumnConfirm: 'Delete this custom column? Data will be lost.',
      partNumber: 'Part Number',
      description: 'Description',
      affectedQtyByLocation: 'Affected Quantities by Location',
      totalAffected: 'Total Affected',
      unitCost: 'Unit Cost',
      totalImpact: 'Total Impact (USD)',
      warehouse: 'Warehouse',
      inProcess: 'In Process',
      transit: 'Transit',
      customer: 'Customer',
      noDescription: 'No description',
      totals: 'TOTALS',
      deleteColumn: 'Delete column'
    },
    es: {
      noPartsSelected: 'No hay partes seleccionadas. Por favor selecciona partes primero.',
      addCustomColumn: 'Agregar Columna Personalizada',
      newCustomColumn: 'Nueva Columna Personalizada',
      columnName: 'Nombre de Columna',
      dataType: 'Tipo de Dato',
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      add: 'Agregar',
      cancel: 'Cancelar',
      deleteColumnConfirm: '¿Eliminar esta columna personalizada? Los datos se perderán.',
      partNumber: 'Número de Parte',
      description: 'Descripción',
      affectedQtyByLocation: 'Cantidades Afectadas por Ubicación',
      totalAffected: 'Total Afectado',
      unitCost: 'Costo Unitario',
      totalImpact: 'Impacto Total (USD)',
      warehouse: 'Almacén',
      inProcess: 'En Proceso',
      transit: 'Tránsito',
      customer: 'Cliente',
      noDescription: 'Sin descripción',
      totals: 'TOTALES',
      deleteColumn: 'Eliminar columna'
    }
  }[language] || {};
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');

  // Manejar cambio en cantidad de inventario
  const handleQuantityChange = (partIndex, field, value) => {
    const updatedParts = [...parts];
    const part = { ...updatedParts[partIndex] };

    // Convertir a número entero, default 0
    const qty = parseInt(value) || 0;
    part[field] = qty;

    // Calcular total afectado
    const qtyWarehouse = parseInt(part.qtyWarehouse) || 0;
    const qtyInProcess = parseInt(part.qtyInProcess) || 0;
    const qtyInTransit = parseInt(part.qtyInTransit) || 0;
    const qtyWithCustomer = parseInt(part.qtyWithCustomer) || 0;

    part.totalAffectedQty = qtyWarehouse + qtyInProcess + qtyInTransit + qtyWithCustomer;

    // Calcular impacto de costo
    const unitCost = parseFloat(part.unitCost) || 0;
    part.totalCostImpact = part.totalAffectedQty * unitCost;

    updatedParts[partIndex] = part;
    onPartsUpdate(updatedParts);
  };

  // Manejar cambio en campo personalizado
  const handleCustomFieldChange = (partIndex, fieldName, value) => {
    const updatedParts = [...parts];
    const part = { ...updatedParts[partIndex] };

    if (!part.customFields) {
      part.customFields = {};
    }

    part.customFields[fieldName] = value;
    updatedParts[partIndex] = part;
    onPartsUpdate(updatedParts);
  };

  // Agregar nueva columna personalizada
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const newColumn = {
      id: `custom_${Date.now()}`,
      name: newColumnName.trim(),
      type: newColumnType
    };

    const updatedColumns = [...customColumns, newColumn];
    if (onCustomColumnsUpdate) {
      onCustomColumnsUpdate(updatedColumns);
    }

    setNewColumnName('');
    setNewColumnType('text');
    setShowAddColumnModal(false);
  };

  // Eliminar columna personalizada
  const handleDeleteColumn = (columnId) => {
    if (!window.confirm(tr.deleteColumnConfirm)) return;

    const updatedColumns = customColumns.filter(col => col.id !== columnId);
    if (onCustomColumnsUpdate) {
      onCustomColumnsUpdate(updatedColumns);
    }

    // Limpiar datos de esa columna en todas las partes
    const updatedParts = parts.map(part => {
      if (part.customFields) {
        const { [columnId]: removed, ...rest } = part.customFields;
        return { ...part, customFields: rest };
      }
      return part;
    });
    onPartsUpdate(updatedParts);
  };

  // Calcular totales generales
  const getTotals = () => {
    return parts.reduce((acc, part) => {
      return {
        warehouse: acc.warehouse + (parseInt(part.qtyWarehouse) || 0),
        inProcess: acc.inProcess + (parseInt(part.qtyInProcess) || 0),
        inTransit: acc.inTransit + (parseInt(part.qtyInTransit) || 0),
        withCustomer: acc.withCustomer + (parseInt(part.qtyWithCustomer) || 0),
        totalQty: acc.totalQty + (parseInt(part.totalAffectedQty) || 0),
        totalCost: acc.totalCost + (parseFloat(part.totalCostImpact) || 0)
      };
    }, {
      warehouse: 0,
      inProcess: 0,
      inTransit: 0,
      withCustomer: 0,
      totalQty: 0,
      totalCost: 0
    });
  };

  const totals = getTotals();

  if (!parts || parts.length === 0) {
    return (
      <div className="rounded p-4 text-center" style={{ backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, color: t.textMuted }}>
        {tr.noPartsSelected}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botón para agregar columnas personalizadas */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddColumnModal(true)}
          className="px-3 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2"
          style={{ backgroundColor: t.success, color: 'white' }}
        >
          <span></span>
          {tr.addCustomColumn}
        </button>
      </div>

      {/* Modal para agregar columna */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: t.bgCard }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: t.text }}>{tr.newCustomColumn}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: t.textMuted }}>
                  {tr.columnName}
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Ej: Rev, ECR#, Drawing#, Supplier..."
                  className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
                  style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, color: t.text }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: t.textMuted }}>
                  {tr.dataType}
                </label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value)}
                  className="w-full px-3 py-2 rounded focus:outline-none focus:ring-2"
                  style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, color: t.text }}
                >
                  <option value="text">{tr.text}</option>
                  <option value="number">{tr.number}</option>
                  <option value="date">{tr.date}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                  className="flex-1 px-4 py-2 rounded font-medium disabled:cursor-not-allowed"
                  style={{ backgroundColor: !newColumnName.trim() ? t.bgPanel : t.accent, color: !newColumnName.trim() ? t.textMuted : 'white' }}
                >
                  {tr.add}
                </button>
                <button
                  onClick={() => {
                    setShowAddColumnModal(false);
                    setNewColumnName('');
                    setNewColumnType('text');
                  }}
                  className="flex-1 px-4 py-2 rounded font-medium"
                  style={{ backgroundColor: t.bgPanel, color: t.text }}
                >
                  {tr.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de inventario */}
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <table className="border-collapse" style={{ width: '100%', tableLayout: 'fixed' }}>
            {/* Column widths */}
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: 'auto', minWidth: '180px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '95px' }} />
              {/* Columnas personalizadas */}
              {customColumns.map(() => (
                <col key={`col-${Math.random()}`} style={{ width: '120px' }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="border border-gray-300 px-2 py-2 text-center text-sm font-semibold" style={{color:'white'}} rowSpan="2">
                  #
                </th>
                <th className="border border-gray-300 px-2 py-2 text-left text-sm font-semibold" style={{color:'white'}} rowSpan="2">
                  {tr.partNumber}
                </th>
                <th className="border border-gray-300 px-2 py-2 text-left text-sm font-semibold" style={{color:'white'}} rowSpan="2">
                  {tr.description}
                </th>
                <th className="border border-gray-300 px-1 py-2 text-center text-sm font-semibold" style={{color:'white'}} colSpan="4">
                  {tr.affectedQtyByLocation}
                </th>
                <th className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold" style={{color:'white'}} rowSpan="2">
                  {tr.totalAffected}
                </th>
                <th className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold" style={{color:'white'}} rowSpan="2">
                  {tr.unitCost}
                </th>
                <th className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold" style={{color:'white'}} rowSpan="2">
                  {tr.totalImpact}
                </th>
                {/* Headers de columnas personalizadas */}
                {customColumns.map(col => (
                  <th
                    key={col.id}
                    className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold bg-green-600"
                    rowSpan="2"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{col.name}</span>
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="text-xs px-2 py-0.5 bg-red-500 hover:bg-red-600 rounded"
                        title={tr.deleteColumn}
                      >
                        
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 px-1 py-1 text-center text-xs font-medium" style={{color:'white'}}>{tr.warehouse}</th>
                <th className="border border-gray-300 px-1 py-1 text-center text-xs font-medium" style={{color:'white'}}>{tr.inProcess}</th>
                <th className="border border-gray-300 px-1 py-1 text-center text-xs font-medium" style={{color:'white'}}>{tr.transit}</th>
                <th className="border border-gray-300 px-1 py-1 text-center text-xs font-medium" style={{color:'white'}}>{tr.customer}</th>
              </tr>
            </thead>

            <tbody>
              {parts.map((part, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="border border-gray-300 px-2 py-2 text-xs text-center text-gray-700">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800">
                    {part.partNumber || part.part_number || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">
                    {part.partName || part.part_name || tr.noDescription}
                  </td>

                  {/* Input: Almacén */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      value={part.qtyWarehouse || 0}
                      onChange={(e) => handleQuantityChange(index, 'qtyWarehouse', e.target.value)}
                      className="w-full px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ width: '60px' }}
                    />
                  </td>

                  {/* Input: En Proceso */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      value={part.qtyInProcess || 0}
                      onChange={(e) => handleQuantityChange(index, 'qtyInProcess', e.target.value)}
                      className="w-full px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ width: '60px' }}
                    />
                  </td>

                  {/* Input: En Tránsito */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      value={part.qtyInTransit || 0}
                      onChange={(e) => handleQuantityChange(index, 'qtyInTransit', e.target.value)}
                      className="w-full px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ width: '60px' }}
                    />
                  </td>

                  {/* Input: Con Cliente */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      value={part.qtyWithCustomer || 0}
                      onChange={(e) => handleQuantityChange(index, 'qtyWithCustomer', e.target.value)}
                      className="w-full px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ width: '60px' }}
                    />
                  </td>

                  {/* Total Afectado (calculado) */}
                  <td className="border border-gray-300 px-1 py-1 text-xs font-bold text-center bg-yellow-50">
                    {part.totalAffectedQty || 0}
                  </td>

                  {/* Costo Unitario (read-only) */}
                  <td className="border border-gray-300 px-1 py-1 text-xs text-right bg-gray-100">
                    ${(parseFloat(part.unitCost) || 0).toFixed(2)}
                  </td>

                  {/* Impacto Total (calculado) */}
                  <td className="border border-gray-300 px-1 py-1 text-xs font-bold text-right bg-red-50">
                    ${(parseFloat(part.totalCostImpact) || 0).toFixed(2)}
                  </td>

                  {/* Campos personalizados */}
                  {customColumns.map(col => (
                    <td key={col.id} className="border border-gray-300 px-1 py-1 bg-green-50">
                      <input
                        type={col.type}
                        value={part.customFields?.[col.id] || ''}
                        onChange={(e) => handleCustomFieldChange(index, col.id, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder={`${col.name}...`}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Fila de Totales */}
              <tr className="bg-blue-700 text-white font-bold">
                <td colSpan="3" className="border border-gray-300 px-2 py-1 text-xs text-right">
                  TOTALES:
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-center">
                  {totals.warehouse}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-center">
                  {totals.inProcess}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-center">
                  {totals.inTransit}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-center">
                  {totals.withCustomer}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-center bg-yellow-100 text-gray-900">
                  {totals.totalQty}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                  -
                </td>
                <td className="border border-gray-300 px-1 py-1 text-xs text-right bg-red-100 text-gray-900">
                  ${totals.totalCost.toFixed(2)}
                </td>
                {/* Celdas vacías para columnas personalizadas */}
                {customColumns.map(col => (
                  <td key={col.id} className="border border-gray-300 bg-green-700"></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda de columnas personalizadas */}
      {customColumns.length > 0 && (
        <div className="rounded p-3" style={{ backgroundColor: `${t.success}15`, border: `1px solid ${t.success}` }}>
          <p className="text-sm font-semibold mb-2" style={{ color: t.success }}>
             Columnas Personalizadas Activas:
          </p>
          <div className="flex flex-wrap gap-2">
            {customColumns.map(col => (
              <span
                key={col.id}
                className="px-3 py-1 text-xs rounded-full font-medium"
                style={{ backgroundColor: t.success, color: 'white' }}
              >
                {col.name} ({col.type === 'text' ? 'Texto' : col.type === 'number' ? 'Número' : 'Fecha'})
              </span>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: t.success }}>
             Estas columnas son opcionales y útiles para sistemas futuros como Cambios de Ingeniería (ECR/ECO)
          </p>
        </div>
      )}
    </div>
  );
};

export default PartsInventoryTable;
