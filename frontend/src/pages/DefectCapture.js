import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { canUserEdit, isReadOnly } from '../utils/permissions';
import { CheckCircle, XCircle, Plus, Settings, Home, List, Palette, BarChart3, Search, AlertTriangle } from 'lucide-react';
import { useTheme, ThemeSelector, THEMES } from '../context/ThemeContext';

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

  // ============================================================================
  // LOAD DATA
  // ============================================================================
  useEffect(() => {
    loadInitialData();
  }, []);

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

      // Restore saved context (client/project/part)
      const savedContext = localStorage.getItem('defectCaptureContext');
      if (savedContext) {
        try {
          const ctx = JSON.parse(savedContext);
          const savedClient = (clientsData.clients || []).find(c => c.id === ctx.clientId);
          if (savedClient) {
            setSelectedClient(savedClient);
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

  // Load defects when part changes
  useEffect(() => {
    if (selectedPart) {
      loadPartDefects(selectedPart.id);
      setDefectFilter(''); // Clear filter when part changes
    } else {
      setPartDefects([]);
      setDefectsByCategory([]);
      setSelectedDefect(null);
    }
  }, [selectedPart]);

  // Save context to localStorage when it changes
  useEffect(() => {
    if (selectedClient && selectedProject && selectedPart) {
      localStorage.setItem('defectCaptureContext', JSON.stringify({
        clientId: selectedClient.id,
        projectId: selectedProject.id,
        partId: selectedPart.id
      }));
    }
  }, [selectedClient, selectedProject, selectedPart]);

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

  // Reset hasRegisteredDefect when user enters lot number
  const handleLotChange = (value) => {
    setLotNumber(value);
    if (value.trim()) {
      setHasRegisteredDefect(false);
    }
  };

  const handleSubmitDefect = async () => {
    // Validation
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

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
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

      // Success
      setNgCount(prev => prev + 1);
      showSuccessMessage(`Defecto ${result.entry?.entryNumber || ''} registrado`);

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
    selectedDepartment && selectedDefect;

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
      borderColor: t.accent,
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
          {error}
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}
          >
            
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
            style={styles.settingsButton}
            onClick={() => navigate('/defect-admin')}
            title="Admin Defectos por Parte"
          >
            <List size={20} />
          </button>
          <button
            style={styles.settingsButton}
            onClick={() => navigate('/defect-config')}
            title="Catálogos de Inspección"
          >
            <Settings size={20} />
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

        {/* Direct Part Search (searches all parts, auto-fills client/project) */}
        <select
          style={{
            ...styles.contextSelect,
            flex: 2,
            fontWeight: selectedPart ? '600' : '400',
            borderColor: selectedPart ? t.accent : t.border,
            borderWidth: selectedPart ? '2px' : '1px'
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
          <option value=""> Buscar Parte directamente...</option>
          {allParts.map(p => (
            <option key={p.id} value={p.id}>
              {p.captureDisplayName || p.partNumber} - {p.partName} [{p.clientName}]
            </option>
          ))}
        </select>
      </div>

      {/* ====== MAIN CONTENT ====== */}
      <div style={styles.mainContent}>
        {/* ====== LEFT PANEL (25%) ====== */}
        <div style={styles.leftPanel}>
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
                borderColor: !selectedDepartment ? '#f87171' : currentTheme.textMuted
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

          {/* Lot/Serial */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Lote / Serie</label>
            <input
              type="text"
              style={styles.fieldInput}
              placeholder="Escanear o ingresar..."
              value={lotNumber}
              onChange={(e) => handleLotChange(e.target.value)}
            />
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
                      borderColor: sev.color || '#0072CE',
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
                <button
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: currentTheme.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/defect-admin')}
                >
                  Configurar Defectos
                </button>
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
                              ...(defect.color ? { borderColor: defect.color } : {})
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

            <button
              style={{
                ...styles.submitButton,
                ...((!isFormValid || submitting) ? styles.submitButtonDisabled : {}),
                ...(hasRegisteredDefect && !lotNumber.trim() ? { backgroundColor: '#C77700' } : {})
              }}
              onClick={handleSubmitDefect}
              disabled={!isFormValid || submitting}
            >
              <Plus size={20} />
              {submitting
                ? 'GUARDANDO...'
                : (hasRegisteredDefect && !lotNumber.trim())
                  ? '¿AGREGAR DEFECTO SIN LOTE/SERIE NUEVAMENTE?'
                  : 'AGREGAR DEFECTO'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefectCapture;
