import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  AlertTriangle, Send, Users, FileText, Camera, X, Check, Clock,
  User, MapPin, Search, Plus, List, LayoutDashboard, ClipboardCheck,
  ArrowLeft, ArrowRight, FileWarning, Package, Paperclip, Trash2,
  Eye, ChevronRight
} from 'lucide-react';

const MRBCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();
  const API_URL = 'http://localhost:5000';

  // Traducciones locales
  const L = {
    en: {
      noPermission: 'You do not have permissions to create MRBs',
      titleRequired: 'Title is required', defectDescRequired: 'Defect Description is required',
      inspCriteriaRequired: 'Inspection Criteria is required', dispInstrRequired: 'Disposition Instructions are required',
      photoNokRequired: 'NOK Photo is required', photoOkRequired: 'OK Photo is required',
      selectResponseRecipient: 'Select at least one Response Recipient', selectValidationRecipient: 'Select at least one Validation Recipient',
      clientRequired: 'Client is required', projectRequired: 'Project is required',
      selectPart: 'Select at least one Part', deptRequired: 'Responsible Department is required', problemDescRequired: 'Problem Description is required',
      responsibleDept: 'Responsible Department', saveDraft: 'Save Draft',
      campaignTitle: 'Campaign Title', problemDescription: 'Problem Description',
    },
    es: {
      noPermission: 'No tienes permisos para crear MRBs',
      titleRequired: 'El título es requerido', defectDescRequired: 'La Descripción del Defecto es requerida',
      inspCriteriaRequired: 'El Criterio de Inspección es requerido', dispInstrRequired: 'Las Instrucciones de Disposición son requeridas',
      photoNokRequired: 'La Foto NOK es requerida', photoOkRequired: 'La Foto OK es requerida',
      selectResponseRecipient: 'Selecciona al menos un Destinatario de Respuesta', selectValidationRecipient: 'Selecciona al menos un Destinatario de Validación',
      clientRequired: 'El Cliente es requerido', projectRequired: 'El Proyecto es requerido',
      selectPart: 'Selecciona al menos una Parte', deptRequired: 'El Departamento Responsable es requerido', problemDescRequired: 'La Descripción del Problema es requerida',
      responsibleDept: 'Departamento Responsable', saveDraft: 'Guardar Borrador',
      campaignTitle: 'Título de la Campaña', problemDescription: 'Descripción del Problema',
    }
  }[language] || {};

  // Permission check
  const canEdit = canUserEdit('mrb');
  const readOnly = isReadOnly('mrb');

  // Redirect if no edit permissions
  useEffect(() => {
    if (!canEdit) {
      alert(L.noPermission);
      navigate('/mrb-list');
    }
  }, [canEdit, navigate]);

  // Get pre-filled data from navigation state
  const prefillData = location.state || {};
  const hasLegacyPrefill = prefillData.defects && prefillData.defects.length > 0;
  const draftId = prefillData.draftId || null; // editing an existing draft

  // ========== STEP MANAGEMENT ==========
  const [currentStep, setCurrentStep] = useState(hasLegacyPrefill ? 4 : draftId ? 3 : 1);
  // Step 1: Select source type (QAR or 8D)
  // Step 2: Search and select source
  // Step 3: View inherited data (read-only)
  // Step 4: Fill MRB operation fields

  // ========== SOURCE SELECTION ==========
  const [sourceType, setSourceType] = useState(null); // '8D' or 'INCOMING'
  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState(null);

  // ========== INCOMING — CASCADING SELECTORS ==========
  const [clients, setClients]           = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [projectParts, setProjectParts] = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [selectedClientId, setSelectedClientId]   = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedPartIds, setSelectedPartIds]     = useState([]);

  // ========== INCOMING — LINK 8D LATER ==========
  const [linkedSource, setLinkedSource] = useState(null);       // 8D linked post-creation
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkSources, setLinkSources] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [pendingAdoptSource, setPendingAdoptSource] = useState(null);
  const [adoptFields, setAdoptFields] = useState({
    title: true, client: true, parts: true, defectDescription: true,
    quarantine: true, photos: true, criteria: true, disposition: true
  });

  // ========== INHERITED DATA (from source) ==========
  const [inheritedData, setInheritedData] = useState({
    folio: '',
    clientName: '',
    clientId: null,
    projectName: '',
    projectId: null,
    partNumber: '',
    partId: null,
    partsList: [], // List of parts from source
    departmentName: '',
    departmentId: null,
    severityName: '',
    severityId: null,
    defectDescription: '',
    createdAt: null
  });

  // ========== MRB OPERATION FIELDS ==========
  const [qtyInspected, setQtyInspected] = useState(0);
  const [qtyOk, setQtyOk] = useState(0);
  const [qtyNok, setQtyNok] = useState(0);
  const [scrapCost, setScrapCost] = useState(0);
  const [inspectorCount, setInspectorCount] = useState(0);
  const [supervisorCount, setSupervisorCount] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [inspectorUnitCost, setInspectorUnitCost] = useState(0);
  const [supervisorUnitCost, setSupervisorUnitCost] = useState(0);

  // ========== MRB DETAILS ==========
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoNokPreview, setPhotoNokPreview] = useState(null);
  const [photoOkPreview, setPhotoOkPreview] = useState(null);
  const [photoNokFile, setPhotoNokFile] = useState(null);
  const [photoOkFile, setPhotoOkFile] = useState(null);
  // Inherited photos from source (URLs)
  const [inheritedPhotoNok, setInheritedPhotoNok] = useState(null);
  const [inheritedPhotoOk, setInheritedPhotoOk] = useState(null);
  // Additional attachments (beyond the NOK/OK reference photos)
  const [extraFiles, setExtraFiles] = useState([]); // [{file, preview, name}]
  // Inspector-facing detail fields
  const [lotNumber, setLotNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [inspectionCriteria, setInspectionCriteria] = useState('');
  const [dispositionInstructions, setDispositionInstructions] = useState('');
  // Quarantine quantities
  const [qWarehouse, setQWarehouse] = useState('');
  const [qProcess, setQProcess]     = useState('');
  const [qTransit, setQTransit]     = useState('');
  const [qCustomer, setQCustomer]   = useState('');
  // Source ID saved when editing a draft (for re-sync)
  const [draftSourceId, setDraftSourceId] = useState(null);

  // ========== RECIPIENTS ==========
  const [users, setUsers] = useState([]);
  const [responseRecipients, setResponseRecipients] = useState([]);
  const [validationRecipients, setValidationRecipients] = useState([]);

  // ========== LEGACY SUPPORT: Selected defects ==========
  const [selectedDefects, setSelectedDefects] = useState(prefillData.defects || []);
  const [defectIds, setDefectIds] = useState(prefillData.defectIds || []);

  // ========== CAMPAIGN DEFECTS (selected for this MRB campaign) ==========
  const [availableDefects, setAvailableDefects] = useState([]); // Defects from selected parts
  const [campaignDefectIds, setCampaignDefectIds] = useState([]); // Selected defect IDs for campaign

  // ========== UI STATE ==========
  const [eightdHasDescription, setEightdHasDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // Existing campaign warning modal
  const [existingCampaigns, setExistingCampaigns] = useState([]);
  const [pendingDraft, setPendingDraft] = useState(null); // null | true | false

  // Department names helper
  const getDepartmentName = (deptId) => {
    const names = { 1: 'Producción', 2: 'Calidad', 3: 'Ingeniería', 4: 'Mantenimiento', 5: 'Logística', 6: 'Proveedor' };
    return names[deptId] || '-';
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sourceType === '8D') { loadSources(); if (departments.length === 0) loadDepartments(); }
    if (sourceType === 'INCOMING' && clients.length === 0) { loadClients(); loadDepartments(); }
  }, [sourceType, searchTerm]);

  useEffect(() => {
    if (selectedClientId) loadClientProjects(selectedClientId);
    else { setClientProjects([]); setSelectedProjectId(null); setProjectParts([]); setSelectedPartIds([]); }
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedProjectId) loadProjectParts(selectedProjectId);
    else { setProjectParts([]); setSelectedPartIds([]); }
  }, [selectedProjectId]);

  useEffect(() => {
    if (sourceType === 'INCOMING' && selectedPartIds.length > 0) {
      setPartDescription(selectedPartIds.map(p => `${p.partNumber}${p.partName ? ' — ' + p.partName : ''}`).join('\n'));
    }
  }, [selectedPartIds]);

  // Load defects when parts change (from selection OR from inherited 8D data)
  const inheritedPartIds = JSON.stringify(
    (inheritedData.partsList || []).map(p => p.partId).filter(Boolean)
  );
  const inheritedSinglePartId = inheritedData.partId || null;

  useEffect(() => {
    // Priority: selectedPartIds > inheritedData.partsList > inheritedData.partId
    if (selectedPartIds.length > 0) {
      loadPartDefects(selectedPartIds.map(p => p.id));
    } else {
      const parsedIds = JSON.parse(inheritedPartIds);
      if (parsedIds.length > 0) {
        loadPartDefects(parsedIds);
      } else if (inheritedSinglePartId) {
        loadPartDefects([inheritedSinglePartId]);
      } else {
        setAvailableDefects([]);
        setCampaignDefectIds([]);
      }
    }
  }, [selectedPartIds, inheritedPartIds, inheritedSinglePartId]);

  const loadPartDefects = async (partIds) => {
    if (!partIds || partIds.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/parts/defects?partIds=${partIds.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailableDefects(data.defects || []);
      // Auto-select all defects by default
      setCampaignDefectIds((data.defects || []).map(d => d.defectTypeId));
    } catch (e) { console.error(e); setAvailableDefects([]); }
  };

  const toggleDefectSelection = (defectTypeId) => {
    setCampaignDefectIds(prev => {
      if (prev.includes(defectTypeId)) {
        return prev.filter(id => id !== defectTypeId);
      } else {
        return [...prev, defectTypeId];
      }
    });
  };

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (e) { console.error(e); }
  };

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setClients(data.clients || data || []);
    } catch (e) { console.error(e); }
  };

  const loadClientProjects = async (clientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${clientId}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setClientProjects(data.projects || data || []);
    } catch (e) { console.error(e); }
  };

  const loadProjectParts = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/projects/${projectId}/parts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProjectParts(data.parts || data || []);
    } catch (e) { console.error(e); }
  };

  const togglePartSelection = (part) => {
    setSelectedPartIds(prev => {
      const exists = prev.find(p => p.id === part.id);
      const next = exists ? prev.filter(p => p.id !== part.id) : [...prev, part];
      // Sync to inheritedData
      setInheritedData(d => ({
        ...d,
        partNumber: next.map(p => p.partNumber).join('; '),
        partsList: next.map(p => ({ partId: p.id, partNumber: p.partNumber, partName: p.partName || '' }))
      }));
      return next;
    });
  };

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, meRes] = await Promise.all([
        fetch(`${API_URL}/users/list`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers })
      ]);

      const usersData = await usersRes.json();
      const meData = await meRes.json();

      setUsers(usersData.users || usersData || []);

      if (meData.user) {
        setCurrentUser(meData.user);
        setValidationRecipients([meData.user.id]);
      }

      // Handle draft edit mode — load existing MRB data
      if (draftId) {
        // Pre-load clients and departments so selects have data when draft opens
        await Promise.all([loadClients(), loadDepartments()]);
        const draftRes = await fetch(`${API_URL}/mrb/${draftId}`, { headers });
        const draftData = await draftRes.json();
        if (draftData.success) {
          const mrb = draftData.mrb;
          setTitle(mrb.title || '');
          setDescription(mrb.description || '');
          setLotNumber(mrb.lotNumber || '');
          setPartDescription(mrb.partDescription || '');
          setInspectionCriteria(mrb.inspectionCriteria || '');
          setDispositionInstructions(mrb.dispositionInstructions || '');
          setInspectorCount(mrb.inspectorCount || 0);
          setSupervisorCount(mrb.supervisorCount || 0);
          setInspectorUnitCost(mrb.inspectorUnitCost || 0);
          setSupervisorUnitCost(mrb.supervisorUnitCost || 0);
          if (mrb.photoNokPath) { setInheritedPhotoNok(mrb.photoNokPath); setPhotoNokPreview(`${API_URL}${mrb.photoNokPath}`); }
          if (mrb.photoOkPath) { setInheritedPhotoOk(mrb.photoOkPath); setPhotoOkPreview(`${API_URL}${mrb.photoOkPath}`); }
          const respIds = (draftData.recipients || []).filter(r => r.recipientType === 'response').map(r => r.userId);
          const valIds = (draftData.recipients || []).filter(r => r.recipientType === 'validation').map(r => r.userId);
          if (respIds.length) setResponseRecipients(respIds);
          if (valIds.length) setValidationRecipients(valIds);
          setSourceType(mrb.sourceType || 'INCOMING');
          // Quarantine fields
          setQWarehouse(mrb.qtyQuarantineWarehouse != null ? String(mrb.qtyQuarantineWarehouse) : '');
          setQProcess(mrb.qtyQuarantineProcess     != null ? String(mrb.qtyQuarantineProcess)   : '');
          setQTransit(mrb.qtyQuarantineTransit     != null ? String(mrb.qtyQuarantineTransit)   : '');
          setQCustomer(mrb.qtyQuarantineCustomer   != null ? String(mrb.qtyQuarantineCustomer)  : '');
          // Save source id for re-sync
          const draftSrcId = mrb.source8dId || mrb.sourceQarId || null;
          setDraftSourceId(draftSrcId);
          // Pre-fill inherited data for step 3 display
          // Restore saved parts_list from DB first
          const savedPartsList = Array.isArray(mrb.partsList) ? mrb.partsList.filter(p => p && p.partNumber) : [];
          const draftInherited = {
            folio: mrb.source8dFolio || mrb.sourceQarFolio || mrb.campaignNumber || '-',
            clientName: mrb.clientName || '',
            clientId: mrb.clientId,
            projectName: mrb.projectName || '',
            projectId: mrb.projectId,
            partNumber: savedPartsList.length > 0
              ? savedPartsList.map(p => p.partNumber).join('; ')
              : (mrb.partNumber || ''),
            partId: mrb.partId,
            partsList: savedPartsList,
            departmentName: mrb.departmentName || '',
            departmentId: mrb.departmentId,
            severityName: mrb.severityName || '',
            severityId: mrb.severityId,
            defectDescription: mrb.description || '',
            createdAt: mrb.createdAt
          };
          setInheritedData(draftInherited);

          // Restore cascading selects for INCOMING drafts
          const draftSourceType = mrb.sourceType || 'INCOMING';
          if (draftSourceType === 'INCOMING' && mrb.clientId) {
            setSelectedClientId(mrb.clientId);
            // Load projects for this client
            if (mrb.projectId) {
              try {
                const projRes = await fetch(`${API_URL}/clients/${mrb.clientId}/projects`, { headers });
                const projData = await projRes.json();
                setClientProjects(projData.projects || projData || []);
                setSelectedProjectId(mrb.projectId);
                // Load parts and restore selected parts from savedPartsList
                if (savedPartsList.length > 0) {
                  const partsRes = await fetch(`${API_URL}/projects/${mrb.projectId}/parts`, { headers });
                  const partsData = await partsRes.json();
                  const allParts = partsData.parts || partsData || [];
                  setProjectParts(allParts);
                  // Match saved partIds to loaded parts
                  const restored = allParts.filter(p =>
                    savedPartsList.some(sp => sp.partId === p.id || sp.partNumber === p.partNumber)
                  );
                  if (restored.length > 0) setSelectedPartIds(restored);
                }
              } catch (_) {}
            }
          }

          // If sourced from 8D and no saved parts_list, re-fetch from source
          if (mrb.source8dId && savedPartsList.length === 0) {
            try {
              const srcRes = await fetch(`${API_URL}/mrb/sources`, { headers });
              const srcData = await srcRes.json();
              const match = (srcData.sources || []).find(s => s.id === mrb.source8dId);
              if (match) {
                const partsList = match.partsList?.filter(p => p && p.partNumber) || [];
                const fallback = !partsList.length && match.partNumber
                  ? [{ partId: match.partId, partNumber: match.partNumber, partName: match.partName || '' }]
                  : partsList;
                setInheritedData(d => ({ ...d, partsList: fallback, partNumber: fallback.map(p => p.partNumber).join('; ') || d.partNumber }));
              }
            } catch (_) {}
          }
        }
      }

      // Handle legacy prefill from defect capture
      if (hasLegacyPrefill) {
        setTitle(prefillData.title || `${prefillData.departmentName} Responsable - ${prefillData.partName} - ${prefillData.severityName}`);
        setDescription(prefillData.description || `Se detectaron ${prefillData.defectCount} defectos.`);
        setInheritedData({
          folio: '-',
          clientName: prefillData.clientName || '',
          clientId: prefillData.clientId,
          projectName: prefillData.projectName || '',
          projectId: prefillData.projectId,
          partNumber: prefillData.partName || '',
          partId: prefillData.partId,
          departmentName: prefillData.departmentName || '',
          departmentId: prefillData.departmentId,
          severityName: prefillData.severityName || '',
          severityId: prefillData.severityId,
          defectDescription: '',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    try {
      setSourcesLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (sourceType) params.set('type', sourceType);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`${API_URL}/mrb/sources?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  const buildPartsListFromSource = (source) => {
    let partsList = [];
    if (source.partsList && Array.isArray(source.partsList)) {
      partsList = source.partsList.filter(p => p && p.partNumber);
    }
    if (partsList.length === 0 && source.partNumber) {
      partsList = [{ partId: source.partId, partNumber: source.partNumber, partName: source.partName || '' }];
    }
    return partsList;
  };

  const handleSourceSelect = (source) => {
    setSelectedSource(source);

    const partsList = buildPartsListFromSource(source);

    setInheritedData({
      folio: source.folio,
      sourceTitle: source.title || '',
      clientName: source.clientName || '',
      clientId: source.clientId,
      projectName: source.projectName || source.projectNumber || '',
      projectId: source.projectId,
      partNumber: source.partNumber || '',
      partId: source.partId,
      partsList: partsList,
      departmentName: source.departmentText || getDepartmentName(source.departmentId) || '',
      departmentId: source.departmentId,
      severityName: source.severityName || '',
      severityId: source.severityId,
      defectDescription: source.defectDescription || '',
      createdAt: source.createdAt
    });
    setEightdHasDescription(!!source.defectDescription);

    // Pre-fill quarantine from 8D source
    if (source.sourceType === '8D') {
      setQWarehouse(source.qtyWarehouse || '');
      setQProcess(source.qtyInProcess || '');
      setQTransit(source.qtyInTransit || '');
      setQCustomer(source.qtyWithCustomer || '');
    }

    // Inherit photos from source
    if (source.photoNokPath) {
      setInheritedPhotoNok(source.photoNokPath);
      setPhotoNokPreview(`${API_URL}${source.photoNokPath}`);
    }
    if (source.photoOkPath) {
      setInheritedPhotoOk(source.photoOkPath);
      setPhotoOkPreview(`${API_URL}${source.photoOkPath}`);
    }

    // Build part description from actual parts list (not the generic er.part_name)
    const partsText = partsList.length > 0
      ? partsList.map(p => `${p.partNumber}${p.partName ? ' — ' + p.partName : ''}`).join('; \n')
      : (source.partDescription || '');
    setPartDescription(partsText);
    if (source.inspectionCriteria) setInspectionCriteria(source.inspectionCriteria);
    if (source.dispositionInstructions) setDispositionInstructions(source.dispositionInstructions);

    // Build parts string for description
    const partsString = partsList.length > 0
      ? partsList.map(p => p.partNumber).join(', ')
      : source.partNumber || '-';

    // Auto-generate title and description
    setTitle(`MRB - ${source.folio} - ${source.title || source.partNumber || 'Campaña'}`);
    setDescription(
      `Campaña MRB originada del ${sourceType} ${source.folio}.\n\n` +
      `Cliente: ${source.clientName || '-'}\n` +
      `Parte(s): ${partsString}\n` +
      `${source.defectDescription ? `\nDescripción del Problema:\n${source.defectDescription}` : ''}`
    );

    setCurrentStep(3);
  };

  const handlePhotoUpload = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'nok') {
        setPhotoNokFile(file);
      } else {
        setPhotoOkFile(file);
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'nok') {
          setPhotoNokPreview(reader.result);
        } else {
          setPhotoOkPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file, token) => {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`${API_URL}/mrb/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) throw new Error('Error al subir imagen');
    const data = await res.json();
    return data.url;
  };

  const handleExtraFilesAdd = (e) => {
    const files = Array.from(e.target.files);
    const newEntries = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        name: file.name,
        preview: isImage ? URL.createObjectURL(file) : null,
        isImage
      };
    });
    setExtraFiles(prev => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const removeExtraFile = (idx) => {
    setExtraFiles(prev => {
      const entry = prev[idx];
      if (entry.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const toggleRecipient = (type, userId) => {
    if (type === 'response') {
      setResponseRecipients(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      setValidationRecipients(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleSubmit = async (isDraft = false, skipExistingCheck = false) => {
    if (!title.trim()) { setError(L.titleRequired); return; }
    if (!description.trim()) { setError(L.defectDescRequired); return; }
    if (!inspectionCriteria.trim()) { setError(L.inspCriteriaRequired); return; }
    if (!dispositionInstructions.trim()) { setError(L.dispInstrRequired); return; }
    if (!inheritedPhotoNok && !photoNokFile) { setError(L.photoNokRequired); return; }
    if (!inheritedPhotoOk && !photoOkFile) { setError(L.photoOkRequired); return; }
    if (responseRecipients.length === 0) { setError(L.selectResponseRecipient); return; }
    if (validationRecipients.length === 0) { setError(L.selectValidationRecipient); return; }

    // Check for existing campaigns linked to the same source
    const activeSource = selectedSource || linkedSource;
    if (!skipExistingCheck && activeSource) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/mrb?source8dId=${activeSource.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        // Exclude the draft being edited from the "existing" list
        const existing = (data.mrbs || data.campaigns || []).filter(c => c.id !== draftId);
        if (existing.length > 0) {
          setExistingCampaigns(existing);
          setPendingDraft(isDraft);
          return; // Show modal
        }
      } catch (e) {
        // Ignore check errors — proceed anyway
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');

      // Upload photos if new files exist, otherwise use inherited
      let photoOkUrl = inheritedPhotoOk;
      let photoNokUrl = inheritedPhotoNok;
      if (photoOkFile) photoOkUrl = await uploadPhoto(photoOkFile, token);
      if (photoNokFile) photoNokUrl = await uploadPhoto(photoNokFile, token);

      const mrbData = {
        // Source linking
        sourceType: selectedSource ? sourceType : (sourceType || 'INCOMING'),
        sourceQarId: null,
        source8dId: (sourceType === '8D' && selectedSource)
          ? selectedSource.id
          : (linkedSource ? linkedSource.id : null),
        // Inherited or manual data
        clientId: inheritedData.clientId,
        projectId: inheritedData.projectId,
        partId: inheritedData.partId,
        severityId: inheritedData.severityId,
        departmentId: inheritedData.departmentId,
        // MRB details
        title,
        description,
        // MRB operation fields
        qtyInspected,
        qtyOk,
        qtyNok,
        scrapCost,
        laborCost,
        inspectorCount,
        supervisorCount,
        inspectorUnitCost,
        supervisorUnitCost,
        // Parts list (multi-part for INCOMING)
        partsList: selectedPartIds.length > 0
          ? selectedPartIds.map(p => ({ partId: p.id, partNumber: p.partNumber, partName: p.partName || '' }))
          : (inheritedData.partsList || []),
        // Campaign defects (selected for this MRB)
        campaignDefectIds: campaignDefectIds || [],
        // Inspector detail fields
        lotNumber: lotNumber || undefined,
        partDescription: partDescription || undefined,
        inspectionCriteria: inspectionCriteria || undefined,
        dispositionInstructions: dispositionInstructions || undefined,
        qtyQuarantineWarehouse: parseInt(qWarehouse) || 0,
        qtyQuarantineProcess:   parseInt(qProcess)   || 0,
        qtyQuarantineTransit:   parseInt(qTransit)   || 0,
        qtyQuarantineCustomer:  parseInt(qCustomer)  || 0,
        // Legacy support
        defectIds,
        // Recipients
        responseRecipientIds: responseRecipients,
        validationRecipientIds: validationRecipients,
        assignedTo: responseRecipients[0],
        // Photos
        photoOkPath: photoOkUrl,
        photoNokPath: photoNokUrl,
        status: isDraft ? 'BORRADOR' : 'ABIERTA'
      };

      const res = await fetch(draftId ? `${API_URL}/mrb/${draftId}` : `${API_URL}/mrb`, {
        method: draftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(mrbData)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error al guardar MRB');
      }

      // Patch result shape for draft edits (PUT returns {mrb:...})
      if (draftId && !result.mrb?.id) result.mrb = { ...result.mrb, id: draftId };

      // Upload additional attachments
      if (extraFiles.length > 0 && result.mrb?.id) {
        for (const entry of extraFiles) {
          const fd = new FormData();
          fd.append('file', entry.file);
          fd.append('attachmentType', 'additional');
          try {
            await fetch(`${API_URL}/mrb/${result.mrb.id}/attachments`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: fd
            });
          } catch (e) {
            console.warn('Error uploading extra file:', entry.name, e);
          }
        }
      }

      if (isDraft) {
        alert(`Borrador guardado\n\nNúmero: ${result.mrb.campaignNumber}\nPuedes retomarlo desde la lista de MRBs.`);
        navigate(`/mrb-campaign/${result.mrb.id}`);
        return;
      }

      // Generate mailto link
      const responseEmails = users
        .filter(u => responseRecipients.includes(u.id) && u.email)
        .map(u => u.email);
      const validationEmails = users
        .filter(u => validationRecipients.includes(u.id) && u.email)
        .map(u => u.email);

      const mailtoSubject = encodeURIComponent(`${result.mrb.campaignNumber} - ${title}`);
      // Resolve client name from loaded clients array if inheritedData doesn't have it
      const emailClientName = inheritedData.clientName
        || clients.find(c => c.id === (inheritedData.clientId || selectedClientId))?.name
        || '-';
      const emailPartDisplay = (inheritedData.partsList?.length > 0
        ? inheritedData.partsList.map(p => p.partNumber).join(', ')
        : selectedPartIds.length > 0
          ? selectedPartIds.map(p => p.partNumber).join(', ')
          : inheritedData.partNumber) || '-';
      const mailtoBody = encodeURIComponent(
        `Se ha abierto un nuevo caso MRB que requiere tu atención.\n\n` +
        `Número: ${result.mrb.campaignNumber}\n` +
        `Título: ${title}\n` +
        `Origen: ${sourceType === 'INCOMING' ? `Incoming Inspection${linkedSource ? ` — ${linkedSource.folio}` : ''}` : (sourceType === '8D' && inheritedData.folio ? `8D - ${inheritedData.folio}` : 'Sin origen vinculado')}\n` +
        `Cliente: ${emailClientName}\n` +
        `Parte: ${emailPartDisplay}\n` +
        `Lote: ${lotNumber || '-'}\n\n` +
        `Por favor ingresa al sistema para ver los detalles y dar disposición:\n` +
        `${window.location.origin}/mrb-campaign/${result.mrb.id}\n\n` +
        `---\n` +
        `Este correo fue generado automáticamente por el Sistema MRB.`
      );

      const mailtoLink = `mailto:${responseEmails.join(';')}?cc=${validationEmails.join(';')}&subject=${mailtoSubject}&body=${mailtoBody}`;
      window.open(mailtoLink, '_blank');

      alert(`MRB Abierto Exitosamente\n\nNúmero: ${result.mrb.campaignNumber}`);
      navigate(`/mrb-campaign/${result.mrb.id}`);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    stepIndicator: {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '24px'
    },
    stepDot: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    stepLine: {
      width: '60px',
      height: '2px',
      backgroundColor: t.border,
      alignSelf: 'center'
    },
    card: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    sourceTypeCard: {
      flex: 1,
      padding: '30px',
      backgroundColor: t.bgPanel,
      border: `3px solid ${t.border}`,
      borderRadius: '12px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s'
    },
    sourceTypeCardSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}15`
    },
    searchInput: {
      flex: 1,
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      color: t.text,
      fontSize: '14px'
    },
    sourceRow: {
      padding: '14px 16px',
      backgroundColor: t.bgPanel,
      borderRadius: '8px',
      marginBottom: '8px',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'all 0.15s'
    },
    sourceRowSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}15`
    },
    inheritedField: {
      marginBottom: '16px'
    },
    inheritedLabel: {
      color: t.textMuted,
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px'
    },
    inheritedValue: {
      color: t.text,
      fontSize: '15px',
      fontWeight: '500',
      padding: '10px 14px',
      backgroundColor: t.bgPanel,
      borderRadius: '6px',
      border: `1px solid ${t.border}`
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: t.text
    },
    inputSmall: {
      width: '100%',
      padding: '10px 14px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '14px',
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: t.bgPanel,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: t.text,
      minHeight: '100px',
      resize: 'vertical'
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    photoBox: {
      border: `2px dashed ${t.border}`,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      minHeight: '150px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },
    photoBoxNok: {
      borderColor: t.error,
      backgroundColor: `${t.error}15`
    },
    photoBoxOk: {
      borderColor: t.success,
      backgroundColor: `${t.success}15`
    },
    photoPreview: {
      maxWidth: '100%',
      maxHeight: '120px',
      borderRadius: '8px'
    },
    userGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '10px'
    },
    userCard: {
      padding: '10px 14px',
      backgroundColor: t.bgPanel,
      border: `2px solid ${t.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.15s'
    },
    userCardSelected: {
      borderColor: t.accent,
      backgroundColor: `${t.accent}20`
    },
    buttonRow: {
      display: 'flex',
      gap: '12px',
      marginTop: '20px'
    },
    buttonPrimary: {
      flex: 1,
      padding: '14px 24px',
      backgroundColor: t.accent,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSecondary: {
      padding: '14px 24px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonSuccess: {
      flex: 1,
      padding: '16px 24px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    error: {
      backgroundColor: `${t.error}15`,
      color: t.error,
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      border: `1px solid ${t.error}`
    },
    label: {
      display: 'block',
      color: t.textMuted,
      fontSize: '12px',
      marginBottom: '6px',
      fontWeight: '600',
      textTransform: 'uppercase'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px', color: t.text }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/mrb-campaigns')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          <ArrowLeft size={18} />
          Volver a Lista
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <ThemeSelector />
          <button
            onClick={() => navigate('/mrb-campaigns')}
            style={{ padding: '8px 14px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <List size={16} />
            Campaigns
          </button>
          <button
            onClick={() => navigate('/mrb-dashboard')}
            style={{ padding: '8px 14px', backgroundColor: t.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((step, idx) => (
          <React.Fragment key={step}>
            <div
              style={{
                ...styles.stepDot,
                backgroundColor: currentStep >= step ? t.accent : t.textMuted,
                color: currentStep >= step ? 'white' : t.textDim
              }}
            >
              {currentStep > step ? <Check size={18} /> : step}
            </div>
            {idx < 3 && (
              <div style={{ ...styles.stepLine, backgroundColor: currentStep > step ? t.accent : t.textMuted }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Labels */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px', color: t.textDim, fontSize: '12px' }}>
        <span style={{ color: currentStep >= 1 ? t.text : t.textDim }}>Tipo</span>
        <span style={{ color: currentStep >= 2 ? t.text : t.textDim }}>Seleccionar 8D</span>
        <span style={{ color: currentStep >= 3 ? t.text : t.textDim }}>Datos</span>
        <span style={{ color: currentStep >= 4 ? t.text : t.textDim }}>Campaña MRB</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* ========== STEP 1: Select Source Type ========== */}
      {currentStep === 1 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <FileWarning size={22} color={t.warning} />
            Paso 1: Seleccionar Tipo de Campaña
          </div>
          <p style={{ color: t.textDim, marginBottom: '24px' }}>
            Todo material en MRB debe estar respaldado por un 8D. Si el reporte aún no existe, selecciona "Incoming Inspection" y vincula el 8D cuando esté disponible.
          </p>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{ ...styles.sourceTypeCard, ...(sourceType === '8D' ? styles.sourceTypeCardSelected : {}) }}
              onClick={() => { setSourceType('8D'); setSelectedSource(null); setSelectedClientId(null); setSelectedProjectId(null); setSelectedPartIds([]); setCurrentStep(2); }}
            >
              <Package size={48} color={t.info} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '20px', fontWeight: '600', color: t.accent, marginBottom: '8px' }}>Vincular 8D</div>
              <div style={{ color: t.textDim, fontSize: '13px' }}>Eight Disciplines Report</div>
              <div style={{ color: t.textDim, fontSize: '12px', marginTop: '8px' }}>El 8D ya existe — hereda datos automáticamente</div>
            </div>

            <div
              style={{ ...styles.sourceTypeCard, ...(sourceType === 'INCOMING' ? styles.sourceTypeCardSelected : {}) }}
              onClick={() => {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm   = String(now.getMonth() + 1).padStart(2, '0');
                const dd   = String(now.getDate()).padStart(2, '0');
                setSourceType('INCOMING');
                setSelectedSource(null);
                setLinkedSource(null);
                setInheritedData({ folio: `INC-${yyyy}-${mm}${dd}`, clientName: '', clientId: null, projectName: '', projectId: null, partNumber: '', partId: null, partsList: [], departmentName: '', departmentId: null, severityName: '', severityId: null, defectDescription: '', createdAt: now.toISOString() });
                setCurrentStep(3);
              }}
            >
              <AlertTriangle size={48} color={t.warning} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '20px', fontWeight: '600', color: t.warning, marginBottom: '8px' }}>Incoming Inspection</div>
              <div style={{ color: t.textDim, fontSize: '13px' }}>Campaña MRB Incoming</div>
              <div style={{ color: t.textDim, fontSize: '12px', marginTop: '8px' }}>Sin 8D aún — datos manuales, vincular después</div>
            </div>
          </div>
        </div>
      )}

      {/* ========== STEP 2: Search and Select Source ========== */}
      {currentStep === 2 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Search size={22} color={t.info} />
            Paso 2: Buscar y Seleccionar {sourceType}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder={`Buscar por folio, título, cliente o parte...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={loadSources}
              style={{ ...styles.buttonPrimary, flex: 'none', padding: '12px 20px' }}
            >
              <Search size={18} />
              Buscar
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {sourcesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>Buscando...</div>
            ) : sources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: t.textDim }}>
                No se encontraron {sourceType}s disponibles
              </div>
            ) : (
              sources.map(source => (
                <div
                  key={source.id}
                  style={{
                    ...styles.sourceRow,
                    ...(selectedSource?.id === source.id ? styles.sourceRowSelected : {})
                  }}
                  onClick={() => handleSourceSelect(source)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}>
                          {source.folio}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                          backgroundColor: source.status === 'CERRADA' || source.status === 'completed' ? `${t.success}33` : `${t.warning}33`,
                          color: source.status === 'CERRADA' || source.status === 'completed' ? t.success : t.warning
                        }}>
                          {source.status}
                        </span>
                        {/* MRB campaigns badge */}
                        {source.mrbCampaigns && source.mrbCampaigns.length > 0 && source.mrbCampaigns.map((mc, mi) => {
                          const mrbColor = mc.status === 'CERRADA' ? { bg: `${t.success}22`, color: t.success }
                            : mc.status === 'BORRADOR' ? { bg: `${t.textMuted}22`, color: t.textMuted }
                            : { bg: `${t.warning}22`, color: t.warning };
                          return (
                            <span key={mi} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: mrbColor.bg, color: mrbColor.color }}>
                              MRB {mc.campaignNumber} · {mc.status}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ color: t.text, fontSize: '14px', marginBottom: '4px' }}>
                        {source.title || source.partNumber || '-'}
                      </div>
                      <div style={{ color: t.textDim, fontSize: '12px' }}>
                        {source.clientName || '-'} • {source.partNumber || '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', color: t.textDim, fontSize: '11px', flexShrink: 0, marginLeft: '12px' }}>
                      {formatDate(source.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.buttonSecondary} onClick={() => setCurrentStep(1)}>
              <ArrowLeft size={18} />
              Anterior
            </button>
          </div>
        </div>
      )}

      {/* ========== STEP 3: View Inherited Data ========== */}
      {currentStep === 3 && (
        <div style={styles.card}>
          <div style={{ ...styles.cardTitle, justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color={t.success} />
              {sourceType === 'INCOMING' ? 'Paso 3: Campaña MRB Incoming Inspection' : `Paso 3: Datos Heredados del 8D`}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Back to step 2 for 8D campaigns (edit mode) */}
              {sourceType !== 'INCOMING' && (
                <button
                  onClick={() => { setCurrentStep(2); setSelectedSource(null); loadSources(); }}
                  style={{ padding: '6px 14px', backgroundColor: t.bg, color: t.textDim, border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={14} />
                  Cambiar 8D
                </button>
              )}
              {/* Link optional 8D for INCOMING campaigns */}
              {sourceType === 'INCOMING' && (
                <button
                  onClick={async () => {
                    setShowLinkModal(true);
                    // Auto-load 8D list on open
                    if (linkSources.length === 0) {
                      setLinkLoading(true);
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_URL}/mrb/sources`, { headers: { Authorization: `Bearer ${token}` } });
                        const data = await res.json();
                        setLinkSources(data.sources || []);
                      } finally { setLinkLoading(false); }
                    }
                  }}
                  style={{ padding: '6px 14px', backgroundColor: linkedSource ? `${t.success}20` : `${t.accent}20`, color: linkedSource ? t.success : t.accent, border: `1px solid ${linkedSource ? `${t.success}60` : `${t.accent}60`}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ChevronRight size={14} />
                  {linkedSource ? `8D vinculado: ${linkedSource.folio}` : 'Vincular 8D (opcional)'}
                </button>
              )}
            </div>
          </div>
          <p style={{ color: t.textDim, marginBottom: '20px' }}>
            {sourceType === 'INCOMING'
              ? 'Completa los datos manualmente. Puedes vincular un 8D ahora o después.'
              : 'Datos heredados del 8D seleccionado. Haz clic en "Cambiar 8D" para seleccionar otro.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Folio */}
            <div style={styles.inheritedField}>
              <div style={styles.inheritedLabel}>Folio / Referencia</div>
              {sourceType === 'INCOMING'
                ? <input style={styles.input} placeholder="Ej. RECV-2026-001" value={inheritedData.folio || ''} onChange={e => setInheritedData(p => ({ ...p, folio: e.target.value }))} />
                : <div style={styles.inheritedValue}>{inheritedData.folio || '-'}</div>}
            </div>

            {/* Fecha */}
            <div style={styles.inheritedField}>
              <div style={styles.inheritedLabel}>Fecha Origen</div>
              {sourceType === 'INCOMING' ? (
                <input
                  type="date"
                  style={styles.input}
                  value={inheritedData.createdAt ? new Date(inheritedData.createdAt).toISOString().split('T')[0] : ''}
                  onChange={e => setInheritedData(p => ({ ...p, createdAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              ) : (
                <div style={styles.inheritedValue}>{formatDate(inheritedData.createdAt)}</div>
              )}
            </div>

            {/* Título 8D */}
            {inheritedData.sourceTitle && sourceType !== 'INCOMING' && (
              <div style={{ ...styles.inheritedField, gridColumn: '1 / -1' }}>
                <div style={styles.inheritedLabel}>Título 8D</div>
                <div style={styles.inheritedValue}>{inheritedData.sourceTitle}</div>
              </div>
            )}

            {/* Cliente */}
            <div style={styles.inheritedField}>
              <div style={styles.inheritedLabel}>Cliente *</div>
              {sourceType === 'INCOMING' ? (
                <select
                  style={styles.input}
                  value={selectedClientId || ''}
                  onChange={e => {
                    const cid = e.target.value ? parseInt(e.target.value) : null;
                    const client = clients.find(c => c.id === cid);
                    setSelectedClientId(cid);
                    setSelectedProjectId(null);
                    setSelectedPartIds([]);
                    setInheritedData(p => ({ ...p, clientId: cid, clientName: client?.name || '', projectId: null, projectName: '', partNumber: '', partsList: [] }));
                  }}
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <div style={styles.inheritedValue}>{inheritedData.clientName || '-'}</div>
              )}
            </div>

            {/* Proyecto */}
            <div style={styles.inheritedField}>
              <div style={styles.inheritedLabel}>Proyecto *</div>
              {sourceType === 'INCOMING' ? (
                <select
                  style={{ ...styles.input, opacity: selectedClientId ? 1 : 0.5 }}
                  value={selectedProjectId || ''}
                  disabled={!selectedClientId}
                  onChange={e => {
                    const pid = e.target.value ? parseInt(e.target.value) : null;
                    const proj = clientProjects.find(p => p.id === pid);
                    setSelectedProjectId(pid);
                    setSelectedPartIds([]);
                    setInheritedData(p => ({ ...p, projectId: pid, projectName: proj?.projectName || proj?.projectNumber || '', partNumber: '', partsList: [] }));
                  }}
                >
                  <option value="">— Seleccionar proyecto —</option>
                  {clientProjects.map(p => <option key={p.id} value={p.id}>{p.projectName || p.projectNumber || `Proyecto ${p.id}`}</option>)}
                </select>
              ) : (
                <div style={styles.inheritedValue}>{inheritedData.projectName || '-'}</div>
              )}
            </div>

            {/* Parte(s) */}
            <div style={{ ...styles.inheritedField, gridColumn: '1 / -1' }}>
              <div style={styles.inheritedLabel}>
                Parte(s) * {selectedPartIds.length > 0 ? `(${selectedPartIds.length} seleccionadas)` : inheritedData.partsList?.length > 1 ? `(${inheritedData.partsList.length})` : ''}
              </div>
              {sourceType === 'INCOMING' ? (
                <div>
                  {!selectedProjectId ? (
                    <div style={{ ...styles.inheritedValue, color: t.textMuted, fontStyle: 'italic' }}>Selecciona un proyecto primero</div>
                  ) : projectParts.length === 0 ? (
                    <div style={{ ...styles.inheritedValue, color: t.textMuted, fontStyle: 'italic' }}>Sin partes registradas para este proyecto</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '4px', border: `1px solid ${t.border}`, borderRadius: '8px', backgroundColor: t.bgPanel }}>
                      {projectParts.map(part => {
                        const selected = selectedPartIds.some(p => p.id === part.id);
                        return (
                          <label key={part.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', backgroundColor: selected ? `${t.accent}15` : 'transparent', border: `1px solid ${selected ? t.accent : 'transparent'}` }}>
                            <input type="checkbox" checked={selected} onChange={() => togglePartSelection(part)} style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                            <span style={{ fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>{part.partNumber}</span>
                            {part.partName && <span style={{ color: t.textMuted, fontSize: '12px' }}>{part.partName}</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...styles.inheritedValue, maxHeight: inheritedData.partsList?.length > 3 ? '120px' : 'auto', overflowY: 'auto' }}>
                  {inheritedData.partsList && inheritedData.partsList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inheritedData.partsList.map((part, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', backgroundColor: t.textMuted, borderRadius: '4px' }}>
                          <span style={{ fontWeight: '600', color: t.accent }}>{part.partNumber}</span>
                          {part.partName && <span style={{ color: t.textDim, fontSize: '13px' }}>- {part.partName}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    inheritedData.partNumber || '-'
                  )}
                </div>
              )}
            </div>

            {/* Defectos de la campaña — solo visible cuando hay partes seleccionadas */}
            {(selectedPartIds.length > 0 || inheritedData.partsList?.length > 0) && availableDefects.length > 0 && (
              <div style={{ ...styles.inheritedField, gridColumn: '1 / -1' }}>
                <div style={styles.inheritedLabel}>
                  Defectos de la Campaña {campaignDefectIds.length > 0 ? `(${campaignDefectIds.length} seleccionados)` : ''}
                </div>
                <p style={{ color: t.textDim, fontSize: '11px', margin: '0 0 8px 0' }}>
                  Selecciona los defectos que aplican a esta campaña MRB. Solo estos aparecerán en el import masivo.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', padding: '4px', border: `1px solid ${t.border}`, borderRadius: '8px', backgroundColor: t.bgPanel }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', borderBottom: `1px solid ${t.border}`, paddingBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setCampaignDefectIds(availableDefects.map(d => d.defectTypeId))}
                      style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: t.infoBg, color: t.info, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampaignDefectIds([])}
                      style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: t.errorBg, color: t.error, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Quitar todos
                    </button>
                  </div>
                  {availableDefects.map(defect => {
                    const selected = campaignDefectIds.includes(defect.defectTypeId);
                    return (
                      <label key={defect.defectTypeId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', backgroundColor: selected ? t.warningBg : 'transparent', border: `1px solid ${selected ? t.warning : 'transparent'}` }}>
                        <input type="checkbox" checked={selected} onChange={() => toggleDefectSelection(defect.defectTypeId)} style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', color: t.warning, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', minWidth: '50px' }}>{defect.code}</span>
                        <span style={{ color: t.text, fontSize: '12px' }}>{defect.displayName || defect.name}</span>
                        {defect.categoryName && <span style={{ color: t.textMuted, fontSize: '11px', marginLeft: 'auto' }}>{defect.categoryName}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Departamento — always editable */}
            <div style={styles.inheritedField}>
              <div style={styles.inheritedLabel}>{L.responsibleDept} *</div>
              <select
                style={styles.input}
                value={inheritedData.departmentId || ''}
                onChange={e => {
                  const did = e.target.value ? parseInt(e.target.value) : null;
                  const dept = departments.find(d => d.id === did);
                  setInheritedData(p => ({ ...p, departmentId: did, departmentName: dept?.name || '' }));
                }}
              >
                <option value="">— Seleccionar departamento —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {/* Descripción del problema */}
            <div style={{ ...styles.inheritedField, gridColumn: '1 / -1' }}>
              <div style={styles.inheritedLabel}>Descripción del Problema *</div>
              {(sourceType === 'INCOMING' || !eightdHasDescription) ? (
                <textarea
                  style={{ ...styles.textarea, minHeight: '80px' }}
                  placeholder="Describe el defecto o problema encontrado..."
                  value={inheritedData.defectDescription || ''}
                  onChange={e => setInheritedData(p => ({ ...p, defectDescription: e.target.value }))}
                />
              ) : (
                <div style={{ ...styles.inheritedValue, minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                  {inheritedData.defectDescription}
                </div>
              )}
            </div>
          </div>

          {/* Quarantine quantities */}
          <div style={{ marginTop: '20px', borderTop: `1px solid ${t.border}`, paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ ...styles.cardTitle, fontSize: '14px', marginBottom: 0 }}>⚠ Material en Cuarentena</div>
              {(draftId || selectedSource) && (sourceType === '8D' || (sourceType === 'INCOMING' && linkedSource)) && (
                <button
                  onClick={async () => {
                    const sourceId = draftSourceId || selectedSource?.id;
                    if (!sourceId) return;
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${API_URL}/mrb/sources?type=8D`, { headers: { Authorization: `Bearer ${token}` } });
                      const data = await res.json();
                      const match = (data.sources || []).find(s => s.id === sourceId);
                      if (match) {
                        setQWarehouse(match.qtyWarehouse != null ? String(match.qtyWarehouse) : '');
                        setQProcess(match.qtyInProcess   != null ? String(match.qtyInProcess)  : '');
                        setQTransit(match.qtyInTransit   != null ? String(match.qtyInTransit)  : '');
                        setQCustomer(match.qtyWithCustomer != null ? String(match.qtyWithCustomer) : '');
                      }
                    } catch (e) { console.error(e); }
                  }}
                  style={{ padding: '5px 12px', backgroundColor: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  Sincronizar desde 8D
                </button>
              )}
            </div>
            <p style={{ color: t.textDim, fontSize: '12px', marginBottom: '12px' }}>
              {(sourceType === '8D' || (sourceType === 'INCOMING' && linkedSource)) ? 'Pre-llenado desde D2 del 8D. Edita si es necesario.' : 'Captura las cantidades en cuarentena.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Almacén (en planta)', val: qWarehouse, set: setQWarehouse, info: false },
                { label: 'En Proceso (en planta)', val: qProcess, set: setQProcess, info: false },
                { label: 'Tránsito (informativo)', val: qTransit, set: setQTransit, info: true },
                { label: 'En Cliente (informativo)', val: qCustomer, set: setQCustomer, info: true },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ ...styles.label, color: f.info ? t.textDim : t.textMuted }}>{f.label}</label>
                  <input
                    type="number" min="0"
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder="0"
                    style={{ ...styles.input, borderColor: f.info ? t.border : (f.val > 0 ? t.warning : t.border), opacity: f.info ? 0.7 : 1 }}
                  />
                </div>
              ))}
            </div>
            {(parseInt(qWarehouse)||0) + (parseInt(qProcess)||0) > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: t.warning, fontWeight: '600' }}>
                En Planta: {(parseInt(qWarehouse)||0) + (parseInt(qProcess)||0)} pcs
                {((parseInt(qTransit)||0) + (parseInt(qCustomer)||0)) > 0 &&
                  <span style={{ color: t.textDim, fontWeight: '400', marginLeft: '12px' }}>
                    + {(parseInt(qTransit)||0) + (parseInt(qCustomer)||0)} fuera de planta (solo informativo)
                  </span>}
              </div>
            )}
          </div>

          {/* In draft edit mode, skip the "Continuar" button — step 4 renders below automatically */}
          {!draftId && (
            <div style={styles.buttonRow}>
              <button style={styles.buttonSecondary} onClick={() => setCurrentStep(sourceType === 'INCOMING' ? 1 : 2)}>
                <ArrowLeft size={18} />
                Anterior
              </button>
              <button style={styles.buttonPrimary} onClick={async () => {
                // Step 3 validations — aplica igual para 8D e Incoming
                const clientOk = inheritedData.clientId || selectedClientId;
                const projectOk = inheritedData.projectId || selectedProjectId;
                const partsOk = (inheritedData.partsList?.length > 0) || (selectedPartIds.length > 0) || inheritedData.partId;
                if (!clientOk) { setError(L.clientRequired); return; }
                if (!projectOk) { setError(L.projectRequired); return; }
                if (!partsOk) { setError(L.selectPart); return; }
                if (!inheritedData.departmentId) { setError(L.deptRequired); return; }
                if (!inheritedData.defectDescription?.trim()) { setError(L.problemDescRequired); return; }
                setError(null);
                const activeSource = selectedSource || linkedSource;
                if (activeSource) {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/mrb?source8dId=${activeSource.id}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    const existing = (data.mrbs || data.campaigns || []);
                    if (existing.length > 0) {
                      setExistingCampaigns(existing);
                      setPendingDraft(null);
                      return;
                    }
                  } catch (e) { /* proceed */ }
                }
                setCurrentStep(4);
              }}>
                Continuar
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== STEP 4: MRB Operation Fields ========== */}
      {(currentStep === 4 || (draftId && currentStep === 3)) && (
        <>
          {/* MRB Details */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <FileText size={22} color={t.accent} />
              {draftId ? 'Datos Generales' : 'Paso 4: Datos de la Campaña MRB'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Título del MRB *</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Título del caso MRB..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Descripción *</label>
              <textarea
                style={styles.textarea}
                placeholder="Descripción detallada del defecto o problema..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>No. de Lote / Batch</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ej. LOT-2026-001"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
              />
            </div>

            {/* Fields inherited from D3 — editable but pre-filled */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Descripción de Parte
                {partDescription && (sourceType === '8D' || sourceType === 'INCOMING') && (
                  <span style={{ backgroundColor: `${t.info}20`, color: t.info, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                    Del 8D
                  </span>
                )}
              </label>
              <input
                type="text"
                style={styles.input}
                placeholder="Nombre o descripción de la pieza..."
                value={partDescription}
                onChange={(e) => setPartDescription(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Criterio de Inspección * — ¿Cómo se garantiza que el material esté conforme?
                {inspectionCriteria && (sourceType === '8D' || sourceType === 'INCOMING') && (
                  <span style={{ backgroundColor: `${t.info}20`, color: t.info, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                    D3 del 8D
                  </span>
                )}
              </label>
              <textarea
                style={styles.textarea}
                placeholder="Heredado de D3 del 8D — puedes editar si es necesario..."
                value={inspectionCriteria}
                onChange={(e) => setInspectionCriteria(e.target.value)}
              />
            </div>

            <div>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Instrucciones de Disposición * — ¿Cómo se dispondrá el material sospechoso?
                {dispositionInstructions && (sourceType === '8D' || sourceType === 'INCOMING') && (
                  <span style={{ backgroundColor: `${t.info}20`, color: t.info, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                    D3 del 8D
                  </span>
                )}
              </label>
              <textarea
                style={styles.textarea}
                placeholder="Heredado de D3 del 8D — puedes editar si es necesario..."
                value={dispositionInstructions}
                onChange={(e) => setDispositionInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* MRB Operation Fields */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <ClipboardCheck size={22} color={t.success} />
              Recursos de Inspección
            </div>
            <p style={{ color: t.textDim, fontSize: '12px', marginBottom: '16px', marginTop: 0 }}>
              Las cantidades inspeccionadas y costo de scrap se registran desde la aplicación de inspección MRB una vez iniciada la campaña.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={styles.label}># Inspectores por Turno</label>
                <input
                  type="number"
                  style={styles.inputSmall}
                  value={inspectorCount}
                  onChange={(e) => setInspectorCount(parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div>
                <label style={styles.label}># Supervisores por Turno</label>
                <input
                  type="number"
                  style={styles.inputSmall}
                  value={supervisorCount}
                  onChange={(e) => setSupervisorCount(parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.label}>Costo Unitario — Inspector ($/hr)</label>
                <input
                  type="number"
                  style={styles.inputSmall}
                  value={inspectorUnitCost}
                  onChange={(e) => setInspectorUnitCost(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label style={styles.label}>Costo Unitario — Supervisor ($/hr)</label>
                <input
                  type="number"
                  style={styles.inputSmall}
                  value={supervisorUnitCost}
                  onChange={(e) => setSupervisorUnitCost(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {(inspectorUnitCost > 0 || supervisorUnitCost > 0) && (
              <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: t.bg, borderRadius: '6px', fontSize: '12px', color: t.textDim }}>
                Costo estimado por hora:&nbsp;
                <strong style={{ color: t.text }}>
                  ${((inspectorCount * inspectorUnitCost) + (supervisorCount * supervisorUnitCost)).toFixed(2)}
                </strong>
                &nbsp;({inspectorCount} insp. × ${inspectorUnitCost} + {supervisorCount} sup. × ${supervisorUnitCost})
              </div>
            )}
          </div>

          {/* Photos */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Camera size={22} />
              Estándar Visual (NOK / OK)
              {(inheritedPhotoNok || inheritedPhotoOk) && (
                <span style={{ fontSize: '12px', color: t.success, fontWeight: '400', marginLeft: '8px' }}>
                  Heredadas del 8D
                </span>
              )}
            </div>
            <div style={styles.photoGrid}>
              {/* NOK */}
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: t.error, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  NOK — Condición de Defecto
                </div>
                <label style={{ ...styles.photoBox, ...styles.photoBoxNok }}>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('nok', e)} style={{ display: 'none' }} />
                  {photoNokPreview ? (
                    <>
                      <img src={photoNokPreview} alt="NOK" style={styles.photoPreview} />
                      {inheritedPhotoNok && !photoNokFile && (
                        <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: t.warning, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                          Heredada
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <X size={32} color={t.error} />
                      <p style={{ margin: '8px 0 0', color: t.error, fontWeight: '600', fontSize: '13px' }}>Foto NOK (Defecto) *</p>
                    </>
                  )}
                </label>
                <p style={{ textAlign: 'center', color: t.textDim, fontSize: '11px', marginTop: '6px' }}>
                  Click para {photoNokPreview ? 'reemplazar' : 'subir'}
                </p>
              </div>
              {/* OK */}
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: t.success, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  OK — Condición Aceptable
                </div>
                <label style={{ ...styles.photoBox, ...styles.photoBoxOk }}>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('ok', e)} style={{ display: 'none' }} />
                  {photoOkPreview ? (
                    <>
                      <img src={photoOkPreview} alt="OK" style={styles.photoPreview} />
                      {inheritedPhotoOk && !photoOkFile && (
                        <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: t.success, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                          Heredada
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Check size={32} color={t.success} />
                      <p style={{ margin: '8px 0 0', color: t.success, fontWeight: '600', fontSize: '13px' }}>Foto OK (Referencia) *</p>
                    </>
                  )}
                </label>
                <p style={{ textAlign: 'center', color: t.textDim, fontSize: '11px', marginTop: '6px' }}>
                  Click para {photoOkPreview ? 'reemplazar' : 'subir'}
                </p>
              </div>
            </div>

            {/* Additional files */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: t.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={15} />
                  Archivos Adicionales ({extraFiles.length})
                </span>
                <label style={{ padding: '6px 12px', backgroundColor: t.accent, color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} />
                  Agregar
                  <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleExtraFilesAdd} style={{ display: 'none' }} />
                </label>
              </div>
              {extraFiles.length === 0 ? (
                <p style={{ color: t.textDim, fontSize: '12px' }}>Sin archivos adicionales. Puedes agregar fotos extra, PDFs u otros documentos de referencia.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {extraFiles.map((entry, idx) => (
                    <div key={idx} style={{ position: 'relative', width: entry.isImage ? '100px' : '120px' }}>
                      {entry.isImage ? (
                        <img src={entry.preview} alt={entry.name} style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${t.border}` }} />
                      ) : (
                        <div style={{ width: '120px', height: '60px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                          <Paperclip size={20} color={t.textDim} />
                        </div>
                      )}
                      <p style={{ fontSize: '10px', color: t.textDim, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: entry.isImage ? '100px' : '120px' }}>
                        {entry.name}
                      </p>
                      <button
                        onClick={() => removeExtraFile(idx)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: t.error, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recipients */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Users size={22} />
              Destinatarios
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...styles.label, marginBottom: '10px' }}>
                Destinatarios de Respuesta ({responseRecipients.length}) *
              </div>
              <div style={styles.userGrid}>
                {users.map(user => (
                  <div
                    key={`resp-${user.id}`}
                    style={{
                      ...styles.userCard,
                      ...(responseRecipients.includes(user.id) ? styles.userCardSelected : {})
                    }}
                    onClick={() => toggleRecipient('response', user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={responseRecipients.includes(user.id)}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textDim }}>{user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...styles.label, marginBottom: '10px' }}>
                Destinatarios de Validación ({validationRecipients.length}) *
              </div>
              <div style={styles.userGrid}>
                {users.filter(u => u.canValidateQar || u.canValidateMrb).map(user => (
                  <div
                    key={`val-${user.id}`}
                    style={{
                      ...styles.userCard,
                      ...(validationRecipients.includes(user.id) ? styles.userCardSelected : {})
                    }}
                    onClick={() => toggleRecipient('validation', user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={validationRecipients.includes(user.id)}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', color: t.text, fontSize: '13px' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textDim }}>{user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div style={styles.card}>
            <div style={styles.buttonRow}>
              {!hasLegacyPrefill && (
                <button style={styles.buttonSecondary} onClick={() => setCurrentStep(3)}>
                  <ArrowLeft size={18} />
                  Anterior
                </button>
              )}
              <button
                style={{ ...styles.buttonSecondary, flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.7 : 1 }}
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                title="Guarda el MRB en estado Borrador para continuar más tarde"
              >
                <FileText size={18} />
                {submitting ? '...' : L.saveDraft}
              </button>
              <button
                style={{ ...styles.buttonSuccess, flex: 2, opacity: submitting ? 0.7 : 1 }}
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                <Send size={20} />
                {submitting ? 'CREANDO MRB...' : 'ABRIR CAMPAÑA MRB'}
              </button>
            </div>
            <button
              style={{ ...styles.buttonSecondary, width: '100%', marginTop: '12px' }}
              onClick={() => navigate('/mrb-campaigns')}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {/* ========== LINK 8D MODAL (for INCOMING campaigns) ========== */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px' }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color={t.info} />
                Vincular 8D a esta campaña
              </div>
              <button onClick={() => { setShowLinkModal(false); setPendingAdoptSource(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><X size={20} /></button>
            </div>

            {/* Search */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '10px' }}>
              <input
                type="text"
                style={{ ...styles.searchInput, flex: 1 }}
                placeholder="Buscar por folio, título, cliente o parte..."
                value={linkSearchTerm}
                onChange={e => setLinkSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (async () => {
                  setLinkLoading(true);
                  try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams({ search: linkSearchTerm });
                    const res = await fetch(`${API_URL}/mrb/sources?${params}`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    setLinkSources(data.sources || []);
                  } finally { setLinkLoading(false); }
                })()}
              />
              <button
                style={{ ...styles.buttonPrimary, flex: 'none', padding: '10px 18px' }}
                onClick={async () => {
                  setLinkLoading(true);
                  try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    if (linkSearchTerm) params.set('search', linkSearchTerm);
                    const res = await fetch(`${API_URL}/mrb/sources?${params}`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    setLinkSources(data.sources || []);
                  } finally { setLinkLoading(false); }
                }}
              >
                <Search size={16} /> Buscar
              </button>
            </div>

            {/* 8D scrollable list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
              {linkLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted }}>Buscando...</div>
              ) : linkSources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: t.textMuted }}>Busca un 8D para vincularlo.</div>
              ) : linkSources.map(src => (
                <div
                  key={src.id}
                  onClick={() => setPendingAdoptSource(pendingAdoptSource?.id === src.id ? null : src)}
                  style={{ padding: '12px 14px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', border: `2px solid ${pendingAdoptSource?.id === src.id ? t.accent : t.border}`, backgroundColor: pendingAdoptSource?.id === src.id ? `${t.accent}12` : t.bgPanel }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: t.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>{src.folio}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '4px', backgroundColor: `${t.warning}22`, color: t.warning }}>{src.status}</span>
                    {src.mrbCampaigns?.map((mc, mi) => (
                      <span key={mi} style={{ fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '4px', backgroundColor: mc.status === 'CERRADA' ? `${t.success}22` : `${t.warning}22`, color: mc.status === 'CERRADA' ? t.success : t.warning }}>
                        MRB {mc.campaignNumber} · {mc.status}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', color: t.text }}>{src.title || '-'}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>{src.clientName || '-'} • {src.partNumber || '-'}</div>
                </div>
              ))}
            </div>

            {/* Adoption panel — fixed at bottom, visible as soon as a row is selected */}
            {pendingAdoptSource && (
              <div style={{ borderTop: `2px solid ${t.accent}40`, padding: '16px 24px', backgroundColor: `${t.accent}06` }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: t.text, marginBottom: '10px' }}>
                  Adoptar datos de <span style={{ color: t.accent }}>{pendingAdoptSource.folio}</span>:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '14px' }}>
                  {[
                    { key: 'title',             label: 'Título de la Campaña' },
                    { key: 'client',            label: 'Cliente / Proyecto' },
                    { key: 'parts',             label: 'Número(s) de Parte' },
                    { key: 'defectDescription', label: 'Descripción del Problema' },
                    { key: 'quarantine',        label: 'Cantidades de Cuarentena' },
                    { key: 'photos',            label: 'Fotos NOK / OK' },
                    { key: 'criteria',          label: 'Criterio de Inspección (D3)' },
                    { key: 'disposition',       label: 'Instrucciones de Disposición (D3)' },
                  ].map(f => (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: t.text }}>
                      <input
                        type="checkbox"
                        checked={adoptFields[f.key] ?? true}
                        onChange={() => setAdoptFields(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                        style={{ width: '15px', height: '15px' }}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                <button
                  style={{ ...styles.buttonPrimary, padding: '10px 20px' }}
                  onClick={async () => {
                    const src = pendingAdoptSource;
                    const partsList = buildPartsListFromSource(src);

                    // Check which selected fields are empty in the 8D
                    const emptyFields = [];
                    if (adoptFields.title  && !src.title)                                  emptyFields.push({ key: 'title',            label: 'Título de la Campaña' });
                    if (adoptFields.client && !src.clientId)                          emptyFields.push({ key: 'client',            label: 'Cliente / Proyecto' });
                    if (adoptFields.parts  && partsList.length === 0 && !src.partNumber) emptyFields.push({ key: 'parts',             label: 'Número(s) de Parte' });
                    if (adoptFields.defectDescription && !src.defectDescription)      emptyFields.push({ key: 'defectDescription', label: 'Descripción del Problema' });
                    if (adoptFields.quarantine && !src.qtyWarehouse && !src.qtyInProcess && !src.qtyInTransit && !src.qtyWithCustomer)
                                                                                       emptyFields.push({ key: 'quarantine',        label: 'Cantidades de Cuarentena' });
                    if (adoptFields.photos && !src.photoNokPath && !src.photoOkPath)  emptyFields.push({ key: 'photos',            label: 'Fotos NOK / OK' });
                    if (adoptFields.criteria    && !src.inspectionCriteria)           emptyFields.push({ key: 'criteria',          label: 'Criterio de Inspección (D3)' });
                    if (adoptFields.disposition && !src.dispositionInstructions)      emptyFields.push({ key: 'disposition',       label: 'Instrucciones de Disposición (D3)' });

                    if (emptyFields.length > 0) {
                      const names = emptyFields.map(f => `• ${f.label}`).join('\n');
                      const proceed = window.confirm(
                        `Los siguientes campos no tienen datos en el 8D ${src.folio}:\n\n${names}\n\n¿Deseas limpiar estos campos de todos modos?\n\nSí = limpiar  /  No = quitar esa selección y conservar los actuales`
                      );
                      if (!proceed) {
                        // Uncheck the empty fields — let user review
                        const toUncheck = {};
                        emptyFields.forEach(f => { toUncheck[f.key] = false; });
                        setAdoptFields(prev => ({ ...prev, ...toUncheck }));
                        return; // Stay in modal so user can review
                      }
                    }
                    setLinkedSource(src);
                    setInheritedData(prev => ({
                      ...prev,
                      folio: src.folio,
                      sourceTitle: src.title || '',
                      ...(adoptFields.client ? { clientName: src.clientName || '', clientId: src.clientId, projectName: src.projectName || src.projectNumber || '', projectId: src.projectId } : {}),
                      ...(adoptFields.parts  ? { partNumber: partsList.map(p => p.partNumber).join('; '), partId: src.partId, partsList } : {}),
                      ...(adoptFields.defectDescription ? { defectDescription: src.defectDescription || '' } : {}),
                      createdAt: src.createdAt
                    }));
                    // Sync cascading selects so dropdowns reflect adopted values
                    if (adoptFields.client && src.clientId) {
                      setSelectedClientId(src.clientId);
                      if (src.projectId) {
                        try {
                          const token = localStorage.getItem('token');
                          const pr = await fetch(`${API_URL}/clients/${src.clientId}/projects`, { headers: { Authorization: `Bearer ${token}` } });
                          const pd = await pr.json();
                          setClientProjects(pd.projects || pd || []);
                          setSelectedProjectId(src.projectId);
                          if (adoptFields.parts && partsList.length > 0) {
                            const partr = await fetch(`${API_URL}/projects/${src.projectId}/parts`, { headers: { Authorization: `Bearer ${token}` } });
                            const partd = await partr.json();
                            const allParts = partd.parts || partd || [];
                            setProjectParts(allParts);
                            const restored = allParts.filter(p => partsList.some(sp => sp.partId === p.id || sp.partNumber === p.partNumber));
                            if (restored.length > 0) setSelectedPartIds(restored);
                          }
                        } catch (_) {}
                      }
                    }
                    if (adoptFields.quarantine) {
                      setQWarehouse(src.qtyWarehouse     != null ? String(src.qtyWarehouse)    : '');
                      setQProcess(src.qtyInProcess       != null ? String(src.qtyInProcess)    : '');
                      setQTransit(src.qtyInTransit       != null ? String(src.qtyInTransit)    : '');
                      setQCustomer(src.qtyWithCustomer   != null ? String(src.qtyWithCustomer) : '');
                    }
                    if (adoptFields.photos) {
                      // Always clear first, then set from 8D if available
                      setPhotoNokFile(null);
                      setPhotoOkFile(null);
                      setInheritedPhotoNok(src.photoNokPath || null);
                      setPhotoNokPreview(src.photoNokPath ? `${API_URL}${src.photoNokPath}` : null);
                      setInheritedPhotoOk(src.photoOkPath || null);
                      setPhotoOkPreview(src.photoOkPath ? `${API_URL}${src.photoOkPath}` : null);
                    }
                    if (adoptFields.title             && src.title)             setTitle(`MRB - ${src.folio} - ${src.title}`);
                    if (adoptFields.defectDescription && src.defectDescription) setDescription(src.defectDescription);
                    if (adoptFields.criteria    && src.inspectionCriteria)      setInspectionCriteria(src.inspectionCriteria);
                    if (adoptFields.disposition && src.dispositionInstructions) setDispositionInstructions(src.dispositionInstructions);
                    setShowLinkModal(false);
                    setPendingAdoptSource(null);
                  }}
                >
                  <Check size={16} /> Adoptar seleccionados
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing Campaign Warning Modal */}
      {existingCampaigns.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: t.bgCard, borderRadius: '12px', padding: '28px',
            maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <AlertTriangle size={24} color={t.warning} />
              <h3 style={{ margin: 0, color: t.text, fontSize: '16px', fontWeight: '600' }}>
                Ya existe una campaña vinculada
              </h3>
            </div>
            <p style={{ color: t.textDim, fontSize: '14px', marginBottom: '16px' }}>
              El 8D <strong style={{ color: t.text }}>{inheritedData.folio || linkedSource?.folio || '—'}</strong> ya tiene {existingCampaigns.length === 1 ? 'una campaña MRB' : `${existingCampaigns.length} campañas MRB`} asociada{existingCampaigns.length > 1 ? 's' : ''}:
            </p>
            <div style={{ marginBottom: '20px' }}>
              {existingCampaigns.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: t.bg, borderRadius: '8px',
                  marginBottom: '8px', border: `1px solid ${t.border}`
                }}>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600', color: t.accent, fontSize: '13px' }}>
                      {c.campaignNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: t.textDim, marginTop: '2px' }}>{c.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: c.status === 'BORRADOR' ? `${t.textMuted}30` : c.status === 'CERRADA' ? `${t.success}30` : `${t.warning}30`,
                      color: c.status === 'BORRADOR' ? t.textMuted : c.status === 'CERRADA' ? t.success : t.warning
                    }}>
                      {c.status}
                    </span>
                    <button
                      onClick={() => { setExistingCampaigns([]); setPendingDraft(null); navigate(`/mrb-campaign/${c.id}`); }}
                      style={{ padding: '5px 10px', backgroundColor: t.accent, color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Ir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setExistingCampaigns([]); setPendingDraft(null); }}
                style={{ flex: 1, padding: '10px', backgroundColor: t.bg, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const draft = pendingDraft;
                  setExistingCampaigns([]);
                  setPendingDraft(null);
                  if (draft === null) {
                    // Came from step 3 "Continuar" button
                    setCurrentStep(4);
                  } else {
                    handleSubmit(draft, true);
                  }
                }}
                style={{ flex: 1, padding: '10px', backgroundColor: t.warning, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                Crear de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MRBCreate;
