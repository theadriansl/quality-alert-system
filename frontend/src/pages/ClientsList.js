import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Plus, CheckCircle2, XCircle, ArrowLeft, Download, Upload, Package, X, Edit2 , GripVertical, RotateCcw, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import clientService from '../services/clientService';
import ToastContainer from '../components/ToastContainer';
import BomFieldConfigPanel from '../components/BomFieldConfigPanel';
import { getCurrentUser, isUserAdmin, canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Global BOM Column Order Constants
const GLOBAL_BOM_VERSION = 'v2';
const GLOBAL_BOM_STORAGE_KEY = `globalBomColumnOrder_${GLOBAL_BOM_VERSION}`;
const DEFAULT_GLOBAL_BOM_COLUMNS = [
  'clientName', 'projectNumber', 'partNumber', 'partName', 'description',
  'revision', 'bomLevel', 'unitCost', 'clientPartNumber', 'weight',
  'snpQuantity', 'snpVolume', 'supplier', 'status'
];

const ClientsList = () => {
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  // Local translations
  const L = {
    en: {
      // Header
      title: 'Clients / Suppliers',
      subtitle: 'Client and supplier management',
      apps: 'Apps',
      globalBom: 'Global BOM',
      loading: 'Loading...',
      configBom: 'BOM Config',
      excelTemplate: 'Excel Template',
      importExcel: 'Import Excel',
      importing: 'Importing...',
      addClient: 'Add Client',
      // Read-only banner
      readOnlyMode: 'Read-Only Mode - You do not have permission to modify clients',
      // Stats
      totalClients: 'Total Clients / Suppliers',
      active: 'Active',
      clientsWithVendor: 'Clients (with Vendor Number)',
      // Table
      clientListing: 'CLIENT LISTING',
      search: 'Search',
      loadingClients: 'Loading clients...',
      noClientsSearch: 'No clients found matching your search',
      noClientsAvailable: 'No clients available',
      name: 'NAME',
      alias: 'ALIAS',
      vendorNumber: 'VENDOR NUMBER (Clients only)',
      status: 'STATUS',
      activeStatus: 'Active',
      inactiveStatus: 'Inactive',
      showing: 'Showing',
      of: 'of',
      clients: 'clients',
      // Global BOM Modal
      globalBomTitle: 'Global BOM - All Parts',
      partsTotal: 'parts in total',
      activeParts: 'active',
      inactiveParts: 'inactive',
      dragColumns: 'Drag headers to reorder columns',
      exportExcel: 'Export Excel',
      restore: 'Restore',
      noPartsRegistered: 'No parts registered',
      addPartsToSee: 'Add parts to clients to see them here',
      customFieldsFound: 'custom field(s) found',
      close: 'Close',
      actions: 'Actions',
      edit: 'Edit',
      // BOM columns
      client: 'Client',
      project: 'Project',
      partNumber: 'Part Number',
      partName: 'Name',
      description: 'Description',
      revision: 'Revision',
      bomLevel: 'BOM LVL',
      unitCost: 'Unit Cost',
      clientPartNum: 'Client Part #',
      weight: 'Weight (kg)',
      snpQty: 'SNP Qty',
      snpVol: 'SNP Vol (m³)',
      supplier: 'Supplier',
      statusCol: 'Status',
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
      noProject: 'No Project',
      // Edit Part Modal
      editPart: 'Edit Part',
      partNumberReq: 'Part Number *',
      clientPartNumber: 'Client Part Number',
      partNameReq: 'Part Name *',
      currency: 'Currency',
      customFields: 'Custom Fields',
      fieldName: 'Field Name',
      value: 'Value',
      add: '+ Add',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      // Messages
      noPartsExport: 'No parts to export',
      partUpdated: 'Part updated successfully',
      errorUpdatingPart: 'Error updating part',
      enterFieldName: 'Enter field name',
      errorLoadingClients: 'Error loading clients',
      errorLoadingBom: 'Error loading global BOM',
      importComplete: 'Import completed',
      clientsImported: 'clients imported successfully',
      clientsWithErrors: 'clients with errors',
      errors: 'Errors',
      errorImporting: 'Error importing file'
    },
    es: {
      // Header
      title: 'Clientes / Proveedores',
      subtitle: 'Gestión de clientes y proveedores',
      apps: 'Apps',
      globalBom: 'BOM Global',
      loading: 'Cargando...',
      configBom: 'Config BOM',
      excelTemplate: 'Plantilla Excel',
      importExcel: 'Importar Excel',
      importing: 'Importando...',
      addClient: 'Agregar Cliente',
      // Read-only banner
      readOnlyMode: 'Modo Solo Lectura - No tienes permisos para modificar clientes',
      // Stats
      totalClients: 'Total Clientes / Proveedores',
      active: 'Activos',
      clientsWithVendor: 'Clientes (con Número Proveedor)',
      // Table
      clientListing: 'LISTADO DE CLIENTES',
      search: 'Buscar',
      loadingClients: 'Cargando clientes...',
      noClientsSearch: 'No se encontraron clientes que coincidan con tu búsqueda',
      noClientsAvailable: 'No hay clientes disponibles',
      name: 'NOMBRE',
      alias: 'ALIAS',
      vendorNumber: 'NÚMERO PROVEEDOR (Solo clientes)',
      status: 'ESTADO',
      activeStatus: 'Activo',
      inactiveStatus: 'Inactivo',
      showing: 'Mostrando',
      of: 'de',
      clients: 'clientes',
      // Global BOM Modal
      globalBomTitle: 'BOM Global - Todas las Partes',
      partsTotal: 'partes en total',
      activeParts: 'activas',
      inactiveParts: 'inactivas',
      dragColumns: 'Arrastra los encabezados para reordenar columnas',
      exportExcel: 'Exportar Excel',
      restore: 'Restaurar',
      noPartsRegistered: 'No hay partes registradas',
      addPartsToSee: 'Agregue partes a los clientes para verlas aquí',
      customFieldsFound: 'campo(s) personalizado(s) encontrado(s)',
      close: 'Cerrar',
      actions: 'Acciones',
      edit: 'Editar',
      // BOM columns
      client: 'Cliente',
      project: 'Proyecto',
      partNumber: 'Número de Parte',
      partName: 'Nombre',
      description: 'Descripción',
      revision: 'Revisión',
      bomLevel: 'BOM LVL',
      unitCost: 'Costo Unitario',
      clientPartNum: 'Part # Cliente',
      weight: 'Peso (kg)',
      snpQty: 'Cant. SNP',
      snpVol: 'Vol. SNP (m³)',
      supplier: 'Proveedor',
      statusCol: 'Estado',
      activeLabel: 'Activo',
      inactiveLabel: 'Inactivo',
      noProject: 'Sin Proyecto',
      // Edit Part Modal
      editPart: 'Editar Parte',
      partNumberReq: 'Número de Parte *',
      clientPartNumber: 'Número de Parte del Cliente',
      partNameReq: 'Nombre de Parte *',
      currency: 'Moneda',
      customFields: 'Campos Personalizados',
      fieldName: 'Nombre del Campo',
      value: 'Valor',
      add: '+ Agregar',
      cancel: 'Cancelar',
      saveChanges: 'Guardar Cambios',
      // Messages
      noPartsExport: 'No hay partes para exportar',
      partUpdated: 'Parte actualizada exitosamente',
      errorUpdatingPart: 'Error al actualizar la parte',
      enterFieldName: 'Ingrese el nombre del campo',
      errorLoadingClients: 'Error al cargar clientes',
      errorLoadingBom: 'Error al cargar BOM global',
      importComplete: 'Importación completada',
      clientsImported: 'clientes importados exitosamente',
      clientsWithErrors: 'clientes con errores',
      errors: 'Errores',
      errorImporting: 'Error al importar archivo'
    }
  }[language] || {};
  const fileInputRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [showGlobalBOM, setShowGlobalBOM] = useState(false);
  const [globalBOMData, setGlobalBOMData] = useState({ parts: [], allCustomFieldNames: [] });
  const [loadingBOM, setLoadingBOM] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [editingPartCustomFields, setEditingPartCustomFields] = useState([]);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');
  const [toasts, setToasts] = useState([]);
  const [showBomConfig, setShowBomConfig] = useState(false);

  // Get user role (using centralized utility)
  const user = getCurrentUser();
  const isAdmin = isUserAdmin(user);
  const canEdit = canUserEdit('clients');
  const readOnly = isReadOnly('clients');

  // Global BOM Column Order - Draggable columns
  const [globalBomColumnOrder, setGlobalBomColumnOrder] = useState(() => {
    // Clear old version keys
    localStorage.removeItem('globalBomColumnOrder');
    localStorage.removeItem('globalBomColumnOrder_v1');
    const saved = localStorage.getItem(GLOBAL_BOM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_BOM_COLUMNS;
  });
  const [draggedGlobalColumn, setDraggedGlobalColumn] = useState(null);

  
  // Drag & Drop handlers for Global BOM columns
  const handleGlobalColumnDragStart = (e, columnId) => {
    setDraggedGlobalColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGlobalColumnDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGlobalColumnDrop = (e, targetColumnId) => {
    e.preventDefault();

    if (!draggedGlobalColumn || draggedGlobalColumn === targetColumnId) {
      setDraggedGlobalColumn(null);
      return;
    }

    const newOrder = [...globalBomColumnOrder];
    const draggedIndex = newOrder.indexOf(draggedGlobalColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedGlobalColumn);

    setGlobalBomColumnOrder(newOrder);
    localStorage.setItem(GLOBAL_BOM_STORAGE_KEY, JSON.stringify(newOrder));
    setDraggedGlobalColumn(null);
  };

  const handleGlobalColumnDragEnd = () => {
    setDraggedGlobalColumn(null);
  };

  const resetGlobalColumnOrder = () => {
    const customFieldColumns = globalBOMData.allCustomFieldNames || [];
    const defaultOrder = [...DEFAULT_GLOBAL_BOM_COLUMNS, ...customFieldColumns];
    setGlobalBomColumnOrder(defaultOrder);
    localStorage.setItem(GLOBAL_BOM_STORAGE_KEY, JSON.stringify(defaultOrder));
  };

  // Export Global BOM to Excel
  const handleExportGlobalBOM = () => {
    if (globalBOMData.parts.length === 0) {
      alert(L.noPartsExport);
      return;
    }

    const exportData = globalBOMData.parts.map(part => {
      const baseData = {
        'Cliente': part.clientName || '',
        'Proyecto': part.projectNumber || 'Sin Proyecto',
        'Número de Parte': part.partNumber || '',
        'Nombre de Parte': part.partName || '',
        'Descripción': part.description || '',
        'Revisión': part.revision || '',
        'BOM LVL': part.bomLevel || 1,
        'Costo Unitario': part.unitCost !== '' && part.unitCost != null ? part.unitCost : '',
        'Moneda': part.currency || 'USD',
        'Part # Cliente': part.clientPartNumber || '',
        'Peso (kg)': part.weight !== '' && part.weight != null ? part.weight : '',
        'Cantidad SNP': part.snpQuantity !== '' && part.snpQuantity != null ? part.snpQuantity : '',
        'Volumen SNP (m³)': part.snpVolume !== '' && part.snpVolume != null ? part.snpVolume : '',
        'Proveedor': part.supplier || '',
        'Estado': part.active ? 'Activo' : 'Inactivo'
      };

      // Add custom fields if they exist
      if (part.customFields && typeof part.customFields === 'object') {
        Object.keys(part.customFields).forEach(fieldName => {
          baseData[fieldName] = part.customFields[fieldName] || '';
        });
      }

      return baseData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 20 }, // Cliente
      { wch: 18 }, // Proyecto
      { wch: 20 }, // Número de Parte
      { wch: 30 }, // Nombre de Parte
      { wch: 40 }, // Descripción
      { wch: 12 }, // Revisión
      { wch: 10 }, // BOM LVL
      { wch: 15 }, // Costo Unitario
      { wch: 10 }, // Moneda
      { wch: 18 }, // Part # Cliente
      { wch: 12 }, // Peso
      { wch: 15 }, // Cantidad SNP
      { wch: 18 }, // Volumen SNP
      { wch: 25 }, // Proveedor
      { wch: 10 }  // Estado
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'BOM Global');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `BOM_Global_${timestamp}.xlsx`);
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Filtrado local adicional para búsqueda en tiempo real
    if (searchTerm) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.vendorNumber && client.vendorNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getAllClients();
      setClients(data.clients);
      setFilteredClients(data.clients);
      setStats(data.stats);
    } catch (err) {
      setError(L.errorLoadingClients + ': ' + err.message);
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const handleAddClient = () => {
    navigate('/clients/new');
  };

  const loadGlobalBOM = async () => {
    try {
      setLoadingBOM(true);
      const data = await clientService.getAllParts(false); // Load all parts (active + inactive)
      setGlobalBOMData(data);

        // Update column order to include any new custom fields
        const savedOrder = localStorage.getItem(GLOBAL_BOM_STORAGE_KEY);
        const currentOrder = savedOrder ? JSON.parse(savedOrder) : [
          'status', 'clientName', 'partNumber', 'partName',
          'description', 'revision', 'unitCost'
        ];

        // Add any new custom fields that aren't in the saved order
        const baseColumns = ['status', 'clientName', 'partNumber', 'partName', 'description', 'revision', 'unitCost'];
        const existingCustomFields = currentOrder.filter(col => !baseColumns.includes(col));
        const newCustomFields = (data.allCustomFieldNames || []).filter(field => !existingCustomFields.includes(field));

        if (newCustomFields.length > 0) {
          const updatedOrder = [...currentOrder, ...newCustomFields];
          setGlobalBomColumnOrder(updatedOrder);
          localStorage.setItem(GLOBAL_BOM_STORAGE_KEY, JSON.stringify(updatedOrder));
        }
      setShowGlobalBOM(true);
    } catch (err) {
      console.error('Error loading global BOM:', err);
      alert(L.errorLoadingBom + ': ' + err.message);
    } finally {
      setLoadingBOM(false);
    }
  };

  // Toast notification functions
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Part editing handlers
  const handleEditPart = (part) => {
    setEditingPart({
      ...part,
      customFields: part.customFields || {}
    });

    // Convert custom fields object to array for editing
    const customFieldsArray = Object.entries(part.customFields || {}).map(([key, value]) => ({
      key,
      value,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setEditingPartCustomFields(customFieldsArray);
  };

  const handleUpdatePart = async () => {
    if (!editingPart) return;

    try {
      // Convert custom fields array back to object
      const customFieldsObject = {};
      editingPartCustomFields.forEach(field => {
        if (field.key && field.key.trim()) {
          customFieldsObject[field.key] = field.value;
        }
      });

      const updatedPartData = {
        ...editingPart,
        customFields: customFieldsObject
      };

      // Update in client_parts table (BOM)
      await clientService.updatePart(editingPart.clientId, editingPart.id, updatedPartData);

      // Update local state in global BOM
      setGlobalBOMData(prev => ({
        ...prev,
        parts: prev.parts.map(p => p.id === editingPart.id ? updatedPartData : p)
      }));

      showToast(L.partUpdated, 'success');
      handleCancelEditPart();
    } catch (error) {
      console.error('Error updating part:', error);
      showToast(L.errorUpdatingPart, 'error');
    }
  };

  const handleAddCustomField = () => {
    if (!newCustomFieldKey.trim()) {
      showToast(L.enterFieldName, 'error');
      return;
    }

    const newField = {
      key: newCustomFieldKey,
      value: newCustomFieldValue,
      id: Math.random().toString(36).substr(2, 9)
    };

    setEditingPartCustomFields([...editingPartCustomFields, newField]);
    setNewCustomFieldKey('');
    setNewCustomFieldValue('');
  };

  const handleRemoveCustomField = (fieldId) => {
    setEditingPartCustomFields(editingPartCustomFields.filter(f => f.id !== fieldId));
  };

  const handleUpdateCustomField = (fieldId, key, value) => {
    setEditingPartCustomFields(editingPartCustomFields.map(f =>
      f.id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  const handleCancelEditPart = () => {
    setEditingPart(null);
    setEditingPartCustomFields([]);
    setNewCustomFieldKey('');
    setNewCustomFieldValue('');
  };

  const handleDownloadTemplate = () => {
    // Create template data
    const template = [
      {
        'Nombre del Cliente': 'Ejemplo Corp',
        'Alias': 'EJCORP',
        'Número de Proveedor': 'PROV-001',
        'Contacto Principal': 'Juan Pérez',
        'Email': 'juan@ejemplo.com',
        'Teléfono': '+52 123 456 7890',
        'Dirección': 'Calle Ejemplo #123',
        'Ciudad': 'Ciudad Ejemplo',
        'Estado': 'Estado Ejemplo',
        'País': 'México',
        'Código Postal': '12345',
        'Activo': 'SI'
      },
      {
        'Nombre del Cliente': '',
        'Alias': '',
        'Número de Proveedor': '',
        'Contacto Principal': '',
        'Email': '',
        'Teléfono': '',
        'Dirección': '',
        'Ciudad': '',
        'Estado': '',
        'País': '',
        'Código Postal': '',
        'Activo': 'SI'
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Nombre del Cliente
      { wch: 15 }, // Alias
      { wch: 20 }, // Número de Proveedor
      { wch: 25 }, // Contacto Principal
      { wch: 30 }, // Email
      { wch: 18 }, // Teléfono
      { wch: 35 }, // Dirección
      { wch: 20 }, // Ciudad
      { wch: 20 }, // Estado
      { wch: 15 }, // País
      { wch: 12 }, // Código Postal
      { wch: 10 }  // Activo
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    // Generate Excel file and download
    XLSX.writeFile(wb, 'Plantilla_Clientes.xlsx');
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of jsonData) {
        try {
          // Skip empty rows
          if (!row['Nombre del Cliente'] || !row['Alias']) {
            continue;
          }

          const clientData = {
            name: row['Nombre del Cliente'],
            alias: row['Alias'],
            vendorNumber: row['Número de Proveedor'] || '',
            isActive: (row['Activo'] || 'SI').toUpperCase() === 'SI',
            contacts: [],
            address: {
              street: row['Dirección'] || '',
              city: row['Ciudad'] || '',
              state: row['Estado'] || '',
              country: row['País'] || '',
              postalCode: row['Código Postal'] || ''
            }
          };

          // Add contact if provided
          if (row['Contacto Principal']) {
            clientData.contacts.push({
              name: row['Contacto Principal'],
              role: 'Principal',
              email: row['Email'] || '',
              phone: row['Teléfono'] || ''
            });
          }

          await clientService.createClient(clientData);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${row['Nombre del Cliente']}: ${err.message}`);
        }
      }

      // Show results
      let message = `${L.importComplete}:\n- ${successCount} ${L.clientsImported}`;
      if (errorCount > 0) {
        message += `\n- ${errorCount} ${L.clientsWithErrors}`;
        if (errors.length <= 5) {
          message += `\n\n${L.errors}:\n${errors.join('\n')}`;
        }
      }
      alert(message);

      // Reload clients
      loadClients();
    } catch (err) {
      alert(L.errorImporting + ': ' + err.message);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg }}>
      {/* Read-only banner */}
      {readOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderBottom: '2px solid #C77700',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}></span>
          <span style={{ color: '#92400e', fontWeight: '600', fontSize: '14px' }}>
            {L.readOnlyMode}
          </span>
        </div>
      )}
      {/* Header */}
      <div style={{
        backgroundColor: t.bgCard,
        borderBottom: `1px solid ${t.border}`,
        padding: '24px 32px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: t.text,
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Building2 size={32} color="#0072CE" />
              {L.title}
            </h1>
            <p style={{
              fontSize: '14px',
              color: t.textMuted,
              margin: 0
            }}>
              {L.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <ThemeSelector />
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: t.bgCard,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = t.bg}
              onMouseLeave={(e) => e.target.style.backgroundColor = t.bgCard}
            >
               {L.apps}
            </button>
            <button
              onClick={loadGlobalBOM}
              disabled={loadingBOM}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loadingBOM ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: loadingBOM ? 0.6 : 1
              }}
              onMouseEnter={(e) => !loadingBOM && (e.target.style.backgroundColor = '#7c3aed')}
              onMouseLeave={(e) => !loadingBOM && (e.target.style.backgroundColor = '#8b5cf6')}
            >
              <Package size={16} />
              {loadingBOM ? L.loading : L.globalBom}
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowBomConfig(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#C77700',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#C77700'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#C77700'}
              >
                <Settings size={16} />
                {L.configBom}
              </button>
            )}
            <button
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#2E7D32',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2E7D32'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2E7D32'}
            >
              <Download size={16} />
              {L.excelTemplate}
            </button>
            {canEdit && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: importing ? '#9ca3af' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !importing && (e.target.style.backgroundColor = '#7c3aed')}
                onMouseLeave={(e) => !importing && (e.target.style.backgroundColor = '#8b5cf6')}
              >
                <Upload size={16} />
                {importing ? L.importing : L.importExcel}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              style={{ display: 'none' }}
            />
            {canEdit && (
              <button
                onClick={handleAddClient}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = t.accent}
                onMouseLeave={(e) => e.target.style.backgroundColor = t.accent}
              >
                <Plus size={20} />
                {L.addClient}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px'
      }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '8px' }}>
              {L.totalClients}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: t.text }}>
              {stats.total}
            </div>
          </div>
          <div style={{
            backgroundColor: t.bgCard,
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '8px' }}>
              {L.active}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#2E7D32' }}>
              {stats.active}
            </div>
          </div>
          <div style={{
            backgroundColor: t.bgCard,
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: t.textMuted, marginBottom: '8px' }}>
              {L.clientsWithVendor}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: t.accent }}>
              {stats.withVendorNumber}
            </div>
          </div>
        </div>

        {/* Client Listing Card */}
        <div style={{
          backgroundColor: t.bgCard,
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Card Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: t.text,
              margin: 0
            }}>
              {L.clientListing}
            </h2>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: t.textDim
                }}
              />
              <input
                type="text"
                placeholder={L.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 40px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: t.textMuted
            }}>
              {L.loadingClients}
            </div>
          ) : error ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: '#ef4444'
            }}>
              {error}
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: t.textMuted
            }}>
              {searchTerm ? L.noClientsSearch : L.noClientsAvailable}
            </div>
          ) : (
            <>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: t.bg,
                    borderBottom: `1px solid ${t.border}`
                  }}>
                    <th style={{
                      padding: '12px 24px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: t.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {L.name}
                    </th>
                    <th style={{
                      padding: '12px 24px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: t.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {L.alias}
                    </th>
                    <th style={{
                      padding: '12px 24px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: t.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {L.vendorNumber}
                    </th>
                    <th style={{
                      padding: '12px 24px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: t.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {L.status}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, index) => (
                    <tr
                      key={client.id}
                      onClick={() => handleClientClick(client.id)}
                      style={{
                        backgroundColor: index % 2 === 0 ? t.bgCard : t.bg,
                        borderBottom: `1px solid ${t.border}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? t.bgCard : t.bg}
                    >
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '14px',
                        color: t.text
                      }}>
                        {client.name}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '14px',
                        color: t.textMuted,
                        fontWeight: '500'
                      }}>
                        {client.alias}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        fontSize: '14px',
                        color: t.textMuted
                      }}>
                        {client.vendorNumber || '-'}
                      </td>
                      <td style={{
                        padding: '16px 24px',
                        textAlign: 'center'
                      }}>
                        {client.isActive ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            <CheckCircle2 size={14} />
                            {L.activeStatus}
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            <XCircle size={14} />
                            {L.inactiveStatus}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: `1px solid ${t.border}`,
                fontSize: '14px',
                color: t.textMuted,
                textAlign: 'center'
              }}>
                {L.showing} {filteredClients.length} {L.of} {clients.length} {L.clients}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global BOM Modal */}
      {showGlobalBOM && (
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
            maxWidth: '95vw',
            maxHeight: '90vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: t.bg
            }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Package size={28} color="#8b5cf6" />
                  {L.globalBomTitle}
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: t.textMuted }}>
                  {globalBOMData.total} {L.partsTotal} ({globalBOMData.activeCount} {L.activeParts}, {globalBOMData.inactiveCount} {L.inactiveParts})
                </p>
              </div>
              <button
                onClick={() => setShowGlobalBOM(false)}
                style={{
                  padding: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#B00020',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Draggable Table with Custom Fields as Individual Columns */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Header with Export and Reset Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: t.textDim, fontStyle: 'italic' }}>
                   {L.dragColumns}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleExportGlobalBOM}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#2E7D32',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={L.exportExcel}
                  >
                    <Download size={12} />
                    {L.exportExcel}
                  </button>
                  <button
                    onClick={resetGlobalColumnOrder}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: t.bg,
                      color: t.textMuted,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={L.restore}
                  >
                    <RotateCcw size={12} />
                    {L.restore}
                  </button>
                </div>
              </div>

              {globalBOMData.parts.length > 0 ? (
                <div style={{
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: t.bg, borderBottom: `2px solid ${t.border}` }}>
                          {globalBomColumnOrder.map((columnId) => {
                            // Base column configuration - All 14 fixed columns
                            const baseColumns = {
                              clientName: { label: L.client, align: 'left', width: 'auto', isCustom: false },
                              projectNumber: { label: L.project, align: 'left', width: 'auto', isCustom: false },
                              partNumber: { label: L.partNumber, align: 'left', width: 'auto', isCustom: false },
                              partName: { label: L.partName, align: 'left', width: 'auto', isCustom: false },
                              description: { label: L.description, align: 'left', width: '200px', isCustom: false },
                              revision: { label: L.revision, align: 'left', width: 'auto', isCustom: false },
                              bomLevel: { label: L.bomLevel, align: 'center', width: 'auto', isCustom: false },
                              unitCost: { label: L.unitCost, align: 'right', width: 'auto', isCustom: false },
                              clientPartNumber: { label: L.clientPartNum, align: 'left', width: 'auto', isCustom: false },
                              weight: { label: L.weight, align: 'right', width: 'auto', isCustom: false },
                              snpQuantity: { label: L.snpQty, align: 'right', width: 'auto', isCustom: false },
                              snpVolume: { label: L.snpVol, align: 'right', width: 'auto', isCustom: false },
                              supplier: { label: L.supplier, align: 'left', width: 'auto', isCustom: false },
                              status: { label: L.statusCol, align: 'left', width: 'auto', isCustom: false }
                            };

                            // Check if it's a base column or custom field
                            const column = baseColumns[columnId] || {
                              label: columnId, // Custom field name
                              align: 'left',
                              width: 'auto',
                              isCustom: true
                            };

                            return (
                              <th
                                key={columnId}
                                draggable
                                onDragStart={(e) => handleGlobalColumnDragStart(e, columnId)}
                                onDragOver={handleGlobalColumnDragOver}
                                onDrop={(e) => handleGlobalColumnDrop(e, columnId)}
                                onDragEnd={handleGlobalColumnDragEnd}
                                style={{
                                  padding: '12px',
                                  textAlign: column.align,
                                  fontWeight: '600',
                                  color: t.text,
                                  whiteSpace: 'nowrap',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                  backgroundColor: draggedGlobalColumn === columnId ? '#e0e7ff' : (column.isCustom ? '#ecfdf5' : t.bg),
                                  transition: 'background-color 0.2s',
                                  minWidth: column.width
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <GripVertical size={14} style={{ opacity: 0.4 }} />
                                  {column.label} {column.isCustom && ''}
                                </div>
                              </th>
                            );
                          })}
                          {canEdit && <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.text, whiteSpace: 'nowrap' }}>{L.actions}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {globalBOMData.parts.map((part, index) => (
                          <tr key={part.id} style={{
                            borderBottom: `1px solid ${t.border}`,
                            backgroundColor: index % 2 === 0 ? t.bgCard : t.bg
                          }}>
                            {globalBomColumnOrder.map((columnId) => {
                              // Render cell content based on column ID
                              switch (columnId) {
                                case 'status':
                                  return (
                                    <td key={columnId} style={{ padding: '12px' }}>
                                      <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: part.active ? '#d1fae5' : '#fee2e2',
                                        color: part.active ? '#065f46' : '#991b1b'
                                      }}>
                                        {part.active ? ` ${L.activeLabel}` : ` ${L.inactiveLabel}`}
                                      </span>
                                    </td>
                                  );
                                case 'clientName':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', fontWeight: '500', color: t.text }}>
                                      {part.clientName}
                                    </td>
                                  );
                                case 'partNumber':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', fontWeight: '500', color: t.accent }}>
                                      <span style={{ paddingLeft: `${(part._depth || 0) * 20}px`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        {part._depth > 0 && <span style={{ color: t.textMuted }}>└─</span>}
                                        {part.partNumber}
                                        {part.childrenCount > 0 && (
                                          <span style={{ fontSize: '10px', color: t.accent, fontWeight: '400' }}>
                                            ({part.childrenCount} sub)
                                          </span>
                                        )}
                                      </span>
                                    </td>
                                  );
                                case 'partName':
                                  return (
                                    <td key={columnId} style={{ padding: '12px' }}>
                                      {part.partName}
                                    </td>
                                  );
                                case 'description':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', color: t.textMuted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {part.description || '-'}
                                    </td>
                                  );
                                case 'revision':
                                  return (
                                    <td key={columnId} style={{ padding: '12px' }}>
                                      {part.revision || '-'}
                                    </td>
                                  );
                                case 'unitCost':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', textAlign: 'right' }}>
                                      {part.unitCost ? `${part.currency || 'USD'} $${parseFloat(part.unitCost).toFixed(2)}` : '-'}
                                    </td>
                                  );
                                case 'projectNumber':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', color: t.textMuted }}>
                                      {part.projectNumber || L.noProject}
                                    </td>
                                  );
                                case 'bomLevel':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: t.accent }}>
                                      {(part._depth || 0) + 1}
                                    </td>
                                  );
                                case 'clientPartNumber':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', color: t.textMuted }}>
                                      {part.clientPartNumber || '-'}
                                    </td>
                                  );
                                case 'weight':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', textAlign: 'right', color: t.textMuted }}>
                                      {part.weight ? parseFloat(part.weight).toFixed(3) : '-'}
                                    </td>
                                  );
                                case 'snpQuantity':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', textAlign: 'right', color: t.textMuted }}>
                                      {part.snpQuantity || '-'}
                                    </td>
                                  );
                                case 'snpVolume':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', textAlign: 'right', color: t.textMuted }}>
                                      {part.snpVolume ? parseFloat(part.snpVolume).toFixed(3) : '-'}
                                    </td>
                                  );
                                case 'supplier':
                                  return (
                                    <td key={columnId} style={{ padding: '12px', color: t.textMuted }}>
                                      {part.supplier || '-'}
                                    </td>
                                  );
                                default:
                                  // Custom field column
                                  return (
                                    <td key={columnId} style={{
                                      padding: '12px',
                                      backgroundColor: part.customFields?.[columnId] ? '#f0fdf4' : 'transparent'
                                    }}>
                                      {part.customFields?.[columnId] || '-'}
                                    </td>
                                  );
                              }
                            })}
                            {canEdit && (
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleEditPart(part)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: t.accent,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Edit2 size={12} />
                                  {L.edit}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: t.textMuted }}>
                  <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p style={{ fontSize: '16px', fontWeight: '500' }}>{L.noPartsRegistered}</p>
                  <p style={{ fontSize: '14px' }}>{L.addPartsToSee}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${t.border}`,
              backgroundColor: t.bg,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', color: t.textMuted }}>
                {globalBOMData.allCustomFieldNames.length > 0 && (
                  <span> {globalBOMData.allCustomFieldNames.length} {L.customFieldsFound}</span>
                )}
              </div>
              <button
                onClick={() => setShowGlobalBOM(false)}
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
                {L.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {editingPart && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              {L.editPart}
            </h2>

            {/* Standard Fields */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Part Number */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.partNumberReq}
                </label>
                <input
                  type="text"
                  value={editingPart.partNumber || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, partNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Client Part Number */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.clientPartNumber}
                </label>
                <input
                  type="text"
                  value={editingPart.clientPartNumber || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, clientPartNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Part Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.partNameReq}
                </label>
                <input
                  type="text"
                  value={editingPart.partName || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, partName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Revision */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.revision}
                </label>
                <input
                  type="text"
                  value={editingPart.revision || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, revision: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Unit Cost */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.unitCost}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPart.unitCost || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, unitCost: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Currency */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: t.text,
                  marginBottom: '6px'
                }}>
                  {L.currency}
                </label>
                <select
                  value={editingPart.currency || 'USD'}
                  onChange={(e) => setEditingPart({ ...editingPart, currency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: t.text,
                marginBottom: '6px'
              }}>
                {L.description}
              </label>
              <textarea
                value={editingPart.description || ''}
                onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Custom Fields Section */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #86efac',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {L.customFields}
              </h3>

              {/* Existing Custom Fields */}
              {editingPartCustomFields.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  {editingPartCustomFields.map((field) => (
                    <div key={field.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '8px',
                      marginBottom: '8px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        placeholder={L.fieldName}
                        value={field.key}
                        onChange={(e) => handleUpdateCustomField(field.id, 'key', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                      <input
                        type="text"
                        placeholder={L.value}
                        value={field.value}
                        onChange={(e) => handleUpdateCustomField(field.id, 'value', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${t.border}`,
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Custom Field */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '8px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: t.text,
                    marginBottom: '4px'
                  }}>
                    {L.fieldName}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: ECR Number"
                    value={newCustomFieldKey}
                    onChange={(e) => setNewCustomFieldKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomField()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: t.text,
                    marginBottom: '4px'
                  }}>
                    {L.value}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: ECR-2024-001"
                    value={newCustomFieldValue}
                    onChange={(e) => setNewCustomFieldValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomField()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${t.border}`,
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {L.add}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelEditPart}
                style={{
                  padding: '10px 20px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {L.cancel}
              </button>
              <button
                onClick={handleUpdatePart}
                disabled={!editingPart.partNumber || !editingPart.partName}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !editingPart.partNumber || !editingPart.partName ? t.textDim : t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: !editingPart.partNumber || !editingPart.partName ? 'not-allowed' : 'pointer'
                }}
              >
                {L.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* BOM Field Configuration Panel (Admin Only) */}
      {showBomConfig && (
        <BomFieldConfigPanel
          onClose={() => setShowBomConfig(false)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default ClientsList;
