import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Home, Package, History, Clock, User, MapPin,
  ChevronDown, ChevronUp, Plus, CheckCircle, XCircle, AlertTriangle,
  Truck, Wrench, RotateCcw, FileText, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import unitRegistryService from '../services/unitRegistryService';
import specInspectionService from '../services/specInspectionService';

const STATUS_CONFIG = {
  REGISTERED: { label: 'Registrado', color: '#6b7280', icon: Package },
  INSPECTING: { label: 'En Inspeccion', color: '#0072CE', icon: Search },
  OK: { label: 'OK', color: '#2E7D32', icon: CheckCircle },
  DEFECTIVE: { label: 'Defectuoso', color: '#ef4444', icon: XCircle },
  IN_REPAIR: { label: 'En Reparacion', color: '#f59e0b', icon: Wrench },
  REPAIRED: { label: 'Reparado', color: '#8b5cf6', icon: Wrench },
  PENDING_REINSPECTION: { label: 'Pendiente Reinspeccion', color: '#f97316', icon: RotateCcw },
  RELEASED: { label: 'Liberado', color: '#10b981', icon: CheckCircle },
  SCRAPPED: { label: 'Scrap', color: '#dc2626', icon: XCircle },
  SHIPPED: { label: 'Enviado', color: '#0ea5e9', icon: Truck }
};

const EVENT_ICONS = {
  REGISTERED: Package,
  STATION_START: MapPin,
  STATION_COMPLETE: CheckCircle,
  SPEC_OK: CheckCircle,
  SPEC_NOK: XCircle,
  DEFECT_FOUND: AlertTriangle,
  STATUS_CHANGE: RotateCcw,
  NOTE: FileText
};

const UnitTraceability = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();

  // Local translations
  const L = {
    en: {
      title: 'Unit Traceability',
      home: 'Home',
      serialNumber: 'Serial / Entry',
      enterSerial: 'Enter serial, lot or entry (DEF-...)...',
      searching: 'Searching...',
      search: 'Search',
      unitNotFound: 'Unit not found',
      errorLoadingUnit: 'Error loading unit',
      errorAddingNote: 'Error adding note',
      lot: 'Lot',
      client: 'Client',
      part: 'Part',
      project: 'Project',
      registered: 'Registered',
      firstInspection: 'First Inspection',
      lastInspection: 'Last Inspection',
      released: 'Released',
      registeredBy: 'Registered by',
      pending: 'Pending',
      defects: 'Defects',
      inspections: 'Inspections',
      timeline: 'Timeline',
      specifications: 'Specifications',
      stations: 'Stations',
      eventHistory: 'Event History',
      addNote: 'Add Note',
      loadingHistory: 'Loading history...',
      noEventsRegistered: 'No events registered',
      shift: 'Shift',
      specInspections: 'Specification Inspections',
      noSpecInspections: 'No specification inspections registered',
      folio: 'Folio',
      date: 'Date',
      spec: 'Spec',
      result: 'Result',
      measuredValue: 'Measured Value',
      nominal: 'Nominal',
      deviation: 'Deviation',
      station: 'Station',
      inspector: 'Inspector',
      stationInspections: 'Station Inspections',
      noStationInspections: 'No station inspections registered',
      start: 'Start',
      end: 'End',
      duration: 'Duration',
      inProgress: 'In Progress',
      searchUnit: 'Search Unit',
      enterSerialToSee: 'Enter a serial, lot or entry number to see its complete traceability',
      writeNoteHere: 'Write your note here...',
      cancel: 'Cancel',
      saving: 'Saving...',
      saveNote: 'Save Note',
      // Status labels
      statusRegistered: 'Registered',
      statusInspecting: 'Inspecting',
      statusOk: 'OK',
      statusDefective: 'Defective',
      statusInRepair: 'In Repair',
      statusRepaired: 'Repaired',
      statusPendingReinspection: 'Pending Reinspection',
      statusReleased: 'Released',
      statusScrapped: 'Scrapped',
      statusShipped: 'Shipped'
    },
    es: {
      title: 'Trazabilidad de Unidades',
      home: 'Inicio',
      serialNumber: 'Serial / Entry',
      enterSerial: 'Ingrese serial, lote o entry (DEF-...)...',
      searching: 'Buscando...',
      search: 'Buscar',
      unitNotFound: 'Unidad no encontrada',
      errorLoadingUnit: 'Error al cargar unidad',
      errorAddingNote: 'Error al agregar nota',
      lot: 'Lote',
      client: 'Cliente',
      part: 'Parte',
      project: 'Proyecto',
      registered: 'Registrado',
      firstInspection: 'Primera Inspección',
      lastInspection: 'Última Inspección',
      released: 'Liberado',
      registeredBy: 'Registrado por',
      pending: 'Pendiente',
      defects: 'Defectos',
      inspections: 'Inspecciones',
      timeline: 'Timeline',
      specifications: 'Especificaciones',
      stations: 'Estaciones',
      eventHistory: 'Historial de Eventos',
      addNote: 'Agregar Nota',
      loadingHistory: 'Cargando historial...',
      noEventsRegistered: 'No hay eventos registrados',
      shift: 'Turno',
      specInspections: 'Inspecciones de Especificaciones',
      noSpecInspections: 'No hay inspecciones de specs registradas',
      folio: 'Folio',
      date: 'Fecha',
      spec: 'Spec',
      result: 'Resultado',
      measuredValue: 'Valor Medido',
      nominal: 'Nominal',
      deviation: 'Desviación',
      station: 'Estación',
      inspector: 'Inspector',
      stationInspections: 'Inspecciones por Estación',
      noStationInspections: 'No hay inspecciones de estación registradas',
      start: 'Inicio',
      end: 'Fin',
      duration: 'Duración',
      inProgress: 'En curso',
      searchUnit: 'Buscar Unidad',
      enterSerialToSee: 'Ingrese serial, lote o entry para ver su trazabilidad completa',
      writeNoteHere: 'Escriba su nota aquí...',
      cancel: 'Cancelar',
      saving: 'Guardando...',
      saveNote: 'Guardar Nota',
      // Status labels
      statusRegistered: 'Registrado',
      statusInspecting: 'En Inspección',
      statusOk: 'OK',
      statusDefective: 'Defectuoso',
      statusInRepair: 'En Reparación',
      statusRepaired: 'Reparado',
      statusPendingReinspection: 'Pendiente Reinspección',
      statusReleased: 'Liberado',
      statusScrapped: 'Scrap',
      statusShipped: 'Enviado'
    }
  }[language] || {};

  // Status config with translated labels
  const STATUS_LABELS = {
    REGISTERED: L.statusRegistered,
    INSPECTING: L.statusInspecting,
    OK: L.statusOk,
    DEFECTIVE: L.statusDefective,
    IN_REPAIR: L.statusInRepair,
    REPAIRED: L.statusRepaired,
    PENDING_REINSPECTION: L.statusPendingReinspection,
    RELEASED: L.statusReleased,
    SCRAPPED: L.statusScrapped,
    SHIPPED: L.statusShipped
  };

  // Search state
  const [searchSerial, setSearchSerial] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Unit data
  const [unit, setUnit] = useState(null);
  const [history, setHistory] = useState([]);
  const [specInspections, setSpecInspections] = useState([]);
  const [stationInspections, setStationInspections] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('timeline');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Check for unitId in URL params on mount
  useEffect(() => {
    const unitId = searchParams.get('unitId');
    const serial = searchParams.get('serial');
    if (unitId) {
      loadUnitById(unitId);
    } else if (serial) {
      setSearchSerial(serial);
      handleSearch(serial);
    }
  }, [searchParams]);

  const loadUnitById = async (id) => {
    try {
      setSearching(true);
      setSearchError('');
      const unitData = await unitRegistryService.getUnit(id);
      setUnit(unitData);
      await loadUnitDetails(id);
    } catch (err) {
      setSearchError(err.message || L.errorLoadingUnit);
      setUnit(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (serialOverride = null) => {
    const serial = serialOverride || searchSerial;
    if (!serial.trim()) return;

    try {
      setSearching(true);
      setSearchError('');
      const unitData = await unitRegistryService.getBySerial(serial.trim());
      setUnit(unitData);
      await loadUnitDetails(unitData.id);
    } catch (err) {
      setSearchError(L.unitNotFound);
      setUnit(null);
      setHistory([]);
      setSpecInspections([]);
      setStationInspections([]);
    } finally {
      setSearching(false);
    }
  };

  const loadUnitDetails = async (unitId) => {
    try {
      setLoadingHistory(true);
      const [historyData, specData, stationData] = await Promise.all([
        unitRegistryService.getHistory(unitId),
        specInspectionService.getEntries({ unitId, limit: 100 }),
        specInspectionService.getStationInspections(unitId)
      ]);
      setHistory(historyData);
      setSpecInspections(specData.entries || []);
      setStationInspections(stationData || []);
    } catch (err) {
      console.error('Error loading unit details:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !unit) return;

    try {
      setSavingNote(true);
      await unitRegistryService.addNote(unit.id, newNote.trim());
      setNewNote('');
      setShowAddNote(false);
      // Reload history
      const historyData = await unitRegistryService.getHistory(unit.id);
      setHistory(historyData);
    } catch (err) {
      alert(L.errorAddingNote + ': ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const getStatusConfig = (status) => {
    const config = STATUS_CONFIG[status] || { label: status, color: '#6b7280', icon: Package };
    return { ...config, label: STATUS_LABELS[status] || config.label };
  };

  const getEventIcon = (eventType) => {
    return EVENT_ICONS[eventType] || FileText;
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: t.text,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    btn: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    searchCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid ${t.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    searchRow: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-end'
    },
    inputGroup: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    input: {
      padding: '12px 16px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: t.bgCard,
      color: t.text,
      outline: 'none'
    },
    errorText: {
      color: '#ef4444',
      fontSize: '14px',
      marginTop: '12px'
    },
    unitCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid ${t.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    unitHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px'
    },
    unitSerial: {
      fontSize: '28px',
      fontWeight: '700',
      color: t.text,
      margin: 0
    },
    statusBadge: {
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    infoLabel: {
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    infoValue: {
      fontSize: '15px',
      fontWeight: '500',
      color: t.text
    },
    countersRow: {
      display: 'flex',
      gap: '16px',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: `1px solid ${t.border}`
    },
    counter: {
      padding: '12px 20px',
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '100px'
    },
    counterValue: {
      fontSize: '24px',
      fontWeight: '700'
    },
    counterLabel: {
      fontSize: '12px',
      fontWeight: '500',
      marginTop: '4px'
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px'
    },
    tab: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    },
    tabActive: {
      backgroundColor: '#0072CE',
      color: 'white'
    },
    tabInactive: {
      backgroundColor: t.bgPanel,
      color: t.textMuted
    },
    timelineCard: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden'
    },
    timelineHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    timelineTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    timeline: {
      padding: '20px'
    },
    timelineItem: {
      display: 'flex',
      gap: '16px',
      paddingBottom: '20px',
      position: 'relative'
    },
    timelineLine: {
      position: 'absolute',
      left: '19px',
      top: '40px',
      bottom: '0',
      width: '2px',
      backgroundColor: t.border
    },
    timelineIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      zIndex: 1
    },
    timelineContent: {
      flex: 1
    },
    timelineEventType: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    timelineDescription: {
      fontSize: '14px',
      color: t.text,
      lineHeight: 1.5
    },
    timelineMeta: {
      fontSize: '12px',
      color: t.textMuted,
      marginTop: '8px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    },
    specsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '12px 16px',
      borderBottom: `2px solid ${t.border}`,
      backgroundColor: t.bgPanel,
      color: t.text,
      fontWeight: '600',
      fontSize: '11px',
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px 16px',
      borderBottom: `1px solid ${t.border}`,
      color: t.text
    },
    resultBadge: {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    noteModal: {
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
    noteModalContent: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '500px',
      margin: '20px'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: t.bgCard,
      color: t.text,
      resize: 'vertical',
      minHeight: '100px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    },
    modalButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: t.textMuted
    }
  };

  const getResultBadgeStyle = (result) => {
    const colors = {
      OK: { bg: '#dcfce7', text: '#166534' },
      NOK: { bg: '#fee2e2', text: '#991b1b' },
      CONDITIONAL: { bg: '#fef3c7', text: '#92400e' },
      NA: { bg: '#f3f4f6', text: '#6b7280' }
    };
    const c = colors[result] || colors.NA;
    return { backgroundColor: c.bg, color: c.text };
  };

  const getEventColor = (eventType) => {
    const colors = {
      REGISTERED: '#6b7280',
      STATION_START: '#0072CE',
      STATION_COMPLETE: '#2E7D32',
      SPEC_OK: '#2E7D32',
      SPEC_NOK: '#ef4444',
      DEFECT_FOUND: '#f59e0b',
      STATUS_CHANGE: '#8b5cf6',
      NOTE: '#64748b'
    };
    return colors[eventType] || '#6b7280';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Package size={28} color="#0072CE" />
          {L.title}
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: '#6b7280', color: 'white' }}
            onClick={() => navigate('/')}
          >
            <Home size={16} />
            {L.home}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchCard}>
        <div style={styles.searchRow}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{L.serialNumber}</label>
            <input
              type="text"
              style={styles.input}
              placeholder={L.enterSerial}
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            style={{
              ...styles.btn,
              backgroundColor: '#0072CE',
              color: 'white',
              padding: '12px 24px'
            }}
            onClick={() => handleSearch()}
            disabled={searching}
          >
            <Search size={18} />
            {searching ? L.searching : L.search}
          </button>
        </div>
        {searchError && <p style={styles.errorText}>{searchError}</p>}
      </div>

      {/* Unit Info Card */}
      {unit && (
        <div style={styles.unitCard}>
          <div style={styles.unitHeader}>
            <div>
              <h2 style={styles.unitSerial}>{unit.serialNumber}</h2>
              {unit.lotNumber && (
                <p style={{ color: t.textMuted, margin: '4px 0 0', fontSize: '14px' }}>
                  {L.lot}: {unit.lotNumber}
                </p>
              )}
            </div>
            <div style={{
              ...styles.statusBadge,
              backgroundColor: getStatusConfig(unit.currentStatus).color + '20',
              color: getStatusConfig(unit.currentStatus).color
            }}>
              {React.createElement(getStatusConfig(unit.currentStatus).icon, { size: 18 })}
              {getStatusConfig(unit.currentStatus).label}
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.client}</span>
              <span style={styles.infoValue}>{unit.clientName || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.part}</span>
              <span style={styles.infoValue}>
                {unit.partNumber ? `${unit.partNumber} - ${unit.partName}` : '-'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.project}</span>
              <span style={styles.infoValue}>
                {unit.projectNumber ? `${unit.projectNumber} - ${unit.projectName}` : '-'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.registered}</span>
              <span style={styles.infoValue}>{formatDateShort(unit.registeredAt)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.firstInspection}</span>
              <span style={styles.infoValue}>{formatDateShort(unit.firstInspectionAt) || L.pending}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.lastInspection}</span>
              <span style={styles.infoValue}>{formatDateShort(unit.lastInspectionAt) || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.released}</span>
              <span style={styles.infoValue}>{formatDateShort(unit.releasedAt) || L.pending}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{L.registeredBy}</span>
              <span style={styles.infoValue}>{unit.createdByName || '-'}</span>
            </div>
          </div>

          {/* Counters */}
          <div style={styles.countersRow}>
            <div style={{ ...styles.counter, backgroundColor: '#dcfce7' }}>
              <div style={{ ...styles.counterValue, color: '#166534' }}>{unit.specsOk || 0}</div>
              <div style={{ ...styles.counterLabel, color: '#166534' }}>Specs OK</div>
            </div>
            <div style={{ ...styles.counter, backgroundColor: '#fee2e2' }}>
              <div style={{ ...styles.counterValue, color: '#991b1b' }}>{unit.specsNok || 0}</div>
              <div style={{ ...styles.counterLabel, color: '#991b1b' }}>Specs NOK</div>
            </div>
            <div style={{ ...styles.counter, backgroundColor: '#fef3c7' }}>
              <div style={{ ...styles.counterValue, color: '#92400e' }}>{unit.totalDefects || 0}</div>
              <div style={{ ...styles.counterLabel, color: '#92400e' }}>{L.defects}</div>
            </div>
            <div style={{ ...styles.counter, backgroundColor: '#e0e7ff' }}>
              <div style={{ ...styles.counterValue, color: '#3730a3' }}>{unit.totalInspections || 0}</div>
              <div style={{ ...styles.counterLabel, color: '#3730a3' }}>{L.inspections}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Content */}
      {unit && (
        <>
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'timeline' ? styles.tabActive : styles.tabInactive)
              }}
              onClick={() => setActiveTab('timeline')}
            >
              <History size={16} />
              {L.timeline} ({history.length})
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'specs' ? styles.tabActive : styles.tabInactive)
              }}
              onClick={() => setActiveTab('specs')}
            >
              <FileText size={16} />
              {L.specifications} ({specInspections.length})
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'stations' ? styles.tabActive : styles.tabInactive)
              }}
              onClick={() => setActiveTab('stations')}
            >
              <MapPin size={16} />
              {L.stations} ({stationInspections.length})
            </button>
          </div>

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div style={styles.timelineCard}>
              <div style={styles.timelineHeader}>
                <h3 style={styles.timelineTitle}>{L.eventHistory}</h3>
                <button
                  style={{ ...styles.btn, backgroundColor: '#0072CE', color: 'white' }}
                  onClick={() => setShowAddNote(true)}
                >
                  <Plus size={16} />
                  {L.addNote}
                </button>
              </div>

              {loadingHistory ? (
                <div style={styles.emptyState}>{L.loadingHistory}</div>
              ) : history.length === 0 ? (
                <div style={styles.emptyState}>{L.noEventsRegistered}</div>
              ) : (
                <div style={styles.timeline}>
                  {history.map((event, index) => {
                    const EventIcon = getEventIcon(event.eventType);
                    const eventColor = getEventColor(event.eventType);
                    const isLast = index === history.length - 1;

                    return (
                      <div key={event.id} style={styles.timelineItem}>
                        {!isLast && <div style={styles.timelineLine} />}
                        <div style={{
                          ...styles.timelineIcon,
                          backgroundColor: eventColor + '20',
                          color: eventColor
                        }}>
                          <EventIcon size={20} />
                        </div>
                        <div style={styles.timelineContent}>
                          <div style={{ ...styles.timelineEventType, color: eventColor }}>
                            {event.eventType.replace(/_/g, ' ')}
                          </div>
                          <div style={styles.timelineDescription}>
                            {event.description}
                          </div>
                          <div style={styles.timelineMeta}>
                            <span><Clock size={12} style={{ marginRight: 4 }} />{formatDate(event.eventAt)}</span>
                            {event.performedByName && (
                              <span><User size={12} style={{ marginRight: 4 }} />{event.performedByName}</span>
                            )}
                            {event.stationName && (
                              <span><MapPin size={12} style={{ marginRight: 4 }} />{event.stationName}</span>
                            )}
                            {event.shiftName && (
                              <span>{L.shift}: {event.shiftName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Specs Tab */}
          {activeTab === 'specs' && (
            <div style={styles.timelineCard}>
              <div style={styles.timelineHeader}>
                <h3 style={styles.timelineTitle}>{L.specInspections}</h3>
              </div>

              {specInspections.length === 0 ? (
                <div style={styles.emptyState}>{L.noSpecInspections}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.specsTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>{L.folio}</th>
                        <th style={styles.th}>{L.date}</th>
                        <th style={styles.th}>{L.spec}</th>
                        <th style={styles.th}>{L.result}</th>
                        <th style={styles.th}>{L.measuredValue}</th>
                        <th style={styles.th}>{L.nominal}</th>
                        <th style={styles.th}>{L.deviation}</th>
                        <th style={styles.th}>{L.station}</th>
                        <th style={styles.th}>{L.inspector}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specInspections.map(spec => (
                        <tr key={spec.id}>
                          <td style={{ ...styles.td, fontWeight: '600', color: '#0072CE' }}>
                            {spec.entryNumber}
                          </td>
                          <td style={styles.td}>{formatDateShort(spec.inspectionDate || spec.createdAt)}</td>
                          <td style={styles.td}>
                            {spec.specNumber} - {spec.specName}
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.resultBadge, ...getResultBadgeStyle(spec.result) }}>
                              {spec.result}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {spec.measuredValue !== null ? `${spec.measuredValue} ${spec.unitSymbol || ''}` : '-'}
                          </td>
                          <td style={styles.td}>
                            {spec.nominalValue !== null ? spec.nominalValue : '-'}
                          </td>
                          <td style={{
                            ...styles.td,
                            color: spec.withinTolerance === false ? '#ef4444' : 'inherit',
                            fontWeight: spec.withinTolerance === false ? '600' : 'normal'
                          }}>
                            {spec.deviation !== null ? spec.deviation.toFixed(3) : '-'}
                          </td>
                          <td style={styles.td}>{spec.stationName || '-'}</td>
                          <td style={styles.td}>{spec.inspectorName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Stations Tab */}
          {activeTab === 'stations' && (
            <div style={styles.timelineCard}>
              <div style={styles.timelineHeader}>
                <h3 style={styles.timelineTitle}>{L.stationInspections}</h3>
              </div>

              {stationInspections.length === 0 ? (
                <div style={styles.emptyState}>{L.noStationInspections}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.specsTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>{L.station}</th>
                        <th style={styles.th}>{L.shift}</th>
                        <th style={styles.th}>{L.start}</th>
                        <th style={styles.th}>{L.end}</th>
                        <th style={styles.th}>{L.duration}</th>
                        <th style={styles.th}>Specs OK</th>
                        <th style={styles.th}>Specs NOK</th>
                        <th style={styles.th}>{L.result}</th>
                        <th style={styles.th}>{L.inspector}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationInspections.map(si => (
                        <tr key={si.id}>
                          <td style={{ ...styles.td, fontWeight: '600' }}>
                            {si.stationCode} - {si.stationName}
                          </td>
                          <td style={styles.td}>{si.shiftName || '-'}</td>
                          <td style={styles.td}>{formatDate(si.startedAt)}</td>
                          <td style={styles.td}>{si.completedAt ? formatDate(si.completedAt) : L.inProgress}</td>
                          <td style={styles.td}>
                            {si.durationMinutes ? `${si.durationMinutes} min` : '-'}
                          </td>
                          <td style={{ ...styles.td, color: '#166534', fontWeight: '600' }}>
                            {si.specsOk || 0}
                          </td>
                          <td style={{ ...styles.td, color: '#991b1b', fontWeight: '600' }}>
                            {si.specsNok || 0}
                          </td>
                          <td style={styles.td}>
                            {si.overallResult && (
                              <span style={{ ...styles.resultBadge, ...getResultBadgeStyle(si.overallResult) }}>
                                {si.overallResult}
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>{si.inspectorName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state when no unit */}
      {!unit && !searching && (
        <div style={{ ...styles.unitCard, textAlign: 'center', padding: '80px 20px' }}>
          <Package size={64} color={t.textMuted} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: t.textMuted, margin: '0 0 8px' }}>{L.searchUnit}</h3>
          <p style={{ color: t.textDim, margin: 0 }}>
            {L.enterSerialToSee}
          </p>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNote && (
        <div style={styles.noteModal} onClick={() => setShowAddNote(false)}>
          <div style={styles.noteModalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: t.text }}>{L.addNote}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}
                onClick={() => setShowAddNote(false)}
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              style={styles.textarea}
              placeholder={L.writeNoteHere}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              autoFocus
            />
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.btn, backgroundColor: t.bgPanel, color: t.text }}
                onClick={() => setShowAddNote(false)}
              >
                {L.cancel}
              </button>
              <button
                style={{ ...styles.btn, backgroundColor: '#0072CE', color: 'white' }}
                onClick={handleAddNote}
                disabled={savingNote || !newNote.trim()}
              >
                {savingNote ? L.saving : L.saveNote}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitTraceability;
