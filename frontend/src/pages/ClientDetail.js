import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  User,
  Briefcase,
  Users,
  FileText,
  Clock,
  Edit,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Target,
  Download,
  Upload,
  Filter,
  X,
  RefreshCw,
  Package,
  Settings,
  GripVertical,
  RotateCcw,
  Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import clientService from '../services/clientService';
import projectService from '../services/projectService';
import bomFieldService from '../services/bomFieldService';
import ToastContainer from '../components/ToastContainer';
import { useTheme } from '../context/ThemeContext';

// BOM Column Order Constants - outside component to avoid re-creation
const BOM_COLUMN_VERSION = 'v3';
const BOM_STORAGE_KEY = `bomColumnOrder_${BOM_COLUMN_VERSION}`;
const DEFAULT_BOM_COLUMNS = [
  'clientName', 'projectNumber', 'partNumber', 'partName', 'description',
  'revision', 'bomLevel', 'unitCost', 'clientPartNumber', 'weight',
  'snpQuantity', 'snpVolume', 'supplier', 'status'
];

const ClientDetail = () => {
  const { theme } = useTheme();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const partsFileInputRef = useRef(null);
  const contactsFileInputRef = useRef(null);
  const documentsFileInputRef = useRef(null);

  // Helper function to format date for input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [importingParts, setImportingParts] = useState(false);
  const [importingContacts, setImportingContacts] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentToUpload, setDocumentToUpload] = useState({
    file: null,
    title: '',
    description: ''
  });
  const [newProject, setNewProject] = useState({
    projectNumber: '',
    projectName: '',
    description: '',
    status: 'Active',
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: ''
  });
  const [projectParts, setProjectParts] = useState([]);
  const [clientContacts, setClientContacts] = useState([]);
  const [clientParts, setClientParts] = useState([]); // BOM - Bill of Materials

  // BOM Column Order - Draggable columns (matching client BOM order)
  const [bomColumnOrder, setBomColumnOrder] = useState(() => {
    // Clear ALL old version keys on first load
    localStorage.removeItem('bomColumnOrder');
    localStorage.removeItem('bomColumnOrder_v1');
    localStorage.removeItem('bomColumnOrder_v2');
    const saved = localStorage.getItem(BOM_STORAGE_KEY);
    console.log('BOM Column Order initialized:', saved ? JSON.parse(saved) : DEFAULT_BOM_COLUMNS);
    return saved ? JSON.parse(saved) : DEFAULT_BOM_COLUMNS;
  });
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [newPart, setNewPart] = useState({
    partNumber: '',
    clientPartNumber: '',
    partName: '',
    description: '',
    revision: '',
    specifications: '',
    weight: '',
    snpQuantity: '',
    snpVolume: '',
    unitCost: '',
    currency: 'USD',
    parentPartId: null,
    bomLevel: 1,
    supplier: ''
  });
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    email: '',
    phone: ''
  });
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineFilters, setTimelineFilters] = useState({
    startDate: '',
    endDate: '',
    eventCategory: 'all',
    eventType: 'all',
    sortOrder: 'newest'
  });
  const [editingPart, setEditingPart] = useState(null);
  const [editingPartCustomFields, setEditingPartCustomFields] = useState([]);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [addPartForProjectId, setAddPartForProjectId] = useState(null); // Track which project the part is being added to
  const [newPartCustomFields, setNewPartCustomFields] = useState([]);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');

  // Toast notification functions
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getClientById(clientId);
      setClient(data);
      setClientContacts(data.contacts || []);
    } catch (err) {
      setError('Error al cargar cliente: ' + err.message);
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadClientParts = useCallback(async () => {
    try {
      const data = await clientService.getParts(clientId, false); // Load all parts (active + inactive)
      setClientParts(data.projectGroups || []);

      // Detect all unique custom field names from all parts
      const allCustomFieldNames = new Set();
      (data.projectGroups || []).forEach(group => {
        (group.parts || []).forEach(part => {
          if (part.customFields && typeof part.customFields === 'object') {
            Object.keys(part.customFields).forEach(fieldName => {
              allCustomFieldNames.add(fieldName);
            });
          }
        });
      });

      // Update column order to include custom fields if any exist
      if (allCustomFieldNames.size > 0) {
        const savedOrder = localStorage.getItem(BOM_STORAGE_KEY);
        const currentOrder = savedOrder ? JSON.parse(savedOrder) : DEFAULT_BOM_COLUMNS;

        const existingCustomFields = currentOrder.filter(col => !DEFAULT_BOM_COLUMNS.includes(col));
        const newCustomFields = Array.from(allCustomFieldNames).filter(field => !existingCustomFields.includes(field));

        if (newCustomFields.length > 0) {
          const updatedOrder = [...currentOrder, ...newCustomFields];
          setBomColumnOrder(updatedOrder);
          localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(updatedOrder));
        }
      }
    } catch (err) {
      console.error('Error loading client parts:', err);
      showToast('Error al cargar partes: ' + err.message, 'error');
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // Load current user for traceability
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (!loading && client) {
      if (activeTab === 'projects') {
        loadProjects();
      } else if (activeTab === 'documents') {
        loadDocuments();
      } else if (activeTab === 'timeline') {
        loadTimeline();
      } else if (activeTab === 'parts') {
        loadClientParts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientId, loading, client]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await projectService.getAllProjects({ clientId: clientId });
      setProjects(data.projects);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadDocuments = async () => {
    if (!client) return; // Don't load if client is not ready

    try {
      const docs = await clientService.getDocuments(clientId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
      alert('Error al cargar documentos: ' + err.message);
    }
  };

  const loadTimeline = async () => {
    if (!client) return;

    try {
      setLoadingTimeline(true);
      const events = await clientService.getTimeline(clientId, timelineFilters);
      setTimeline(events);
    } catch (err) {
      console.error('Error loading timeline:', err);
      alert('Error al cargar timeline: ' + err.message);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleTimelineFilterChange = (filterName, value) => {
    setTimelineFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const applyTimelineFilters = () => {
    loadTimeline();
  };

  const clearTimelineFilters = () => {
    setTimelineFilters({
      startDate: '',
      endDate: '',
      eventCategory: 'all',
      eventType: 'all',
      sortOrder: 'newest'
    });
    // Reload will happen automatically via useEffect when filters change
  };

  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setDocumentToUpload({
      file: file,
      title: '',
      description: ''
    });
    setShowUploadModal(true);

    // Reset file input
    if (documentsFileInputRef.current) {
      documentsFileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setDocumentToUpload({
      file: null,
      title: '',
      description: ''
    });
  };

  const handleConfirmUpload = async () => {
    if (!documentToUpload.file) return;

    if (!documentToUpload.title.trim()) {
      alert('Por favor ingrese un título para el documento');
      return;
    }

    try {
      setUploadingDocument(true);
      const uploadedDoc = await clientService.uploadDocument(
        clientId,
        documentToUpload.file,
        documentToUpload.title,
        documentToUpload.description,
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System'
      );

      alert('Documento subido exitosamente: ' + uploadedDoc.fileName);
      setShowUploadModal(false);
      setDocumentToUpload({
        file: null,
        title: '',
        description: ''
      });
      await loadDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Error al subir documento: ' + err.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId, fileName) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar el documento "${fileName}"?`)) {
      return;
    }

    try {
      await clientService.deleteDocument(clientId, documentId);
      alert('Documento eliminado exitosamente');
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error al eliminar documento: ' + err.message);
    }
  };

  const handleDownloadDocument = (document) => {
    // Open document in new tab for download/view
    const fileUrl = `http://localhost:5000${document.filePath}`;
    window.open(fileUrl, '_blank');
  };

  const handleAddPart = async () => {
    if (!newPart.partNumber || !newPart.partName) {
      alert('Número de parte y nombre son obligatorios');
      return;
    }

    // Validate unitCost is required
    if (!newPart.unitCost || newPart.unitCost === '') {
      alert('Costo Unitario es obligatorio');
      return;
    }

    const unitCost = parseFloat(newPart.unitCost);
    if (isNaN(unitCost) || unitCost < 0) {
      alert('Costo Unitario debe ser un número mayor o igual a 0');
      return;
    }

    // Validate numeric fields
    if (newPart.weight !== '' && newPart.weight !== null) {
      const weight = parseFloat(newPart.weight);
      if (isNaN(weight) || weight < 0) {
        alert('Peso debe ser un número mayor o igual a 0');
        return;
      }
      if (weight > 10000) {
        alert('Peso excede el máximo permitido (10000 kg)');
        return;
      }
    }

    if (newPart.snpQuantity !== '' && newPart.snpQuantity !== null) {
      const quantity = parseInt(newPart.snpQuantity);
      if (isNaN(quantity) || quantity < 0) {
        alert('Cantidad SNP debe ser un número entero mayor o igual a 0');
        return;
      }
      if (quantity > 1000000) {
        alert('Cantidad SNP excede el máximo permitido (1,000,000)');
        return;
      }
    }

    if (newPart.snpVolume !== '' && newPart.snpVolume !== null) {
      const volume = parseFloat(newPart.snpVolume);
      if (isNaN(volume) || volume < 0) {
        alert('Volumen SNP debe ser un número mayor o igual a 0');
        return;
      }
      if (volume > 1000) {
        alert('Volumen SNP excede el máximo permitido (1000 m³)');
        return;
      }
    }

    // Convert custom fields array to object
    const customFieldsObj = {};
    newPartCustomFields.forEach(field => {
      if (field.key && field.key.trim()) {
        customFieldsObj[field.key.trim()] = field.value || '';
      }
    });

    // Prepare part data for API (camelCase as expected by backend)
    const partData = {
      partNumber: newPart.partNumber,
      clientPartNumber: newPart.clientPartNumber || null,
      partName: newPart.partName,
      description: newPart.description || null,
      revision: newPart.revision || null,
      specifications: newPart.specifications || null,
      weight: newPart.weight !== '' ? parseFloat(newPart.weight) : null,
      snpQuantity: newPart.snpQuantity !== '' ? parseInt(newPart.snpQuantity) : null,
      snpVolume: newPart.snpVolume !== '' ? parseFloat(newPart.snpVolume) : null,
      unitCost: parseFloat(newPart.unitCost),
      currency: newPart.currency || 'USD',
      customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : {},
      bomLevel: newPart.bomLevel || 1,
      supplier: newPart.supplier || null,
      parentPartId: newPart.parentPartId || null,
      projectId: addPartForProjectId // Associate part with project if adding from project context
    };

    try {
      // Call API to save part to database
      const savedPart = await clientService.createPart(clientId, partData);
      console.log(' Part saved to database:', savedPart.partNumber);

      // Add saved part (with real ID from DB) to local state
      setProjectParts([...projectParts, savedPart]);

      // Update BOM column order if there are new custom fields
      if (Object.keys(customFieldsObj).length > 0) {
        const newFieldNames = Object.keys(customFieldsObj);
        const currentOrder = bomColumnOrder || [];
        const fieldsToAdd = newFieldNames.filter(field => !currentOrder.includes(field));

        if (fieldsToAdd.length > 0) {
          const updatedOrder = [...currentOrder, ...fieldsToAdd];
          setBomColumnOrder(updatedOrder);
          localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(updatedOrder));
          console.log('Added new BOM columns:', fieldsToAdd);
        }
      }

      // Reset form
      setNewPart({
        partNumber: '',
        clientPartNumber: '',
        partName: '',
        description: '',
        revision: '',
        specifications: '',
        weight: '',
        snpQuantity: '',
        snpVolume: '',
        unitCost: '',
        currency: 'USD',
        parentPartId: null,
        bomLevel: 1,
        supplier: ''
      });
      setNewPartCustomFields([]);

      // Close modal and show success
      setShowAddPartModal(false);
      setAddPartForProjectId(null); // Reset project context
      alert('Parte guardada exitosamente');

      // Reload parts to get fresh data from server
      const partsData = await clientService.getParts(clientId, false);
      if (partsData.projectGroups) {
        const allParts = partsData.projectGroups.flatMap(group => group.parts || []);
        setProjectParts(allParts);
      }
    } catch (error) {
      console.error(' Error saving part:', error);
      alert(`Error al guardar la parte: ${error.message}`);
    }
  };

  const handleRemovePart = (partId) => {
    setProjectParts(projectParts.filter(part => part.id !== partId));
  };

  // Open Add Part modal with configured fields from bom_field_config
  const handleOpenAddPartModal = async (projectId = null) => {
    try {
      // Store which project this part will be added to (null = no project)
      setAddPartForProjectId(projectId);
      console.log('Opening Add Part modal for project:', projectId || 'none');

      // Load field configurations from bom_field_config
      const fieldConfigs = await bomFieldService.getFormFields();

      // Pre-populate custom fields array with configured field names
      const prePopulatedFields = fieldConfigs.map(config => ({
        id: `config-${config.id}`,
        key: config.fieldKey,
        value: config.defaultValue || '',
        fieldType: config.fieldType,
        isRequired: config.isRequired,
        options: config.options,
        description: config.description,
        minValue: config.minValue,
        maxValue: config.maxValue,
        maxLength: config.maxLength
      }));

      console.log('BOM field configs loaded:', fieldConfigs.length, 'fields');
      setNewPartCustomFields(prePopulatedFields);
      setShowAddPartModal(true);
    } catch (error) {
      console.error('Error loading BOM field configs:', error);
      // Still open modal even if we couldn't load field configs
      setShowAddPartModal(true);
    }
  };

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

    // Validate required fields
    if (!editingPart.partNumber || !editingPart.partName) {
      showToast('Número de parte y nombre son obligatorios', 'error');
      return;
    }

    // Validate unitCost is required
    if (!editingPart.unitCost || editingPart.unitCost === '') {
      showToast('Costo Unitario es obligatorio', 'error');
      return;
    }

    const unitCost = parseFloat(editingPart.unitCost);
    if (isNaN(unitCost) || unitCost < 0) {
      showToast('Costo Unitario debe ser un número mayor o igual a 0', 'error');
      return;
    }

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
      await clientService.updatePart(clientId, editingPart.id, updatedPartData);

      // Update local state for project parts
      setProjectParts(projectParts.map(p =>
        p.id === editingPart.id ? updatedPartData : p
      ));

      // Also update clientParts state if loaded
      setClientParts(clientParts.map(p =>
        p.id === editingPart.id ? updatedPartData : p
      ));

      showToast('Parte actualizada exitosamente', 'success');
      handleCancelEditPart();
    } catch (error) {
      console.error('Error updating part:', error);
      showToast('Error al actualizar la parte', 'error');
    }
  };

  const handleAddCustomField = () => {
    if (!newCustomFieldKey.trim()) {
      showToast('Ingrese el nombre del campo', 'error');
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

  const handleEditProject = async (project) => {
    setEditingProject(project);
    setNewProject({
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      description: project.description || '',
      status: project.status,
      startDate: formatDateForInput(project.startDate),
      targetEndDate: formatDateForInput(project.targetEndDate)
    });

    // Load parts for this project if not already loaded
    if (!project.parts || project.parts.length === 0) {
      try {
        const projectData = await projectService.getProjectById(project.id);
        setProjectParts(projectData.parts || []);
      } catch (error) {
        console.error('Error loading project parts:', error);
        setProjectParts([]);
      }
    } else {
      setProjectParts(project.parts || []);
    }

    setShowProjectForm(false); // Close create form if open
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setNewProject({
      projectNumber: '',
      projectName: '',
      description: '',
      status: 'Active',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: ''
    });
    setProjectParts([]);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...newProject,
        parts: projectParts.map(({ id, ...part }) => part) // Remove temporary IDs
      };

      await projectService.updateProject(editingProject.id, projectData);

      // Reset form and editing state
      handleCancelEdit();

      // Reload projects list
      loadProjects();
      alert('Proyecto actualizado exitosamente');
    } catch (err) {
      alert('Error al actualizar proyecto: ' + err.message);
      console.error('Error updating project:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...newProject,
        clientId: parseInt(clientId),
        clientName: client.name,
        parts: projectParts.map(({ id, ...part }) => part) // Remove temporary IDs
      };

      await projectService.createProject(projectData);

      // Reset form and hide it
      setNewProject({
        projectNumber: '',
        projectName: '',
        description: '',
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        targetEndDate: ''
      });
      setProjectParts([]);
      setShowProjectForm(false);

      // Reload projects list
      loadProjects();
    } catch (err) {
      alert('Error al crear proyecto: ' + err.message);
      console.error('Error creating project:', err);
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const handleBackToDashboard = () => {
    navigate('/clients');
  };

  const handleEdit = () => {
    navigate(`/clients/${clientId}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro de eliminar este cliente?')) {
      try {
        await clientService.deleteClient(clientId);
        navigate('/clients');
      } catch (err) {
        alert('Error al eliminar cliente: ' + err.message);
      }
    }
  };

  const handleDownloadPartsTemplate = async () => {
    try {
      // Fetch configured fields for template
      const templateFields = await bomFieldService.getTemplateFields();

      // Build template row with standard fields (matching BOM Global columns)
      const exampleRow = {
        'Número de Parte': 'PART-2024-001',
        'BOM LVL': '1',
        'Part Number Cliente': 'CLI-001',
        'Nombre de Parte': 'Ejemplo de Parte',
        'Descripción': 'Descripción detallada de la parte',
        'Revisión': 'Rev A',
        'Costo Unitario': '25.50',
        'Moneda': 'USD',
        'Peso (kg)': '2.5',
        'Cantidad SNP': '100',
        'Volumen SNP (m³)': '0.05',
        'Proveedor': 'Nombre del Proveedor'
      };

      const emptyRow = {
        'Número de Parte': '',
        'BOM LVL': '1',
        'Part Number Cliente': '',
        'Nombre de Parte': '',
        'Descripción': '',
        'Revisión': '',
        'Costo Unitario': '',
        'Moneda': 'USD',
        'Peso (kg)': '',
        'Cantidad SNP': '',
        'Volumen SNP (m³)': '',
        'Proveedor': ''
      };

      // Add configured custom fields to template
      templateFields.forEach(field => {
        const exampleValue = field.fieldType === 'number' ? '0'
          : field.fieldType === 'boolean' ? 'Si'
          : field.fieldType === 'date' ? '2024-01-15'
          : field.defaultValue || `Ejemplo ${field.fieldName}`;
        exampleRow[field.fieldKey] = exampleValue;
        emptyRow[field.fieldKey] = field.defaultValue || '';
      });

      const template = [exampleRow, emptyRow];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(template);

      // Set column widths (standard + custom fields) - matching BOM Global
      const baseCols = [
        { wch: 20 }, // Número de Parte
        { wch: 10 }, // BOM LVL
        { wch: 20 }, // Part Number Cliente
        { wch: 30 }, // Nombre de Parte
        { wch: 40 }, // Descripción
        { wch: 12 }, // Revisión
        { wch: 15 }, // Costo Unitario
        { wch: 10 }, // Moneda
        { wch: 12 }, // Peso
        { wch: 15 }, // Cantidad SNP
        { wch: 18 }, // Volumen SNP
        { wch: 25 }  // Proveedor
      ];

      // Add column widths for custom fields
      templateFields.forEach(() => baseCols.push({ wch: 18 }));
      ws['!cols'] = baseCols;

      XLSX.utils.book_append_sheet(wb, ws, 'Partes');

      // Build instructions with configured field names
      const instructions = [
        { 'INSTRUCCIONES': 'Plantilla de Importación de Partes' },
        { 'INSTRUCCIONES': '' },
        { 'INSTRUCCIONES': 'CAMPOS OBLIGATORIOS (estas columnas DEBEN existir):' },
        { 'INSTRUCCIONES': '- Número de Parte' },
        { 'INSTRUCCIONES': '- Nombre de Parte' },
        { 'INSTRUCCIONES': '- Costo Unitario' },
        { 'INSTRUCCIONES': '' },
        { 'INSTRUCCIONES': 'CAMPOS OPCIONALES ESTÁNDAR:' },
        { 'INSTRUCCIONES': '- BOM LVL, Part Number Cliente, Descripción, Revisión,' },
        { 'INSTRUCCIONES': '  Peso (kg), Cantidad SNP, Volumen SNP (m³), Moneda, Proveedor' },
        { 'INSTRUCCIONES': '' },
        { 'INSTRUCCIONES': `CAMPOS PERSONALIZADOS CONFIGURADOS (${templateFields.length}):` }
      ];

      // Add each custom field to instructions
      templateFields.forEach(field => {
        instructions.push({ 'INSTRUCCIONES': `- ${field.fieldKey} (${field.fieldType})${field.isRequired ? ' *REQUERIDO*' : ''}` });
      });

      instructions.push({ 'INSTRUCCIONES': '' });
      instructions.push({ 'INSTRUCCIONES': 'Puedes agregar columnas adicionales que se guardarán como campos personalizados.' });

      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 70 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

      XLSX.writeFile(wb, 'Plantilla_Partes.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      showToast('Error al generar plantilla', 'error');
    }
  };

  const handleExportPartsExcel = () => {
    if (projectParts.length === 0) {
      alert('No hay partes para exportar');
      return;
    }

    const exportData = projectParts.map(part => {
      const baseData = {
        'Número de Parte': part.partNumber || '',
        'BOM LVL': part.bomLevel !== '' && part.bomLevel != null ? part.bomLevel : '',
        'Part Number Cliente': part.clientPartNumber || '',
        'Nombre de Parte': part.partName || '',
        'Descripción': part.description || '',
        'Revisión': part.revision || '',
        'Costo Unitario': part.unitCost !== '' && part.unitCost != null ? part.unitCost : '',
        'Moneda': part.currency || 'USD',
        'Peso (kg)': part.weight !== '' && part.weight != null ? part.weight : '',
        'Cantidad SNP': part.snpQuantity !== '' && part.snpQuantity != null ? part.snpQuantity : '',
        'Volumen SNP (m³)': part.snpVolume !== '' && part.snpVolume != null ? part.snpVolume : '',
        'Proveedor': part.supplier || ''
      };

      // Agregar campos personalizados si existen
      if (part.customFields) {
        Object.keys(part.customFields).forEach(fieldName => {
          baseData[fieldName] = part.customFields[fieldName];
        });
      }

      return baseData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 20 }, // Número de Parte
      { wch: 10 }, // BOM LVL
      { wch: 20 }, // Part Number Cliente
      { wch: 30 }, // Nombre de Parte
      { wch: 40 }, // Descripción
      { wch: 12 }, // Revisión
      { wch: 15 }, // Costo Unitario
      { wch: 10 }, // Moneda
      { wch: 12 }, // Peso
      { wch: 15 }, // Cantidad SNP
      { wch: 18 }, // Volumen SNP
      { wch: 25 }  // Proveedor
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Partes');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Partes_Exportadas_${timestamp}.xlsx`);
  };

  const handleImportPartsExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportingParts(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const importedParts = [];
      const errors = [];
      let successCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2; // Excel row number (accounting for header)

        // Skip empty rows
        if (!row['Número de Parte'] || !row['Nombre de Parte']) {
          continue;
        }

        // Validate and convert numeric fields
        let weight = row['Peso (kg)'] || '';
        let snpQuantity = row['Cantidad SNP'] || '';
        let snpVolume = row['Volumen SNP (m³)'] || '';

        // Type conversion and validation for weight
        if (weight !== '') {
          weight = parseFloat(weight);
          if (isNaN(weight)) {
            errors.push(`Fila ${rowNum}: Peso inválido`);
            continue;
          }
          if (weight < 0) {
            errors.push(`Fila ${rowNum}: Peso debe ser mayor o igual a 0`);
            continue;
          }
          if (weight > 10000) {
            errors.push(`Fila ${rowNum}: Peso excede el máximo permitido (10000 kg)`);
            continue;
          }
        }

        // Type conversion and validation for SNP Quantity
        if (snpQuantity !== '') {
          snpQuantity = parseInt(snpQuantity);
          if (isNaN(snpQuantity)) {
            errors.push(`Fila ${rowNum}: Cantidad SNP inválida`);
            continue;
          }
          if (snpQuantity < 0) {
            errors.push(`Fila ${rowNum}: Cantidad SNP debe ser mayor o igual a 0`);
            continue;
          }
          if (snpQuantity > 1000000) {
            errors.push(`Fila ${rowNum}: Cantidad SNP excede el máximo permitido (1,000,000)`);
            continue;
          }
        }

        // Type conversion and validation for SNP Volume
        if (snpVolume !== '') {
          snpVolume = parseFloat(snpVolume);
          if (isNaN(snpVolume)) {
            errors.push(`Fila ${rowNum}: Volumen SNP inválido`);
            continue;
          }
          if (snpVolume < 0) {
            errors.push(`Fila ${rowNum}: Volumen SNP debe ser mayor o igual a 0`);
            continue;
          }
          if (snpVolume > 1000) {
            errors.push(`Fila ${rowNum}: Volumen SNP excede el máximo permitido (1000 m³)`);
            continue;
          }
        }

        // Type conversion and validation for Unit Cost
        let unitCost = row['Costo Unitario'] || '';
        if (unitCost !== '') {
          unitCost = parseFloat(unitCost);
          if (isNaN(unitCost)) {
            errors.push(`Fila ${rowNum}: Costo Unitario inválido`);
            continue;
          }
          if (unitCost < 0) {
            errors.push(`Fila ${rowNum}: Costo Unitario debe ser mayor o igual a 0`);
            continue;
          }
        }

        // Parse BOM LVL (default to 1 if not provided)
        let bomLevel = row['BOM LVL'] || 1;
        bomLevel = parseInt(bomLevel);
        if (isNaN(bomLevel) || bomLevel < 1 || bomLevel > 10) {
          bomLevel = 1;
        }

        const part = {
          id: Date.now() + successCount, // Temporary ID
          partNumber: String(row['Número de Parte']).trim(),
          bomLevel: bomLevel,
          clientPartNumber: row['Part Number Cliente'] ? String(row['Part Number Cliente']).trim() : '',
          partName: String(row['Nombre de Parte']).trim(),
          description: row['Descripción'] ? String(row['Descripción']).trim() : '',
          revision: row['Revisión'] ? String(row['Revisión']).trim() : '',
          weight: weight,
          snpQuantity: snpQuantity,
          snpVolume: snpVolume,
          unitCost: unitCost,
          currency: row['Moneda'] ? String(row['Moneda']).trim() : 'USD',
          supplier: row['Proveedor'] ? String(row['Proveedor']).trim() : ''
        };

        // Detectar y guardar campos personalizados (columnas adicionales)
        const standardColumns = [
          'Número de Parte', 'BOM LVL', 'Part Number Cliente', 'Nombre de Parte',
          'Descripción', 'Revisión', 'Peso (kg)', 'Cantidad SNP', 'Volumen SNP (m³)',
          'Costo Unitario', 'Moneda', 'Proveedor'
        ];

        const customFields = {};
        Object.keys(row).forEach(columnName => {
          if (!standardColumns.includes(columnName) && row[columnName]) {
            customFields[columnName] = String(row[columnName]).trim();
          }
        });

        // Agregar customFields si existen
        if (Object.keys(customFields).length > 0) {
          part.customFields = customFields;
        }

        importedParts.push(part);
        successCount++;
      }

      // Show errors if any
      if (errors.length > 0) {
        const errorMsg = `Se encontraron ${errors.length} error(es):\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n\n...y ${errors.length - 5} más` : ''}`;
        alert(errorMsg);
      }

      // Add imported parts to the list only if there were successful imports
      if (importedParts.length > 0) {
        setProjectParts([...projectParts, ...importedParts]);
        alert(`Se importaron ${successCount} partes exitosamente${errors.length > 0 ? ` (${errors.length} filas con errores fueron omitidas)` : ''}`);
      } else if (errors.length > 0) {
        alert('No se pudo importar ninguna parte debido a errores de validación');
      } else {
        alert('No se encontraron partes válidas en el archivo');
      }
    } catch (err) {
      alert('Error al importar archivo: ' + err.message);
    } finally {
      setImportingParts(false);
      // Reset file input
      if (partsFileInputRef.current) {
        partsFileInputRef.current.value = '';
      }
    }
  };

  // ==================== CONTACT MANAGEMENT FUNCTIONS ====================

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email) {
      showToast('Nombre y email son obligatorios', 'error');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      showToast('Email inválido', 'error');
      return;
    }

    // Verificar duplicados
    const duplicateEmail = clientContacts.find(
      contact => contact.email.toLowerCase() === newContact.email.toLowerCase()
    );
    if (duplicateEmail) {
      showToast('Ya existe un contacto con este email', 'warning');
      return;
    }

    try {
      // Create contact using dedicated endpoint
      await clientService.createContact(clientId, {
        name: newContact.name,
        title: newContact.title,
        email: newContact.email,
        phone: newContact.phone,
        createdBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System'
      });

      setNewContact({
        name: '',
        title: '',
        email: '',
        phone: ''
      });

      showToast('Contacto agregado exitosamente', 'success');
      loadClient(); // Reload to get fresh data
    } catch (err) {
      showToast('Error al agregar contacto: ' + err.message, 'error');
    }
  };

  const handleRemoveContact = async (contactIndex) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este contacto?');
    if (!confirmed) return;

    try {
      const contactToDelete = clientContacts[contactIndex];

      if (!contactToDelete || !contactToDelete.id) {
        showToast('Error: No se encontró el ID del contacto', 'error');
        return;
      }

      // Delete contact using dedicated endpoint
      await clientService.deleteContact(clientId, contactToDelete.id);

      showToast('Contacto eliminado exitosamente', 'success');
      loadClient(); // Reload to get fresh data
    } catch (err) {
      showToast('Error al eliminar contacto: ' + err.message, 'error');
    }
  };

  const handleEditContact = (contactIndex) => {
    const contact = clientContacts[contactIndex];
    setEditingContactIndex(contactIndex);
    setEditingContact({
      name: contact.name,
      title: contact.title || '',
      email: contact.email,
      phone: contact.phone || ''
    });
  };

  const handleUpdateContact = async () => {
    if (!editingContact.name || !editingContact.email) {
      showToast('Nombre y email son obligatorios', 'error');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingContact.email)) {
      showToast('Email inválido', 'error');
      return;
    }

    // Verificar duplicados (excluyendo el contacto que se está editando)
    const duplicateEmail = clientContacts.find(
      (contact, index) =>
        index !== editingContactIndex &&
        contact.email.toLowerCase() === editingContact.email.toLowerCase()
    );
    if (duplicateEmail) {
      showToast('Ya existe un contacto con este email', 'warning');
      return;
    }

    try {
      const contactToUpdate = clientContacts[editingContactIndex];

      if (!contactToUpdate || !contactToUpdate.id) {
        showToast('Error: No se encontró el ID del contacto', 'error');
        return;
      }

      // Update contact using dedicated endpoint
      await clientService.updateContact(clientId, contactToUpdate.id, {
        name: editingContact.name,
        title: editingContact.title,
        email: editingContact.email,
        phone: editingContact.phone,
        updatedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System'
      });

      setEditingContactIndex(null);
      setEditingContact(null);

      showToast('Contacto actualizado exitosamente', 'success');
      loadClient(); // Reload to get fresh data
    } catch (err) {
      showToast('Error al actualizar contacto: ' + err.message, 'error');
    }
  };

  const handleCancelEditContact = () => {
    setEditingContactIndex(null);
    setEditingContact(null);
  };

  const handleDownloadContactsTemplate = () => {
    // Template with standard fields + example custom fields
    const template = [
      {
        'Nombre': 'Juan Pérez',
        'Cargo/Puesto': 'Quality Manager',
        'Email': 'juan.perez@example.com',
        'Teléfono': '+52-442-123-4567',
        // Example custom fields
        'Departamento': 'Quality Assurance',
        'Móvil': '+52-442-987-6543',
        'LinkedIn': 'linkedin.com/in/juanperez',
        'Ubicación': 'Planta Norte'
      },
      {
        'Nombre': '',
        'Cargo/Puesto': '',
        'Email': '',
        'Teléfono': '',
        'Departamento': '',
        'Móvil': '',
        'LinkedIn': '',
        'Ubicación': ''
      }
    ];

    // Instructions sheet
    const instructions = [
      { 'INSTRUCCIONES': '═══════════════════════════════════════════════════════════════════════════════════' },
      { 'INSTRUCCIONES': 'PLANTILLA DE CONTACTOS - SISTEMA DE ALERTAS DE CALIDAD' },
      { 'INSTRUCCIONES': '═══════════════════════════════════════════════════════════════════════════════════' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': 'CAMPOS OBLIGATORIOS (Requeridos para importar):' },
      { 'INSTRUCCIONES': '  • Nombre - Nombre completo del contacto' },
      { 'INSTRUCCIONES': '  • Email - Correo electrónico válido (ejemplo@dominio.com)' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': 'CAMPOS ESTÁNDAR (Opcionales):' },
      { 'INSTRUCCIONES': '  • Cargo/Puesto - Título o posición del contacto' },
      { 'INSTRUCCIONES': '  • Teléfono - Número de teléfono' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': 'CAMPOS PERSONALIZADOS:' },
      { 'INSTRUCCIONES': '  • Puedes AGREGAR cualquier columna adicional que necesites' },
      { 'INSTRUCCIONES': '  • Los campos personalizados se guardarán automáticamente' },
      { 'INSTRUCCIONES': '  • Ejemplos incluidos: Departamento, Móvil, LinkedIn, Ubicación' },
      { 'INSTRUCCIONES': '  • Útil para: Extensiones, Horarios, Idiomas, Certificaciones, etc.' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': 'NOTAS IMPORTANTES:' },
      { 'INSTRUCCIONES': '   Las filas sin Nombre o Email serán ignoradas' },
      { 'INSTRUCCIONES': '   Los emails inválidos generarán errores de validación' },
      { 'INSTRUCCIONES': '   Puedes eliminar las columnas de ejemplo si no las necesitas' },
      { 'INSTRUCCIONES': '   Los campos personalizados se exportarán junto con los estándar' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': '═══════════════════════════════════════════════════════════════════════════════════' }
    ];

    const wb = XLSX.utils.book_new();

    // Add instructions sheet first
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

    // Add template sheet
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 30 }, // Nombre
      { wch: 30 }, // Cargo/Puesto
      { wch: 35 }, // Email
      { wch: 20 }, // Teléfono
      { wch: 25 }, // Departamento
      { wch: 20 }, // Móvil
      { wch: 30 }, // LinkedIn
      { wch: 25 }  // Ubicación
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');

    XLSX.writeFile(wb, 'Plantilla_Contactos.xlsx');
  };

  const handleExportContactsExcel = () => {
    if (clientContacts.length === 0) {
      showToast('No hay contactos para exportar', 'warning');
      return;
    }

    // Export with standard fields + custom fields
    const exportData = clientContacts.map(contact => {
      const baseData = {
        'Nombre': contact.name || '',
        'Cargo/Puesto': contact.title || contact.role || '',
        'Email': contact.email || '',
        'Teléfono': contact.phone || ''
      };

      // Add custom fields if they exist
      if (contact.customFields) {
        Object.keys(contact.customFields).forEach(fieldName => {
          baseData[fieldName] = contact.customFields[fieldName];
        });
      }

      return baseData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Dynamic column widths based on what's actually in the data
    const allColumns = exportData.length > 0 ? Object.keys(exportData[0]) : [];
    ws['!cols'] = allColumns.map(() => ({ wch: 30 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Contactos_Exportados_${timestamp}.xlsx`);
  };

  const handleImportContactsExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportingContacts(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const importedContacts = [];
      const errors = [];
      let successCount = 0;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Define standard contact columns
      const standardColumns = ['Nombre', 'Cargo/Puesto', 'Email', 'Teléfono'];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2; // Excel row number (accounting for header)

        // Skip empty rows
        if (!row['Nombre'] || !row['Email']) {
          continue;
        }

        // Validate email
        const email = String(row['Email']).trim();
        if (!emailRegex.test(email)) {
          errors.push(`Fila ${rowNum}: Email inválido`);
          continue;
        }

        const contact = {
          name: String(row['Nombre']).trim(),
          role: row['Cargo/Puesto'] ? String(row['Cargo/Puesto']).trim() : '',  // 'role' en vez de 'title'
          email: email,
          phone: row['Teléfono'] ? String(row['Teléfono']).trim() : ''
        };

        // Detect and save custom fields (any column not in standardColumns)
        const customFields = {};
        Object.keys(row).forEach(columnName => {
          if (!standardColumns.includes(columnName) && row[columnName]) {
            customFields[columnName] = String(row[columnName]).trim();
          }
        });

        // Only add customFields if there are any
        if (Object.keys(customFields).length > 0) {
          contact.customFields = customFields;
        }

        importedContacts.push(contact);
        successCount++;
      }

      // Show errors if any
      if (errors.length > 0) {
        const errorMsg = `Se encontraron ${errors.length} error(es):\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n\n...y ${errors.length - 5} más` : ''}`;
        alert(errorMsg);
      }

      // Add imported contacts and update backend
      if (importedContacts.length > 0) {
        const updatedContacts = [...clientContacts, ...importedContacts];

        // Update client in backend
        await clientService.updateClient(clientId, {
          ...client,
          contacts: updatedContacts
        });

        setClientContacts(updatedContacts);
        showToast(`Se importaron ${successCount} contactos exitosamente${errors.length > 0 ? ` (${errors.length} filas con errores fueron omitidas)` : ''}`, 'success');
        loadClient(); // Reload to get fresh data
      } else if (errors.length > 0) {
        showToast('No se pudo importar ningún contacto debido a errores de validación', 'error');
      } else {
        showToast('No se encontraron contactos válidos en el archivo', 'warning');
      }
    } catch (err) {
      showToast('Error al importar archivo: ' + err.message, 'error');
    } finally {
      setImportingContacts(false);
      // Reset file input
      if (contactsFileInputRef.current) {
        contactsFileInputRef.current.value = '';
      }
    }
  };

  
  // Drag & Drop handlers for BOM columns
  const handleColumnDragStart = (e, columnId) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e, targetColumnId) => {
    e.preventDefault();

    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...bomColumnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);

    // Remove dragged column and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setBomColumnOrder(newOrder);
    localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(newOrder));
    setDraggedColumn(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
  };

  const resetColumnOrder = () => {
    // Detect all current custom fields from clientParts
    const allCustomFieldNames = new Set();
    (clientParts || []).forEach(group => {
      (group.parts || []).forEach(part => {
        if (part.customFields && typeof part.customFields === 'object') {
          Object.keys(part.customFields).forEach(fieldName => {
            allCustomFieldNames.add(fieldName);
          });
        }
      });
    });

    const customFieldColumns = Array.from(allCustomFieldNames);
    const defaultOrder = [...DEFAULT_BOM_COLUMNS, ...customFieldColumns];
    setBomColumnOrder(defaultOrder);
    localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(defaultOrder));
  };

  // Export BOM Global to Excel
  const handleExportBomGlobal = () => {
    // Flatten all parts from clientParts
    const flatParts = (clientParts || []).flatMap(group =>
      (group.parts || []).map(part => ({
        ...part,
        projectNumber: group.projectNumber || 'Sin Proyecto',
        projectName: group.projectName || 'Sin proyecto asignado',
        clientName: client?.name || 'Cliente'
      }))
    );

    if (flatParts.length === 0) {
      alert('No hay partes para exportar');
      return;
    }

    const exportData = flatParts.map(part => {
      const baseData = {
        'Cliente': part.clientName || '',
        'Número Proyecto': part.projectNumber || '',
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
      { wch: 18 }, // Número Proyecto
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
    const clientName = client?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente';
    XLSX.writeFile(wb, `BOM_Global_${clientName}_${timestamp}.xlsx`);
  };

  const renderTabContent = () => {
    if (!client) return null;

    switch (activeTab) {
      case 'profile':
        return (
          <div style={{ padding: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '24px'
            }}>
              Client Information
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }}>
              {/* Basic Information */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Client Name
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.name}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Email
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.email || '-'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  D4 Response Time
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: '600', color: theme.accent }}>
                    {client.d4ResponseTimeHours || 24}
                  </span>
                  <span style={{ fontSize: '14px', color: theme.textMuted }}>
                    horas
                  </span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Vendor Number
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.vendorNumber || '-'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Phone
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.corporatePhone || '-'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  D5 Response Time
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: '600', color: '#2E7D32' }}>
                    {client.d5ResponseTimeHours || 48}
                  </span>
                  <span style={{ fontSize: '14px', color: theme.textMuted }}>
                    horas
                  </span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Alias
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.alias || '-'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Status
                </label>
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
                    Active
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
                    Inactive
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Corporate Address
                </label>
                <div style={{ fontSize: '14px', color: theme.text }}>
                  {client.corporateAddress}
                </div>
              </div>

              {/* Additional Information */}
              {client.certification && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}>
                    Certification
                  </label>
                  <div style={{ fontSize: '14px', color: theme.text }}>
                    {client.certification}
                  </div>
                </div>
              )}

              {client.clientSince && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: theme.textMuted,
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Client Since
                  </label>
                  <div style={{ fontSize: '14px', color: theme.text }}>
                    {new Date(client.clientSince).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'projects':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.text,
                margin: 0
              }}>
                Proyectos y Partes
              </h3>
              <button
                onClick={() => setShowProjectForm(!showProjectForm)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: theme.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.accent}
              >
                <Plus size={16} />
                {showProjectForm ? 'Cancelar' : 'Agregar Proyecto'}
              </button>
            </div>

            {/* Project Creation Form */}
            {showProjectForm && (
              <div style={{
                backgroundColor: theme.bg,
                padding: '24px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '20px'
                }}>
                  Nuevo Proyecto
                </h4>
                <form onSubmit={handleCreateProject}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '6px'
                      }}>
                        Número de Proyecto *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProject.projectNumber}
                        onChange={(e) => setNewProject({ ...newProject, projectNumber: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                        placeholder="Ej: PROJ-2024-001"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '6px'
                      }}>
                        Nombre del Proyecto *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProject.projectName}
                        onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                        placeholder="Ej: Assembly Program"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '6px'
                      }}>
                        Estado
                      </label>
                      <select
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: theme.bgCard
                        }}
                      >
                        <option value="Active">Active</option>
                        <option value="Planning">Planning</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '6px'
                      }}>
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        required
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '6px'
                      }}>
                        Fecha Objetivo de Fin
                      </label>
                      <input
                        type="date"
                        value={newProject.targetEndDate}
                        onChange={(e) => setNewProject({ ...newProject, targetEndDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: theme.text,
                      marginBottom: '6px'
                    }}>
                      Descripción
                    </label>
                    <textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      placeholder="Descripción del proyecto..."
                    />
                  </div>

                  {/* Parts Section */}
                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: theme.bgCard,
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: theme.text,
                        margin: 0
                      }}>
                        Números de Parte ({projectParts.length})
                      </h5>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleDownloadPartsTemplate}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#2E7D32',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={14} />
                          Plantilla
                        </button>
                        <button
                          type="button"
                          onClick={() => partsFileInputRef.current?.click()}
                          disabled={importingParts}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: importingParts ? theme.textDim : '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: importingParts ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Upload size={14} />
                          {importingParts ? 'Importando...' : 'Importar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPartsExcel}
                          disabled={projectParts.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: projectParts.length === 0 ? theme.textDim : '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: projectParts.length === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Download size={14} />
                          Exportar
                        </button>
                        <input
                          ref={partsFileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportPartsExcel}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Add Part Button */}
                    <div style={{ marginBottom: '16px' }}>
                      <button
                        type="button"
                        onClick={handleOpenAddPartModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 20px',
                          backgroundColor: '#2E7D32',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={18} />
                        Agregar Parte
                      </button>
                    </div>

                    {/* Parts List */}
                    {projectParts.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: `1px solid ${theme.border}`
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: theme.textMuted,
                          marginBottom: '8px',
                          textTransform: 'uppercase'
                        }}>
                          Partes Agregadas
                        </div>
                        {projectParts.map((part) => (
                          <div
                            key={part.id}
                            style={{
                              padding: '10px',
                              backgroundColor: theme.bg,
                              borderRadius: '4px',
                              marginBottom: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center',
                                marginBottom: '6px'
                              }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: theme.text
                                }}>
                                  {part.partNumber}
                                </div>
                                {part.clientPartNumber && (
                                  <div style={{
                                    fontSize: '11px',
                                    color: '#8b5cf6',
                                    backgroundColor: '#f3e8ff',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                  }}>
                                    Cliente: {part.clientPartNumber}
                                  </div>
                                )}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: theme.textMuted,
                                marginBottom: '6px'
                              }}>
                                {part.partName}
                                {part.revision && ` - ${part.revision}`}
                              </div>
                              <div style={{
                                display: 'flex',
                                gap: '16px',
                                fontSize: '11px',
                                color: theme.textMuted,
                                marginBottom: '4px'
                              }}>
                                {part.weight && (
                                  <span>
                                    <strong>Peso:</strong> {part.weight} kg
                                  </span>
                                )}
                                {part.snpQuantity && (
                                  <span>
                                    <strong>Cant. SNP:</strong> {part.snpQuantity}
                                  </span>
                                )}
                                {part.snpVolume && (
                                  <span>
                                    <strong>Vol. SNP:</strong> {part.snpVolume} m³
                                  </span>
                                )}
                                {part.unitCost && (
                                  <span style={{ color: '#2E7D32', fontWeight: '600' }}>
                                    <strong>Costo:</strong> ${parseFloat(part.unitCost).toFixed(2)} {part.currency || 'USD'}
                                  </span>
                                )}
                              </div>
                              {part.description && (
                                <div style={{
                                  fontSize: '11px',
                                  color: theme.textDim,
                                  marginTop: '4px'
                                }}>
                                  {part.description}
                                </div>
                              )}
                              {part.specifications && (
                                <div style={{
                                  fontSize: '11px',
                                  color: theme.accent,
                                  marginTop: '2px'
                                }}>
                                  Specs: {part.specifications}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePart(part.id)}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#fee2e2',
                                color: '#B00020',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${theme.border}`
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowProjectForm(false)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: theme.text,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: theme.accent,
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: 'white',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Crear Proyecto
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingProjects ? (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: theme.textMuted
              }}>
                Cargando proyectos...
              </div>
            ) : projects.length === 0 ? (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: theme.textMuted
              }}>
                <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>No hay proyectos para este cliente</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Los proyectos se agregan al crear o editar el cliente
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      padding: '20px',
                      backgroundColor: editingProject?.id === project.id ? '#fef3c7' : theme.bg,
                      borderRadius: '8px',
                      border: editingProject?.id === project.id ? '2px solid #C77700' : `1px solid ${theme.border}`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px'
                        }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: theme.text,
                            margin: 0
                          }}>
                            {project.projectName}
                          </h4>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor:
                              project.status === 'Active' ? '#d1fae5' :
                              project.status === 'Completed' ? '#dbeafe' :
                              project.status === 'On Hold' ? '#fee2e2' :
                              '#fef3c7',
                            color:
                              project.status === 'Active' ? '#065f46' :
                              project.status === 'Completed' ? theme.text :
                              project.status === 'On Hold' ? '#991b1b' :
                              '#92400e',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {project.status}
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#eff6ff',
                            color: theme.text,
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {project.parts?.length || project.totalParts || 0} partes
                          </span>
                          {editingProject?.id === project.id && (
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                               Editando
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: theme.textMuted,
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          {project.projectNumber}
                        </div>
                        {project.description && (
                          <div style={{
                            fontSize: '14px',
                            color: theme.textMuted,
                            marginTop: '8px'
                          }}>
                            {project.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => editingProject?.id === project.id ? handleCancelEdit() : handleEditProject(project)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: editingProject?.id === project.id ? '#ef4444' : theme.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = editingProject?.id === project.id ? '#B00020' : '#2563eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = editingProject?.id === project.id ? '#ef4444' : theme.accent}
                      >
                        <Edit size={14} />
                        {editingProject?.id === project.id ? 'Cancelar Edición' : 'Editar'}
                      </button>
                    </div>

                    {/* Project Details */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '16px',
                      paddingTop: '16px',
                      paddingBottom: '16px',
                      borderTop: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '11px',
                          color: theme.textMuted,
                          marginBottom: '4px'
                        }}>
                          <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Fecha Inicio
                        </div>
                        <div style={{ fontSize: '13px', color: theme.text, fontWeight: '500' }}>
                          {new Date(project.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '11px',
                          color: theme.textMuted,
                          marginBottom: '4px'
                        }}>
                          <Target size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Fecha Objetivo
                        </div>
                        <div style={{ fontSize: '13px', color: theme.text, fontWeight: '500' }}>
                          {project.targetEndDate
                            ? new Date(project.targetEndDate).toLocaleDateString()
                            : 'No definida'}
                        </div>
                      </div>
                    </div>

                    {/* Parts List - View Mode */}
                    {!editingProject || editingProject.id !== project.id ? (
                      project.parts && project.parts.length > 0 && (
                        <div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: theme.text,
                            marginBottom: '12px'
                          }}>
                            Números de Parte:
                          </div>
                          <div style={{
                            display: 'grid',
                            gap: '8px'
                          }}>
                            {project.parts.map((part) => (
                              <div
                                key={part.id}
                                style={{
                                  padding: '12px',
                                  backgroundColor: theme.bgCard,
                                  borderRadius: '6px',
                                  border: `1px solid ${theme.border}`
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      color: theme.text,
                                      marginBottom: '4px'
                                    }}>
                                      {part.partNumber}
                                    </div>
                                    <div style={{
                                      fontSize: '13px',
                                      color: theme.textMuted,
                                      marginBottom: part.description ? '6px' : '0'
                                    }}>
                                      {part.partName}
                                    </div>
                                    {part.description && (
                                      <div style={{
                                        fontSize: '12px',
                                        color: theme.textDim,
                                        fontStyle: 'italic'
                                      }}>
                                        {part.description}
                                      </div>
                                    )}
                                    {part.specifications && (
                                      <div style={{
                                        fontSize: '11px',
                                        color: theme.textMuted,
                                        marginTop: '6px',
                                        padding: '6px 8px',
                                        backgroundColor: theme.bg,
                                        borderRadius: '4px'
                                      }}>
                                        <strong>Specs:</strong> {part.specifications}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#eff6ff',
                                    color: theme.text,
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    marginLeft: '12px'
                                  }}>
                                    {part.revision}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      /* Edit Mode Form - Render entire project form from create */
                      <form onSubmit={handleUpdateProject} style={{ marginTop: '16px' }}>
                        <div style={{
                          backgroundColor: theme.bgCard,
                          padding: '20px',
                          borderRadius: '8px',
                          border: '2px solid #C77700',
                          marginBottom: '16px'
                        }}>
                          <h5 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#92400e',
                            marginBottom: '16px'
                          }}>
                            Editar Información del Proyecto
                          </h5>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px',
                            marginBottom: '16px'
                          }}>
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: theme.text,
                                marginBottom: '6px'
                              }}>
                                Número de Proyecto *
                              </label>
                              <input
                                type="text"
                                required
                                value={newProject.projectNumber}
                                onChange={(e) => setNewProject({ ...newProject, projectNumber: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: theme.text,
                                marginBottom: '6px'
                              }}>
                                Nombre del Proyecto *
                              </label>
                              <input
                                type="text"
                                required
                                value={newProject.projectName}
                                onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: theme.text,
                                marginBottom: '6px'
                              }}>
                                Estado
                              </label>
                              <select
                                value={newProject.status}
                                onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              >
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Planning">Planning</option>
                              </select>
                            </div>

                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: theme.text,
                                marginBottom: '6px'
                              }}>
                                Fecha Objetivo de Fin
                              </label>
                              <input
                                type="date"
                                value={newProject.targetEndDate}
                                onChange={(e) => setNewProject({ ...newProject, targetEndDate: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <label style={{
                              display: 'block',
                              fontSize: '13px',
                              fontWeight: '500',
                              color: theme.text,
                              marginBottom: '6px'
                            }}>
                              Descripción
                            </label>
                            <textarea
                              value={newProject.description}
                              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                              rows="3"
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: `1px solid ${theme.border}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>
                        </div>

                        {/* Parts Editing Section */}
                        <div style={{
                          backgroundColor: theme.bgCard,
                          padding: '20px',
                          borderRadius: '8px',
                          border: '2px solid #C77700'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                          }}>
                            <h5 style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#92400e',
                              margin: 0
                            }}>
                              Editar Partes del Proyecto ({projectParts.length})
                            </h5>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={handleDownloadPartsTemplate}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  backgroundColor: '#2E7D32',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer'
                                }}
                              >
                                <Download size={14} />
                                Plantilla
                              </button>
                              <button
                                type="button"
                                onClick={() => partsFileInputRef.current?.click()}
                                disabled={importingParts}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  backgroundColor: importingParts ? theme.textDim : '#8b5cf6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: importingParts ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Upload size={14} />
                                {importingParts ? 'Importando...' : 'Importar'}
                              </button>
                              <button
                                type="button"
                                onClick={handleExportPartsExcel}
                                disabled={projectParts.length === 0}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  backgroundColor: projectParts.length === 0 ? theme.textDim : '#0ea5e9',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: projectParts.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Download size={14} />
                                Exportar
                              </button>
                              <input
                                ref={partsFileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleImportPartsExcel}
                                style={{ display: 'none' }}
                              />
                            </div>
                          </div>

                          {/* List of Current Parts with Delete Option */}
                          {projectParts.length > 0 && (
                            <div style={{
                              marginBottom: '16px',
                              maxHeight: '300px',
                              overflowY: 'auto',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '6px',
                              padding: '12px',
                              backgroundColor: theme.bg
                            }}>
                              {projectParts.map((part) => (
                                <div
                                  key={part.id || part.partNumber}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '8px',
                                    backgroundColor: theme.bgCard,
                                    borderRadius: '4px',
                                    border: `1px solid ${theme.border}`
                                  }}
                                >
                                  <div>
                                    <div style={{
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      color: theme.text
                                    }}>
                                      {part.partNumber} - {part.partName}
                                    </div>
                                    {part.clientPartNumber && (
                                      <div style={{
                                        fontSize: '11px',
                                        color: theme.textMuted,
                                        marginTop: '2px'
                                      }}>
                                        Cliente: {part.clientPartNumber}
                                      </div>
                                    )}
                                    {part.unitCost && (
                                      <div style={{
                                        fontSize: '11px',
                                        color: '#2E7D32',
                                        marginTop: '2px',
                                        fontWeight: '600'
                                      }}>
                                        Costo: ${parseFloat(part.unitCost).toFixed(2)} {part.currency || 'USD'}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    gap: '8px'
                                  }}>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPart(part)}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: theme.accent,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Edit2 size={12} />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePart(part.id || part.partNumber)}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add New Part Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenAddPartModal(editingProject?.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '12px',
                              backgroundColor: theme.accent,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={16} />
                            Agregar Nueva Parte
                          </button>
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'flex-end',
                          marginTop: '16px'
                        }}>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            style={{
                              padding: '10px 24px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            style={{
                              padding: '10px 24px',
                              backgroundColor: '#2E7D32',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'contacts':
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.text,
                margin: 0
              }}>
                Contactos del Cliente ({clientContacts.length})
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDownloadContactsTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={16} />
                  Plantilla
                </button>
                <button
                  onClick={() => contactsFileInputRef.current?.click()}
                  disabled={importingContacts}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: importingContacts ? theme.textDim : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: importingContacts ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Upload size={16} />
                  {importingContacts ? 'Importando...' : 'Importar'}
                </button>
                <button
                  onClick={handleExportContactsExcel}
                  disabled={clientContacts.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: clientContacts.length === 0 ? theme.textDim : '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: clientContacts.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} />
                  Exportar
                </button>
                <input
                  ref={contactsFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportContactsExcel}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Add Contact Form */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              marginBottom: '24px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0369a1',
                marginBottom: '16px',
                margin: 0
              }}>
                 Agregar Nuevo Contacto
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Título/Cargo
                  </label>
                  <input
                    type="text"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    placeholder="Ej: Quality Manager"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    placeholder="Ej: juan.perez@example.com"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    placeholder="Ej: +52 442 123 4567"
                  />
                </div>
              </div>
              <button
                onClick={handleAddContact}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  backgroundColor: theme.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} />
                Agregar Contacto
              </button>
            </div>

            {/* Contacts List */}
            {clientContacts && clientContacts.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {clientContacts.map((contact, index) => (
                  editingContactIndex === index ? (
                    // Edit Mode
                    <div key={index} style={{
                      padding: '20px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '8px',
                      border: '2px solid #fbbf24'
                    }}>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '16px',
                        margin: 0
                      }}>
                         Editar Contacto
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: theme.text,
                            marginBottom: '4px'
                          }}>
                            Nombre *
                          </label>
                          <input
                            type="text"
                            value={editingContact.name}
                            onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: theme.text,
                            marginBottom: '4px'
                          }}>
                            Título/Cargo
                          </label>
                          <input
                            type="text"
                            value={editingContact.title}
                            onChange={(e) => setEditingContact({ ...editingContact, title: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: theme.text,
                            marginBottom: '4px'
                          }}>
                            Email *
                          </label>
                          <input
                            type="email"
                            value={editingContact.email}
                            onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: theme.text,
                            marginBottom: '4px'
                          }}>
                            Teléfono
                          </label>
                          <input
                            type="text"
                            value={editingContact.phone}
                            onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleUpdateContact}
                          style={{
                            flex: 1,
                            padding: '10px 20px',
                            backgroundColor: '#2E7D32',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <Save size={16} />
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEditContact}
                          style={{
                            flex: 1,
                            padding: '10px 20px',
                            backgroundColor: theme.textDim,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <X size={16} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div key={index} style={{
                      padding: '16px',
                      backgroundColor: theme.bg,
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: theme.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
                              {contact.name}
                            </div>
                            {contact.title && (
                              <div style={{ fontSize: '12px', color: theme.textMuted }}>
                                {contact.title}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '12px',
                          paddingLeft: '52px'
                        }}>
                          {contact.email && (
                            <div style={{ fontSize: '12px', color: theme.textMuted }}>
                              <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div style={{ fontSize: '12px', color: theme.textMuted }}>
                              <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditContact(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dbeafe',
                            color: theme.text,
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemoveContact(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#B00020',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: theme.textMuted, padding: '48px' }}>
                <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>No hay contactos disponibles</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Agregue contactos manualmente o importe desde Excel
                </p>
              </div>
            )}
          </div>
        );

      case 'parts':
        // Flatten all parts from all project groups into a single array
        const safeClientParts = clientParts || [];
        const flatParts = safeClientParts.flatMap(group =>
          (group?.parts || []).map(part => ({
            ...part,
            projectId: group.projectId,
            projectNumber: group.projectNumber || 'Sin Asignar',
            projectName: group.projectName || 'Sin proyecto asignado',
            clientName: client?.name || 'Cliente',
          }))
        );

        const totalParts = flatParts.length;
        const activeParts = flatParts.filter(p => p.active).length;
        const inactiveParts = totalParts - activeParts;

        // Column definitions for BOM table
        const bomColumns = {
          projectNumber: {
            id: 'projectNumber',
            label: 'Número Proyecto',
            width: 'auto',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500', color: theme.text }}>
                {part.projectNumber}
              </td>
            )
          },
          projectName: {
            id: 'projectName',
            label: 'Nombre Proyecto',
            width: '180px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.textMuted }}>
                {part.projectName}
              </td>
            )
          },
          clientName: {
            id: 'clientName',
            label: 'Cliente',
            width: '150px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500', color: theme.text }}>
                {part.clientName}
              </td>
            )
          },
          status: {
            id: 'status',
            label: 'Estado',
            width: '100px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px' }}>
                <button
                  onClick={async () => {
                    try {
                      const updatedPart = await clientService.togglePartActive(clientId, part.id);
                      setClientParts(safeClientParts.map(pg => ({
                        ...pg,
                        parts: (pg?.parts || []).map(p => p.id === part.id ? updatedPart : p)
                      })));
                      showToast(`Parte ${updatedPart.active ? 'activada' : 'desactivada'}`, 'success');
                    } catch (err) {
                      showToast('Error al cambiar estado: ' + err.message, 'error');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: part.active ? '#d1fae5' : '#fee2e2',
                    color: part.active ? '#065f46' : '#991b1b',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {part.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {part.active ? 'Activo' : 'Inactivo'}
                </button>
              </td>
            )
          },
          bomLevel: {
            id: 'bomLevel',
            label: 'BOM LVL',
            width: '80px',
            align: 'center',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: theme.accent, textAlign: 'center' }}>
                {part.bomLevel || 1}
              </td>
            )
          },
          partNumber: {
            id: 'partNumber',
            label: 'Número de Parte',
            width: 'auto',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: theme.text }}>
                {part.partNumber}
              </td>
            )
          },
          partName: {
            id: 'partName',
            label: 'Nombre Parte',
            width: '150px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.text }}>
                {part.partName}
              </td>
            )
          },
          description: {
            id: 'description',
            label: 'Descripción',
            width: '200px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.textMuted }}>
                {part.description || '-'}
              </td>
            )
          },
          revision: {
            id: 'revision',
            label: 'Revisión',
            width: 'auto',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.textMuted }}>
                {part.revision || '-'}
              </td>
            )
          },
          unitCost: {
            id: 'unitCost',
            label: 'Costo Unitario',
            width: 'auto',
            align: 'right',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: '500' }}>
                {part.unitCost ? `${part.currency || 'USD'} $${parseFloat(part.unitCost).toFixed(2)}` : '-'}
              </td>
            )
          },
          clientPartNumber: {
            id: 'clientPartNumber',
            label: 'Part # Cliente',
            width: 'auto',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.textMuted }}>
                {part.clientPartNumber || '-'}
              </td>
            )
          },
          weight: {
            id: 'weight',
            label: 'Peso (kg)',
            width: '90px',
            align: 'right',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: theme.textMuted }}>
                {part.weight ? parseFloat(part.weight).toFixed(3) : '-'}
              </td>
            )
          },
          snpQuantity: {
            id: 'snpQuantity',
            label: 'Cant. SNP',
            width: '90px',
            align: 'right',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: theme.textMuted }}>
                {part.snpQuantity || '-'}
              </td>
            )
          },
          snpVolume: {
            id: 'snpVolume',
            label: 'Vol. SNP (m³)',
            width: '100px',
            align: 'right',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: theme.textMuted }}>
                {part.snpVolume ? parseFloat(part.snpVolume).toFixed(3) : '-'}
              </td>
            )
          },
          supplier: {
            id: 'supplier',
            label: 'Proveedor',
            width: '150px',
            align: 'left',
            render: (part) => (
              <td style={{ padding: '12px', fontSize: '13px', color: theme.textMuted }}>
                {part.supplier || '-'}
              </td>
            )
          }
        };

        return (
          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    Bill of Materials - BOM ({totalParts} partes)
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: theme.textMuted }}>
                    {activeParts} activas, {inactiveParts} inactivas
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: theme.textDim, fontStyle: 'italic' }}>
                     Listado plano •  Arrastra los encabezados para reordenar columnas
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleExportBomGlobal}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2E7D32',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Exportar BOM Global a Excel"
                  >
                    <Download size={14} />
                    Exportar Excel
                  </button>
                  <button
                    onClick={resetColumnOrder}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: theme.bg,
                      color: theme.textMuted,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Restaurar orden por defecto"
                  >
                    <RotateCcw size={14} />
                    Restaurar Orden
                  </button>
                </div>
              </div>
            </div>

            {/* Flat Parts Table with Draggable Columns */}
            {flatParts.length > 0 ? (
              <div style={{
                backgroundColor: theme.bgCard,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                overflow: 'hidden'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.bg, borderBottom: `2px solid ${theme.border}` }}>
                        {bomColumnOrder.map((columnId) => {
                          const column = bomColumns[columnId];

                          // If it's not a base column, it's a custom field
                          if (!column) {
                            return (
                              <th
                                key={columnId}
                                draggable
                                onDragStart={(e) => handleColumnDragStart(e, columnId)}
                                onDragOver={handleColumnDragOver}
                                onDrop={(e) => handleColumnDrop(e, columnId)}
                                onDragEnd={handleColumnDragEnd}
                                style={{
                                  padding: '12px',
                                  textAlign: 'left',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: theme.textMuted,
                                  minWidth: 'auto',
                                  whiteSpace: 'nowrap',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                  backgroundColor: draggedColumn === columnId ? '#e0e7ff' : '#ecfdf5',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <GripVertical size={14} style={{ opacity: 0.4 }} />
                                  {columnId} 
                                </div>
                              </th>
                            );
                          }

                          return (
                            <th
                              key={column.id}
                              draggable
                              onDragStart={(e) => handleColumnDragStart(e, column.id)}
                              onDragOver={handleColumnDragOver}
                              onDrop={(e) => handleColumnDrop(e, column.id)}
                              onDragEnd={handleColumnDragEnd}
                              style={{
                                padding: '12px',
                                textAlign: column.align,
                                fontSize: '12px',
                                fontWeight: '600',
                                color: theme.textMuted,
                                minWidth: column.width,
                                whiteSpace: 'nowrap',
                                cursor: 'grab',
                                userSelect: 'none',
                                backgroundColor: draggedColumn === column.id ? '#e0e7ff' : theme.bg,
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: column.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                <GripVertical size={14} style={{ opacity: 0.4 }} />
                                {column.label}
                              </div>
                            </th>
                          );
                        })}
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: theme.textMuted, width: '100px' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatParts.map((part, index) => (
                        <tr
                          key={part.id}
                          style={{
                            borderBottom: `1px solid ${theme.border}`,
                            backgroundColor: index % 2 === 0 ? theme.bgCard : theme.bg
                          }}
                        >
                          {bomColumnOrder.map((columnId) => {
                            const column = bomColumns[columnId];

                            // If it's not a base column, it's a custom field
                            if (!column) {
                              return (
                                <td
                                  key={columnId}
                                  style={{
                                    padding: '12px',
                                    fontSize: '13px',
                                    backgroundColor: part.customFields?.[columnId] ? '#f0fdf4' : 'transparent'
                                  }}
                                >
                                  {part.customFields?.[columnId] || '-'}
                                </td>
                              );
                            }

                            return <React.Fragment key={columnId}>{column.render(part)}</React.Fragment>;
                          })}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleEditPart(part)}
                                style={{
                                  padding: '6px',
                                  backgroundColor: '#eff6ff',
                                  color: theme.accent,
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Editar parte"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`¿Eliminar la parte "${part.partNumber}"?`)) {
                                    try {
                                      await clientService.deletePart(clientId, part.id);
                                      setClientParts(safeClientParts.map(pg => ({
                                        ...pg,
                                        parts: (pg?.parts || []).filter(p => p.id !== part.id)
                                      })).filter(pg => (pg?.parts || []).length > 0));
                                      showToast('Parte eliminada', 'success');
                                    } catch (err) {
                                      showToast('Error al eliminar: ' + err.message, 'error');
                                    }
                                  }
                                }}
                                style={{
                                  padding: '6px',
                                  backgroundColor: '#fef2f2',
                                  color: '#B00020',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Eliminar parte"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: theme.textMuted, padding: '48px', backgroundColor: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No hay partes registradas
                </p>
                <p style={{ fontSize: '14px', color: theme.textDim }}>
                  Agregue partes a los proyectos para construir el Bill of Materials de este cliente
                </p>
              </div>
            )}
          </div>
        );



      case 'documents':
        return (
          <div style={{ padding: '24px' }}>
            {/* Header with Upload button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Documentos del Cliente ({documents.length})
              </h3>
              <div>
                <button
                  onClick={() => documentsFileInputRef.current?.click()}
                  disabled={uploadingDocument}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: uploadingDocument ? theme.textDim : '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: uploadingDocument ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadingDocument) {
                      e.target.style.backgroundColor = '#2E7D32';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploadingDocument) {
                      e.target.style.backgroundColor = '#2E7D32';
                    }
                  }}
                >
                  <Upload size={16} />
                  {uploadingDocument ? 'Subiendo...' : 'Subir Documento'}
                </button>
                <input
                  ref={documentsFileInputRef}
                  type="file"
                  accept="*"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: theme.bg,
                borderRadius: '8px',
                border: `1px dashed ${theme.border}`
              }}>
                <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: theme.textDim }} />
                <p style={{ color: theme.textMuted, margin: 0, marginBottom: '4px' }}>
                  No hay documentos disponibles
                </p>
                <p style={{ fontSize: '12px', color: theme.textDim, margin: 0 }}>
                  Suba documentos relacionados al cliente usando el botón de arriba
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'box-shadow 0.2s, border-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = theme.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = theme.border;
                    }}
                  >
                    {/* File Icon and Name */}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '8px',
                        flexShrink: 0
                      }}>
                        <FileText size={24} style={{ color: theme.accent }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          color: theme.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {doc.title || doc.fileName}
                        </h4>
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: theme.textMuted
                        }}>
                          {clientService.formatFileSize(doc.fileSize)}
                        </p>
                        {doc.description && (
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '11px',
                            color: theme.textDim,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: theme.bg,
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: theme.textMuted
                    }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Subido:</strong> {new Date(doc.uploadedAt).toLocaleString('es-MX')}
                      </div>
                      {doc.uploadedBy && (
                        <div>
                          <strong>Por:</strong> {doc.uploadedBy}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${theme.border}`
                    }}>
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px',
                          backgroundColor: theme.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = theme.accent}
                      >
                        <Download size={14} />
                        Descargar
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.fileName)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#B00020'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'timeline':
        const getEventIcon = (category) => {
          switch (category) {
            case 'client': return Settings;
            case 'project': return Briefcase;
            case 'contact': return Users;
            case 'document': return FileText;
            case 'part': return Package;
            default: return Clock;
          }
        };

        const getEventColor = (type) => {
          switch (type) {
            case 'created': return '#2E7D32'; // green
            case 'updated': return theme.accent; // blue
            case 'deleted': return '#ef4444'; // red
            default: return theme.textDim; // gray
          }
        };

        const getEventTypeIcon = (type) => {
          switch (type) {
            case 'created': return Plus;
            case 'updated': return Edit;
            case 'deleted': return Trash2;
            default: return Clock;
          }
        };

        const formatTimestamp = (timestamp) => {
          const date = new Date(timestamp);
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) return 'Hace un momento';
          if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
          if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

          return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        };

        return (
          <div style={{ padding: '24px' }}>
            {/* Filters Section */}
            <div style={{
              backgroundColor: theme.bgCard,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <Filter size={20} style={{ color: theme.textMuted }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  Filtros
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                {/* Start Date */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    marginBottom: '4px'
                  }}>
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={timelineFilters.startDate}
                    onChange={(e) => handleTimelineFilterChange('startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    marginBottom: '4px'
                  }}>
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={timelineFilters.endDate}
                    onChange={(e) => handleTimelineFilterChange('endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    marginBottom: '4px'
                  }}>
                    Categoría
                  </label>
                  <select
                    value={timelineFilters.eventCategory}
                    onChange={(e) => handleTimelineFilterChange('eventCategory', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme.bgCard
                    }}
                  >
                    <option value="all">Todas</option>
                    <option value="client">Cliente</option>
                    <option value="project">Proyectos</option>
                    <option value="contact">Contactos</option>
                    <option value="document">Documentos</option>
                    <option value="part">Partes</option>
                  </select>
                </div>

                {/* Event Type Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    marginBottom: '4px'
                  }}>
                    Tipo de Evento
                  </label>
                  <select
                    value={timelineFilters.eventType}
                    onChange={(e) => handleTimelineFilterChange('eventType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme.bgCard
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="created">Creado</option>
                    <option value="updated">Actualizado</option>
                    <option value="deleted">Eliminado</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: theme.textMuted,
                    marginBottom: '4px'
                  }}>
                    Ordenar por
                  </label>
                  <select
                    value={timelineFilters.sortOrder}
                    onChange={(e) => handleTimelineFilterChange('sortOrder', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme.bgCard
                    }}
                  >
                    <option value="newest">Más reciente</option>
                    <option value="oldest">Más antiguo</option>
                  </select>
                </div>
              </div>

              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={applyTimelineFilters}
                  disabled={loadingTimeline}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: loadingTimeline ? theme.textDim : theme.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loadingTimeline ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={16} />
                  {loadingTimeline ? 'Cargando...' : 'Aplicar Filtros'}
                </button>
                <button
                  onClick={clearTimelineFilters}
                  disabled={loadingTimeline}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: theme.bgCard,
                    color: theme.textMuted,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loadingTimeline ? 'not-allowed' : 'pointer'
                  }}
                >
                  <X size={16} />
                  Limpiar
                </button>
              </div>
            </div>

            {/* Timeline Events */}
            {loadingTimeline ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: theme.textMuted
              }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <p>Cargando eventos...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: theme.bg,
                borderRadius: '8px',
                border: `1px dashed ${theme.border}`
              }}>
                <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: theme.textDim }} />
                <p style={{ color: theme.textMuted, margin: 0, marginBottom: '4px' }}>
                  No hay eventos en el timeline
                </p>
                <p style={{ fontSize: '12px', color: theme.textDim, margin: 0 }}>
                  Los eventos aparecerán aquí cuando se realicen cambios
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute',
                  left: '24px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  backgroundColor: theme.bgPanel
                }} />

                {/* Timeline events */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {timeline.map((event, index) => {
                    const EventIcon = getEventIcon(event.eventCategory);
                    const TypeIcon = getEventTypeIcon(event.eventType);
                    const eventColor = getEventColor(event.eventType);

                    return (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          position: 'relative'
                        }}
                      >
                        {/* Event icon */}
                        <div style={{
                          flexShrink: 0,
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: theme.bgCard,
                          border: `2px solid ${eventColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <EventIcon size={20} style={{ color: eventColor }} />
                        </div>

                        {/* Event content */}
                        <div style={{
                          flex: 1,
                          backgroundColor: theme.bgCard,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          padding: '16px',
                          transition: 'box-shadow 0.2s, border-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.borderColor = eventColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = theme.border;
                        }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'start',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px'
                              }}>
                                <TypeIcon size={14} style={{ color: eventColor }} />
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: eventColor,
                                  textTransform: 'capitalize'
                                }}>
                                  {event.eventType === 'created' ? 'Creado' :
                                   event.eventType === 'updated' ? 'Actualizado' : 'Eliminado'}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  color: theme.textDim,
                                  padding: '2px 8px',
                                  backgroundColor: theme.bg,
                                  borderRadius: '12px'
                                }}>
                                  {event.eventCategory === 'client' ? 'Cliente' :
                                   event.eventCategory === 'project' ? 'Proyecto' :
                                   event.eventCategory === 'contact' ? 'Contacto' :
                                   event.eventCategory === 'document' ? 'Documento' :
                                   event.eventCategory === 'part' ? 'Parte' : event.eventCategory}
                                </span>
                              </div>
                              <p style={{
                                margin: 0,
                                fontSize: '14px',
                                color: theme.text,
                                fontWeight: '500'
                              }}>
                                {event.description}
                              </p>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              color: theme.textDim,
                              whiteSpace: 'nowrap'
                            }}>
                              {formatTimestamp(event.createdAt)}
                            </span>
                          </div>

                          {/* Event details */}
                          {event.details && Object.keys(event.details).length > 0 && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: theme.bg,
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: theme.textMuted
                            }}>
                              {Object.entries(event.details).map(([key, value]) => (
                                <div key={key} style={{ marginBottom: '4px' }}>
                                  <strong style={{ color: theme.text }}>{key}:</strong> {String(value)}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* User info */}
                          <div style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: `1px solid ${theme.border}`,
                            fontSize: '11px',
                            color: theme.textDim,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <User size={12} />
                            {event.userName || 'Sistema'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: theme.textMuted, fontSize: '16px' }}>Loading client...</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ color: '#ef4444', fontSize: '16px' }}>
          {error || 'Client not found'}
        </div>
        <button
          onClick={handleBack}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.accent,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Volver a Clientes
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'projects', label: 'Proyectos', icon: Briefcase },
    { id: 'parts', label: 'BOM', icon: Package },
    { id: 'contacts', label: 'Contactos', icon: Users },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg }}>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Header */}
      <div style={{
        backgroundColor: theme.bgCard,
        borderBottom: `1px solid ${theme.border}`,
        padding: '24px 32px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Client Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: theme.text,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Building2 size={32} color={theme.accent} />
                {client.name}
              </h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '14px',
                color: theme.textMuted
              }}>
                <span style={{ fontWeight: '600', color: theme.accent }}>
                  {client.alias}
                </span>
                {client.vendorNumber && (
                  <>
                    <span>•</span>
                    <span>{client.vendorNumber}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleBackToDashboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: theme.text,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.bgCard}
              >
                <ArrowLeft size={16} />
                Clientes
              </button>
              <button
                onClick={handleEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: theme.text,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.bgCard}
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: theme.bgCard,
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#B00020',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = theme.bgCard}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px'
      }}>
        {/* Tabs */}
        <div style={{
          backgroundColor: theme.bgCard,
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.bg
          }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '16px',
                    backgroundColor: isActive ? theme.bgCard : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
                    color: isActive ? theme.accent : theme.textDim,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.target.style.backgroundColor = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.bgCard,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Subir Documento
            </h2>

            {/* File Info */}
            {documentToUpload.file && (
              <div style={{
                padding: '12px',
                backgroundColor: theme.bg,
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FileText size={24} style={{ color: theme.accent }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: theme.text }}>
                    {documentToUpload.file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    {clientService.formatFileSize(documentToUpload.file.size)}
                  </div>
                </div>
              </div>
            )}

            {/* Title Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: theme.text,
                marginBottom: '6px'
              }}>
                Título del Documento *
              </label>
              <input
                type="text"
                value={documentToUpload.title}
                onChange={(e) => setDocumentToUpload({ ...documentToUpload, title: e.target.value })}
                placeholder="Ej: Especificaciones técnicas del producto"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = theme.accent}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>

            {/* Description Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: theme.text,
                marginBottom: '6px'
              }}>
                Descripción (Opcional)
              </label>
              <textarea
                value={documentToUpload.description}
                onChange={(e) => setDocumentToUpload({ ...documentToUpload, description: e.target.value })}
                placeholder="Descripción del contenido del documento..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = theme.accent}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelUpload}
                disabled={uploadingDocument}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme.bgCard,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: uploadingDocument ? 'not-allowed' : 'pointer',
                  opacity: uploadingDocument ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploadingDocument || !documentToUpload.title.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: uploadingDocument || !documentToUpload.title.trim() ? theme.textDim : '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: uploadingDocument || !documentToUpload.title.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {uploadingDocument ? 'Subiendo...' : 'Subir Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPartModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.bgCard,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Agregar Nueva Parte
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Número de Parte *
                </label>
                <input
                  type="text"
                  value={newPart.partNumber}
                  onChange={(e) => setNewPart({ ...newPart, partNumber: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: FAU-IP-2024-001"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  BOM LVL
                </label>
                <select
                  value={newPart.bomLevel}
                  onChange={(e) => setNewPart({ ...newPart, bomLevel: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', backgroundColor: theme.bgCard }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Proveedor
                </label>
                <input
                  type="text"
                  value={newPart.supplier || ''}
                  onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Part Number Cliente
                </label>
                <input
                  type="text"
                  value={newPart.clientPartNumber}
                  onChange={(e) => setNewPart({ ...newPart, clientPartNumber: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: CLI-FAU-001"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Nombre de Parte *
                </label>
                <input
                  type="text"
                  value={newPart.partName}
                  onChange={(e) => setNewPart({ ...newPart, partName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: Panel Assembly"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Revisión
                </label>
                <input
                  type="text"
                  value={newPart.revision}
                  onChange={(e) => setNewPart({ ...newPart, revision: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: Rev C"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Costo Unitario *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPart.unitCost}
                  onChange={(e) => setNewPart({ ...newPart, unitCost: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: 25.50"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Moneda
                </label>
                <select
                  value={newPart.currency}
                  onChange={(e) => setNewPart({ ...newPart, currency: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', backgroundColor: theme.bgCard }}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                  <option value="CAD">CAD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPart.weight}
                  onChange={(e) => setNewPart({ ...newPart, weight: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: 2.5"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Cantidad SNP
                </label>
                <input
                  type="number"
                  value={newPart.snpQuantity}
                  onChange={(e) => setNewPart({ ...newPart, snpQuantity: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: 100"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                  Volumen SNP (m³)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newPart.snpVolume}
                  onChange={(e) => setNewPart({ ...newPart, snpVolume: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px' }}
                  placeholder="Ej: 0.5"
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                Descripción
              </label>
              <textarea
                value={newPart.description}
                onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                placeholder="Descripción de la parte..."
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '6px' }}>
                Especificaciones
              </label>
              <textarea
                value={newPart.specifications}
                onChange={(e) => setNewPart({ ...newPart, specifications: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                placeholder="Especificaciones técnicas..."
              />
            </div>

            {/* Custom Fields Section - From bom_field_config */}
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
                Campos Personalizados ({newPartCustomFields.length} configurados)
              </h3>

              {/* Configured Custom Fields */}
              {newPartCustomFields.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {newPartCustomFields.map((field) => (
                    <div key={field.id}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: theme.text,
                        marginBottom: '4px'
                      }}>
                        {field.key} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>

                      {/* Render input based on field type */}
                      {field.fieldType === 'select' && field.options ? (
                        <select
                          value={field.value}
                          onChange={(e) => {
                            setNewPartCustomFields(newPartCustomFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                            backgroundColor: theme.bgCard
                          }}
                        >
                          <option value="">-- Seleccionar --</option>
                          {field.options.map((opt, idx) => (
                            <option key={idx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.fieldType === 'boolean' ? (
                        <select
                          value={field.value}
                          onChange={(e) => {
                            setNewPartCustomFields(newPartCustomFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                            backgroundColor: theme.bgCard
                          }}
                        >
                          <option value="">-- Seleccionar --</option>
                          <option value="true">Si</option>
                          <option value="false">No</option>
                        </select>
                      ) : field.fieldType === 'date' ? (
                        <input
                          type="date"
                          value={field.value}
                          onChange={(e) => {
                            setNewPartCustomFields(newPartCustomFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        />
                      ) : field.fieldType === 'number' ? (
                        <input
                          type="number"
                          step="any"
                          min={field.minValue || undefined}
                          max={field.maxValue || undefined}
                          value={field.value}
                          onChange={(e) => {
                            setNewPartCustomFields(newPartCustomFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                          placeholder={field.description || ''}
                        />
                      ) : (
                        <input
                          type="text"
                          maxLength={field.maxLength || undefined}
                          value={field.value}
                          onChange={(e) => {
                            setNewPartCustomFields(newPartCustomFields.map(f =>
                              f.id === field.id ? { ...f, value: e.target.value } : f
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                          placeholder={field.description || ''}
                        />
                      )}

                      {field.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: theme.textMuted }}>
                          {field.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: theme.textMuted }}>
                  No hay campos personalizados configurados. Contacte al administrador para agregar campos.
                </p>
              )}

              {/* Add Custom Field (for fields not in config) */}
              <div style={{
                padding: '12px',
                backgroundColor: '#ecfdf5',
                borderRadius: '4px',
                border: '1px dashed #86efac'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '500', color: '#166534' }}>
                  Agregar campo adicional (no configurado)
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Nombre del campo"
                      value={newCustomFieldKey}
                      onChange={(e) => setNewCustomFieldKey(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Valor"
                      value={newCustomFieldValue}
                      onChange={(e) => setNewCustomFieldValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomFieldKey.trim()) {
                        const newField = {
                          id: `adhoc-${Date.now()}`,
                          key: newCustomFieldKey,
                          value: newCustomFieldValue,
                          fieldType: 'text'
                        };
                        setNewPartCustomFields([...newPartCustomFields, newField]);
                        setNewCustomFieldKey('');
                        setNewCustomFieldValue('');
                      }
                    }}
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
                    + Agregar
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddPartModal(false);
                  setAddPartForProjectId(null);
                  setNewPart({
                    partNumber: '', clientPartNumber: '', partName: '', description: '',
                    revision: '', specifications: '', weight: '', snpQuantity: '',
                    snpVolume: '', unitCost: '', currency: 'USD', parentPartId: null, bomLevel: 1, supplier: ''
                  });
                  setNewPartCustomFields([]);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme.bg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddPart();
                  // Note: handleAddPart is async and closes modal on success
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Agregar Parte
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.bgCard,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Editar Parte
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Número de Parte *
                </label>
                <input
                  type="text"
                  value={editingPart.partNumber || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, partNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Número de Parte del Cliente
                </label>
                <input
                  type="text"
                  value={editingPart.clientPartNumber || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, clientPartNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Nombre de Parte *
                </label>
                <input
                  type="text"
                  value={editingPart.partName || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, partName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Revisión
                </label>
                <input
                  type="text"
                  value={editingPart.revision || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, revision: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Costo Unitario *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPart.unitCost || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, unitCost: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                  color: theme.text,
                  marginBottom: '6px'
                }}>
                  Moneda
                </label>
                <select
                  value={editingPart.currency || 'USD'}
                  onChange={(e) => setEditingPart({ ...editingPart, currency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${theme.border}`,
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
                color: theme.text,
                marginBottom: '6px'
              }}>
                Descripción
              </label>
              <textarea
                value={editingPart.description || ''}
                onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Parent Part (Subcomponent of) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: theme.text,
                marginBottom: '6px'
              }}>
                Parte Padre (Subcomponente de)
              </label>
              <select
                value={editingPart.parentPartId || ''}
                onChange={(e) => setEditingPart({ ...editingPart, parentPartId: e.target.value ? parseInt(e.target.value) : null })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: theme.bgCard
                }}
              >
                <option value="">-- Ninguna (Parte Principal) --</option>
                {clientParts.flatMap(group => group.parts || [])
                  .filter(p =>
                    p.active !== false &&
                    p.id !== editingPart.id &&
                    (p.level === 0 || p.level === undefined) &&
                    (
                      // Si la parte tiene proyecto, filtrar por el mismo proyecto
                      (editingPart.projectId && p.projectId === editingPart.projectId) ||
                      // Si la parte NO tiene proyecto, mostrar solo otras sin proyecto
                      (!editingPart.projectId && !p.projectId)
                    )
                  )
                  .map(part => (
                    <option key={part.id} value={part.id}>
                      {part.partNumber} - {part.partName}
                    </option>
                  ))
                }
              </select>
              {editingPart.parentPartId && (
                <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
                  Esta parte es un subcomponente de otra parte principal
                </p>
              )}
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
                Campos Personalizados
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
                        placeholder="Nombre del campo"
                        value={field.key}
                        onChange={(e) => handleUpdateCustomField(field.id, 'key', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={field.value}
                        onChange={(e) => handleUpdateCustomField(field.id, 'value', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${theme.border}`,
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
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Nombre del Campo
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
                      border: `1px solid ${theme.border}`,
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
                    color: theme.text,
                    marginBottom: '4px'
                  }}>
                    Valor
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
                      border: `1px solid ${theme.border}`,
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
                  + Agregar
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
                  backgroundColor: theme.bgCard,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePart}
                disabled={!editingPart.partNumber || !editingPart.partName}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !editingPart.partNumber || !editingPart.partName ? theme.textDim : theme.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: !editingPart.partNumber || !editingPart.partName ? 'not-allowed' : 'pointer'
                }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
