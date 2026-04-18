import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, ComposedChart, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Home, BarChart3, ClipboardList, ChevronDown, ChevronUp, X, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#0072CE', '#2E7D32', '#C77700', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];
const PAGE_SIZE_OPTIONS = [20, 50, 100, 0]; // 0 = All

const DEPARTMENTS = [
  { id: 1, name: 'Produccion' },
  { id: 2, name: 'Calidad' },
  { id: 3, name: 'Ingenieria' },
  { id: 4, name: 'Mantenimiento' },
  { id: 5, name: 'Logistica' },
  { id: 6, name: 'Proveedor' }
];

const DefectQuery = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const API_URL = 'http://localhost:5000';

  // Catalog data
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [stations, setStations] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterPart, setFilterPart] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDefectType, setFilterDefectType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Results
  const [entries, setEntries] = useState([]);
  const [allFilteredEntries, setAllFilteredEntries] = useState([]); // For charts - all filtered data
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Initial load
  useEffect(() => {
    loadCatalogs();
  }, []);

  // Cascade: load projects when client changes
  useEffect(() => {
    if (filterClient) {
      loadProjects(filterClient);
    } else {
      setProjects([]);
      setFilterProject('');
      setParts([]);
      setFilterPart('');
    }
  }, [filterClient]);

  // Cascade: load parts when project changes
  useEffect(() => {
    if (filterProject && filterClient) {
      loadParts(filterClient, filterProject);
    } else {
      setParts([]);
      setFilterPart('');
    }
  }, [filterProject]);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const loadCatalogs = async () => {
    try {
      const headers = getHeaders();
      const [clientsRes, categoriesRes, defectsRes, stationsRes, shiftsRes, severitiesRes] = await Promise.all([
        fetch(`${API_URL}/clients/list`, { headers }),
        fetch(`${API_URL}/defects-v2/categories`, { headers }),
        fetch(`${API_URL}/defects-v2/types`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/stations`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/shifts`, { headers }),
        fetch(`${API_URL}/inspection-catalogs/severities`, { headers })
      ]);

      const [clientsData, categoriesData, defectsData, stationsData, shiftsData, severitiesData] = await Promise.all([
        clientsRes.json(), categoriesRes.json(), defectsRes.json(), stationsRes.json(), shiftsRes.json(), severitiesRes.json()
      ]);

      setClients(clientsData.clients || []);
      setCategories(categoriesData.categories || []);
      setDefectTypes(defectsData.defectTypes || []);
      setStations(stationsData.items || []);
      setShifts(shiftsData.items || []);
      setSeverities(severitiesData.items || []);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
  };

  const loadProjects = async (clientId) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/projects`, { headers: getHeaders() });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadParts = async (clientId, projectId) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/parts?activeOnly=true`, { headers: getHeaders() });
      const data = await res.json();
      const projectGroup = (data.projectGroups || []).find(g => g.projectId === parseInt(projectId));
      setParts(projectGroup?.parts || []);
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  // Search when filters, page, pageSize or sort change (for table)
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        params.set('limit', pageSize);
        params.set('offset', pageSize > 0 ? (page - 1) * pageSize : 0);
        params.set('sortBy', sortColumn);
        params.set('sortDir', sortDirection);

        if (filterClient) params.set('clientId', filterClient);
        if (filterProject) params.set('projectId', filterProject);
        if (filterPart) params.set('partId', filterPart);
        if (filterCategory) params.set('categoryId', filterCategory);
        if (filterDefectType) params.set('defectTypeId', filterDefectType);
        if (filterSeverity) params.set('severityId', filterSeverity);
        if (filterStation) params.set('stationId', filterStation);
        if (filterShift) params.set('shiftId', filterShift);
        if (filterDepartment) params.set('departmentId', filterDepartment);
        if (filterStartDate) params.set('startDate', filterStartDate);
        if (filterEndDate) params.set('endDate', filterEndDate);

        const res = await fetch(`${API_URL}/defects-v2/entries?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        setEntries(data.entries || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Error loading entries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [page, pageSize, sortColumn, sortDirection, filterClient, filterProject, filterPart, filterCategory, filterDefectType, filterSeverity, filterStation, filterShift, filterDepartment, filterStartDate, filterEndDate]);

  // Fetch ALL filtered data for charts (separate from pagination)
  useEffect(() => {
    const fetchAllForCharts = async () => {
      try {
        setLoadingCharts(true);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        params.set('limit', 0); // 0 = all records
        params.set('sortBy', 'date');
        params.set('sortDir', 'desc');

        if (filterClient) params.set('clientId', filterClient);
        if (filterProject) params.set('projectId', filterProject);
        if (filterPart) params.set('partId', filterPart);
        if (filterCategory) params.set('categoryId', filterCategory);
        if (filterDefectType) params.set('defectTypeId', filterDefectType);
        if (filterSeverity) params.set('severityId', filterSeverity);
        if (filterStation) params.set('stationId', filterStation);
        if (filterShift) params.set('shiftId', filterShift);
        if (filterDepartment) params.set('departmentId', filterDepartment);
        if (filterStartDate) params.set('startDate', filterStartDate);
        if (filterEndDate) params.set('endDate', filterEndDate);

        const res = await fetch(`${API_URL}/defects-v2/entries?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        setAllFilteredEntries(data.entries || []);
      } catch (err) {
        console.error('Error loading chart data:', err);
      } finally {
        setLoadingCharts(false);
      }
    };
    fetchAllForCharts();
  }, [filterClient, filterProject, filterPart, filterCategory, filterDefectType, filterSeverity, filterStation, filterShift, filterDepartment, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterClient('');
    setFilterProject('');
    setFilterPart('');
    setFilterCategory('');
    setFilterDefectType('');
    setFilterSeverity('');
    setFilterStation('');
    setFilterShift('');
    setFilterDepartment('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const totalPages = pageSize > 0 ? (Math.ceil(total / pageSize) || 1) : 1;

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (col) => {
    if (sortColumn !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    if (sortDirection === 'asc') return <ArrowUp size={12} style={{ marginLeft: '4px', color: '#0072CE' }} />;
    return <ArrowDown size={12} style={{ marginLeft: '4px', color: '#0072CE' }} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const getDepartmentName = (deptId) => {
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    return dept ? dept.name : '-';
  };

  // Chart data from ALL filtered results (not just current page)
  const getParetoData = () => {
    const counts = {};
    allFilteredEntries.forEach(e => {
      const name = e.defectName || 'Sin tipo';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalCount = sorted.reduce((sum, d) => sum + d.count, 0);
    let cumulative = 0;
    return sorted.map(d => {
      cumulative += d.count;
      return {
        ...d,
        pct: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0,
        cumPct: totalCount > 0 ? Math.round((cumulative / totalCount) * 100) : 0
      };
    });
  };

  const getSeverityPieData = () => {
    const counts = {};
    allFilteredEntries.forEach(e => {
      const name = e.severityName || 'Sin severidad';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getDailyTrendData = () => {
    const counts = {};
    allFilteredEntries.forEach(e => {
      if (!e.capturedAt) return;
      const dateKey = new Date(e.capturedAt).toISOString().split('T')[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        count
      }));
  };

  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    if (total === 0) return;

    try {
      setExporting(true);

      // Fetch ALL filtered records (not just current page)
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('limit', 0); // 0 = all records
      params.set('sortBy', sortColumn);
      params.set('sortDir', sortDirection);

      if (filterClient) params.set('clientId', filterClient);
      if (filterProject) params.set('projectId', filterProject);
      if (filterPart) params.set('partId', filterPart);
      if (filterCategory) params.set('categoryId', filterCategory);
      if (filterDefectType) params.set('defectTypeId', filterDefectType);
      if (filterSeverity) params.set('severityId', filterSeverity);
      if (filterStation) params.set('stationId', filterStation);
      if (filterShift) params.set('shiftId', filterShift);
      if (filterDepartment) params.set('departmentId', filterDepartment);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const res = await fetch(`${API_URL}/defects-v2/entries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const allEntries = data.entries || [];

      if (allEntries.length === 0) {
        setExporting(false);
        return;
      }

      const exportData = allEntries.map(e => ({
        'Folio': e.entryNumber || `DEF-${String(e.id).padStart(3, '0')}`,
        'Fecha': formatDate(e.capturedAt),
        'Cliente': e.clientName || '',
        'Proyecto': e.projectNumber ? `${e.projectNumber} - ${e.projectName}` : '',
        'Parte': e.partNumber || '',
        'Nombre Parte': e.partName || '',
        'Categoria': e.categoryName || '',
        'Defecto': e.defectName || '',
        'Codigo Defecto': e.defectCode || '',
        'Severidad': e.severityName || '',
        'Estacion': e.stationName || '',
        'Turno': e.shiftName || '',
        'Departamento': e.departmentId ? getDepartmentName(e.departmentId) : '',
        'Disposicion': e.dispositionName || '',
        'Etapa': e.stageName || '',
        'Lote/Serie': e.lotNumber || '',
        'Cantidad': e.quantity || 1,
        'Tiempo Paro (min)': e.downtimeMinutes || 0,
        'Inspector': e.inspectorFirstName ? `${e.inspectorFirstName} ${e.inspectorLastName || ''}` : '',
        'Capturado por': e.capturedByFirstName ? `${e.capturedByFirstName} ${e.capturedByLastName || ''}` : '',
        'Status': e.status || 'open',
        'Notas': e.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Defectos');

      // Auto-width columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key] || '').length).slice(0, 100)) + 2
      }));
      ws['!cols'] = colWidths;

      const fileName = `Defectos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  // Styles
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1500px',
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
      fontSize: '22px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    headerButtons: {
      display: 'flex',
      gap: '10px'
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
    filtersCard: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      border: `1px solid ${t.border}`
    },
    filtersGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'flex-end'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '150px'
    },
    filterLabel: {
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    select: {
      padding: '7px 10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    input: {
      padding: '7px 10px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      fontSize: '13px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    resultsBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      fontSize: '14px',
      color: t.textMuted
    },
    tableWrapper: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      overflow: 'hidden',
      marginBottom: '16px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      borderBottom: `2px solid ${t.border}`,
      backgroundColor: t.bgPanel,
      color: t.text,
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      userSelect: 'none'
    },
    td: {
      padding: '10px 12px',
      borderBottom: '1px solid #F4F6F8',
      color: t.text
    },
    trHover: {
      cursor: 'pointer'
    },
    expandedRow: {
      backgroundColor: t.bg,
      padding: '16px 24px'
    },
    expandedGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px'
    },
    expandedLabel: {
      fontSize: '11px',
      color: t.textDim,
      textTransform: 'uppercase',
      fontWeight: '600'
    },
    expandedValue: {
      fontSize: '14px',
      color: t.text,
      fontWeight: '500'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px'
    },
    pageBtn: {
      padding: '8px 16px',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      backgroundColor: t.bgCard,
      cursor: 'pointer',
      fontSize: '13px'
    },
    pageBtnDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed'
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    chartCard: {
      backgroundColor: t.bgCard,
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid #E6EAEE'
    },
    chartTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '12px'
    },
    severityBadge: {
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'inline-block'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: t.textDim
    }
  };

  const renderSeverityBadge = (entry) => {
    if (!entry.severityName) return '-';
    const color = entry.severityColor || '#6b7280';
    return (
      <span style={{
        ...styles.severityBadge,
        backgroundColor: color + '20',
        color: color
      }}>
        {entry.severityCode || entry.severityName}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Consulta de Defectos</h1>
        <div style={styles.headerButtons}>
          <button
            style={{ ...styles.btn, backgroundColor: '#0072CE', color: 'white' }}
            onClick={() => navigate('/defect-capture')}
          >
            <ClipboardList size={16} />
            Captura
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: '#8b5cf6', color: 'white' }}
            onClick={() => navigate('/defect-dashboard')}
          >
            <BarChart3 size={16} />
            Dashboard
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: '#6b7280', color: 'white' }}
            onClick={() => navigate('/')}
          >
            <Home size={16} />
            Inicio
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          {/* Row 1: Cascading + Defect + Severity */}
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Cliente</span>
            <select style={styles.select} value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setFilterProject(''); setFilterPart(''); setPage(1); }}>
              <option value="">Todos</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Proyecto</span>
            <select style={styles.select} value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setFilterPart(''); setPage(1); }} disabled={!filterClient}>
              <option value="">Todos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Parte</span>
            <select style={styles.select} value={filterPart} onChange={(e) => { setFilterPart(e.target.value); setPage(1); }} disabled={!filterProject}>
              <option value="">Todas</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Categoria</span>
            <select style={styles.select} value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterDefectType(''); setPage(1); }}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Defecto</span>
            <select style={styles.select} value={filterDefectType} onChange={(e) => { setFilterDefectType(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {(filterCategory ? defectTypes.filter(d => d.categoryId === parseInt(filterCategory)) : defectTypes).map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Severidad</span>
            <select style={styles.select} value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
              <option value="">Todas</option>
              {severities.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>

          {/* Row 2: Station, Shift, Dept, Dates, Clear */}
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Estacion</span>
            <select style={styles.select} value={filterStation} onChange={(e) => { setFilterStation(e.target.value); setPage(1); }}>
              <option value="">Todas</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Turno</span>
            <select style={styles.select} value={filterShift} onChange={(e) => { setFilterShift(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Depto</span>
            <select style={styles.select} value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Desde</span>
            <input type="date" style={styles.input} value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} />
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Hasta</span>
            <input type="date" style={styles.input} value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} />
          </div>

          <button
            style={{ ...styles.btn, backgroundColor: '#ef4444', color: 'white', alignSelf: 'flex-end' }}
            onClick={clearFilters}
          >
            <X size={14} />
            Limpiar
          </button>
        </div>
      </div>

      {/* Results count */}
      <div style={styles.resultsBar}>
        <span>
          <strong>{total}</strong> defecto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </span>
        <button
          style={{
            ...styles.btn,
            backgroundColor: total > 0 && !exporting ? '#2E7D32' : '#9ca3af',
            color: 'white',
            cursor: total > 0 && !exporting ? 'pointer' : 'not-allowed',
            opacity: exporting ? 0.7 : 1
          }}
          onClick={exportToExcel}
          disabled={total === 0 || exporting}
          title={`Exportar ${total} registros filtrados a Excel`}
        >
          <Download size={16} />
          {exporting ? 'Exportando...' : `Exportar Excel (${total})`}
        </button>
      </div>

      {/* Charts - shows ALL filtered data, not just current page */}
      {allFilteredEntries.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Charts header */}
          <div style={{
            backgroundColor: '#dbeafe',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0F3B5F',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
             Gráficos basados en <strong>{allFilteredEntries.length}</strong> registros filtrados (todas las páginas)
            {loadingCharts && <span style={{ marginLeft: '8px', opacity: 0.7 }}>Actualizando...</span>}
          </div>

          {/* Daily Trend Line Chart */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Histórico de Defectos por Fecha</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getDailyTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EAEE" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0072CE"
                  strokeWidth={2}
                  dot={{ fill: '#0072CE', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Defectos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartsGrid}>
          {/* Pareto */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Pareto - Top 10 Defectos</div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={getParetoData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EAEE" />
                <XAxis dataKey="name" tick={{ fontSize: 11, angle: -30, textAnchor: 'end' }} height={60} interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} label={{ value: '% Acumulado', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Cantidad') return [value, name];
                    if (name === '% Acumulado') return [`${value}%`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={2} label={{ value: '80%', position: 'right', fill: '#ef4444', fontSize: 12, fontWeight: 700 }} />
                <Bar yAxisId="left" dataKey="count" name="Cantidad" barSize={40}>
                  {getParetoData().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumPct" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Pie by Severity */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Distribucion por Severidad</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={getSeverityPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {getSeverityPieData().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>
      )}

      {/* Table controls */}
      <div style={{ ...styles.resultsBar, marginBottom: '8px' }}>
        <span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px' }}>Mostrar:</span>
          <select
            style={{ ...styles.select, minWidth: '80px' }}
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt === 0 ? 'Todos' : opt}</option>
            ))}
          </select>
          {pageSize > 0 && totalPages > 1 && (
            <span style={{ fontSize: '13px' }}>Pagina {page} de {totalPages}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>Cargando...</div>
        ) : entries.length === 0 ? (
          <div style={{ ...styles.loading, padding: '60px' }}>
            No se encontraron defectos con los filtros seleccionados.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} onClick={() => handleSort('folio')}>Folio{renderSortIcon('folio')}</th>
                <th style={styles.th} onClick={() => handleSort('date')}>Fecha{renderSortIcon('date')}</th>
                <th style={styles.th} onClick={() => handleSort('part')}>Parte{renderSortIcon('part')}</th>
                <th style={styles.th} onClick={() => handleSort('defect')}>Defecto{renderSortIcon('defect')}</th>
                <th style={styles.th} onClick={() => handleSort('severity')}>Sev{renderSortIcon('severity')}</th>
                <th style={styles.th} onClick={() => handleSort('station')}>Estacion{renderSortIcon('station')}</th>
                <th style={styles.th} onClick={() => handleSort('shift')}>Turno{renderSortIcon('shift')}</th>
                <th style={styles.th} onClick={() => handleSort('department')}>Depto{renderSortIcon('department')}</th>
                <th style={styles.th} onClick={() => handleSort('disposition')}>Disposicion{renderSortIcon('disposition')}</th>
                <th style={styles.th} onClick={() => handleSort('inspector')}>Inspector{renderSortIcon('inspector')}</th>
                <th style={{ ...styles.th, cursor: 'default' }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr
                    style={{
                      ...styles.trHover,
                      backgroundColor: expandedRow === entry.id ? '#f0f9ff' : 'white'
                    }}
                    onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                  >
                    <td style={{ ...styles.td, fontWeight: '600', color: '#0072CE' }}>
                      {entry.entryNumber || `DEF-${String(entry.id).padStart(3, '0')}`}
                    </td>
                    <td style={styles.td}>{formatDate(entry.capturedAt)}</td>
                    <td style={styles.td}>{entry.partNumber || '-'}</td>
                    <td style={styles.td}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {entry.defectColor && (
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: entry.defectColor, display: 'inline-block'
                          }} />
                        )}
                        {entry.defectName || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>{renderSeverityBadge(entry)}</td>
                    <td style={styles.td}>{entry.stationName || '-'}</td>
                    <td style={styles.td}>{entry.shiftCode || entry.shiftName || '-'}</td>
                    <td style={styles.td}>{entry.departmentId ? getDepartmentName(entry.departmentId) : '-'}</td>
                    <td style={styles.td}>{entry.dispositionCode || entry.dispositionName || '-'}</td>
                    <td style={styles.td}>
                      {entry.inspectorFirstName
                        ? `${entry.inspectorFirstName} ${entry.inspectorLastName || ''}`
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedRow === entry.id && (
                    <tr>
                      <td colSpan={11} style={{ padding: 0 }}>
                        <div style={styles.expandedRow}>
                          <div style={styles.expandedGrid}>
                            <div>
                              <div style={styles.expandedLabel}>Cliente</div>
                              <div style={styles.expandedValue}>{entry.clientName || '-'}</div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Proyecto</div>
                              <div style={styles.expandedValue}>
                                {entry.projectNumber ? `${entry.projectNumber} - ${entry.projectName}` : '-'}
                              </div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Parte</div>
                              <div style={styles.expandedValue}>
                                {entry.partNumber ? `${entry.partNumber} - ${entry.partName}` : '-'}
                              </div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Etapa</div>
                              <div style={styles.expandedValue}>
                                {entry.stageCode ? `${entry.stageCode} - ${entry.stageName}` : entry.stageName || '-'}
                              </div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Lote / Serie</div>
                              <div style={styles.expandedValue}>{entry.lotNumber || '-'}</div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Cantidad</div>
                              <div style={styles.expandedValue}>{entry.quantity || 1}</div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Tiempo de Paro</div>
                              <div style={styles.expandedValue}>
                                {entry.downtimeMinutes ? `${entry.downtimeMinutes} min` : '-'}
                              </div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Capturado por</div>
                              <div style={styles.expandedValue}>
                                {entry.capturedByFirstName
                                  ? `${entry.capturedByFirstName} ${entry.capturedByLastName || ''}`
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div style={styles.expandedLabel}>Status</div>
                              <div style={styles.expandedValue}>{entry.status || 'open'}</div>
                            </div>
                            {entry.notes && (
                              <div style={{ gridColumn: 'span 3' }}>
                                <div style={styles.expandedLabel}>Notas</div>
                                <div style={styles.expandedValue}>{entry.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            &lt; Anterior
          </button>
          <span style={{ fontSize: '14px', color: t.text }}>
            Pagina <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            style={{ ...styles.pageBtn, ...(page >= totalPages ? styles.pageBtnDisabled : {}) }}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente &gt;
          </button>
        </div>
      )}

    </div>
  );
};

export default DefectQuery;
