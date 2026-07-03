import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { canUserEdit, canUserCaptureDefects, isReadOnly, isUserAdmin } from '../utils/permissions';
import { CheckCircle, XCircle, Plus, Home, Palette, BarChart3, Search, AlertTriangle, Paperclip, X, FileText, Image } from 'lucide-react';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DefectConsultTab, { DefectCounter } from '../components/DefectConsultTab';
import { checkMyHospitalPermissions } from '../services/hospitalRolesService';

/**
 * DefectCapture - Tablet-optimized interface for sequential inspection
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ [Estación: ▼] [Inspector: ▼] [Turno: ▼]       │ OK: 47  NG: 3 │ [PIEZA OK] │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ [Cliente: ▼]          [Proyecto: ▼]          [Parte: ▼ BUMPER COVER FRONT] │
 * ├─────────────────────────┬───────────────────────────────────────────────────┤
 * │ Etapa: [▼ Ensamble]     │  [SCRATCH] [DENT]  [DIRTY]  [LOOSE] [MISSING]    │
 * │ Paro: [ ] [__] min      │  [CRACK]  [BROKEN] [CLIP]   [NOISE] [RATTLE]     │
 * │ Disposición: [▼]        │                        75% DEFECT BUTTONS        │
 * │ Depto*: [▼ Producción]  │                                                   │
 * │ Lote: [__________]      ├───────────────────────────────────────────────────┤
 * │ Severidad: [●M ○m ○C]   │ PARTE | DEFECTO | SEVERIDAD              25%     │
 * │ Comentario: [_______]   │              [ AGREGAR DEFECTO ]                  │
 * └─────────────────────────┴───────────────────────────────────────────────────┘
 */

const DefectCapture = () => {
  const navigate = useNavigate();
  const API_URL = 'http://localhost:5000';

  // Permission check
  const canEdit = canUserEdit('defects');
  const readOnly = isReadOnly('defects');

  // Global Theme
  const { theme: currentTheme } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // ============================================================================
  // STATE - Data Lists
  // ============================================================================
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [allParts, setAllParts] = useState([]); // All parts for direct search
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // Logged-in user (inspector)

  // Inspection Catalogs (GLOBAL)
  const [stations, setStations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [stages, setStages] = useState([]);
  const [dispositions, setDispositions] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [departments, setDepartments] = useState([
    { id: 1, name: 'Producción' },
    { id: 2, name: 'Calidad' },
    { id: 3, name: 'Ingeniería' },
    { id: 4, name: 'Mantenimiento' },
    { id: 5, name: 'Logística' },
    { id: 6, name: 'Proveedor' }
  ]);

  // Defects for selected part (grouped by category)
  const [partDefects, setPartDefects] = useState([]);
  const [defectsByCategory, setDefectsByCategory] = useState([]);
  const [defectFilter, setDefectFilter] = useState('');

  // Specs for selected station+part
  const [stationSpecs, setStationSpecs] = useState([]);
  const [stationDefects, setStationDefects] = useState([]);
  const [hasStationConfig, setHasStationConfig] = useState(false);
  const [specResults, setSpecResults] = useState({}); // { specId: 'OK' | 'NOK' | null }
  const [specSaving, setSpecSaving] = useState({}); // { specId: true/false } - loading state
  const [specSaved, setSpecSaved] = useState({}); // { specId: true/false } - saved confirmation

  // ============================================================================
  // STATE - Selected Values (HEADER - persist across captures)
  // ============================================================================
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

  // ============================================================================
  // STATE - Counters
  // ============================================================================
  const [okCount, setOkCount] = useState(0);
  const [ngCount, setNgCount] = useState(0);

  // ============================================================================
  // STATE - Context (persist across captures)
  // ============================================================================
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);

  // ============================================================================
  // STATE - Form Fields (left panel)
  // ============================================================================
  const [selectedStage, setSelectedStage] = useState(null);
  const [hasDowntime, setHasDowntime] = useState(false);
  const [downtimeMinutes, setDowntimeMinutes] = useState('');
  const [selectedDisposition, setSelectedDisposition] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [lotNumber, setLotNumber] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [comment, setComment] = useState('');
  const [hasRegisteredDefect, setHasRegisteredDefect] = useState(false); // Track if defect was just registered

  // ============================================================================
  // STATE - Attachments (Evidence Files)
  // ============================================================================
  const [pendingAttachments, setPendingAttachments] = useState([]); // Files to upload with defect
  const fileInputRef = useRef(null);

  // ============================================================================
  // STATE - Selected Defect
  // ============================================================================
  const [selectedDefect, setSelectedDefect] = useState(null);

  // ============================================================================
  // STATE - UI
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [defectConsultOpen, setDefectConsultOpen] = useState(false);
  const [serialScrapped, setSerialScrapped] = useState(false); // Track if serial is scrapped
  const [scrapModalOpen, setScrapModalOpen] = useState(false); // Modal for scrapped serial
  const [scrapInfo, setScrapInfo] = useState(null); // Info about scrapped serial

  // ============================================================================
  // STATE - Access Control
  // ============================================================================
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // ============================================================================
  // ACCESS CONTROL - Two-layer security check
  // ============================================================================
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Refresh permissions from server before checking (in case admin updated them)
        const token = localStorage.getItem('token');
        const meResponse = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData.success && meData.user) {
            // Update user in localStorage with fresh permissions
            localStorage.setItem('user', JSON.stringify(meData.user));
            console.log('🔄 Permissions refreshed from server');
          }
        }
      } catch (err) {
        console.warn('Could not refresh permissions, using cached:', err.message);
      }

      // Layer 1: System permission check (includes sections.capture for partial access)
      const hasSystemPermission = canUserCaptureDefects() || isUserAdmin();

      if (!hasSystemPermission) {
        console.log('⛔ Access denied: No capture permission for defects (sections.capture=false or access=view/none)');
        setAccessChecked(true);
        setHasAccess(false);
        navigate('/hospital-dashboard?accessDenied=system');
        return;
      }

      // Layer 2: Hospital role check
      try {
        const result = await checkMyHospitalPermissions();
        const hospitalRoles = result?.data?.hospitalRoles || [];
        const isSystemAdmin = result?.data?.isSystemAdmin || false;

        // Can capture if has inspector, admin role, or is system admin
        const canCapture = isSystemAdmin ||
                          hospitalRoles.includes('inspector') ||
                          hospitalRoles.includes('admin');

        if (!canCapture) {
          console.log('⛔ Access denied: No hospital role for defect capture');
          setAccessChecked(true);
          setHasAccess(false);
          navigate('/hospital-dashboard?accessDenied=hospital');
          return;
        }

        // Access granted
        setHasAccess(true);
        setAccessChecked(true);
      } catch (err) {
        console.error('Error checking hospital permissions:', err);
        // On error, deny access for security
        setAccessChecked(true);
        setHasAccess(false);
        navigate('/defect-hospital', {
          state: {
            accessDenied: true,
            reason: 'Error al verificar permisos. Intenta de nuevo.'
          }
        });
      }
    };

    checkAccess();
  }, [navigate]);

  // ============================================================================
  // LOAD DATA
  // ============================================================================
  useEffect(() => {
    if (hasAccess) {
      loadInitialData();
    }
  }, [hasAccess]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Load in parallel
      const [
        clientsRes,
        usersRes,
        stationsRes,
        shiftsRes,
        stagesRes,
        dispositionsRes,
        severitiesRes,
        currentUserRes,
        allPartsRes
      ] = await Promise.all([
        fetch(`${API_URL}/clients/list`, { headers }),
        fetch(`${API_URL}/users/list`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/stations`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/shifts`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/stages`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/dispositions`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/severities`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers }),
        fetch(`${API_URL}/clients/parts/all?activeOnly=true`, { headers })
      ]);

      const [clientsData, usersData, stationsData, shiftsData, stagesData, dispositionsData, severitiesData, currentUserData, allPartsData] =
        await Promise.all([
          clientsRes.json(),
          usersRes.json(),
          stationsRes.json(),
          shiftsRes.json(),
          stagesRes.json(),
          dispositionsRes.json(),
          severitiesRes.json(),
          currentUserRes.ok ? currentUserRes.json() : null,
          allPartsRes.ok ? allPartsRes.json() : { parts: [] }
        ]);

      setClients(clientsData.clients || []);
      setUsers(usersData.users || usersData || []);
      setStations(stationsData.items || []);
      setShifts(shiftsData.items || []);
      setStages(stagesData.items || []);
      setDispositions(dispositionsData.items || []);
      setSeverities(severitiesData.items || []);
      setAllParts(allPartsData.parts || []);

      // Set current user as inspector (locked)
      if (currentUserData?.user) {
        setCurrentUser(currentUserData.user);
        setSelectedInspector(currentUserData.user);
      }

      // Auto-detect shift based on current time
      const currentShift = detectCurrentShift(shiftsData.items || []);
      if (currentShift) setSelectedShift(currentShift);

      // Restore saved context (client/project/part/station)
      const savedContext = localStorage.getItem('defectCaptureContext');
      if (savedContext) {
        try {
          const ctx = JSON.parse(savedContext);
          const savedClient = (clientsData.clients || []).find(c => c.id === ctx.clientId);
          if (savedClient) {
            setSelectedClient(savedClient);
          }
          // Restore station
          if (ctx.stationId) {
            const savedStation = (stationsData.items || []).find(s => s.id === ctx.stationId);
            if (savedStation) {
              setSelectedStation(savedStation);
            }
          }
        } catch (e) {
          console.error('Error restoring context:', e);
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  // Detect current shift based on time
  const detectCurrentShift = (shiftList) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const shift of shiftList) {
      if (shift.startTime && shift.endTime) {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes > startMinutes) {
          // Normal shift (e.g., 6:00 - 14:00)
          if (currentTime >= startMinutes && currentTime < endMinutes) {
            return shift;
          }
        } else {
          // Overnight shift (e.g., 22:00 - 6:00)
          if (currentTime >= startMinutes || currentTime < endMinutes) {
            return shift;
          }
        }
      }
    }
    return shiftList[0] || null;
  };

  // Load projects when client changes
  useEffect(() => {
    if (selectedClient) {
      loadProjects(selectedClient.id);
    } else {
      setProjects([]);
      setSelectedProject(null);
    }
  }, [selectedClient]);

  // Load parts when project changes
  useEffect(() => {
    if (selectedProject) {
      loadParts(selectedClient.id, selectedProject.id);
    } else {
      setParts([]);
      setSelectedPart(null);
    }
  }, [selectedProject]);

  // Load defects when part changes - RESET ALL fields
  useEffect(() => {
    if (selectedPart) {
      loadPartDefects(selectedPart.id);
      setDefectFilter('');
      // Reset ALL form fields when part changes
      setSelectedDefect(null);
      setSelectedStage(null);
      setSelectedDisposition(null);
      setSelectedDepartment(null);
      setSelectedSeverity(null);
      setComment('');
      setHasDowntime(false);
      setDowntimeMinutes('');
    } else {
      setPartDefects([]);
      setDefectsByCategory([]);
      setSelectedDefect(null);
    }
  }, [selectedPart]);

  // Reset specific fields when defect changes (same part)
  useEffect(() => {
    if (selectedDefect) {
      // Reset fields likely to change per defect
      setComment('');
      setSelectedDepartment(null);
      setSelectedSeverity(null);
      // Mantener: selectedStage, selectedDisposition (genéricos)
    }
  }, [selectedDefect]);

  // Save context to localStorage when it changes
  useEffect(() => {
    if (selectedClient && selectedProject && selectedPart) {
      localStorage.setItem('defectCaptureContext', JSON.stringify({
        clientId: selectedClient.id,
        projectId: selectedProject.id,
        partId: selectedPart.id,
        stationId: selectedStation?.id || null
      }));
    }
  }, [selectedClient, selectedProject, selectedPart, selectedStation]);

  // Sync project when projects load and part is selected without project
  useEffect(() => {
    if (selectedPart && !selectedProject && projects.length > 0) {
      const project = projects.find(p => p.id === selectedPart.projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects, selectedPart, selectedProject]);

  // Reset ALL form fields when station changes
  useEffect(() => {
    if (selectedStation) {
      setSelectedDefect(null);
      setSelectedStage(null);
      setSelectedDisposition(null);
      setSelectedDepartment(null);
      setSelectedSeverity(null);
      setComment('');
      setHasDowntime(false);
      setDowntimeMinutes('');
      setDefectFilter('');
    }
  }, [selectedStation]);

  // Load station config (specs/defects) when station or part changes
  useEffect(() => {
    // Reset spec states when config changes
    setSpecResults({});
    setSpecSaving({});
    setSpecSaved({});

    if (selectedStation && selectedPart) {
      loadStationConfig(selectedStation.id, selectedPart.id);
    } else {
      setStationSpecs([]);
      setStationDefects([]);
      setHasStationConfig(false);
    }
  }, [selectedStation, selectedPart]);

  const loadStationConfig = async (stationId, partId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/station-config/capture-config/${stationId}/${partId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setHasStationConfig(data.hasStationConfig);
        setStationDefects(data.defects || []);
        setStationSpecs(data.specs || []);
        setSpecResults({}); // Reset spec results when config changes
      }
    } catch (err) {
      console.error('Error loading station config:', err);
    }
  };

  const handleSpecResult = async (specId, result) => {
    // Toggle logic: if same result clicked, clear it
    const newResult = specResults[specId] === result ? null : result;

    // Update local state immediately for responsive UI
    setSpecResults(prev => ({
      ...prev,
      [specId]: newResult
    }));

    // If clearing (null), don't save to DB
    if (!newResult) {
      setSpecSaved(prev => ({ ...prev, [specId]: false }));
      return;
    }

    // Validate required fields
    if (!selectedClient || !selectedPart || !selectedStation || !selectedShift || !lotNumber.trim()) {
      console.warn('Missing required fields for spec inspection save');
      return;
    }

    // Save to DB
    setSpecSaving(prev => ({ ...prev, [specId]: true }));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/spec-inspection/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          projectId: selectedProject?.id || null,
          partId: selectedPart.id,
          specId: specId,
          stationId: selectedStation.id,
          shiftId: selectedShift.id,
          stageId: selectedStage?.id || null,
          departmentId: selectedDepartment?.id || null,
          serialNumber: lotNumber.trim(),
          lotNumber: lotNumber.trim(),
          result: newResult,
          notes: null
        })
      });

      if (res.ok) {
        setSpecSaved(prev => ({ ...prev, [specId]: true }));
        // Clear saved indicator after 2 seconds
        setTimeout(() => {
          setSpecSaved(prev => ({ ...prev, [specId]: false }));
        }, 2000);
      } else {
        const errData = await res.json();
        console.error('Error saving spec result:', errData.message);
        // Revert local state on error
        setSpecResults(prev => ({
          ...prev,
          [specId]: prev[specId] === newResult ? null : prev[specId]
        }));
      }
    } catch (err) {
      console.error('Error saving spec result:', err);
    } finally {
      setSpecSaving(prev => ({ ...prev, [specId]: false }));
    }
  };

  // Count spec results
  const specOkCount = Object.values(specResults).filter(r => r === 'OK').length;
  const specNokCount = Object.values(specResults).filter(r => r === 'NOK').length;
  const specPendingCount = stationSpecs.length - specOkCount - specNokCount;

  const loadProjects = async (clientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${clientId}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const projectsList = data.projects || [];
      setProjects(projectsList);

      // Restore saved project if available
      const savedContext = localStorage.getItem('defectCaptureContext');
      if (savedContext && !selectedProject) {
        try {
          const ctx = JSON.parse(savedContext);
          const savedProject = projectsList.find(p => p.id === ctx.projectId);
          if (savedProject) {
            setSelectedProject(savedProject);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadParts = async (clientId, projectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${clientId}/parts?activeOnly=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      // Filter by project
      const projectGroup = (data.projectGroups || []).find(g => g.projectId === projectId);
      const partsList = projectGroup?.parts || [];
      setParts(partsList);

      // Restore saved part if available
      const savedContext = localStorage.getItem('defectCaptureContext');
      if (savedContext && !selectedPart) {
        try {
          const ctx = JSON.parse(savedContext);
          const savedPart = partsList.find(p => p.id === ctx.partId);
          if (savedPart) {
            setSelectedPart(savedPart);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  const loadPartDefects = async (partId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/defects-v2/parts/${partId}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const defects = data.defects || [];
      setPartDefects(defects);

      // Group defects by category
      const grouped = defects.reduce((acc, defect) => {
        const catName = defect.categoryName || 'Sin Categoría';
        const catId = defect.categoryId || 0;
        const existing = acc.find(g => g.categoryId === catId);
        if (existing) {
          existing.defects.push(defect);
        } else {
          acc.push({
            categoryId: catId,
            categoryName: catName,
            categoryColor: defect.categoryColor || '#6b7280',
            defects: [defect]
          });
        }
        return acc;
      }, []);
      // Sort by category name
      grouped.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      setDefectsByCategory(grouped);
    } catch (err) {
      console.error('Error loading part defects:', err);
      setPartDefects([]);
      setDefectsByCategory([]);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handlePiezaOk = useCallback(() => {
    setOkCount(prev => prev + 1);
    // Clear lot for next piece
    setLotNumber('');
    showSuccessMessage('Pieza OK registrada');
  }, []);

  const showSuccessMessage = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2000);
  };

  // Handle direct part selection (auto-fill client/project backwards)
  const handleDirectPartSelect = (part) => {
    if (!part) {
      setSelectedPart(null);
      return;
    }

    // Find client and set it
    const client = clients.find(c => c.id === part.clientId);
    if (client && (!selectedClient || selectedClient.id !== client.id)) {
      setSelectedClient(client);
    }

    // Find project and set it (will load via useEffect)
    // We need to wait for projects to load, so we store the target part
    setSelectedPart(part);

    // If we have projects loaded, find and set the project
    if (part.projectId) {
      const project = projects.find(p => p.id === part.projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  };

  // Buscar serial existente y auto-rellenar campos
  const lookupSerialInfo = useCallback(async (serial) => {
    if (!serial.trim()) return;

    // Reset spec results for new serial inspection
    setSpecResults({});
    setSpecSaving({});
    setSpecSaved({});

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/defects-v2/serial-lookup/${encodeURIComponent(serial.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.unit) {
          // Check if serial is scrapped - show modal and block
          if (data.isScrapped) {
            setSerialScrapped(true);
            setScrapInfo({
              serial: serial,
              partNumber: data.unit.partNumber,
              partName: data.unit.partName,
              clientName: data.unit.clientName,
              scrappedBy: data.scrapInfo?.scrappedBy,
              scrappedAt: data.scrapInfo?.scrappedAt,
              scrapNotes: data.scrapInfo?.scrapNotes,
              message: data.scrappedMessage
            });
            setScrapModalOpen(true);
            return; // Don't auto-fill anything for scrapped serials
          } else {
            setSerialScrapped(false);
            setScrapInfo(null);
          }

          // Auto-rellenar Cliente, Proyecto y Parte
          const { clientId, projectId, partId, projectNumber, projectName } = data.unit;

          // Buscar cliente
          const client = clients.find(c => c.id === clientId);
          if (client && (!selectedClient || selectedClient.id !== clientId)) {
            setSelectedClient(client);
          }

          // Buscar parte en allParts
          const part = allParts.find(p => p.id === partId);
          if (part) {
            setSelectedPart(part);
          }

          // Establecer proyecto - usar datos del backend directamente para evitar race condition
          const projId = projectId || part?.projectId;
          if (projId) {
            // Buscar en lista local primero
            let project = projects.find(p => p.id === projId);

            // Si no está en lista local, crear objeto mínimo con datos del backend
            if (!project && projectNumber) {
              project = {
                id: projId,
                projectNumber: projectNumber,
                projectName: projectName || projectNumber
              };
            }

            if (project) {
              setSelectedProject(project);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error looking up serial:', err);
    }
  }, [clients, allParts, projects, selectedClient]);

  // Reset hasRegisteredDefect when user enters lot number
  const handleLotChange = (value) => {
    setLotNumber(value);
    if (value.trim()) {
      setHasRegisteredDefect(false);
      setSerialScrapped(false); // Reset scrapped state when serial changes
      setError(null);
    }
  };

  // Close scrap modal and clear serial
  const handleCloseScrapModal = () => {
    setScrapModalOpen(false);
    setLotNumber('');
    setSerialScrapped(false);
    setScrapInfo(null);
  };

  // Buscar info del serial cuando termina de escribir (onBlur o Enter)
  const handleLotBlur = () => {
    if (lotNumber.trim() && !selectedPart) {
      lookupSerialInfo(lotNumber);
    }
  };

  const handleLotKeyDown = (e) => {
    if (e.key === 'Enter' && lotNumber.trim()) {
      e.preventDefault();
      lookupSerialInfo(lotNumber);
    }
  };

  // ============================================================================
  // ATTACHMENT HANDLERS
  // ============================================================================
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Create preview URLs for images
    const newAttachments = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isImage: file.type.startsWith('image/'),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    // Reset input to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setPendingAttachments(prev => {
      const updated = [...prev];
      // Revoke object URL if it's an image preview
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAttachments = async (defectId, token) => {
    const results = [];
    for (const attachment of pendingAttachments) {
      try {
        const formData = new FormData();
        formData.append('file', attachment.file);

        const res = await fetch(`${API_URL}/defects-v2/entries/${defectId}/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          results.push({ success: true, name: attachment.name, data: data.attachment });
        } else {
          results.push({ success: false, name: attachment.name, error: 'Upload failed' });
        }
      } catch (err) {
        results.push({ success: false, name: attachment.name, error: err.message });
      }
    }
    return results;
  };

  const handleSubmitDefect = async () => {
    // Validation
    if (serialScrapped) {
      setError('Este serial ya fue enviado a SCRAP. No se pueden capturar más defectos.');
      return;
    }
    if (!selectedStation || !selectedInspector || !selectedShift) {
      setError('Completa: Estación, Inspector y Turno');
      return;
    }
    if (!selectedClient || !selectedProject || !selectedPart) {
      setError('Completa: Cliente, Proyecto y Parte');
      return;
    }
    if (!selectedDepartment) {
      setError('Selecciona Departamento Responsable');
      return;
    }
    if (!selectedDefect) {
      setError('Selecciona un defecto');
      return;
    }
    if (!lotNumber.trim()) {
      setError('Ingresa Lote/Serie');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // CRITICAL: Validate serial-part association BEFORE saving
      // This prevents registering a serial with the wrong part
      const token = localStorage.getItem('token');
      try {
        const lookupRes = await fetch(`${API_URL}/defects-v2/serial-lookup/${encodeURIComponent(lotNumber.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();

          // If serial exists and is associated with a DIFFERENT part, block save
          if (lookupData.success && lookupData.unit) {
            const existingPartId = lookupData.unit.partId;
            const existingPartNumber = lookupData.unit.partNumber || '';

            if (existingPartId && existingPartId !== selectedPart.id) {
              setSubmitting(false);
              setError(
                `Este serial (${lotNumber}) ya está registrado con otra parte: ${existingPartNumber}. ` +
                `No se puede asociar al part number ${selectedPart.partNumber || selectedPart.captureDisplayName}.`
              );
              return;
            }

            // Also check if scrapped (double-check in case state is stale)
            if (lookupData.isScrapped) {
              setSubmitting(false);
              setSerialScrapped(true);
              setScrapInfo({
                serial: lotNumber,
                partNumber: lookupData.unit.partNumber,
                partName: lookupData.unit.partName,
                clientName: lookupData.unit.clientName,
                scrappedBy: lookupData.scrapInfo?.scrappedBy,
                scrappedAt: lookupData.scrapInfo?.scrappedAt,
                scrapNotes: lookupData.scrapInfo?.scrapNotes
              });
              setScrapModalOpen(true);
              return;
            }
          }
        }
      } catch (lookupErr) {
        console.warn('Could not validate serial-part association:', lookupErr.message);
        // Continue with save - backend should also validate
      }

      const defectData = {
        partId: selectedPart.id,
        defectTypeId: selectedDefect.id,
        severityId: selectedSeverity?.id || null,
        stageId: selectedStage?.id || null,
        dispositionId: selectedDisposition?.id || null,
        stationId: selectedStation.id,
        shiftId: selectedShift.id,
        inspectorId: selectedInspector.id,
        departmentId: selectedDepartment.id,
        lotNumber: lotNumber || null,
        downtimeMinutes: hasDowntime ? parseInt(downtimeMinutes) || 0 : 0,
        notes: comment || null,
        quantity: 1
      };

      const res = await fetch(`${API_URL}/defects-v2/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(defectData)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error al guardar');
      }

      const defectId = result.entry?.id;
      const entryNumber = result.entry?.entryNumber || '';

      // Upload attachments if any
      if (pendingAttachments.length > 0 && defectId) {
        const uploadResults = await uploadAttachments(defectId, token);
        const failedUploads = uploadResults.filter(r => !r.success);
        if (failedUploads.length > 0) {
          console.warn('Some attachments failed to upload:', failedUploads);
        }
        // Clear attachments and revoke object URLs
        pendingAttachments.forEach(att => {
          if (att.preview) URL.revokeObjectURL(att.preview);
        });
        setPendingAttachments([]);
      }

      // Success
      setNgCount(prev => prev + 1);
      const attachmentMsg = pendingAttachments.length > 0 ? ` + ${pendingAttachments.length} archivo(s)` : '';
      const routingMsg = result.routing?.message ? ` - ${result.routing.message}` : '';
      showSuccessMessage(`Defecto ${entryNumber} registrado${attachmentMsg}${routingMsg}`);

      // Clear only lot (keep everything else for rapid capture)
      setLotNumber('');
      setHasRegisteredDefect(true); // Mark that a defect was registered
      // Don't clear: defect, stage, disposition, department, severity, comment

      // Check QAR threshold if severity selected
      if (selectedSeverity) {
        try {
          const thresholdRes = await fetch(`${API_URL}/qar/check-threshold`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              partId: selectedPart.id,
              severityId: selectedSeverity.id,
              departmentId: selectedDepartment.id
            })
          });
          const thresholdData = await thresholdRes.json();

          if (thresholdData.triggered) {
            // Ask user if they want to emit QAR
            const emitQar = window.confirm(
              ` ALERTA DE CALIDAD\n\n` +
              `${thresholdData.message}\n\n` +
              `¿Desea emitir un QAR (Quality Alert Report)?`
            );

            if (emitQar) {
              // Navigate to QAR creation with pre-filled data
              navigate('/qar-create', {
                state: {
                  clientId: selectedClient.id,
                  clientName: selectedClient.name,
                  projectId: selectedProject.id,
                  partId: selectedPart.id,
                  partName: selectedPart.captureDisplayName || selectedPart.partNumber,
                  severityId: selectedSeverity.id,
                  severityName: thresholdData.severityName,
                  severityColor: thresholdData.severityColor,
                  departmentId: selectedDepartment.id,
                  departmentName: thresholdData.departmentName,
                  defectCount: thresholdData.defectCount,
                  thresholdCount: thresholdData.thresholdCount,
                  thresholdHours: thresholdData.thresholdHours,
                  defects: thresholdData.defects,
                  defectIds: thresholdData.defects.map(d => d.id),
                  emittedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Usuario'
                }
              });
            } else {
              // User declined - log it for history
              try {
                await fetch(`${API_URL}/qar/decline`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    partId: selectedPart.id,
                    severityId: selectedSeverity.id,
                    departmentId: selectedDepartment.id,
                    defectCount: thresholdData.defectCount,
                    thresholdCount: thresholdData.thresholdCount,
                    thresholdHours: thresholdData.thresholdHours,
                    defectIds: thresholdData.defects.map(d => d.id)
                  })
                });
              } catch (declineErr) {
                console.error('Error logging declined QAR:', declineErr);
              }
            }
          }
        } catch (thresholdErr) {
          console.error('Error checking threshold:', thresholdErr);
        }
      }

    } catch (err) {
      setError(err.message || 'Error al registrar defecto');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // COMPUTED
  // ============================================================================
  const isFormValid = selectedStation && selectedInspector && selectedShift &&
    selectedClient && selectedProject && selectedPart &&
    selectedDepartment && selectedDefect && lotNumber.trim() && !serialScrapped;

  const defectPreview = selectedPart && selectedDefect ?
    `${selectedPart.captureDisplayName || selectedPart.partNumber} | ${selectedDefect.name} | ${selectedSeverity?.name || 'Sin severidad'}` :
    'Selecciona parte y defecto';

  // ============================================================================
  // STYLES (dynamic based on theme)
  // ============================================================================
  const t = currentTheme;
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      display: 'flex',
      flexDirection: 'column'
    },
    // Header row
    header: {
      backgroundColor: t.bgPanel,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      borderBottom: `2px solid ${t.border}`
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerSelect: {
      padding: '8px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px',
      minWidth: '150px'
    },
    headerCenter: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    counter: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: '700'
    },
    counterOk: {
      backgroundColor: '#d1fae5',
      color: '#2E7D32'
    },
    counterNg: {
      backgroundColor: '#fee2e2',
      color: '#ef4444'
    },
    piezaOkButton: {
      padding: '12px 24px',
      backgroundColor: '#2E7D32',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    // Context row
    contextRow: {
      backgroundColor: t.bg,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      borderBottom: `2px solid ${t.border}`
    },
    contextSelect: {
      flex: 1,
      padding: '10px 14px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    // Main content
    mainContent: {
      flex: 1,
      display: 'flex',
      padding: '16px',
      gap: '16px'
    },
    // Left panel (25%)
    leftPanel: {
      width: '25%',
      minWidth: '280px',
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    fieldLabel: {
      color: t.textMuted,
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    fieldLabelRequired: {
      color: '#f87171'
    },
    fieldSelect: {
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    fieldInput: {
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px'
    },
    downtimeRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    checkbox: {
      width: '20px',
      height: '20px',
      cursor: 'pointer'
    },
    severityGroup: {
      display: 'flex',
      gap: '8px'
    },
    severityButton: {
      flex: 1,
      padding: '10px 8px',
      border: `2px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgInput,
      color: t.text,
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.15s'
    },
    severityButtonSelected: {
      borderWidth: '2px'
    },
    textarea: {
      padding: '10px 12px',
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.text,
      fontSize: '14px',
      minHeight: '60px',
      resize: 'vertical'
    },
    // Right panel (75%)
    rightPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    // Defects grid (75% of right panel)
    defectsGrid: {
      flex: 3,
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column'
    },
    defectsTitle: {
      color: t.textMuted,
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: '12px'
    },
    defectsButtons: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      flex: 1,
      alignContent: 'flex-start'
    },
    defectButton: {
      padding: '14px 18px',
      borderRadius: '8px',
      border: `2px solid ${t.border}`,
      backgroundColor: t.bgInput,
      color: t.text,
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s',
      minWidth: '100px'
    },
    defectButtonSelected: {
      border: `2px solid ${t.accent}`,
      backgroundColor: t.accent,
      color: 'white',
      transform: 'scale(1.02)'
    },
    noDefectsMessage: {
      color: t.textMuted,
      textAlign: 'center',
      padding: '40px',
      fontSize: '14px'
    },
    // Preview + Submit (25% of right panel)
    previewSubmit: {
      flex: 1,
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    previewLine: {
      padding: '12px 16px',
      backgroundColor: t.bgInput,
      borderRadius: '8px',
      color: t.text,
      fontSize: '14px',
      fontWeight: '500',
      textAlign: 'center',
      marginBottom: '12px'
    },
    submitButton: {
      padding: '16px 24px',
      backgroundColor: '#B00020',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    submitButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    // Alerts
    alert: {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    alertError: {
      backgroundColor: '#fef2f2',
      color: '#B00020',
      border: '1px solid #fecaca'
    },
    alertSuccess: {
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      border: '1px solid #bbf7d0'
    },
    settingsButton: {
      padding: '8px',
      backgroundColor: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      color: t.textMuted,
      cursor: 'pointer'
    },
    // Specs section
    specsSection: {
      backgroundColor: t.bgPanel,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      border: `2px solid ${t.accent}`
    },
    specsTitle: {
      color: t.accent,
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    specsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '12px'
    },
    specCard: {
      backgroundColor: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    specCardCritical: {
      border: '2px solid #ef4444'
    },
    specHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    specName: {
      fontWeight: '600',
      fontSize: '14px',
      color: t.text
    },
    specCode: {
      fontSize: '11px',
      color: t.textMuted,
      backgroundColor: t.bgPanel,
      padding: '2px 6px',
      borderRadius: '4px'
    },
    specLimits: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: t.textMuted
    },
    specLimitValue: {
      backgroundColor: t.bgPanel,
      padding: '4px 8px',
      borderRadius: '4px',
      fontFamily: 'monospace'
    },
    specNominal: {
      backgroundColor: t.accent,
      color: 'white',
      fontWeight: '600'
    },
    specActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '8px'
    },
    specButton: {
      flex: 1,
      padding: '8px 12px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px'
    },
    specButtonOk: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    specButtonNok: {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    },
    specButtonSelected: {
      transform: 'scale(1.02)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    },
    criticalBadge: {
      backgroundColor: '#fecaca',
      color: '#991b1b',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '700'
    },
    // Theme selector
    themeSelector: {
      display: 'flex',
      gap: '6px',
      alignItems: 'center'
    },
    themeButton: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.15s'
    },
    themeButtonActive: {
      border: '2px solid #ffffff',
      boxShadow: `0 0 0 2px ${currentTheme.accent}`
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show loading while checking access
  if (!accessChecked) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Verificando permisos...</div>
      </div>
    );
  }

  // If no access, don't render (redirect happens in useEffect)
  if (!hasAccess) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Read-only Banner */}
      {readOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderBottom: '2px solid #C77700',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <span style={{ fontSize: '20px' }}></span>
          <span style={{ color: '#92400e', fontWeight: '600' }}>
            Modo Solo Lectura - No tienes permisos para capturar defectos
          </span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          <XCircle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', fontSize: '18px', color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* ====== HEADER ROW ====== */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {/* Station */}
          <select
            style={styles.headerSelect}
            value={selectedStation?.id || ''}
            onChange={(e) => setSelectedStation(stations.find(s => s.id === parseInt(e.target.value)) || null)}
          >
            <option value="">Estación...</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>

          {/* Inspector (locked to current user) */}
          <div
            style={{
              ...styles.headerSelect,
              backgroundColor: t.bgPanel,
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Inspector bloqueado al usuario en sesión"
          >
            <span style={{ fontSize: '12px' }}></span>
            {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Cargando...'}
          </div>

          {/* Shift */}
          <select
            style={styles.headerSelect}
            value={selectedShift?.id || ''}
            onChange={(e) => setSelectedShift(shifts.find(s => s.id === parseInt(e.target.value)) || null)}
          >
            <option value="">Turno...</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.headerCenter}>
          {/* OK Counter */}
          <div style={{ ...styles.counter, ...styles.counterOk }}>
            <CheckCircle size={20} />
            OK: {okCount}
          </div>

          {/* NG Counter */}
          <div style={{ ...styles.counter, ...styles.counterNg }}>
            <XCircle size={20} />
            NG: {ngCount}
          </div>

          {/* PIEZA OK Button */}
          <button style={styles.piezaOkButton} onClick={handlePiezaOk}>
            <CheckCircle size={20} />
            PIEZA OK
          </button>
        </div>

        {/* Theme Selector */}
        <div style={styles.themeSelector}>
          <Palette size={16} style={{ color: t.textMuted, marginRight: '8px' }} />
          <ThemeSelector />
        </div>

        {/* Language Selector */}
        <button
          onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')}
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: t.bgPanel,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {language === 'es' ? 'EN' : 'ES'}
        </button>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={styles.settingsButton}
            onClick={() => navigate('/defect-query')}
            title="Consulta de Defectos"
          >
            <Search size={20} />
          </button>
          <button
            style={styles.settingsButton}
            onClick={() => navigate('/defect-dashboard')}
            title="Dashboard"
          >
            <BarChart3 size={20} />
          </button>
          <button
            style={{...styles.settingsButton, backgroundColor: t.accent, color: 'white', border: 'none'}}
            onClick={() => navigate('/')}
            title="Inicio"
          >
            <Home size={20} />
          </button>
        </div>
      </div>

      {/* ====== CONTEXT ROW ====== */}
      <div style={styles.contextRow}>
        {/* Client (auto-filled or manual) */}
        <select
          style={{
            ...styles.contextSelect,
            backgroundColor: selectedPart && !selectedProject ? t.bgPanel : t.bgInput,
            opacity: selectedPart && !selectedProject ? 0.7 : 1
          }}
          value={selectedClient?.id || ''}
          onChange={(e) => {
            const client = clients.find(c => c.id === parseInt(e.target.value));
            setSelectedClient(client || null);
            setSelectedProject(null);
            setSelectedPart(null);
          }}
        >
          <option value="">Cliente...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Project (auto-filled or manual) */}
        <select
          style={{
            ...styles.contextSelect,
            backgroundColor: selectedPart && !selectedProject ? t.bgPanel : t.bgInput,
            opacity: selectedPart && !selectedProject ? 0.7 : 1
          }}
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === parseInt(e.target.value));
            setSelectedProject(project || null);
            setSelectedPart(null);
          }}
          disabled={!selectedClient}
        >
          <option value="">Proyecto...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>
          ))}
        </select>

        {/* Direct Part Search (filters by client/project if selected) */}
        <select
          style={{
            ...styles.contextSelect,
            flex: 2,
            fontWeight: selectedPart ? '600' : '400',
            border: selectedPart ? `2px solid ${t.accent}` : `1px solid ${t.border}`
          }}
          value={selectedPart?.id || ''}
          onChange={(e) => {
            const part = allParts.find(p => p.id === parseInt(e.target.value));
            if (part) {
              handleDirectPartSelect(part);
            } else {
              setSelectedPart(null);
              setSelectedDefect(null);
            }
          }}
        >
          <option value="">
            {selectedClient && selectedProject
              ? `Partes de ${selectedProject.projectNumber}...`
              : selectedClient
                ? `Partes de ${selectedClient.name}...`
                : 'Buscar Parte...'}
          </option>
          {allParts
            .filter(p => {
              if (selectedClient && p.clientId !== selectedClient.id) return false;
              if (selectedProject && p.projectId !== selectedProject.id) return false;
              return true;
            })
            .map(p => (
            <option key={p.id} value={p.id}>
              {p.captureDisplayName || p.partNumber} - {p.partName} {!selectedClient ? `[${p.clientName}]` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ====== MAIN CONTENT ====== */}
      <div style={styles.mainContent}>
        {/* ====== LEFT PANEL (25%) ====== */}
        <div style={styles.leftPanel}>
          {/* Lot/Serial - PRIMER CAMPO (obligatorio) */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Lote / Serie <span style={styles.fieldLabelRequired}>*</span>
            </label>
            <input
              type="text"
              autoFocus
              style={{
                ...styles.fieldInput,
                border: `1px solid ${!lotNumber.trim() ? '#f87171' : t.border}`,
                fontSize: '16px',
                padding: '12px'
              }}
              placeholder="Escanear o ingresar serial..."
              value={lotNumber}
              onChange={(e) => handleLotChange(e.target.value)}
              onBlur={handleLotBlur}
              onKeyDown={handleLotKeyDown}
            />
            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
              Presiona Enter para buscar
            </div>
            {/* Contador de defectos clickeable */}
            {lotNumber && selectedClient && (
              <div style={{ marginTop: '8px' }}>
                <DefectCounter
                  serial={lotNumber}
                  clientId={selectedClient?.id}
                  onClick={() => setDefectConsultOpen(true)}
                  theme={currentTheme}
                />
              </div>
            )}
          </div>

          {/* Etapa */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Etapa de Afectación</label>
            <select
              style={styles.fieldSelect}
              value={selectedStage?.id || ''}
              onChange={(e) => setSelectedStage(stages.find(s => s.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Seleccionar...</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>

          {/* Downtime */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Tiempo de Paro</label>
            <div style={styles.downtimeRow}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={hasDowntime}
                onChange={(e) => setHasDowntime(e.target.checked)}
              />
              <input
                type="number"
                style={{ ...styles.fieldInput, flex: 1 }}
                placeholder="Minutos"
                value={downtimeMinutes}
                onChange={(e) => setDowntimeMinutes(e.target.value)}
                disabled={!hasDowntime}
              />
              <span style={{ color: currentTheme.textDim, fontSize: '14px' }}>min</span>
            </div>
          </div>

          {/* Disposition */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Disposición</label>
            <select
              style={styles.fieldSelect}
              value={selectedDisposition?.id || ''}
              onChange={(e) => setSelectedDisposition(dispositions.find(d => d.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Seleccionar...</option>
              {dispositions.map(d => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          {/* Department (REQUIRED) */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Depto. Responsable <span style={styles.fieldLabelRequired}>*</span>
            </label>
            <select
              style={{
                ...styles.fieldSelect,
                border: `1px solid ${!selectedDepartment ? '#f87171' : t.border}`
              }}
              value={selectedDepartment?.id || ''}
              onChange={(e) => setSelectedDepartment(departments.find(d => d.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Seleccionar...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Severidad</label>
            <div style={styles.severityGroup}>
              {severities.map(sev => (
                <button
                  key={sev.id}
                  type="button"
                  style={{
                    ...styles.severityButton,
                    ...(selectedSeverity?.id === sev.id ? {
                      ...styles.severityButtonSelected,
                      border: `2px solid ${sev.color || '#0072CE'}`,
                      backgroundColor: sev.color || '#0072CE'
                    } : {})
                  }}
                  onClick={() => setSelectedSeverity(selectedSeverity?.id === sev.id ? null : sev)}
                >
                  {sev.code || sev.name}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Comentario</label>
            <textarea
              style={styles.textarea}
              placeholder="Observaciones..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        {/* ====== RIGHT PANEL (75%) ====== */}
        <div style={styles.rightPanel}>
          {/* Specs Section (only if station has specs configured) */}
          {stationSpecs.length > 0 && (
            <div style={styles.specsSection}>
              <div style={styles.specsTitle}>
                <AlertTriangle size={16} />
                Especificaciones a Verificar ({stationSpecs.length})
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '13px' }}>
                  <span style={{ color: '#065f46' }}>OK: {specOkCount}</span>
                  <span style={{ color: '#991b1b' }}>NOK: {specNokCount}</span>
                  <span style={{ color: t.textMuted }}>Pendiente: {specPendingCount}</span>
                </span>
              </div>
              <div style={styles.specsGrid}>
                {stationSpecs.map(spec => (
                  <div
                    key={spec.id}
                    style={{
                      ...styles.specCard,
                      ...(spec.isCritical ? styles.specCardCritical : {})
                    }}
                  >
                    <div style={styles.specHeader}>
                      <div>
                        <div style={styles.specName}>{spec.specName}</div>
                        <code style={styles.specCode}>{spec.specNumber}</code>
                      </div>
                      {spec.isCritical && <span style={styles.criticalBadge}>CTQ</span>}
                    </div>

                    {/* Show limits for dimensional specs */}
                    {spec.specType === 'DIMENSIONAL' && (
                      <div style={styles.specLimits}>
                        <span style={styles.specLimitValue}>{spec.lowerLimit ?? '-'}</span>
                        <span>≤</span>
                        <span style={{ ...styles.specLimitValue, ...styles.specNominal }}>
                          {spec.nominalValue ?? '-'} {spec.unitSymbol || ''}
                        </span>
                        <span>≤</span>
                        <span style={styles.specLimitValue}>{spec.upperLimit ?? '-'}</span>
                      </div>
                    )}

                    {/* OK / NOK Buttons */}
                    <div style={styles.specActions}>
                      <button
                        style={{
                          ...styles.specButton,
                          ...styles.specButtonOk,
                          ...(specResults[spec.id] === 'OK' ? styles.specButtonSelected : { opacity: specResults[spec.id] ? 0.5 : 1 }),
                          ...(specSaving[spec.id] ? { opacity: 0.6, cursor: 'wait' } : {})
                        }}
                        onClick={() => handleSpecResult(spec.id, 'OK')}
                        disabled={specSaving[spec.id] || !lotNumber.trim()}
                      >
                        <CheckCircle size={16} /> OK
                      </button>
                      <button
                        style={{
                          ...styles.specButton,
                          ...styles.specButtonNok,
                          ...(specResults[spec.id] === 'NOK' ? styles.specButtonSelected : { opacity: specResults[spec.id] ? 0.5 : 1 }),
                          ...(specSaving[spec.id] ? { opacity: 0.6, cursor: 'wait' } : {})
                        }}
                        onClick={() => handleSpecResult(spec.id, 'NOK')}
                        disabled={specSaving[spec.id] || !lotNumber.trim()}
                      >
                        <XCircle size={16} /> NOK
                      </button>
                      {/* Saved indicator */}
                      {specSaved[spec.id] && (
                        <span style={{ color: '#10b981', fontSize: '11px', marginLeft: '4px' }}>Guardado</span>
                      )}
                      {specSaving[spec.id] && (
                        <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '4px' }}>...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Defects Grid (75% of right) */}
          <div style={styles.defectsGrid}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={styles.defectsTitle}>
                Defectos Disponibles {selectedPart ? `(${partDefects.length})` : ''}
              </div>
              {partDefects.length > 6 && (
                <input
                  type="text"
                  placeholder="Buscar defecto..."
                  value={defectFilter}
                  onChange={(e) => setDefectFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: t.bgInput,
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    color: t.text,
                    fontSize: '13px',
                    width: '180px'
                  }}
                />
              )}
            </div>

            {!selectedPart ? (
              <div style={styles.noDefectsMessage}>
                Selecciona una parte para ver los defectos disponibles
              </div>
            ) : partDefects.length === 0 ? (
              <div style={styles.noDefectsMessage}>
                No hay defectos configurados para esta parte.
                <br />
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {defectsByCategory.map(category => {
                  // Filter defects by search term
                  const filteredDefects = category.defects.filter(d =>
                    !defectFilter ||
                    d.name.toLowerCase().includes(defectFilter.toLowerCase()) ||
                    (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase()))
                  );
                  if (filteredDefects.length === 0) return null;

                  return (
                    <div key={category.categoryId} style={{ marginBottom: '16px' }}>
                      {/* Category Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: `2px solid ${category.categoryColor || '#6b7280'}`
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          backgroundColor: category.categoryColor || '#6b7280'
                        }} />
                        <span style={{
                          color: t.text,
                          fontSize: '13px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {category.categoryName}
                        </span>
                        <span style={{ color: t.textMuted, fontSize: '12px' }}>
                          ({filteredDefects.length})
                        </span>
                      </div>

                      {/* Defect Buttons */}
                      <div style={styles.defectsButtons}>
                        {filteredDefects.map(defect => (
                          <button
                            key={defect.id}
                            type="button"
                            style={{
                              ...styles.defectButton,
                              ...(selectedDefect?.id === defect.id ? styles.defectButtonSelected : {}),
                              ...(defect.color ? { border: `2px solid ${defect.color}` } : {})
                            }}
                            onClick={() => setSelectedDefect(selectedDefect?.id === defect.id ? null : defect)}
                          >
                            {defect.code ? `${defect.code}` : ''} {defect.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview + Submit (25% of right) */}
          <div style={styles.previewSubmit}>
            <div style={styles.previewLine}>
              {defectPreview}
            </div>

            {/* Attachments Section */}
            <div style={{ marginBottom: '12px' }}>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                style={{ display: 'none' }}
              />

              {/* Add attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '10px',
                  backgroundColor: t.bgInput,
                  border: `1px dashed ${t.border}`,
                  borderRadius: '8px',
                  color: t.textMuted,
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginBottom: pendingAttachments.length > 0 ? '8px' : '0'
                }}
              >
                <Paperclip size={16} />
                {language === 'es' ? 'Adjuntar Evidencia' : 'Attach Evidence'}
              </button>

              {/* Preview of selected files */}
              {pendingAttachments.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: t.bgInput,
                  borderRadius: '8px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: att.isImage ? '60px' : 'auto',
                        minWidth: att.isImage ? '60px' : '80px',
                        height: att.isImage ? '60px' : 'auto',
                        backgroundColor: t.bgCard,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: `1px solid ${t.border}`
                      }}
                    >
                      {att.isImage ? (
                        <img
                          src={att.preview}
                          alt={att.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          fontSize: '11px',
                          color: t.text
                        }}>
                          <FileText size={14} />
                          <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.name.length > 10 ? att.name.slice(0, 8) + '...' : att.name}
                          </span>
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '18px',
                          height: '18px',
                          padding: 0,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={12} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              style={{
                ...styles.submitButton,
                ...((!isFormValid || submitting) ? styles.submitButtonDisabled : {})
              }}
              onClick={handleSubmitDefect}
              disabled={!isFormValid || submitting}
            >
              <Plus size={20} />
              {submitting ? 'GUARDANDO...' : 'AGREGAR DEFECTO'}
              {pendingAttachments.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px'
                }}>
                  +{pendingAttachments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Consulta de Defectos */}
      <DefectConsultTab
        isOpen={defectConsultOpen}
        onClose={() => setDefectConsultOpen(false)}
        serial={lotNumber}
        clientId={selectedClient?.id}
        theme={currentTheme}
      />

      {/* Modal de Serial en SCRAP */}
      {scrapModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: currentTheme.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: `2px solid #ef4444`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={28} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', fontWeight: '700' }}>
                  SERIAL EN SCRAP
                </h3>
                <p style={{ margin: '4px 0 0 0', color: currentTheme.textMuted, fontSize: '13px' }}>
                  No se pueden capturar defectos
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: currentTheme.bg,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Serial:</span>
                <div style={{ color: currentTheme.text, fontWeight: '600', fontSize: '16px' }}>
                  {scrapInfo?.serial}
                </div>
              </div>
              {scrapInfo?.partNumber && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Parte:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {scrapInfo.partNumber} - {scrapInfo.partName}
                  </div>
                </div>
              )}
              {scrapInfo?.clientName && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Cliente:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {scrapInfo.clientName}
                  </div>
                </div>
              )}
              {scrapInfo?.scrappedBy && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Enviado a Scrap por:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {scrapInfo.scrappedBy}
                    {scrapInfo.scrappedAt && (
                      <span style={{ color: currentTheme.textMuted, fontWeight: '400', marginLeft: '8px' }}>
                        ({new Date(scrapInfo.scrappedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                </div>
              )}
              {scrapInfo?.scrapNotes && (
                <div>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Motivo:</span>
                  <div style={{
                    color: currentTheme.text,
                    fontWeight: '400',
                    backgroundColor: currentTheme.bgCard,
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    fontSize: '13px',
                    fontStyle: 'italic'
                  }}>
                    "{scrapInfo.scrapNotes}"
                  </div>
                </div>
              )}
            </div>

            <p style={{
              color: currentTheme.text,
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0 0 20px 0'
            }}>
              Este serial ya fue enviado a <strong style={{ color: '#ef4444' }}>SCRAP</strong> y no puede recibir nuevos defectos.
            </p>

            <button
              onClick={handleCloseScrapModal}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectCapture;
