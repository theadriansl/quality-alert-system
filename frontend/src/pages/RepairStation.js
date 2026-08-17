import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { checkMyHospitalPermissions } from '../services/hospitalRolesService';
import * as repairService from '../services/repairService';
import { Home, Search, Clock, CheckCircle, XCircle, Wrench, Eye, ChevronDown, ChevronLeft, ChevronRight, X, MapPin, Download, AlertTriangle, Trash2 } from 'lucide-react';

/**
 * RepairStation - Simplified repair/release interface for operators
 * 3-Column Layout: Parts List | Defects | Detail
 */

const API_URL = 'http://localhost:5000';

const RepairStation = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const serialInputRef = useRef(null);
  const defectsListRef = useRef(null);
  const partsListRef = useRef(null);

  // ============================================================================
  // STATE - Location & Shift (persisted in sessionStorage)
  // ============================================================================
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [locationSelectorOpen, setLocationSelectorOpen] = useState(false);
  const [stationType, setStationType] = useState('REPAIR');

  // ============================================================================
  // STATE - Parts List (left column)
  // ============================================================================
  const [allPendingDefects, setAllPendingDefects] = useState([]);
  const [partsWithDefects, setPartsWithDefects] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [partsLoading, setPartsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLimitedView, setIsLimitedView] = useState(true);  // true = showing limited
  const [currentLimit, setCurrentLimit] = useState(100);  // 100, 200, 300, 400, 500

  // ============================================================================
  // STATE - Defects for selected part (center column)
  // ============================================================================
  const [partDefects, setPartDefects] = useState([]);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [defectDetail, setDefectDetail] = useState(null); // Full detail with attachments
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ============================================================================
  // STATE - Action (Repair/Release)
  // ============================================================================
  const [actionMinutes, setActionMinutes] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [actionSuccess, setActionSuccess] = useState({});
  const [actionError, setActionError] = useState(null);

  // ============================================================================
  // STATE - Lightbox for photos
  // ============================================================================
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ============================================================================
  // STATE - MRB Warning (check-can-dispose)
  // ============================================================================
  const [mrbWarningOpen, setMrbWarningOpen] = useState(false);
  const [mrbWarningDefect, setMrbWarningDefect] = useState(null);
  const [mrbPendingCampaigns, setMrbPendingCampaigns] = useState([]);

  // ============================================================================
  // STATE - Permissions & Loading
  // ============================================================================
  const [permissions, setPermissions] = useState({ canRepair: false, canRelease: false, canScrap: false });
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // KEYBOARD NAVIGATION STATE
  // ============================================================================
  const [focusedColumn, setFocusedColumn] = useState(0); // 0=parts, 1=defects, 2=detail
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedDefectIndex, setSelectedDefectIndex] = useState(0);

  // ============================================================================
  // INIT - Load locations, shifts, permissions
  // ============================================================================
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        };

        const [shiftsRes, permsRes, locationsData] = await Promise.all([
          fetch(`${API_URL}/inspection-catalogs/shifts`, { headers }),
          checkMyHospitalPermissions(),
          repairService.getLocationCodes()
        ]);

        const shiftsData = await shiftsRes.json();
        const allLocations = locationsData.locations || locationsData || [];

        setLocations(allLocations);
        setShifts(shiftsData.items || []);
        setPermissions({
          canRepair: permsRes.canRepair || false,
          canRelease: permsRes.canRelease || false,
          canScrap: permsRes.canScrap || false
        });

        // Auto-detect current shift
        const currentShift = detectCurrentShift(shiftsData.items || []);
        if (currentShift) setSelectedShift(currentShift);

        // Restore saved location
        const savedLocationId = sessionStorage.getItem('repairStation_locationId');
        const savedStationType = sessionStorage.getItem('repairStation_stationType');

        if (savedLocationId) {
          const savedLocation = allLocations.find(l => l.id === parseInt(savedLocationId));
          if (savedLocation) {
            setSelectedLocation(savedLocation);
            setStationType(savedStationType || 'REPAIR');
          } else {
            setLocationSelectorOpen(true);
          }
        } else {
          setLocationSelectorOpen(true);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Detect current shift
  const detectCurrentShift = (shiftList) => {
    if (!shiftList?.length) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const shift of shiftList) {
      if (shift.startTime && shift.endTime) {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [endH, endM] = shift.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (startMinutes < endMinutes) {
          if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return shift;
        } else {
          if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return shift;
        }
      }
    }
    return shiftList[0];
  };

  // Save location to sessionStorage
  useEffect(() => {
    if (selectedLocation?.id) {
      sessionStorage.setItem('repairStation_locationId', selectedLocation.id.toString());
      sessionStorage.setItem('repairStation_stationType', stationType);
    }
  }, [selectedLocation, stationType]);

  // ============================================================================
  // LOAD PENDING PARTS - When location is selected (loads ALL active defects)
  // ============================================================================
  useEffect(() => {
    if (selectedLocation && !locationSelectorOpen) {
      loadPendingParts();
    }
  }, [selectedLocation, locationSelectorOpen]);

  const loadPendingParts = async (search = '', limit = currentLimit) => {
    setPartsLoading(true);
    try {
      // Usar endpoint optimizado que devuelve seriales con contadores ya calculados
      // Limitar por defecto, búsqueda sin límite
      const hasSearch = search && search.trim().length > 0;
      const result = await repairService.getActiveSerials({
        limit: hasSearch ? 0 : limit,  // Sin límite si hay búsqueda
        search: hasSearch ? search : undefined
      });

      setIsLimitedView(!hasSearch);  // Si no hay búsqueda, estamos viendo limitado

      if (result.success && result.serials) {
        // El endpoint ya devuelve los datos agrupados con contadores
        const partsArray = result.serials.map(s => ({
          serial: s.serial,
          partNumber: s.partNumber,
          partName: s.partName,
          latestDate: new Date(s.latestDate),
          pendingCount: s.pendingCount,
          repairedCount: s.repairedCount,
          releasedCount: s.releasedCount,
          quarantineCount: s.quarantineCount,
          totalCount: s.totalCount,
          defects: s.defects || []
        }));

        setPartsWithDefects(partsArray);

        // Flatten defects for allPendingDefects
        const allDefects = partsArray.flatMap(p => p.defects);
        setAllPendingDefects(allDefects);

        // Auto-select first part if none selected
        if (partsArray.length > 0 && !selectedPart) {
          selectPart(partsArray[0]);
        }
      }
    } catch (err) {
      console.error('Error loading parts:', err);
    } finally {
      setPartsLoading(false);
    }
  };

  // ============================================================================
  // SELECT PART - Load ALL defects for that serial (including released)
  // ============================================================================
  const selectPart = async (part) => {
    setSelectedPart(part);
    setPartDefects(part.defects || []);
    setSelectedDefect(null);
    setActionSuccess({});
    setActionMinutes({});
    setActionError(null);

    // Load ALL defects for this serial (trazabilidad completa)
    try {
      const result = await repairService.getDefectsBySerial(part.serial, { includeHistory: true });
      if (result.success && result.defects?.length > 0) {
        setPartDefects(result.defects);
        // Update the part in partsWithDefects to show correct counters
        setPartsWithDefects(prev => prev.map(p =>
          p.serial === part.serial ? { ...p, defects: result.defects } : p
        ));
        setSelectedPart(prev => ({ ...prev, defects: result.defects }));
      }
    } catch (err) {
      console.error('Error loading full defect history:', err);
    }
  };

  // ============================================================================
  // SEARCH / FILTER
  // ============================================================================
  const filteredParts = partsWithDefects.filter(p => {
    if (!searchFilter) return true;
    const search = searchFilter.toUpperCase();
    return (
      p.serial?.toUpperCase().includes(search) ||
      p.partNumber?.toUpperCase().includes(search) ||
      p.partName?.toUpperCase().includes(search)
    );
  });

  // ============================================================================
  // AUTO-SCROLL - Keep selected items visible in their containers
  // ============================================================================
  // Scroll para lista de seriales
  useEffect(() => {
    if (partsListRef.current && filteredParts.length > 0) {
      const element = document.getElementById(`part-item-${selectedPartIndex}`);
      const container = partsListRef.current;
      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        if (elementRect.top < containerRect.top + 10) {
          container.scrollTop -= (containerRect.top - elementRect.top) + 20;
        } else if (elementRect.bottom > containerRect.bottom - 10) {
          container.scrollTop += (elementRect.bottom - containerRect.bottom) + 20;
        }
      }
    }
  }, [selectedPartIndex, filteredParts.length]);

  // Scroll para lista de defectos
  useEffect(() => {
    if (defectsListRef.current && partDefects.length > 0) {
      const element = document.getElementById(`defect-item-${selectedDefectIndex}`);
      const container = defectsListRef.current;
      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        if (elementRect.top < containerRect.top + 10) {
          container.scrollTop -= (containerRect.top - elementRect.top) + 20;
        } else if (elementRect.bottom > containerRect.bottom - 10) {
          container.scrollTop += (elementRect.bottom - containerRect.bottom) + 20;
        }
      }
    }
  }, [selectedDefectIndex, partDefects.length]);

  const handleManualSearch = async () => {
    if (!searchFilter.trim()) {
      // Si se borró la búsqueda, recargar los últimos 100
      loadPendingParts('');
      return;
    }
    // Buscar en backend sin límite
    await loadPendingParts(searchFilter.trim());
  };

  // Limpiar búsqueda y recargar
  const clearSearch = () => {
    setSearchFilter('');
    setCurrentLimit(100);
    loadPendingParts('', 100);
  };

  // Cargar más (incrementar límite de 100 en 100 hasta 500)
  const loadMore = () => {
    if (currentLimit >= 500) return;
    const newLimit = Math.min(currentLimit + 100, 500);
    setCurrentLimit(newLimit);
    loadPendingParts('', newLimit);
  };

  // ============================================================================
  // ACTIONS - Repair / Release
  // ============================================================================
  const handleRepair = async (defect, skipMrbCheck = false) => {
    // Verificar MRB antes de completar reparación
    if (!skipMrbCheck) {
      const canProceed = await checkMrbBeforeScrap(defect);
      if (!canProceed) return;
    }
    const defectId = defect.id || defect.defectId;
    const minutes = parseInt(actionMinutes[defectId] || '1', 10);
    setActionLoading(prev => ({ ...prev, [defectId]: true }));
    setActionError(null);
    try {
      const result = await repairService.repairInline(defectId, {
        repairTimeMinutes: minutes,
        repairLocationId: selectedLocation?.id,
        notes: ''
      });
      if (result.success) {
        setActionSuccess(prev => ({ ...prev, [defectId]: 'repaired' }));
        setTimeout(() => loadPendingParts(), 800);
      } else {
        setActionError(result.error || 'Error');
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [defectId]: false }));
    }
  };

  const handleRelease = async (defect, skipMrbCheck = false) => {
    // Verificar MRB antes de liberar
    if (!skipMrbCheck) {
      const canProceed = await checkMrbBeforeScrap(defect);
      if (!canProceed) return;
    }
    const defectId = defect.id || defect.defectId;
    const minutes = parseInt(actionMinutes[defectId] || '1', 10);
    setActionLoading(prev => ({ ...prev, [defectId]: true }));
    setActionError(null);
    try {
      const result = await repairService.releaseInline(defectId, {
        releaseTimeMinutes: minutes,
        releaseLocationId: selectedLocation?.id,
        notes: ''
      });
      if (result.success) {
        setActionSuccess(prev => ({ ...prev, [defectId]: 'released' }));
        setTimeout(() => loadPendingParts(), 800);
      } else {
        setActionError(result.error || 'Error');
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [defectId]: false }));
    }
  };

  // ============================================================================
  // CHECK MRB BEFORE SCRAP - Verify no pending campaigns
  // ============================================================================
  const checkMrbBeforeScrap = async (defect) => {
    try {
      const serial = defect.serialNumber || defect.serial_number;
      const result = await repairService.checkCanDispose(serial, defect.id);
      if (result.success && !result.canDispose) {
        setMrbPendingCampaigns(result.pendingCampaigns || []);
        setMrbWarningDefect(defect);
        setMrbWarningOpen(true);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking MRB:', err);
      return true; // Si falla, permitir continuar
    }
  };

  const handleScrap = async (defect, skipMrbCheck = false) => {
    // Solo verificar MRB si no se hizo antes
    if (!skipMrbCheck) {
      const canProceed = await checkMrbBeforeScrap(defect);
      if (!canProceed) return;
    }

    const defectId = defect.id || defect.defectId;
    setActionLoading(prev => ({ ...prev, [defectId]: true }));
    try {
      const result = await repairService.scrapDefect(defectId, '');
      if (result.success) {
        setActionSuccess(prev => ({ ...prev, [defectId]: 'scrap' }));
        setTimeout(() => loadPendingParts(), 800);
      } else {
        setActionError(result.error || 'Error');
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [defectId]: false }));
    }
  };

  // ============================================================================
  // LOAD DEFECT DETAIL - When defect is selected
  // ============================================================================
  const loadDefectDetail = async (defect) => {
    setSelectedDefect(defect);
    setDefectDetail(defect); // Start with what we have
    setLoadingDetail(true);

    try {
      const defectId = defect.id || defect.defectId;

      // Load attachments
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      };
      const attachRes = await fetch(`${API_URL}/defects-v2/entries/${defectId}/attachments`, { headers });
      const attachData = await attachRes.json();

      if (attachData.success && attachData.attachments?.length > 0) {
        // Include all attachments (photos will show as images, others as file icons)
        setDefectDetail(prev => ({ ...prev, photos: attachData.attachments }));
      }
    } catch (err) {
      console.error('Error loading defect detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ============================================================================
  // KEYBOARD NAVIGATION EFFECT
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedColumn(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedColumn(prev => Math.min(2, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (focusedColumn === 0 && filteredParts.length > 0) {
          const newIndex = Math.max(0, selectedPartIndex - 1);
          setSelectedPartIndex(newIndex);
          if (filteredParts[newIndex]) selectPart(filteredParts[newIndex]);
        } else if (focusedColumn === 1 && partDefects.length > 0) {
          const newIndex = Math.max(0, selectedDefectIndex - 1);
          setSelectedDefectIndex(newIndex);
          if (partDefects[newIndex]) loadDefectDetail(partDefects[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (focusedColumn === 0 && filteredParts.length > 0) {
          const newIndex = Math.min(filteredParts.length - 1, selectedPartIndex + 1);
          setSelectedPartIndex(newIndex);
          if (filteredParts[newIndex]) selectPart(filteredParts[newIndex]);
        } else if (focusedColumn === 1 && partDefects.length > 0) {
          const newIndex = Math.min(partDefects.length - 1, selectedDefectIndex + 1);
          setSelectedDefectIndex(newIndex);
          if (partDefects[newIndex]) loadDefectDetail(partDefects[newIndex]);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedColumn === 0 && filteredParts[selectedPartIndex]) {
          selectPart(filteredParts[selectedPartIndex]);
          setFocusedColumn(1);
          setSelectedDefectIndex(0);
        } else if (focusedColumn === 1 && partDefects[selectedDefectIndex]) {
          loadDefectDetail(partDefects[selectedDefectIndex]);
          setFocusedColumn(2);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedColumn, selectedPartIndex, selectedDefectIndex, filteredParts, partDefects]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxPhoto) return;

    const handleLightboxKeys = (e) => {
      if (e.key === 'Escape') {
        setLightboxPhoto(null);
      } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        const newIndex = lightboxIndex - 1;
        const photo = defectDetail.photos[newIndex];
        const photoUrl = photo.filename
          ? `${API_URL}/uploads/defect-attachments/${photo.filename}`
          : `${API_URL}/uploads/${photo.filePath}`;
        setLightboxPhoto({ ...photo, url: photoUrl });
        setLightboxIndex(newIndex);
      } else if (e.key === 'ArrowRight' && lightboxIndex < (defectDetail?.photos?.length || 0) - 1) {
        const newIndex = lightboxIndex + 1;
        const photo = defectDetail.photos[newIndex];
        const photoUrl = photo.filename
          ? `${API_URL}/uploads/defect-attachments/${photo.filename}`
          : `${API_URL}/uploads/${photo.filePath}`;
        setLightboxPhoto({ ...photo, url: photoUrl });
        setLightboxIndex(newIndex);
      }
    };

    window.addEventListener('keydown', handleLightboxKeys);
    return () => window.removeEventListener('keydown', handleLightboxKeys);
  }, [lightboxPhoto, lightboxIndex, defectDetail?.photos]);

  // ============================================================================
  // HELPERS
  // ============================================================================
  const getStatusInfo = (status) => {
    const map = {
      'OPEN': { label: language === 'es' ? 'Pendiente' : 'Pending', color: '#ef4444', bg: '#fef2f2', icon: '🔴' },
      'IN_REPAIR': { label: language === 'es' ? 'En Reparación' : 'In Repair', color: '#f59e0b', bg: '#fffbeb', icon: '🟡' },
      'REPAIRED': { label: language === 'es' ? 'Reparado' : 'Repaired', color: '#3b82f6', bg: '#eff6ff', icon: '🔵' },
      'RELEASED': { label: language === 'es' ? 'Liberado' : 'Released', color: '#22c55e', bg: '#f0fdf4', icon: '🟢' },
      'CLOSED': { label: language === 'es' ? 'Liberado' : 'Released', color: '#22c55e', bg: '#f0fdf4', icon: '🟢' },
      'QUARANTINE': { label: 'Cuarentena', color: '#6b7280', bg: '#f3f4f6', icon: '⚪' },
      'SCRAPPED': { label: 'Scrap', color: '#1f2937', bg: '#e5e7eb', icon: '⚫' }
    };
    return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '⚪' };
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const canRepairDefect = (defect) => {
    const status = defect.repairStatus || defect.repair_status || defect.status;
    return permissions.canRepair && ['OPEN', 'IN_REPAIR'].includes(status);
  };

  const canReleaseDefect = (defect) => {
    const status = defect.repairStatus || defect.repair_status || defect.status;
    return permissions.canRelease && ['REPAIRED', 'IN_VALIDATION'].includes(status);
  };

  // ============================================================================
  // RENDER - Location Selector Modal
  // ============================================================================
  const renderLocationSelector = () => {
    if (!locationSelectorOpen) return null;

    const repairLocations = locations.filter(l =>
      l.type === 'REPAIR' || l.locationType === 'REPAIR' ||
      (l.name && l.name.toLowerCase().includes('mesa'))
    );
    const releaseLocations = locations.filter(l =>
      l.type === 'RELEASE' || l.locationType === 'RELEASE' ||
      (l.name && (l.name.toLowerCase().includes('release') || l.name.toLowerCase().includes('calidad')))
    );
    const currentLocations = stationType === 'REPAIR' ? repairLocations : releaseLocations;

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10000
      }}>
        <div style={{
          backgroundColor: t.bgCard, borderRadius: '16px', padding: '32px',
          width: '90%', maxWidth: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: t.text }}>
            {language === 'es' ? 'Selecciona tu Ubicación' : 'Select Your Location'}
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: t.textMuted }}>
            {language === 'es' ? 'Se mantendrá durante tu turno' : 'Will persist for your shift'}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setStationType('REPAIR')}
              style={{
                flex: 1, padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px',
                backgroundColor: stationType === 'REPAIR' ? t.accent : t.bgPanel,
                color: stationType === 'REPAIR' ? 'white' : t.text
              }}
            >
              🔧 {language === 'es' ? 'Reparación' : 'Repair'}
            </button>
            <button
              onClick={() => setStationType('RELEASE')}
              style={{
                flex: 1, padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px',
                backgroundColor: stationType === 'RELEASE' ? '#22c55e' : t.bgPanel,
                color: stationType === 'RELEASE' ? 'white' : t.text
              }}
            >
              ✅ {language === 'es' ? 'Liberación' : 'Release'}
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {currentLocations.length === 0 ? (
              <p style={{ textAlign: 'center', color: t.textMuted, padding: '20px' }}>
                {language === 'es' ? 'No hay ubicaciones configuradas' : 'No locations configured'}
              </p>
            ) : (
              currentLocations.map(location => (
                <button
                  key={location.id}
                  onClick={() => {
                    setSelectedLocation(location);
                    setLocationSelectorOpen(false);
                  }}
                  style={{
                    width: '100%', padding: '16px', marginBottom: '8px',
                    backgroundColor: selectedLocation?.id === location.id ? (t.accent + '15') : t.bgPanel,
                    border: selectedLocation?.id === location.id ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '15px', color: t.text }}>
                    {stationType === 'REPAIR' ? '🔧' : '✅'} {location.name}
                  </div>
                  {location.code && (
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>{location.code}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER - Loading
  // ============================================================================
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '40px', height: '40px', border: `3px solid ${t.border}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main 3-Column Layout
  // ============================================================================
  return (
    <div style={{ height: '100vh', backgroundColor: t.bg, fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`,
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '8px', backgroundColor: t.bgPanel, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            <Home size={20} color={t.text} />
          </button>
          {/* User Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
            backgroundColor: t.bgPanel, borderRadius: '8px', border: `1px solid ${t.border}`
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: t.accent, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '600'
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          {/* Station Type & Location */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0', borderRadius: '8px', overflow: 'hidden',
            border: `1px solid ${stationType === 'REPAIR' ? t.accent : '#22c55e'}`
          }}>
            {/* Type Badge */}
            <div style={{
              padding: '8px 12px',
              backgroundColor: stationType === 'REPAIR' ? t.accent : '#22c55e',
              color: 'white', fontWeight: '700', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              {stationType === 'REPAIR' ? <Wrench size={14} /> : <CheckCircle size={14} />}
              {stationType === 'REPAIR' ? 'REPARACIÓN' : 'LIBERACIÓN'}
            </div>
            {/* Location Button */}
            <button
              onClick={() => setLocationSelectorOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
                backgroundColor: stationType === 'REPAIR' ? (t.accent + '15') : '#dcfce7',
                color: stationType === 'REPAIR' ? t.accent : '#166534',
                border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
              }}
            >
              <MapPin size={14} />
              {selectedLocation?.name || (language === 'es' ? 'Seleccionar...' : 'Select...')}
              <ChevronDown size={14} />
            </button>
          </div>
          {selectedShift && (
            <div style={{ padding: '6px 12px', backgroundColor: t.bgPanel, borderRadius: '6px', fontSize: '12px', color: t.textMuted }}>
              <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {selectedShift.name}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSelector />
        </div>
      </header>

      {/* Error Banner */}
      {actionError && (
        <div style={{
          padding: '10px 16px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca',
          color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} color="#991b1b" />
          </button>
        </div>
      )}

      {/* 3-Column Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* LEFT COLUMN - Parts List (30%) */}
        <div
          onClick={() => setFocusedColumn(0)}
          style={{
            width: '30%', borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column',
            backgroundColor: t.bgCard, height: '100%', overflow: 'hidden',
            outline: focusedColumn === 0 ? `2px solid ${t.accent}` : 'none',
            outlineOffset: '-2px'
          }}>
          {/* Search */}
          <div style={{ padding: '12px', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color={t.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={serialInputRef}
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder={language === 'es' ? 'Buscar serial...' : 'Search serial...'}
                  style={{
                    width: '100%', padding: '10px 10px 10px 34px', fontSize: '14px',
                    border: `1px solid ${t.border}`, borderRadius: '8px',
                    backgroundColor: t.bgPanel, color: t.text, outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results indicator */}
          <div style={{
            padding: '6px 12px',
            fontSize: '11px',
            color: t.textMuted,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${t.border}`
          }}>
            <span>
              {isLimitedView
                ? (language === 'es' ? `Últimos ${filteredParts.length} seriales` : `Last ${filteredParts.length} serials`)
                : (language === 'es' ? `${filteredParts.length} resultados` : `${filteredParts.length} results`)
              }
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isLimitedView && !searchFilter && currentLimit < 500 && filteredParts.length >= currentLimit && (
                <button
                  onClick={loadMore}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    backgroundColor: t.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  + {language === 'es' ? 'Cargar más' : 'Load more'}
                </button>
              )}
              {isLimitedView && !searchFilter && currentLimit >= 500 && (
                <span style={{ fontSize: '10px', color: t.warning }}>
                  {language === 'es' ? 'Usa búsqueda para más' : 'Use search for more'}
                </span>
              )}
              {searchFilter && (
                <button
                  onClick={clearSearch}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    backgroundColor: 'transparent',
                    color: t.error,
                    border: `1px solid ${t.error}`,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ {language === 'es' ? 'Limpiar' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {/* Parts List */}
          <div ref={partsListRef} style={{ flex: 1, overflowY: 'auto' }}>
            {partsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                {language === 'es' ? 'Cargando...' : 'Loading...'}
              </div>
            ) : filteredParts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>
                {language === 'es' ? 'Sin partes pendientes' : 'No pending parts'}
              </div>
            ) : (
              filteredParts.map((part, idx) => {
                // Use precalculated counts from backend
                const pendingCount = part.pendingCount ?? 0;
                const repairedCount = part.repairedCount ?? 0;
                const releasedCount = part.releasedCount ?? 0;
                const quarantineCount = part.quarantineCount ?? 0;
                const totalCount = part.totalCount ?? part.defects?.length ?? 0;

                return (
                  <button
                    key={part.serial + idx}
                    id={`part-item-${idx}`}
                    onClick={() => {
                      setSelectedPartIndex(idx);
                      selectPart(part);
                    }}
                    style={{
                      width: '100%', padding: '14px 12px', textAlign: 'left',
                      backgroundColor: selectedPart?.serial === part.serial ? (t.accent + '10') : 'transparent',
                      borderLeft: selectedPart?.serial === part.serial ? `3px solid ${t.accent}` : '3px solid transparent',
                      borderBottom: `1px solid ${t.border}`, border: 'none',
                      borderRight: 'none', borderTop: 'none',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: t.text }}>
                        {part.serial}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {pendingCount > 0 && (
                          <span style={{
                            padding: '2px 6px', backgroundColor: '#fef2f2', color: '#dc2626',
                            borderRadius: '6px', fontSize: '10px', fontWeight: '600'
                          }}>
                            🔴 {pendingCount}
                          </span>
                        )}
                        {repairedCount > 0 && (
                          <span style={{
                            padding: '2px 6px', backgroundColor: '#eff6ff', color: '#2563eb',
                            borderRadius: '6px', fontSize: '10px', fontWeight: '600'
                          }}>
                            🔵 {repairedCount}
                          </span>
                        )}
                        {quarantineCount > 0 && (
                          <span style={{
                            padding: '2px 6px', backgroundColor: '#fef3c7', color: '#d97706',
                            borderRadius: '6px', fontSize: '10px', fontWeight: '600'
                          }}>
                            🟠 {quarantineCount}
                          </span>
                        )}
                        {releasedCount > 0 && (
                          <span style={{
                            padding: '2px 6px', backgroundColor: '#f0fdf4', color: '#16a34a',
                            borderRadius: '6px', fontSize: '10px', fontWeight: '600'
                          }}>
                            🟢 {releasedCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>
                      {part.partNumber} • {totalCount} defecto{totalCount !== 1 ? 's' : ''} • {getTimeAgo(part.latestDate)}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Refresh Button */}
          <div style={{ padding: '12px', borderTop: `1px solid ${t.border}` }}>
            <button
              onClick={loadPendingParts}
              disabled={partsLoading}
              style={{
                width: '100%', padding: '10px', backgroundColor: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '8px',
                cursor: 'pointer', fontWeight: '500', fontSize: '13px', color: t.text
              }}
            >
              {partsLoading ? '...' : (language === 'es' ? 'Actualizar Lista' : 'Refresh List')}
            </button>
          </div>
        </div>

        {/* CENTER COLUMN - Defects (30%) */}
        <div
          onClick={() => setFocusedColumn(1)}
          style={{
            width: '30%', borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column',
            backgroundColor: t.bg, height: '100%', overflow: 'hidden',
            outline: focusedColumn === 1 ? `2px solid ${t.accent}` : 'none',
            outlineOffset: '-2px'
          }}>
          {selectedPart ? (
            <>
              {/* Part Header */}
              <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgCard }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: t.text, letterSpacing: '0.5px' }}>
                  {selectedPart.serial}
                </div>
                <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>
                  {selectedPart.partNumber} - {selectedPart.partName || ''}
                </div>
              </div>

              {/* Defects List */}
              <div ref={defectsListRef} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {partDefects.map((defect, idx) => {
                  const defectId = defect.id || defect.defectId;
                  const status = defect.repairStatus || defect.repair_status || defect.status || 'OPEN';
                  const statusInfo = getStatusInfo(status);
                  const isSelected = selectedDefect?.id === defectId || selectedDefect?.defectId === defectId;
                  const isLoading = actionLoading[defectId];
                  const wasSuccess = actionSuccess[defectId];
                  const canRepair = canRepairDefect(defect);
                  const canRelease = canReleaseDefect(defect);

                  return (
                    <div
                      key={defectId}
                      id={`defect-item-${idx}`}
                      onClick={() => {
                        setSelectedDefectIndex(idx);
                        loadDefectDetail(defect);
                      }}
                      style={{
                        padding: '14px', marginBottom: '10px', borderRadius: '10px',
                        backgroundColor: t.bgCard, border: isSelected ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                        cursor: 'pointer', opacity: wasSuccess ? 0.5 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: statusInfo.bg, color: statusInfo.color
                        }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span style={{ fontSize: '11px', color: t.textMuted }}>
                          {defect.entryNumber || defect.entry_number}
                        </span>
                      </div>

                      <div style={{ fontWeight: '600', fontSize: '14px', color: t.text, marginBottom: '10px' }}>
                        {defect.defectTypeName || defect.defect_type_name}
                      </div>

                      {/* Action Row */}
                      {(canRepair || canRelease) && !wasSuccess && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            placeholder="min"
                            value={actionMinutes[defectId] ?? '1'}
                            onChange={(e) => setActionMinutes(prev => ({ ...prev, [defectId]: e.target.value }))}
                            style={{
                              width: '60px', padding: '8px', border: `1px solid ${t.border}`,
                              borderRadius: '6px', fontSize: '13px', textAlign: 'center',
                              backgroundColor: t.bgPanel, color: t.text
                            }}
                            min="1"
                          />
                          {canRepair && (
                            <button
                              onClick={() => handleRepair(defect)}
                              disabled={isLoading}
                              style={{
                                flex: 1, padding: '8px 12px', backgroundColor: t.accent, color: 'white',
                                border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <Wrench size={14} /> {isLoading ? '...' : (language === 'es' ? 'Reparar' : 'Repair')}
                            </button>
                          )}
                          {canRelease && (
                            <button
                              onClick={() => handleRelease(defect)}
                              disabled={isLoading}
                              style={{
                                flex: 1, padding: '8px 12px', backgroundColor: '#22c55e', color: 'white',
                                border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <CheckCircle size={14} /> {isLoading ? '...' : (language === 'es' ? 'Liberar' : 'Release')}
                            </button>
                          )}
                        </div>
                      )}

                      {wasSuccess && (
                        <div style={{
                          padding: '8px', borderRadius: '6px', textAlign: 'center',
                          backgroundColor: wasSuccess === 'repaired' ? '#eff6ff' : '#f0fdf4',
                          color: wasSuccess === 'repaired' ? '#3b82f6' : '#22c55e',
                          fontWeight: '600', fontSize: '12px'
                        }}>
                          ✓ {wasSuccess === 'repaired' ? (language === 'es' ? 'Reparado' : 'Repaired') : (language === 'es' ? 'Liberado' : 'Released')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
              {language === 'es' ? 'Selecciona una parte' : 'Select a part'}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Defect Detail (40%) - Style from InlineDefectDetailModal */}
        <div
          onClick={() => setFocusedColumn(2)}
          style={{
            width: '40%', backgroundColor: t.bgCard, height: '100%', overflowY: 'auto',
            outline: focusedColumn === 2 ? `2px solid ${t.accent}` : 'none',
            outlineOffset: '-2px'
          }}>
          {selectedDefect ? (
            <div style={{ padding: '16px' }}>
              {/* Header with Status */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
                paddingBottom: '12px', borderBottom: `1px solid ${t.border}`
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: getStatusInfo(selectedDefect.repairStatus || selectedDefect.repair_status || 'OPEN').bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {getStatusInfo(selectedDefect.repairStatus || selectedDefect.repair_status || 'OPEN').icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: t.text }}>
                    {selectedDefect.defectTypeName || selectedDefect.defect_type_name}
                  </div>
                  <div style={{
                    fontSize: '11px', fontWeight: '500', display: 'inline-block', marginTop: '4px',
                    padding: '2px 8px', borderRadius: '4px',
                    backgroundColor: getStatusInfo(selectedDefect.repairStatus || selectedDefect.repair_status || 'OPEN').bg,
                    color: getStatusInfo(selectedDefect.repairStatus || selectedDefect.repair_status || 'OPEN').color
                  }}>
                    {getStatusInfo(selectedDefect.repairStatus || selectedDefect.repair_status || 'OPEN').label}
                  </div>
                </div>
              </div>

              {/* Loading indicator */}
              {loadingDetail && (
                <div style={{ textAlign: 'center', padding: '10px', color: t.textMuted, fontSize: '12px', marginBottom: '16px' }}>
                  {language === 'es' ? 'Cargando fotos...' : 'Loading photos...'}
                </div>
              )}

              {/* EVIDENCIA Section */}
              {(defectDetail?.photos?.length > 0 || selectedDefect.photoCount > 0 || selectedDefect.photo_count > 0) && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                    📷 EVIDENCIA {defectDetail?.photos?.length > 0 && `(${defectDetail.photos.length})`}
                  </div>
                  {defectDetail?.photos?.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                      {defectDetail.photos.map((photo, idx) => {
                        // Build correct URL - filename is the actual file, filePath is relative path
                        const photoUrl = photo.filename
                          ? `${API_URL}/uploads/defect-attachments/${photo.filename}`
                          : (photo.filePath
                              ? `${API_URL}/uploads/${photo.filePath}`
                              : (typeof photo === 'string' ? photo : ''));
                        const isImage = photo.mimetype?.startsWith('image/') ||
                                        photo.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                        return (
                          <div
                            key={photo.id || idx}
                            onClick={() => {
                              if (isImage) {
                                setLightboxPhoto({ ...photo, url: photoUrl });
                                setLightboxIndex(idx);
                              } else {
                                // For non-images, open in new tab
                                window.open(photoUrl, '_blank');
                              }
                            }}
                            style={{
                              aspectRatio: '1', borderRadius: '8px', overflow: 'hidden',
                              border: `1px solid ${t.border}`, backgroundColor: t.bgPanel,
                              position: 'relative', cursor: 'pointer'
                            }}
                          >
                            {isImage ? (
                              <img src={photoUrl} alt={photo.originalName || `Foto ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div style={{
                                display: 'flex',
                                width: '100%', height: '100%',
                                alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', padding: '8px',
                                backgroundColor: t.bgPanel
                              }}>
                                <span style={{ fontSize: '24px' }}>📄</span>
                                <span style={{ fontSize: '10px', color: t.textMuted, marginTop: '4px', textAlign: 'center', wordBreak: 'break-all' }}>
                                  {photo.originalName || photo.filename || 'Archivo'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', textAlign: 'center', color: t.textMuted, fontSize: '12px' }}>
                      {selectedDefect.photoCount || selectedDefect.photo_count} foto(s) - cargando...
                    </div>
                  )}
                </div>
              )}

              {/* DETALLE DEL DEFECTO Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                  DETALLE DEL DEFECTO
                </div>
                <div style={{ backgroundColor: t.bgPanel, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '8px' }}>
                    {selectedDefect.defectTypeName || selectedDefect.defect_type_name}
                  </div>
                  {selectedDefect.notes && (
                    <div style={{ fontSize: '12px', color: t.text, whiteSpace: 'pre-wrap', padding: '8px', backgroundColor: t.bg, borderRadius: '6px', border: `1px solid ${t.border}` }}>
                      {selectedDefect.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* CAPTURA Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                  CAPTURA
                </div>
                <div style={{ backgroundColor: t.bgPanel, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <MapPin size={14} color={t.textMuted} />
                    <span style={{ fontSize: '13px', color: t.text }}>
                      {selectedDefect.stationName || selectedDefect.station_name || '(Estación no registrada)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Eye size={14} color={t.textMuted} />
                    <span style={{ fontSize: '13px', color: t.text }}>
                      {selectedDefect.capturedByName || selectedDefect.captured_by_name || 'Inspector desconocido'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    {selectedDefect.createdAt || selectedDefect.created_at
                      ? new Date(selectedDefect.createdAt || selectedDefect.created_at).toLocaleString()
                      : ''}
                  </div>
                </div>
              </div>

              {/* REPARACIÓN Section - Only if repaired */}
              {(selectedDefect.repairStatus === 'REPAIRED' || selectedDefect.repair_status === 'REPAIRED' ||
                selectedDefect.repairStatus === 'RELEASED' || selectedDefect.repair_status === 'RELEASED' ||
                selectedDefect.repairedAt || selectedDefect.repaired_at) && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', marginBottom: '8px' }}>
                    🔧 REPARACIÓN
                  </div>
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <MapPin size={14} color="#d97706" />
                      <span style={{ fontSize: '13px', color: '#92400e' }}>
                        {selectedDefect.repairLocationName || selectedDefect.repair_location_name || selectedDefect.repairStationName || selectedDefect.repair_station_name || '(Ubicación no registrada)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Wrench size={14} color="#d97706" />
                      <span style={{ fontSize: '13px', color: '#92400e' }}>
                        {selectedDefect.repairedByName || selectedDefect.repaired_by_name || 'Técnico desconocido'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#b45309' }}>
                        {selectedDefect.repairedAt || selectedDefect.repaired_at
                          ? new Date(selectedDefect.repairedAt || selectedDefect.repaired_at).toLocaleString()
                          : ''}
                      </span>
                      {(selectedDefect.repairTimeMinutes || selectedDefect.repair_time_minutes) && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                          ⏱ {selectedDefect.repairTimeMinutes || selectedDefect.repair_time_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* LIBERACIÓN Section - Only if released */}
              {(selectedDefect.repairStatus === 'RELEASED' || selectedDefect.repair_status === 'RELEASED' ||
                selectedDefect.status === 'CLOSED' || selectedDefect.releasedAt || selectedDefect.released_at) && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>
                    ✅ LIBERACIÓN
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <MapPin size={14} color="#16a34a" />
                      <span style={{ fontSize: '13px', color: '#166534' }}>
                        {selectedDefect.releaseLocationName || selectedDefect.release_location_name || selectedDefect.releaseStationName || selectedDefect.release_station_name || '(Ubicación no registrada)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <CheckCircle size={14} color="#16a34a" />
                      <span style={{ fontSize: '13px', color: '#166534' }}>
                        {selectedDefect.releasedByName || selectedDefect.released_by_name || 'Inspector desconocido'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#15803d' }}>
                        {selectedDefect.releasedAt || selectedDefect.released_at
                          ? new Date(selectedDefect.releasedAt || selectedDefect.released_at).toLocaleString()
                          : ''}
                      </span>
                      {(selectedDefect.releaseTimeMinutes || selectedDefect.release_time_minutes) && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                          ⏱ {selectedDefect.releaseTimeMinutes || selectedDefect.release_time_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TIEMPOS Summary */}
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '8px' }}>
                  ⏱ TIEMPOS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: t.textMuted }}>{language === 'es' ? 'Tiempo abierto' : 'Time open'}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444' }}>
                    {getTimeAgo(selectedDefect.createdAt || selectedDefect.created_at)}
                  </span>
                </div>
              </div>

              {/* Entry/Cliente Info */}
              <div style={{ padding: '12px', backgroundColor: t.bgPanel, borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: t.textMuted }}>Entry #</span>
                  <span style={{ fontSize: '12px', color: t.text }}>{selectedDefect.entryNumber || selectedDefect.entry_number || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: t.textMuted }}>{language === 'es' ? 'Cliente' : 'Client'}</span>
                  <span style={{ fontSize: '12px', color: t.text }}>{selectedDefect.clientName || selectedDefect.client_name || '-'}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {(() => {
                const defectId = selectedDefect.id || selectedDefect.defectId;
                const status = selectedDefect.repairStatus || selectedDefect.repair_status || selectedDefect.status || 'OPEN';
                const isLoading = actionLoading[defectId];
                const wasSuccess = actionSuccess[defectId];

                // Determine actions based on station type and status
                const isRepairStation = stationType === 'REPAIR';
                const isReleaseStation = stationType === 'RELEASE';

                // Can repair if: repair station AND defect is OPEN or IN_REPAIR
                const canDoRepair = isRepairStation && ['OPEN', 'IN_REPAIR'].includes(status);
                // Can release if: release station AND defect is REPAIRED
                const canDoRelease = isReleaseStation && ['REPAIRED', 'IN_VALIDATION'].includes(status);
                // Can quarantine/scrap if defect is not already closed
                const canDoQuarantine = !['QUARANTINE', 'SCRAPPED', 'RELEASED', 'CLOSED'].includes(status);
                const canDoScrap = !['SCRAPPED', 'RELEASED', 'CLOSED'].includes(status);

                if (wasSuccess) {
                  return (
                    <div style={{
                      padding: '16px', borderRadius: '10px', textAlign: 'center',
                      backgroundColor: wasSuccess === 'repaired' ? '#eff6ff' : (wasSuccess === 'released' ? '#f0fdf4' : '#fef3c7'),
                      color: wasSuccess === 'repaired' ? '#3b82f6' : (wasSuccess === 'released' ? '#22c55e' : '#d97706'),
                      fontWeight: '600', fontSize: '14px'
                    }}>
                      ✓ {wasSuccess === 'repaired' ? (language === 'es' ? 'Reparado exitosamente' : 'Repaired successfully') :
                         wasSuccess === 'released' ? (language === 'es' ? 'Liberado exitosamente' : 'Released successfully') :
                         wasSuccess === 'quarantine' ? (language === 'es' ? 'Enviado a cuarentena' : 'Sent to quarantine') :
                         (language === 'es' ? 'Marcado como scrap' : 'Marked as scrap')}
                    </div>
                  );
                }

                return (
                  <div style={{
                    padding: '16px', backgroundColor: t.bgPanel, borderRadius: '10px',
                    border: `1px solid ${t.border}`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, marginBottom: '12px' }}>
                      ⚡ ACCIONES
                    </div>

                    {/* Time Input */}
                    {(canDoRepair || canDoRelease) && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', color: t.textMuted, display: 'block', marginBottom: '4px' }}>
                          {language === 'es' ? 'Tiempo (minutos)' : 'Time (minutes)'}
                        </label>
                        <input
                          type="number"
                          placeholder="min"
                          value={actionMinutes[defectId] ?? '1'}
                          onChange={(e) => setActionMinutes(prev => ({ ...prev, [defectId]: e.target.value }))}
                          style={{
                            width: '100%', padding: '10px', border: `1px solid ${t.border}`,
                            borderRadius: '8px', fontSize: '14px', textAlign: 'center',
                            backgroundColor: t.bg, color: t.text
                          }}
                          min="1"
                        />
                      </div>
                    )}

                    {/* Primary Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      {canDoRepair && (
                        <button
                          onClick={() => handleRepair(selectedDefect)}
                          disabled={isLoading}
                          style={{
                            flex: 1, padding: '12px', backgroundColor: t.accent, color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: isLoading ? 0.7 : 1
                          }}
                        >
                          <Wrench size={18} /> {isLoading ? '...' : (language === 'es' ? 'Reparar' : 'Repair')}
                        </button>
                      )}
                      {canDoRelease && (
                        <button
                          onClick={() => handleRelease(selectedDefect)}
                          disabled={isLoading}
                          style={{
                            flex: 1, padding: '12px', backgroundColor: '#22c55e', color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: isLoading ? 0.7 : 1
                          }}
                        >
                          <CheckCircle size={18} /> {isLoading ? '...' : (language === 'es' ? 'Liberar' : 'Release')}
                        </button>
                      )}
                    </div>

                    {/* Secondary Actions - Quarantine & Scrap */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canDoQuarantine && (
                          <button
                            onClick={async () => {
                              setActionLoading(prev => ({ ...prev, [defectId]: true }));
                              try {
                                const result = await repairService.quarantineDefect(defectId, '');
                                if (result.success) {
                                  setActionSuccess(prev => ({ ...prev, [defectId]: 'quarantine' }));
                                  setTimeout(() => loadPendingParts(), 800);
                                } else {
                                  setActionError(result.error || 'Error');
                                }
                              } catch (err) {
                                setActionError(err.message);
                              } finally {
                                setActionLoading(prev => ({ ...prev, [defectId]: false }));
                              }
                            }}
                            disabled={isLoading}
                            style={{
                              flex: 1, padding: '10px', backgroundColor: '#fef3c7', color: '#92400e',
                              border: '1px solid #fde68a', borderRadius: '8px', fontWeight: '600', fontSize: '13px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              opacity: isLoading ? 0.7 : 1
                            }}
                          >
                            <AlertTriangle size={16} /> {language === 'es' ? 'Cuarentena' : 'Quarantine'}
                          </button>
                        )}
                        {canDoScrap && (
                          <button
                            onClick={async () => {
                              // Primero verificar MRB antes del confirm
                              const canProceed = await checkMrbBeforeScrap(selectedDefect);
                              if (!canProceed) return; // Modal MRB se muestra automáticamente
                              // Si pasa el check MRB, pedir confirmación
                              if (!window.confirm(language === 'es' ? '¿Confirmar SCRAP? Esta acción no se puede deshacer.' : 'Confirm SCRAP? This action cannot be undone.')) return;
                              await handleScrap(selectedDefect, true); // true = skip MRB check (ya se hizo)
                            }}
                            disabled={isLoading}
                            style={{
                              flex: 1, padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b',
                              border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '600', fontSize: '13px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              opacity: isLoading ? 0.7 : 1
                            }}
                          >
                            <Trash2 size={16} /> Scrap
                          </button>
                        )}
                      </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, padding: '20px', textAlign: 'center' }}>
              {language === 'es' ? 'Selecciona un defecto para ver detalle' : 'Select a defect to view details'}
            </div>
          )}
        </div>
      </div>

      {renderLocationSelector()}

      {/* Lightbox Modal for Photos */}
      {lightboxPhoto && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxPhoto(null)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={24} color="white" />
          </button>

          {/* Download Button */}
          <a
            href={lightboxPhoto.url}
            download={lightboxPhoto.originalName || lightboxPhoto.filename}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '16px', right: '70px',
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <Download size={20} color="white" />
          </a>

          {/* Navigation - Previous */}
          {defectDetail?.photos?.length > 1 && lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = lightboxIndex - 1;
                const photo = defectDetail.photos[newIndex];
                const photoUrl = photo.filename
                  ? `${API_URL}/uploads/defect-attachments/${photo.filename}`
                  : `${API_URL}/uploads/${photo.filePath}`;
                setLightboxPhoto({ ...photo, url: photoUrl });
                setLightboxIndex(newIndex);
              }}
              style={{
                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                width: '50px', height: '50px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <ChevronLeft size={28} color="white" />
            </button>
          )}

          {/* Navigation - Next */}
          {defectDetail?.photos?.length > 1 && lightboxIndex < defectDetail.photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = lightboxIndex + 1;
                const photo = defectDetail.photos[newIndex];
                const photoUrl = photo.filename
                  ? `${API_URL}/uploads/defect-attachments/${photo.filename}`
                  : `${API_URL}/uploads/${photo.filePath}`;
                setLightboxPhoto({ ...photo, url: photoUrl });
                setLightboxIndex(newIndex);
              }}
              style={{
                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                width: '50px', height: '50px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <ChevronRight size={28} color="white" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.originalName || 'Foto'}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: '8px'
            }}
          />

          {/* Photo Info */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '8px',
            color: 'white', fontSize: '13px', textAlign: 'center'
          }}>
            <div style={{ fontWeight: '500' }}>{lightboxPhoto.originalName || lightboxPhoto.filename}</div>
            {defectDetail?.photos?.length > 1 && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                {lightboxIndex + 1} / {defectDetail.photos.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MRB Warning Modal - Pending Campaigns */}
      {mrbWarningOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '24px',
            maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertTriangle size={32} color="#d97706" />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#92400e' }}>
                {language === 'es' ? 'Campañas MRB Pendientes' : 'Pending MRB Campaigns'}
              </h3>
            </div>

            <p style={{ color: '#78350f', marginBottom: '16px' }}>
              {language === 'es'
                ? 'Esta pieza tiene campañas MRB pendientes de inspección. Debe completar las inspecciones antes de enviar a SCRAP.'
                : 'This part has pending MRB campaigns. You must complete inspections before sending to SCRAP.'}
            </p>

            {mrbPendingCampaigns.length > 0 && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                  {language === 'es' ? 'Campañas pendientes:' : 'Pending campaigns:'}
                </div>
                {mrbPendingCampaigns.map((c, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#78350f', padding: '4px 0' }}>
                    • {c.campaignNumber || c.campaign_number} - {c.description || c.campaignDescription}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setMrbWarningOpen(false);
                  setMrbWarningDefect(null);
                  setMrbPendingCampaigns([]);
                }}
                style={{
                  padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  if (!mrbWarningDefect) return;
                  setMrbWarningOpen(false);
                  const defectId = mrbWarningDefect.id || mrbWarningDefect.defectId;
                  setActionLoading(prev => ({ ...prev, [defectId]: true }));
                  try {
                    const result = await repairService.quarantineDefect(defectId, 'Enviado a cuarentena - Pendiente inspección MRB');
                    if (result.success) {
                      setActionSuccess(prev => ({ ...prev, [defectId]: 'quarantine' }));
                      setTimeout(() => loadPendingParts(), 800);
                    } else {
                      setActionError(result.error || 'Error al enviar a cuarentena');
                    }
                  } catch (err) {
                    setActionError(err.message);
                  } finally {
                    setActionLoading(prev => ({ ...prev, [defectId]: false }));
                    setMrbWarningDefect(null);
                    setMrbPendingCampaigns([]);
                  }
                }}
                style={{
                  padding: '10px 20px', backgroundColor: '#f59e0b', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <AlertTriangle size={16} />
                {language === 'es' ? 'Enviar a Cuarentena' : 'Send to Quarantine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairStation;
