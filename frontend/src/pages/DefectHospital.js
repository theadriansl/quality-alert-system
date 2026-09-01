/**
 * DefectHospital.js
 * Página para gestión de reparación y liberación de defectos
 * "Hospital de Defectos" - donde las piezas se reparan y liberan
 *
 * Diseño: Cards agrupadas por serial con resumen de defectos
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import ActionBar from '../components/ActionBar';
// Permisos vienen del backend via hospitalRolesService
import { checkMyHospitalPermissions, cacheHospitalPermissions, getCachedHospitalPermissions } from '../services/hospitalRolesService';
import {
  getAllDefects,
  getPendingRepairs,
  getPendingReleases,
  getPendingHandoff,
  handoffDefects,
  getInRepair,
  getSerialHistory,
  getDefectEvents,
  getStationsByType,
  startRepair,
  completeRepair,
  releaseDefect,
  rejectDefect,
  quarantineDefect,
  scrapDefect,
  getRepairTypes,
  getReleaseReasons,
  getRootCauses,
  getStatusInfo,
  getTimeColor,
  lookupLocationCode,
  assignToLocation,
  getWIPByLocation,
  getLocationCodes,
  // MRB functions
  getQuarantineDefects,
  getScrappedDefects,
  returnToRepair,
  quarantineToScrap,
  releaseWithDeviation,
  confirmScrap,
  scrapToQuarantine,
  // Transfer Packages
  createTransferPackage,
  getPendingTransferPackages,
  getPendingSerials,
  getTransferPackageDetails,
  receiveTransferPackage,
  getHospitalPendingSummary,
  // MRB validation
  checkCanDispose
} from '../services/repairService';
import {
  getDeviations,
  getDeviationById,
  createDeviation,
  updateDeviation,
  uploadDeviationAttachments,
  deleteDeviationAttachment,
  DEVIATION_TYPES,
  DEVIATION_STATUS,
  getDeviationTypeColor,
  getDeviationTypeLabel,
  getDeviationStatusColor,
  getDeviationStatusLabel
} from '../services/deviationService';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Componente optimizado - estado local aislado, sincroniza SOLO en blur
const DebouncedTextarea = React.memo(({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const isFocusedRef = useRef(false);

  // Sincronizar desde padre: siempre si es reset (vacío), o si no está enfocado
  useEffect(() => {
    const newValue = value || '';
    if (newValue === '' || !isFocusedRef.current) {
      setLocalValue(newValue);
    }
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    onChange({ target: { value: localValue } });
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
});

// Componente optimizado para inputs - sincroniza SOLO en blur
const DebouncedInput = React.memo(({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const newValue = value || '';
    if (newValue === '' || !isFocusedRef.current) {
      setLocalValue(newValue);
    }
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    onChange({ target: { value: localValue } });
  };

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
});

const DefectHospital = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { subscribe, isConnected } = useSocket();

  // Check if redirected from DefectCapture due to access denied (via URL param)
  const accessDeniedParam = searchParams.get('accessDenied');
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState('');

  // Update banner when accessDenied param is present
  useEffect(() => {
    if (accessDeniedParam) {
      setShowAccessDenied(true);
      setAccessDeniedReason(
        accessDeniedParam === 'system'
          ? 'No tienes permiso de sistema para capturar defectos.'
          : accessDeniedParam === 'hospital'
          ? 'No tienes rol de Hospital asignado para capturar defectos. Contacta a tu administrador.'
          : 'No tienes permisos para capturar defectos.'
      );
    }
  }, [accessDeniedParam]);

  // Clear URL param when user closes the banner
  const handleCloseAccessDenied = () => {
    setShowAccessDenied(false);
    setAccessDeniedReason('');
    // Remove the accessDenied param from URL without refresh
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('accessDenied');
    navigate({ search: newParams.toString() }, { replace: true });
  };

  // Modo de operación: 'repair' | 'release' | 'admin' (default)
  const mode = searchParams.get('mode') || 'admin';
  const isRepairMode = mode === 'repair';
  const isReleaseMode = mode === 'release';
  const isAdminMode = mode === 'admin';

  // Obtener usuario
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Estado para permisos de Hospital (cargados desde backend)
  const [hospitalPermissions, setHospitalPermissions] = useState(() => {
    // Intentar cargar desde cache primero
    const cached = getCachedHospitalPermissions();
    return cached || { canRepair: false, canRelease: false, canScrap: false, isHospitalAdmin: false, canManageDeviations: false, hospitalRoles: [] };
  });

  // Cargar permisos de Hospital desde backend
  useEffect(() => {
    const loadHospitalPermissions = async () => {
      try {
        const response = await checkMyHospitalPermissions();
        if (response.success) {
          setHospitalPermissions(response.data);
          cacheHospitalPermissions(response.data);
        }
      } catch (error) {
        console.error('Error loading hospital permissions:', error);
      }
    };
    if (user.id) {
      loadHospitalPermissions();
    }
  }, [user.id]);

  // Permisos efectivos: vienen del backend (que ya verifica si es admin del sistema)
  const canDoRepairActions = hospitalPermissions.canRepair;
  const canDoReleaseActions = hospitalPermissions.canRelease;
  const canDoScrapActions = hospitalPermissions.canScrap;
  const canAccessAdmin = hospitalPermissions.isHospitalAdmin;
  const canManageDeviations = hospitalPermissions.canManageDeviations;

  // Mostrar contenido de reparación/liberación: combina modo + permisos
  const showRepairContent = (isRepairMode || isAdminMode) && canDoRepairActions;
  const showReleaseContent = (isReleaseMode || isAdminMode) && canDoReleaseActions;

  // Validación de acceso según modo y estaciones
  useEffect(() => {
    // Esperar a que se carguen los permisos
    if (!hospitalPermissions.canRepair && !hospitalPermissions.canRelease && !hospitalPermissions.isHospitalAdmin) {
      return; // Permisos aún no cargados
    }

    const repairStation = localStorage.getItem('hospital_repair_station');
    const releaseStation = localStorage.getItem('hospital_release_station');

    // Validar acceso según modo
    if (isAdminMode) {
      // Admin requiere permiso de admin Y ambas estaciones
      if (!hospitalPermissions.isHospitalAdmin) {
        navigate('/hospital-dashboard');
        return;
      }
      if (!repairStation || !releaseStation) {
        navigate('/hospital-dashboard');
        return;
      }
    } else if (isRepairMode) {
      // Modo Reparación: solo reparadores (NO admins)
      if (hospitalPermissions.isHospitalAdmin || !hospitalPermissions.canRepair) {
        navigate('/hospital-dashboard');
        return;
      }
      if (!repairStation) {
        navigate('/hospital-dashboard');
        return;
      }
    } else if (isReleaseMode) {
      // Modo Liberación: solo liberadores (NO admins)
      if (hospitalPermissions.isHospitalAdmin || !hospitalPermissions.canRelease) {
        navigate('/hospital-dashboard');
        return;
      }
      if (!releaseStation) {
        navigate('/hospital-dashboard');
        return;
      }
    }
  }, [hospitalPermissions, isAdminMode, isRepairMode, isReleaseMode, navigate]);

  // Cargar estación guardada según modo
  const getSavedStation = (type) => {
    try {
      const saved = localStorage.getItem(`hospital_${type}_station`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  // Obtener estación del modo actual
  const getModeStation = () => {
    if (isRepairMode) return getSavedStation('repair');
    if (isReleaseMode) return getSavedStation('release');
    return null;
  };

  // Nombre del modo para mostrar
  const getModeName = () => {
    if (isRepairMode) return language === 'es' ? 'Modo Reparacion' : 'Repair Mode';
    if (isReleaseMode) return language === 'es' ? 'Modo Liberacion' : 'Release Mode';
    return language === 'es' ? 'Modo Admin' : 'Admin Mode';
  };

  // Color del modo (usando tema)
  const getModeColor = () => {
    if (isRepairMode) return { bg: t.bgPanel, border: t.warning, text: t.text };
    if (isReleaseMode) return { bg: t.bgPanel, border: t.success, text: t.text };
    return { bg: t.bgPanel, border: t.primary, text: t.text };
  };

  // Traducciones locales
  const L = {
    en: {
      title: 'Defect Hospital',
      subtitle: 'Repair and release management',
      loading: 'Loading...',
      refresh: 'Refresh',
      dashboard: 'Dashboard',
      // Tabs
      tabRepairs: 'Repairs',
      tabInRepair: 'In Repair',
      tabReleases: 'Releases',
      // Sub-tabs
      noLocation: 'No Location',
      inQueue: 'In Queue',
      // Actions
      startRepair: 'Start Repair',
      completeRepair: 'Complete Repair',
      release: 'Release',
      reject: 'Reject',
      quarantine: 'Quarantine',
      scrap: 'Scrap',
      assignLocation: 'Assign Location',
      sendToQA: 'Send to QA',
      // Messages
      repairStarted: 'Repair started',
      repairCompleted: 'Repair completed',
      defectReleased: 'Defect released',
      defectRejected: 'Defect rejected - returns to repair',
      sentToQuarantine: 'Sent to quarantine',
      sentToScrap: 'Sent to scrap',
      errorLoading: 'Error loading data',
      commentRequired: 'When reassigning responsible area, comment is required',
      locationRequired: 'This piece requires physical location assignment before repair',
      locationNotFound: 'Location code not found',
      serialsAssigned: 'serials assigned to',
      piecesDelivered: 'pieces delivered to QA at',
      assignLocationFirst: 'Must assign physical location first',
      doubleClickAction: 'Double click for quick action',
      // Form labels
      repairType: 'Repair Type',
      repairTime: 'Repair Time (min)',
      repairNotes: 'Repair Notes',
      releaseReason: 'Release Reason',
      releaseTime: 'Release Time (min)',
      releaseNotes: 'Release Notes',
      rootCause: 'Root Cause',
      rejectNotes: 'Reject Notes',
      newDepartment: 'Reassign to Department',
      // Station
      station: 'Station',
      selectStation: 'Select Station',
      changeStation: 'Change Station',
      repairStation: 'Repair Station',
      releaseStation: 'Release Station',
      noStationSelected: 'No station selected',
      // Table headers
      serial: 'Serial',
      part: 'Part',
      defect: 'Defect',
      department: 'Department',
      location: 'Location',
      status: 'Status',
      time: 'Time',
      actions: 'Actions',
      noData: 'No data',
      notAssigned: 'Not assigned',
      noDescription: 'No description',
      // Counts
      pending: 'Pending',
      total: 'Total',
      pieces: 'pieces'
    },
    es: {
      title: 'Hospital de Defectos',
      subtitle: 'Gestión de reparación y liberación',
      loading: 'Cargando...',
      refresh: 'Actualizar',
      dashboard: 'Dashboard',
      // Tabs
      tabRepairs: 'Reparaciones',
      tabInRepair: 'En Reparación',
      tabReleases: 'Liberaciones',
      // Sub-tabs
      noLocation: 'Sin Ubicación',
      inQueue: 'En Cola',
      // Actions
      startRepair: 'Iniciar Reparación',
      completeRepair: 'Completar Reparación',
      release: 'Liberar',
      reject: 'Rechazar',
      quarantine: 'Cuarentena',
      scrap: 'Scrap',
      assignLocation: 'Asignar Ubicación',
      sendToQA: 'Enviar a QA',
      // Messages
      repairStarted: 'Reparación iniciada',
      repairCompleted: 'Reparación completada',
      defectReleased: 'Defecto liberado',
      defectRejected: 'Defecto rechazado - regresa a reparación',
      sentToQuarantine: 'Enviado a cuarentena',
      sentToScrap: 'Enviado a scrap',
      errorLoading: 'Error cargando datos',
      commentRequired: 'Al reasignar área responsable, el comentario es obligatorio',
      locationRequired: 'Esta pieza requiere asignación de ubicación física antes de reparar',
      locationNotFound: 'Código de ubicación no encontrado',
      serialsAssigned: 'seriales asignados a',
      piecesDelivered: 'piezas entregadas a QA en',
      assignLocationFirst: 'Primero debe asignar ubicación física',
      doubleClickAction: 'Doble click para acción rápida',
      // Form labels
      repairType: 'Tipo de Reparación',
      repairTime: 'Tiempo Reparación (min)',
      repairNotes: 'Notas de Reparación',
      releaseReason: 'Razón de Liberación',
      releaseTime: 'Tiempo Liberación (min)',
      releaseNotes: 'Notas de Liberación',
      rootCause: 'Causa Raíz',
      rejectNotes: 'Notas de Rechazo',
      newDepartment: 'Reasignar a Departamento',
      // Station
      station: 'Estación',
      selectStation: 'Seleccionar Estación',
      changeStation: 'Cambiar Estación',
      repairStation: 'Estación de Reparación',
      releaseStation: 'Estación de Liberación',
      noStationSelected: 'Sin estación seleccionada',
      // Table headers
      serial: 'Serial',
      part: 'Parte',
      defect: 'Defecto',
      department: 'Departamento',
      location: 'Ubicación',
      status: 'Estado',
      time: 'Tiempo',
      actions: 'Acciones',
      noData: 'Sin datos',
      notAssigned: 'Sin asignar',
      noDescription: 'Sin descripción',
      // Counts
      pending: 'Pendientes',
      total: 'Total',
      pieces: 'piezas'
    }
  }[language] || {};

  // Estado principal - tab inicial según modo (con memoria en localStorage)
  const getInitialTab = () => {
    const savedTab = localStorage.getItem('hospital_activeTab');
    if (savedTab) return savedTab;
    if (isReleaseMode) return 'releases';
    return 'repairs';
  };
  const getInitialSubTab = () => {
    return localStorage.getItem('hospital_repairsSubTab') || 'all';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab()); // 'general' | 'repairs' | 'inRepair' | 'releases'
  const [repairsSubTab, setRepairsSubTab] = useState(getInitialSubTab()); // 'all' | 'sinUbicacion' | 'enCola'

  // Guardar tabs en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('hospital_activeTab', activeTab);
  }, [activeTab]);

  // Limpiar selecciones al cambiar de tab (no memoria multi-tab)
  useEffect(() => {
    setSelectedDefects(new Set());
    setSelectedForHandoff(new Set());
    setSelectedForMrb(new Set());
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('hospital_repairsSubTab', repairsSubTab);
  }, [repairsSubTab]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos
  const [allDefects, setAllDefects] = useState([]); // General tab - ALL defects
  const [generalPage, setGeneralPage] = useState(1);
  const [generalPageSize, setGeneralPageSize] = useState(100);
  const [generalPagination, setGeneralPagination] = useState({ total: 0, totalPages: 0 });
  const [pendingRepairs, setPendingRepairs] = useState([]);
  const [inRepairDefects, setInRepairDefects] = useState([]);
  const [pendingReleases, setPendingReleases] = useState([]);
  const [pendingHandoff, setPendingHandoff] = useState([]);

  // MRB - Cuarentena y Scrap
  const [quarantineDefects, setQuarantineDefects] = useState([]);
  const [scrappedDefects, setScrappedDefects] = useState([]);
  const [mrbSubTab, setMrbSubTab] = useState('all'); // 'all' | 'quarantine' | 'scrap'
  const [selectedForMrb, setSelectedForMrb] = useState(new Set());
  const [mrbModalOpen, setMrbModalOpen] = useState(false);
  const [mrbAction, setMrbAction] = useState(''); // 'returnToRepair', 'toScrap', 'releaseWithDeviation', 'confirmScrap', 'returnToQuarantine'
  const [mrbNotes, setMrbNotes] = useState('');
  const [mrbDeviationId, setMrbDeviationId] = useState('');
  const [mrbStationId, setMrbStationId] = useState('');

  // Filtros inline estilo Excel para tabla MRB
  // Arrays para soportar selección múltiple
  const [mrbColFilters, setMrbColFilters] = useState({
    entryNumber: [],
    serialNumber: [],
    partNumber: [],
    defectCode: [],
    mrbCampaignNumber: [],
    qarNumber: [],
    eightDNumber: [],
    hours: [],
    mrbType: []
  });
  const [mrbOpenDropdown, setMrbOpenDropdown] = useState(null);
  const [mrbFilterSearch, setMrbFilterSearch] = useState(''); // Búsqueda dentro del dropdown

  // Filtros inline estilo Excel para tabla principal (repairs/releases/handoff/general/inRepair)
  // Arrays para soportar selección múltiple
  const [mainColFilters, setMainColFilters] = useState({
    entryNumber: [],
    serialNumber: [],
    partNumber: [],
    locationName: [],
    departmentName: [],
    defectTypeName: [],
    repairStatus: [],
    repairCount: [],
    lastAction: [],
    capturedAt: [],
    updatedAt: []
  });
  const [mainOpenDropdown, setMainOpenDropdown] = useState(null);
  const [mainFilterSearch, setMainFilterSearch] = useState(''); // Búsqueda dentro del dropdown

  // Modal de Envío a Validación (QA/MRB/Scrap)
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffDestination, setHandoffDestination] = useState('QA');
  const [handoffNotes, setHandoffNotes] = useState('');
  const [selectedForHandoff, setSelectedForHandoff] = useState(new Set());
  const [handoffSelectedStation, setHandoffSelectedStation] = useState(null); // Estación destino para handoff a QA
  const [handoffStationCode, setHandoffStationCode] = useState(''); // Input de escaneo
  const [mrbLocations, setMrbLocations] = useState([]); // Locations tipo MRB
  const [selectedMrbLocation, setSelectedMrbLocation] = useState(null); // Location MRB seleccionada
  const [mrbCampaignsForHandoff, setMrbCampaignsForHandoff] = useState([]); // Campañas MRB activas
  const [selectedMrbCampaign, setSelectedMrbCampaign] = useState(null); // Campaña MRB seleccionada (opcional)

  // Modal de Crear Paquete MRB
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [packageQarId, setPackageQarId] = useState(null);
  const [package8dId, setPackage8dId] = useState(null);
  const [packageCampaignId, setPackageCampaignId] = useState(null);
  const [packageNotes, setPackageNotes] = useState('');
  const [packageAlertMinutes, setPackageAlertMinutes] = useState(60); // Minutos para alerta (default 1 hora)
  const [packageDestinationLocationId, setPackageDestinationLocationId] = useState(null); // Ubicación MRB destino
  const [availableQars, setAvailableQars] = useState([]);
  const [available8Ds, setAvailable8Ds] = useState([]);
  const [creatingPackage, setCreatingPackage] = useState(false);

  // Paquetes entrantes desde MRB (REWORK)
  const [incomingPackages, setIncomingPackages] = useState([]);
  const [incomingPackageDetails, setIncomingPackageDetails] = useState(null);
  const [showReceivePackageModal, setShowReceivePackageModal] = useState(false);
  const [selectedIncomingPackage, setSelectedIncomingPackage] = useState(null);
  const [receivePackageNotes, setReceivePackageNotes] = useState('');
  const [receivingPackage, setReceivingPackage] = useState(false);
  const [hospitalLocations, setHospitalLocations] = useState([]);
  const [receiveLocationId, setReceiveLocationId] = useState('');

  // Seriales ya en paquetes pendientes (para validación y UI)
  const [pendingSerials, setPendingSerials] = useState(new Set());

  // Modal de Reject con destino
  const [rejectDestination, setRejectDestination] = useState('REPAIR'); // 'REPAIR', 'SCRAP', 'QUARANTINE'
  const [rejectSelectedStation, setRejectSelectedStation] = useState(null); // Estación destino para reject a reparaciones
  const [rejectStationCode, setRejectStationCode] = useState(''); // Input de escaneo

  // Track locally started repairs (defectId -> startTime) para mostrar contador sin recargar
  const [locallyStartedRepairs, setLocallyStartedRepairs] = useState({});
  const [timerTick, setTimerTick] = useState(0); // Para forzar re-render del contador
  const [serialHistory, setSerialHistory] = useState([]);
  const [wipData, setWipData] = useState([]);

  // Catálogos
  const [repairTypes, setRepairTypes] = useState([]);
  const [releaseReasons, setReleaseReasons] = useState([]);
  const [rootCauses, setRootCauses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [repairStations, setRepairStations] = useState([]);
  const [releaseStations, setReleaseStations] = useState([]);
  const [clients, setClients] = useState([]);

  // Estación de sesión (persiste mientras el navegador esté abierto)
  const [sessionRepairStation, setSessionRepairStation] = useState(null);
  const [sessionReleaseStation, setSessionReleaseStation] = useState(null);
  const [showStationSelector, setShowStationSelector] = useState(false);
  const [stationSelectorType, setStationSelectorType] = useState(null); // 'REPAIR' | 'RELEASE'

  // Modal Asignar Ubicación
  const [showAssignLocation, setShowAssignLocation] = useState(false);
  const [assignLocationCode, setAssignLocationCode] = useState('');
  const [assignLocationData, setAssignLocationData] = useState(null); // ubicación validada
  const [assignSerialInput, setAssignSerialInput] = useState('');
  const [assignSerialsList, setAssignSerialsList] = useState([]);
  const [assignResults, setAssignResults] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [assignSingleDefect, setAssignSingleDefect] = useState(null); // Para asignación individual
  const locationInputRef = useRef(null);
  const serialInputRef = useRef(null);

  // Modal Entregar a QA
  const [showHandoffQA, setShowHandoffQA] = useState(false);
  const [handoffLocationCode, setHandoffLocationCode] = useState('');
  const [handoffLocationData, setHandoffLocationData] = useState(null);
  const [handoffSerialInput, setHandoffSerialInput] = useState('');
  const [handoffSerialsList, setHandoffSerialsList] = useState([]);
  const [handoffResults, setHandoffResults] = useState(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const handoffLocationInputRef = useRef(null);
  const handoffSerialInputRef = useRef(null);

  // Tab Trazabilidad - historial por serial
  const [traceSerial, setTraceSerial] = useState('');
  const [traceDefects, setTraceDefects] = useState([]);
  const [traceEvents, setTraceEvents] = useState([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const traceInputRef = useRef(null);

  // Tab Desviaciones
  const [deviations, setDeviations] = useState([]);
  const [deviationsLoading, setDeviationsLoading] = useState(false);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [deviationForm, setDeviationForm] = useState({
    deviationType: 'SAE',
    description: '',
    clientId: '',
    projectId: '',
    partId: '',
    validityDate: '',
    notes: ''
  });
  const [deviationFiles, setDeviationFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]); // Archivos ya guardados
  const [linkedDefects, setLinkedDefects] = useState([]); // Defectos vinculados a la desviación
  const [defectSearchSerial, setDefectSearchSerial] = useState(''); // Búsqueda de serial (masiva: separados por coma/salto)
  const [defectSearchPartIds, setDefectSearchPartIds] = useState([]); // Filtro por partes (múltiples IDs)
  const [defectSearchDefectTypeId, setDefectSearchDefectTypeId] = useState(''); // Filtro por tipo de defecto
  const [defectSearchEntryFrom, setDefectSearchEntryFrom] = useState(''); // Rango entry desde
  const [defectSearchEntryTo, setDefectSearchEntryTo] = useState(''); // Rango entry hasta
  const [defectSearchDateFrom, setDefectSearchDateFrom] = useState(''); // Rango fecha desde
  const [defectSearchDateTo, setDefectSearchDateTo] = useState(''); // Rango fecha hasta
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Toggle filtros avanzados
  const [bulkDepartmentForDeviation, setBulkDepartmentForDeviation] = useState(''); // Área responsable masiva
  const [availableDefectTypesForSearch, setAvailableDefectTypesForSearch] = useState([]); // Tipos de defecto disponibles
  const [clientPartsForDeviation, setClientPartsForDeviation] = useState([]); // Partes del cliente seleccionado
  const [searchedDefects, setSearchedDefects] = useState([]); // Resultados de búsqueda
  const [searchingDefects, setSearchingDefects] = useState(false);
  const [bulkReleaseLoading, setBulkReleaseLoading] = useState(false);
  const [deviationHistory, setDeviationHistory] = useState([]); // Historial de cambios
  const [showDeviationHistory, setShowDeviationHistory] = useState(false); // Toggle historial
  const [deviationFilter, setDeviationFilter] = useState({ status: 'ACTIVE', type: '', search: '' });
  const deviationFileInputRef = useRef(null);

  // Selección múltiple y cambio masivo
  const [selectedDefects, setSelectedDefects] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDepartmentId, setBulkDepartmentId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Tab Reports
  const [reportType, setReportType] = useState('lot'); // 'lot' | 'dateRange' | 'serialList' | 'currentTable'
  const [reportLot, setReportLot] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportSerialList, setReportSerialList] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [defectTypeFilter, setDefectTypeFilter] = useState('');

  // Búsqueda/Filtro
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '', 'today', 'yesterday', 'week', 'month' (último movimiento)
  const [captureDateFrom, setCaptureDateFrom] = useState(''); // Rango fecha de captura
  const [captureDateTo, setCaptureDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Filtro por repair_status
  const searchInputRef = useRef(null);

  // Cards expandidas
  const [expandedSerials, setExpandedSerials] = useState({});

  // Timer para actualizar contador de tiempo en reparaciones iniciadas localmente
  useEffect(() => {
    if (Object.keys(locallyStartedRepairs).length > 0) {
      const interval = setInterval(() => {
        setTimerTick(t => t + 1);
      }, 30000); // Actualizar cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [locallyStartedRepairs]);

  // Helper para calcular minutos transcurridos (desde local o backend)
  const getElapsedMinutes = useCallback((defect) => {
    const defectId = defect?.id;
    // Primero intentar desde locallyStartedRepairs (más preciso)
    if (defectId && locallyStartedRepairs[defectId]) {
      return Math.floor((Date.now() - locallyStartedRepairs[defectId]) / 60000);
    }
    // Si no, usar repairStartedAt del backend
    const startedAt = defect?.repairStartedAt || defect?.repair_started_at;
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      return Math.floor((Date.now() - startTime) / 60000);
    }
    // Fallback: si es IN_REPAIR pero no tiene repair_started_at, usar updated_at
    const status = defect?.repairStatus || defect?.repair_status;
    if (status === 'IN_REPAIR') {
      const updatedAt = defect?.updatedAt || defect?.updated_at;
      if (updatedAt) {
        const updateTime = new Date(updatedAt).getTime();
        return Math.floor((Date.now() - updateTime) / 60000);
      }
    }
    return null;
  }, [locallyStartedRepairs, timerTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal de acción
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'repair' | 'complete' | 'release' | 'reject'
  const [selectedDefect, setSelectedDefect] = useState(null);

  // Modal de detalle/historia
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailDefect, setDetailDefect] = useState(null);

  // Modal de advertencia MRB (campañas pendientes de inspección)
  const [mrbWarningOpen, setMrbWarningOpen] = useState(false);
  const [mrbPendingCampaigns, setMrbPendingCampaigns] = useState([]);
  const [mrbWarningDefect, setMrbWarningDefect] = useState(null);

  // Form data para modal
  const [formData, setFormData] = useState({
    repairTypeId: '',
    repairTimeMinutes: 5,
    repairNotes: '',
    repairStationId: '',      // Estación de reparación
    releaseReasonId: '',
    releaseTimeMinutes: 1,
    releaseNotes: '',
    releaseStationId: '',     // Estación de liberación
    rootCauseId: '',
    rejectNotes: '',
    newDepartmentId: '',      // Reasignar área responsable
    deviationId: '',          // Liberación por desviación
    reverificationResult: '', // OK | NOK for spec re-verification
    reverificationValue: ''   // New measured value during re-verification
  });

  // Spec info for re-verification during release
  const [specInfo, setSpecInfo] = useState(null);
  const [loadingSpecInfo, setLoadingSpecInfo] = useState(false);

  // Desviaciones disponibles para el defecto seleccionado
  const [availableDeviations, setAvailableDeviations] = useState([]);

  // Cliente seleccionado (por ahora hardcoded, luego se puede filtrar)
  const [clientId] = useState(null);

  // Cargar estaciones al iniciar (desde localStorage para modo específico, sessionStorage para admin)
  useEffect(() => {
    // Si es modo reparación o liberación, cargar estación guardada en localStorage
    if (isRepairMode) {
      const savedRepair = getSavedStation('repair');
      if (savedRepair) {
        setSessionRepairStation(savedRepair);
        // También guardar en localStorage para consistencia
        localStorage.setItem('hospital_repair_station', JSON.stringify(savedRepair));
      }
    } else if (isReleaseMode) {
      const savedRelease = getSavedStation('release');
      if (savedRelease) {
        setSessionReleaseStation(savedRelease);
        localStorage.setItem('hospital_release_station', JSON.stringify(savedRelease));
      }
    } else {
      // Modo admin: cargar desde localStorage (guardado en HospitalDashboard)
      const savedRepairStation = localStorage.getItem('hospital_repair_station');
      const savedReleaseStation = localStorage.getItem('hospital_release_station');
      if (savedRepairStation) {
        try {
          setSessionRepairStation(JSON.parse(savedRepairStation));
        } catch (e) { /* ignore */ }
      }
      if (savedReleaseStation) {
        try {
          setSessionReleaseStation(JSON.parse(savedReleaseStation));
        } catch (e) { /* ignore */ }
      }
    }
  }, [mode]);

  // Cargar ubicaciones de Hospital cuando se abre el modal de recibir paquete
  useEffect(() => {
    if (showReceivePackageModal) {
      const loadHospitalLocations = async () => {
        try {
          const locs = await getLocationCodes('HOSPITAL');
          setHospitalLocations(locs);
          // Pre-seleccionar si solo hay una
          if (locs.length === 1) {
            setReceiveLocationId(locs[0].id);
          }
        } catch (err) {
          console.error('Error loading hospital locations:', err);
        }
      };
      loadHospitalLocations();
    } else {
      setReceiveLocationId('');
    }
  }, [showReceivePackageModal]);

  // Cargar catálogos y contadores iniciales
  useEffect(() => {
    loadCatalogs();
  }, []);

  // Función para seleccionar estación de sesión
  const selectSessionStation = (type, station) => {
    if (type === 'REPAIR') {
      setSessionRepairStation(station);
      localStorage.setItem('hospital_repair_station', JSON.stringify(station));
      // Si había una acción pendiente (start), continuar con el modal
      if (modalAction === 'start' && selectedDefect) {
        setFormData(prev => ({
          ...prev,
          repairTypeId: repairTypes[0]?.id || '',
          repairTimeMinutes: 5,
          repairNotes: '',
          repairStationId: station.id,
          releaseReasonId: releaseReasons[0]?.id || '',
          releaseTimeMinutes: 1,
          releaseNotes: '',
          rootCauseId: '',
          rejectNotes: '',
          newDepartmentId: ''
        }));
        setModalOpen(true);
      }
    } else if (type === 'RELEASE') {
      setSessionReleaseStation(station);
      localStorage.setItem('hospital_release_station', JSON.stringify(station));
      // Si había una acción pendiente (release), continuar con el modal
      if (modalAction === 'release' && selectedDefect) {
        setFormData(prev => ({
          ...prev,
          repairTypeId: repairTypes[0]?.id || '',
          repairTimeMinutes: 5,
          repairNotes: '',
          releaseReasonId: releaseReasons[0]?.id || '',
          releaseTimeMinutes: 1,
          releaseNotes: '',
          releaseStationId: station.id,
          rootCauseId: '',
          rejectNotes: '',
          newDepartmentId: ''
        }));
        setModalOpen(true);
      }
    }
    setShowStationSelector(false);
    setStationSelectorType(null);
  };

  // Abrir selector de estación
  const openStationSelector = (type) => {
    setStationSelectorType(type);
    setShowStationSelector(true);
  };

  // Limpiar estación de sesión
  const clearSessionStation = (type) => {
    if (type === 'REPAIR') {
      setSessionRepairStation(null);
      localStorage.removeItem('hospital_repair_station');
    } else if (type === 'RELEASE') {
      setSessionReleaseStation(null);
      localStorage.removeItem('hospital_release_station');
    }
  };

  const loadCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const [types, reasons, causes, deptsRes, repairSt, releaseSt, clientsRes] = await Promise.all([
        getRepairTypes(),
        getReleaseReasons(),
        getRootCauses(),
        // Use inspection-catalogs endpoint to get ALL departments (no permission filtering)
        fetch('http://localhost:5000/inspection-catalogs/departments', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        getStationsByType('REPAIR'),
        getStationsByType('RELEASE'),
        fetch('http://localhost:5000/clients/list', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setRepairTypes(types.repairTypes || types.items || []);
      setReleaseReasons(reasons.releaseReasons || reasons.items || []);
      setRootCauses(causes.rootCauses || causes.items || []);
      setDepartments(deptsRes.items || deptsRes.departments || []);
      setRepairStations(repairSt.stations || []);
      setReleaseStations(releaseSt.stations || []);
      setClients(clientsRes.clients || clientsRes.items || []);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
  };

  // Cargar QARs, 8Ds y Campañas MRB disponibles para el modal de crear paquete
  const loadAvailableQarsAnd8Ds = async () => {
    try {
      const token = localStorage.getItem('token');
      const [qarsRes, eightDsRes, campaignsRes] = await Promise.all([
        fetch(`${API_URL}/qar?status=EMITIDO&status=RESPONDIDO`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/8d/reports?status=open&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/mrb?status=ABIERTA&status=EN_PROCESO&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const qarsData = await qarsRes.json();
      const eightDsData = await eightDsRes.json();
      const campaignsData = await campaignsRes.json();
      setAvailableQars(qarsData.qars || qarsData.items || []);
      setAvailable8Ds(eightDsData.reports || eightDsData.items || []);
      setMrbCampaignsForHandoff(campaignsData.campaigns || []);
    } catch (err) {
      console.error('Error loading QARs/8Ds/Campaigns:', err);
    }
  };

  // Crear paquete de transferencia
  const handleCreatePackage = async () => {
    console.log('handleCreatePackage called, selectedForMrb.size:', selectedForMrb.size);
    if (selectedForMrb.size === 0) {
      setError(language === 'es' ? 'Selecciona al menos un defecto' : 'Select at least one defect');
      return;
    }

    // Validar ubicación MRB destino (obligatorio para control 360°)
    if (!packageDestinationLocationId) {
      setError(language === 'es' ? 'Selecciona la ubicación MRB destino' : 'Select MRB destination location');
      return;
    }

    setCreatingPackage(true);
    try {
      const defectIds = Array.from(selectedForMrb);
      const result = await createTransferPackage(
        'HOSPITAL',
        'MRB',
        defectIds,
        {
          notes: packageNotes,
          alertMinutes: packageAlertMinutes,
          destinationLocationId: packageDestinationLocationId
        }
      );

      if (result.success) {
        setSuccess(language === 'es'
          ? `Paquete ${result.package?.packageNumber || ''} creado con ${result.itemsAdded} item(s)`
          : `Package ${result.package?.packageNumber || ''} created with ${result.itemsAdded} item(s)`);
        setShowCreatePackageModal(false);
        setSelectedForMrb(new Set());
        setPackageNotes('');
        setPackageDestinationLocationId(null);
        loadData();
      } else {
        setError(result.message || 'Error al crear paquete');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setCreatingPackage(false);
    }
  };

  // Recibir paquete desde MRB
  const handleReceivePackage = async () => {
    if (!selectedIncomingPackage) return;
    if (!receiveLocationId) {
      setError(language === 'es' ? 'Seleccione ubicación de destino' : 'Select destination location');
      return;
    }

    setReceivingPackage(true);
    try {
      const result = await receiveTransferPackage(
        selectedIncomingPackage.id,
        receivePackageNotes,
        null, // mrbCampaignId (not used for Hospital reception)
        receiveLocationId
      );

      if (result.success) {
        setSuccess(language === 'es'
          ? `Paquete ${selectedIncomingPackage.packageNumber} recibido (${result.transferHours}h)`
          : `Package ${selectedIncomingPackage.packageNumber} received (${result.transferHours}h)`);
        setShowReceivePackageModal(false);
        setSelectedIncomingPackage(null);
        setReceivePackageNotes('');
        loadIncomingPackages();
        loadData();
      } else {
        setError(result.message || 'Error al recibir paquete');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setReceivingPackage(false);
    }
  };

  // Ver detalles de paquete entrante
  const viewIncomingPackageDetails = async (pkg) => {
    try {
      const result = await getTransferPackageDetails(pkg.id);
      if (result.success) {
        setIncomingPackageDetails(result);
        setSelectedIncomingPackage(pkg);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  // loadData: carga todos los datos (usado después de acciones para refrescar)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, repairs, inRepair, releases, handoff, quarantine, scrapped, pendingSerialsRes] = await Promise.all([
        getAllDefects(clientId, { page: generalPage, pageSize: generalPageSize }),
        getPendingRepairs(clientId),
        getInRepair(clientId),
        getPendingReleases(clientId),
        getPendingHandoff(clientId),
        getQuarantineDefects(),
        getScrappedDefects(),
        getPendingSerials()
      ]);
      setAllDefects(all.defects || all.items || []);
      if (all.pagination) setGeneralPagination(all.pagination);
      setPendingRepairs(repairs.defects || repairs.items || []);
      setInRepairDefects(inRepair.defects || inRepair.items || []);
      setPendingReleases(releases.defects || releases.items || []);
      setPendingHandoff(handoff.defects || handoff.items || []);
      setQuarantineDefects(quarantine.defects || []);
      setScrappedDefects(scrapped.defects || []);
      setPendingSerials(new Set(pendingSerialsRes.serials || []));
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Error cargando datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // WebSocket: Escuchar eventos de defectos para actualización en tiempo real
  useEffect(() => {
    const events = [
      'defect:created',
      'defect:repaired',
      'defect:released',
      'defect:rejected',
      'defect:approved',
      'defect:quarantined',
      'defect:scrapped',
      'defect:repair-started',
      'defect:repair-completed',
      'package:received'
    ];

    const unsubscribes = events.map(event =>
      subscribe(event, (data) => {
        console.log(`🔄 WebSocket [${event}]:`, data);
        // Refrescar datos del tab activo
        loadData();
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, loadData]);

  // Cargar datos del tab activo cuando cambia (optimizado)
  useEffect(() => {
    const loadCurrentTab = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'general':
            // General: TODOS los defectos sin importar status (paginado)
            const all = await getAllDefects(clientId, { page: generalPage, pageSize: generalPageSize });
            setAllDefects(all.defects || all.items || []);
            if (all.pagination) setGeneralPagination(all.pagination);
            break;
          case 'repairs':
            const repairs = await getPendingRepairs(clientId);
            setPendingRepairs(repairs.defects || repairs.items || []);
            break;
          case 'inRepair':
            const inRepair = await getInRepair(clientId);
            setInRepairDefects(inRepair.defects || inRepair.items || []);
            break;
          case 'handoff':
            const handoff = await getPendingHandoff(clientId);
            setPendingHandoff(handoff.defects || handoff.items || []);
            break;
          case 'releases':
            const releases = await getPendingReleases(clientId);
            setPendingReleases(releases.defects || releases.items || []);
            break;
          case 'wip':
            const wip = await getWIPByLocation();
            setWipData(wip.wip || []);
            break;
          case 'traceability':
            const history = await getSerialHistory(clientId);
            setSerialHistory(history.defects || history.items || []);
            break;
          case 'mrb':
            const [quarantine, scrapped, pendingSerialsRes] = await Promise.all([
              getQuarantineDefects(),
              getScrappedDefects(),
              getPendingSerials()
            ]);
            setQuarantineDefects(quarantine.defects || []);
            setScrappedDefects(scrapped.defects || []);
            setPendingSerials(new Set(pendingSerialsRes.serials || []));
            break;
          default:
            break;
        }
      } catch (err) {
        setError(`Error cargando datos: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentTab();
  }, [activeTab, clientId]);

  // Cargar contadores para badges de tabs al inicio
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [all, repairs, inRepair, releases, handoff, quarantine, scrapped] = await Promise.all([
          getAllDefects(clientId, { page: generalPage, pageSize: generalPageSize }),
          getPendingRepairs(clientId),
          getInRepair(clientId),
          getPendingReleases(clientId),
          getPendingHandoff(clientId),
          getQuarantineDefects(),
          getScrappedDefects()
        ]);
        setAllDefects(all.defects || all.items || []);
        if (all.pagination) setGeneralPagination(all.pagination);
        setPendingRepairs(repairs.defects || repairs.items || []);
        setInRepairDefects(inRepair.defects || inRepair.items || []);
        setPendingReleases(releases.defects || releases.items || []);
        setPendingHandoff(handoff.defects || handoff.items || []);
        setQuarantineDefects(quarantine.defects || []);
        setScrappedDefects(scrapped.defects || []);
      } catch (err) {
        console.error('Error loading counts:', err);
      }
    };
    loadCounts();
  }, [clientId]);

  // Cargar paquetes entrantes desde MRB
  const loadIncomingPackages = useCallback(async () => {
    try {
      const result = await getPendingTransferPackages('HOSPITAL');
      setIncomingPackages(result.packages || []);
    } catch (err) {
      console.error('Error loading incoming packages:', err);
    }
  }, []);

  useEffect(() => {
    loadIncomingPackages();
  }, [loadIncomingPackages]);

  // Recargar tab General cuando cambia paginación
  useEffect(() => {
    if (activeTab !== 'general') return;
    const loadGeneralPage = async () => {
      setLoading(true);
      try {
        const all = await getAllDefects(clientId, { page: generalPage, pageSize: generalPageSize });
        setAllDefects(all.defects || all.items || []);
        if (all.pagination) setGeneralPagination(all.pagination);
      } catch (err) {
        console.error('Error loading general page:', err);
      } finally {
        setLoading(false);
      }
    };
    loadGeneralPage();
  }, [generalPage, generalPageSize, clientId, activeTab]);

  // Cargar desviaciones
  const loadDeviations = useCallback(async () => {
    setDeviationsLoading(true);
    try {
      const response = await getDeviations(deviationFilter);
      if (response.success) {
        setDeviations(response.deviations || []);
      }
    } catch (err) {
      console.error('Error loading deviations:', err);
    } finally {
      setDeviationsLoading(false);
    }
  }, [deviationFilter]);

  // Cargar desviaciones al inicio (para el contador del tab)
  useEffect(() => {
    if (canManageDeviations) {
      loadDeviations();
    }
  }, [canManageDeviations]);

  // Recargar desviaciones cuando cambia el filtro en el tab
  useEffect(() => {
    if (activeTab === 'deviations') {
      loadDeviations();
    }
  }, [activeTab, deviationFilter]);

  // Cargar locations MRB y campañas cuando se abre modal de handoff a MRB
  useEffect(() => {
    if (showHandoffModal && (handoffDestination === 'QUARANTINE' || handoffDestination === 'SCRAP')) {
      const loadMrbData = async () => {
        try {
          // Cargar locations tipo MRB
          const locRes = await fetch(`${API_URL}/location-codes?type=MRB&activeOnly=true`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const locData = await locRes.json();
          const locations = locData.locations || [];
          setMrbLocations(locations);
          // Pre-seleccionar si solo hay una ubicación MRB
          if (locations.length === 1) {
            setSelectedMrbLocation(locations[0]);
          }

          // Cargar campañas MRB activas
          const campRes = await fetch(`${API_URL}/mrb?status=ABIERTA&limit=100`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const campData = await campRes.json();
          setMrbCampaignsForHandoff(campData.campaigns || []);
        } catch (err) {
          console.error('Error loading MRB data:', err);
        }
      };
      loadMrbData();
    }
  }, [showHandoffModal, handoffDestination]);

  // Cargar locations MRB cuando se abre modal de crear paquete
  useEffect(() => {
    if (showCreatePackageModal) {
      const loadMrbLocationsForPackage = async () => {
        try {
          const locRes = await fetch(`${API_URL}/location-codes?type=MRB&activeOnly=true`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const locData = await locRes.json();
          const locations = locData.locations || [];
          setMrbLocations(locations);
          // Pre-seleccionar si solo hay una ubicación MRB
          if (locations.length === 1) {
            setPackageDestinationLocationId(locations[0].id);
          }
        } catch (err) {
          console.error('Error loading MRB locations:', err);
        }
      };
      loadMrbLocationsForPackage();
    }
  }, [showCreatePackageModal]);

  // Agrupar defectos por serial
  const groupBySerial = useCallback((defects) => {
    const groups = {};
    defects.forEach(defect => {
      const serial = defect.serialNumber || defect.serial_number || defect.lotNumber || defect.lot_number || 'SIN_SERIAL';
      if (!groups[serial]) {
        groups[serial] = {
          serial,
          partNumber: defect.partNumber || defect.part_number || '-',
          partName: defect.partName || defect.part_name || '-',
          clientName: defect.clientName || defect.client_name || '-',
          workOrder: defect.workOrder || defect.work_order || null,
          locationCode: defect.locationCode || defect.location_code || null,
          locationDescription: defect.locationDescription || defect.location_description || null,
          defects: []
        };
      }
      groups[serial].defects.push(defect);
    });
    return Object.values(groups);
  }, []);

  // Contar defectos por estado
  const countByStatus = useCallback((defects) => {
    const counts = { open: 0, inProgress: 0, closed: 0, quarantine: 0 };
    defects.forEach(d => {
      const status = d.repairStatus || d.repair_status || 'OPEN';
      if (status === 'OPEN' || status === 'REJECTED') {
        counts.open++;
      } else if (status === 'IN_REPAIR' || status === 'REPAIRED' || status === 'IN_VALIDATION' || status === 'PENDING_RELEASE_APPROVAL') {
        counts.inProgress++;
      } else if (status === 'CLOSED' || status === 'RELEASED') {
        counts.closed++;
      } else if (status === 'QUARANTINE' || status === 'SCRAPPED') {
        counts.quarantine++;
      }
    });
    return counts;
  }, []);

  // Filtrar pendientes por ubicación
  // INCLUIR también IN_REPAIR del usuario actual para que pueda completarlos sin cambiar de tab
  // Esto funciona incluso después de refresh porque viene del backend (inRepairDefects)
  const pendingWithLocation = useMemo(() => {
    const openWithLocation = pendingRepairs.filter(d => d.currentLocationId || d.current_location_id);

    // Agregar IN_REPAIR del usuario actual (para completarlos en la misma lista)
    // Van ARRIBA de la lista para acceso rápido
    const myInRepair = inRepairDefects.filter(d => {
      const repairedBy = d.repairedBy || d.repaired_by;
      return repairedBy === user.id;
    });

    // IN_REPAIR primero (los que están por completar), luego OPEN (los que están por iniciar)
    return [...myInRepair, ...openWithLocation];
  }, [pendingRepairs, inRepairDefects, user.id]);

  const pendingWithoutLocation = useMemo(() => {
    return pendingRepairs.filter(d => !d.currentLocationId && !d.current_location_id);
  }, [pendingRepairs]);

  // Todos los defectos combinados para calcular valores únicos de filtros
  const allDefectsForFilters = useMemo(() => [
    ...allDefects, ...pendingRepairs, ...inRepairDefects, ...pendingReleases, ...pendingHandoff
  ], [allDefects, pendingRepairs, inRepairDefects, pendingReleases, pendingHandoff]);

  // Valores únicos para filtros de columna (tabla principal)
  // Helper para obtener nombre de última acción de un defecto
  const getLastActionName = (d) => {
    const clean = (val) => val && val.trim() ? val.trim() : null;
    const status = d.repairStatus || d.repair_status || 'OPEN';
    const scrappedBy = clean(d.scrappedByName || d.scrapped_by_name);
    const quarantinedBy = clean(d.quarantinedByName || d.quarantined_by_name);
    const releasedBy = clean(d.releasedByName || d.released_by_name);
    const repairedBy = clean(d.repairedByName || d.repaired_by_name || d.repairingByName || d.repairing_by_name);
    const capturedBy = clean(d.capturedByName || d.captured_by_name);

    if (status === 'SCRAPPED' || status === 'SCRAP_CONFIRMED') return scrappedBy || releasedBy || repairedBy || capturedBy;
    if (status === 'QUARANTINE') return quarantinedBy || repairedBy || capturedBy;
    if (status === 'RELEASED' || status === 'CLOSED') return releasedBy || repairedBy || capturedBy;
    if (status === 'IN_REPAIR') return repairedBy || capturedBy;
    if (status === 'REPAIRED' || status === 'IN_VALIDATION') return repairedBy || capturedBy;
    return capturedBy;
  };

  const mainUniqueValues = useMemo(() => ({
    entryNumber: [...new Set(allDefectsForFilters.map(d => d.entryNumber || d.entry_number).filter(Boolean))].sort(),
    serialNumber: [...new Set(allDefectsForFilters.map(d => d.serialNumber || d.serial_number || d.lotNumber || d.lot_number).filter(Boolean))].sort(),
    partNumber: [...new Set(allDefectsForFilters.map(d => d.partNumber || d.part_number).filter(Boolean))].sort(),
    locationName: [...new Set(allDefectsForFilters.map(d => d.locationCode || d.location_code || d.currentLocationCode || d.current_location_code).filter(Boolean))].sort(),
    departmentName: [...new Set(allDefectsForFilters.map(d => d.departmentName || d.department_name).filter(Boolean))].sort(),
    defectTypeName: [...new Set(allDefectsForFilters.map(d => d.defectTypeName || d.defect_type_name).filter(Boolean))].sort(),
    repairStatus: [...new Set(allDefectsForFilters.map(d => d.repairStatus || d.repair_status).filter(Boolean))].sort(),
    repairCount: ['0', '1', '2', '3+'],
    lastAction: [...new Set(allDefectsForFilters.map(d => getLastActionName(d)).filter(Boolean))].sort(),
    capturedAt: [...new Set(allDefectsForFilters.map(d => d.capturedByName || d.captured_by_name).filter(Boolean))].sort(),
    updatedAt: [...new Set(allDefectsForFilters.map(d => {
      const dt = d.updatedAt || d.updated_at;
      return dt ? new Date(dt).toLocaleDateString('es-MX') : null;
    }).filter(Boolean))].sort().reverse().slice(0, 30)
  }), [allDefectsForFilters]);

  // Filtrar y agrupar datos según tab activo
  const filteredGroups = useMemo(() => {
    let data;
    switch (activeTab) {
      case 'general':
        // TODOS los defectos sin importar status
        data = allDefects;
        break;
      case 'repairs':
        // Aplicar filtro de ubicación
        if (repairsSubTab === 'all') {
          data = [...pendingWithoutLocation, ...pendingWithLocation];
        } else if (repairsSubTab === 'sinUbicacion') {
          data = pendingWithoutLocation;
        } else {
          data = pendingWithLocation;
        }
        break;
      case 'inRepair':
        data = inRepairDefects;
        break;
      case 'handoff':
        data = pendingHandoff;
        break;
      case 'releases':
        data = pendingReleases;
        break;
      default:
        data = pendingRepairs;
    }

    // Filtrar por búsqueda de texto (incluye work_order)
    let filtered = searchFilter.trim()
      ? data.filter(d => {
          const entry = (d.entryNumber || d.entry_number || '').toLowerCase();
          const serial = (d.serialNumber || d.serial_number || d.lotNumber || d.lot_number || '').toLowerCase();
          const part = (d.partNumber || d.part_number || '').toLowerCase();
          const partName = (d.partName || d.part_name || '').toLowerCase();
          const workOrder = (d.workOrder || d.work_order || '').toLowerCase();
          const search = searchFilter.toLowerCase();
          return entry.includes(search) || serial.includes(search) || part.includes(search) || partName.includes(search) || workOrder.includes(search);
        })
      : data;

    // Filtrar por tipo de defecto
    if (defectTypeFilter) {
      filtered = filtered.filter(d => {
        const typeId = d.defectTypeId || d.defect_type_id;
        return typeId === parseInt(defectTypeFilter);
      });
    }

    // Filtrar por status
    if (statusFilter) {
      filtered = filtered.filter(d => {
        const status = d.repairStatus || d.repair_status;
        return status === statusFilter;
      });
    }

    // Filtrar por último movimiento (updated_at) - botones rápidos
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      filtered = filtered.filter(d => {
        const updatedAt = d.updatedAt || d.updated_at;
        if (!updatedAt) return false;
        const defectDate = new Date(updatedAt);

        switch (dateFilter) {
          case 'today':
            return defectDate >= today;
          case 'yesterday':
            return defectDate >= yesterday && defectDate < today;
          case 'week':
            return defectDate >= weekAgo;
          case 'month':
            return defectDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Filtrar por fecha de captura (rango)
    if (captureDateFrom || captureDateTo) {
      filtered = filtered.filter(d => {
        const capturedAt = d.capturedAt || d.captured_at;
        if (!capturedAt) return false;
        const captureDate = new Date(capturedAt);

        if (captureDateFrom) {
          const fromDate = new Date(captureDateFrom);
          if (captureDate < fromDate) return false;
        }
        if (captureDateTo) {
          const toDate = new Date(captureDateTo + 'T23:59:59');
          if (captureDate > toDate) return false;
        }
        return true;
      });
    }

    // Filtros de columna estilo Excel (arrays para selección múltiple)
    if (mainColFilters.entryNumber.length > 0) {
      filtered = filtered.filter(d => mainColFilters.entryNumber.includes(d.entryNumber || d.entry_number));
    }
    if (mainColFilters.serialNumber.length > 0) {
      filtered = filtered.filter(d => mainColFilters.serialNumber.includes(d.serialNumber || d.serial_number || d.lotNumber || d.lot_number));
    }
    if (mainColFilters.partNumber.length > 0) {
      filtered = filtered.filter(d => mainColFilters.partNumber.includes(d.partNumber || d.part_number));
    }
    if (mainColFilters.locationName.length > 0) {
      filtered = filtered.filter(d => mainColFilters.locationName.includes(d.locationCode || d.location_code || d.currentLocationCode || d.current_location_code));
    }
    if (mainColFilters.departmentName.length > 0) {
      filtered = filtered.filter(d => mainColFilters.departmentName.includes(d.departmentName || d.department_name));
    }
    if (mainColFilters.defectTypeName.length > 0) {
      filtered = filtered.filter(d => mainColFilters.defectTypeName.includes(d.defectTypeName || d.defect_type_name));
    }
    if (mainColFilters.repairStatus.length > 0) {
      filtered = filtered.filter(d => mainColFilters.repairStatus.includes(d.repairStatus || d.repair_status));
    }
    if (mainColFilters.repairCount.length > 0) {
      filtered = filtered.filter(d => {
        const count = d.repairAttempts || d.repair_attempts || 0;
        const countStr = count >= 3 ? '3+' : String(count);
        return mainColFilters.repairCount.includes(countStr);
      });
    }
    if (mainColFilters.lastAction.length > 0) {
      filtered = filtered.filter(d => mainColFilters.lastAction.includes(getLastActionName(d)));
    }
    if (mainColFilters.capturedAt.length > 0) {
      filtered = filtered.filter(d => mainColFilters.capturedAt.includes(d.capturedByName || d.captured_by_name));
    }
    if (mainColFilters.updatedAt.length > 0) {
      filtered = filtered.filter(d => {
        const dt = d.updatedAt || d.updated_at;
        return dt && mainColFilters.updatedAt.includes(new Date(dt).toLocaleDateString('es-MX'));
      });
    }

    return groupBySerial(filtered);
  }, [activeTab, repairsSubTab, allDefects, pendingRepairs, pendingWithLocation, pendingWithoutLocation, inRepairDefects, pendingReleases, pendingHandoff, serialHistory, searchFilter, defectTypeFilter, statusFilter, dateFilter, captureDateFrom, captureDateTo, groupBySerial, mainColFilters]);

  // Toggle expandir serial
  const toggleExpand = (serial) => {
    setExpandedSerials(prev => ({
      ...prev,
      [serial]: !prev[serial]
    }));
  };

  // Expandir/colapsar todos
  const expandAll = () => {
    const allSerials = {};
    filteredGroups.forEach(g => { allSerials[g.serial] = true; });
    setExpandedSerials(allSerials);
  };

  const collapseAll = () => {
    setExpandedSerials({});
  };

  // Exportar a Excel TODOS los datos (llama al backend con export=true)
  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const effectiveClientId = clientId || (allDefects.length > 0 ? (allDefects[0].clientId || allDefects[0].client_id) : null);

      // Llamar al backend con export=true para obtener TODOS los datos
      const params = new URLSearchParams();
      params.append('export', 'true');
      if (effectiveClientId) params.append('clientId', effectiveClientId);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/defects-v2/all?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!result.success) {
        alert(result.message || 'Error obteniendo datos');
        return;
      }

      let allData = result.defects || [];

      // Aplicar filtros del frontend
      if (searchFilter.trim()) {
        const search = searchFilter.toLowerCase();
        allData = allData.filter(d => {
          const entry = (d.entryNumber || d.entry_number || '').toLowerCase();
          const serial = (d.serialNumber || d.serial_number || d.lotNumber || d.lot_number || '').toLowerCase();
          const part = (d.partNumber || d.part_number || '').toLowerCase();
          const partName = (d.partName || d.part_name || '').toLowerCase();
          const workOrder = (d.workOrder || d.work_order || '').toLowerCase();
          return entry.includes(search) || serial.includes(search) || part.includes(search) || partName.includes(search) || workOrder.includes(search);
        });
      }

      if (defectTypeFilter) {
        allData = allData.filter(d => {
          const typeId = d.defectTypeId || d.defect_type_id;
          return typeId === parseInt(defectTypeFilter);
        });
      }

      if (allData.length === 0) {
        alert(language === 'es' ? 'No hay datos para exportar' : 'No data to export');
        return;
      }

      // Formatear filas
      const rows = allData.map(defect => ({
        'Entry': defect.entryNumber || defect.entry_number || '',
        'Serial': defect.serialNumber || defect.serial_number || defect.lotNumber || defect.lot_number || '',
        [language === 'es' ? 'Parte' : 'Part']: defect.partNumber || defect.part_number || '',
        [language === 'es' ? 'Ubicación' : 'Location']: defect.locationCode || defect.location_code || '',
        [language === 'es' ? 'Departamento' : 'Department']: defect.departmentName || defect.department_name || '',
        [language === 'es' ? 'Tipo Defecto' : 'Defect Type']: defect.defectTypeName || defect.defect_type_name || '',
        [language === 'es' ? 'Estado' : 'Status']: defect.repairStatus || defect.repair_status || 'OPEN',
        [language === 'es' ? 'Reprocesos' : 'Reprocesses']: defect.repairAttempts || defect.repair_attempts || 0,
        [language === 'es' ? 'Últ. Acción' : 'Last Action']: (() => {
          const st = defect.repairStatus || defect.repair_status || 'OPEN';
          if (st === 'SCRAPPED' || st === 'SCRAP_CONFIRMED') return defect.scrappedByName || defect.scrapped_by_name || '';
          if (st === 'RELEASED' || st === 'CLOSED') return defect.releasedByName || defect.released_by_name || '';
          if (st === 'IN_REPAIR') return defect.repairingByName || defect.repairing_by_name || defect.repairedByName || defect.repaired_by_name || '';
          if (st === 'REPAIRED' || st === 'IN_VALIDATION' || st === 'QUARANTINE') return defect.repairedByName || defect.repaired_by_name || '';
          return defect.capturedByName || defect.captured_by_name || '';
        })(),
        [language === 'es' ? 'Capturado Por' : 'Captured By']: defect.capturedByName || defect.captured_by_name || '',
        [language === 'es' ? 'Fecha' : 'Date']: defect.capturedAt || defect.captured_at ? new Date(defect.capturedAt || defect.captured_at).toLocaleDateString('es-MX') : ''
      }));

      // Crear workbook y worksheet
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();

      // Nombre del tab según tab activo
      const tabNames = {
        general: 'General',
        repairs: 'Pendientes',
        inRepair: 'En_Reparacion',
        releases: 'Liberaciones'
      };
      const sheetName = tabNames[activeTab] || 'Datos';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generar nombre de archivo con fecha
      const today = new Date().toISOString().split('T')[0];
      const fileName = `hospital_defectos_${sheetName.toLowerCase()}_${today}.xlsx`;

      // Descargar
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting:', err);
      alert(language === 'es' ? 'Error al exportar' : 'Export error');
    }
  };

  // Generar reporte según tipo y formato
  const generateReport = async (format) => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      let reportData = [];
      let reportTitle = '';

      // Obtener clientId de los defectos cargados o usar 1 por defecto
      const effectiveClientId = clientId || (allDefects.length > 0 ? (allDefects[0].clientId || allDefects[0].client_id) : null);

      // Si ya tenemos preview y no es preview mode, usar los datos existentes
      if (format !== 'preview' && reportPreview && reportPreview.length > 0) {
        reportData = reportPreview;
        reportTitle = `Reporte_${reportType}`;
      } else {

      // Obtener datos según tipo de reporte
      if (reportType === 'lot') {
        if (!reportLot.trim()) {
          alert(language === 'es' ? 'Ingresa un número de lote' : 'Enter a lot number');
          setReportLoading(false);
          return;
        }
        const response = await fetch(`${API_URL}/defects-v2/report/by-lot?lot=${encodeURIComponent(reportLot.trim())}&clientId=${effectiveClientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          reportData = result.data || [];
          reportTitle = `Reporte_Lote_${reportLot.trim()}`;
        } else {
          alert(result.message || 'Error obteniendo datos');
          setReportLoading(false);
          return;
        }
      } else if (reportType === 'dateRange') {
        if (!reportDateFrom || !reportDateTo) {
          alert(language === 'es' ? 'Selecciona fechas de inicio y fin' : 'Select start and end dates');
          setReportLoading(false);
          return;
        }
        const response = await fetch(`${API_URL}/defects-v2/report/by-date-range?dateFrom=${reportDateFrom}&dateTo=${reportDateTo}&clientId=${effectiveClientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          reportData = result.data || [];
          reportTitle = `Reporte_${reportDateFrom}_a_${reportDateTo}`;
        } else {
          alert(result.message || 'Error obteniendo datos');
          setReportLoading(false);
          return;
        }
      } else if (reportType === 'serialList') {
        if (!reportSerialList.trim()) {
          alert(language === 'es' ? 'Ingresa al menos un serial' : 'Enter at least one serial');
          setReportLoading(false);
          return;
        }
        // Parsear lista de seriales (por línea o por coma)
        const serials = reportSerialList
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        const response = await fetch(`${API_URL}/defects-v2/report/by-serial-list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ serials, clientId: effectiveClientId })
        });
        const result = await response.json();
        if (result.success) {
          reportData = result.data || [];
          reportTitle = `Reporte_Seriales_${serials.length}`;
        } else {
          alert(result.message || 'Error obteniendo datos');
          setReportLoading(false);
          return;
        }
      } else if (reportType === 'currentTable') {
        // Obtener TODOS los datos del backend con los filtros actuales (sin paginación)
        const params = new URLSearchParams();
        params.append('export', 'true');
        if (effectiveClientId) params.append('clientId', effectiveClientId);
        if (statusFilter) params.append('status', statusFilter);

        const response = await fetch(`${API_URL}/defects-v2/all?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
          let rows = result.defects || [];

          // Aplicar filtros adicionales del frontend (búsqueda, tipo defecto, fecha)
          if (searchFilter.trim()) {
            const search = searchFilter.toLowerCase();
            rows = rows.filter(d => {
              const entry = (d.entryNumber || d.entry_number || '').toLowerCase();
              const serial = (d.serialNumber || d.serial_number || d.lotNumber || d.lot_number || '').toLowerCase();
              const part = (d.partNumber || d.part_number || '').toLowerCase();
              const partName = (d.partName || d.part_name || '').toLowerCase();
              const workOrder = (d.workOrder || d.work_order || '').toLowerCase();
              return entry.includes(search) || serial.includes(search) || part.includes(search) || partName.includes(search) || workOrder.includes(search);
            });
          }

          if (defectTypeFilter) {
            rows = rows.filter(d => {
              const typeId = d.defectTypeId || d.defect_type_id;
              return typeId === parseInt(defectTypeFilter);
            });
          }

          reportData = rows;
          reportTitle = `Reporte_TablaActual`;
        } else {
          alert(result.message || 'Error obteniendo datos');
          setReportLoading(false);
          return;
        }
        }
      } // cierre del else de "si ya tenemos preview"

      if (reportData.length === 0) {
        alert(language === 'es' ? 'No se encontraron datos para el reporte' : 'No data found for report');
        setReportLoading(false);
        return;
      }

      // Si es modo preview, solo guardar los datos y salir
      if (format === 'preview') {
        setReportPreview(reportData);
        setReportLoading(false);
        return;
      }

      // Formatear datos para exportar
      const formattedRows = reportData.map(row => {
        if (format === 'raw') {
          // Raw: todos los campos disponibles
          return {
            'entry_number': row.entryNumber || row.entry_number || '',
            'serial_number': row.serialNumber || row.serial_number || '',
            'lot_number': row.lotNumber || row.lot_number || '',
            'part_number': row.partNumber || row.part_number || '',
            'part_name': row.partName || row.part_name || '',
            'defect_code': row.defectCode || row.defect_code || '',
            'defect_name': row.defectTypeName || row.defect_type_name || '',
            'category_name': row.categoryName || row.category_name || '',
            'station_name': row.stationName || row.station_name || '',
            'repair_status': row.repairStatus || row.repair_status || '',
            'department_name': row.departmentName || row.department_name || '',
            'location_code': row.locationCode || row.location_code || '',
            'repair_attempts': row.repairAttempts || row.repair_attempts || 0,
            'is_reprocess': row.isReprocess || row.is_reprocess || false,
            'captured_by_name': row.capturedByName || row.captured_by_name || '',
            'captured_at': row.capturedAt || row.captured_at || '',
            'repaired_by_name': row.repairedByName || row.repaired_by_name || '',
            'repaired_at': row.repairedAt || row.repaired_at || '',
            'released_by_name': row.releasedByName || row.released_by_name || '',
            'released_at': row.releasedAt || row.released_at || '',
            'repair_notes': row.repairNotes || row.repair_notes || '',
            'release_notes': row.releaseNotes || row.release_notes || ''
          };
        } else {
          // CSV/Excel formateado
          return {
            'Entry': row.entryNumber || row.entry_number || '',
            'Serial': row.serialNumber || row.serial_number || row.lotNumber || row.lot_number || '',
            'Lote': row.lotNumber || row.lot_number || '',
            'Parte': row.partNumber || row.part_number || '',
            'Defecto': row.defectTypeName || row.defect_type_name || '',
            'Categoría': row.categoryName || row.category_name || '',
            'Estación': row.stationName || row.station_name || '',
            'Estado': row.repairStatus || row.repair_status || '',
            'Departamento': row.departmentName || row.department_name || '',
            'Ubicación': row.locationCode || row.location_code || '',
            'Reproceso': (row.isReprocess || row.is_reprocess) ? 'Sí' : 'No',
            'Capturado Por': row.capturedByName || row.captured_by_name || '',
            'Fecha Captura': row.capturedAt || row.captured_at ? new Date(row.capturedAt || row.captured_at).toLocaleString('es-MX') : '',
            'Reparado Por': row.repairedByName || row.repaired_by_name || '',
            'Fecha Reparación': row.repairedAt || row.repaired_at ? new Date(row.repairedAt || row.repaired_at).toLocaleString('es-MX') : '',
            'Liberado Por': row.releasedByName || row.released_by_name || '',
            'Fecha Liberación': row.releasedAt || row.released_at ? new Date(row.releasedAt || row.released_at).toLocaleString('es-MX') : ''
          };
        }
      });

      // Generar archivo
      const today = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        // Generar CSV
        const headers = Object.keys(formattedRows[0]);
        const csvContent = [
          headers.join(','),
          ...formattedRows.map(row =>
            headers.map(h => {
              const val = row[h] || '';
              // Escapar comillas y envolver en comillas si contiene coma
              if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return val;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${reportTitle}_${today}.csv`;
        link.click();
      } else {
        // Excel (formateado o raw)
        const ws = XLSX.utils.json_to_sheet(formattedRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, format === 'raw' ? 'Raw_Data' : 'Reporte');

        const fileName = format === 'raw'
          ? `${reportTitle}_RAW_${today}.xlsx`
          : `${reportTitle}_${today}.xlsx`;

        XLSX.writeFile(wb, fileName);
      }

      setSuccess(language === 'es' ? 'Reporte generado exitosamente' : 'Report generated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error generating report:', error);
      alert(language === 'es' ? 'Error generando reporte' : 'Error generating report');
    } finally {
      setReportLoading(false);
    }
  };

  // Verificar campañas MRB pendientes antes de disposición
  const checkMrbBeforeDispose = async (defect) => {
    try {
      const serial = defect.serialNumber || defect.serial_number;
      const result = await checkCanDispose(serial, defect.id);
      if (result.success && !result.canDispose) {
        setMrbPendingCampaigns(result.pendingCampaigns || []);
        setMrbWarningDefect(defect);
        setMrbWarningOpen(true);
        return false; // No puede disponer
      }
      return true; // Puede continuar
    } catch (err) {
      console.error('Error checking MRB:', err);
      return true; // Si falla, permitir continuar
    }
  };

  // Enviar a Cuarentena (desde modal de advertencia MRB)
  const sendToMrbFromWarning = async () => {
    if (!mrbWarningDefect) return;
    setMrbWarningOpen(false);
    setLoading(true);
    try {
      const result = await quarantineDefect(mrbWarningDefect.id, 'Enviado a cuarentena - Pendiente inspección MRB');
      if (result?.success) {
        setSuccess(language === 'es' ? 'Enviado a Cuarentena' : 'Sent to Quarantine');
        setActiveTab('mrb');
        loadData();
      } else {
        setError(result?.message || 'Error al enviar a cuarentena');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
      setMrbWarningDefect(null);
    }
  };

  // Abrir modal de acción
  const openActionModal = async (action, defect) => {
    // Validación de permisos según acción
    if ((action === 'start' || action === 'complete') && !canDoRepairActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de reparación' : 'You do not have repair permissions');
      return;
    }
    if ((action === 'release' || action === 'reject') && !canDoReleaseActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de liberación' : 'You do not have release permissions');
      return;
    }

    // Verificar campañas MRB pendientes antes de disposición (release/reject)
    if (action === 'release' || action === 'reject') {
      const canProceed = await checkMrbBeforeDispose(defect);
      if (!canProceed) return;
    }

    // Verificar si necesita estación de sesión
    if (action === 'start' && !sessionRepairStation && repairStations.length > 0) {
      // Guardar el defecto y acción pendiente, abrir selector de estación
      setSelectedDefect(defect);
      setModalAction(action);
      openStationSelector('REPAIR');
      return;
    }
    if (action === 'release' && !sessionReleaseStation && releaseStations.length > 0) {
      setSelectedDefect(defect);
      setModalAction(action);
      openStationSelector('RELEASE');
      return;
    }

    setSelectedDefect(defect);
    setModalAction(action);

    // Calcular tiempo de reparación: desde localStartTime o repair_started_at
    let calculatedRepairTime = 5; // default
    if (defect.localStartTime) {
      calculatedRepairTime = Math.max(1, Math.floor((Date.now() - defect.localStartTime) / 60000));
    } else if (defect.repairStartedAt || defect.repair_started_at) {
      const startTime = new Date(defect.repairStartedAt || defect.repair_started_at).getTime();
      calculatedRepairTime = Math.max(1, Math.floor((Date.now() - startTime) / 60000));
    }

    setFormData({
      repairTypeId: repairTypes[0]?.id || '',
      repairTimeMinutes: calculatedRepairTime,
      repairNotes: '',
      repairStationId: sessionRepairStation?.id || '',
      releaseReasonId: releaseReasons[0]?.id || '',
      releaseTimeMinutes: 1,
      releaseNotes: '',
      releaseStationId: sessionReleaseStation?.id || '',
      rootCauseId: '',
      rejectNotes: '',
      newDepartmentId: '',  // Sin reasignación por defecto
      deviationId: '',      // Sin desviación por defecto
      reverificationResult: '',
      reverificationValue: ''
    });

    // Resetear desviaciones y spec info antes de cargar nuevas
    setAvailableDeviations([]);
    setSpecInfo(null);

    // Cargar desviaciones disponibles si es acción de release o complete
    if (action === 'release' || action === 'complete') {
      const clientId = defect.clientId || defect.client_id;
      const partId = defect.partId || defect.part_id;
      console.log('[openActionModal] Loading deviations for action:', action, 'clientId:', clientId, 'partId:', partId);
      // Cargar desviaciones activas (filtradas por cliente y parte si están disponibles)
      getDeviations({ clientId: clientId || undefined, partId: partId || undefined, status: 'ACTIVE' })
        .then(response => {
          console.log('[openActionModal] Deviations response:', response);
          if (response.success && response.deviations) {
            setAvailableDeviations(response.deviations);
          }
        })
        .catch(err => console.error('[openActionModal] Error loading deviations:', err));
    }

    // Cargar info de spec para re-verificación si es acción de release
    if (action === 'release') {
      setLoadingSpecInfo(true);
      const defectId = defect.id;
      fetch(`${API_URL}/defects-v2/entries/${defectId}/spec-info`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => {
          console.log('[openActionModal] Spec info response:', data);
          if (data.success && data.hasSpec) {
            setSpecInfo(data);
          }
        })
        .catch(err => console.error('[openActionModal] Error loading spec info:', err))
        .finally(() => setLoadingSpecInfo(false));
    }

    setModalOpen(true);
  };

  // Ejecutar acción
  const executeAction = async () => {
    if (!selectedDefect) return;

    // Validación de permisos según acción
    if ((modalAction === 'start' || modalAction === 'complete') && !canDoRepairActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de reparación' : 'You do not have repair permissions');
      return;
    }
    if ((modalAction === 'release' || modalAction === 'reject') && !canDoReleaseActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de liberación' : 'You do not have release permissions');
      return;
    }

    // Validación: si se reasigna departamento, el comentario es obligatorio
    if (modalAction === 'complete' && formData.newDepartmentId && !formData.repairNotes.trim()) {
      setError(L.commentRequired);
      return;
    }

    // Validación: Root Cause es obligatorio al completar reparación
    if (modalAction === 'complete' && !formData.rootCauseId) {
      setError(language === 'es' ? 'Causa Raíz es obligatoria' : 'Root Cause is required');
      return;
    }

    // Validación: Si reject va a REPAIR, debe tener estación seleccionada
    if (modalAction === 'reject' && rejectDestination === 'REPAIR' && !rejectSelectedStation) {
      setError(language === 'es' ? 'Debe seleccionar una estación de reparación' : 'Must select a repair station');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result;
      switch (modalAction) {
        case 'start':
          result = await startRepair(selectedDefect.id, formData.repairStationId || null);
          setSuccess(L.repairStarted);
          break;

        case 'complete':
          result = await completeRepair(selectedDefect.id, {
            repairTypeId: formData.repairTypeId,
            repairTimeMinutes: formData.repairTimeMinutes,
            notes: formData.repairNotes,
            rootCauseId: formData.rootCauseId || null,
            newDepartmentId: formData.newDepartmentId || null,
            deviationId: formData.deviationId || null
          });
          // Si se vinculó una desviación, también crear el link
          if (formData.deviationId && result?.success) {
            try {
              await fetch(`${API_URL}/deviations/${formData.deviationId}/link-defect`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ defectId: selectedDefect.id, notes: formData.repairNotes })
              });
            } catch (linkErr) {
              console.error('Error linking deviation:', linkErr);
            }
          }
          setSuccess(formData.deviationId
            ? (language === 'es' ? 'Reparación completada y vinculada a desviación' : 'Repair completed and linked to deviation')
            : (formData.newDepartmentId
              ? (language === 'es' ? 'Reparación completada y área reasignada' : 'Repair completed and area reassigned')
              : L.repairCompleted));
          break;

        case 'release':
          result = await releaseDefect(selectedDefect.id, {
            releaseReasonId: formData.releaseReasonId,
            releaseTimeMinutes: formData.releaseTimeMinutes,
            notes: formData.releaseNotes,
            releaseStationId: formData.releaseStationId || null,
            newDepartmentId: formData.newDepartmentId || null,
            deviationId: formData.deviationId || null,
            reverificationResult: formData.reverificationResult || null,
            reverificationValue: formData.reverificationValue ? parseFloat(formData.reverificationValue) : null
          });
          setSuccess(formData.deviationId
            ? (language === 'es' ? 'Defecto liberado con desviación vinculada' : 'Defect released with linked deviation')
            : (formData.newDepartmentId
              ? (language === 'es' ? 'Defecto liberado y área reasignada' : 'Defect released and area reassigned')
              : L.defectReleased));
          break;

        case 'reject':
          result = await rejectDefect(
            selectedDefect.id,
            formData.rejectNotes,
            rejectDestination,
            rejectDestination === 'REPAIR' ? rejectSelectedStation?.id : null
          );
          const destLabel = rejectDestination === 'REPAIR'
            ? (language === 'es' ? 'Reparaciones' : 'Repairs') + (rejectSelectedStation ? ` → ${rejectSelectedStation.code}` : '')
            : rejectDestination === 'SCRAP'
              ? 'Scrap'
              : 'MRB';
          setSuccess(language === 'es'
            ? `Defecto rechazado → ${destLabel}`
            : `Defect rejected → ${destLabel}`);
          // Limpiar estados de reject
          setRejectDestination('REPAIR');
          setRejectSelectedStation(null);
          setRejectStationCode('');
          break;

        default:
          break;
      }

      if (result?.error || result?.success === false) {
        setError(result.error || result.message || 'Error desconocido');
      } else {
        setModalOpen(false);
        const defectId = selectedDefect?.id;

        // Limpiar el defecto de locallyStartedRepairs si se completó la reparación
        if (defectId && locallyStartedRepairs[defectId]) {
          setLocallyStartedRepairs(prev => {
            const newState = { ...prev };
            delete newState[defectId];
            return newState;
          });

          // Si quedan más reparaciones locales en progreso, solo quitar este defecto de las listas
          // en vez de recargar todo (para no perder los otros que están en progreso)
          const remainingLocalRepairs = Object.keys(locallyStartedRepairs).filter(id => id !== String(defectId));
          if (remainingLocalRepairs.length > 0) {
            // Quitar defecto completado de pendingRepairs y inRepairDefects
            setPendingRepairs(prev => prev.filter(d => d.id !== defectId));
            setInRepairDefects(prev => prev.filter(d => d.id !== defectId));
            return; // No llamar loadData
          }
        }

        // Quitar de ambas listas
        setPendingRepairs(prev => prev.filter(d => d.id !== defectId));
        setInRepairDefects(prev => prev.filter(d => d.id !== defectId));
        loadData();
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar reparación rápida (sin modal)
  const quickStartRepair = async (defect) => {
    // Validación de permisos
    if (!canDoRepairActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de reparación' : 'You do not have repair permissions');
      return;
    }
    const defectId = defect.id;
    // Evitar doble click
    if (locallyStartedRepairs[defectId]) {
      return;
    }
    setLoading(true);
    try {
      const result = await startRepair(defectId);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(`${L.repairStarted}: ${defect.entryNumber || defect.entry_number}`);
        const startTime = Date.now();

        // Guardar tiempo de inicio localmente para mostrar contador
        setLocallyStartedRepairs(prev => ({
          ...prev,
          [defectId]: startTime
        }));

        // Mover de pendingRepairs a inRepairDefects
        // pendingWithLocation incluirá este defecto desde inRepairDefects (myInRepair)
        const updatedDefect = {
          ...defect,
          repairStatus: 'IN_REPAIR',
          repair_status: 'IN_REPAIR',
          repairStartedAt: new Date().toISOString(),
          repair_started_at: new Date().toISOString(),
          repairedBy: user.id,
          repaired_by: user.id
        };
        setPendingRepairs(prev => prev.filter(d => d.id !== defectId));
        setInRepairDefects(prev => [updatedDefect, ...prev]);
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Doble click handler - abre modal según estado (con validación de permisos)
  const handleDoubleClick = (defect) => {
    const status = defect.repairStatus || defect.repair_status || 'OPEN';
    const hasLocation = defect.currentLocationId || defect.current_location_id;

    // Acciones de reparación: requieren permiso de reparación
    if (status === 'OPEN' || status === 'IN_REPAIR' || status === 'REJECTED' || status === 'QUARANTINE') {
      if (!canDoRepairActions) {
        setError(language === 'es' ? 'No tienes permisos para acciones de reparación' : 'You do not have repair permissions');
        return;
      }

      if (status === 'OPEN') {
        if (!hasLocation) {
          setError(L.locationRequired);
          openAssignLocationModal(defect);
          return;
        }
        quickStartRepair(defect);
      } else if (status === 'IN_REPAIR') {
        openActionModal('complete', defect);
      } else if (status === 'REJECTED' || status === 'QUARANTINE') {
        if (!hasLocation) {
          setError(L.locationRequired);
          openAssignLocationModal(defect);
          return;
        }
        quickStartRepair(defect);
      }
    }
    // Acciones de liberación: requieren permiso de liberación
    else if (status === 'REPAIRED' || status === 'IN_VALIDATION') {
      if (!canDoReleaseActions) {
        setError(language === 'es' ? 'No tienes permisos para acciones de liberación' : 'You do not have release permissions');
        return;
      }
      openActionModal('release', defect);
    }
  };

  // Cuarentena - no se puede reparar, pendiente decisión
  const handleQuarantine = async (defect) => {
    // Validación de permisos
    if (!canDoRepairActions) {
      setError(language === 'es' ? 'No tienes permisos para acciones de reparación' : 'You do not have repair permissions');
      return;
    }
    // Verificar campañas MRB pendientes
    const canProceed = await checkMrbBeforeDispose(defect);
    if (!canProceed) return;

    const notes = window.prompt('Motivo de cuarentena (no se puede reparar):');
    if (notes !== null) {
      setLoading(true);
      try {
        const result = await quarantineDefect(defect.id, notes);
        if (result?.error || result?.success === false) {
          setError(result.error || result.message || 'Error al enviar a cuarentena');
        } else {
          setSuccess(L.sentToQuarantine);
          loadData();
        }
      } catch (err) {
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Scrap - descartar pieza
  const handleScrap = async (defect) => {
    // Validación de permisos
    if (!canDoScrapActions) {
      setError(language === 'es' ? 'No tienes permisos para enviar a SCRAP' : 'You do not have SCRAP permissions');
      return;
    }
    // Verificar campañas MRB pendientes
    const canProceed = await checkMrbBeforeDispose(defect);
    if (!canProceed) return;

    const confirmed = window.confirm('¿Confirmas enviar a SCRAP? Esta acción no se puede deshacer.');
    if (confirmed) {
      const notes = window.prompt('Motivo del scrap:');
      if (notes !== null) {
        setLoading(true);
        try {
          const result = await scrapDefect(defect.id, notes);
          if (result?.error || result?.success === false) {
            setError(result.error || result.message || 'Error al enviar a scrap');
          } else {
            setSuccess(L.sentToScrap);
            loadData();
          }
        } catch (err) {
          setError('Error: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // ============================================================================
  // MODAL ASIGNAR UBICACIÓN
  // ============================================================================

  const openAssignLocationModal = async (defect = null) => {
    setShowAssignLocation(true);
    setAssignLocationCode('');
    setAssignLocationData(null);
    setAssignSerialInput('');
    setAssignResults(null);
    setAssignSingleDefect(defect);

    // Si es asignación individual, pre-cargar el serial
    if (defect) {
      const serial = defect.serialNumber || defect.serial_number || defect.lotNumber || defect.lot_number;
      setAssignSerialsList([serial]);
    } else {
      setAssignSerialsList([]);
    }

    // Cargar ubicaciones disponibles
    try {
      const result = await getLocationCodes('REPAIR');
      setAvailableLocations(result?.locations || []);
    } catch (err) {
      console.error('Error cargando ubicaciones:', err);
      setAvailableLocations([]);
    }
    setTimeout(() => locationInputRef.current?.focus(), 100);
  };

  // Seleccionar ubicación de la lista
  const selectLocationFromList = (loc) => {
    setAssignLocationCode(loc.code);
    setAssignLocationData({
      code: loc.code,
      description: loc.description,
      locationType: loc.locationType || loc.location_type,
      stationName: loc.stationName || loc.station_name
    });
    setTimeout(() => serialInputRef.current?.focus(), 100);
  };

  const closeAssignLocationModal = () => {
    setShowAssignLocation(false);
    setAssignLocationCode('');
    setAssignLocationData(null);
    setAssignSerialInput('');
    setAssignSerialsList([]);
    setAssignResults(null);
    setAssignSingleDefect(null);
  };

  // Validar código de ubicación
  const handleLocationCodeScan = async (e) => {
    if (e.key !== 'Enter') return;
    const code = assignLocationCode.trim();
    if (!code) return;

    setAssignLoading(true);
    try {
      const result = await lookupLocationCode(code);
      if (result.success && result.location) {
        setAssignLocationData(result.location);
        setAssignResults(null);
        setTimeout(() => serialInputRef.current?.focus(), 100);
      } else {
        setError(result.error || L.locationNotFound);
        setAssignLocationData(null);
      }
    } catch (err) {
      setError('Error buscando ubicación: ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // Agregar serial a la lista
  const handleSerialScan = (e) => {
    if (e.key !== 'Enter') return;
    const serial = assignSerialInput.trim();
    if (!serial) return;

    // Evitar duplicados
    if (!assignSerialsList.includes(serial)) {
      setAssignSerialsList(prev => [...prev, serial]);
    }
    setAssignSerialInput('');
  };

  // Manejar pegado de múltiples seriales desde Excel
  const handleSerialPaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // Separar por líneas, tabs, comas o punto y coma
    const serials = pastedText
      .split(/[\n\r\t,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serials.length > 0) {
      // Agregar todos los seriales que no estén duplicados
      setAssignSerialsList(prev => {
        const newList = [...prev];
        serials.forEach(serial => {
          if (!newList.includes(serial)) {
            newList.push(serial);
          }
        });
        return newList;
      });
      setAssignSerialInput('');
    }
  };

  // Remover serial de la lista
  const removeSerial = (serial) => {
    setAssignSerialsList(prev => prev.filter(s => s !== serial));
  };

  // Ejecutar asignación batch
  const executeAssignLocation = async () => {
    if (!assignLocationData || assignSerialsList.length === 0) return;

    setAssignLoading(true);
    setAssignResults(null);
    try {
      const result = await assignToLocation(assignLocationData.code, assignSerialsList);
      if (result.success) {
        setAssignResults(result.results);
        setAssignSerialsList([]); // Limpiar lista
        setSuccess(`${result.results.assigned.length} ${L.serialsAssigned} ${assignLocationData.code}`);
        loadData(); // Refrescar datos
      } else {
        setError(result.error || 'Error en la asignación');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // ============================================================================
  // MODAL ENTREGAR A QA (Handoff)
  // ============================================================================

  const openHandoffQAModal = () => {
    setShowHandoffQA(true);
    setHandoffLocationCode('');
    setHandoffLocationData(null);
    setHandoffSerialInput('');
    setHandoffSerialsList([]);
    setHandoffResults(null);
    setTimeout(() => handoffLocationInputRef.current?.focus(), 100);
  };

  const closeHandoffQAModal = () => {
    setShowHandoffQA(false);
    setHandoffLocationCode('');
    setHandoffLocationData(null);
    setHandoffSerialInput('');
    setHandoffSerialsList([]);
    setHandoffResults(null);
  };

  // Validar código de ubicación (solo RELEASE)
  const handleHandoffLocationScan = async (e) => {
    if (e.key !== 'Enter') return;
    const code = handoffLocationCode.trim();
    if (!code) return;

    setHandoffLoading(true);
    try {
      const result = await lookupLocationCode(code);
      if (result.success && result.location) {
        // Verificar que sea tipo RELEASE
        if (result.location.locationType !== 'RELEASE') {
          setError(language === 'es'
            ? `Ubicación "${code}" no es de tipo RELEASE. Use una estación de liberación.`
            : `Location "${code}" is not RELEASE type. Use a release station.`);
          setHandoffLocationData(null);
        } else {
          setHandoffLocationData(result.location);
          setHandoffResults(null);
          setTimeout(() => handoffSerialInputRef.current?.focus(), 100);
        }
      } else {
        setError(result.error || L.locationNotFound);
        setHandoffLocationData(null);
      }
    } catch (err) {
      setError('Error buscando ubicación: ' + err.message);
    } finally {
      setHandoffLoading(false);
    }
  };

  // Agregar serial a la lista de handoff
  const handleHandoffSerialScan = (e) => {
    if (e.key !== 'Enter') return;
    const serial = handoffSerialInput.trim();
    if (!serial) return;

    if (!handoffSerialsList.includes(serial)) {
      setHandoffSerialsList(prev => [...prev, serial]);
    }
    setHandoffSerialInput('');
  };

  // Remover serial de la lista de handoff
  const removeHandoffSerial = (serial) => {
    setHandoffSerialsList(prev => prev.filter(s => s !== serial));
  };

  // Ejecutar entrega a QA
  const executeHandoffQA = async () => {
    if (!handoffLocationData || handoffSerialsList.length === 0) return;

    setHandoffLoading(true);
    setHandoffResults(null);
    try {
      const result = await assignToLocation(handoffLocationData.code, handoffSerialsList);
      if (result.success) {
        setHandoffResults(result.results);
        setHandoffSerialsList([]);
        setSuccess(`${result.results.assigned.length} ${L.piecesDelivered} ${handoffLocationData.code}`);
        loadData();
      } else {
        setError(result.error || 'Error en la entrega');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setHandoffLoading(false);
    }
  };

  // Ejecutar Handoff masivo (enviar a QA, SCRAP o Cuarentena)
  const executeHandoffMasivo = async () => {
    if (selectedForHandoff.size === 0) return;

    // Validar que si es QA, tenga estación seleccionada
    if (handoffDestination === 'QA' && !handoffSelectedStation) {
      setError(language === 'es' ? 'Debe seleccionar una estación de destino' : 'Must select a destination station');
      return;
    }

    // Validar que si es MRB (QUARANTINE o SCRAP), tenga location MRB seleccionada
    if ((handoffDestination === 'QUARANTINE' || handoffDestination === 'SCRAP') && !selectedMrbLocation) {
      setError(language === 'es' ? 'Debe seleccionar una location MRB de destino' : 'Must select a destination MRB location');
      return;
    }

    setHandoffLoading(true);
    try {
      const defectIds = Array.from(selectedForHandoff);
      // Usar la estación seleccionada en el modal para QA, o locationId para MRB
      const stationId = handoffDestination === 'QA' ? handoffSelectedStation?.id : null;
      const mrbLocationId = (handoffDestination === 'QUARANTINE' || handoffDestination === 'SCRAP') ? selectedMrbLocation?.id : null;
      const mrbCampaignId = selectedMrbCampaign?.id || null;
      const result = await handoffDefects(defectIds, handoffDestination, handoffNotes, stationId, mrbLocationId, mrbCampaignId);

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const stationInfo = handoffSelectedStation ? ` → ${handoffSelectedStation.code}` : '';
        const mrbInfo = selectedMrbLocation ? ` → ${selectedMrbLocation.code}` : '';
        setSuccess(language === 'es'
          ? `${successCount} defecto(s) enviado(s) a ${handoffDestination === 'QA' ? 'Calidad' + stationInfo : handoffDestination === 'SCRAP' ? 'Scrap' + mrbInfo : 'Cuarentena' + mrbInfo}`
          : `${successCount} defect(s) sent to ${handoffDestination === 'QA' ? 'QA' + stationInfo : handoffDestination === 'SCRAP' ? 'Scrap' + mrbInfo : 'Quarantine' + mrbInfo}`
        );
        setSelectedForHandoff(new Set());
        setShowHandoffModal(false);
        setHandoffNotes('');
        setHandoffSelectedStation(null);
        setHandoffStationCode('');
        setSelectedMrbLocation(null);
        setSelectedMrbCampaign(null);
        loadData();
      } else {
        setError(result.message || 'Error en handoff');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setHandoffLoading(false);
    }
  };

  // Toggle selección para handoff
  const toggleHandoffSelection = (defectId) => {
    setSelectedForHandoff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(defectId)) {
        newSet.delete(defectId);
      } else {
        newSet.add(defectId);
      }
      return newSet;
    });
  };

  // Seleccionar/deseleccionar todos para handoff
  const toggleAllHandoffSelection = () => {
    if (selectedForHandoff.size === pendingHandoff.length) {
      setSelectedForHandoff(new Set());
    } else {
      setSelectedForHandoff(new Set(pendingHandoff.map(d => d.id)));
    }
  };

  // ============================================================================
  // TRAZABILIDAD - Historial por Serial
  // ============================================================================

  const handleTraceSearch = async (e) => {
    if (e.key !== 'Enter') return;
    const serial = traceSerial.trim();
    if (!serial) return;

    setTraceLoading(true);
    setTraceDefects([]);
    setTraceEvents([]);

    try {
      // Buscar todos los defectos de este serial
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/defects-v2/by-serial/${encodeURIComponent(serial)}?includeHistory=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await response.json();

      if (result.success) {
        setTraceDefects(result.defects || []);

        // Cargar eventos de cada defecto
        const allEvents = [];
        for (const defect of (result.defects || [])) {
          try {
            const eventsResult = await getDefectEvents(defect.id);
            if (eventsResult.success && eventsResult.events) {
              eventsResult.events.forEach(ev => {
                allEvents.push({
                  ...ev,
                  eventSource: 'defect',
                  defectId: defect.id,
                  entryNumber: defect.entryNumber || defect.entry_number,
                  defectTypeName: defect.defectTypeName || defect.defect_type_name
                });
              });
            }
          } catch (err) {
            console.warn(`Could not load events for defect ${defect.id}:`, err);
          }
        }

        // Agregar scans de estaciones como eventos
        if (result.stationScans && result.stationScans.length > 0) {
          result.stationScans.forEach(scan => {
            allEvents.push({
              eventSource: 'scan',
              eventType: 'STATION_SCAN',
              stationName: scan.stationName || scan.station_name,
              stationCode: scan.stationCode || scan.station_code,
              hasDefect: scan.hasDefect || scan.has_defect,
              defectCount: scan.defectCount || scan.defect_count || 0,
              scannedByName: scan.scannedByName || scan.scanned_by_name,
              createdAt: scan.scannedAt || scan.scanned_at,
              workOrder: scan.workOrder || scan.work_order
            });
          });
        }

        // Ordenar eventos por fecha descendente
        allEvents.sort((a, b) => new Date(b.createdAt || b.created_at || b.eventAt || b.event_at) - new Date(a.createdAt || a.created_at || a.eventAt || a.event_at));
        setTraceEvents(allEvents);

        const defectCount = result.defects?.length || 0;
        const scanCount = result.stationScans?.length || 0;
        setSuccess(language === 'es'
          ? `Encontrados ${defectCount} defecto(s) y ${scanCount} scan(s) para el serial ${serial}`
          : `Found ${defectCount} defect(s) and ${scanCount} scan(s) for serial ${serial}`);
      } else {
        setError(language === 'es'
          ? `No se encontraron datos para el serial: ${serial}`
          : `No data found for serial: ${serial}`);
      }
    } catch (err) {
      setError((language === 'es' ? 'Error buscando historial: ' : 'Error searching history: ') + err.message);
    } finally {
      setTraceLoading(false);
    }
  };

  // Exportar trazabilidad a PDF
  const exportTraceabilityPDF = async () => {
    if (traceDefects.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'es' ? 'Reporte de Trazabilidad' : 'Traceability Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Fecha del reporte
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${language === 'es' ? 'Fecha' : 'Date'}: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Info del producto
    const defect = traceDefects[0];
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'es' ? 'Información del Producto' : 'Product Information', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const productInfo = [
      [`${language === 'es' ? 'Serial/Lote' : 'Serial/Lot'}:`, defect.serialNumber || defect.serial_number || defect.lotNumber || defect.lot_number || '-'],
      [`${language === 'es' ? 'Número de Parte' : 'Part Number'}:`, `${defect.partNumber || defect.part_number || '-'} - ${defect.partName || defect.part_name || ''}`],
      [`${language === 'es' ? 'Cliente' : 'Client'}:`, defect.clientName || defect.client_name || '-'],
      [`${language === 'es' ? 'Proveedor' : 'Supplier'}:`, defect.supplierName || defect.supplier_name || '-']
    ];
    productInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, yPos);
      yPos += 6;
    });
    yPos += 5;

    // Tabla de defectos
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'es' ? 'Defectos Asociados' : 'Associated Defects', 14, yPos);
    yPos += 5;

    const defectRows = traceDefects.map(d => [
      d.entryNumber || d.entry_number || '-',
      d.defectTypeName || d.defect_type_name || '-',
      d.repairStatus || d.repair_status || '-',
      d.departmentName || d.department_name || '-',
      d.notes || d.defectNotes || d.defect_notes || '-',
      new Date(d.capturedAt || d.captured_at).toLocaleString('es-MX')
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [[
        'Entry',
        language === 'es' ? 'Tipo' : 'Type',
        language === 'es' ? 'Estado' : 'Status',
        language === 'es' ? 'Área' : 'Area',
        language === 'es' ? 'Comentarios' : 'Comments',
        language === 'es' ? 'Fecha' : 'Date'
      ]],
      body: defectRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 114, 206], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 28 },
        4: { cellWidth: 40 }
      }
    });

    yPos = doc.lastAutoTable?.finalY + 10 || yPos + 50;

    // Timeline de eventos
    if (traceEvents.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'es' ? 'Historial de Eventos' : 'Event History', 14, yPos);
      yPos += 5;

      const eventRows = traceEvents.map(e => [
        e.entryNumber || '-',
        formatEventType(e.eventType || e.event_type).label,
        e.performedByName || e.performed_by_name || '-',
        e.comments || '-',
        new Date(e.eventAt || e.event_at || e.createdAt || e.created_at).toLocaleString('es-MX')
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[
          'Entry',
          language === 'es' ? 'Evento' : 'Event',
          language === 'es' ? 'Realizado por' : 'Performed by',
          language === 'es' ? 'Comentarios' : 'Comments',
          language === 'es' ? 'Fecha/Hora' : 'Date/Time'
        ]],
        body: eventRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 114, 206], textColor: 255 },
        columnStyles: {
          3: { cellWidth: 45 }
        }
      });

      yPos = doc.lastAutoTable?.finalY + 10 || yPos + 50;
    }

    // Cargar fotos de cada defecto
    const token = localStorage.getItem('token');
    for (const defect of traceDefects) {
      try {
        const response = await fetch(
          `http://localhost:5000/defects-v2/entries/${defect.id}/attachments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();

        if (result.success && result.attachments?.length > 0) {
          // Filtrar solo imágenes
          const images = result.attachments.filter(a =>
            a.mimeType?.startsWith('image/') || a.mime_type?.startsWith('image/')
          );

          if (images.length > 0) {
            if (yPos > 200) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${language === 'es' ? 'Fotos de' : 'Photos of'} ${defect.entryNumber || defect.entry_number}`, 14, yPos);
            yPos += 8;

            for (const img of images) {
              try {
                const imgPath = img.filePath || img.file_path;
                const imgResponse = await fetch(
                  `http://localhost:5000/${imgPath}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (imgResponse.ok) {
                  const blob = await imgResponse.blob();
                  const reader = new FileReader();

                  await new Promise((resolve) => {
                    reader.onloadend = () => {
                      try {
                        if (yPos > 220) {
                          doc.addPage();
                          yPos = 20;
                        }
                        const imgData = reader.result;
                        doc.addImage(imgData, 'JPEG', 14, yPos, 60, 45);
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(img.originalName || img.original_name || 'image', 14, yPos + 48);
                        yPos += 55;
                      } catch (imgErr) {
                        console.warn('Error adding image to PDF:', imgErr);
                      }
                      resolve();
                    };
                    reader.readAsDataURL(blob);
                  });
                }
              } catch (imgErr) {
                console.warn('Error loading image:', imgErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error loading attachments for defect:', defect.id, err);
      }
    }

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${language === 'es' ? 'Página' : 'Page'} ${i} ${language === 'es' ? 'de' : 'of'} ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Guardar PDF
    const fileName = `Traceability_${traceSerial}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const formatEventType = (eventType) => {
    const types = {
      'CREATED': {
        label: language === 'es' ? 'Creado' : 'Created',
        color: '#3b82f6', icon: ''
      },
      'REPAIR_STARTED': {
        label: language === 'es' ? 'Reparación Iniciada' : 'Repair Started',
        color: '#f59e0b', icon: ''
      },
      'REPAIR_COMPLETED': {
        label: language === 'es' ? 'Reparación Completada' : 'Repair Completed',
        color: '#10b981', icon: ''
      },
      'RELEASED': {
        label: language === 'es' ? 'Liberado' : 'Released',
        color: '#22c55e', icon: ''
      },
      'REJECTED': {
        label: language === 'es' ? 'Rechazado' : 'Rejected',
        color: '#ef4444', icon: ''
      },
      'QUARANTINE': {
        label: language === 'es' ? 'Cuarentena' : 'Quarantine',
        color: '#6b7280', icon: ''
      },
      'SCRAPPED': {
        label: language === 'es' ? 'Scrap' : 'Scrapped',
        color: '#1f2937', icon: ''
      },
      'LOCATION_ASSIGNED': {
        label: language === 'es' ? 'Ubicación Asignada' : 'Location Assigned',
        color: '#8b5cf6', icon: ''
      },
      'DEPARTMENT_REASSIGNED': {
        label: language === 'es' ? 'Área Reasignada' : 'Department Reassigned',
        color: '#f97316', icon: ''
      },
      'STATUS_CHANGED': {
        label: language === 'es' ? 'Cambio de Estado' : 'Status Changed',
        color: '#6366f1', icon: ''
      },
      'DEVIATION_LINKED': {
        label: language === 'es' ? 'Desviación Vinculada' : 'Deviation Linked',
        color: '#8b5cf6', icon: ''
      },
      'STATION_SCAN': {
        label: language === 'es' ? 'Escaneo Estación' : 'Station Scan',
        color: '#06b6d4', icon: '📍'
      },
      'STATION_SCAN_OK': {
        label: 'OK',
        color: '#22c55e', icon: '✓'
      },
      'STATION_SCAN_NOK': {
        label: 'NOK',
        color: '#ef4444', icon: '✗'
      }
    };
    return types[eventType] || { label: eventType, color: '#6b7280', icon: '' };
  };

  // ============================================================================
  // SELECCIÓN MÚLTIPLE Y CAMBIO MASIVO DE RESPONSABLE
  // ============================================================================

  // Toggle selección de un defecto
  const toggleDefectSelection = (defectId) => {
    setSelectedDefects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(defectId)) {
        newSet.delete(defectId);
      } else {
        newSet.add(defectId);
      }
      return newSet;
    });
  };

  // Seleccionar todos los defectos visibles (filtrados)
  const selectAllVisible = () => {
    const allDefects = [];
    filteredGroups.forEach(group => {
      group.defects.forEach(d => {
        // Solo seleccionar defectos que no estén cerrados
        const status = d.repairStatus || d.repair_status || 'OPEN';
        if (status !== 'CLOSED' && status !== 'RELEASED' && status !== 'SCRAPPED') {
          allDefects.push(d.id);
        }
      });
    });
    setSelectedDefects(new Set(allDefects));
  };

  // Deseleccionar todos
  const clearSelection = () => {
    setSelectedDefects(new Set());
    setSelectedForHandoff(new Set());
    setSelectedForMrb(new Set());
  };

  // ============================================================================
  // ACTION BAR HANDLER - Maneja todas las acciones centralizadas
  // ============================================================================
  const handleActionBarAction = async (actionId, defects, actionConfig) => {
    console.log('ActionBar action:', actionId, 'Defects:', defects.length);

    // Obtener IDs de defectos
    const defectIds = defects.map(d => d.id);

    switch (actionId) {
      // WORKFLOW ACTIONS
      case 'START_REPAIR':
        // Validar que todos los defectos tengan ubicación
        const defectsWithoutLocation = defects.filter(d => !d.currentLocationId && !d.current_location_id);
        if (defectsWithoutLocation.length > 0) {
          setError(language === 'es'
            ? `${defectsWithoutLocation.length} defecto(s) sin ubicación asignada. Asigna ubicación primero.`
            : `${defectsWithoutLocation.length} defect(s) without location. Assign location first.`);
          // Abrir modal de asignar ubicación para el primero sin ubicación
          if (defectsWithoutLocation.length === 1) {
            setShowAssignLocation(true);
            setAssignSerialsList([defectsWithoutLocation[0].serialNumber || defectsWithoutLocation[0].serial_number || defectsWithoutLocation[0].lotNumber || defectsWithoutLocation[0].lot_number].filter(Boolean));
          }
          return;
        }
        // Para cada defecto, iniciar reparación
        for (const defect of defects) {
          await quickStartRepair(defect);
        }
        clearSelection();
        loadData();
        break;

      case 'COMPLETE_REPAIR':
        if (defects.length === 1) {
          openActionModal('complete', defects[0]);
        } else {
          setError(language === 'es' ? 'Selecciona un solo defecto para completar' : 'Select a single defect to complete');
        }
        break;

      case 'SEND_TO_QA':
        setHandoffDestination('QA');
        setHandoffNotes('');
        setHandoffSelectedStation(null);
        // Transferir selección a handoff
        setSelectedForHandoff(new Set(defectIds));
        setShowHandoffModal(true);
        break;

      case 'SEND_TO_MRB':
        setHandoffDestination('QUARANTINE');
        setHandoffNotes('');
        setSelectedMrbLocation(null);
        setSelectedMrbCampaign(null);
        setSelectedForHandoff(new Set(defectIds));
        setShowHandoffModal(true);
        break;

      case 'SEND_TO_SCRAP':
        if (!canDoScrapActions) {
          setError(language === 'es' ? 'No tienes permisos para enviar a SCRAP' : 'You do not have SCRAP permissions');
          return;
        }
        setHandoffDestination('SCRAP');
        setHandoffNotes('');
        setSelectedMrbLocation(null);
        setSelectedMrbCampaign(null);
        setSelectedForHandoff(new Set(defectIds));
        setShowHandoffModal(true);
        break;

      case 'RELEASE':
        if (defects.length === 1) {
          openActionModal('release', defects[0]);
        } else {
          setError(language === 'es' ? 'Selecciona un solo defecto para liberar' : 'Select a single defect to release');
        }
        break;

      case 'RELEASE_WITH_DEVIATION':
        setMrbAction('releaseWithDeviation');
        setMrbNotes('');
        setMrbDeviationId('');
        setSelectedForMrb(new Set(defectIds));
        setMrbModalOpen(true);
        break;

      case 'REJECT':
        if (defects.length === 1) {
          openActionModal('reject', defects[0]);
        } else {
          setError(language === 'es' ? 'Selecciona un solo defecto para rechazar' : 'Select a single defect to reject');
        }
        break;

      case 'RETURN_TO_REPAIR':
        setMrbAction('returnToRepair');
        setMrbNotes('');
        setSelectedForMrb(new Set(defectIds));
        setMrbModalOpen(true);
        break;

      case 'CONFIRM_SCRAP':
        if (!canDoScrapActions) {
          setError(language === 'es' ? 'No tienes permisos para confirmar SCRAP' : 'You do not have SCRAP permissions');
          return;
        }
        setMrbAction('confirmScrap');
        setMrbNotes('');
        setSelectedForMrb(new Set(defectIds));
        setMrbModalOpen(true);
        break;

      case 'RETURN_TO_QUARANTINE':
        setMrbAction('returnToQuarantine');
        setMrbNotes('');
        setSelectedForMrb(new Set(defectIds));
        setMrbModalOpen(true);
        break;

      case 'CREATE_MRB_PACKAGE':
        // Abrir modal para crear paquete de transferencia a MRB
        setPackageNotes('');
        setPackageAlertMinutes(24);
        setSelectedForMrb(new Set(defectIds));
        setShowCreatePackageModal(true);
        break;

      // MANAGEMENT ACTIONS
      case 'ASSIGN_LOCATION':
        // Limpiar estado anterior
        setAssignLocationCode('');
        setAssignLocationData(null);
        setAssignSerialInput('');
        setAssignResults(null);
        setAssignSingleDefect(null);
        // Establecer seriales de los defectos seleccionados (sin duplicados)
        const serialsToAssign = [...new Set(
          defects.map(d => d.serialNumber || d.serial_number || d.lotNumber || d.lot_number).filter(Boolean)
        )];
        setAssignSerialsList(serialsToAssign);
        setShowAssignLocation(true);
        break;

      case 'CHANGE_RESPONSIBLE':
        // Abrir modal con selector de departamento
        setBulkDepartmentId('');
        setBulkNotes('');
        setShowBulkModal(true);
        break;

      case 'ASSIGN_DEVIATION':
        // Abrir modal de desviaciones con los defectos seleccionados
        openDeviationModal(null);
        break;


      // TOOLS ACTIONS
      case 'VIEW_TRACEABILITY':
        if (defects.length > 1) {
          setError(language === 'es'
            ? 'Selecciona solo un defecto para ver trazabilidad'
            : 'Select only one defect to view traceability');
          return;
        }
        if (defects.length === 1) {
          const serial = defects[0].serialNumber || defects[0].serial_number || defects[0].lotNumber || defects[0].lot_number;
          if (serial) {
            // Establecer serial y cambiar a tab de trazabilidad
            setTraceSerial(serial);
            setActiveTab('traceability');
            // Disparar búsqueda después de cambiar de tab
            setTimeout(() => {
              handleTraceSearch({ key: 'Enter' });
            }, 200);
          }
        }
        clearSelection();
        break;

      case 'EXPORT_EXCEL':
        exportToExcel();
        break;

      default:
        console.warn('Action not implemented:', actionId);
        setSuccess(language === 'es' ? 'Acción en desarrollo' : 'Action in development');
    }
  };

  // Obtener defectos completos desde los IDs seleccionados (solo del tab activo)
  const getSelectedDefectsData = useMemo(() => {
    const selected = [];

    // Usar solo la selección del tab activo (no memoria multi-tab)
    let activeSelectionIds;
    if (activeTab === 'handoff') {
      activeSelectionIds = selectedForHandoff;
    } else if (activeTab === 'mrb') {
      activeSelectionIds = selectedForMrb;
    } else {
      activeSelectionIds = selectedDefects;
    }

    // Buscar en todos los datos disponibles
    const allData = [
      ...allDefects,
      ...pendingRepairs,
      ...inRepairDefects,
      ...pendingReleases,
      ...pendingHandoff,
      ...quarantineDefects,
      ...scrappedDefects
    ];

    allData.forEach(d => {
      if (activeSelectionIds.has(d.id)) {
        selected.push(d);
      }
    });

    return selected;
  }, [activeTab, selectedDefects, selectedForHandoff, selectedForMrb, allDefects, pendingRepairs, inRepairDefects, pendingReleases, pendingHandoff, quarantineDefects, scrappedDefects]);

  // Permisos para ActionBar
  const actionBarPermissions = useMemo(() => ({
    repair: hospitalPermissions.canRepair,
    release: hospitalPermissions.canRelease,
    admin: hospitalPermissions.isHospitalAdmin,
    scrap: hospitalPermissions.canScrap
  }), [hospitalPermissions]);

  // Grupos de partes para modal de crear paquete MRB (memoizado para evitar lag)
  const packagePartsGroups = useMemo(() => {
    const allDefectsForMrb = [...quarantineDefects, ...scrappedDefects];
    const selectedDefectsData = allDefectsForMrb.filter(d => selectedForMrb.has(d.id));
    const groupedByPart = {};

    selectedDefectsData.forEach(d => {
      const partKey = d.partNumber || d.part_number || 'SIN_PARTE';
      if (!groupedByPart[partKey]) {
        groupedByPart[partKey] = {
          partNumber: partKey,
          partName: d.partName || d.part_name || '',
          serials: []
        };
      }
      groupedByPart[partKey].serials.push(d.serialNumber || d.serial_number || d.lotNumber || d.lot_number || '-');
    });

    return Object.values(groupedByPart);
  }, [quarantineDefects, scrappedDefects, selectedForMrb]);

  // Valores únicos para filtros MRB (estilo Excel)
  const mrbAllDefects = useMemo(() => [
    ...quarantineDefects.map(d => ({ ...d, _mrbType: 'quarantine' })),
    ...scrappedDefects.map(d => ({ ...d, _mrbType: 'scrap' }))
  ], [quarantineDefects, scrappedDefects]);

  const mrbUniqueValues = useMemo(() => ({
    entryNumber: [...new Set(mrbAllDefects.map(d => d.entryNumber).filter(Boolean))].sort(),
    serialNumber: [...new Set(mrbAllDefects.map(d => d.serialNumber || d.lotNumber).filter(Boolean))].sort(),
    partNumber: [...new Set(mrbAllDefects.map(d => d.partNumber).filter(Boolean))].sort(),
    defectCode: [...new Set(mrbAllDefects.map(d => d.defectTypeName || d.defect_type_name).filter(Boolean))].sort(),
    mrbCampaignNumber: [...new Set(mrbAllDefects.map(d => d.mrbCampaignNumber).filter(Boolean))].sort(),
    qarNumber: [...new Set(mrbAllDefects.map(d => d.qarNumber).filter(Boolean))].sort(),
    eightDNumber: [...new Set(mrbAllDefects.map(d => d.eightdNumber).filter(Boolean))].sort(),
    hours: [...new Set(mrbAllDefects.map(d => {
      const h = d._mrbType === 'quarantine' ? d.hoursInQuarantine : d.hoursInScrap;
      return h > 72 ? '>72h' : h > 24 ? '24-72h' : '<24h';
    }))].sort(),
    mrbType: ['quarantine', 'scrap']
  }), [mrbAllDefects]);

  // Defectos MRB filtrados
  const mrbFilteredDefects = useMemo(() => {
    let data = mrbAllDefects;
    // Filtrar por subTab
    if (mrbSubTab === 'quarantine') data = data.filter(d => d._mrbType === 'quarantine');
    if (mrbSubTab === 'scrap') data = data.filter(d => d._mrbType === 'scrap');
    // Aplicar filtros de columna (arrays para selección múltiple)
    if (mrbColFilters.entryNumber.length > 0) data = data.filter(d => mrbColFilters.entryNumber.includes(d.entryNumber));
    if (mrbColFilters.serialNumber.length > 0) data = data.filter(d => mrbColFilters.serialNumber.includes(d.serialNumber || d.lotNumber));
    if (mrbColFilters.partNumber.length > 0) data = data.filter(d => mrbColFilters.partNumber.includes(d.partNumber));
    if (mrbColFilters.defectCode.length > 0) data = data.filter(d => mrbColFilters.defectCode.includes(d.defectTypeName || d.defect_type_name));
    if (mrbColFilters.mrbCampaignNumber.length > 0) data = data.filter(d => mrbColFilters.mrbCampaignNumber.includes(d.mrbCampaignNumber));
    if (mrbColFilters.qarNumber.length > 0) data = data.filter(d => mrbColFilters.qarNumber.includes(d.qarNumber));
    if (mrbColFilters.eightDNumber.length > 0) data = data.filter(d => mrbColFilters.eightDNumber.includes(d.eightdNumber));
    if (mrbColFilters.hours.length > 0) {
      data = data.filter(d => {
        const h = d._mrbType === 'quarantine' ? d.hoursInQuarantine : d.hoursInScrap;
        const cat = h > 72 ? '>72h' : h > 24 ? '24-72h' : '<24h';
        return mrbColFilters.hours.includes(cat);
      });
    }
    if (mrbColFilters.mrbType.length > 0) data = data.filter(d => mrbColFilters.mrbType.includes(d._mrbType));
    return data;
  }, [mrbAllDefects, mrbSubTab, mrbColFilters]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (mrbOpenDropdown) {
      const handleClick = () => setMrbOpenDropdown(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [mrbOpenDropdown]);

  // Cerrar dropdown principal al hacer click fuera
  useEffect(() => {
    if (mainOpenDropdown) {
      const handleClick = () => setMainOpenDropdown(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [mainOpenDropdown]);

  // Seleccionar por tipo de defecto
  const selectByDefectType = (defectTypeId) => {
    const matchingDefects = [];
    filteredGroups.forEach(group => {
      group.defects.forEach(d => {
        const typeId = d.defectTypeId || d.defect_type_id;
        const status = d.repairStatus || d.repair_status || 'OPEN';
        if (typeId === parseInt(defectTypeId) && status !== 'CLOSED' && status !== 'RELEASED' && status !== 'SCRAPPED') {
          matchingDefects.push(d.id);
        }
      });
    });
    setSelectedDefects(new Set(matchingDefects));
  };

  // Obtener tipos de defecto únicos de los datos actuales (sin filtrar por tipo)
  const getUniqueDefectTypes = () => {
    const types = new Map();
    // Usar datos originales del tab, no los filtrados
    let data;
    switch (activeTab) {
      case 'general': data = serialHistory; break;
      case 'repairs': data = repairsSubTab === 'all' ? [...pendingWithoutLocation, ...pendingWithLocation] : (repairsSubTab === 'sinUbicacion' ? pendingWithoutLocation : pendingWithLocation); break;
      case 'inRepair': data = inRepairDefects; break;
      case 'handoff': data = pendingHandoff; break;
      case 'releases': data = pendingReleases; break;
      default: data = pendingRepairs;
    }
    data.forEach(d => {
      const typeId = d.defectTypeId || d.defect_type_id;
      const typeName = d.defectTypeName || d.defect_type_name;
      if (typeId && typeName && !types.has(typeId)) {
        types.set(typeId, typeName);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Ejecutar cambio masivo de responsable
  const executeBulkReassign = async () => {
    if (selectedDefects.size === 0 || !bulkDepartmentId) return;

    setBulkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/defects-v2/bulk-reassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          defectIds: Array.from(selectedDefects),
          newDepartmentId: parseInt(bulkDepartmentId),
          notes: bulkNotes || 'Reasignación masiva de área responsable'
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(`${result.updated} defecto(s) reasignado(s) correctamente`);
        setShowBulkModal(false);
        setBulkDepartmentId('');
        setBulkNotes('');
        setSelectedDefects(new Set());
        loadData();
      } else {
        setError(result.message || 'Error en la reasignación masiva');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE DESVIACIONES
  // ============================================================================

  const openDeviationModal = async (deviation = null) => {
    if (deviation) {
      setSelectedDeviation(deviation);
      // Convertir partId o partIds a array
      const existingPartIds = deviation.partIds
        ? (Array.isArray(deviation.partIds) ? deviation.partIds.map(String) : [String(deviation.partIds)])
        : (deviation.partId ? [String(deviation.partId)] : []);
      setDeviationForm({
        deviationType: deviation.deviationType || 'SAE',
        description: deviation.description || '',
        clientId: deviation.clientId || '',
        projectId: deviation.projectId || '',
        partIds: existingPartIds,
        validityDate: deviation.validityDate ? deviation.validityDate.split('T')[0] : '',
        notes: deviation.notes || ''
      });
      // Cargar attachments, defectos vinculados e historial
      try {
        const result = await getDeviationById(deviation.id);
        if (result.success) {
          setExistingAttachments(result.attachments || []);
          setLinkedDefects(result.linkedDefects || []);
        }
        // Cargar historial
        const historyRes = await fetch(`${API_URL}/deviations/${deviation.id}/history`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const historyData = await historyRes.json();
        if (historyData.success) {
          setDeviationHistory(historyData.history || []);
        }
      } catch (err) {
        console.error('Error loading deviation details:', err);
        setExistingAttachments([]);
        setLinkedDefects([]);
        setDeviationHistory([]);
      }
      setShowDeviationHistory(false);
      setDefectSearchSerial('');
      // Sincronizar partes con filtro de búsqueda
      setDefectSearchPartIds(existingPartIds);
      setDefectSearchDefectTypeId('');
      setSearchedDefects([]);
      // Cargar partes del cliente
      if (deviation.clientId || deviation.client_id) {
        loadClientParts(deviation.clientId || deviation.client_id);
      }
    } else {
      setSelectedDeviation(null);
      setDeviationForm({
        deviationType: 'SAE',
        description: '',
        clientId: '',
        projectId: '',
        partIds: [],
        validityDate: '',
        notes: ''
      });
      setExistingAttachments([]);
      setClientPartsForDeviation([]);
    }
    setDeviationFiles([]);
    setShowDeviationModal(true);

    // Cargar tipos de defecto para el dropdown de búsqueda
    try {
      const response = await fetch(`${API_URL}/defects-v2/types`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setAvailableDefectTypesForSearch((result.defectTypes || []).map(t => ({ id: t.id, name: t.name })));
      }
    } catch (err) {
      console.error('Error loading defect types:', err);
    }
  };

  // Cargar partes del cliente seleccionado
  const loadClientParts = async (clientId) => {
    if (!clientId) {
      setClientPartsForDeviation([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/clients/${clientId}/parts?flat=true&activeOnly=true`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setClientPartsForDeviation(result.parts || []);
      }
    } catch (err) {
      console.error('Error loading client parts:', err);
      setClientPartsForDeviation([]);
    }
  };

  // Handler para cambio de cliente en desviación
  const handleDeviationClientChange = (clientId) => {
    setDeviationForm(prev => ({ ...prev, clientId, partIds: [] }));
    setDefectSearchPartIds([]);
    loadClientParts(clientId);
  };

  const handleDeviationSubmit = async () => {
    if (!deviationForm.description || !deviationForm.clientId) {
      setError(language === 'es' ? 'Descripción y cliente son requeridos' : 'Description and client are required');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (selectedDeviation) {
        result = await updateDeviation(selectedDeviation.id, deviationForm);
      } else {
        result = await createDeviation(deviationForm);
      }

      if (result.success) {
        // Subir archivos nuevos si hay
        const deviationId = result.deviation?.id || selectedDeviation?.id;
        if (deviationFiles.length > 0 && deviationId) {
          await uploadDeviationAttachments(deviationId, deviationFiles);
        }
        setSuccess(selectedDeviation
          ? (language === 'es' ? 'Desviación actualizada' : 'Deviation updated')
          : (language === 'es' ? 'Desviación creada' : 'Deviation created'));
        setShowDeviationModal(false);
        setExistingAttachments([]);
        loadDeviations();
      } else {
        setError(result.message || (language === 'es' ? 'Error guardando desviación' : 'Error saving deviation'));
      }
    } catch (err) {
      setError((language === 'es' ? 'Error: ' : 'Error: ') + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviationFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setDeviationFiles(prev => [...prev, ...files]);
  };

  const removeDeviationFile = (index) => {
    setDeviationFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Buscar defectos por serial/parte/tipo para vincular a desviación
  const searchDefectsForDeviation = async () => {
    // Requiere al menos un criterio o contexto de cliente
    const hasSerial = defectSearchSerial.trim().length >= 2;
    const hasParts = defectSearchPartIds.length > 0;
    const hasDefectType = defectSearchDefectTypeId !== '';
    const hasClient = deviationForm.clientId !== '';

    if (!hasSerial && !hasParts && !hasDefectType && !hasClient) {
      setError(language === 'es'
        ? 'Selecciona un cliente o ingresa criterios de búsqueda'
        : 'Select a client or enter search criteria');
      return;
    }

    setSearchingDefects(true);
    try {
      // Procesar seriales (limpiar y normalizar)
      const serialInput = defectSearchSerial.trim();
      let serialList = [];
      if (serialInput) {
        serialList = serialInput.split(/[,\n\r\s]+/)
          .map(s => s.trim())
          .filter(s => s.length >= 2);
      }

      let response;
      const isBulkSearch = serialList.length > 1;

      // Siempre usar POST para incluir contexto de la desviación
      const body = {
        status: ['OPEN', 'REPAIRED', 'IN_REPAIR', 'IN_VALIDATION', 'PENDING_RELEASE_APPROVAL']
      };

      // Filtro automático por cliente de la desviación
      if (deviationForm.clientId) {
        body.clientId = deviationForm.clientId;
      }

      // Seriales (bulk o individual)
      if (serialList.length > 0) {
        body.serials = serialList;
      }

      // Filtros opcionales
      if (hasParts) body.partIds = defectSearchPartIds.map(id => parseInt(id));
      if (hasDefectType) body.defectTypeId = defectSearchDefectTypeId;

      // Filtros avanzados (entry y fecha)
      // Extraer número secuencial de entry (ej: "DEF-2026-00020" → 20, o "20" → 20)
      const extractEntryNumber = (val) => {
        if (!val) return null;
        const match = val.toString().match(/(\d+)$/); // Últimos dígitos
        return match ? parseInt(match[1], 10) : null;
      };
      const entryFromNum = extractEntryNumber(defectSearchEntryFrom);
      const entryToNum = extractEntryNumber(defectSearchEntryTo);
      if (entryFromNum !== null) body.entryFrom = entryFromNum;
      if (entryToNum !== null) body.entryTo = entryToNum;
      if (defectSearchDateFrom) body.dateFrom = defectSearchDateFrom;
      if (defectSearchDateTo) body.dateTo = defectSearchDateTo;

      response = await fetch(`${API_URL}/defects-v2/search-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        // Filtrar defectos que ya están vinculados
        const linkedIds = new Set(linkedDefects.map(d => d.defectId || d.id));
        const available = (result.defects || []).filter(d => !linkedIds.has(d.id));
        setSearchedDefects(available);

        // NO sobrescribir tipos de defecto - ya se cargaron al abrir el modal

        if (available.length === 0 && result.defects?.length > 0) {
          setSuccess(language === 'es'
            ? 'Todos los defectos encontrados ya están vinculados'
            : 'All found defects are already linked');
        }
      }
    } catch (err) {
      console.error('Error searching defects:', err);
      setError('Error: ' + err.message);
    } finally {
      setSearchingDefects(false);
    }
  };

  // Vincular defecto a desviación
  const linkDefectToDeviation = async (defectId) => {
    if (!selectedDeviation) return;
    try {
      const bodyData = { defectId };
      // Incluir cambio de área si se seleccionó
      if (bulkDepartmentForDeviation) {
        bodyData.departmentId = parseInt(bulkDepartmentForDeviation);
      }

      const response = await fetch(`${API_URL}/deviations/${selectedDeviation.id}/link-defect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bodyData)
      });
      const result = await response.json();
      if (result.success) {
        // Recargar defectos vinculados
        const devResult = await getDeviationById(selectedDeviation.id);
        if (devResult.success) {
          setLinkedDefects(devResult.linkedDefects || []);
        }
        // Quitar de resultados de búsqueda
        setSearchedDefects(prev => prev.filter(d => d.id !== defectId));
        setSuccess(language === 'es' ? 'Defecto vinculado' : 'Defect linked');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  // Desvincular defecto de desviación
  const unlinkDefectFromDeviation = async (defectId) => {
    if (!selectedDeviation) return;
    try {
      const response = await fetch(`${API_URL}/deviations/${selectedDeviation.id}/unlink-defect/${defectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setLinkedDefects(prev => prev.filter(d => (d.defectId || d.id) !== defectId));
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  // Procesar defectos vinculados (reparar o liberar según modo)
  const bulkProcessWithDeviation = async () => {
    if (!selectedDeviation || linkedDefects.length === 0) return;

    const actionText = isRepairMode
      ? (language === 'es' ? 'reparar' : 'repair')
      : (language === 'es' ? 'liberar' : 'release');

    const pendingDefects = linkedDefects.filter(d =>
      isRepairMode
        ? !['REPAIRED', 'RELEASED', 'CLOSED'].includes(d.defectStatus)
        : d.defectStatus !== 'RELEASED'
    );

    if (!window.confirm(language === 'es'
      ? `¿${isRepairMode ? 'Reparar' : 'Liberar'} ${pendingDefects.length} defecto(s) con esta desviación?`
      : `${isRepairMode ? 'Repair' : 'Release'} ${pendingDefects.length} defect(s) with this deviation?`)) return;

    setBulkReleaseLoading(true);
    let processed = 0;
    let errors = 0;

    for (const defect of pendingDefects) {
      try {
        const defectId = defect.defectId || defect.id;
        const endpoint = isRepairMode
          ? `${API_URL}/defects-v2/entries/${defectId}/repair/complete`
          : `${API_URL}/defects-v2/entries/${defectId}/release`;

        const body = isRepairMode
          ? {
              repairTypeId: 1,
              repairTimeMinutes: 1,
              notes: `Reparado con desviación ${selectedDeviation.referenceNumber}`,
              deviationId: selectedDeviation.id
            }
          : {
              releaseReasonId: 1,
              releaseTimeMinutes: 1,
              notes: `Liberado con desviación ${selectedDeviation.referenceNumber}`,
              deviationId: selectedDeviation.id
            };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.success) {
          processed++;
        } else {
          errors++;
        }
      } catch (err) {
        errors++;
      }
    }

    setBulkReleaseLoading(false);
    if (processed > 0) {
      setSuccess(language === 'es'
        ? `${processed} defecto(s) ${isRepairMode ? 'reparado(s)' : 'liberado(s)'} exitosamente`
        : `${processed} defect(s) ${isRepairMode ? 'repaired' : 'released'} successfully`);
      // Recargar defectos vinculados
      const devResult = await getDeviationById(selectedDeviation.id);
      if (devResult.success) {
        setLinkedDefects(devResult.linkedDefects || []);
      }
      loadData(); // Recargar datos principales
    }
    if (errors > 0) {
      setError(language === 'es'
        ? `${errors} defecto(s) no pudieron ser liberados`
        : `${errors} defect(s) could not be released`);
    }
  };

  // Estilos
  const styles = {
    container: {
      padding: '20px 32px',
      maxWidth: '100%',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      backgroundColor: t.bgPanel,
      padding: '4px',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    tab: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    tabActive: {
      backgroundColor: t.bgCard,
      color: t.accent,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    tabInactive: {
      backgroundColor: 'transparent',
      color: t.textMuted
    },
    searchBox: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    searchInput: {
      flex: 1,
      padding: '12px 16px',
      fontSize: '16px',
      border: `2px solid ${t.border}`,
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: t.bgCard,
      color: t.text
    },
    searchButton: {
      padding: '12px 24px',
      backgroundColor: t.accent,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    alert: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    alertError: {
      backgroundColor: t.bg,
      color: t.error,
      border: `1px solid ${t.error}`
    },
    alertSuccess: {
      backgroundColor: t.bg,
      color: t.success,
      border: `1px solid ${t.success}`
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      backgroundColor: t.bgPanel,
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase',
      borderBottom: `1px solid ${t.border}`
    },
    td: {
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      fontSize: '14px',
      color: t.text
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500'
    },
    timeIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500'
    },
    actionButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      marginRight: '6px'
    },
    btnPrimary: {
      backgroundColor: t.accent,
      color: '#fff'
    },
    btnSuccess: {
      backgroundColor: t.success,
      color: '#fff'
    },
    btnWarning: {
      backgroundColor: t.warning,
      color: '#fff'
    },
    btnDanger: {
      backgroundColor: t.error,
      color: '#fff'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '20px',
      color: t.text
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: t.text,
      marginBottom: '6px'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      minHeight: '80px',
      resize: 'vertical',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px'
    },
    btnCancel: {
      padding: '10px 20px',
      backgroundColor: t.bgPanel,
      color: t.text,
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    btnConfirm: {
      padding: '10px 20px',
      backgroundColor: t.accent,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: t.textMuted
    },
    refreshButton: {
      padding: '8px 16px',
      backgroundColor: t.bgPanel,
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      color: t.text
    },
    statsRow: {
      display: 'flex',
      gap: '16px',
      marginBottom: '20px'
    },
    statCard: {
      flex: 1,
      padding: '16px',
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: `1px solid ${t.border}`
    },
    statNumber: {
      fontSize: '28px',
      fontWeight: '700',
      color: t.text
    },
    statLabel: {
      fontSize: '13px',
      color: t.textMuted,
      marginTop: '4px'
    },
    serialCard: {
      backgroundColor: t.bgCard,
      borderRadius: '10px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      border: `1px solid ${t.border}`
    },
    serialCardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      cursor: 'pointer',
      backgroundColor: t.bgCard,
      transition: 'background-color 0.2s'
    },
    serialCardHeaderHover: {
      backgroundColor: t.bgPanel
    },
    serialInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1
    },
    serialNumber: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      minWidth: '150px'
    },
    partInfo: {
      fontSize: '14px',
      color: t.textMuted
    },
    partNumber: {
      fontWeight: '500',
      color: t.text
    },
    defectSummary: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '13px'
    },
    summaryBadge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontWeight: '500'
    },
    expandIcon: {
      fontSize: '18px',
      color: t.textMuted,
      transition: 'transform 0.2s'
    },
    defectsContainer: {
      borderTop: `1px solid ${t.border}`,
      backgroundColor: t.bgPanel
    },
    defectRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 20px',
      borderBottom: `1px solid ${t.border}`,
      gap: '16px',
      fontSize: '14px'
    },
    defectRowLast: {
      borderBottom: 'none'
    },
    filterBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
      backgroundColor: t.bgCard,
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: `1px solid ${t.border}`
    },
    filterInput: {
      flex: 1,
      padding: '10px 14px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      outline: 'none',
      backgroundColor: t.bgCard,
      color: t.text
    },
    filterLabel: {
      fontSize: '14px',
      color: t.textMuted,
      fontWeight: '500'
    },
    expandButtons: {
      display: 'flex',
      gap: '8px'
    },
    smallBtn: {
      padding: '6px 12px',
      fontSize: '12px',
      backgroundColor: t.bgPanel,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      color: t.text
    }
  };

  // Helper: Color por tiempo (usando tema)
  const getTimeColorStyle = (color) => {
    const colors = {
      GREEN: { bg: t.bgPanel, text: t.success },
      YELLOW: { bg: t.bgPanel, text: t.warning },
      RED: { bg: t.bgPanel, text: t.error }
    };
    return colors[color] || colors.GREEN;
  };

  // Componente de filtro de columna estilo Excel para tabla principal (selección múltiple)
  const MainColumnFilter = ({ field, label, align = 'left', style = {} }) => {
    const isOpen = mainOpenDropdown === field;
    const selectedValues = mainColFilters[field] || [];
    const hasFilter = selectedValues.length > 0;
    const allValues = mainUniqueValues[field] || [];

    // Filtrar valores por búsqueda
    const filteredValues = mainFilterSearch
      ? allValues.filter(v => String(v).toLowerCase().includes(mainFilterSearch.toLowerCase()))
      : allValues;

    const toggleValue = (val) => {
      setMainColFilters(prev => {
        const current = prev[field] || [];
        if (current.includes(val)) {
          return { ...prev, [field]: current.filter(v => v !== val) };
        } else {
          return { ...prev, [field]: [...current, val] };
        }
      });
    };

    const selectAll = () => {
      setMainColFilters(prev => ({ ...prev, [field]: [...filteredValues] }));
    };

    const clearAll = () => {
      setMainColFilters(prev => ({ ...prev, [field]: [] }));
      setMainFilterSearch('');
    };

    return (
      <th style={{ ...style, position: 'relative', userSelect: 'none', textAlign: align }}>
        <div
          onClick={(e) => { e.stopPropagation(); setMainOpenDropdown(isOpen ? null : field); if (!isOpen) setMainFilterSearch(''); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '4px', cursor: 'pointer' }}
        >
          <span style={{ color: hasFilter ? t.accent : t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>
            {label} {hasFilter && <span style={{ fontSize: '10px' }}>({selectedValues.length})</span>}
          </span>
          <ChevronDown size={12} color={hasFilter ? t.accent : t.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }} />
        </div>
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '100%', left: align === 'center' ? '50%' : 0,
              transform: align === 'center' ? 'translateX(-50%)' : 'none',
              minWidth: '200px', maxHeight: '320px', display: 'flex', flexDirection: 'column',
              backgroundColor: t.bgCard, border: `1px solid ${t.border}`,
              borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, marginTop: '4px'
            }}
          >
            {/* Búsqueda */}
            <div style={{ padding: '8px', borderBottom: `1px solid ${t.border}` }}>
              <input
                type="text"
                placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                value={mainFilterSearch}
                onChange={(e) => setMainFilterSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  border: `1px solid ${t.border}`, borderRadius: '4px',
                  backgroundColor: t.bgPanel, color: t.text, outline: 'none'
                }}
              />
            </div>
            {/* Acciones rápidas */}
            <div style={{ display: 'flex', gap: '8px', padding: '6px 8px', borderBottom: `1px solid ${t.border}` }}>
              <button onClick={selectAll} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text }}>
                {language === 'es' ? 'Todos' : 'All'}
              </button>
              <button onClick={clearAll} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text }}>
                {language === 'es' ? 'Ninguno' : 'None'}
              </button>
            </div>
            {/* Lista de valores con checkboxes */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
              {filteredValues.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontSize: '12px' }}>
                  {language === 'es' ? 'Sin resultados' : 'No results'}
                </div>
              ) : (
                filteredValues.map(val => (
                  <label
                    key={val}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', fontSize: '12px', color: t.text, cursor: 'pointer',
                      backgroundColor: selectedValues.includes(val) ? t.accent + '15' : 'transparent'
                    }}
                    onMouseEnter={(e) => { if (!selectedValues.includes(val)) e.currentTarget.style.backgroundColor = t.bgPanel; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedValues.includes(val) ? t.accent + '15' : 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(val)}
                      onChange={() => toggleValue(val)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: t.accent }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                  </label>
                ))
              )}
            </div>
            {/* Footer con contador */}
            <div style={{ padding: '6px 10px', borderTop: `1px solid ${t.border}`, fontSize: '11px', color: t.textMuted, textAlign: 'center' }}>
              {filteredValues.length} {language === 'es' ? 'de' : 'of'} {allValues.length} | {selectedValues.length} {language === 'es' ? 'seleccionados' : 'selected'}
            </div>
          </div>
        )}
      </th>
    );
  };

  // Componente de filtro de columna estilo Excel para MRB (selección múltiple)
  const MrbColumnFilter = ({ field, label, align = 'left' }) => {
    const isOpen = mrbOpenDropdown === field;
    const selectedValues = mrbColFilters[field] || [];
    const hasFilter = selectedValues.length > 0;
    const allValues = mrbUniqueValues[field] || [];

    // Filtrar valores por búsqueda
    const filteredValues = mrbFilterSearch
      ? allValues.filter(v => String(v).toLowerCase().includes(mrbFilterSearch.toLowerCase()))
      : allValues;

    const toggleValue = (val) => {
      setMrbColFilters(prev => {
        const current = prev[field] || [];
        if (current.includes(val)) {
          return { ...prev, [field]: current.filter(v => v !== val) };
        } else {
          return { ...prev, [field]: [...current, val] };
        }
      });
    };

    const selectAll = () => {
      setMrbColFilters(prev => ({ ...prev, [field]: [...filteredValues] }));
    };

    const clearAll = () => {
      setMrbColFilters(prev => ({ ...prev, [field]: [] }));
      setMrbFilterSearch('');
    };

    const getDisplayValue = (val) => {
      if (field === 'mrbType') return val === 'quarantine' ? '🔒 Cuarentena' : '🗑️ Scrap';
      return val;
    };

    return (
      <th style={{ padding: '12px 8px', textAlign: align, color: t.textMuted, fontWeight: '600', position: 'relative', userSelect: 'none' }}>
        <div
          onClick={(e) => { e.stopPropagation(); setMrbOpenDropdown(isOpen ? null : field); if (!isOpen) setMrbFilterSearch(''); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '4px', cursor: 'pointer' }}
        >
          <span style={{ color: hasFilter ? t.accent : t.textMuted }}>
            {label} {hasFilter && <span style={{ fontSize: '10px' }}>({selectedValues.length})</span>}
          </span>
          <ChevronDown size={12} color={hasFilter ? t.accent : t.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
        </div>
        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '100%', left: align === 'center' ? '50%' : 0,
              transform: align === 'center' ? 'translateX(-50%)' : 'none',
              minWidth: '200px', maxHeight: '320px', display: 'flex', flexDirection: 'column',
              backgroundColor: t.bgCard, border: `1px solid ${t.border}`,
              borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, marginTop: '4px'
            }}
          >
            {/* Búsqueda */}
            <div style={{ padding: '8px', borderBottom: `1px solid ${t.border}` }}>
              <input
                type="text"
                placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                value={mrbFilterSearch}
                onChange={(e) => setMrbFilterSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  border: `1px solid ${t.border}`, borderRadius: '4px',
                  backgroundColor: t.bgPanel, color: t.text, outline: 'none'
                }}
              />
            </div>
            {/* Acciones rápidas */}
            <div style={{ display: 'flex', gap: '8px', padding: '6px 8px', borderBottom: `1px solid ${t.border}` }}>
              <button onClick={selectAll} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text }}>
                {language === 'es' ? 'Todos' : 'All'}
              </button>
              <button onClick={clearAll} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer', backgroundColor: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px', color: t.text }}>
                {language === 'es' ? 'Ninguno' : 'None'}
              </button>
            </div>
            {/* Lista de valores con checkboxes */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
              {filteredValues.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontSize: '12px' }}>
                  {language === 'es' ? 'Sin resultados' : 'No results'}
                </div>
              ) : (
                filteredValues.map(val => (
                  <label
                    key={val}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', fontSize: '12px', color: t.text, cursor: 'pointer',
                      backgroundColor: selectedValues.includes(val) ? t.accent + '15' : 'transparent'
                    }}
                    onMouseEnter={(e) => { if (!selectedValues.includes(val)) e.currentTarget.style.backgroundColor = t.bgPanel; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedValues.includes(val) ? t.accent + '15' : 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(val)}
                      onChange={() => toggleValue(val)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: t.accent }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayValue(val)}</span>
                  </label>
                ))
              )}
            </div>
            {/* Footer con contador */}
            <div style={{ padding: '6px 10px', borderTop: `1px solid ${t.border}`, fontSize: '11px', color: t.textMuted, textAlign: 'center' }}>
              {filteredValues.length} {language === 'es' ? 'de' : 'of'} {allValues.length} | {selectedValues.length} {language === 'es' ? 'seleccionados' : 'selected'}
            </div>
          </div>
        )}
      </th>
    );
  };

  // Render acciones para un defecto individual (según modo)
  const renderDefectActions = (defect) => {
    const status = defect.repairStatus || defect.repair_status || 'OPEN';
    const hasLocation = defect.currentLocationId || defect.current_location_id;

    // Permisos efectivos: combinan modo URL + rol del usuario
    // Para reparar: debe estar en modo repair/admin Y tener rol reparador/admin
    // Para liberar: debe estar en modo release/admin Y tener rol inspector/admin
    const effectiveRepairAccess = (isRepairMode || isAdminMode) && canDoRepairActions;
    const effectiveReleaseAccess = (isReleaseMode || isAdminMode) && canDoReleaseActions;

    if (status === 'OPEN') {
      // Si no tiene ubicación, mostrar botón para asignar (disponible en todos los modos)
      if (!hasLocation) {
        return (
          <button
            style={{ ...styles.actionButton, backgroundColor: t.info, color: '#fff' }}
            onClick={(e) => { e.stopPropagation(); openAssignLocationModal(defect); }}
            title={L.assignLocationFirst}
          >
            {language === 'es' ? 'Asignar' : 'Assign'}
          </button>
        );
      }
      // Solo mostrar acciones si tiene permiso de reparación
      if (!effectiveRepairAccess) return null;

      // Si ya se inició localmente, mostrar "Completar (Xm)"
      const elapsedMinutes = getElapsedMinutes(defect);
      if (elapsedMinutes !== null) {
        return (
          <button
            style={{ ...styles.actionButton, ...styles.btnSuccess }}
            onClick={(e) => { e.stopPropagation(); openActionModal('complete', { ...defect, repairStatus: 'IN_REPAIR', localStartTime: locallyStartedRepairs[defect.id] }); }}
          >
            {language === 'es' ? `Completar (${elapsedMinutes}m)` : `Complete (${elapsedMinutes}m)`}
          </button>
        );
      }

      return (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{ ...styles.actionButton, ...styles.btnPrimary }}
            onClick={(e) => { e.stopPropagation(); quickStartRepair(defect); }}
          >
            {language === 'es' ? 'Iniciar' : 'Start'}
          </button>
          {canDoScrapActions && (
            <button
              style={{ ...styles.actionButton, backgroundColor: t.error, color: 'white' }}
              onClick={(e) => { e.stopPropagation(); handleScrap(defect); }}
              title={language === 'es' ? 'Enviar directo a SCRAP' : 'Send directly to SCRAP'}
            >
              🗑️
            </button>
          )}
        </div>
      );
    }

    if (status === 'IN_REPAIR') {
      // Solo mostrar acciones de reparación si tiene permiso
      if (!effectiveRepairAccess) return null;
      const elapsedMin = getElapsedMinutes(defect);
      return (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{ ...styles.actionButton, ...styles.btnSuccess }}
            onClick={(e) => { e.stopPropagation(); openActionModal('complete', defect); }}
            title={language === 'es' ? 'Más acciones: seleccionar y usar barra superior' : 'More actions: select and use top bar'}
          >
            {elapsedMin !== null
              ? (language === 'es' ? `Completar (${elapsedMin}m)` : `Complete (${elapsedMin}m)`)
              : (language === 'es' ? 'Completar' : 'Complete')}
          </button>
          {canDoScrapActions && (
            <button
              style={{ ...styles.actionButton, backgroundColor: t.error, color: 'white' }}
              onClick={(e) => { e.stopPropagation(); handleScrap(defect); }}
              title={language === 'es' ? 'No se puede reparar - SCRAP' : 'Cannot repair - SCRAP'}
            >
              🗑️
            </button>
          )}
        </div>
      );
    }

    if (status === 'REJECTED') {
      if (!hasLocation) {
        return (
          <button
            style={{ ...styles.actionButton, backgroundColor: t.info, color: '#fff' }}
            onClick={(e) => { e.stopPropagation(); openAssignLocationModal(defect); }}
            title={L.assignLocationFirst}
          >
            {language === 'es' ? 'Asignar' : 'Assign'}
          </button>
        );
      }
      // Solo mostrar acciones de reparación si tiene permiso
      if (!effectiveRepairAccess) return null;
      return (
        <button
          style={{ ...styles.actionButton, ...styles.btnPrimary }}
          onClick={(e) => { e.stopPropagation(); quickStartRepair(defect); }}
          title={language === 'es' ? 'Más acciones: seleccionar y usar barra superior' : 'More actions: select and use top bar'}
        >
          {language === 'es' ? 'Reiniciar' : 'Restart'}
        </button>
      );
    }

    if (status === 'QUARANTINE') {
      if (!hasLocation) {
        return (
          <button
            style={{ ...styles.actionButton, backgroundColor: t.info, color: '#fff' }}
            onClick={(e) => { e.stopPropagation(); openAssignLocationModal(defect); }}
            title={L.assignLocationFirst}
          >
            {language === 'es' ? 'Asignar' : 'Assign'}
          </button>
        );
      }
      // Acción principal: Reintentar (si tiene permiso de reparación)
      if (effectiveRepairAccess) {
        return (
          <button
            style={{ ...styles.actionButton, ...styles.btnPrimary }}
            onClick={(e) => { e.stopPropagation(); quickStartRepair(defect); }}
            title={language === 'es' ? 'Más acciones: seleccionar y usar barra superior' : 'More actions: select and use top bar'}
          >
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        );
      }
      return null;
    }

    if (status === 'REPAIRED' || status === 'IN_VALIDATION' || status === 'PENDING_RELEASE_APPROVAL') {
      // Solo mostrar acciones de liberación si tiene permiso
      if (!effectiveReleaseAccess) {
        // En modo reparación mostrar solo indicador de estado
        return (
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            backgroundColor: t.bgPanel,
            color: t.accent,
            borderRadius: '4px',
            fontWeight: '500'
          }}>
            {language === 'es' ? 'En QA' : 'In QA'}
          </span>
        );
      }
      // Acción primaria: Liberar. Rechazar disponible en ActionBar
      return (
        <button
          style={{ ...styles.actionButton, ...styles.btnSuccess }}
          onClick={(e) => { e.stopPropagation(); openActionModal('release', defect); }}
          title={language === 'es' ? 'Más acciones: seleccionar y usar barra superior' : 'More actions: select and use top bar'}
        >
          {language === 'es' ? 'Liberar' : 'Release'}
        </button>
      );
    }

    if (status === 'CLOSED' || status === 'RELEASED') {
      return <span style={{ color: t.success, fontSize: '12px', fontWeight: '500' }}>
        {language === 'es' ? 'Cerrado' : 'Closed'}
      </span>;
    }

    return null;
  };

  // Render fila simple para defecto único
  const renderSingleDefectRow = (group) => {
    const defect = group.defects[0];
    const statusInfo = getStatusInfo(defect.repairStatus || defect.repair_status || 'OPEN');
    const hours = defect.hoursOpen || defect.hours_open || 0;
    const timeColor = getTimeColor(hours);
    const colorStyle = getTimeColorStyle(timeColor);

    const status = defect.repairStatus || defect.repair_status || 'OPEN';
    const isSelectable = status !== 'CLOSED' && status !== 'RELEASED' && status !== 'SCRAPPED';

    return (
      <div
        key={group.serial}
        style={{
          ...styles.serialCard,
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          gap: '16px',
          cursor: 'pointer',
          backgroundColor: selectedDefects.has(defect.id) ? t.accent + '10' : undefined,
          border: selectedDefects.has(defect.id) ? `2px solid ${t.accent}` : undefined
        }}
        onDoubleClick={() => handleDoubleClick(defect)}
        title={L.doubleClickAction}
      >
        {/* Checkbox de selección */}
        {isSelectable && (
          <input
            type="checkbox"
            checked={selectedDefects.has(defect.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleDefectSelection(defect.id);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: t.accent }}
          />
        )}
        {!isSelectable && <div style={{ width: '18px' }} />}

        {/* Tiempo (solo en reparaciones) */}
        {activeTab === 'repairs' && (
          <span style={{
            ...styles.timeIndicator,
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            minWidth: '45px',
            justifyContent: 'center'
          }}>
            {Math.round(hours)}h
          </span>
        )}

        {/* Entry # */}
        <span style={{ minWidth: '80px', fontWeight: '500', color: t.text }}>
          {defect.entryNumber || defect.entry_number}
        </span>

        {/* Serial */}
        <span style={{ minWidth: '120px', fontWeight: '600', color: t.text }}>
          {group.serial}
        </span>

        {/* Parte */}
        <span style={{ minWidth: '120px', color: t.textMuted, fontSize: '13px' }}>
          {group.partNumber}
        </span>

        {/* Ubicación */}
        <span style={{ minWidth: '80px', fontSize: '12px' }}>
          {group.locationCode ? (
            <span style={{
              padding: '2px 6px',
              backgroundColor: t.bgPanel,
              color: t.accent,
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              {group.locationCode}
            </span>
          ) : (
            <span style={{ color: t.textDim }}>—</span>
          )}
        </span>

        {/* Defecto */}
        <span style={{ flex: 1, color: t.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {defect.defectTypeName || defect.defect_type_name}
          {(defect.notes || defect.defectNotes) && <span title={language === 'es' ? 'Comentarios' : 'Comments'}>💬</span>}
          {defect.photos?.length > 0 && <span title={`${defect.photos.length} 📷`}>📷</span>}
        </span>

        {/* Estado */}
        <span style={{
          ...styles.badge,
          backgroundColor: statusInfo.bgColor,
          color: statusInfo.color,
          minWidth: '90px',
          textAlign: 'center'
        }}>
          {statusInfo.label}
        </span>

        {/* Info adicional según tab */}
        {activeTab === 'releases' && (
          <>
            <span style={{ minWidth: '100px', color: t.textMuted, fontSize: '13px' }}>
              {defect.repairTypeName || defect.repair_type_name || '-'}
            </span>
            <span style={{ minWidth: '60px', color: t.textMuted, fontSize: '13px' }}>
              {defect.repairTimeMinutes || defect.repair_time_minutes || '-'} min
            </span>
          </>
        )}

        {activeTab === 'repairs' && (
          <span style={{ minWidth: '30px', color: t.textMuted, fontSize: '13px', textAlign: 'center' }}>
            x{defect.repairAttempts || defect.repair_attempts || 0}
          </span>
        )}

        {/* Acciones */}
        <div style={{ minWidth: '180px', textAlign: 'right' }}>
          {renderDefectActions(defect)}
        </div>
      </div>
    );
  };

  // Render card expandible para múltiples defectos
  const renderMultiDefectCard = (group) => {
    const isExpanded = expandedSerials[group.serial];
    const counts = countByStatus(group.defects);

    return (
      <div key={group.serial} style={styles.serialCard}>
        {/* Header de la card - clickeable para expandir */}
        <div
          style={styles.serialCardHeader}
          onClick={() => toggleExpand(group.serial)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = t.bgPanel}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = t.bgCard}
        >
          <div style={styles.serialInfo}>
            <div style={styles.serialNumber}>{group.serial}</div>
            <div style={styles.partInfo}>
              <span style={styles.partNumber}>{group.partNumber}</span>
              {group.partName !== '-' && <span> - {group.partName}</span>}
              {group.workOrder && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  backgroundColor: t.accentBg,
                  color: t.accentFg,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  OT: {group.workOrder}
                </span>
              )}
              {group.locationCode && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  backgroundColor: t.bgPanel,
                  color: t.accent,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {group.locationCode}
                </span>
              )}
            </div>
          </div>

          {/* Resumen de defectos */}
          <div style={styles.defectSummary}>
            <span>Defectos ({group.defects.length}):</span>
            {counts.open > 0 && (
              <span style={{ ...styles.summaryBadge, backgroundColor: t.bgPanel, color: t.error }}>
                {counts.open} Abiertos
              </span>
            )}
            {counts.inProgress > 0 && (
              <span style={{ ...styles.summaryBadge, backgroundColor: t.bgPanel, color: t.warning }}>
                {counts.inProgress} En Proceso
              </span>
            )}
            {counts.closed > 0 && (
              <span style={{ ...styles.summaryBadge, backgroundColor: t.bgPanel, color: t.success }}>
                {counts.closed} Cerrados
              </span>
            )}
            {counts.quarantine > 0 && (
              <span style={{ ...styles.summaryBadge, backgroundColor: t.bgPanel, color: t.textMuted }}>
                {counts.quarantine} Cuarentena
              </span>
            )}
          </div>

          {/* Icono de expandir */}
          <span style={{ ...styles.expandIcon, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
            ▼
          </span>
        </div>

        {/* Lista de defectos (expandida) */}
        {isExpanded && (
          <div style={styles.defectsContainer}>
            {group.defects.map((defect, idx) => {
              const statusInfo = getStatusInfo(defect.repairStatus || defect.repair_status || 'OPEN');
              const defStatus = defect.repairStatus || defect.repair_status || 'OPEN';
              const hours = defect.hoursOpen || defect.hours_open || 0;
              const timeColor = getTimeColor(hours);
              const colorStyle = getTimeColorStyle(timeColor);
              const isLast = idx === group.defects.length - 1;
              const isSelectable = defStatus !== 'CLOSED' && defStatus !== 'RELEASED' && defStatus !== 'SCRAPPED';

              return (
                <div
                  key={defect.id}
                  style={{
                    ...styles.defectRow,
                    ...(isLast ? styles.defectRowLast : {}),
                    backgroundColor: selectedDefects.has(defect.id) ? t.accent + '10' : undefined,
                    borderLeft: selectedDefects.has(defect.id) ? `3px solid ${t.accent}` : undefined
                  }}
                  onDoubleClick={() => handleDoubleClick(defect)}
                  title={L.doubleClickAction}
                >
                  {/* Checkbox */}
                  {isSelectable && (
                    <input
                      type="checkbox"
                      checked={selectedDefects.has(defect.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleDefectSelection(defect.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: t.accent, marginRight: '8px' }}
                    />
                  )}
                  {!isSelectable && <div style={{ width: '24px' }} />}

                  {/* Tiempo */}
                  {activeTab === 'repairs' && (
                    <span style={{
                      ...styles.timeIndicator,
                      backgroundColor: colorStyle.bg,
                      color: colorStyle.text,
                      minWidth: '45px',
                      justifyContent: 'center'
                    }}>
                      {Math.round(hours)}h
                    </span>
                  )}

                  {/* Entry # */}
                  <span style={{ minWidth: '80px', fontWeight: '500' }}>
                    {defect.entryNumber || defect.entry_number}
                  </span>

                  {/* Defecto */}
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {defect.defectTypeName || defect.defect_type_name}
                    {(defect.notes || defect.defectNotes) && <span title={language === 'es' ? 'Comentarios' : 'Comments'}>💬</span>}
                    {defect.photos?.length > 0 && <span title={`${defect.photos.length} 📷`}>📷</span>}
                  </span>

                  {/* Estado */}
                  <span style={{
                    ...styles.badge,
                    backgroundColor: statusInfo.bgColor,
                    color: statusInfo.color,
                    minWidth: '90px',
                    textAlign: 'center'
                  }}>
                    {statusInfo.label}
                  </span>

                  {/* Info adicional según tab */}
                  {activeTab === 'releases' && (
                    <>
                      <span style={{ minWidth: '100px', color: t.textMuted, fontSize: '13px' }}>
                        {defect.repairTypeName || defect.repair_type_name || '-'}
                      </span>
                      <span style={{ minWidth: '80px', color: t.textMuted, fontSize: '13px' }}>
                        {defect.repairTimeMinutes || defect.repair_time_minutes || '-'} min
                      </span>
                    </>
                  )}

                  {activeTab === 'repairs' && (
                    <span style={{ minWidth: '30px', color: t.textMuted, fontSize: '13px', textAlign: 'center' }}>
                      x{defect.repairAttempts || defect.repair_attempts || 0}
                    </span>
                  )}

                  {/* Acciones */}
                  <div style={{ minWidth: '180px', textAlign: 'right' }}>
                    {renderDefectActions(defect)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render WIP Dashboard
  const renderWIPDashboard = () => {
    const maxWip = Math.max(...wipData.map(w => w.wipCount || 0), 1);
    const totalWip = wipData.reduce((sum, w) => sum + (w.wipCount || 0), 0);

    // Color por tipo de ubicación
    const getTypeColor = (type) => {
      switch(type) {
        case 'REPAIR': return t.warning;
        case 'RELEASE': return t.success;
        case 'MRB': return t.error;
        case 'BUFFER': return t.info;
        case 'INCOMING': return '#9b59b6'; // Morado para en proceso
        default: return t.textMuted;
      }
    };

    // Intensidad del color basada en proporción del total
    const getIntensity = (count) => {
      if (totalWip === 0) return 0.1;
      const ratio = count / totalWip;
      return Math.max(0.15, Math.min(1, ratio * 2 + 0.15));
    };

    return (
      <div>
        {/* Header con total */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '16px 20px',
          backgroundColor: t.bgCard,
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '36px', fontWeight: '600', color: t.accent }}>{totalWip}</div>
              <div style={{ fontSize: '12px', color: t.textMuted, textTransform: 'uppercase' }}>Total WIP</div>
            </div>
            <div style={{ width: '1px', height: '40px', backgroundColor: t.border }} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: t.warning }}>
                  {wipData.filter(w => w.locationType === 'REPAIR').reduce((s, w) => s + (w.wipCount || 0), 0)}
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>REPAIR</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: t.success }}>
                  {wipData.filter(w => w.locationType === 'RELEASE').reduce((s, w) => s + (w.wipCount || 0), 0)}
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>RELEASE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: t.error }}>
                  {wipData.filter(w => w.locationType === 'MRB').reduce((s, w) => s + (w.wipCount || 0), 0)}
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>MRB</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#9b59b6' }}>
                  {wipData.filter(w => w.locationType === 'INCOMING').reduce((s, w) => s + (w.wipCount || 0), 0)}
                </div>
                <div style={{ fontSize: '10px', color: t.textMuted }}>EN PROCESO</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: t.textMuted }}>
            {wipData.length} {language === 'es' ? 'ubicaciones' : 'locations'}
          </div>
        </div>

        {/* Grid compacto de ubicaciones */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          {wipData.map(loc => {
            const typeColor = getTypeColor(loc.locationType);
            const intensity = getIntensity(loc.wipCount);
            const percentage = totalWip > 0 ? ((loc.wipCount / totalWip) * 100).toFixed(1) : 0;

            return (
              <div
                key={loc.locationId}
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${typeColor}`,
                  opacity: loc.wipCount === 0 ? 0.5 : 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Fondo proporcional */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.min(100, (loc.wipCount / maxWip) * 100)}%`,
                  backgroundColor: typeColor,
                  opacity: intensity * 0.2,
                  transition: 'height 0.3s ease'
                }} />

                {/* Contenido */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: typeColor,
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {loc.locationCode}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: loc.wipCount > 0 ? t.text : t.textDim,
                    lineHeight: 1
                  }}>
                    {loc.wipCount}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: t.textMuted,
                    marginTop: '4px'
                  }}>
                    {percentage}% del total
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {wipData.length === 0 && (
          <div style={styles.emptyState}>
            <p>No hay ubicaciones configuradas</p>
            <p style={{ fontSize: '13px', color: t.textDim }}>
              Configura ubicaciones en Admin → Ubicaciones
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render tabla tipo Excel
  const renderGroupedCards = () => {
    if (filteredGroups.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p>{searchFilter ? 'No se encontraron resultados para la búsqueda' : (activeTab === 'repairs' ? 'No hay defectos pendientes de reparación' : 'No hay defectos pendientes de liberación')}</p>
        </div>
      );
    }

    const thBase = {
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '12px',
      color: t.text,
      backgroundColor: t.bgPanel,
      borderBottom: `2px solid ${t.border}`,
      whiteSpace: 'nowrap'
    };

    return (
      <div style={{
        overflowX: 'auto',
        backgroundColor: t.bgCard,
        borderRadius: '8px',
        border: '1px solid ${t.border}'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr>
              <th style={{ ...thBase, width: '40px', textAlign: 'center' }}>✓</th>
              <MainColumnFilter field="entryNumber" label="Entry" style={thBase} />
              <MainColumnFilter field="serialNumber" label="Serial" style={thBase} />
              <MainColumnFilter field="partNumber" label={language === 'es' ? 'Parte' : 'Part'} style={thBase} />
              <MainColumnFilter field="locationName" label={language === 'es' ? 'Ubicación' : 'Location'} style={thBase} />
              <MainColumnFilter field="departmentName" label={language === 'es' ? 'Depto' : 'Dept'} style={thBase} />
              <MainColumnFilter field="defectTypeName" label={language === 'es' ? 'Tipo Defecto' : 'Defect Type'} style={thBase} />
              <MainColumnFilter field="repairStatus" label={language === 'es' ? 'Estado' : 'Status'} style={thBase} />
              <MainColumnFilter field="repairCount" label={language === 'es' ? 'Rep' : 'Rep'} style={thBase} />
              <MainColumnFilter field="lastAction" label={language === 'es' ? 'Últ. Acción' : 'Last Action'} style={thBase} />
              <MainColumnFilter field="capturedAt" label={language === 'es' ? 'Capturado' : 'Captured'} style={thBase} />
              <MainColumnFilter field="updatedAt" label={language === 'es' ? 'Últ. Mov' : 'Last Upd'} style={thBase} />
              <th style={{ ...thBase, whiteSpace: 'nowrap' }}>{language === 'es' ? 'Acciones' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => {
              // Si solo hay 1 defecto, mostrar fila simple
              if (group.defects.length === 1) {
                return renderTableRow(group, group.defects[0]);
              }
              // Si hay múltiples defectos, mostrar múltiples filas
              return group.defects.map((defect, idx) => renderTableRow(group, defect, idx === 0));
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render fila de tabla
  const renderTableRow = (group, defect, showSerial = true) => {
    const status = defect.repairStatus || defect.repair_status || 'OPEN';
    const statusInfo = getStatusInfo(status);
    const hours = defect.hoursOpen || defect.hours_open || 0;
    const timeColor = defect.timeColor || defect.time_color || getTimeColor(hours);
    const colorStyle = {
      GREEN: { bg: t.bgPanel, text: t.success },
      YELLOW: { bg: t.bgPanel, text: t.warning },
      RED: { bg: t.bgPanel, text: t.error }
    }[timeColor] || { bg: t.bgPanel, text: t.textMuted };
    const isSelectable = status !== 'CLOSED' && status !== 'RELEASED' && status !== 'SCRAPPED';

    const cellStyle = {
      padding: '12px 16px',
      borderBottom: '1px solid ${t.border}',
      verticalAlign: 'middle',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    };

    // Formato amigable para último movimiento (Hoy HH:mm, Ayer, o fecha)
    const formatLastUpdate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date >= today) {
        // Hoy: mostrar hora
        return (language === 'es' ? 'Hoy ' : 'Today ') + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } else if (date >= yesterday) {
        return language === 'es' ? 'Ayer' : 'Yesterday';
      } else {
        // Mostrar fecha corta
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      }
    };

    return (
      <tr
        key={defect.id}
        style={{
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          backgroundColor: selectedDefects.has(defect.id) ? t.accent + '15' : undefined
        }}
        onMouseEnter={(e) => { if (!selectedDefects.has(defect.id)) e.currentTarget.style.backgroundColor = t.bgPanel; }}
        onMouseLeave={(e) => { if (!selectedDefects.has(defect.id)) e.currentTarget.style.backgroundColor = 'transparent'; }}
        onDoubleClick={() => handleDoubleClick(defect)}
        title={L.doubleClickAction}
      >
        {/* Checkbox */}
        <td style={{ ...cellStyle, width: '40px', textAlign: 'center' }}>
          {isSelectable ? (
            <input
              type="checkbox"
              checked={activeTab === 'handoff' ? selectedForHandoff.has(defect.id) : selectedDefects.has(defect.id)}
              onChange={(e) => {
                e.stopPropagation();
                if (activeTab === 'handoff') {
                  toggleHandoffSelection(defect.id);
                } else {
                  toggleDefectSelection(defect.id);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: activeTab === 'handoff' ? t.warning : t.accent }}
            />
          ) : (
            <span style={{ color: t.border }}>—</span>
          )}
        </td>
        {/* Entry */}
        <td style={{ ...cellStyle, fontWeight: '500', color: t.text }}>
          {defect.entryNumber || defect.entry_number}
        </td>
        {/* Serial */}
        <td style={{ ...cellStyle, fontWeight: '600', color: t.text, fontFamily: 'monospace', fontSize: '13px' }}>
          {showSerial ? group.serial : '↳'}
        </td>
        {/* Parte */}
        <td style={{ ...cellStyle, color: t.textMuted }}>
          {group.partNumber}
        </td>
        {/* Ubicación */}
        <td style={cellStyle}>
          {(defect.locationCode || defect.location_code || group.locationCode) ? (
            <span style={{
              padding: '2px 6px',
              backgroundColor: t.bgPanel,
              color: t.accent,
              borderRadius: '4px',
              fontWeight: '500',
              fontSize: '11px'
            }}>
              {defect.locationCode || defect.location_code || group.locationCode}
            </span>
          ) : (
            <span style={{ color: t.border }}>—</span>
          )}
        </td>
        {/* Departamento */}
        <td style={{ ...cellStyle, color: t.textMuted, fontSize: '12px' }}>
          {defect.departmentName || defect.department_name || '-'}
        </td>
        {/* Tipo Defecto */}
        <td style={cellStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{defect.defectTypeName || defect.defect_type_name || '-'}</span>
            {(defect.notes || defect.defectNotes) && (
              <span title={language === 'es' ? 'Tiene comentarios' : 'Has comments'} style={{ cursor: 'help' }}>💬</span>
            )}
            {defect.photos && Array.isArray(defect.photos) && defect.photos.length > 0 && (
              <span title={language === 'es' ? `${defect.photos.length} foto(s)` : `${defect.photos.length} photo(s)`} style={{ cursor: 'help' }}>📷</span>
            )}
          </div>
        </td>
        {/* Estado */}
        <td style={cellStyle}>
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: statusInfo.bgColor,
            color: statusInfo.color
          }}>
            {statusInfo.label}
          </span>
        </td>
        {/* Reprocesos */}
        <td style={{ ...cellStyle, textAlign: 'center', color: t.textMuted }}>
          {defect.repairAttempts || defect.repair_attempts || 0}
        </td>
        {/* Última Acción - muestra quién hizo la última acción según estado */}
        <td style={{ ...cellStyle, color: t.textMuted, fontSize: '12px' }}>
          {(() => {
            // Helper para ignorar strings vacíos o solo espacios
            const clean = (val) => val && val.trim() ? val.trim() : null;

            // Cascada de fallbacks para determinar última persona
            const scrappedBy = clean(defect.scrappedByName || defect.scrapped_by_name);
            const quarantinedBy = clean(defect.quarantinedByName || defect.quarantined_by_name);
            const releasedBy = clean(defect.releasedByName || defect.released_by_name);
            const repairedBy = clean(defect.repairedByName || defect.repaired_by_name || defect.repairingByName || defect.repairing_by_name);
            const capturedBy = clean(defect.capturedByName || defect.captured_by_name);

            if (status === 'SCRAPPED' || status === 'SCRAP_CONFIRMED') {
              return scrappedBy || releasedBy || repairedBy || capturedBy || '-';
            }
            if (status === 'QUARANTINE') {
              return quarantinedBy || repairedBy || capturedBy || '-';
            }
            if (status === 'RELEASED' || status === 'CLOSED') {
              return releasedBy || repairedBy || capturedBy || '-';
            }
            if (status === 'IN_REPAIR') {
              return repairedBy || capturedBy || '-';
            }
            if (status === 'REPAIRED' || status === 'IN_VALIDATION') {
              return repairedBy || capturedBy || '-';
            }
            // OPEN, REJECTED, etc.
            return repairedBy || capturedBy || '-';
          })()}
        </td>
        {/* Capturado por */}
        <td style={{ ...cellStyle, color: t.textMuted, fontSize: '12px' }}>
          {defect.capturedByName || defect.captured_by_name || '-'}
        </td>
        {/* Último Movimiento */}
        <td style={{ ...cellStyle, color: t.textMuted, fontSize: '11px' }} title={defect.updatedAt || defect.updated_at ? new Date(defect.updatedAt || defect.updated_at).toLocaleString() : ''}>
          {formatLastUpdate(defect.updatedAt || defect.updated_at || defect.capturedAt || defect.captured_at)}
        </td>
        {/* Acciones */}
        <td style={cellStyle}>
          {renderDefectActions(defect)}
        </td>
      </tr>
    );
  };

  // Render modal
  const renderModal = () => {
    if (!modalOpen) return null;

    const titles = {
      start: 'Iniciar Reparación',
      complete: 'Completar Reparación',
      release: 'Liberar Defecto',
      reject: 'Rechazar Reparación'
    };

    return (
      <div style={styles.modal} onClick={() => setModalOpen(false)}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.modalTitle}>{titles[modalAction]}</h3>

          {selectedDefect && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
              <div><strong>Entry:</strong> {selectedDefect.entryNumber || selectedDefect.entry_number}</div>
              <div><strong>Serial:</strong> {selectedDefect.serialNumber || selectedDefect.serial_number || selectedDefect.lotNumber || selectedDefect.lot_number}</div>
              <div><strong>Parte:</strong> {selectedDefect.partNumber || selectedDefect.part_number || '-'}</div>
              <div><strong>Defecto:</strong> {selectedDefect.defectTypeName || selectedDefect.defect_type_name}</div>

              {/* Comentarios del inspector */}
              {(selectedDefect.notes || selectedDefect.defectNotes) && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                  <strong>{language === 'es' ? 'Comentarios:' : 'Comments:'}</strong>
                  <div style={{
                    marginTop: '4px',
                    padding: '8px',
                    backgroundColor: t.bgCard,
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: t.text,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '100px',
                    overflowY: 'auto'
                  }}>
                    {selectedDefect.notes || selectedDefect.defectNotes}
                  </div>
                </div>
              )}

              {/* Fotos del defecto */}
              {selectedDefect.photos && Array.isArray(selectedDefect.photos) && selectedDefect.photos.length > 0 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                  <strong>{language === 'es' ? 'Fotos:' : 'Photos:'}</strong>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {selectedDefect.photos.map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo.url || photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: `1px solid ${t.border}`
                        }}
                      >
                        <img
                          src={photo.url || photo}
                          alt={`Foto ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {modalAction === 'complete' && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                  <strong>Área Responsable Actual:</strong>{' '}
                  <span style={{
                    backgroundColor: t.bgPanel,
                    color: t.accent,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    {selectedDefect.departmentName || selectedDefect.department_name || L.notAssigned}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Selector de estación para iniciar reparación */}
          {modalAction === 'start' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Estación de Reparación' : 'Repair Station'}</label>
              <select
                style={styles.select}
                value={formData.repairStationId}
                onChange={(e) => setFormData({ ...formData, repairStationId: e.target.value })}
              >
                <option value="">{language === 'es' ? '-- Seleccionar estación --' : '-- Select station --'}</option>
                {repairStations.map((station) => (
                  <option key={station.id} value={station.id}>{station.name}</option>
                ))}
              </select>
              {repairStations.length === 0 && (
                <p style={{ fontSize: '12px', color: t.textDim, marginTop: '4px' }}>
                  {language === 'es' ? 'No hay estaciones de reparación configuradas' : 'No repair stations configured'}
                </p>
              )}
            </div>
          )}

          {modalAction === 'complete' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Tipo de Reparación *' : 'Repair Type *'}</label>
                <select
                  style={styles.select}
                  value={formData.repairTypeId}
                  onChange={(e) => setFormData({ ...formData, repairTypeId: e.target.value })}
                >
                  {repairTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Tiempo de Reparación (min) *' : 'Repair Time (min) *'}</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.repairTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, repairTimeMinutes: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Causa Raíz *' : 'Root Cause *'}</label>
                <select
                  style={{
                    ...styles.select,
                    borderColor: !formData.rootCauseId ? '#f59e0b' : styles.select.borderColor
                  }}
                  value={formData.rootCauseId}
                  onChange={(e) => setFormData({ ...formData, rootCauseId: e.target.value })}
                >
                  <option value="">{language === 'es' ? '-- Seleccionar --' : '-- Select --'}</option>
                  {rootCauses.map((cause) => (
                    <option key={cause.id} value={cause.id}>{cause.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Reasignar Área Responsable' : 'Reassign Responsible Area'}</label>
                <select
                  style={{
                    ...styles.select,
                    border: formData.newDepartmentId ? `2px solid ${t.warning}` : undefined
                  }}
                  value={formData.newDepartmentId}
                  onChange={(e) => setFormData({ ...formData, newDepartmentId: e.target.value })}
                >
                  <option value="">{language === 'es' ? '-- No reasignar (mantener actual) --' : '-- Do not reassign (keep current) --'}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {formData.newDepartmentId && (
                  <p style={{ fontSize: '12px', color: t.warning, marginTop: '4px' }}>
                    {language === 'es' ? 'Se reasignará el área responsable. El comentario es obligatorio.' : 'Responsible area will be reassigned. Comment is required.'}
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {language === 'es' ? 'Notas' : 'Notes'} {formData.newDepartmentId && <span style={{ color: t.error }}>*</span>}
                </label>
                <DebouncedTextarea
                  style={{
                    ...styles.textarea,
                    border: formData.newDepartmentId && !formData.repairNotes.trim()
                      ? `1px solid ${t.error}`
                      : undefined
                  }}
                  value={formData.repairNotes}
                  onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })}
                  placeholder={formData.newDepartmentId
                    ? "Obligatorio: Explica el motivo de la reasignación..."
                    : "Descripción de la reparación realizada..."}
                />
              </div>

              {/* Vincular a Desviación (opcional) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {language === 'es' ? 'Vincular a Desviación' : 'Link to Deviation'}
                  <span style={{ fontWeight: 'normal', color: t.textMuted, marginLeft: '8px' }}>
                    ({language === 'es' ? 'opcional - para liberación posterior' : 'optional - for later release'})
                  </span>
                </label>
                {availableDeviations.length > 0 ? (
                  <>
                    <select
                      style={{
                        ...styles.select,
                        border: formData.deviationId ? `2px solid ${t.accent}` : undefined
                      }}
                      value={formData.deviationId}
                      onChange={(e) => setFormData({ ...formData, deviationId: e.target.value })}
                    >
                      <option value="">{language === 'es' ? '-- Sin desviación --' : '-- No deviation --'}</option>
                      {availableDeviations.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.referenceNumber} - {getDeviationTypeLabel(dev.deviationType)} - {dev.description?.substring(0, 40)}...
                        </option>
                      ))}
                    </select>
                    {formData.deviationId && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        backgroundColor: t.accent + '15',
                        border: `1px solid ${t.accent}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: t.text
                      }}>
                        {language === 'es'
                          ? 'Este defecto se vinculará a la desviación para validación y liberación por Calidad.'
                          : 'This defect will be linked to the deviation for validation and release by Quality.'}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '10px',
                    backgroundColor: t.bgPanel,
                    border: `1px dashed ${t.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: t.textMuted,
                    textAlign: 'center'
                  }}>
                    {language === 'es'
                      ? 'No hay desviaciones activas para este número de parte'
                      : 'No active deviations for this part number'}
                  </div>
                )}
              </div>
            </>
          )}

          {modalAction === 'release' && (
            <>
              {/* Información del área responsable */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: t.bgPanel,
                borderRadius: '6px',
                border: `1px solid ${t.success}`
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Área Responsable:</strong>{' '}
                  <span style={{
                    backgroundColor: t.bgPanel,
                    color: t.accent,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    {selectedDefect?.departmentName || selectedDefect?.department_name || L.notAssigned}
                  </span>
                </div>

                {/* Advertencia si fue reasignado */}
                {selectedDefect?.originalDepartmentId && selectedDefect?.originalDepartmentId !== selectedDefect?.departmentId && (
                  <div style={{
                    backgroundColor: t.bgPanel,
                    border: `1px solid ${t.warning}`,
                    borderRadius: '6px',
                    padding: '10px',
                    marginTop: '8px'
                  }}>
                    <div style={{ color: t.warning, fontWeight: '600', marginBottom: '4px' }}>
                      Responsable Reasignado
                    </div>
                    <div style={{ fontSize: '13px', color: t.warning }}>
                      <strong>Original:</strong> {selectedDefect?.originalDepartmentName || selectedDefect?.original_department_name || '-'}
                      <br />
                      <strong>Reasignado por:</strong> {selectedDefect?.responsibleChangedByName || selectedDefect?.responsible_changed_by_name || '-'}
                    </div>
                  </div>
                )}

                {/* Notas del reparador */}
                {(selectedDefect?.repairNotes || selectedDefect?.repair_notes) && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Comentario de Reparación:</strong>
                    <div style={{
                      backgroundColor: t.bgCard,
                      border: '1px solid ${t.border}',
                      borderRadius: '4px',
                      padding: '8px',
                      marginTop: '4px',
                      fontSize: '13px',
                      color: t.text,
                      fontStyle: 'italic'
                    }}>
                      "{selectedDefect?.repairNotes || selectedDefect?.repair_notes}"
                    </div>
                  </div>
                )}
              </div>

              {/* Re-verificación de Spec (solo si el defecto vino de una spec NOK) */}
              {loadingSpecInfo && (
                <div style={{ textAlign: 'center', padding: '16px', color: t.textMuted }}>
                  {language === 'es' ? 'Cargando información de spec...' : 'Loading spec info...'}
                </div>
              )}

              {specInfo && specInfo.hasSpec && (
                <div style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: t.danger + '15',
                  borderRadius: '8px',
                  border: `2px solid ${t.danger}`
                }}>
                  <div style={{
                    fontWeight: '700',
                    color: t.danger,
                    marginBottom: '12px',
                    fontSize: '15px'
                  }}>
                    ⚠️ {language === 'es' ? 'RE-VERIFICACIÓN REQUERIDA' : 'RE-VERIFICATION REQUIRED'}
                  </div>

                  {/* Info de la spec original */}
                  <div style={{
                    backgroundColor: t.bgCard,
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      {specInfo.spec.specNumber} - {specInfo.spec.specName}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: t.textMuted }}>{language === 'es' ? 'Límites:' : 'Limits:'}</span>{' '}
                        <span style={{ fontWeight: '500' }}>
                          {specInfo.spec.lowerLimit} - {specInfo.spec.upperLimit} {specInfo.spec.unit || ''}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: t.textMuted }}>{language === 'es' ? 'Nominal:' : 'Nominal:'}</span>{' '}
                        <span style={{ fontWeight: '500' }}>{specInfo.spec.nominalValue} {specInfo.spec.unit || ''}</span>
                      </div>
                    </div>
                    {specInfo.spec.originalMeasuredValue && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: t.danger + '20',
                        borderRadius: '4px',
                        color: t.danger,
                        fontWeight: '600'
                      }}>
                        {language === 'es' ? 'Valor Original NOK:' : 'Original NOK Value:'}{' '}
                        {specInfo.spec.originalMeasuredValue} {specInfo.spec.unit || ''}
                      </div>
                    )}
                    {specInfo.spec.isCritical && (
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: t.danger,
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {language === 'es' ? 'CARACTERÍSTICA CRÍTICA' : 'CRITICAL CHARACTERISTIC'}
                      </div>
                    )}
                  </div>

                  {/* Resultado de re-verificación */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...styles.label, color: t.text }}>
                      {language === 'es' ? 'Resultado de Re-verificación *' : 'Re-verification Result *'}
                    </label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, reverificationResult: 'OK' })}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: `2px solid ${formData.reverificationResult === 'OK' ? t.success : t.border}`,
                          borderRadius: '8px',
                          backgroundColor: formData.reverificationResult === 'OK' ? t.success + '20' : t.bgCard,
                          color: formData.reverificationResult === 'OK' ? t.success : t.text,
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✓ OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, reverificationResult: 'NOK' })}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: `2px solid ${formData.reverificationResult === 'NOK' ? t.danger : t.border}`,
                          borderRadius: '8px',
                          backgroundColor: formData.reverificationResult === 'NOK' ? t.danger + '20' : t.bgCard,
                          color: formData.reverificationResult === 'NOK' ? t.danger : t.text,
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✗ NOK
                      </button>
                    </div>
                  </div>

                  {/* Valor medido en re-verificación */}
                  <div>
                    <label style={{ ...styles.label, color: t.text }}>
                      {language === 'es' ? 'Valor Medido en Re-verificación' : 'Measured Value in Re-verification'}
                      {specInfo.spec.unit && <span style={{ fontWeight: 'normal' }}> ({specInfo.spec.unit})</span>}
                    </label>
                    <input
                      type="number"
                      step="any"
                      style={{
                        ...styles.input,
                        backgroundColor: t.bgCard
                      }}
                      value={formData.reverificationValue}
                      onChange={(e) => setFormData({ ...formData, reverificationValue: e.target.value })}
                      placeholder={specInfo.spec.nominalValue ? `Nominal: ${specInfo.spec.nominalValue}` : ''}
                    />
                  </div>

                  {/* Warning si NOK */}
                  {formData.reverificationResult === 'NOK' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: t.danger + '20',
                      border: `1px solid ${t.danger}`,
                      borderRadius: '6px',
                      color: t.danger,
                      fontSize: '13px'
                    }}>
                      ⚠️ {language === 'es'
                        ? 'No se puede liberar si la re-verificación es NOK. El defecto debe volver a reparación.'
                        : 'Cannot release if re-verification is NOK. Defect must return to repair.'}
                    </div>
                  )}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Estación de Liberación' : 'Release Station'}</label>
                <select
                  style={styles.select}
                  value={formData.releaseStationId}
                  onChange={(e) => setFormData({ ...formData, releaseStationId: e.target.value })}
                >
                  <option value="">{language === 'es' ? '-- Seleccionar estación --' : '-- Select station --'}</option>
                  {releaseStations.map((station) => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </select>
                {releaseStations.length === 0 && (
                  <p style={{ fontSize: '12px', color: t.textDim, marginTop: '4px' }}>
                    {language === 'es' ? 'No hay estaciones de liberación configuradas' : 'No release stations configured'}
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Motivo de Liberación *' : 'Release Reason *'}</label>
                <select
                  style={styles.select}
                  value={formData.releaseReasonId}
                  onChange={(e) => setFormData({ ...formData, releaseReasonId: e.target.value })}
                >
                  {releaseReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>{reason.name}</option>
                  ))}
                </select>
              </div>

              {/* Liberación por Desviación */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {language === 'es' ? 'Desviación Aplicable' : 'Applicable Deviation'}
                  <span style={{ fontWeight: 'normal', color: t.textMuted, marginLeft: '8px' }}>
                    ({language === 'es' ? 'opcional' : 'optional'})
                  </span>
                </label>
                {availableDeviations.length > 0 ? (
                  <>
                    <select
                      style={{
                        ...styles.select,
                        border: formData.deviationId ? `2px solid ${t.accent}` : undefined
                      }}
                      value={formData.deviationId}
                      onChange={(e) => setFormData({ ...formData, deviationId: e.target.value })}
                    >
                      <option value="">{language === 'es' ? '-- Sin desviación --' : '-- No deviation --'}</option>
                      {availableDeviations.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.referenceNumber} - {getDeviationTypeLabel(dev.deviationType)} - {dev.description?.substring(0, 50)}...
                        </option>
                      ))}
                    </select>
                    {formData.deviationId && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        backgroundColor: t.accent + '10',
                        border: `1px solid ${t.accent}`,
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        <div style={{ fontWeight: '600', color: t.accent, marginBottom: '4px' }}>
                          {language === 'es' ? 'Liberación con Desviación' : 'Release with Deviation'}
                        </div>
                        <div style={{ color: t.text }}>
                          {availableDeviations.find(d => d.id === parseInt(formData.deviationId))?.description}
                        </div>
                        {availableDeviations.find(d => d.id === parseInt(formData.deviationId))?.validityDate && (
                          <div style={{ color: t.textMuted, marginTop: '4px' }}>
                            {language === 'es' ? 'Vigencia:' : 'Valid until:'} {new Date(availableDeviations.find(d => d.id === parseInt(formData.deviationId))?.validityDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '10px',
                    backgroundColor: t.bgPanel,
                    border: `1px dashed ${t.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: t.textMuted,
                    textAlign: 'center'
                  }}>
                    {language === 'es'
                      ? 'No hay desviaciones activas para este número de parte'
                      : 'No active deviations for this part number'}
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Tiempo de Validación (min)' : 'Validation Time (min)'}</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.releaseTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, releaseTimeMinutes: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Reasignar Área Responsable' : 'Reassign Responsible Area'}</label>
                <select
                  style={{
                    ...styles.select,
                    border: formData.newDepartmentId ? `2px solid ${t.warning}` : undefined
                  }}
                  value={formData.newDepartmentId || ''}
                  onChange={(e) => setFormData({ ...formData, newDepartmentId: e.target.value })}
                >
                  <option value="">{language === 'es' ? '-- No reasignar (mantener actual) --' : '-- Do not reassign (keep current) --'}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {formData.newDepartmentId && (
                  <p style={{ fontSize: '12px', color: t.warning, marginTop: '4px' }}>
                    {language === 'es' ? 'Se reasignará el área responsable al liberar.' : 'Responsible area will be reassigned on release.'}
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Notas' : 'Notes'}</label>
                <DebouncedTextarea
                  style={styles.textarea}
                  value={formData.releaseNotes}
                  onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
                  placeholder={language === 'es' ? 'Observaciones de la liberación...' : 'Release observations...'}
                />
              </div>
            </>
          )}

          {modalAction === 'reject' && (
            <>
              {/* Selector de destino */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Destino del Rechazo *' : 'Rejection Destination *'}</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setRejectDestination('REPAIR'); setRejectSelectedStation(null); }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: rejectDestination === 'REPAIR' ? `2px solid ${t.warning}` : `1px solid ${t.border}`,
                      backgroundColor: rejectDestination === 'REPAIR' ? (t.warning + '20') : t.bgPanel,
                      color: rejectDestination === 'REPAIR' ? t.warning : t.text,
                      cursor: 'pointer',
                      fontWeight: rejectDestination === 'REPAIR' ? '600' : '400',
                      fontSize: '13px'
                    }}
                  >
                    🔧 {language === 'es' ? 'Reparaciones' : 'Repairs'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectDestination('SCRAP'); setRejectSelectedStation(null); }}
                    disabled={!canDoScrapActions}
                    title={!canDoScrapActions ? (language === 'es' ? 'No tienes permiso de SCRAP' : 'You do not have SCRAP permission') : ''}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: rejectDestination === 'SCRAP' ? `2px solid ${t.danger}` : `1px solid ${t.border}`,
                      backgroundColor: rejectDestination === 'SCRAP' ? (t.danger + '20') : t.bgPanel,
                      color: rejectDestination === 'SCRAP' ? t.danger : t.text,
                      cursor: canDoScrapActions ? 'pointer' : 'not-allowed',
                      fontWeight: rejectDestination === 'SCRAP' ? '600' : '400',
                      fontSize: '13px',
                      opacity: canDoScrapActions ? 1 : 0.5
                    }}
                  >
                    🗑️ Scrap
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectDestination('QUARANTINE'); setRejectSelectedStation(null); }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: rejectDestination === 'QUARANTINE' ? `2px solid ${t.info}` : `1px solid ${t.border}`,
                      backgroundColor: rejectDestination === 'QUARANTINE' ? (t.info + '20') : t.bgPanel,
                      color: rejectDestination === 'QUARANTINE' ? t.info : t.text,
                      cursor: 'pointer',
                      fontWeight: rejectDestination === 'QUARANTINE' ? '600' : '400',
                      fontSize: '13px'
                    }}
                  >
                    ⚠️ MRB
                  </button>
                </div>
              </div>

              {/* Selección de estación - Solo para REPAIR */}
              {rejectDestination === 'REPAIR' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {language === 'es' ? '📍 Estación de Reparación (destino) *' : '📍 Repair Station (destination) *'}
                  </label>

                  {/* Dropdown de estaciones */}
                  <select
                    value={rejectSelectedStation?.id || ''}
                    onChange={(e) => {
                      const station = repairStations.find(s => s.id === parseInt(e.target.value));
                      setRejectSelectedStation(station || null);
                      setRejectStationCode('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${rejectSelectedStation ? t.success : t.border}`,
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  >
                    <option value="">{language === 'es' ? '-- Seleccionar estación --' : '-- Select station --'}</option>
                    {repairStations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.code} - {station.name}
                      </option>
                    ))}
                  </select>

                  {/* Separador */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                    <span style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'o escanear' : 'or scan'}</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                  </div>

                  {/* Input de escaneo */}
                  <input
                    type="text"
                    value={rejectStationCode}
                    onChange={(e) => setRejectStationCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const code = rejectStationCode.trim();
                        if (!code) return;
                        const found = repairStations.find(s =>
                          s.code?.toUpperCase() === code ||
                          s.name?.toUpperCase() === code
                        );
                        if (found) {
                          setRejectSelectedStation(found);
                          setRejectStationCode('');
                        } else {
                          setError(language === 'es' ? 'Estación no encontrada' : 'Station not found');
                        }
                      }
                    }}
                    placeholder={language === 'es' ? '📷 Escanear código de estación...' : '📷 Scan station code...'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px'
                    }}
                  />

                  {/* Estación seleccionada */}
                  {rejectSelectedStation && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      backgroundColor: t.success + '15',
                      border: `1px solid ${t.success}`,
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: t.success }}>
                          ✓ {rejectSelectedStation.code}
                        </span>
                        <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>
                          {rejectSelectedStation.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRejectSelectedStation(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.textMuted,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >×</button>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo del rechazo */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Motivo del Rechazo *' : 'Rejection Reason *'}</label>
                <DebouncedTextarea
                  style={styles.textarea}
                  value={formData.rejectNotes}
                  onChange={(e) => setFormData({ ...formData, rejectNotes: e.target.value })}
                  placeholder={language === 'es' ? 'Explica por qué se rechaza la reparación...' : 'Explain why the repair is rejected...'}
                  required
                />
              </div>
            </>
          )}

          <div style={styles.modalActions}>
            <button style={styles.btnCancel} onClick={() => setModalOpen(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              style={styles.btnConfirm}
              onClick={executeAction}
              disabled={loading}
            >
              {loading ? (language === 'es' ? 'Procesando...' : 'Processing...') : (language === 'es' ? 'Confirmar' : 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Access Denied Banner */}
      {showAccessDenied && (
        <div style={{
          backgroundColor: '#fef2f2',
          borderBottom: '2px solid #ef4444',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚫</span>
            <div>
              <div style={{ color: '#991b1b', fontWeight: '600', fontSize: '16px' }}>
                Acceso a Captura de Defectos Denegado
              </div>
              <div style={{ color: '#b91c1c', fontSize: '14px' }}>
                {accessDeniedReason}
              </div>
            </div>
          </div>
          <button
            onClick={handleCloseAccessDenied}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#991b1b'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>
          {L.title || 'Hospital de Defectos'}
          {!isAdminMode && (
            <span style={{
              fontSize: '14px',
              fontWeight: '400',
              marginLeft: '12px',
              color: getModeColor().text,
              backgroundColor: getModeColor().bg,
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${getModeColor().border}`
            }}>
              {isRepairMode ? (language === 'es' ? 'Reparadores' : 'Repair Techs') : (language === 'es' ? 'Calidad' : 'QA')}
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => {
              const newLang = language === 'es' ? 'en' : 'es';
              if (typeof changeLanguage === 'function') changeLanguage(newLang);
            }}
            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}
          >
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: t.border, margin: '0 4px' }} />
          {/* Asignar Ubicación (Batch) - disponible en todos los modos */}
          <button
            style={{ ...styles.refreshButton, backgroundColor: t.info, color: 'white' }}
            onClick={() => openAssignLocationModal()}
          >
            {L.assignLocation || 'Asignar Ubicación'}
          </button>
          <button style={styles.refreshButton} onClick={loadData} disabled={loading}>
            {loading ? (language === 'es' ? 'Cargando...' : 'Loading...') : (language === 'es' ? 'Actualizar' : 'Refresh')}
          </button>
          <ThemeSelector />
          <button
            style={{ ...styles.refreshButton, backgroundColor: t.primary, color: 'white' }}
            onClick={() => navigate('/')}
          >
            {language === 'es' ? 'Inicio' : 'Home'}
          </button>
          <button
            style={{ ...styles.refreshButton, backgroundColor: t.success, color: 'white' }}
            onClick={() => navigate('/hospital-dashboard')}
          >
            Dashboard
          </button>
          <button
            style={{ ...styles.refreshButton, backgroundColor: t.accent, color: 'white' }}
            onClick={() => navigate('/defect-capture')}
          >
            {language === 'es' ? 'Captura' : 'Capture'}
          </button>
          <button
            style={{ ...styles.refreshButton, backgroundColor: '#0369a1', color: 'white' }}
            onClick={() => navigate('/repair-station')}
          >
            {language === 'es' ? 'Estación' : 'Station'}
          </button>
          {canAccessAdmin && (
            <button
              style={{ ...styles.refreshButton, backgroundColor: t.textMuted, color: 'white' }}
              onClick={() => navigate('/defect-admin')}
            >
              Config
            </button>
          )}
        </div>
      </div>

      {/* Stats - según modo y rol */}
      <div style={styles.statsRow}>
        {/* Stats de reparación - solo si tiene permiso */}
        {showRepairContent && (
          <>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: t.warning }}>{pendingWithoutLocation.length}</div>
              <div style={styles.statLabel}>{language === 'es' ? 'Requieren Ubicación' : 'Need Location'}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: t.success }}>{pendingWithLocation.length}</div>
              <div style={styles.statLabel}>{language === 'es' ? 'Listos para Reparar' : 'Ready to Repair'}</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: t.accent }}>
                {inRepairDefects.length}
              </div>
              <div style={styles.statLabel}>{language === 'es' ? 'En Reparación' : 'In Repair'}</div>
            </div>
          </>
        )}
        {/* Stats de liberación - solo si tiene permiso */}
        {showReleaseContent && (
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: t.accent }}>{pendingReleases.length}</div>
            <div style={styles.statLabel}>{language === 'es' ? 'Pendientes Liberación' : 'Pending Release'}</div>
          </div>
        )}
      </div>

      {/* Alerts - Modal estilo QAR */}
      {error && (
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
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '3px solid #991b1b',
              fontSize: '32px'
            }}>✕</div>
            <h3 style={{ color: '#991b1b', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Error</h3>
            <p style={{ color: t.textMuted, fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>{error}</p>
            <button
              onClick={() => setError(null)}
              style={{ padding: '14px 32px', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' }}
            >Aceptar</button>
          </div>
        </div>
      )}
      {success && (
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
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '3px solid #1e40af',
              fontSize: '32px'
            }}>✓</div>
            <h3 style={{ color: '#1e40af', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Éxito</h3>
            <p style={{ color: t.textMuted, fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>{success}</p>
            <button
              onClick={() => setSuccess(null)}
              style={{ padding: '14px 32px', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' }}
            >Aceptar</button>
          </div>
        </div>
      )}

      {/* Banner de paquetes entrantes desde MRB */}
      {incomingPackages.length > 0 && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <div>
              <div style={{ fontWeight: '600', color: '#92400e', fontSize: '14px' }}>
                {incomingPackages.length} {language === 'es' ? 'paquete(s) desde MRB pendiente(s)' : 'pending package(s) from MRB'}
              </div>
              <div style={{ fontSize: '12px', color: '#a16207' }}>
                {language === 'es' ? 'Material REWORK listo para recibir' : 'REWORK material ready to receive'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedIncomingPackage(incomingPackages[0]);
              setShowReceivePackageModal(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f59e0b',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            {language === 'es' ? 'Ver Paquetes' : 'View Packages'}
          </button>
        </div>
      )}

      {/* Barra de modo y estación */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '12px 16px',
        backgroundColor: getModeColor().bg,
        borderRadius: '8px',
        marginBottom: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        border: `1px solid ${getModeColor().border}`
      }}>
        {/* Indicador de modo */}
        <span style={{
          fontSize: '14px',
          color: getModeColor().text,
          fontWeight: '600',
          padding: '4px 12px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: `1px solid ${getModeColor().border}`
        }}>
          {getModeName()}
        </span>

        <span style={{ fontSize: '13px', color: getModeColor().text, fontWeight: '500' }}>
          {language === 'es' ? 'Estación:' : 'Station:'}
        </span>

        {/* Estación de Reparación - solo si tiene permiso */}
        {showRepairContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              backgroundColor: sessionRepairStation ? t.bgPanel : t.bgPanel,
              color: sessionRepairStation ? t.warning : t.textDim,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              border: sessionRepairStation ? `1px solid ${t.warning}` : `1px dashed ${t.border}`
            }}>
              {sessionRepairStation ? sessionRepairStation.name : (language === 'es' ? 'Sin estación' : 'No station')}
            </span>
            {sessionRepairStation ? (
              <button
                onClick={() => clearSessionStation('REPAIR')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: t.textDim,
                  fontSize: '14px'
                }}
                title={language === 'es' ? 'Cambiar estación' : 'Change station'}
              >
                X
              </button>
            ) : repairStations.length > 0 && (
              <button
                onClick={() => openStationSelector('REPAIR')}
                style={{
                  background: t.bgPanel,
                  border: `1px solid ${t.warning}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  color: t.warning,
                  fontSize: '12px'
                }}
              >
                {language === 'es' ? 'Seleccionar' : 'Select'}
              </button>
            )}
          </div>
        )}

        {/* Estación de Liberación - solo si tiene permiso */}
        {showReleaseContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              backgroundColor: sessionReleaseStation ? t.bgPanel : t.bgPanel,
              color: sessionReleaseStation ? t.success : t.textDim,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              border: sessionReleaseStation ? `1px solid ${t.success}` : `1px dashed ${t.border}`
            }}>
              {sessionReleaseStation ? sessionReleaseStation.name : (language === 'es' ? 'Sin estación' : 'No station')}
            </span>
            {sessionReleaseStation ? (
              <button
                onClick={() => clearSessionStation('RELEASE')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: t.textDim,
                  fontSize: '14px'
                }}
                title={language === 'es' ? 'Cambiar estación' : 'Change station'}
              >
                X
              </button>
            ) : releaseStations.length > 0 && (
              <button
                onClick={() => openStationSelector('RELEASE')}
                style={{
                  background: t.bgPanel,
                  border: `1px solid ${t.success}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  color: t.success,
                  fontSize: '12px'
                }}
              >
                {language === 'es' ? 'Seleccionar' : 'Select'}
              </button>
            )}
          </div>
        )}

        {/* Botón volver al Dashboard en modo no-admin */}
        {!isAdminMode && (
          <button
            onClick={() => navigate('/hospital-dashboard')}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              backgroundColor: 'white',
              border: `1px solid ${getModeColor().border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              color: getModeColor().text
            }}
          >
            ← {language === 'es' ? 'Cambiar modo' : 'Change mode'}
          </button>
        )}
      </div>

      {/* Tabs - filtrados según modo */}
      <div style={styles.tabs}>
        {/* General: visible en todos los modos - TODOS los defectos */}
        <button
          style={{ ...styles.tab, ...(activeTab === 'general' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setActiveTab('general')}
        >
          General ({generalPagination.total || allDefects.length})
        </button>

        {/* Por Reparar: solo si tiene permiso de reparación */}
        {showRepairContent && (
          <button
            style={{ ...styles.tab, ...(activeTab === 'repairs' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('repairs')}
          >
            {language === 'es' ? 'Por Reparar' : 'To Repair'} ({pendingWithoutLocation.length} | {pendingWithLocation.length})
          </button>
        )}

        {/* En Reparación: solo si tiene permiso de reparación */}
        {showRepairContent && (
          <button
            style={{ ...styles.tab, ...(activeTab === 'inRepair' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('inRepair')}
          >
            {language === 'es' ? 'En Reparación' : 'In Repair'} ({inRepairDefects.length})
          </button>
        )}

        {/* Ready for Validation: defectos reparados esperando destino */}
        {showRepairContent && (
          <button
            style={{ ...styles.tab, ...(activeTab === 'handoff' ? styles.tabActive : styles.tabInactive), backgroundColor: activeTab === 'handoff' ? (t.warning || '#f59e0b') : undefined }}
            onClick={() => setActiveTab('handoff')}
          >
            {language === 'es' ? 'Listo para Validación' : 'Ready for Validation'} ({pendingHandoff.length})
          </button>
        )}

        {/* Liberaciones: solo si tiene permiso de liberación */}
        {showReleaseContent && (
          <button
            style={{ ...styles.tab, ...(activeTab === 'releases' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('releases')}
          >
            {language === 'es' ? 'Liberaciones' : 'Releases'} ({pendingReleases.length})
          </button>
        )}

        {/* MRB: Cuarentena y Scrap */}
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'mrb' ? styles.tabActive : styles.tabInactive),
            backgroundColor: activeTab === 'mrb' ? '#dc2626' : undefined,
            color: activeTab === 'mrb' ? '#fff' : undefined
          }}
          onClick={() => setActiveTab('mrb')}
        >
          MRB ({quarantineDefects.length + scrappedDefects.length})
        </button>

        {/* WIP: visible en todos los modos */}
        <button
          style={{ ...styles.tab, ...(activeTab === 'wip' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setActiveTab('wip')}
        >
          WIP ({wipData.reduce((sum, w) => sum + (w.wipCount || 0), 0)})
        </button>

        {/* Trazabilidad: visible en todos los modos */}
        <button
          style={{ ...styles.tab, ...(activeTab === 'traceability' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => {
            setActiveTab('traceability');
            setTimeout(() => traceInputRef.current?.focus(), 100);
          }}
        >
          {language === 'es' ? 'Trazabilidad' : 'Traceability'}
        </button>

        {/* Desviaciones: solo si tiene permiso */}
        {canManageDeviations && (
          <button
            style={{ ...styles.tab, ...(activeTab === 'deviations' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('deviations')}
          >
            {language === 'es' ? 'Desviaciones' : 'Deviations'} ({deviations.length})
          </button>
        )}

        {/* Reports: visible para todos */}
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'reports' ? styles.tabActive : styles.tabInactive),
            backgroundColor: activeTab === 'reports' ? '#8b5cf6' : undefined,
            color: activeTab === 'reports' ? '#fff' : undefined
          }}
          onClick={() => setActiveTab('reports')}
        >
          📊 {language === 'es' ? 'Reportes' : 'Reports'}
        </button>
      </div>

      {/* Filtros para tab To Repair */}
      {activeTab === 'repairs' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '10px 16px',
          backgroundColor: t.bgPanel,
          borderRadius: '8px',
          border: `1px solid ${t.border}`
        }}>
          <span style={{ fontSize: '13px', color: t.textMuted, marginRight: '8px' }}>
            {language === 'es' ? 'Filtrar:' : 'Filter:'}
          </span>
          {/* Chip: Todos */}
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: repairsSubTab === 'all' ? t.accent : 'transparent',
              color: repairsSubTab === 'all' ? 'white' : t.text,
              border: `1px solid ${repairsSubTab === 'all' ? t.accent : t.border}`,
              transition: 'all 0.2s'
            }}
            onClick={() => setRepairsSubTab('all')}
          >
            {language === 'es' ? 'Todos' : 'All'} ({pendingWithoutLocation.length + pendingWithLocation.length})
          </button>
          {/* Chip: Sin Ubicación */}
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: repairsSubTab === 'sinUbicacion' ? t.warning : 'transparent',
              color: repairsSubTab === 'sinUbicacion' ? 'white' : t.warning,
              border: `1px solid ${t.warning}`,
              transition: 'all 0.2s'
            }}
            onClick={() => setRepairsSubTab('sinUbicacion')}
          >
            {language === 'es' ? 'Sin Ubicación' : 'No Location'} ({pendingWithoutLocation.length})
          </button>
          {/* Chip: Con Ubicación */}
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: repairsSubTab === 'enCola' ? t.success : 'transparent',
              color: repairsSubTab === 'enCola' ? 'white' : t.success,
              border: `1px solid ${t.success}`,
              transition: 'all 0.2s'
            }}
            onClick={() => setRepairsSubTab('enCola')}
          >
            {language === 'es' ? 'Con Ubicación' : 'Has Location'} ({pendingWithLocation.length})
          </button>
          {/* Indicador contextual */}
          {repairsSubTab !== 'all' && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: t.textMuted,
              fontStyle: 'italic'
            }}>
              {repairsSubTab === 'sinUbicacion'
                ? (language === 'es' ? 'Requieren escaneo de ubicación' : 'Require location scan')
                : (language === 'es' ? 'Listas para reparar' : 'Ready to repair')}
            </span>
          )}
        </div>
      )}

      {/* Barra de acciones para tab Handoff */}
      {activeTab === 'handoff' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          backgroundColor: t.bgCard,
          borderRadius: '8px',
          marginBottom: '16px',
          border: `1px solid ${t.warning}40`
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedForHandoff.size === pendingHandoff.length && pendingHandoff.length > 0}
              onChange={toggleAllHandoffSelection}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: t.text }}>
              {language === 'es' ? 'Seleccionar Todos' : 'Select All'}
            </span>
          </label>

          <span style={{ fontSize: '14px', fontWeight: '600', color: t.warning }}>
            {selectedForHandoff.size} {language === 'es' ? 'seleccionado(s)' : 'selected'}
          </span>

          {/* Hint hacia ActionBar */}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
            {language === 'es'
              ? 'Usa la barra de acciones superior para QA, Scrap o MRB'
              : 'Use the action bar above for QA, Scrap or MRB'}
          </span>
        </div>
      )}

      {/* ACTION BAR - Aparece en TODOS los tabs */}
      <ActionBar
        selectedDefects={getSelectedDefectsData}
        userPermissions={actionBarPermissions}
        onAction={handleActionBarAction}
        onClearSelection={clearSelection}
        loading={loading}
      />

      {/* Contenido según tab activo */}
      {activeTab === 'mrb' ? (
        /* Vista MRB - Cuarentena y Scrap */
        <div style={{ padding: '0' }}>
          {/* Banner link a Transferencias Hospital */}
          <div
            onClick={() => navigate('/hospital-packages')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              marginBottom: '16px',
              backgroundColor: `${t.primary}15`,
              borderRadius: '8px',
              border: `1px solid ${t.primary}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Package size={20} color={t.primary} />
              <div>
                <div style={{ fontWeight: '600', color: t.primary, fontSize: '14px' }}>
                  {language === 'es' ? 'Transferencias Hospital' : 'Hospital Transfers'}
                </div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>
                  {language === 'es' ? 'Ver paquetes enviados, recibir de MRB, alertas' : 'View sent packages, receive from MRB, alerts'}
                </div>
              </div>
            </div>
            <ChevronRight size={20} color={t.primary} />
          </div>

          {/* Filtros MRB */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '10px 16px',
            backgroundColor: t.bgPanel,
            borderRadius: '8px',
            border: `1px solid ${t.border}`
          }}>
            <span style={{ fontSize: '13px', color: t.textMuted, marginRight: '8px' }}>
              {language === 'es' ? 'Filtrar:' : 'Filter:'}
            </span>
            {/* Chip: Todos */}
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: mrbSubTab === 'all' ? t.error : 'transparent',
                color: mrbSubTab === 'all' ? 'white' : t.error,
                border: `1px solid ${t.error}`,
                transition: 'all 0.2s'
              }}
              onClick={() => { setMrbSubTab('all'); setSelectedForMrb(new Set()); }}
            >
              {language === 'es' ? 'Todos' : 'All'} ({quarantineDefects.length + scrappedDefects.length})
            </button>
            {/* Chip: Cuarentena */}
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: mrbSubTab === 'quarantine' ? t.warning : 'transparent',
                color: mrbSubTab === 'quarantine' ? 'white' : t.warning,
                border: `1px solid ${t.warning}`,
                transition: 'all 0.2s'
              }}
              onClick={() => { setMrbSubTab('quarantine'); setSelectedForMrb(new Set()); }}
            >
              🔒 {language === 'es' ? 'Cuarentena' : 'Quarantine'} ({quarantineDefects.length})
            </button>
            {/* Chip: Scrap */}
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: mrbSubTab === 'scrap' ? t.error : 'transparent',
                color: mrbSubTab === 'scrap' ? 'white' : t.errorFg,
                border: `1px solid ${t.error}`,
                transition: 'all 0.2s'
              }}
              onClick={() => { setMrbSubTab('scrap'); setSelectedForMrb(new Set()); }}
            >
              🗑️ Scrap ({scrappedDefects.length})
            </button>

            {/* Indicador de filtros activos */}
            {Object.values(mrbColFilters).some(v => v.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '12px', color: t.accent, fontWeight: '600' }}>
                  {Object.values(mrbColFilters).filter(v => v.length > 0).length} {language === 'es' ? 'filtro(s)' : 'filter(s)'}
                </span>
                <button
                  onClick={() => setMrbColFilters({ entryNumber: [], serialNumber: [], partNumber: [], defectCode: [], mrbCampaignNumber: [], qarNumber: [], eightDNumber: [], hours: [], mrbType: [] })}
                  style={{
                    padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
                    backgroundColor: 'transparent', color: t.accent, border: `1px solid ${t.accent}`, transition: 'all 0.2s'
                  }}
                >
                  ✕ {language === 'es' ? 'Limpiar' : 'Clear'}
                </button>
              </div>
            )}
          </div>

          {/* Indicador de selección MRB con guía hacia ActionBar */}
          {selectedForMrb.size > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: t.error + '20',
              borderRadius: '8px',
              marginBottom: '16px',
              border: `1px solid ${t.error}`
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: t.error }}>
                {selectedForMrb.size} {language === 'es' ? 'seleccionado(s)' : 'selected'}
              </span>
              {/* Hint hacia ActionBar */}
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                {language === 'es'
                  ? 'Usa la barra de acciones superior'
                  : 'Use the action bar above'}
              </span>
            </div>
          )}

          {/* Tabla de defectos MRB */}
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgPanel }}>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedForMrb.size === mrbFilteredDefects.length && selectedForMrb.size > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForMrb(new Set(mrbFilteredDefects.map(d => d.id)));
                        } else {
                          setSelectedForMrb(new Set());
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <MrbColumnFilter field="entryNumber" label="Entry #" />
                  {mrbSubTab === 'all' && <MrbColumnFilter field="mrbType" label="Status" align="center" />}
                  <MrbColumnFilter field="serialNumber" label="Serial/Lote" />
                  <MrbColumnFilter field="partNumber" label={language === 'es' ? 'Parte' : 'Part'} />
                  <MrbColumnFilter field="defectCode" label={language === 'es' ? 'Defecto' : 'Defect'} />
                  <MrbColumnFilter field="mrbCampaignNumber" label={language === 'es' ? 'Campaña' : 'Campaign'} />
                  <MrbColumnFilter field="qarNumber" label="QAR" />
                  <MrbColumnFilter field="eightDNumber" label="8D" />
                  <MrbColumnFilter field="hours" label={language === 'es' ? 'Horas' : 'Hours'} align="center" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const hasActiveFilters = Object.values(mrbColFilters).some(v => v.length > 0);

                  if (mrbFilteredDefects.length === 0) {
                    return (
                      <tr>
                        <td colSpan={mrbSubTab === 'all' ? 10 : 9} style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                          {hasActiveFilters
                            ? (language === 'es' ? 'No hay resultados con los filtros aplicados' : 'No results with applied filters')
                            : mrbSubTab === 'all'
                              ? (language === 'es' ? 'No hay defectos en MRB' : 'No defects in MRB')
                              : mrbSubTab === 'quarantine'
                                ? (language === 'es' ? 'No hay defectos en cuarentena' : 'No defects in quarantine')
                                : (language === 'es' ? 'No hay defectos en scrap pendientes' : 'No pending scrap defects')
                          }
                        </td>
                      </tr>
                    );
                  }

                  return mrbFilteredDefects.map(defect => {
                    const hours = defect._mrbType === 'quarantine' ? defect.hoursInQuarantine : defect.hoursInScrap;
                    const hoursColor = hours > 72 ? t.error : hours > 24 ? t.warning : t.success;
                    const defectSerial = defect.serialNumber || defect.lotNumber;
                    const isInPendingPackage = defectSerial && pendingSerials.has(defectSerial);
                    return (
                      <tr
                        key={defect.id}
                        style={{
                          borderBottom: `1px solid ${t.border}`,
                          backgroundColor: isInPendingPackage ? t.textMuted + '20' : selectedForMrb.has(defect.id) ? t.error + '10' : 'transparent',
                          opacity: isInPendingPackage ? 0.6 : 1
                        }}
                      >
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {isInPendingPackage ? (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '600',
                              backgroundColor: t.textMuted + '30',
                              color: t.textMuted,
                              whiteSpace: 'nowrap'
                            }}>
                              {language === 'es' ? 'EN PKG' : 'IN PKG'}
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedForMrb.has(defect.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedForMrb);
                                if (e.target.checked) {
                                  newSet.add(defect.id);
                                } else {
                                  newSet.delete(defect.id);
                                }
                                setSelectedForMrb(newSet);
                              }}
                              style={{ cursor: 'pointer', accentColor: t.error }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: t.accent }}>
                          {defect.entryNumber}
                        </td>
                        {mrbSubTab === 'all' && (
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: defect._mrbType === 'quarantine' ? t.warning + '20' : t.error + '20',
                              color: defect._mrbType === 'quarantine' ? t.warning : t.errorFg
                            }}>
                              {defect._mrbType === 'quarantine'
                                ? (language === 'es' ? 'Cuarentena' : 'Quarantine')
                                : 'Scrap'}
                            </span>
                          </td>
                        )}
                        <td style={{ padding: '10px 8px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600', color: t.text }}>
                          {defect.serialNumber || defect.lotNumber || '-'}
                        </td>
                        <td style={{ padding: '10px 8px', color: t.text }}>
                          <div style={{ fontWeight: '500' }}>{defect.partNumber}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>{defect.partName}</div>
                        </td>
                        <td style={{ padding: '10px 8px', color: t.text }}>
                          {defect.defectTypeName}
                        </td>
                        {/* Campaña MRB - Pendientes de inspección */}
                        <td style={{ padding: '10px 8px' }}>
                          {defect.pendingMrbCampaigns && defect.pendingMrbCampaigns.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {defect.pendingMrbCampaigns.map((c, idx) => (
                                <span key={idx} style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: t.error + '20',
                                  color: t.error,
                                  cursor: 'pointer',
                                  display: 'inline-block'
                                }}
                                onClick={() => navigate(`/mrb/${c.id}`)}
                                title={`⚠️ Pendiente: ${c.title}`}
                                >
                                  ⚠️ {c.campaignNumber}
                                </span>
                              ))}
                            </div>
                          ) : defect.mrbCampaignNumber ? (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: '#7c3aed20',
                              color: '#7c3aed',
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/mrb/${defect.mrbCampaignId}`)}
                            title={defect.mrbCampaignTitle}
                            >
                              {defect.mrbCampaignNumber}
                            </span>
                          ) : (
                            <span style={{ color: t.textMuted, fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        {/* QAR */}
                        <td style={{ padding: '10px 8px' }}>
                          {defect.qarNumber ? (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: '#3b82f620',
                              color: '#3b82f6',
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/quality-alerts/${defect.qarId}`)}
                            title={defect.qarTitle}
                            >
                              {defect.qarNumber}
                            </span>
                          ) : (
                            <span style={{ color: t.textMuted, fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        {/* 8D */}
                        <td style={{ padding: '10px 8px' }}>
                          {defect.eightdNumber ? (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: t.success + '20',
                              color: t.success,
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/8d/${defect.eightdId}`)}
                            title={defect.eightdTitle}
                            >
                              {defect.eightdNumber}
                            </span>
                          ) : (
                            <span style={{ color: t.textMuted, fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: hoursColor + '20',
                            color: hoursColor,
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {hours ? Number(hours).toFixed(1) : '0'}h
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'wip' ? (
        /* Vista WIP Dashboard */
        renderWIPDashboard()
      ) : activeTab === 'traceability' ? (
        /* Vista Trazabilidad - Historial por Serial */
        <div style={{ padding: '0' }}>
          {/* Buscador de serial */}
          <div style={{
            padding: '24px',
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>🔍</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: t.text }}>
                  {language === 'es' ? 'Consulta de Trazabilidad' : 'Traceability Query'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: t.textMuted }}>
                  {language === 'es'
                    ? 'Busca por serial, lote o entry para ver historial de defectos, reparaciones y liberaciones'
                    : 'Search by serial, lot or entry to see defects, repairs and releases history'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                ref={traceInputRef}
                type="text"
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  fontSize: '16px',
                  border: `2px solid ${t.border}`,
                  borderRadius: '8px',
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: '1px'
                }}
                placeholder={language === 'es' ? 'Escanea serial, lote o entry...' : 'Scan serial, lot or entry...'}
                value={traceSerial}
                onChange={(e) => setTraceSerial(e.target.value)}
                onKeyDown={handleTraceSearch}
                disabled={traceLoading}
              />
              <button
                style={{
                  padding: '14px 24px',
                  backgroundColor: t.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
                onClick={(e) => handleTraceSearch({ key: 'Enter' })}
                disabled={traceLoading || !traceSerial.trim()}
              >
                {traceLoading ? (language === 'es' ? 'Buscando...' : 'Searching...') : (language === 'es' ? 'Buscar' : 'Search')}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {traceDefects.length > 0 && (
            <>
              {/* Resumen de defectos encontrados */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: t.bgPanel,
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: t.accent + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  📦
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>
                    Serial: {traceSerial}
                  </div>
                  <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
                    {traceDefects.length} defecto{traceDefects.length !== 1 ? 's' : ''} registrado{traceDefects.length !== 1 ? 's' : ''} •{' '}
                    {traceEvents.length} evento{traceEvents.length !== 1 ? 's' : ''} en historial
                  </div>
                </div>
                <button
                  onClick={exportTraceabilityPDF}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: t.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title={language === 'es' ? 'Exportar a PDF' : 'Export to PDF'}
                >
                  📄 {language === 'es' ? 'Exportar PDF' : 'Export PDF'}
                </button>
              </div>

              {/* Detalle del Serial/Parte */}
              {traceDefects.length > 0 && (
                <div style={{
                  padding: '16px',
                  backgroundColor: t.bgCard,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  marginBottom: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.text }}>
                    {language === 'es' ? 'Información del Producto' : 'Product Information'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                        {language === 'es' ? 'Número de Parte' : 'Part Number'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                        {traceDefects[0].partNumber || traceDefects[0].part_number || '-'}
                      </div>
                      <div style={{ fontSize: '12px', color: t.textMuted }}>
                        {traceDefects[0].partName || traceDefects[0].part_name || ''}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                        Serial / Lote
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {traceDefects[0].serialNumber || traceDefects[0].serial_number || traceDefects[0].lotNumber || traceDefects[0].lot_number || '-'}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                        {language === 'es' ? 'Cliente' : 'Client'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                        {traceDefects[0].clientName || traceDefects[0].client_name || '-'}
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: t.bgPanel, borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                        {language === 'es' ? 'Proveedor' : 'Supplier'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                        {traceDefects[0].supplierName || traceDefects[0].supplier_name || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla de defectos */}
              <div style={{
                padding: '16px',
                backgroundColor: t.bgCard,
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.text }}>
                  {language === 'es' ? 'Defectos Asociados' : 'Associated Defects'}
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bgPanel }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>Entry</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Tipo Defecto' : 'Defect Type'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Estado' : 'Status'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Área Resp.' : 'Resp. Area'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Comentarios' : 'Comments'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}` }}>{language === 'es' ? 'Fecha Captura' : 'Capture Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traceDefects.map((defect, idx) => {
                      const statusInfo = getStatusInfo(defect.repairStatus || defect.repair_status || 'OPEN');
                      return (
                        <tr key={defect.id} style={{ backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel, cursor: 'pointer' }} onClick={() => { setDetailDefect(defect); setDetailModalOpen(true); }}>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, fontWeight: '600', color: t.accent }}>
                            {defect.entryNumber || defect.entry_number}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {defect.defectTypeName || defect.defect_type_name || '-'}
                              {defect.photos?.length > 0 && <span>📷</span>}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: statusInfo.bgColor,
                              color: statusInfo.color
                            }}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>
                            {defect.departmentName || defect.department_name || '-'}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, maxWidth: '200px', fontSize: '12px' }}>
                            {defect.notes || defect.defectNotes || defect.defect_notes || '-'}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, color: t.textMuted }}>
                            {new Date(defect.capturedAt || defect.captured_at).toLocaleString('es-MX')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Timeline de eventos */}
              <div style={{
                padding: '16px',
                backgroundColor: t.bgCard,
                borderRadius: '8px',
                border: `1px solid ${t.border}`
              }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: t.text }}>
                  Historial de Eventos (Trazabilidad Completa)
                </h4>
                <div style={{ position: 'relative' }}>
                  {/* Línea vertical del timeline */}
                  <div style={{
                    position: 'absolute',
                    left: '20px',
                    top: '0',
                    bottom: '0',
                    width: '2px',
                    backgroundColor: t.border
                  }} />

                  {traceEvents.map((event, idx) => {
                    // Determinar si es un scan de estación
                    const isScan = event.eventSource === 'scan';
                    const scanOk = isScan && !event.hasDefect;
                    const scanEventType = isScan ? (scanOk ? 'STATION_SCAN_OK' : 'STATION_SCAN_NOK') : (event.eventType || event.event_type);
                    const eventInfo = formatEventType(scanEventType);

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: idx < traceEvents.length - 1 ? '16px' : '0',
                        position: 'relative'
                      }}>
                        {/* Nodo del timeline */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: eventInfo.color + '20',
                          border: `3px solid ${eventInfo.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          zIndex: 1,
                          flexShrink: 0
                        }}>
                          {eventInfo.icon}
                        </div>

                        {/* Contenido del evento */}
                        <div style={{
                          flex: 1,
                          padding: '12px 16px',
                          backgroundColor: t.bgPanel,
                          borderRadius: '8px',
                          border: `1px solid ${t.border}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              {isScan ? (
                                <>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: '#06b6d420',
                                    color: '#06b6d4'
                                  }}>
                                    📍 {event.stationName || (event.stationCode ? event.stationCode.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Estación')}
                                  </span>
                                  <span style={{
                                    marginLeft: '8px',
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: eventInfo.color + '20',
                                    color: eventInfo.color
                                  }}>
                                    {scanOk ? '✓ OK' : `✗ NOK (${event.defectCount || 0})`}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: eventInfo.color + '20',
                                    color: eventInfo.color
                                  }}>
                                    {eventInfo.label}
                                  </span>
                                  <span style={{
                                    marginLeft: '8px',
                                    fontSize: '11px',
                                    color: t.textMuted,
                                    backgroundColor: t.bgCard,
                                    padding: '2px 6px',
                                    borderRadius: '3px'
                                  }}>
                                    Entry: {event.entryNumber}
                                  </span>
                                </>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: t.textMuted }}>
                              {new Date(event.eventAt || event.event_at || event.createdAt || event.created_at).toLocaleString('es-MX')}
                            </span>
                          </div>

                          {/* Detalles del evento */}
                          <div style={{ marginTop: '8px', fontSize: '13px' }}>
                            {/* Detalles para scan de estación */}
                            {isScan && (
                              <>
                                {event.workOrder && (
                                  <div style={{ color: t.textMuted }}>
                                    Work Order: <span style={{ color: t.text }}>{event.workOrder}</span>
                                  </div>
                                )}
                                {event.scannedByName && (
                                  <div style={{ color: t.textMuted, marginTop: '4px' }}>
                                    {language === 'es' ? 'Escaneado por' : 'Scanned by'}: <span style={{ color: t.text }}>{event.scannedByName}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {/* Estado inicial para CREATED */}
                            {!isScan && (event.eventType === 'CREATED' || event.event_type === 'CREATED') && (event.newStatus || event.new_status) && (
                              <div style={{ color: t.textMuted }}>
                                {language === 'es' ? 'Estado inicial' : 'Initial status'}: <span style={{ fontWeight: '600', color: t.text }}>{event.newStatus || event.new_status}</span>
                              </div>
                            )}
                            {/* Cambio de estado */}
                            {!isScan && (event.oldStatus || event.old_status) && (
                              <div style={{ color: t.textMuted }}>
                                {language === 'es' ? 'Estado' : 'Status'}: <span style={{ textDecoration: 'line-through' }}>{event.oldStatus || event.old_status}</span>
                                {' → '}
                                <span style={{ fontWeight: '600', color: t.text }}>{event.newStatus || event.new_status}</span>
                              </div>
                            )}
                            {/* Departamento inicial para CREATED */}
                            {!isScan && (event.eventType === 'CREATED' || event.event_type === 'CREATED') && (event.newDepartmentName || event.new_department_name) && (
                              <div style={{ color: t.textMuted, marginTop: '4px' }}>
                                {language === 'es' ? 'Área responsable' : 'Responsible area'}: <span style={{ fontWeight: '600', color: t.text }}>{event.newDepartmentName || event.new_department_name}</span>
                              </div>
                            )}
                            {/* Cambio de departamento */}
                            {!isScan && (event.oldDepartmentName || event.old_department_name) && (
                              <div style={{ color: t.textMuted, marginTop: '4px' }}>
                                {language === 'es' ? 'Área' : 'Area'}: <span style={{ textDecoration: 'line-through' }}>{event.oldDepartmentName || event.old_department_name}</span>
                                {' → '}
                                <span style={{ fontWeight: '600', color: t.text }}>{event.newDepartmentName || event.new_department_name}</span>
                              </div>
                            )}
                            {!isScan && (event.performedByName || event.performed_by_name) && (
                              <div style={{ color: t.textMuted, marginTop: '4px' }}>
                                {language === 'es' ? 'Por' : 'By'}: <span style={{ color: t.text }}>{event.performedByName || event.performed_by_name}</span>
                              </div>
                            )}
                            {!isScan && event.comments && (
                              <div style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                backgroundColor: t.bgCard,
                                borderRadius: '6px',
                                fontStyle: 'italic',
                                color: t.text
                              }}>
                                "{event.comments}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {traceEvents.length === 0 && (
                    <p style={{ textAlign: 'center', color: t.textMuted, padding: '20px' }}>
                      No hay eventos registrados para este serial
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Estado vacío */}
          {traceDefects.length === 0 && !traceLoading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: t.bgCard,
              borderRadius: '12px',
              border: `1px dashed ${t.border}`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px 0', color: t.text }}>
                Consulta el historial de una pieza
              </h3>
              <p style={{ margin: 0, color: t.textMuted, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                Ingresa un serial o número de lote para ver todos los defectos registrados,
                reparaciones realizadas y el historial completo de cambios de estado.
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'deviations' ? (
        /* Vista Desviaciones */
        <div style={{ padding: '0' }}>
          {/* Header con filtros y botón crear */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
                value={deviationFilter.status}
                onChange={(e) => setDeviationFilter(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Todos los estados</option>
                {DEVIATION_STATUS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
                value={deviationFilter.type}
                onChange={(e) => setDeviationFilter(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Todos los tipos</option>
                {DEVIATION_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar por referencia o descripción..."
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  minWidth: '250px'
                }}
                value={deviationFilter.search}
                onChange={(e) => setDeviationFilter(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <button
              onClick={() => openDeviationModal()}
              style={{
                padding: '10px 20px',
                backgroundColor: t.accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              + Nueva Desviación
            </button>
          </div>

          {/* Lista de desviaciones */}
          {deviationsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
              Cargando desviaciones...
            </div>
          ) : deviations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: t.bgCard,
              borderRadius: '12px',
              border: `1px dashed ${t.border}`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px 0', color: t.text }}>
                No hay desviaciones registradas
              </h3>
              <p style={{ margin: 0, color: t.textMuted }}>
                Crea una desviación para documentar SAE, Waivers o autorizaciones especiales
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deviations.map(dev => (
                <div
                  key={dev.id}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: t.bgCard,
                    borderRadius: '10px',
                    border: `1px solid ${t.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => openDeviationModal(dev)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getDeviationTypeColor(dev.deviationType) + '20',
                          color: getDeviationTypeColor(dev.deviationType)
                        }}>
                          {getDeviationTypeLabel(dev.deviationType)}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: getDeviationStatusColor(dev.status) + '20',
                          color: getDeviationStatusColor(dev.status)
                        }}>
                          {getDeviationStatusLabel(dev.status)}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
                          {dev.referenceNumber}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', color: t.text, fontSize: '14px' }}>
                        {dev.description}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: t.textMuted, flexWrap: 'wrap' }}>
                        <span>Cliente: {dev.clientName || '-'}</span>
                        {dev.projectName && <span>Proyecto: {dev.projectName}</span>}
                        {dev.validityDate && <span>Vigencia: {new Date(dev.validityDate).toLocaleDateString()}</span>}
                      </div>
                      {/* Mostrar partes incluidas */}
                      {(dev.partNumbers?.length > 0 || dev.partNumber) && (
                        <div style={{ marginTop: '6px', fontSize: '11px' }}>
                          <span style={{ color: t.textMuted }}>
                            {language === 'es' ? 'Partes' : 'Parts'} ({dev.partNumbers?.length || (dev.partNumber ? 1 : 0)}):
                          </span>{' '}
                          <span style={{ color: t.accent, fontWeight: '500' }}>
                            {dev.partNumbers?.length > 0
                              ? dev.partNumbers.slice(0, 5).join(', ') + (dev.partNumbers.length > 5 ? ` +${dev.partNumbers.length - 5} más` : '')
                              : dev.partNumber}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: t.textMuted }}>
                      <div>{dev.attachmentCount || 0} archivo(s)</div>
                      <div>{dev.linkedDefectsCount || 0} defecto(s)</div>
                      <div style={{ marginTop: '8px' }}>
                        {new Date(dev.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'reports' ? (
        /* Vista Reportes */
        <div style={{ padding: '0' }}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            padding: '24px'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: t.text, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 {language === 'es' ? 'Generador de Reportes' : 'Report Generator'}
            </h2>

            {/* Selector de tipo de reporte */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: t.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                {language === 'es' ? 'Tipo de Reporte' : 'Report Type'}
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { value: 'lot', label: language === 'es' ? '📦 Por Lote' : '📦 By Lot', desc: language === 'es' ? 'Todos los seriales de un lote' : 'All serials from a lot' },
                  { value: 'dateRange', label: language === 'es' ? '📅 Por Fechas' : '📅 By Date Range', desc: language === 'es' ? 'Defectos en un período' : 'Defects in a period' },
                  { value: 'serialList', label: language === 'es' ? '📋 Lista de Seriales' : '📋 Serial List', desc: language === 'es' ? 'Pega una lista de seriales' : 'Paste a list of serials' },
                  { value: 'currentTable', label: language === 'es' ? '📊 Tabla Actual' : '📊 Current Table', desc: language === 'es' ? 'Exportar vista actual' : 'Export current view' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: reportType === type.value ? `2px solid #8b5cf6` : `1px solid ${t.border}`,
                      backgroundColor: reportType === type.value ? '#8b5cf620' : t.bgPanel,
                      cursor: 'pointer',
                      textAlign: 'left',
                      minWidth: '180px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', color: reportType === type.value ? '#8b5cf6' : t.text }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos según tipo de reporte */}
            <div style={{ marginBottom: '24px' }}>
              {reportType === 'lot' && (
                <div>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {language === 'es' ? 'Número de Lote' : 'Lot Number'}
                  </label>
                  <input
                    type="text"
                    value={reportLot}
                    onChange={(e) => setReportLot(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: LOT-2026-001' : 'Ex: LOT-2026-001'}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgInput,
                      color: t.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              {reportType === 'dateRange' && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', color: t.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {language === 'es' ? 'Fecha Inicio' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${t.border}`,
                        backgroundColor: t.bgInput,
                        color: t.text,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: t.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {language === 'es' ? 'Fecha Fin' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${t.border}`,
                        backgroundColor: t.bgInput,
                        color: t.text,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              )}

              {reportType === 'serialList' && (
                <div>
                  <label style={{ display: 'block', color: t.textMuted, fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {language === 'es' ? 'Lista de Seriales (uno por línea o separados por coma)' : 'Serial List (one per line or comma-separated)'}
                  </label>
                  <textarea
                    value={reportSerialList}
                    onChange={(e) => setReportSerialList(e.target.value)}
                    placeholder={language === 'es' ? 'SN001\nSN002\nSN003\n\no: SN001, SN002, SN003' : 'SN001\nSN002\nSN003\n\nor: SN001, SN002, SN003'}
                    rows={6}
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgInput,
                      color: t.text,
                      fontSize: '14px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {reportType === 'currentTable' && (
                <div style={{
                  padding: '16px',
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`
                }}>
                  <p style={{ margin: 0, color: t.textMuted, fontSize: '13px' }}>
                    {language === 'es'
                      ? `Se exportarán ${generalPagination.total || allDefects.length} defectos de la tabla General con los filtros actuales.`
                      : `Will export ${generalPagination.total || allDefects.length} defects from General table with current filters.`}
                  </p>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => generateReport('preview')}
                disabled={reportLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: reportLoading ? 'not-allowed' : 'pointer',
                  opacity: reportLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔍 {language === 'es' ? 'Ver Reporte' : 'View Report'}
              </button>

              <div style={{ width: '1px', height: '30px', backgroundColor: t.border }} />

              <button
                onClick={() => generateReport('csv')}
                disabled={reportLoading || !reportPreview}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: t.success,
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (reportLoading || !reportPreview) ? 'not-allowed' : 'pointer',
                  opacity: (reportLoading || !reportPreview) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📥 CSV
              </button>
              <button
                onClick={() => generateReport('excel')}
                disabled={reportLoading || !reportPreview}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (reportLoading || !reportPreview) ? 'not-allowed' : 'pointer',
                  opacity: (reportLoading || !reportPreview) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📊 Excel
              </button>
              <button
                onClick={() => generateReport('raw')}
                disabled={reportLoading || !reportPreview}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (reportLoading || !reportPreview) ? 'not-allowed' : 'pointer',
                  opacity: (reportLoading || !reportPreview) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🗃️ Raw
              </button>

              {reportPreview && (
                <button
                  onClick={() => setReportPreview(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: 'transparent',
                    color: t.textMuted,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Limpiar
                </button>
              )}
            </div>

            {reportLoading && (
              <div style={{ marginTop: '16px', color: t.textMuted, fontSize: '13px' }}>
                ⏳ {language === 'es' ? 'Generando reporte...' : 'Generating report...'}
              </div>
            )}

            {/* Tabla de previsualización */}
            {reportPreview && reportPreview.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ margin: 0, color: t.text, fontSize: '16px' }}>
                    📋 {language === 'es' ? 'Vista Previa' : 'Preview'} ({reportPreview.length} {language === 'es' ? 'registros' : 'records'})
                  </h3>
                </div>
                <div style={{
                  maxHeight: '500px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: t.bgPanel, position: 'sticky', top: 0 }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Entry</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Serial</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Lote</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Parte</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Defecto</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Estado</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Estación</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Capturado</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: '600', whiteSpace: 'nowrap' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportPreview.slice(0, 100).map((row, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel }}>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.accent, fontWeight: '600' }}>
                            {row.entryNumber || row.entry_number || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                            {row.serialNumber || row.serial_number || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                            {row.lotNumber || row.lot_number || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text, whiteSpace: 'nowrap' }}>
                            {row.partNumber || row.part_number || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                            {row.defectTypeName || row.defect_type_name || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}` }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: (row.repairStatus || row.repair_status) === 'RELEASED' || (row.repairStatus || row.repair_status) === 'CLOSED' ? t.success + '20' :
                                             (row.repairStatus || row.repair_status) === 'OPEN' ? t.error + '20' :
                                             (row.repairStatus || row.repair_status) === 'IN_REPAIR' ? t.warning + '20' : t.textMuted + '20',
                              color: (row.repairStatus || row.repair_status) === 'RELEASED' || (row.repairStatus || row.repair_status) === 'CLOSED' ? t.success :
                                    (row.repairStatus || row.repair_status) === 'OPEN' ? t.error :
                                    (row.repairStatus || row.repair_status) === 'IN_REPAIR' ? t.warning : t.textMuted
                            }}>
                              {row.repairStatus || row.repair_status || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                            {row.stationName || row.station_name || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>
                            {row.capturedByName || row.captured_by_name || '-'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, whiteSpace: 'nowrap' }}>
                            {(row.capturedAt || row.captured_at) ? new Date(row.capturedAt || row.captured_at).toLocaleDateString('es-MX') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportPreview.length > 100 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: t.textMuted, fontSize: '12px', backgroundColor: t.bgPanel }}>
                      Mostrando 100 de {reportPreview.length} registros. Descarga el archivo para ver todos.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Barra de filtro y controles */}
          <div style={styles.filterBar}>
            <span style={styles.filterLabel}>{language === 'es' ? 'Filtrar:' : 'Filter:'}</span>
            <input
              ref={searchInputRef}
              type="text"
              style={styles.filterInput}
              placeholder={language === 'es' ? 'Buscar por entry, serial, parte...' : 'Search by entry, serial, part...'}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <div style={styles.expandButtons}>
              <button style={styles.smallBtn} onClick={expandAll} title={language === 'es' ? 'Expandir todos' : 'Expand all'}>
                {language === 'es' ? 'Expandir' : 'Expand'}
              </button>
              <button style={styles.smallBtn} onClick={collapseAll} title={language === 'es' ? 'Colapsar todos' : 'Collapse all'}>
                {language === 'es' ? 'Colapsar' : 'Collapse'}
              </button>
              <button
                style={{ ...styles.smallBtn, backgroundColor: t.success, color: 'white' }}
                onClick={exportToExcel}
                title="Exportar a Excel"
              >
                Excel
              </button>
            </div>
            <span style={{ fontSize: '13px', color: t.textMuted }}>
              {filteredGroups.length} serial{filteredGroups.length !== 1 ? 's' : ''}
            </span>

            {/* Paginación - solo en tab General */}
            {activeTab === 'general' && generalPagination.total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <select
                  value={generalPageSize}
                  onChange={(e) => { setGeneralPageSize(parseInt(e.target.value)); setGeneralPage(1); }}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text, fontSize: '12px' }}
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span style={{ fontSize: '12px', color: t.textMuted }}>
                  {language === 'es' ? 'por página' : 'per page'}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setGeneralPage(1)}
                    disabled={generalPage === 1}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === 1 ? t.bgPanel : t.bgCard, color: generalPage === 1 ? t.textMuted : t.text, cursor: generalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  >
                    {'<<'}
                  </button>
                  <button
                    onClick={() => setGeneralPage(p => Math.max(1, p - 1))}
                    disabled={generalPage === 1}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === 1 ? t.bgPanel : t.bgCard, color: generalPage === 1 ? t.textMuted : t.text, cursor: generalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  >
                    {'<'}
                  </button>
                  <span style={{ padding: '4px 12px', fontSize: '12px', color: t.text }}>
                    {Math.min(generalPage * generalPageSize, generalPagination.total)} / {generalPagination.total}
                  </span>
                  <button
                    onClick={() => setGeneralPage(p => Math.min(generalPagination.totalPages, p + 1))}
                    disabled={generalPage === generalPagination.totalPages}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === generalPagination.totalPages ? t.bgPanel : t.bgCard, color: generalPage === generalPagination.totalPages ? t.textMuted : t.text, cursor: generalPage === generalPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  >
                    {'>'}
                  </button>
                  <button
                    onClick={() => setGeneralPage(generalPagination.totalPages)}
                    disabled={generalPage === generalPagination.totalPages}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === generalPagination.totalPages ? t.bgPanel : t.bgCard, color: generalPage === generalPagination.totalPages ? t.textMuted : t.text, cursor: generalPage === generalPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                  >
                    {'>>'}
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: t.textMuted }}>
                  ({generalPagination.total} total)
                </span>
              </div>
            )}
          </div>

          {/* Barra de filtros avanzados */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: t.bgPanel,
            borderRadius: '8px',
            marginBottom: '12px',
            border: `1px solid ${t.border}`
          }}>
            {/* Filtros de fecha rápida */}
            <span style={{ fontSize: '12px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
              📅 {language === 'es' ? 'Último mov:' : 'Last update:'}
            </span>
            {[
              { key: 'today', label: language === 'es' ? 'Hoy' : 'Today' },
              { key: 'yesterday', label: language === 'es' ? 'Ayer' : 'Yesterday' },
              { key: 'week', label: language === 'es' ? '7 días' : '7 days' },
              { key: 'month', label: language === 'es' ? '30 días' : '30 days' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setDateFilter(dateFilter === opt.key ? '' : opt.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: dateFilter === opt.key ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                  backgroundColor: dateFilter === opt.key ? (t.accent + '20') : t.bgCard,
                  color: dateFilter === opt.key ? t.accent : t.text,
                  fontSize: '12px',
                  fontWeight: dateFilter === opt.key ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                {opt.label}
              </button>
            ))}

            {/* Separador */}
            <div style={{ width: '1px', height: '20px', backgroundColor: t.border, margin: '0 4px' }} />

            {/* Filtro de Status */}
            <span style={{ fontSize: '12px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
              {language === 'es' ? 'Status:' : 'Status:'}
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: statusFilter ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                backgroundColor: t.bgCard,
                color: t.text,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="">{language === 'es' ? 'Todos' : 'All'}</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_REPAIR">IN_REPAIR</option>
              <option value="REPAIRED">REPAIRED</option>
              <option value="IN_VALIDATION">IN_VALIDATION</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            {/* Separador */}
            <div style={{ width: '1px', height: '20px', backgroundColor: t.border, margin: '0 4px' }} />

            {/* Filtro de Tipo */}
            <span style={{ fontSize: '12px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
              {language === 'es' ? 'Tipo:' : 'Type:'}
            </span>
            <select
              value={defectTypeFilter}
              onChange={(e) => setDefectTypeFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: defectTypeFilter ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                backgroundColor: t.bgCard,
                color: t.text,
                fontSize: '12px',
                cursor: 'pointer',
                maxWidth: '150px'
              }}
            >
              <option value="">{language === 'es' ? 'Todos' : 'All'}</option>
              {getUniqueDefectTypes().map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            {/* Separador */}
            <div style={{ width: '1px', height: '20px', backgroundColor: t.border, margin: '0 4px' }} />

            {/* Filtro de Fecha de Captura (rango) */}
            <span style={{ fontSize: '12px', fontWeight: '500', color: t.textMuted, marginRight: '4px' }}>
              📅 {language === 'es' ? 'Captura:' : 'Captured:'}
            </span>
            <input
              type="date"
              value={captureDateFrom}
              onChange={(e) => setCaptureDateFrom(e.target.value)}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: captureDateFrom ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                backgroundColor: t.bgCard,
                color: t.text,
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title={language === 'es' ? 'Desde' : 'From'}
            />
            <span style={{ fontSize: '11px', color: t.textMuted }}>-</span>
            <input
              type="date"
              value={captureDateTo}
              onChange={(e) => setCaptureDateTo(e.target.value)}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: captureDateTo ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                backgroundColor: t.bgCard,
                color: t.text,
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title={language === 'es' ? 'Hasta' : 'To'}
            />

            {/* Botón limpiar filtros */}
            {(dateFilter || statusFilter || defectTypeFilter || captureDateFrom || captureDateTo) && (
              <>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => {
                    setDateFilter('');
                    setStatusFilter('');
                    setDefectTypeFilter('');
                    setCaptureDateFrom('');
                    setCaptureDateTo('');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${t.danger}`,
                    backgroundColor: 'transparent',
                    color: t.danger,
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✕ {language === 'es' ? 'Limpiar filtros' : 'Clear filters'}
                </button>
              </>
            )}
          </div>

          {/* Barra de selección masiva */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: selectedDefects.size > 0 ? t.warning + '15' : t.bgPanel,
            borderRadius: '8px',
            border: `1px solid ${selectedDefects.size > 0 ? t.warning : t.border}`,
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: t.text }}>
              Selección:
            </span>

            {/* Filtro por tipo de defecto */}
            <select
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: defectTypeFilter ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                backgroundColor: t.bgCard,
                fontSize: '13px',
                color: t.text,
                minWidth: '180px'
              }}
              value={defectTypeFilter}
              onChange={(e) => {
                setDefectTypeFilter(e.target.value);
                clearSelection(); // Limpiar selección al cambiar filtro
              }}
            >
              <option value="">Todos los tipos</option>
              {getUniqueDefectTypes().map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            {defectTypeFilter && (
              <button
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: t.bgPanel,
                  color: t.textMuted,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setDefectTypeFilter('')}
                title="Quitar filtro"
              >
                ✕
              </button>
            )}

            <button
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: t.info,
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={selectAllVisible}
            >
              Seleccionar Todo
            </button>

            {selectedDefects.size > 0 && (
              <>
                <button
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard,
                    color: t.text,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  onClick={clearSelection}
                >
                  Limpiar
                </button>

                <div style={{ flex: 1 }} />

                <span style={{
                  padding: '4px 10px',
                  backgroundColor: t.warning,
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedDefects.size} seleccionado{selectedDefects.size !== 1 ? 's' : ''}
                </span>

                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: t.accent,
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => { setBulkDepartmentId(''); setBulkNotes(''); setShowBulkModal(true); }}
                >
                  🔄 Cambiar Responsable
                </button>
              </>
            )}
          </div>

          {/* Indicador de filtros de columna activos */}
          {Object.values(mainColFilters).some(v => v.length > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              backgroundColor: t.accent + '15',
              borderRadius: '8px',
              marginBottom: '12px',
              border: `1px solid ${t.accent}40`
            }}>
              <span style={{ fontSize: '13px', color: t.accent, fontWeight: '600' }}>
                {Object.values(mainColFilters).filter(v => v.length > 0).length} {language === 'es' ? 'filtro(s) de columna activo(s)' : 'column filter(s) active'}
              </span>
              <button
                onClick={() => setMainColFilters({ entryNumber: [], serialNumber: [], partNumber: [], locationName: [], departmentName: [], defectTypeName: [], repairStatus: [], repairCount: [], lastAction: [], capturedAt: [], updatedAt: [] })}
                style={{
                  marginLeft: 'auto',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: 'transparent',
                  color: t.accent,
                  border: `1px solid ${t.accent}`,
                  transition: 'all 0.2s'
                }}
              >
                ✕ {language === 'es' ? 'Limpiar filtros' : 'Clear filters'}
              </button>
            </div>
          )}

          {/* Content - Cards agrupadas */}
          {renderGroupedCards()}

          {/* Paginación inferior - solo en tab General */}
          {activeTab === 'general' && generalPagination.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px' }}>
              <select
                value={generalPageSize}
                onChange={(e) => { setGeneralPageSize(parseInt(e.target.value)); setGeneralPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.text, fontSize: '12px' }}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
              <span style={{ fontSize: '12px', color: t.textMuted }}>
                {language === 'es' ? 'por página' : 'per page'}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setGeneralPage(1)}
                  disabled={generalPage === 1}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === 1 ? t.bgPanel : t.bgCard, color: generalPage === 1 ? t.textMuted : t.text, cursor: generalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                >
                  {'<<'}
                </button>
                <button
                  onClick={() => setGeneralPage(p => Math.max(1, p - 1))}
                  disabled={generalPage === 1}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === 1 ? t.bgPanel : t.bgCard, color: generalPage === 1 ? t.textMuted : t.text, cursor: generalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                >
                  {'<'}
                </button>
                <span style={{ padding: '4px 12px', fontSize: '12px', color: t.text }}>
                  {Math.min(generalPage * generalPageSize, generalPagination.total)} / {generalPagination.total}
                </span>
                <button
                  onClick={() => setGeneralPage(p => Math.min(generalPagination.totalPages, p + 1))}
                  disabled={generalPage === generalPagination.totalPages}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === generalPagination.totalPages ? t.bgPanel : t.bgCard, color: generalPage === generalPagination.totalPages ? t.textMuted : t.text, cursor: generalPage === generalPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                >
                  {'>'}
                </button>
                <button
                  onClick={() => setGeneralPage(generalPagination.totalPages)}
                  disabled={generalPage === generalPagination.totalPages}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${t.border}`, backgroundColor: generalPage === generalPagination.totalPages ? t.bgPanel : t.bgCard, color: generalPage === generalPagination.totalPages ? t.textMuted : t.text, cursor: generalPage === generalPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                >
                  {'>>'}
                </button>
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted }}>
                ({generalPagination.total} {language === 'es' ? 'registros' : 'records'})
              </span>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {renderModal()}

      {/* Modal de selección de estación de sesión */}
      {showStationSelector && (
        <div style={styles.modal} onClick={() => setShowStationSelector(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Seleccionar Estación de {stationSelectorType === 'REPAIR' ? 'Reparación' : 'Liberación'}
            </h3>
            <p style={{ fontSize: '14px', color: t.textMuted, marginBottom: '16px' }}>
              Selecciona tu estación de trabajo. Se mantendrá durante esta sesión.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(stationSelectorType === 'REPAIR' ? repairStations : releaseStations).map(station => (
                <button
                  key={station.id}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid ${t.border}',
                    borderRadius: '8px',
                    backgroundColor: t.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = stationSelectorType === 'REPAIR' ? t.bgPanel : t.bgPanel;
                    e.currentTarget.style.borderColor = stationSelectorType === 'REPAIR' ? t.warning : t.success;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = t.bgCard;
                    e.currentTarget.style.borderColor = '${t.border}';
                  }}
                  onClick={() => selectSessionStation(stationSelectorType, station)}
                >
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{station.name}</div>
                  {station.code && (
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>
                      Código: {station.code}
                    </div>
                  )}
                </button>
              ))}

              {(stationSelectorType === 'REPAIR' ? repairStations : releaseStations).length === 0 && (
                <p style={{ textAlign: 'center', color: t.textDim, padding: '20px' }}>
                  No hay estaciones de {stationSelectorType === 'REPAIR' ? 'reparación' : 'liberación'} configuradas.
                  <br />
                  <span style={{ fontSize: '12px' }}>Configúralas en Defect Admin → Estaciones</span>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: t.bgPanel,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowStationSelector(false);
                  setStationSelectorType(null);
                  setModalAction(null);
                  setSelectedDefect(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Ubicación */}
      {showAssignLocation && (
        <div style={styles.modal} onClick={closeAssignLocationModal}>
          <div style={{ ...styles.modalContent, maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {assignSingleDefect
                ? (language === 'es' ? 'Asignar Ubicación a Pieza' : 'Assign Location to Piece')
                : (language === 'es' ? 'Asignar Ubicación (Batch)' : 'Assign Location (Batch)')}
            </h3>

            {/* Lista de defectos sin ubicación (solo en modo batch y cuando no hay seriales pre-seleccionados) */}
            {!assignSingleDefect && pendingWithoutLocation.length > 0 && assignSerialsList.length === 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: t.warning + '15',
                borderRadius: '8px',
                border: `1px solid ${t.warning}40`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontWeight: '600', color: t.warning, fontSize: '13px' }}>
                    {language === 'es'
                      ? `${pendingWithoutLocation.length} defectos requieren ubicación`
                      : `${pendingWithoutLocation.length} defects need location`}
                  </span>
                  <button
                    onClick={() => {
                      const serials = pendingWithoutLocation
                        .map(d => d.serialNumber || d.serial_number || d.lotNumber || d.lot_number)
                        .filter(s => s && !assignSerialsList.includes(s));
                      if (serials.length > 0) {
                        setAssignSerialsList(prev => [...prev, ...serials]);
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      backgroundColor: t.warning,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {language === 'es' ? 'Agregar Todos' : 'Add All'}
                  </button>
                </div>
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {pendingWithoutLocation.slice(0, 20).map(d => {
                    const serial = d.serialNumber || d.serial_number || d.lotNumber || d.lot_number;
                    const isAdded = serial && assignSerialsList.includes(serial);
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          if (serial && !isAdded) {
                            setAssignSerialsList(prev => [...prev, serial]);
                          }
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          backgroundColor: isAdded ? t.success + '20' : t.bgCard,
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: serial && !isAdded ? 'pointer' : 'default',
                          border: isAdded ? `1px solid ${t.success}` : '1px solid transparent',
                          opacity: isAdded ? 0.7 : 1
                        }}
                        title={serial && !isAdded
                          ? (language === 'es' ? 'Click para agregar a la lista' : 'Click to add to list')
                          : (isAdded ? (language === 'es' ? 'Ya agregado' : 'Already added') : '')}
                      >
                        <span style={{ fontWeight: '500', color: isAdded ? t.success : t.text }}>
                          {isAdded ? '✓ ' : ''}{serial || '-'}
                        </span>
                        <span style={{ color: t.textMuted }}>
                          {d.entryNumber || d.entry_number}
                        </span>
                        <span style={{ color: t.textMuted, fontSize: '11px' }}>
                          {d.defectTypeName || d.defect_type_name}
                        </span>
                      </div>
                    );
                  })}
                  {pendingWithoutLocation.length > 20 && (
                    <div style={{ textAlign: 'center', color: t.textMuted, fontSize: '11px', padding: '4px' }}>
                      +{pendingWithoutLocation.length - 20} {language === 'es' ? 'más...' : 'more...'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paso 1: Seleccionar o escanear ubicación */}
            <div style={styles.formGroup}>
              <label style={styles.label}>{assignSingleDefect
                ? (language === 'es' ? 'Seleccionar Ubicación' : 'Select Location')
                : (language === 'es' ? '1. Seleccionar Ubicación' : '1. Select Location')}</label>

              {/* Input para escanear (principal) */}
              {!assignLocationData && (
                <div style={{ marginBottom: '12px' }}>
                  <input
                    ref={locationInputRef}
                    type="text"
                    style={{
                      ...styles.input,
                      width: '100%',
                      border: `1px solid ${t.border}`
                    }}
                    value={assignLocationCode}
                    onChange={(e) => setAssignLocationCode(e.target.value.toUpperCase())}
                    onKeyDown={handleLocationCodeScan}
                    placeholder={language === 'es' ? 'Escanear código de ubicación...' : 'Scan location code...'}
                    disabled={assignLoading}
                    autoFocus
                  />
                </div>
              )}

              {/* Lista de ubicaciones disponibles */}
              {!assignLocationData && availableLocations.length > 0 && (
                <>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>{language === 'es' ? 'o seleccionar:' : 'or select:'}</div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    padding: '8px'
                  }}>
                    {availableLocations.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => selectLocationFromList(loc)}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: t.bgPanel,
                          border: `1px solid ${t.border}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <span style={{ color: t.text, fontWeight: '600' }}>{loc.code}</span>
                          <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>
                            {loc.description || loc.stationName || loc.station_name || (language === 'es' ? 'Sin descripción' : 'No description')}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: t.accent }}>{language === 'es' ? 'Seleccionar' : 'Select'}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!assignLocationData && availableLocations.length === 0 && (
                <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '6px', color: t.textMuted, fontSize: '13px' }}>
                  {language === 'es' ? 'No hay ubicaciones configuradas. Crear en Admin > Ubicaciones.' : 'No locations configured. Create in Admin > Locations.'}
                </div>
              )}

              {/* Ubicación seleccionada */}
              {assignLocationData && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: t.bgPanel,
                    borderRadius: '6px',
                    border: `1px solid ${t.success}`
                  }}>
                    <div style={{ fontWeight: '600', color: t.success }}>
                      {assignLocationData.code}
                    </div>
                    <div style={{ fontSize: '13px', color: t.success, marginTop: '4px' }}>
                      {assignLocationData.description || assignLocationData.stationName || L.noDescription}
                    </div>
                  </div>
                  <button
                    style={{
                      padding: '8px',
                      backgroundColor: t.bgPanel,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setAssignLocationData(null);
                      setAssignLocationCode('');
                    }}
                    title="Cambiar ubicación"
                  >
                    X
                  </button>
                </div>
              )}
            </div>

            {/* Paso 2: Serial (modo individual muestra info, modo batch permite escanear) */}
            {assignLocationData && (
              <div style={styles.formGroup}>
                {assignSingleDefect ? (
                  <>
                    <label style={styles.label}>2. Serial a asignar</label>
                    <div style={{
                      padding: '12px',
                      backgroundColor: t.bgPanel,
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`
                    }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '600' }}>
                        {assignSingleDefect.serialNumber || assignSingleDefect.serial_number || assignSingleDefect.lotNumber || assignSingleDefect.lot_number}
                      </span>
                      <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                        {assignSingleDefect.partNumber || assignSingleDefect.part_number} - {assignSingleDefect.defectTypeName || assignSingleDefect.defect_type_name}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <label style={styles.label}>2. Escanear Seriales (o pegar desde Excel)</label>
                    <input
                      ref={serialInputRef}
                      type="text"
                      style={styles.input}
                      value={assignSerialInput}
                      onChange={(e) => setAssignSerialInput(e.target.value)}
                      onKeyDown={handleSerialScan}
                      onPaste={handleSerialPaste}
                      placeholder="Escanear o pegar seriales..."
                      disabled={assignLoading}
                    />

                    {/* Lista de seriales */}
                    {assignSerialsList.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: `1px solid ${t.border}`,
                        borderRadius: '6px'
                      }}>
                        {assignSerialsList.map((serial, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderBottom: idx < assignSerialsList.length - 1 ? `1px solid ${t.border}` : 'none',
                              backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{serial}</span>
                            <button
                              onClick={() => removeSerial(serial)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: t.error,
                                cursor: 'pointer',
                                padding: '2px 6px',
                                fontSize: '16px'
                              }}
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '8px', fontSize: '13px', color: t.textMuted }}>
                      {assignSerialsList.length} serial{assignSerialsList.length !== 1 ? 'es' : ''} en lista
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Resultados de asignación */}
            {assignResults && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: t.bgPanel,
                borderRadius: '6px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Resultados:</div>

                {assignResults.assigned.length > 0 && (
                  <div style={{ color: t.success, marginBottom: '4px' }}>
                    Asignados: {assignResults.assigned.length}
                  </div>
                )}

                {assignResults.notFound.length > 0 && (
                  <div style={{ color: t.warning, marginBottom: '4px' }}>
                    No encontrados: {assignResults.notFound.join(', ')}
                  </div>
                )}

                {assignResults.errors.length > 0 && (
                  <div style={{ color: t.error }}>
                    ❌ Errores: {assignResults.errors.map(e => e.serial).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={closeAssignLocationModal}>
                Cerrar
              </button>
              <button
                style={{
                  ...styles.btnConfirm,
                  backgroundColor: assignLocationData && assignSerialsList.length > 0 ? t.info : t.border,
                  cursor: assignLocationData && assignSerialsList.length > 0 ? 'pointer' : 'not-allowed'
                }}
                onClick={executeAssignLocation}
                disabled={!assignLocationData || assignSerialsList.length === 0 || assignLoading}
              >
                {assignLoading ? 'Asignando...' : `Asignar (${assignSerialsList.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entregar a QA - Transferir piezas reparadas */}
      {showHandoffQA && (
        <div style={styles.modal} onClick={closeHandoffQAModal}>
          <div style={{ ...styles.modalContent, maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header con icono */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: t.info + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📦
              </div>
              <div>
                <h3 style={{ ...styles.modalTitle, margin: 0 }}>Transferir Piezas Reparadas a QA</h3>
                <p style={{ fontSize: '12px', color: t.textMuted, margin: '4px 0 0 0' }}>
                  Registra la entrega de piezas reparadas al área de calidad
                </p>
              </div>
            </div>

            {/* Indicador de progreso */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: t.bgPanel,
              borderRadius: '8px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: handoffLocationData ? t.success : t.info,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {handoffLocationData ? '✓' : '1'}
              </div>
              <div style={{
                flex: 1,
                height: '3px',
                backgroundColor: handoffLocationData ? t.success : t.border,
                borderRadius: '2px'
              }} />
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: handoffSerialsList.length > 0 ? t.success : (handoffLocationData ? t.info : t.border),
                color: handoffLocationData ? '#fff' : t.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {handoffSerialsList.length > 0 ? '✓' : '2'}
              </div>
              <div style={{
                flex: 1,
                height: '3px',
                backgroundColor: handoffSerialsList.length > 0 ? t.success : t.border,
                borderRadius: '2px'
              }} />
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: handoffResults ? t.success : t.border,
                color: handoffResults ? '#fff' : t.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {handoffResults ? '✓' : '3'}
              </div>
            </div>

            {/* Paso 1: Escanear ubicación RELEASE */}
            <div style={{
              ...styles.formGroup,
              padding: '16px',
              backgroundColor: !handoffLocationData ? t.bgCard : 'transparent',
              border: !handoffLocationData ? `2px solid ${t.info}` : `1px solid ${t.border}`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: handoffLocationData ? t.success : t.info,
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}>
                  {handoffLocationData ? '✓' : '1'}
                </span>
                Destino: ¿Dónde entregas las piezas?
              </label>
              {!handoffLocationData ? (
                <>
                  <input
                    ref={handoffLocationInputRef}
                    type="text"
                    style={{
                      ...styles.input,
                      fontSize: '16px',
                      padding: '12px',
                      textAlign: 'center',
                      letterSpacing: '2px',
                      fontWeight: '600'
                    }}
                    value={handoffLocationCode}
                    onChange={(e) => setHandoffLocationCode(e.target.value.toUpperCase())}
                    onKeyDown={handleHandoffLocationScan}
                    placeholder="Escanea el código de la estación QA"
                    disabled={handoffLoading}
                    autoFocus
                  />
                  <p style={{ fontSize: '11px', color: t.textMuted, marginTop: '8px', textAlign: 'center' }}>
                    Escanea el código QR de la estación de liberación y presiona Enter
                  </p>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: t.success + '15',
                  borderRadius: '6px',
                  border: `1px solid ${t.success}`
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: t.success, fontSize: '15px' }}>
                      📍 {handoffLocationData.code}
                    </div>
                    <div style={{ fontSize: '12px', color: t.text, marginTop: '2px' }}>
                      {handoffLocationData.description || handoffLocationData.stationName || 'Estación de Liberación'}
                    </div>
                  </div>
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: t.bgPanel,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: t.text
                    }}
                    onClick={() => {
                      setHandoffLocationData(null);
                      setHandoffLocationCode('');
                      setTimeout(() => handoffLocationInputRef.current?.focus(), 100);
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            {/* Paso 2: Escanear seriales */}
            <div style={{
              ...styles.formGroup,
              padding: '16px',
              backgroundColor: handoffLocationData && handoffSerialsList.length === 0 ? t.bgCard : 'transparent',
              border: handoffLocationData && handoffSerialsList.length === 0 ? `2px solid ${t.info}` : `1px solid ${t.border}`,
              borderRadius: '8px',
              marginBottom: '16px',
              opacity: handoffLocationData ? 1 : 0.5
            }}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: handoffSerialsList.length > 0 ? t.success : (handoffLocationData ? t.info : t.border),
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}>
                  {handoffSerialsList.length > 0 ? '✓' : '2'}
                </span>
                Piezas: ¿Cuáles piezas entregas?
              </label>
              <input
                ref={handoffSerialInputRef}
                type="text"
                style={{
                  ...styles.input,
                  fontSize: '16px',
                  padding: '12px',
                  textAlign: 'center',
                  letterSpacing: '1px'
                }}
                value={handoffSerialInput}
                onChange={(e) => setHandoffSerialInput(e.target.value)}
                onKeyDown={handleHandoffSerialScan}
                placeholder="Escanea cada serial/lote"
                disabled={!handoffLocationData || handoffLoading}
              />

              {handoffSerialsList.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px'
                }}>
                  {handoffSerialsList.map((serial, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderBottom: idx < handoffSerialsList.length - 1 ? `1px solid ${t.border}` : 'none',
                        backgroundColor: idx % 2 === 0 ? t.bgCard : t.bgPanel
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '500' }}>
                        {idx + 1}. {serial}
                      </span>
                      <button
                        onClick={() => removeHandoffSerial(serial)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: t.error,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px'
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                backgroundColor: handoffSerialsList.length > 0 ? t.success + '15' : t.bgPanel,
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: handoffSerialsList.length > 0 ? t.success : t.textMuted
              }}>
                {handoffSerialsList.length === 0
                  ? 'Escanea las piezas que vas a entregar'
                  : `${handoffSerialsList.length} pieza${handoffSerialsList.length !== 1 ? 's' : ''} lista${handoffSerialsList.length !== 1 ? 's' : ''} para entregar`}
              </div>
            </div>

            {/* Resultados */}
            {handoffResults && (
              <div style={{
                padding: '16px',
                backgroundColor: t.success + '10',
                borderRadius: '8px',
                border: `1px solid ${t.success}`,
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '10px', color: t.success, fontSize: '15px' }}>
                  ✓ Transferencia Completada
                </div>

                {handoffResults.assigned.length > 0 && (
                  <div style={{ color: t.success, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <span>{handoffResults.assigned.length} pieza{handoffResults.assigned.length !== 1 ? 's' : ''} entregada{handoffResults.assigned.length !== 1 ? 's' : ''} a QA</span>
                  </div>
                )}

                {handoffResults.notFound.length > 0 && (
                  <div style={{ color: t.warning, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span>No encontrados: {handoffResults.notFound.join(', ')}</span>
                  </div>
                )}

                {handoffResults.errors.length > 0 && (
                  <div style={{ color: t.error, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>❌</span>
                    <span>Errores: {handoffResults.errors.map(e => e.serial).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div style={{ ...styles.modalActions, marginTop: '8px' }}>
              <button style={styles.btnCancel} onClick={closeHandoffQAModal}>
                {handoffResults ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Cancelar' : 'Cancel')}
              </button>
              {!handoffResults && (
                <button
                  style={{
                    ...styles.btnConfirm,
                    backgroundColor: handoffLocationData && handoffSerialsList.length > 0 ? t.success : t.border,
                    cursor: handoffLocationData && handoffSerialsList.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={executeHandoffQA}
                  disabled={!handoffLocationData || handoffSerialsList.length === 0 || handoffLoading}
                >
                  {handoffLoading ? (
                    'Procesando...'
                  ) : (
                    <>
                      <span>📤</span>
                      Confirmar Entrega ({handoffSerialsList.length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cambio Masivo de Responsable */}
      {showBulkModal && (
        <div style={styles.modal} onClick={() => setShowBulkModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: t.accent + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                🔄
              </div>
              <div>
                <h3 style={{ ...styles.modalTitle, margin: 0 }}>{language === 'es' ? 'Cambio Masivo de Responsable' : 'Bulk Responsible Change'}</h3>
                <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
                  {selectedDefects.size} {language === 'es'
                    ? `defecto${selectedDefects.size !== 1 ? 's' : ''} seleccionado${selectedDefects.size !== 1 ? 's' : ''}`
                    : `defect${selectedDefects.size !== 1 ? 's' : ''} selected`}
                </p>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Nueva Área Responsable *' : 'New Responsible Area *'}</label>
              <select
                style={{
                  ...styles.select,
                  border: bulkDepartmentId ? `2px solid ${t.success}` : undefined
                }}
                value={bulkDepartmentId}
                onChange={(e) => setBulkDepartmentId(e.target.value)}
              >
                <option value="">{language === 'es' ? '-- Seleccionar departamento --' : '-- Select department --'}</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Motivo / Notas' : 'Reason / Notes'}</label>
              <DebouncedTextarea
                style={styles.textarea}
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={language === 'es' ? 'Explica el motivo de la reasignación masiva...' : 'Explain the reason for the bulk reassignment...'}
                rows={3}
              />
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? 'Resumen de la operación:' : 'Operation summary:'}
              </div>
              <div style={{ color: t.textMuted }}>
                • {language === 'es' ? 'Se reasignarán' : 'Will reassign'} <strong>{selectedDefects.size}</strong> {language === 'es' ? 'defectos' : 'defects'}
                {bulkDepartmentId && (
                  <span> {language === 'es' ? 'al área' : 'to area'} <strong style={{ color: t.accent }}>
                    {departments.find(d => d.id === parseInt(bulkDepartmentId))?.name}
                  </strong></span>
                )}
              </div>
              <div style={{ color: t.textMuted, marginTop: '4px' }}>
                • {language === 'es' ? 'Se registrará el cambio en el historial de cada defecto' : 'Change will be recorded in each defect history'}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.btnCancel}
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkDepartmentId('');
                  setBulkNotes('');
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                style={{
                  ...styles.btnConfirm,
                  backgroundColor: bulkDepartmentId ? t.accent : t.border,
                  cursor: bulkDepartmentId ? 'pointer' : 'not-allowed'
                }}
                onClick={executeBulkReassign}
                disabled={!bulkDepartmentId || bulkLoading}
              >
                {bulkLoading
                  ? (language === 'es' ? 'Procesando...' : 'Processing...')
                  : (language === 'es'
                    ? `Reasignar ${selectedDefects.size} Defecto${selectedDefects.size !== 1 ? 's' : ''}`
                    : `Reassign ${selectedDefects.size} Defect${selectedDefects.size !== 1 ? 's' : ''}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desviación */}
      {showDeviationModal && (
        <div style={styles.modal} onClick={() => setShowDeviationModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: t.accent + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                📋
              </div>
              <div>
                <h3 style={{ ...styles.modalTitle, margin: 0 }}>
                  {selectedDeviation
                    ? (language === 'es' ? 'Editar Desviación' : 'Edit Deviation')
                    : (language === 'es' ? 'Nueva Desviación' : 'New Deviation')}
                </h3>
                {selectedDeviation && (
                  <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
                    {selectedDeviation.referenceNumber}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Tipo de Desviación *' : 'Deviation Type *'}</label>
                <select
                  style={styles.select}
                  value={deviationForm.deviationType}
                  onChange={(e) => setDeviationForm(prev => ({ ...prev, deviationType: e.target.value }))}
                >
                  {DEVIATION_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Cliente *' : 'Client *'}</label>
                <select
                  style={styles.select}
                  value={deviationForm.clientId}
                  onChange={(e) => handleDeviationClientChange(e.target.value)}
                >
                  <option value="">{language === 'es' ? '-- Seleccionar cliente --' : '-- Select client --'}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Número de parte - solo si hay cliente seleccionado */}
            {deviationForm.clientId && (
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {language === 'es' ? 'Números de Parte (selección múltiple)' : 'Part Numbers (multi-select)'}
                  {clientPartsForDeviation.length > 0 && (
                    <span style={{ fontSize: '11px', color: t.textMuted, marginLeft: '8px' }}>
                      ({clientPartsForDeviation.length} {language === 'es' ? 'disponibles' : 'available'})
                    </span>
                  )}
                </label>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  padding: '8px',
                  backgroundColor: t.bg
                }}>
                  {clientPartsForDeviation.map(p => {
                    const partIdStr = String(p.id);
                    const isChecked = (deviationForm.partIds || []).includes(partIdStr);
                    return (
                      <label key={p.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: t.text
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentIds = deviationForm.partIds || [];
                            let newIds;
                            if (e.target.checked) {
                              newIds = [...currentIds, partIdStr];
                            } else {
                              newIds = currentIds.filter(id => id !== partIdStr);
                            }
                            setDeviationForm(prev => ({ ...prev, partIds: newIds }));
                            // Sincronizar con filtro de búsqueda
                            setDefectSearchPartIds(newIds);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{p.partNumber || p.part_number} - {p.partName || p.part_name}</span>
                      </label>
                    );
                  })}
                </div>
                {(deviationForm.partIds || []).length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: t.accent }}>
                      {(deviationForm.partIds || []).length} {language === 'es' ? 'seleccionadas' : 'selected'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeviationForm(prev => ({ ...prev, partIds: [] }));
                        setDefectSearchPartIds([]);
                      }}
                      style={{
                        fontSize: '11px',
                        color: t.textMuted,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {language === 'es' ? '✕ Limpiar' : '✕ Clear'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Descripción *' : 'Description *'}</label>
              <DebouncedTextarea
                style={styles.textarea}
                value={deviationForm.description}
                onChange={(e) => setDeviationForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={language === 'es' ? 'Describe la desviación, condiciones de aceptación...' : 'Describe the deviation, acceptance conditions...'}
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{language === 'es' ? 'Fecha de Vigencia (opcional)' : 'Validity Date (optional)'}</label>
                <input
                  type="date"
                  style={styles.input}
                  value={deviationForm.validityDate}
                  onChange={(e) => setDeviationForm(prev => ({ ...prev, validityDate: e.target.value }))}
                />
              </div>

              {selectedDeviation && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>{language === 'es' ? 'Estado' : 'Status'}</label>
                  <select
                    style={styles.select}
                    value={deviationForm.status || selectedDeviation.status}
                    onChange={(e) => setDeviationForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {DEVIATION_STATUS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Notas Adicionales' : 'Additional Notes'}</label>
              <DebouncedTextarea
                style={styles.textarea}
                value={deviationForm.notes}
                onChange={(e) => setDeviationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'es' ? 'Notas internas, referencias a documentos...' : 'Internal notes, document references...'}
                rows={2}
              />
            </div>

            {/* Archivos adjuntos */}
            <div style={styles.formGroup}>
              <label style={styles.label}>{language === 'es' ? 'Archivos de Evidencia' : 'Evidence Files'}</label>

              {/* Archivos existentes (solo en edición) */}
              {selectedDeviation && existingAttachments.length > 0 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`
                }}>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>
                    {language === 'es' ? 'Archivos guardados:' : 'Saved files:'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {existingAttachments.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: t.bgCard,
                          borderRadius: '6px',
                          border: `1px solid ${t.border}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>
                            {att.mimetype?.includes('pdf') ? '📄' :
                             att.mimetype?.includes('image') ? '🖼️' :
                             att.mimetype?.includes('word') ? '📝' :
                             att.mimetype?.includes('excel') || att.mimetype?.includes('sheet') ? '📊' : '📎'}
                          </span>
                          <div>
                            <div style={{ fontSize: '13px', color: t.text, fontWeight: '500' }}>
                              {att.originalName}
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted }}>
                              {(att.fileSize / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a
                            href={`http://localhost:5000${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 10px',
                              backgroundColor: t.accent,
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '11px',
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}
                          >
                            {language === 'es' ? 'Descargar' : 'Download'}
                          </a>
                          <button
                            onClick={async () => {
                              if (window.confirm(language === 'es' ? '¿Eliminar este archivo?' : 'Delete this file?')) {
                                const result = await deleteDeviationAttachment(selectedDeviation.id, att.id);
                                if (result.success) {
                                  setExistingAttachments(prev => prev.filter(a => a.id !== att.id));
                                  loadDeviations();
                                }
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: t.danger || '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar nuevos archivos */}
              <input
                ref={deviationFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }}
                onChange={handleDeviationFileSelect}
              />
              <button
                type="button"
                onClick={() => deviationFileInputRef.current?.click()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: t.bgPanel,
                  border: `1px dashed ${t.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: t.textMuted,
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                + {language === 'es' ? 'Agregar archivos (PDF, Word, Excel, Imágenes)' : 'Add files (PDF, Word, Excel, Images)'}
              </button>
              {deviationFiles.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {deviationFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: t.bgPanel,
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>{file.name}</span>
                      <button
                        onClick={() => removeDeviationFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: t.danger || '#ef4444',
                          padding: '0',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Defectos vinculados - Solo en edición */}
            {selectedDeviation && (
              <div style={{ ...styles.formGroup, marginTop: '16px' }}>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{language === 'es' ? 'Defectos Vinculados' : 'Linked Defects'}</span>
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: t.accent + '20',
                    color: t.accent,
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {linkedDefects.length}
                  </span>
                </label>

                {/* Contexto automático de la desviación */}
                {deviationForm.clientId && (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: t.accent + '15',
                    borderRadius: '8px',
                    border: `1px solid ${t.accent}40`,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '16px' }}>🎯</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: t.text }}>
                        {language === 'es' ? 'Filtro automático activo' : 'Auto-filter active'}
                      </div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>
                        {language === 'es' ? 'Cliente: ' : 'Client: '}
                        <strong>{clients.find(c => c.id === parseInt(deviationForm.clientId))?.name || deviationForm.clientId}</strong>
                        {defectSearchPartIds.length > 0 && (
                          <span> | {language === 'es' ? 'Partes: ' : 'Parts: '}
                            <strong>
                              {defectSearchPartIds.map(id => {
                                const part = clientPartsForDeviation.find(p => p.id === parseInt(id));
                                return part?.partNumber || part?.part_number || id;
                              }).join(', ')}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Búsqueda de defectos */}
                <div style={{
                  padding: '12px',
                  backgroundColor: t.bgPanel,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '10px', fontWeight: '600' }}>
                    {language === 'es' ? '🔍 Buscar Defectos para Vincular' : '🔍 Search Defects to Link'}
                  </div>

                  {/* Row 1: Serials (textarea) */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                      {language === 'es' ? 'Seriales (uno por línea o separados por coma)' : 'Serials (one per line or comma-separated)'}
                    </label>
                    <DebouncedTextarea
                      style={{
                        ...styles.input,
                        width: '100%',
                        minHeight: '60px',
                        resize: 'vertical',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                      }}
                      placeholder={language === 'es'
                        ? 'Ej:\nSN001\nSN002\nSN003'
                        : 'Ex:\nSN001\nSN002\nSN003'}
                      value={defectSearchSerial}
                      onChange={(e) => setDefectSearchSerial(e.target.value)}
                    />
                  </div>


                  {/* Row 3: Defect Type dropdown */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                      {language === 'es' ? 'Tipo de Defecto' : 'Defect Type'}
                    </label>
                    <select
                      style={{ ...styles.input, width: '100%' }}
                      value={defectSearchDefectTypeId}
                      onChange={(e) => setDefectSearchDefectTypeId(e.target.value)}
                    >
                      <option value="">{language === 'es' ? '-- Todos --' : '-- All --'}</option>
                      {availableDefectTypesForSearch.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtros Avanzados - Colapsable */}
                  <div style={{ marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: t.accent,
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ transform: showAdvancedFilters ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                      {language === 'es' ? 'Filtros Avanzados' : 'Advanced Filters'}
                    </button>

                    {showAdvancedFilters && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        backgroundColor: t.bgCard,
                        borderRadius: '6px',
                        border: `1px solid ${t.border}`
                      }}>
                        {/* Entry Range */}
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                            {language === 'es' ? 'Rango de Entry (ej: 20 o DEF-2026-00020)' : 'Entry Range (e.g., 20 or DEF-2026-00020)'}
                          </label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder={language === 'es' ? 'Desde' : 'From'}
                              value={defectSearchEntryFrom}
                              onChange={(e) => setDefectSearchEntryFrom(e.target.value)}
                              style={{ ...styles.input, flex: 1, width: 'auto' }}
                            />
                            <span style={{ color: t.textMuted }}>→</span>
                            <input
                              type="text"
                              placeholder={language === 'es' ? 'Hasta' : 'To'}
                              value={defectSearchEntryTo}
                              onChange={(e) => setDefectSearchEntryTo(e.target.value)}
                              style={{ ...styles.input, flex: 1, width: 'auto' }}
                            />
                          </div>
                        </div>

                        {/* Date Range */}
                        <div>
                          <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                            {language === 'es' ? 'Rango de Fecha' : 'Date Range'}
                          </label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="date"
                              value={defectSearchDateFrom}
                              onChange={(e) => setDefectSearchDateFrom(e.target.value)}
                              style={{ ...styles.input, flex: 1, width: 'auto' }}
                            />
                            <span style={{ color: t.textMuted }}>→</span>
                            <input
                              type="date"
                              value={defectSearchDateTo}
                              onChange={(e) => setDefectSearchDateTo(e.target.value)}
                              style={{ ...styles.input, flex: 1, width: 'auto' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Área Responsable Masiva */}
                  <div style={{
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    border: '1px solid #f59e0b'
                  }}>
                    <label style={{ fontSize: '11px', color: '#92400e', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      🏢 {language === 'es' ? 'Asignar Área Responsable (al vincular)' : 'Assign Responsible Area (on link)'}
                    </label>
                    <select
                      style={{ ...styles.input, width: '100%' }}
                      value={bulkDepartmentForDeviation}
                      onChange={(e) => setBulkDepartmentForDeviation(e.target.value)}
                    >
                      <option value="">{language === 'es' ? '-- Mantener actual --' : '-- Keep current --'}</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search button */}
                  <button
                    onClick={searchDefectsForDeviation}
                    disabled={searchingDefects || (!defectSearchSerial.trim() && defectSearchPartIds.length === 0 && !defectSearchDefectTypeId && !deviationForm.clientId && !defectSearchEntryFrom && !defectSearchDateFrom)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: t.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: searchingDefects ? 'wait' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      opacity: searchingDefects ? 0.7 : 1
                    }}
                  >
                    {searchingDefects
                      ? (language === 'es' ? 'Buscando...' : 'Searching...')
                      : (language === 'es' ? '🔍 Buscar Defectos' : '🔍 Search Defects')}
                  </button>
                </div>

                {/* Resultados de búsqueda */}
                {searchedDefects.length > 0 && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '10px',
                    backgroundColor: t.bgPanel,
                    borderRadius: '8px',
                    border: `1px solid ${t.border}`
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '12px', color: t.text, fontWeight: '500' }}>
                        {language === 'es'
                          ? `${searchedDefects.length} defecto(s) encontrado(s)`
                          : `${searchedDefects.length} defect(s) found`}
                      </div>
                      <button
                        onClick={async () => {
                          for (const defect of searchedDefects) {
                            await linkDefectToDeviation(defect.id);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: t.success || '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ {language === 'es' ? 'Vincular Todos' : 'Link All'} ({searchedDefects.length})
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                      {searchedDefects.map(defect => (
                        <div
                          key={defect.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: t.bgCard,
                            borderRadius: '6px',
                            border: `1px solid ${t.border}`
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>
                                #{defect.entryNumber}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: t.accent + '20',
                                color: t.accent,
                                fontWeight: '500'
                              }}>
                                {defect.serialNumber || defect.lotNumber || '-'}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: (defect.repairStatus || defect.status) === 'REPAIRED' ? (t.success || '#22c55e') + '20' :
                                               (defect.repairStatus || defect.status) === 'IN_REPAIR' ? (t.warning || '#f59e0b') + '20' :
                                               t.textMuted + '20',
                                color: (defect.repairStatus || defect.status) === 'REPAIRED' ? (t.success || '#22c55e') :
                                       (defect.repairStatus || defect.status) === 'IN_REPAIR' ? (t.warning || '#f59e0b') :
                                       t.textMuted
                              }}>
                                {defect.repairStatus || defect.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: t.textMuted, flexWrap: 'wrap' }}>
                              <span title={language === 'es' ? 'Tipo de Defecto' : 'Defect Type'}>
                                🔴 {defect.defectTypeName || defect.defectType || '-'}
                              </span>
                              {defect.partNumber && (
                                <span title={language === 'es' ? 'Número de Parte' : 'Part Number'}>
                                  📦 {defect.partNumber}
                                </span>
                              )}
                              {defect.departmentName && (
                                <span title={language === 'es' ? 'Área Responsable' : 'Responsible Area'} style={{ color: t.accent }}>
                                  🏭 {defect.departmentName}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => linkDefectToDeviation(defect.id)}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: t.success || '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            + {language === 'es' ? 'Vincular' : 'Link'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de defectos ya vinculados */}
                {linkedDefects.length > 0 ? (
                  <div style={{
                    padding: '10px',
                    backgroundColor: t.bgPanel,
                    borderRadius: '8px',
                    border: `1px solid ${t.border}`
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                      {linkedDefects.map(defect => (
                        <div
                          key={defect.defectId || defect.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            backgroundColor: t.bgCard,
                            borderRadius: '6px',
                            border: `1px solid ${t.border}`
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: t.text, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>#{defect.entryNumber}</span>
                              {(defect.serialNumber || defect.lotNumber) && (
                                <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: 'normal' }}>
                                  {defect.serialNumber || defect.lotNumber}
                                </span>
                              )}
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: defect.defectStatus === 'RELEASED' ? (t.success || '#22c55e') + '20' :
                                               defect.defectStatus === 'REPAIRED' ? (t.warning || '#f59e0b') + '20' :
                                               t.textMuted + '20',
                                color: defect.defectStatus === 'RELEASED' ? (t.success || '#22c55e') :
                                       defect.defectStatus === 'REPAIRED' ? (t.warning || '#f59e0b') :
                                       t.textMuted
                              }}>
                                {defect.defectStatus}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{defect.defectTypeName}</span>
                              {defect.departmentName && (
                                <span style={{ color: t.accent }}>• {defect.departmentName}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => unlinkDefectFromDeviation(defect.defectId || defect.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: t.danger || '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Botón de reparación/liberación masiva según modo */}
                    {(() => {
                      const pendingCount = linkedDefects.filter(d =>
                        isRepairMode
                          ? !['REPAIRED', 'RELEASED', 'CLOSED'].includes(d.defectStatus)
                          : d.defectStatus !== 'RELEASED'
                      ).length;
                      return pendingCount > 0 && (
                        <button
                          onClick={bulkProcessWithDeviation}
                          disabled={bulkReleaseLoading}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '10px',
                            backgroundColor: isRepairMode ? (t.warning || '#f59e0b') : (t.success || '#22c55e'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: bulkReleaseLoading ? 'wait' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          {bulkReleaseLoading
                            ? (language === 'es'
                              ? (isRepairMode ? 'Reparando...' : 'Liberando...')
                              : (isRepairMode ? 'Repairing...' : 'Releasing...'))
                            : (language === 'es'
                              ? (isRepairMode
                                ? `🔧 Reparar ${pendingCount} Defecto(s) con Desviación`
                                : `✅ Liberar ${pendingCount} Defecto(s) con Desviación`)
                              : (isRepairMode
                                ? `🔧 Repair ${pendingCount} Defect(s) with Deviation`
                                : `✅ Release ${pendingCount} Defect(s) with Deviation`))}
                        </button>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: t.textMuted,
                    fontSize: '13px',
                    backgroundColor: t.bgPanel,
                    borderRadius: '8px',
                    border: `1px dashed ${t.border}`
                  }}>
                    {language === 'es'
                      ? 'No hay defectos vinculados. Busca por serial para agregar.'
                      : 'No linked defects. Search by serial to add.'}
                  </div>
                )}
              </div>
            )}

            {/* Historial de cambios */}
            {selectedDeviation && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setShowDeviationHistory(!showDeviationHistory)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: t.bgPanel,
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: t.text,
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <span>
                    {language === 'es' ? '📋 Historial de Cambios' : '📋 Change History'}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: t.textMuted }}>
                      ({deviationHistory.length})
                    </span>
                  </span>
                  <span style={{ transform: showDeviationHistory ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>

                {showDeviationHistory && (
                  <div style={{
                    marginTop: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    backgroundColor: t.bgPanel
                  }}>
                    {deviationHistory.length > 0 ? (
                      deviationHistory.map((entry, idx) => (
                        <div
                          key={entry.id || idx}
                          style={{
                            padding: '10px 12px',
                            borderBottom: idx < deviationHistory.length - 1 ? `1px solid ${t.border}` : 'none',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{
                              fontWeight: '600',
                              color: entry.action === 'CREATED' ? (t.success || '#22c55e') :
                                     entry.action === 'STATUS_CHANGED' ? (t.warning || '#f59e0b') :
                                     entry.action === 'DEFECT_LINKED' ? (t.accent || '#3b82f6') :
                                     entry.action === 'DEFECT_UNLINKED' ? (t.danger || '#ef4444') :
                                     t.text
                            }}>
                              {entry.action === 'CREATED' ? (language === 'es' ? 'Creada' : 'Created') :
                               entry.action === 'UPDATED' ? (language === 'es' ? 'Actualizada' : 'Updated') :
                               entry.action === 'STATUS_CHANGED' ? (language === 'es' ? 'Estado cambiado' : 'Status changed') :
                               entry.action === 'DEFECT_LINKED' ? (language === 'es' ? 'Defecto vinculado' : 'Defect linked') :
                               entry.action === 'DEFECT_UNLINKED' ? (language === 'es' ? 'Defecto desvinculado' : 'Defect unlinked') :
                               entry.action}
                            </span>
                            <span style={{ fontSize: '10px', color: t.textMuted }}>
                              {new Date(entry.performedAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ color: t.textMuted, fontSize: '11px' }}>
                            <strong>{entry.performedByName}</strong>
                            {entry.fieldChanged && (
                              <span> - {entry.fieldChanged}: {entry.oldValue} → {entry.newValue}</span>
                            )}
                          </div>
                          {entry.notes && (
                            <div style={{ marginTop: '4px', color: t.text, fontStyle: 'italic' }}>
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: t.textMuted }}>
                        {language === 'es' ? 'Sin historial' : 'No history'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                style={styles.btnCancel}
                onClick={() => {
                  setShowDeviationModal(false);
                  setExistingAttachments([]);
                  setLinkedDefects([]);
                  setSearchedDefects([]);
                  setDefectSearchSerial('');
                  setDeviationHistory([]);
                  setShowDeviationHistory(false);
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                style={{
                  ...styles.btnConfirm,
                  backgroundColor: (deviationForm.description && deviationForm.clientId) ? t.accent : t.border,
                  cursor: (deviationForm.description && deviationForm.clientId) ? 'pointer' : 'not-allowed'
                }}
                onClick={handleDeviationSubmit}
                disabled={!deviationForm.description || !deviationForm.clientId || loading}
              >
                {loading
                  ? (language === 'es' ? 'Guardando...' : 'Saving...')
                  : (selectedDeviation
                    ? (language === 'es' ? 'Actualizar' : 'Update')
                    : (language === 'es' ? 'Crear Desviación' : 'Create Deviation'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envío a Validación */}
      {showHandoffModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowHandoffModal(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '450px',
            maxWidth: '550px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              color: handoffDestination === 'QA' ? (t.success || '#22c55e') :
                     handoffDestination === 'SCRAP' ? (t.danger || '#dc2626') :
                     (t.warning || '#f59e0b')
            }}>
              {handoffDestination === 'QA'
                ? (language === 'es' ? '📦 Enviar a Calidad (QA)' : '📦 Send to Quality (QA)')
                : handoffDestination === 'SCRAP'
                  ? (language === 'es' ? '🗑️ Enviar a Scrap' : '🗑️ Send to Scrap')
                  : (language === 'es' ? '⚠️ Enviar a Cuarentena (MRB)' : '⚠️ Send to Quarantine (MRB)')}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              {language === 'es'
                ? `Se enviarán ${selectedForHandoff.size} defecto(s) al área seleccionada.`
                : `${selectedForHandoff.size} defect(s) will be sent to the selected area.`}
            </p>

            {/* Selección de estación - Solo para QA */}
            {handoffDestination === 'QA' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                  {language === 'es' ? '📍 Estación de Calidad (destino) *' : '📍 Quality Station (destination) *'}
                </label>

                {/* Dropdown de estaciones */}
                <select
                  value={handoffSelectedStation?.id || ''}
                  onChange={(e) => {
                    const station = releaseStations.find(s => s.id === parseInt(e.target.value));
                    setHandoffSelectedStation(station || null);
                    setHandoffStationCode('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${handoffSelectedStation ? t.success : t.border}`,
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}
                >
                  <option value="">{language === 'es' ? '-- Seleccionar estación --' : '-- Select station --'}</option>
                  {releaseStations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.code} - {station.name}
                    </option>
                  ))}
                </select>

                {/* Separador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                  <span style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'o escanear' : 'or scan'}</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                </div>

                {/* Input de escaneo */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={handoffStationCode}
                    onChange={(e) => setHandoffStationCode(e.target.value.toUpperCase())}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const code = handoffStationCode.trim();
                        if (!code) return;
                        // Buscar en releaseStations por código
                        const found = releaseStations.find(s =>
                          s.code?.toUpperCase() === code ||
                          s.name?.toUpperCase() === code
                        );
                        if (found) {
                          setHandoffSelectedStation(found);
                          setHandoffStationCode('');
                        } else {
                          setError(language === 'es' ? 'Estación no encontrada' : 'Station not found');
                        }
                      }
                    }}
                    placeholder={language === 'es' ? '📷 Escanear código de estación...' : '📷 Scan station code...'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgPanel,
                      color: t.text,
                      fontSize: '13px'
                    }}
                  />
                </div>

                {/* Estación seleccionada */}
                {handoffSelectedStation && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    backgroundColor: t.success + '15',
                    border: `1px solid ${t.success}`,
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: t.success }}>
                        ✓ {handoffSelectedStation.code}
                      </span>
                      <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '8px' }}>
                        {handoffSelectedStation.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setHandoffSelectedStation(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: t.textMuted,
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >×</button>
                  </div>
                )}
              </div>
            )}

            {/* Selección de Location MRB - Para QUARANTINE y SCRAP */}
            {(handoffDestination === 'QUARANTINE' || handoffDestination === 'SCRAP') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                  📍 {language === 'es' ? 'Location MRB (destino) *' : 'MRB Location (destination) *'}
                </label>
                <select
                  value={selectedMrbLocation?.id || ''}
                  onChange={(e) => {
                    const loc = mrbLocations.find(l => l.id === parseInt(e.target.value));
                    setSelectedMrbLocation(loc || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${selectedMrbLocation ? t.warning : t.border}`,
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    fontSize: '13px'
                  }}
                >
                  <option value="">{language === 'es' ? '-- Seleccionar location MRB --' : '-- Select MRB location --'}</option>
                  {mrbLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.description || loc.code}
                    </option>
                  ))}
                </select>
                {mrbLocations.length === 0 && (
                  <p style={{ fontSize: '12px', color: t.warning, marginTop: '6px' }}>
                    {language === 'es' ? '⚠️ No hay locations MRB configuradas' : '⚠️ No MRB locations configured'}
                  </p>
                )}

                {/* Campaña MRB (opcional) */}
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px', marginTop: '16px' }}>
                  🏷️ {language === 'es' ? 'Campaña MRB (opcional)' : 'MRB Campaign (optional)'}
                </label>
                <select
                  value={selectedMrbCampaign?.id || ''}
                  onChange={(e) => {
                    const camp = mrbCampaignsForHandoff.find(c => c.id === parseInt(e.target.value));
                    setSelectedMrbCampaign(camp || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${selectedMrbCampaign ? t.accent : t.border}`,
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    fontSize: '13px'
                  }}
                >
                  <option value="">{language === 'es' ? '-- Sin campaña (buffer) --' : '-- No campaign (buffer) --'}</option>
                  {mrbCampaignsForHandoff.map(camp => (
                    <option key={camp.id} value={camp.id}>
                      {camp.mrbNumber || camp.mrb_number} - {camp.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista de defectos seleccionados */}
            <div style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {pendingHandoff.filter(d => selectedForHandoff.has(d.id)).map((defect, idx) => (
                <div key={defect.id} style={{
                  padding: '10px 12px',
                  borderBottom: idx < selectedForHandoff.size - 1 ? `1px solid ${t.border}` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>
                      {defect.serialNumber || defect.serial_number || defect.lotNumber || defect.lot_number}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>
                      {defect.partNumber || defect.part_number} - {defect.defectTypeName || defect.defect_type_name}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: t.success }}>
                    {defect.entryNumber || defect.entry_number}
                  </span>
                </div>
              ))}
            </div>

            {/* Notas opcionales */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: t.text, marginBottom: '6px' }}>
                {language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
              </label>
              <DebouncedTextarea
                value={handoffNotes}
                onChange={(e) => setHandoffNotes(e.target.value)}
                placeholder={language === 'es' ? 'Agregar comentario...' : 'Add comment...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowHandoffModal(false);
                  setHandoffNotes('');
                  setHandoffSelectedStation(null);
                  setHandoffStationCode('');
                }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={executeHandoffMasivo}
                disabled={handoffLoading || (handoffDestination === 'QA' && !handoffSelectedStation)}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: handoffDestination === 'QA' ? (t.success || '#22c55e') :
                                   handoffDestination === 'SCRAP' ? (t.danger || '#dc2626') :
                                   (t.warning || '#f59e0b'),
                  color: '#fff',
                  cursor: handoffLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {handoffLoading
                  ? (language === 'es' ? 'Enviando...' : 'Sending...')
                  : (language === 'es' ? 'Confirmar Envío' : 'Confirm Send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Paquete MRB */}
      {showCreatePackageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreatePackageModal(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: t.primary }}>
              {language === 'es' ? '📦 Crear Paquete de Transferencia a MRB' : '📦 Create Transfer Package to MRB'}
            </h3>

            {/* Resumen de partes a enviar */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '10px' }}>
                {language === 'es' ? '📋 Resumen de Partes a Enviar' : '📋 Parts Summary'}
              </label>
              <div style={{
                backgroundColor: t.bgPanel,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {packagePartsGroups.map((group, idx) => (
                  <div key={idx} style={{
                    padding: '10px 12px',
                    borderBottom: idx < packagePartsGroups.length - 1 ? `1px solid ${t.border}` : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: t.text, fontSize: '13px' }}>
                        {group.partNumber}
                      </span>
                      <span style={{
                        backgroundColor: t.primary,
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {group.serials.length} {language === 'es' ? 'pza(s)' : 'pc(s)'}
                      </span>
                    </div>
                    {group.partName && (
                      <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                        {group.partName}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: t.textMuted }}>
                      <strong>Seriales:</strong> {group.serials.slice(0, 5).join(', ')}
                      {group.serials.length > 5 && ` +${group.serials.length - 5} más`}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: t.textMuted, textAlign: 'right' }}>
                {language === 'es'
                  ? `Total: ${selectedForMrb.size} parte(s) en paquete`
                  : `Total: ${selectedForMrb.size} part(s) in package`}
              </div>
            </div>

            {/* Ubicación MRB destino (obligatorio) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? '📍 Ubicación MRB Destino *' : '📍 MRB Destination Location *'}
              </label>
              <select
                value={packageDestinationLocationId || ''}
                onChange={(e) => setPackageDestinationLocationId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${packageDestinationLocationId ? t.border : '#ef4444'}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px'
                }}
              >
                <option value="">{language === 'es' ? '-- Seleccionar ubicación MRB --' : '-- Select MRB location --'}</option>
                {mrbLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.description}
                  </option>
                ))}
              </select>
              {!packageDestinationLocationId && (
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#ef4444' }}>
                  {language === 'es' ? 'Requerido para control de inventario' : 'Required for inventory control'}
                </p>
              )}
            </div>

            {/* Minutos de alerta */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? '⏰ Alerta si no se recibe en (minutos)' : '⏰ Alert if not received in (minutes)'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={packageAlertMinutes}
                  onChange={(e) => setPackageAlertMinutes(parseInt(e.target.value) || 60)}
                  min="1"
                  max="10080"
                  style={{
                    width: '100px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    fontSize: '13px'
                  }}
                />
                <span style={{ fontSize: '12px', color: t.textMuted }}>
                  ({packageAlertMinutes >= 60 ? `${Math.floor(packageAlertMinutes / 60)}h ${packageAlertMinutes % 60}m` : `${packageAlertMinutes}m`})
                </span>
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                {language === 'es' ? '📝 Notas (opcional)' : '📝 Notes (optional)'}
              </label>
              <textarea
                value={packageNotes}
                onChange={(e) => setPackageNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  resize: 'vertical'
                }}
                placeholder={language === 'es' ? 'Información adicional para MRB...' : 'Additional information for MRB...'}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreatePackageModal(false);
                  setPackageNotes('');
                  setPackageDestinationLocationId(null);
                }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreatePackage}
                disabled={creatingPackage || selectedForMrb.size === 0 || !packageDestinationLocationId}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: (!packageDestinationLocationId || selectedForMrb.size === 0) ? t.border : t.primary,
                  color: '#fff',
                  cursor: (creatingPackage || !packageDestinationLocationId) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (creatingPackage || !packageDestinationLocationId) ? 0.7 : 1
                }}
              >
                {creatingPackage
                  ? (language === 'es' ? 'Creando...' : 'Creating...')
                  : (language === 'es' ? '📦 Crear Paquete' : '📦 Create Package')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibir Paquete desde MRB */}
      {showReceivePackageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowReceivePackageModal(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '600px',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f59e0b' }}>
              📦 {language === 'es' ? 'Paquetes desde MRB' : 'Packages from MRB'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: t.textMuted }}>
              {language === 'es'
                ? `${incomingPackages.length} paquete(s) REWORK pendiente(s) de recibir`
                : `${incomingPackages.length} pending REWORK package(s) to receive`}
            </p>

            {/* Lista de paquetes */}
            <div style={{ marginBottom: '20px' }}>
              {incomingPackages.map(pkg => (
                <div
                  key={pkg.id}
                  style={{
                    padding: '12px 16px',
                    marginBottom: '8px',
                    backgroundColor: selectedIncomingPackage?.id === pkg.id ? '#f59e0b15' : t.bgPanel,
                    border: `1px solid ${selectedIncomingPackage?.id === pkg.id ? '#f59e0b' : t.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedIncomingPackage(pkg);
                    viewIncomingPackageDetails(pkg);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: t.primary, marginRight: '10px' }}>
                        {pkg.packageNumber}
                      </span>
                      <span style={{ fontSize: '12px', color: t.textMuted }}>
                        {pkg.itemCount} item(s) • {pkg.partsSummary}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: pkg.alertTriggered ? '#dc262620' : '#f59e0b20',
                        color: pkg.alertTriggered ? '#dc2626' : '#f59e0b'
                      }}>
                        {pkg.minutesElapsed < 60
                          ? `${Math.round(pkg.minutesElapsed)}m`
                          : pkg.minutesElapsed < 1440
                            ? `${Math.round(pkg.minutesElapsed / 60)}h`
                            : `${Math.round(pkg.minutesElapsed / 1440)}d`}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '6px' }}>
                    {language === 'es' ? 'Enviado por' : 'Sent by'}: {pkg.createdByName} • {new Date(pkg.createdAt).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
            </div>

            {/* Detalles del paquete seleccionado */}
            {incomingPackageDetails && selectedIncomingPackage && (
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: t.bg, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: t.text }}>
                  {language === 'es' ? 'Items en' : 'Items in'} {selectedIncomingPackage.packageNumber}
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: t.bgPanel }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>Serial</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>{language === 'es' ? 'Parte' : 'Part'}</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted }}>{language === 'es' ? 'Defecto' : 'Defect'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingPackageDetails.items?.map(item => (
                      <tr key={item.id} style={{ borderTop: `1px solid ${t.border}` }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: t.primary }}>{item.serialNumber || '-'}</td>
                        <td style={{ padding: '8px', color: t.text }}>{item.partNumber}</td>
                        <td style={{ padding: '8px', color: t.text }}>{item.defectSummary || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Ubicación destino */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                    {language === 'es' ? 'Ubicación destino *' : 'Destination location *'}
                  </label>
                  <select
                    value={receiveLocationId}
                    onChange={(e) => setReceiveLocationId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${receiveLocationId ? t.border : '#ef4444'}`,
                      backgroundColor: t.bgCard,
                      color: t.text,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">{language === 'es' ? '-- Seleccionar ubicación --' : '-- Select location --'}</option>
                    {hospitalLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                  {!receiveLocationId && (
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      {language === 'es' ? 'Requerido para recibir el paquete' : 'Required to receive package'}
                    </div>
                  )}
                </div>

                {/* Notas de recepción */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                    {language === 'es' ? 'Notas de recepción (opcional)' : 'Reception notes (optional)'}
                  </label>
                  <textarea
                    value={receivePackageNotes}
                    onChange={(e) => setReceivePackageNotes(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.bgCard,
                      color: t.text,
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowReceivePackageModal(false);
                  setSelectedIncomingPackage(null);
                  setIncomingPackageDetails(null);
                  setReceivePackageNotes('');
                  setReceiveLocationId('');
                }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
              {selectedIncomingPackage && (
                <button
                  onClick={handleReceivePackage}
                  disabled={receivingPackage || !receiveLocationId}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: (receivingPackage || !receiveLocationId) ? '#6b7280' : '#16a34a',
                    color: '#fff',
                    cursor: (receivingPackage || !receiveLocationId) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: (receivingPackage || !receiveLocationId) ? 0.7 : 1
                  }}
                >
                  {receivingPackage
                    ? (language === 'es' ? 'Recibiendo...' : 'Receiving...')
                    : (language === 'es' ? 'Recibir Paquete' : 'Receive Package')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal MRB Actions */}
      {mrbModalOpen && (
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
          zIndex: 1000
        }} onClick={() => setMrbModalOpen(false)}>
          <div style={{
            backgroundColor: t.bgCard,
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            border: `1px solid ${t.border}`
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: t.text, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {mrbAction === 'returnToRepair' && <>🔧 {language === 'es' ? 'Regresar a Reparación' : 'Return to Repair'}</>}
              {mrbAction === 'toScrap' && <>🗑️ {language === 'es' ? 'Enviar a Scrap' : 'Send to Scrap'}</>}
              {mrbAction === 'releaseWithDeviation' && <>📋 {language === 'es' ? 'Liberar con Desviación' : 'Release with Deviation'}</>}
              {mrbAction === 'confirmScrap' && <>✓ {language === 'es' ? 'Confirmar Scrap' : 'Confirm Scrap'}</>}
              {mrbAction === 'returnToQuarantine' && <>↩️ {language === 'es' ? 'Regresar a Cuarentena' : 'Return to Quarantine'}</>}
            </h3>

            <p style={{ color: t.textMuted, fontSize: '14px', marginBottom: '20px' }}>
              {language === 'es' ? 'Se procesarán' : 'Will process'} <strong>{selectedForMrb.size}</strong> {language === 'es' ? 'defecto(s)' : 'defect(s)'}
            </p>

            {/* Selector de estación para return to repair */}
            {mrbAction === 'returnToRepair' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: t.text, marginBottom: '6px' }}>
                  {language === 'es' ? 'Estación de Reparación (opcional)' : 'Repair Station (optional)'}
                </label>
                <select
                  value={mrbStationId}
                  onChange={(e) => setMrbStationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgPanel,
                    color: t.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="">{language === 'es' ? '-- Sin asignar --' : '-- Not assigned --'}</option>
                  {repairStations.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de desviación para release */}
            {mrbAction === 'releaseWithDeviation' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: t.text, marginBottom: '6px' }}>
                  {language === 'es' ? 'Desviación *' : 'Deviation *'}
                </label>
                {(() => {
                  // Get part_ids from selected defects
                  const selectedPartIds = [...selectedForMrb].map(defectId => {
                    const defect = [...quarantineDefects, ...scrappedDefects, ...allDefects].find(d => d.id === defectId);
                    return defect?.partId || defect?.part_id;
                  }).filter(Boolean).map(id => parseInt(id));

                  // Filter deviations that apply to selected parts
                  const filteredDeviations = deviations.filter(d => {
                    if (d.status !== 'ACTIVE') return false;
                    // If deviation has no partIds, it applies to all parts
                    if (!d.partIds || d.partIds.length === 0) return true;
                    // Check if any selected part is covered by this deviation
                    const devPartIds = Array.isArray(d.partIds) ? d.partIds.map(p => parseInt(p)) : [parseInt(d.partIds)];
                    return selectedPartIds.some(partId => devPartIds.includes(partId));
                  });

                  const selectedDeviation = filteredDeviations.find(d => d.id === parseInt(mrbDeviationId));

                  return (
                    <>
                      {/* Dropdown de desviaciones */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: `1px solid ${t.border}`,
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {filteredDeviations.length === 0 ? (
                          <p style={{ color: t.warning, fontSize: '12px', margin: 0, padding: '8px' }}>
                            {language === 'es' ? 'No hay desviaciones activas para este número de parte.' : 'No active deviations for this part number.'}
                          </p>
                        ) : filteredDeviations.map(d => (
                          <div
                            key={d.id}
                            onClick={() => setMrbDeviationId(String(d.id))}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              backgroundColor: mrbDeviationId === String(d.id) ? t.accent + '20' : t.bgPanel,
                              border: mrbDeviationId === String(d.id) ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '700', color: t.primary, fontSize: '13px' }}>
                                {d.referenceNumber || `DEV-${d.id}`}
                              </span>
                              <span style={{ fontSize: '10px', color: t.textMuted, backgroundColor: t.bgCard, padding: '2px 6px', borderRadius: '4px' }}>
                                {d.clientName || d.client_name || 'Global'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: t.text, marginBottom: '4px' }}>
                              {d.title || d.description?.substring(0, 60) || 'Sin descripción'}
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted }}>
                              <strong>{language === 'es' ? 'Partes:' : 'Parts:'}</strong>{' '}
                              {d.partNumbers?.length > 0
                                ? d.partNumbers.slice(0, 3).join(', ') + (d.partNumbers.length > 3 ? ` +${d.partNumbers.length - 3}` : '')
                                : (language === 'es' ? 'Todas' : 'All')}
                            </div>
                            {d.validityDate && (
                              <div style={{ fontSize: '10px', color: t.warning, marginTop: '2px' }}>
                                {language === 'es' ? 'Válida hasta:' : 'Valid until:'} {new Date(d.validityDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Detalle de desviación seleccionada */}
                      {selectedDeviation && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          backgroundColor: t.accent + '10',
                          borderRadius: '6px',
                          border: `1px solid ${t.accent}30`,
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: '600', color: t.accent, marginBottom: '4px' }}>
                            ✓ {selectedDeviation.referenceNumber || `DEV-${selectedDeviation.id}`}
                          </div>
                          <div style={{ color: t.text }}>{selectedDeviation.description || selectedDeviation.title}</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Notas */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: t.text, marginBottom: '6px' }}>
                {language === 'es' ? 'Notas / Justificación' : 'Notes / Justification'}
                {(mrbAction === 'toScrap' || mrbAction === 'confirmScrap') && <span style={{ color: '#dc2626' }}> *</span>}
              </label>
              <DebouncedTextarea
                value={mrbNotes}
                onChange={(e) => setMrbNotes(e.target.value)}
                placeholder={
                  mrbAction === 'returnToRepair' ? (language === 'es' ? 'Motivo del retorno a reparación...' : 'Reason for return to repair...') :
                  mrbAction === 'toScrap' ? (language === 'es' ? 'Justificación para enviar a scrap...' : 'Justification for scrap...') :
                  mrbAction === 'releaseWithDeviation' ? (language === 'es' ? 'Notas de liberación...' : 'Release notes...') :
                  mrbAction === 'confirmScrap' ? (language === 'es' ? 'Confirmación de disposición final...' : 'Final disposition confirmation...') :
                  (language === 'es' ? 'Motivo del cambio...' : 'Reason for change...')
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgPanel,
                  color: t.text,
                  fontSize: '13px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Warning para scrap */}
            {(mrbAction === 'toScrap' || mrbAction === 'confirmScrap') && (
              <div style={{
                padding: '12px',
                backgroundColor: '#dc262610',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, color: '#dc2626', fontSize: '13px', fontWeight: '500' }}>
                  ⚠️ {mrbAction === 'confirmScrap'
                    ? (language === 'es' ? 'Esta acción es IRREVERSIBLE. El scrap quedará confirmado como disposición final.' : 'This action is IRREVERSIBLE. Scrap will be confirmed as final disposition.')
                    : (language === 'es' ? 'Los defectos serán marcados para scrap.' : 'Defects will be marked for scrap.')
                  }
                </p>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setMrbModalOpen(false); setMrbNotes(''); setMrbDeviationId(''); setMrbStationId(''); }}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  backgroundColor: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  // Validaciones
                  if ((mrbAction === 'toScrap' || mrbAction === 'confirmScrap') && !canDoScrapActions) {
                    setError(language === 'es' ? 'No tienes permisos para enviar a SCRAP' : 'You do not have SCRAP permissions');
                    return;
                  }
                  if (mrbAction === 'releaseWithDeviation' && !mrbDeviationId) {
                    setError(language === 'es' ? 'Selecciona una desviación' : 'Select a deviation');
                    return;
                  }
                  if ((mrbAction === 'toScrap' || mrbAction === 'confirmScrap') && !mrbNotes.trim()) {
                    setError(language === 'es' ? 'Las notas son obligatorias para scrap' : 'Notes are required for scrap');
                    return;
                  }

                  setLoading(true);
                  let successCount = 0;
                  let errorCount = 0;

                  for (const defectId of selectedForMrb) {
                    try {
                      let result;
                      switch (mrbAction) {
                        case 'returnToRepair':
                          result = await returnToRepair(defectId, mrbNotes, mrbStationId || null);
                          break;
                        case 'toScrap':
                          result = await quarantineToScrap(defectId, mrbNotes);
                          break;
                        case 'releaseWithDeviation':
                          result = await releaseWithDeviation(defectId, mrbDeviationId, mrbNotes);
                          break;
                        case 'confirmScrap':
                          result = await confirmScrap(defectId, mrbNotes);
                          break;
                        case 'returnToQuarantine':
                          result = await scrapToQuarantine(defectId, mrbNotes);
                          break;
                        default:
                          break;
                      }
                      if (result?.success) successCount++;
                      else errorCount++;
                    } catch (err) {
                      errorCount++;
                      console.error('MRB action error:', err);
                    }
                  }

                  setLoading(false);
                  setMrbModalOpen(false);
                  setMrbNotes('');
                  setMrbDeviationId('');
                  setMrbStationId('');
                  setSelectedForMrb(new Set());

                  if (successCount > 0) {
                    loadData();
                  }
                  if (errorCount > 0) {
                    setError(`${errorCount} ${language === 'es' ? 'defecto(s) fallaron' : 'defect(s) failed'}`);
                  }
                }}
                disabled={loading || (mrbAction === 'releaseWithDeviation' && !mrbDeviationId)}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor:
                    mrbAction === 'returnToRepair' ? (t.warning || '#f59e0b') :
                    mrbAction === 'toScrap' ? '#7f1d1d' :
                    mrbAction === 'releaseWithDeviation' ? (t.success || '#22c55e') :
                    mrbAction === 'confirmScrap' ? '#450a0a' :
                    (t.warning || '#f59e0b'),
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading
                  ? (language === 'es' ? 'Procesando...' : 'Processing...')
                  : (language === 'es' ? 'Confirmar' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia MRB - Campañas Pendientes */}
      {mrbWarningOpen && (
        <div style={styles.modal} onClick={() => setMrbWarningOpen(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ ...styles.modalTitle, margin: 0, color: '#dc2626' }}>
                {language === 'es' ? 'Inspecciones MRB Pendientes' : 'Pending MRB Inspections'}
              </h3>
              <button
                onClick={() => setMrbWarningOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: t.textMuted }}
              >×</button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#991b1b', fontWeight: '500' }}>
                {language === 'es'
                  ? 'Este serial tiene campañas MRB pendientes. Complete las inspecciones antes de aplicar disposición.'
                  : 'This serial has pending MRB campaigns. Complete inspections before applying disposition.'}
              </p>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#7f1d1d' }}>
                {language === 'es' ? 'Campañas pendientes:' : 'Pending campaigns:'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {mrbPendingCampaigns.map((c, idx) => (
                  <li key={idx} style={{ color: '#991b1b', marginBottom: '4px' }}>
                    <strong>{c.campaignNumber}</strong>: {c.title}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setMrbWarningOpen(false)}
                style={{ padding: '10px 20px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                {language === 'es' ? 'Entendido' : 'OK'}
              </button>
              <button
                onClick={sendToMrbFromWarning}
                style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                {language === 'es' ? 'Enviar a Cuarentena' : 'Send to Quarantine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle/Historia de Defecto (Solo Lectura) */}
      {detailModalOpen && detailDefect && (
        <div style={styles.modal} onClick={() => { setDetailModalOpen(false); setDetailDefect(null); }}>
          <div style={{ ...styles.modalContent, maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ ...styles.modalTitle, margin: 0 }}>
                {language === 'es' ? 'Detalle del Defecto' : 'Defect Detail'}
              </h3>
              <button
                onClick={() => { setDetailModalOpen(false); setDetailDefect(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: t.textMuted,
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Info básica */}
            <div style={{
              padding: '16px',
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Entry</span>
                  <div style={{ fontWeight: '600', color: t.accent, fontSize: '16px' }}>
                    {detailDefect.entryNumber || detailDefect.entry_number}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>Serial/Lote</span>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {detailDefect.serialNumber || detailDefect.serial_number || detailDefect.lotNumber || detailDefect.lot_number}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>{language === 'es' ? 'Tipo de Defecto' : 'Defect Type'}</span>
                  <div style={{ fontWeight: '500' }}>
                    {detailDefect.defectTypeName || detailDefect.defect_type_name || '-'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>{language === 'es' ? 'Estado' : 'Status'}</span>
                  <div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: getStatusInfo(detailDefect.repairStatus || detailDefect.repair_status || 'OPEN').bgColor,
                      color: getStatusInfo(detailDefect.repairStatus || detailDefect.repair_status || 'OPEN').color
                    }}>
                      {getStatusInfo(detailDefect.repairStatus || detailDefect.repair_status || 'OPEN').label}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>{language === 'es' ? 'Área Responsable' : 'Responsible Area'}</span>
                  <div style={{ fontWeight: '500' }}>
                    {detailDefect.departmentName || detailDefect.department_name || (language === 'es' ? 'No asignada' : 'Not assigned')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase' }}>{language === 'es' ? 'Fecha Captura' : 'Capture Date'}</span>
                  <div style={{ fontWeight: '500' }}>
                    {new Date(detailDefect.capturedAt || detailDefect.captured_at || detailDefect.createdAt || detailDefect.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
              </div>
            </div>

            {/* Comentarios del Inspector */}
            {(detailDefect.notes || detailDefect.defectNotes || detailDefect.defect_notes) && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: t.bgCard,
                borderRadius: '8px',
                marginBottom: '12px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                  {language === 'es' ? 'Comentarios del Inspector' : 'Inspector Comments'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                  {detailDefect.notes || detailDefect.defectNotes || detailDefect.defect_notes}
                </div>
              </div>
            )}

            {/* Notas de Reparación */}
            {(detailDefect.repairNotes || detailDefect.repair_notes) && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: t.bgCard,
                borderRadius: '8px',
                marginBottom: '12px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
                  {language === 'es' ? 'Notas de Reparación' : 'Repair Notes'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                  {detailDefect.repairNotes || detailDefect.repair_notes}
                </div>
              </div>
            )}

            {/* Fotos del defecto */}
            {detailDefect.photos && Array.isArray(detailDefect.photos) && detailDefect.photos.length > 0 && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: t.bgCard,
                borderRadius: '8px',
                marginBottom: '12px',
                border: `1px solid ${t.border}`
              }}>
                <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                  {language === 'es' ? 'Fotos' : 'Photos'} ({detailDefect.photos.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detailDefect.photos.map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo.url || photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: `1px solid ${t.border}`
                      }}
                    >
                      <img
                        src={photo.url || photo}
                        alt={`Foto ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: t.bgPanel,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: t.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                {language === 'es' ? 'Información Adicional' : 'Additional Info'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: t.textMuted }}>{language === 'es' ? 'Parte:' : 'Part:'}</span>{' '}
                  <span style={{ fontWeight: '500' }}>{detailDefect.partNumber || detailDefect.part_number || '-'}</span>
                </div>
                <div>
                  <span style={{ color: t.textMuted }}>{language === 'es' ? 'Estación:' : 'Station:'}</span>{' '}
                  <span style={{ fontWeight: '500' }}>{detailDefect.stationName || detailDefect.station_name || '-'}</span>
                </div>
                {(detailDefect.repairTypeName || detailDefect.repair_type_name) && (
                  <div>
                    <span style={{ color: t.textMuted }}>{language === 'es' ? 'Tipo Reparación:' : 'Repair Type:'}</span>{' '}
                    <span style={{ fontWeight: '500' }}>{detailDefect.repairTypeName || detailDefect.repair_type_name}</span>
                  </div>
                )}
                {(detailDefect.releaseReasonName || detailDefect.release_reason_name) && (
                  <div>
                    <span style={{ color: t.textMuted }}>{language === 'es' ? 'Razón Liberación:' : 'Release Reason:'}</span>{' '}
                    <span style={{ fontWeight: '500' }}>{detailDefect.releaseReasonName || detailDefect.release_reason_name}</span>
                  </div>
                )}
                {(detailDefect.repairedAt || detailDefect.repaired_at) && (
                  <div>
                    <span style={{ color: t.textMuted }}>{language === 'es' ? 'Fecha Reparación:' : 'Repair Date:'}</span>{' '}
                    <span style={{ fontWeight: '500' }}>{new Date(detailDefect.repairedAt || detailDefect.repaired_at).toLocaleString('es-MX')}</span>
                  </div>
                )}
                {(detailDefect.releasedAt || detailDefect.released_at) && (
                  <div>
                    <span style={{ color: t.textMuted }}>{language === 'es' ? 'Fecha Liberación:' : 'Release Date:'}</span>{' '}
                    <span style={{ fontWeight: '500' }}>{new Date(detailDefect.releasedAt || detailDefect.released_at).toLocaleString('es-MX')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botón cerrar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDetailModalOpen(false); setDetailDefect(null); }}
                style={{
                  padding: '10px 24px',
                  backgroundColor: t.bgPanel,
                  border: `1px solid ${t.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: t.text
                }}
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectHospital;
