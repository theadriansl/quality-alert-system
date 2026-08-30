import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { canUserEdit, canUserCaptureDefects, isReadOnly, isUserAdmin } from '../utils/permissions';
import { CheckCircle, XCircle, Plus, Home, Palette, BarChart3, Search, AlertTriangle, Paperclip, X, FileText, Image, ChevronDown, ChevronRight, ChevronUp, ChevronLeft } from 'lucide-react';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DefectConsultTab, { DefectCounter } from '../components/DefectConsultTab';
import SerialDefectsSummary from '../components/SerialDefectsSummary';
import DefectsListModal from '../components/DefectsListModal';
import InlineDefectDetailModal from '../components/InlineDefectDetailModal';
import { checkMyHospitalPermissions } from '../services/hospitalRolesService';
import * as repairService from '../services/repairService';

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
  // STATE - Counters (persisted in sessionStorage per station)
  // ============================================================================
  const [okCount, setOkCount] = useState(0);
  const [ngCount, setNgCount] = useState(0);
  const [countersLoaded, setCountersLoaded] = useState(false);

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
  const [serialReleased, setSerialReleased] = useState(false); // Track if serial is released
  const [releaseModalOpen, setReleaseModalOpen] = useState(false); // Modal for released serial
  const [releaseInfo, setReleaseInfo] = useState(null); // Info about released serial
  const [isReprocessMode, setIsReprocessMode] = useState(false); // Track if capturing in reprocess mode
  const [reprocessLoading, setReprocessLoading] = useState(false); // Loading state for reprocess confirmation
  const [productionInfo, setProductionInfo] = useState(null); // Info from production_entries

  // ============================================================================
  // STATE - Serial Defects (inline repair/release)
  // ============================================================================
  const [serialDefects, setSerialDefects] = useState([]);
  const [defectCounts, setDefectCounts] = useState({ open: 0, repaired: 0, released: 0, total: 0 });
  const [selectedDefectForDetail, setSelectedDefectForDetail] = useState(null);
  const [defectDetailModalOpen, setDefectDetailModalOpen] = useState(false);
  const [defectsListModalOpen, setDefectsListModalOpen] = useState(false);
  const [hospitalPermissions, setHospitalPermissions] = useState({
    canRepair: false,
    canRelease: false,
    canScrap: false,
    isHospitalAdmin: false,
    canManageDeviations: false,
    hospitalRoles: []
  });

  // ============================================================================
  // STATE - Selected Category (with localStorage persistence)
  // ============================================================================
  const [selectedCategory, setSelectedCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('defectCapture_selectedCategory');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    localStorage.setItem('defectCapture_selectedCategory', JSON.stringify(newCategory));
  }, [selectedCategory]);

  // Get defects for selected category
  const selectedCategoryDefects = selectedCategory
    ? defectsByCategory.find(c => c.categoryId === selectedCategory)?.defects || []
    : [];

  // ============================================================================
  // STATE - Defects Pagination
  // ============================================================================
  const [defectsPage, setDefectsPage] = useState(1);
  const DEFECTS_PER_PAGE = 20; // 4 rows × 5 columns grid

  // Reset page when category changes
  useEffect(() => {
    setDefectsPage(1);
  }, [selectedCategory]);

  // Load counters when station changes
  useEffect(() => {
    if (selectedStation?.id) {
      const storedOk = parseInt(sessionStorage.getItem(`defectCapture_ok_${selectedStation.id}`) || '0', 10);
      const storedNg = parseInt(sessionStorage.getItem(`defectCapture_ng_${selectedStation.id}`) || '0', 10);
      setOkCount(storedOk);
      setNgCount(storedNg);
      setCountersLoaded(true);
    }
  }, [selectedStation?.id]);

  // Persist counters to sessionStorage (only after loaded)
  useEffect(() => {
    if (selectedStation?.id && countersLoaded) {
      sessionStorage.setItem(`defectCapture_ok_${selectedStation.id}`, okCount.toString());
      sessionStorage.setItem(`defectCapture_ng_${selectedStation.id}`, ngCount.toString());
    }
  }, [okCount, ngCount, selectedStation?.id, countersLoaded]);

  // Get paginated defects
  const getPaginatedDefects = useCallback((defects) => {
    const startIndex = (defectsPage - 1) * DEFECTS_PER_PAGE;
    return defects.slice(startIndex, startIndex + DEFECTS_PER_PAGE);
  }, [defectsPage]);

  // ============================================================================
  // STATE - Specs Checklist
  // ============================================================================
  const [partSpecs, setPartSpecs] = useState([]); // Specs for current station
  const [allPartSpecs, setAllPartSpecs] = useState([]); // ALL specs for the part (all stations)
  const [specsWarningOpen, setSpecsWarningOpen] = useState(false); // Warning modal
  const [specsChecklistOpen, setSpecsChecklistOpen] = useState(false); // Checklist modal
  const [pendingAction, setPendingAction] = useState(null); // 'OK' | 'DEFECT' - what to do after checklist
  const [checklistResults, setChecklistResults] = useState({}); // { specId: { result, measuredValue, qualitativeValue, notes, stationName } }
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false); // Track if user dismissed checklist
  const [serialConfirmed, setSerialConfirmed] = useState(false); // Track if user pressed Enter to confirm serial
  const [omitWarningOpen, setOmitWarningOpen] = useState(false); // Warning modal for omitting checklist
  const [qarAlertOpen, setQarAlertOpen] = useState(false); // QAR alert modal
  const [qarAlertData, setQarAlertData] = useState(null); // QAR threshold data for modal

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

  // Load hospital permissions from hospital roles service
  useEffect(() => {
    const loadHospitalPermissions = async () => {
      try {
        const result = await checkMyHospitalPermissions();
        if (result.success && result.data) {
          setHospitalPermissions({
            canRepair: result.data.canRepair || false,
            canRelease: result.data.canRelease || false,
            canScrap: result.data.canScrap || false,
            isHospitalAdmin: result.data.isHospitalAdmin || false,
            canManageDeviations: result.data.canManageDeviations || false,
            hospitalRoles: result.data.hospitalRoles || []
          });
        }
      } catch (err) {
        console.error('Error loading hospital permissions:', err);
        // Fallback: verificar si es admin en localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin =
          user.systemRole === 'admin' ||
          user.role === 'admin' ||
          user.userType === 'super_admin' ||
          user.roleName === 'Administrador' ||
          user.roleName === 'Admin' ||
          user.clearanceLevel >= 100;
        setHospitalPermissions({
          canRepair: isAdmin,
          canRelease: isAdmin,
          canScrap: isAdmin,
          isHospitalAdmin: isAdmin,
          canManageDeviations: isAdmin,
          hospitalRoles: isAdmin ? ['admin'] : []
        });
      }
    };
    loadHospitalPermissions();
  }, []);

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

  // Load defects and specs when part or station changes - RESET ALL fields
  useEffect(() => {
    if (selectedPart) {
      loadPartDefects(selectedPart.id);
      loadPartSpecs(selectedPart.id, selectedStation?.id);
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
      // Reset checklist
      setChecklistResults({});
    } else {
      setPartDefects([]);
      setDefectsByCategory([]);
      setSelectedDefect(null);
      setPartSpecs([]);
      setChecklistResults({});
    }
  }, [selectedPart, selectedStation]);

  // Load previous results when serial is confirmed
  useEffect(() => {
    if (serialConfirmed && lotNumber.trim() && selectedPart?.id) {
      loadPreviousSpecResults(lotNumber.trim(), selectedPart.id);
    }
  }, [serialConfirmed, lotNumber, selectedPart?.id]);

  // AUTO-OPEN checklist when serial is CONFIRMED (Enter pressed) and part has specs
  useEffect(() => {
    // Only open if: has specs, serial confirmed with Enter, checklist not completed/skipped, not dismissed, and not already open
    if (partSpecs.length > 0 &&
        serialConfirmed &&
        lotNumber.trim() &&
        !checklistResults._completed &&
        !checklistResults._skipped &&
        !checklistDismissed &&
        !specsChecklistOpen &&
        !specsWarningOpen &&
        selectedPart) {
      // Small delay to let UI settle and load previous results
      const timer = setTimeout(() => {
        setPendingAction('OK');
        setSpecsChecklistOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [partSpecs, serialConfirmed, lotNumber, checklistResults, checklistDismissed, specsChecklistOpen, specsWarningOpen, selectedPart]);

  // Reset states when serial changes (user starts typing new serial)
  useEffect(() => {
    setChecklistDismissed(false);
    setSerialConfirmed(false);
    // Reset results - they will be loaded fresh when serial is confirmed
    setChecklistResults({});
  }, [lotNumber]);

  // Reset comment when defect changes (keep department and severity - user selected them)
  useEffect(() => {
    if (selectedDefect) {
      setComment('');
      // NO resetear department ni severity - el usuario ya los seleccionó
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

  // Sincronizar selectedDefectForDetail con serialDefects actualizado
  useEffect(() => {
    if (selectedDefectForDetail && serialDefects.length > 0) {
      const updatedDefect = serialDefects.find(d => d.id === selectedDefectForDetail.id);
      if (updatedDefect && updatedDefect.repairStatus !== selectedDefectForDetail.repairStatus) {
        setSelectedDefectForDetail(updatedDefect);
      }
    }
  }, [serialDefects, selectedDefectForDetail]);

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

  const loadPartSpecs = async (partId, stationId = null) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/spec-catalog/parts/${partId}/specs-with-stations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const allSpecs = data.specs || [];
        // Save ALL specs for the summary panel
        setAllPartSpecs(allSpecs);
        // Filter by current station if one is selected
        let stationSpecs = allSpecs;
        if (stationId) {
          stationSpecs = allSpecs.filter(spec =>
            spec.stations && spec.stations.some(st => st.id === stationId)
          );
        }
        setPartSpecs(stationSpecs);
      } else {
        setPartSpecs([]);
        setAllPartSpecs([]);
      }
    } catch (err) {
      console.error('Error loading part specs:', err);
      setPartSpecs([]);
      setAllPartSpecs([]);
    }
  };

  // Load previous spec inspection results for a serial (from all stations)
  const loadPreviousSpecResults = async (serial, partId) => {
    if (!serial || !partId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/spec-inspection/entries?serialNumber=${encodeURIComponent(serial)}&partId=${partId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.entries && data.entries.length > 0) {
        // Build checklistResults from previous inspections
        const previousResults = {};
        data.entries.forEach(entry => {
          // Only keep the most recent result per spec (entries are ordered DESC)
          if (!previousResults[entry.specId]) {
            previousResults[entry.specId] = {
              result: entry.result,
              measuredValue: entry.measuredValue,
              qualitativeValue: entry.qualitativeValue,
              notes: entry.notes,
              stationName: entry.stationName,
              inspectedAt: entry.createdAt
            };
          }
        });
        setChecklistResults(prev => ({ ...previousResults, ...prev }));
        console.log('Loaded previous spec results:', Object.keys(previousResults).length);
      }
    } catch (err) {
      console.error('Error loading previous spec results:', err);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Check if specs need verification before OK or Defect
  const handlePiezaOkClick = () => {
    if (!lotNumber.trim()) {
      setError('Ingresa Serial/Lote antes de marcar OK');
      return;
    }
    if (!selectedPart) {
      setError('Selecciona una parte antes de marcar OK');
      return;
    }

    // Only show warning if specs exist AND checklist not completed/skipped
    if (partSpecs.length > 0 && !checklistResults._completed && !checklistResults._skipped) {
      setPendingAction('OK');
      setSpecsWarningOpen(true);
    } else {
      handlePiezaOk();
    }
  };

  const handleAgregarDefectoClick = () => {
    if (partSpecs.length > 0 && !checklistResults._completed && !checklistResults._skipped) {
      setPendingAction('DEFECT');
      setSpecsWarningOpen(true);
    } else {
      handleSubmitDefect();
    }
  };

  const handleSkipChecklist = async () => {
    setSpecsWarningOpen(false);
    const userName = currentUser?.firstName || currentUser?.username || 'Usuario';

    // Mark as skipped in local state (prevents showing warning again)
    setChecklistResults(prev => ({
      ...prev,
      _skipped: true,
      // Also mark each spec as SKIPPED locally
      ...partSpecs.reduce((acc, spec) => {
        acc[spec.id] = { result: 'SKIPPED', stationName: selectedStation?.name };
        return acc;
      }, {})
    }));

    // Register skip in spec_inspection_entries with SKIPPED result
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/spec-inspection/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serialNumber: lotNumber,
          clientId: selectedClient?.id,
          projectId: selectedProject?.id,
          partId: selectedPart?.id,
          stationId: selectedStation?.id,
          shiftId: selectedShift?.id,
          entries: partSpecs.map(spec => ({
            specId: spec.id,
            result: 'SKIPPED',
            notes: `Checklist omitido por ${userName}`
          }))
        })
      });
    } catch (err) {
      console.error('Error registering skip:', err);
    }

    // Proceed with original action
    if (pendingAction === 'OK') {
      handlePiezaOk();
    } else if (pendingAction === 'DEFECT') {
      handleSubmitDefect();
    }
    setPendingAction(null);
  };

  const handleOpenChecklist = () => {
    setSpecsWarningOpen(false);
    // Don't reset checklistResults - preserve previously loaded results from other stations
    setSpecsChecklistOpen(true);
  };

  const handleChecklistResult = (specId, result, value = null) => {
    setChecklistResults(prev => ({
      ...prev,
      [specId]: {
        ...prev[specId],
        result,
        measuredValue: value,
        stationName: selectedStation?.name || prev[specId]?.stationName
      }
    }));
  };

  const handleChecklistNotes = (specId, notes) => {
    setChecklistResults(prev => ({
      ...prev,
      [specId]: {
        ...prev[specId],
        notes
      }
    }));
  };

  // Handle cancel with warning
  const handleChecklistCancel = () => {
    setOmitWarningOpen(true);
  };

  // Confirm omit checklist
  const handleConfirmOmit = () => {
    setOmitWarningOpen(false);
    setSpecsChecklistOpen(false);
    setChecklistDismissed(true);
    setChecklistResults(prev => ({ ...prev, _skipped: true }));
  };

  // Cancel omit - go back to checklist
  const handleCancelOmit = () => {
    setOmitWarningOpen(false);
  };

  // Handle QAR alert - emit QAR
  const handleEmitQar = () => {
    if (!qarAlertData) return;
    setQarAlertOpen(false);
    navigate('/qar-create', {
      state: {
        clientId: qarAlertData.clientId,
        clientName: qarAlertData.clientName,
        projectId: qarAlertData.projectId,
        partId: qarAlertData.partId,
        partName: qarAlertData.partName,
        severityId: qarAlertData.severityId,
        severityName: qarAlertData.severityName,
        severityColor: qarAlertData.severityColor,
        departmentId: qarAlertData.departmentId,
        departmentName: qarAlertData.departmentName,
        defectCount: qarAlertData.defectCount,
        thresholdCount: qarAlertData.thresholdCount,
        thresholdHours: qarAlertData.thresholdHours,
        defects: qarAlertData.defects,
        defectIds: qarAlertData.defects.map(d => d.id),
        emittedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Usuario',
        firstDefectImagePath: qarAlertData.firstDefectImagePath
      }
    });
  };

  // Handle QAR alert - decline
  const handleDeclineQar = async () => {
    if (!qarAlertData) return;
    setQarAlertOpen(false);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/qar/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          partId: qarAlertData.partId,
          severityId: qarAlertData.severityId,
          departmentId: qarAlertData.departmentId,
          defectCount: qarAlertData.defectCount,
          thresholdCount: qarAlertData.thresholdCount,
          thresholdHours: qarAlertData.thresholdHours,
          defectIds: qarAlertData.defects.map(d => d.id)
        })
      });
    } catch (declineErr) {
      console.error('Error logging declined QAR:', declineErr);
    }
    setQarAlertData(null);
  };

  const handleChecklistSubmit = async () => {
    // Count specs with results
    const specsWithResults = Object.keys(checklistResults).filter(k => k !== '_completed' && checklistResults[k]?.result);
    const pendingSpecs = partSpecs.length - specsWithResults.length;

    // Warn if there are pending specs but allow to continue
    if (pendingSpecs > 0) {
      const confirmSave = window.confirm(
        `Hay ${pendingSpecs} especificación(es) sin evaluar. Se guardarán como "SIN EVALUACIÓN".\n\n¿Desea continuar?`
      );
      if (!confirmSave) return;
    }

    setChecklistSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Build entries array - items without result get 'NOT_EVALUATED'
      const entries = partSpecs.map(spec => {
        const result = checklistResults[spec.id];
        return {
          specId: spec.id,
          result: result?.result || 'NOT_EVALUATED',
          measuredValue: result?.measuredValue || null,
          qualitativeValue: result?.qualitativeValue || null,
          notes: result?.notes || (result?.result ? null : 'Sin evaluación')
        };
      });

      // Save bulk entries
      const saveRes = await fetch(`${API_URL}/spec-inspection/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serialNumber: lotNumber,
          clientId: selectedClient?.id,
          projectId: selectedProject?.id,
          partId: selectedPart?.id,
          stationId: selectedStation?.id,
          shiftId: selectedShift?.id,
          entries
        })
      });

      const saveData = await saveRes.json();

      // Get NOK entries to auto-create defects
      const nokEntries = entries.filter(e => e.result === 'NOK');
      console.log('[Checklist] Entries:', entries);
      console.log('[Checklist] NOK entries:', nokEntries);

      if (nokEntries.length > 0) {
        // Auto-create defects for each NOK spec
        for (const nokEntry of nokEntries) {
          const spec = partSpecs.find(s => s.id === nokEntry.specId);
          console.log('[Checklist] Processing NOK spec:', nokEntry.specId, 'Found spec:', spec);
          if (!spec) continue;

          // Build defect comment with spec info and user notes
          let defectComment = `Spec ${spec.specNumber} - ${spec.specName}: NOK`;
          if (nokEntry.measuredValue !== null) {
            defectComment += ` (Medido: ${nokEntry.measuredValue}`;
            if (spec.lowerLimit !== null && spec.upperLimit !== null) {
              defectComment += `, Límites: ${spec.lowerLimit} - ${spec.upperLimit}`;
            }
            defectComment += ')';
          }
          // Add user notes if provided
          if (nokEntry.notes) {
            defectComment += ` - ${nokEntry.notes}`;
          }

          // Create defect via API
          const defectPayload = {
            partId: selectedPart?.id,
            specId: spec.id,
            stationId: selectedStation?.id,
            shiftId: selectedShift?.id,
            inspectorId: selectedInspector?.id || currentUser?.id,
            lotNumber: lotNumber,
            notes: defectComment,
            measuredValue: nokEntry.measuredValue
          };
          console.log('[Checklist] Creating defect with payload:', defectPayload);

          try {
            const defectRes = await fetch(`${API_URL}/defects-v2/from-spec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(defectPayload)
            });
            const defectData = await defectRes.json();
            console.log('[Checklist] Defect creation response:', defectData);
            if (!defectData.success) {
              console.error('[Checklist] Failed to create defect:', defectData.message);
            }
          } catch (defectErr) {
            console.error('[Checklist] Error creating defect:', defectErr);
          }
        }

        setNgCount(prev => prev + nokEntries.length);
        showSuccessMessage(`Checklist completado. ${nokEntries.length} defecto(s) auto-registrado(s)`);

        // Check for critical NOK specs - trigger QAR alert
        const criticalNoks = nokEntries.filter(e => {
          const spec = partSpecs.find(s => s.id === e.specId);
          return spec?.isCritical;
        });

        if (criticalNoks.length > 0) {
          const criticalSpecs = criticalNoks.map(e => {
            const spec = partSpecs.find(s => s.id === e.specId);
            return spec?.specName || 'Spec';
          });

          // Build QAR alert data for critical specs
          // Get default department from first critical spec or fallback to Calidad (id=2)
          const firstCriticalSpec = partSpecs.find(s => s.id === criticalNoks[0].specId);
          const defaultDeptId = firstCriticalSpec?.defaultDepartmentId || selectedDepartment?.id || 2;
          const defaultDeptName = selectedDepartment?.name || 'Calidad';

          setQarAlertData({
            message: `⚠️ ${criticalNoks.length} especificación(es) CRÍTICA(S) marcada(s) como NOK`,
            triggered: true,
            clientId: selectedClient?.id,
            clientName: selectedClient?.name,
            projectId: selectedProject?.id,
            partId: selectedPart?.id,
            partName: selectedPart?.captureDisplayName || selectedPart?.partNumber,
            severityId: 3, // CRITICAL severity
            severityName: 'Crítico',
            severityColor: '#991b1b',
            departmentId: defaultDeptId,
            departmentName: defaultDeptName,
            defectCount: criticalNoks.length,
            thresholdCount: 1,
            thresholdHours: 0,
            defects: criticalNoks.map(e => ({
              id: e.specId,
              specName: partSpecs.find(s => s.id === e.specId)?.specName
            })),
            criticalSpecs: criticalSpecs,
            isCriticalSpec: true
          });
          setQarAlertOpen(true);
        }
      } else {
        showSuccessMessage('Checklist completado - Todo OK');
      }

      // Release defects for specs now marked as OK (re-verified)
      const okEntries = entries.filter(e => e.result === 'OK');
      if (okEntries.length > 0) {
        for (const okEntry of okEntries) {
          try {
            const releaseRes = await fetch(`${API_URL}/defects-v2/release-by-spec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                partId: selectedPart?.id,
                specId: okEntry.specId,
                serialNumber: lotNumber,
                notes: okEntry.notes || 'Re-verificado como OK'
              })
            });
            const releaseData = await releaseRes.json();
            if (releaseData.released) {
              console.log('[Checklist] Defect released:', releaseData.defect?.entryNumber);
            }
          } catch (releaseErr) {
            console.error('[Checklist] Error releasing defect:', releaseErr);
          }
        }
      }

      // Mark checklist as completed
      setChecklistResults(prev => ({ ...prev, _completed: true }));
      setSpecsChecklistOpen(false);

      // NO auto-mark OK - user must decide to press "PIEZA OK" or add more defects
      setPendingAction(null);
    } catch (err) {
      console.error('Error saving checklist:', err);
      setError('Error al guardar checklist: ' + err.message);
    } finally {
      setChecklistSaving(false);
    }
  };

  const handlePiezaOk = useCallback(async () => {
    if (!selectedPart || !lotNumber.trim()) {
      setError('Selecciona parte y serial antes de marcar OK');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Si hay specs, registrar todas como OK
      if (partSpecs.length > 0) {
        const res = await fetch(`${API_URL}/spec-inspection/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            serialNumber: lotNumber.trim(),
            lotNumber: lotNumber.trim(),
            clientId: selectedClient?.id,
            projectId: selectedProject?.id,
            partId: selectedPart?.id,
            stationId: selectedStation?.id,
            shiftId: selectedShift?.id,
            entries: partSpecs.map(spec => ({
              specId: spec.id,
              result: 'OK',
              notes: 'Pieza OK - inspección completa'
            }))
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al registrar inspección OK');
        }
      } else {
        // Sin specs, crear unit_registry directamente via endpoint
        const res = await fetch(`${API_URL}/unit-registry/capture-ok`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            serialNumber: lotNumber.trim(),
            clientId: selectedClient?.id,
            partId: selectedPart?.id,
            projectId: selectedProject?.id,
            stationId: selectedStation?.id,
            shiftId: selectedShift?.id
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al registrar pieza OK');
        }
      }

      setOkCount(prev => prev + 1);
      setLotNumber('');
      setProductionInfo(null);
      showSuccessMessage('Pieza OK registrada');
    } catch (err) {
      console.error('Error en Pieza OK:', err);
      setError(err.message || 'Error al registrar pieza OK');
    }
  }, [lotNumber, selectedPart, selectedClient, selectedProject, selectedStation, selectedShift, partSpecs]);

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
      // Construir query params para registrar scan (acta de nacimiento digital)
      const params = new URLSearchParams();
      if (selectedStation?.id) params.append('stationId', selectedStation.id);
      if (selectedShift?.id) params.append('shiftId', selectedShift.id);
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`${API_URL}/defects-v2/serial-lookup/${encodeURIComponent(serial.trim())}${queryString}`, {
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

          // Check if serial is released - show modal and block
          if (data.isReleased) {
            setSerialReleased(true);
            setReleaseInfo({
              serial: serial,
              partNumber: data.unit.partNumber,
              partName: data.unit.partName,
              clientName: data.unit.clientName,
              releasedAt: data.releaseInfo?.releasedAt,
              releasedBy: data.releaseInfo?.releasedBy,
              message: data.releasedMessage
            });
            setReleaseModalOpen(true);
            return; // Don't auto-fill anything for released serials
          } else {
            setSerialReleased(false);
            setReleaseInfo(null);
          }

          // Capturar info de producción si existe
          if (data.productionInfo) {
            setProductionInfo(data.productionInfo);
          } else {
            setProductionInfo(null);
          }

          // Capturar defectos del serial
          if (data.serialDefects) {
            setSerialDefects(data.serialDefects);
          } else {
            setSerialDefects([]);
          }
          if (data.defectCounts) {
            setDefectCounts(data.defectCounts);
          } else {
            setDefectCounts({ open: 0, repaired: 0, released: 0, total: 0 });
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
  }, [clients, allParts, projects, selectedClient, selectedStation, selectedShift]);

  // Reset hasRegisteredDefect when user enters lot number
  const handleLotChange = (value) => {
    setLotNumber(value);
    if (value.trim()) {
      setHasRegisteredDefect(false);
      setSerialScrapped(false); // Reset scrapped state when serial changes
      setSerialReleased(false); // Reset released state when serial changes
      setIsReprocessMode(false); // Reset reprocess mode when serial changes
      setProductionInfo(null); // Reset production info
      setSerialDefects([]); // Reset serial defects
      setDefectCounts({ open: 0, repaired: 0, released: 0, total: 0 });
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

  // Close release modal and clear serial
  const handleCloseReleaseModal = () => {
    setReleaseModalOpen(false);
    setLotNumber('');
    setSerialReleased(false);
    setReleaseInfo(null);
    setIsReprocessMode(false);
  };

  // Confirm reprocess - reopen unit and allow defect capture
  const handleConfirmReprocess = async () => {
    if (!releaseInfo?.serial || !selectedClient?.id) return;

    const token = localStorage.getItem('token');
    setReprocessLoading(true);
    try {
      const res = await fetch(`${API_URL}/defects-v2/reopen-for-reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serialNumber: releaseInfo.serial,
          clientId: selectedClient.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsReprocessMode(true);
        setReleaseModalOpen(false);
        setSerialReleased(false);
        setSuccess(`Unidad reabierta para reproceso (Ciclo ${data.cycleNumber})`);
        // Continuar con el flujo normal - los datos ya están cargados
      } else {
        setError(data.message || 'Error al reabrir unidad');
      }
    } catch (err) {
      console.error('Error confirming reprocess:', err);
      setError('Error de conexión al reabrir unidad');
    } finally {
      setReprocessLoading(false);
    }
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
      setSerialConfirmed(true); // Mark serial as confirmed for checklist auto-open
      lookupSerialInfo(lotNumber);
    }
  };

  // ============================================================================
  // INLINE REPAIR/RELEASE HANDLERS
  // ============================================================================
  const handleDefectClick = (defect) => {
    setSelectedDefectForDetail(defect);
    setDefectDetailModalOpen(true);
  };

  const handleInlineRepair = async (defectId, data) => {
    try {
      const stationIdToUse = data.repairStationId || selectedStation?.id;
      const result = await repairService.repairInline(defectId, {
        ...data,
        repairStationId: stationIdToUse
      });
      if (result.success) {
        // Recargar defectos del serial
        await lookupSerialInfo(lotNumber);
        setSuccess('Defecto marcado como reparado');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.message || 'Error al reparar');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleInlineRelease = async (defectId, data) => {
    try {
      const result = await repairService.releaseInline(defectId, {
        ...data,
        releaseStationId: selectedStation?.id
      });
      if (result.success) {
        // Recargar defectos del serial
        await lookupSerialInfo(lotNumber);
        setSuccess('Defecto liberado');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.message || 'Error al liberar');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleInlineReject = async (defectId, data) => {
    try {
      const result = await repairService.rejectInline(defectId, {
        ...data
      });
      if (result.success) {
        // Recargar defectos del serial
        await lookupSerialInfo(lotNumber);
        setSuccess('Defecto rechazado - vuelve a OPEN');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.message || 'Error al rechazar');
      }
    } catch (err) {
      throw err;
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
        quantity: 1,
        workOrder: productionInfo?.workOrder || null,
        isReprocess: isReprocessMode
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
            // Show QAR alert modal
            setQarAlertData({
              ...thresholdData,
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              projectId: selectedProject.id,
              partId: selectedPart.id,
              partName: selectedPart.captureDisplayName || selectedPart.partNumber,
              severityId: selectedSeverity.id,
              departmentId: selectedDepartment.id
            });
            setQarAlertOpen(true);
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

  const getMissingFields = () => {
    const missing = [];
    if (!selectedStation) missing.push('Estación');
    if (!selectedInspector) missing.push('Inspector');
    if (!selectedShift) missing.push('Turno');
    if (!selectedClient) missing.push('Cliente');
    if (!selectedProject) missing.push('Proyecto');
    if (!selectedPart) missing.push('Parte');
    if (!selectedDepartment) missing.push('Departamento');
    if (!selectedDefect) missing.push('Defecto');
    if (!lotNumber.trim()) missing.push('Lote/Serie');
    if (serialScrapped) missing.push('Serial en SCRAP');
    return missing;
  };

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
      fontWeight: '600'
    },
    counterOk: {
      backgroundColor: '#d1fae5',
      color: '#2E7D32'
    },
    counterNg: {
      backgroundColor: t.errorBg,
      color: t.error
    },
    piezaOkButton: {
      padding: '12px 24px',
      backgroundColor: '#2E7D32',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
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
    // Right panel (75%) - scrollable container
    rightPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflow: 'hidden',
      position: 'relative'
    },
    // Defects grid (scrollable area)
    defectsGrid: {
      flex: 1,
      backgroundColor: t.bgPanel,
      borderRadius: '12px 12px 0 0',
      padding: '16px',
      paddingBottom: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0
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
    // Preview + Submit (fixed at bottom of right panel)
    previewSubmit: {
      backgroundColor: t.bgPanel,
      borderRadius: '0 0 12px 12px',
      padding: '16px',
      paddingTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderTop: `1px solid ${t.border}`,
      flexShrink: 0
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
      fontWeight: '600',
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
      backgroundColor: t.errorBg,
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
      border: `2px solid ${t.error}`
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
      fontFamily: "'IBM Plex Mono', monospace"
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
      backgroundColor: t.errorBg,
      color: t.error
    },
    specButtonSelected: {
      transform: 'scale(1.02)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    },
    criticalBadge: {
      backgroundColor: '#fecaca',
      color: t.error,
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600'
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
          backgroundColor: t.warningBg,
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
          <span style={{ color: t.warning, fontWeight: '600' }}>
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
          <button style={styles.piezaOkButton} onClick={handlePiezaOkClick}>
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
            {/* Resumen de defectos del serial con semáforo */}
            {lotNumber && (
              <div style={{ marginTop: '8px' }}>
                <SerialDefectsSummary
                  counts={defectCounts}
                  onClick={() => setDefectsListModalOpen(true)}
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
              <>
              {/* Category Buttons Row */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${t.border}`
              }}>
                {defectsByCategory.map(category => {
                  const isSelected = selectedCategory === category.categoryId;
                  const defectCount = category.defects.filter(d =>
                    !defectFilter ||
                    d.name.toLowerCase().includes(defectFilter.toLowerCase()) ||
                    (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase()))
                  ).length;

                  if (defectCount === 0 && defectFilter) return null;

                  return (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => handleCategorySelect(category.categoryId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        backgroundColor: isSelected
                          ? (category.categoryColor || t.accent)
                          : t.bgInput,
                        border: `2px solid ${category.categoryColor || t.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '3px',
                        backgroundColor: isSelected ? 'white' : (category.categoryColor || '#6b7280')
                      }} />
                      <span style={{
                        color: isSelected ? 'white' : t.text,
                        fontSize: '13px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {category.categoryName}
                      </span>
                      <span style={{
                        color: isSelected ? 'rgba(255,255,255,0.8)' : t.textMuted,
                        fontSize: '11px',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : t.bgCard,
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontWeight: '500'
                      }}>
                        {defectCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Defects Grid */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {!selectedCategory ? (
                  <div style={{
                    color: t.textMuted,
                    textAlign: 'center',
                    padding: '40px 20px',
                    fontSize: '14px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ChevronUp size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    Selecciona una categoría para ver los defectos
                  </div>
                ) : (() => {
                  const filteredDefects = selectedCategoryDefects.filter(d =>
                    !defectFilter ||
                    d.name.toLowerCase().includes(defectFilter.toLowerCase()) ||
                    (d.code && d.code.toLowerCase().includes(defectFilter.toLowerCase()))
                  );
                  const totalPages = Math.ceil(filteredDefects.length / DEFECTS_PER_PAGE);
                  const paginatedDefects = getPaginatedDefects(filteredDefects);

                  return (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gridTemplateRows: 'repeat(4, 1fr)',
                        gap: '8px',
                        flex: 1,
                        padding: '4px'
                      }}>
                        {paginatedDefects.map(defect => (
                          <button
                            key={defect.id}
                            type="button"
                            style={{
                              padding: '10px 8px',
                              borderRadius: '8px',
                              border: `2px solid ${selectedDefect?.id === defect.id ? t.accent : (defect.color || t.border)}`,
                              backgroundColor: selectedDefect?.id === defect.id ? t.accent : t.bgInput,
                              color: selectedDefect?.id === defect.id ? 'white' : t.text,
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              transition: 'all 0.15s',
                              minHeight: '60px'
                            }}
                            onClick={() => setSelectedDefect(selectedDefect?.id === defect.id ? null : defect)}
                            title={`${defect.code || ''} ${defect.name}`}
                          >
                            {defect.code && <span style={{ fontSize: '10px', opacity: 0.7 }}>{defect.code}</span>}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{defect.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 0',
                          borderTop: `1px solid ${t.border}`,
                          marginTop: '8px'
                        }}>
                          <button
                            type="button"
                            onClick={() => setDefectsPage(p => Math.max(1, p - 1))}
                            disabled={defectsPage === 1}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: defectsPage === 1 ? t.bgInput : t.accent,
                              color: defectsPage === 1 ? t.textMuted : 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: defectsPage === 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          >
                            <ChevronLeft size={16} /> Anterior
                          </button>

                          <span style={{
                            color: t.text,
                            fontSize: '13px',
                            padding: '0 12px',
                            fontWeight: '500'
                          }}>
                            {defectsPage} / {totalPages}
                          </span>

                          <button
                            type="button"
                            onClick={() => setDefectsPage(p => Math.min(totalPages, p + 1))}
                            disabled={defectsPage === totalPages}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: defectsPage === totalPages ? t.bgInput : t.accent,
                              color: defectsPage === totalPages ? t.textMuted : 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: defectsPage === totalPages ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          >
                            Siguiente <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              </>
            )}
          </div>

          {/* Submit Section (compact) */}
          <div style={styles.previewSubmit}>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
              style={{ display: 'none' }}
            />

            {/* Row: Attachments + Submit Button */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
              {/* Attachment button (compact) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '12px 16px',
                  backgroundColor: t.bgInput,
                  border: `1px dashed ${t.border}`,
                  borderRadius: '8px',
                  color: pendingAttachments.length > 0 ? t.accent : t.textMuted,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: pendingAttachments.length > 0 ? '600' : '400',
                  flexShrink: 0
                }}
              >
                <Paperclip size={18} />
                {pendingAttachments.length > 0 && (
                  <span style={{
                    backgroundColor: t.accent,
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}>
                    {pendingAttachments.length}
                  </span>
                )}
              </button>

              {/* Main Submit Button with Preview */}
              <button
                style={{
                  ...styles.submitButton,
                  flex: 1,
                  flexDirection: 'column',
                  padding: '12px 20px',
                  ...((!isFormValid || submitting) ? styles.submitButtonDisabled : {})
                }}
                onClick={handleAgregarDefectoClick}
                disabled={!isFormValid || submitting}
              >
                {/* Preview line (small) */}
                {selectedDefect && (
                  <span style={{
                    fontSize: '11px',
                    opacity: 0.85,
                    marginBottom: '4px',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {defectPreview}
                  </span>
                )}
                {/* Main button text */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600' }}>
                  <Plus size={20} />
                  {submitting ? 'GUARDANDO...' : 'AGREGAR DEFECTO'}
                </span>
              </button>
            </div>

            {/* Missing fields message */}
            {!isFormValid && !submitting && getMissingFields().length > 0 && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: t.bgPanel,
                border: `1px solid ${t.textMuted}`,
                borderRadius: '6px',
                fontSize: '13px',
                color: t.textDim
              }}>
                <strong>Falta:</strong> {getMissingFields().join(', ')}
              </div>
            )}

            {/* Attached files preview (inline, compact) */}
            {pendingAttachments.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '6px',
                marginTop: '8px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}>
                {pendingAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '40px',
                      height: '40px',
                      backgroundColor: t.bgCard,
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: `1px solid ${t.border}`,
                      flexShrink: 0
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
                        justifyContent: 'center',
                        height: '100%',
                        color: t.textMuted
                      }}>
                        <FileText size={16} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{
                        position: 'absolute',
                        top: '1px',
                        right: '1px',
                        width: '14px',
                        height: '14px',
                        padding: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          backgroundColor: 'rgba(0,0,0,0.4)',
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: `2px solid ${t.error}`
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
                backgroundColor: t.errorBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={28} color={t.error} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: t.error, fontSize: '18px', fontWeight: '600' }}>
                  Serial en Scrap
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
              Este serial ya fue enviado a <strong style={{ color: t.error }}>SCRAP</strong> y no puede recibir nuevos defectos.
            </p>

            <button
              onClick={handleCloseScrapModal}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: t.error,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Serial Liberado */}
      {releaseModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: `2px solid ${t.accent}`
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
                backgroundColor: t.accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={28} color={t.accent} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: t.accent, fontSize: '18px', fontWeight: '600' }}>
                  Serial Ya Liberado
                </h3>
                <p style={{ margin: '4px 0 0 0', color: currentTheme.textMuted, fontSize: '13px' }}>
                  ¿Es un reproceso?
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
                  {releaseInfo?.serial}
                </div>
              </div>
              {releaseInfo?.partNumber && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Parte:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {releaseInfo.partNumber} - {releaseInfo.partName}
                  </div>
                </div>
              )}
              {releaseInfo?.clientName && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Cliente:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {releaseInfo.clientName}
                  </div>
                </div>
              )}
              {releaseInfo?.releasedAt && (
                <div>
                  <span style={{ color: currentTheme.textMuted, fontSize: '12px' }}>Liberado:</span>
                  <div style={{ color: currentTheme.text, fontWeight: '500' }}>
                    {new Date(releaseInfo.releasedAt).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {releaseInfo.releasedBy && (
                      <span style={{ color: currentTheme.textMuted, fontWeight: '400', marginLeft: '8px' }}>
                        por {releaseInfo.releasedBy}
                      </span>
                    )}
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
              Este serial ya fue <strong style={{ color: t.accent }}>LIBERADO</strong>. Si es un reproceso, los nuevos defectos se marcarán como <strong style={{ color: t.textMuted }}>reproceso</strong>.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCloseReleaseModal}
                disabled={reprocessLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: reprocessLoading ? 'not-allowed' : 'pointer'
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmReprocess}
                disabled={reprocessLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: reprocessLoading ? 'not-allowed' : 'pointer',
                  opacity: reprocessLoading ? 0.7 : 1
                }}
              >
                {reprocessLoading ? 'Procesando...' : 'Confirmar Reproceso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lista de Defectos (Etapa 1) */}
      <DefectsListModal
        isOpen={defectsListModalOpen}
        onClose={() => setDefectsListModalOpen(false)}
        defects={serialDefects}
        counts={defectCounts}
        serialNumber={lotNumber}
        onDefectClick={(defect) => {
          setDefectsListModalOpen(false);
          handleDefectClick(defect);
        }}
        theme={currentTheme}
      />

      {/* Modal Detalle Defecto (Etapa 2) */}
      <InlineDefectDetailModal
        isOpen={defectDetailModalOpen}
        onClose={() => {
          setDefectDetailModalOpen(false);
          setSelectedDefectForDetail(null);
        }}
        defect={selectedDefectForDetail}
        permissions={hospitalPermissions}
        stationId={selectedStation?.id}
        stationName={selectedStation?.name}
        onRepair={handleInlineRepair}
        onRelease={handleInlineRelease}
        onReject={handleInlineReject}
        theme={currentTheme}
      />

      {/* Modal Warning - Specs Checklist */}
      {specsWarningOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={28} style={{ color: t.accent }} />
              <h3 style={{ margin: 0, color: t.text, fontSize: '18px' }}>
                Verificación de Especificaciones
              </h3>
            </div>

            <p style={{ color: t.textMuted, lineHeight: '1.6', margin: '0 0 8px 0' }}>
              Esta parte tiene <strong style={{ color: t.text }}>{partSpecs.length} especificaciones</strong> configuradas para verificar.
            </p>
            <p style={{ color: t.textMuted, lineHeight: '1.6', margin: '0 0 20px 0', fontSize: '13px' }}>
              Serial: <strong style={{ color: t.text }}>{lotNumber}</strong>
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSkipChecklist}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Omitir
              </button>
              <button
                onClick={handleOpenChecklist}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Checklist de Especificaciones - Dos Columnas */}
      {specsChecklistOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: t.textDim,
              borderRadius: '12px 12px 0 0'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '18px', fontWeight: '600' }}>
                  Hoja de Especificaciones
                </h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                  Serial: <strong>{lotNumber}</strong> | Parte: <strong>{selectedPart?.partNumber || selectedPart?.captureDisplayName}</strong> | Estación: <strong>{selectedStation?.name}</strong>
                </p>
              </div>
              <button
                onClick={handleChecklistCancel}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: 'white',
                  borderRadius: '6px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Two Column Layout */}
            <div style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden'
            }}>
              {/* LEFT COLUMN - Current Station Specs to Evaluate */}
              <div style={{
                flex: '1 1 60%',
                borderRight: `1px solid ${t.border}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: t.bgPanel,
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '600', color: t.text, fontSize: '14px' }}>
                    Evaluar en {selectedStation?.name || 'Esta Estación'}
                  </span>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>
                    {partSpecs.length} specs
                  </span>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px'
                }}>
                  {partSpecs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                      <CheckCircle size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>No hay specs pendientes en esta estación</p>
                    </div>
                  ) : (
                    partSpecs.map((spec) => {
                      const result = checklistResults[spec.id];
                      const isDimensional = spec.specType === 'DIMENSIONAL';
                      const isQualitative = spec.specType === 'QUALITATIVE';
                      const isFromOtherStation = result?.stationName && result.stationName !== selectedStation?.name;

                      return (
                        <div
                          key={spec.id}
                          style={{
                            padding: '14px',
                            marginBottom: '10px',
                            backgroundColor: isFromOtherStation ? t.bg : t.bgPanel,
                            borderRadius: '8px',
                            border: `2px solid ${
                              result?.result === 'OK' ? t.success :
                              result?.result === 'NOK' ? t.error :
                              result?.result === 'SKIPPED' ? t.warning : t.border
                            }`,
                            opacity: isFromOtherStation ? 0.7 : 1
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                  backgroundColor: t.bgCard,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  color: t.textMuted
                                }}>
                                  {spec.specNumber}
                                </span>
                                {spec.isCritical && (
                                  <span style={{
                                    backgroundColor: t.errorBg,
                                    color: t.error,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '600'
                                  }}>
                                    CRÍTICO
                                  </span>
                                )}
                                {isFromOtherStation && (
                                  <span style={{
                                    backgroundColor: t.accentBg,
                                    color: t.accent,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '500'
                                  }}>
                                    Ya evaluado en {result.stationName}
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: 0, color: t.text, fontWeight: '500', fontSize: '14px' }}>
                                {spec.specName}
                              </p>
                              {isDimensional && (
                                <p style={{ margin: '4px 0 0 0', color: t.textMuted, fontSize: '12px' }}>
                                  {spec.lowerLimit} - <strong>{spec.nominalValue}</strong> - {spec.upperLimit} {spec.unitSymbol || ''}
                                </p>
                              )}
                              {isQualitative && spec.acceptableValues && (
                                <p style={{ margin: '4px 0 0 0', color: t.textMuted, fontSize: '12px' }}>
                                  Valores: {spec.acceptableValues}
                                </p>
                              )}
                            </div>

                            {/* OK/NOK/Skip Buttons */}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleChecklistResult(spec.id, 'OK')}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: result?.result === 'OK' ? t.success : t.bgCard,
                                  color: result?.result === 'OK' ? 'white' : t.success,
                                  border: `2px solid ${t.success}`,
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '13px'
                                }}
                              >
                                <CheckCircle size={14} />
                                OK
                              </button>
                              <button
                                onClick={() => handleChecklistResult(spec.id, 'NOK')}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: result?.result === 'NOK' ? t.error : t.bgCard,
                                  color: result?.result === 'NOK' ? 'white' : t.error,
                                  border: `2px solid ${t.error}`,
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '13px'
                                }}
                              >
                                <XCircle size={14} />
                                NOK
                              </button>
                              <button
                                onClick={() => handleChecklistResult(spec.id, 'SKIPPED')}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: result?.result === 'SKIPPED' ? t.warning : t.bgCard,
                                  color: result?.result === 'SKIPPED' ? 'white' : t.warning,
                                  border: `2px solid ${t.warning}`,
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                                title="Omitir esta spec"
                              >
                                N/A
                              </button>
                            </div>
                          </div>

                          {/* Measured Value Input */}
                          {isDimensional && (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '12px', color: t.textMuted }}>Medido:</label>
                              <input
                                type="number"
                                step="any"
                                value={result?.measuredValue || ''}
                                onChange={(e) => handleChecklistResult(spec.id, result?.result || null, e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder={spec.nominalValue || '0.00'}
                                style={{
                                  width: '120px',
                                  padding: '6px 10px',
                                  backgroundColor: t.bgCard,
                                  color: t.text,
                                  border: `1px solid ${t.border}`,
                                  borderRadius: '6px',
                                  fontSize: '13px'
                                }}
                              />
                              <span style={{ color: t.textMuted, fontSize: '12px' }}>{spec.unitSymbol || ''}</span>
                            </div>
                          )}

                          {/* Notes Input - Shows for NOK or SKIPPED */}
                          {(result?.result === 'NOK' || result?.result === 'SKIPPED') && (
                            <div style={{ marginTop: '10px' }}>
                              <input
                                type="text"
                                value={result?.notes || ''}
                                onChange={(e) => handleChecklistNotes(spec.id, e.target.value)}
                                placeholder={result?.result === 'NOK' ? '¿Por qué NOK? (opcional)' : '¿Por qué N/A? (opcional)'}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  backgroundColor: t.bgCard,
                                  color: t.text,
                                  border: `1px solid ${result?.result === 'NOK' ? t.error : t.warning}`,
                                  borderRadius: '6px',
                                  fontSize: '13px'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN - Complete Spec Summary */}
              <div style={{
                flex: '1 1 40%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: t.bg
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: t.bgPanel,
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '600', color: t.text, fontSize: '14px' }}>
                    Resumen Completo
                  </span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: t.success, fontWeight: '600' }}>
                      OK: {Object.values(checklistResults).filter(r => r?.result === 'OK').length}
                    </span>
                    <span style={{ color: t.error, fontWeight: '600' }}>
                      NOK: {Object.values(checklistResults).filter(r => r?.result === 'NOK').length}
                    </span>
                    <span style={{ color: t.textMuted }}>
                      Pend: {allPartSpecs.length - Object.keys(checklistResults).filter(k => k !== '_completed' && k !== '_skipped' && checklistResults[k]?.result).length}
                    </span>
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '8px'
                }}>
                  {allPartSpecs.map((spec) => {
                    const result = checklistResults[spec.id];
                    const stationNames = spec.stations?.map(s => s.name).join(', ') || '-';

                    return (
                      <div
                        key={spec.id}
                        style={{
                          padding: '10px 12px',
                          marginBottom: '6px',
                          backgroundColor: t.bgCard,
                          borderRadius: '6px',
                          borderLeft: `4px solid ${
                            result?.result === 'OK' ? t.success :
                            result?.result === 'NOK' ? t.error : t.textDim
                          }`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                              {spec.specNumber}
                            </span>
                            {spec.isCritical && (
                              <span style={{ fontSize: '9px', color: t.error, fontWeight: '600' }}>●</span>
                            )}
                          </div>
                          <p style={{
                            margin: 0,
                            color: t.text,
                            fontSize: '12px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {spec.specName}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: t.textMuted }}>
                            {stationNames}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {result?.result ? (
                            <>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                backgroundColor: result.result === 'OK' ? t.successBg :
                                                 result.result === 'SKIPPED' ? t.warningBg : t.errorBg,
                                color: result.result === 'OK' ? t.success :
                                       result.result === 'SKIPPED' ? t.warning : t.error
                              }}>
                                {result.result === 'SKIPPED' ? 'Omitido' : result.result}
                              </span>
                              {result.stationName && (
                                <p style={{ margin: '3px 0 0 0', fontSize: '9px', color: t.textMuted }}>
                                  {result.stationName}
                                </p>
                              )}
                            </>
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: t.bgPanel,
                              color: t.textMuted
                            }}>
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${t.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: t.bgPanel
            }}>
              <div style={{ color: t.textMuted, fontSize: '13px' }}>
                <strong>Esta estación:</strong>{' '}
                <span style={{ color: t.success }}>
                  {partSpecs.filter(s => checklistResults[s.id]?.result === 'OK').length} OK
                </span>
                {' | '}
                <span style={{ color: t.error }}>
                  {partSpecs.filter(s => checklistResults[s.id]?.result === 'NOK').length} NOK
                </span>
                {' | '}
                <span style={{ color: t.warning }}>
                  {partSpecs.filter(s => checklistResults[s.id]?.result === 'SKIPPED').length} N/A
                </span>
                {' | '}
                {partSpecs.length - partSpecs.filter(s => checklistResults[s.id]?.result).length} pendientes
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleChecklistCancel}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: t.bgCard,
                    color: t.text,
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Omitir
                </button>
                <button
                  onClick={handleChecklistSubmit}
                  disabled={checklistSaving || partSpecs.filter(s => checklistResults[s.id]?.result).length < partSpecs.length}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: partSpecs.filter(s => checklistResults[s.id]?.result).length < partSpecs.length ? t.textDim : t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: partSpecs.filter(s => checklistResults[s.id]?.result).length < partSpecs.length ? 'not-allowed' : 'pointer'
                  }}
                >
                  {checklistSaving ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Warning - Omitir Evaluación */}
      {omitWarningOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: t.accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={32} style={{ color: t.accent }} />
            </div>
            <h3 style={{ color: t.text, fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Omitir Evaluación
            </h3>
            <p style={{ color: t.textMuted, fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' }}>
              {(() => {
                const specsWithResults = Object.keys(checklistResults).filter(k => k !== '_completed' && checklistResults[k]?.result);
                const pendingSpecs = partSpecs.length - specsWithResults.length;
                return pendingSpecs === partSpecs.length
                  ? 'No se evaluó ninguna especificación.'
                  : `Hay ${pendingSpecs} de ${partSpecs.length} especificación(es) sin evaluar.`;
              })()}
            </p>
            <p style={{ color: t.textMuted, fontSize: '13px', fontWeight: '500', marginBottom: '20px' }}>
              Se registrará como "OMITIDO" para este serial.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleCancelOmit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Continuar Evaluando
              </button>
              <button
                onClick={handleConfirmOmit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: t.textMuted,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - QAR Alert */}
      {qarAlertOpen && qarAlertData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: t.errorBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: `3px solid ${t.error}`
            }}>
              <AlertTriangle size={36} style={{ color: t.error }} />
            </div>
            <h3 style={{
              color: t.error,
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Alerta de Calidad
            </h3>
            <p style={{
              color: t.text,
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '16px',
              fontWeight: '500'
            }}>
              {qarAlertData.message}
            </p>

            <div style={{
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Parte:</span>
                <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{qarAlertData.partName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Severidad:</span>
                <span style={{
                  color: t.error,
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {qarAlertData.severityName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: t.textMuted, fontSize: '13px' }}>Departamento:</span>
                <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{qarAlertData.departmentName}</span>
              </div>
              {qarAlertData.isCriticalSpec ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: t.textMuted, fontSize: '13px' }}>Specs Críticos NOK:</span>
                    <span style={{ color: t.error, fontSize: '13px', fontWeight: '600' }}>
                      {qarAlertData.defectCount}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                    <span style={{ color: t.textMuted, fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      Especificaciones afectadas:
                    </span>
                    {qarAlertData.criticalSpecs?.map((specName, idx) => (
                      <div key={idx} style={{
                        color: t.error,
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        backgroundColor: t.errorBg,
                        borderRadius: '4px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {specName}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted, fontSize: '13px' }}>Defectos:</span>
                  <span style={{ color: t.error, fontSize: '13px', fontWeight: '600' }}>
                    {qarAlertData.defectCount} / {qarAlertData.thresholdCount} en {qarAlertData.thresholdHours}h
                  </span>
                </div>
              )}
            </div>

            <p style={{
              color: t.textMuted,
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              ¿Desea emitir un <strong style={{ color: t.text }}>QAR (Quality Alert Report)</strong>?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleDeclineQar}
                style={{
                  padding: '12px 24px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                No, continuar
              </button>
              <button
                onClick={handleEmitQar}
                style={{
                  padding: '12px 24px',
                  backgroundColor: t.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Emitir QAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectCapture;
