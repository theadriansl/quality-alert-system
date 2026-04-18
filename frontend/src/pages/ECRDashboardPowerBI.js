import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isUserAdmin } from '../utils/permissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import {
  Settings,
  Plus,
  RotateCcw,
  Save,
  X,
  Filter,
  Calendar,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  Users,
  MapPin,
  BarChart3
} from 'lucide-react';
import ecrService from '../services/ecrService';
import {
  DashboardWidget,
  KPICard,
  ChartWidget,
  AdoptionWidget,
  RankingWidget,
  RiskHeatmapWidget,
  ECRTableWidget,
  FinancialWidget
} from '../components/ECR/Dashboard';

// Default widget configuration (what shows when user has no saved config)
const DEFAULT_WIDGETS = [
  { id: 'w1', type: 'kpi_total', title: 'Total ECRs', icon: '' },
  { id: 'w2', type: 'kpi_open', title: 'Abiertos', icon: '' },
  { id: 'w3', type: 'kpi_approved', title: 'Aprobados', icon: '' },
  { id: 'w4', type: 'kpi_rejected', title: 'Rechazados', icon: '' },
  { id: 'w5', type: 'kpi_avg_time', title: 'Tiempo Promedio', icon: '' },
  { id: 'w6', type: 'kpi_effectiveness', title: 'Efectividad', icon: '' },
  { id: 'w7', type: 'chart_trend', title: 'Tendencia Mensual', icon: '' },
  { id: 'w8', type: 'chart_by_type', title: 'Por Tipo de Cambio', icon: '' },
  { id: 'w9', type: 'chart_by_status', title: 'Por Status', icon: '' },
  { id: 'w10', type: 'chart_adoption', title: 'Adopcion por Etapa', icon: '' },
  { id: 'w11', type: 'ranking_clients', title: 'Top Clientes', icon: '' },
  { id: 'w12', type: 'ranking_areas', title: 'Top Areas', icon: '' },
  { id: 'w13', type: 'ranking_responsibles', title: 'Top Responsables', icon: '' },
  { id: 'w14', type: 'heatmap_risk', title: 'Matriz de Riesgo', icon: '' },
  { id: 'w15', type: 'financial_impact', title: 'Impacto Financiero', icon: '' }
];

// Widget catalog for adding new widgets
const WIDGET_CATALOG = [
  { type: 'kpi_total', title: 'Total ECRs', icon: '', category: 'KPI' },
  { type: 'kpi_open', title: 'ECRs Abiertos', icon: '', category: 'KPI' },
  { type: 'kpi_approved', title: 'ECRs Aprobados', icon: '', category: 'KPI' },
  { type: 'kpi_rejected', title: 'ECRs Rechazados', icon: '', category: 'KPI' },
  { type: 'kpi_avg_time', title: 'Tiempo Promedio', icon: '', category: 'KPI' },
  { type: 'kpi_effectiveness', title: 'Tasa Efectividad', icon: '', category: 'KPI' },
  { type: 'chart_trend', title: 'Tendencia Mensual', icon: '', category: 'Grafica' },
  { type: 'chart_by_type', title: 'Por Tipo de Cambio', icon: '', category: 'Grafica' },
  { type: 'chart_by_category', title: 'Por Categoria', icon: '', category: 'Grafica' },
  { type: 'chart_by_priority', title: 'Por Prioridad', icon: '', category: 'Grafica' },
  { type: 'chart_by_status', title: 'Por Status', icon: '', category: 'Grafica' },
  { type: 'chart_adoption', title: 'Adopcion por Etapa', icon: '', category: 'Grafica' },
  { type: 'heatmap_risk', title: 'Matriz de Riesgo', icon: '', category: 'Grafica' },
  { type: 'financial_impact', title: 'Impacto Financiero', icon: '', category: 'Grafica' },
  { type: 'ranking_clients', title: 'Top Clientes', icon: '', category: 'Ranking' },
  { type: 'ranking_areas', title: 'Top Areas Impactadas', icon: '', category: 'Ranking' },
  { type: 'ranking_responsibles', title: 'Top Responsables', icon: '', category: 'Ranking' }
];

const ECRDashboardPowerBI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme: t } = useTheme();

  // Check if user is admin (using centralized utility)
  const isAdmin = isUserAdmin(user);

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [ecrs, setEcrs] = useState([]);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetCatalog, setShowWidgetCatalog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    clientId: '',
    department: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Convert string values to numbers for Recharts
  const convertToNumbers = (data) => {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        value: parseInt(item.value) || 0,
        count: parseInt(item.count) || 0,
        created: parseInt(item.created) || 0,
        approved: parseInt(item.approved) || 0,
        rejected: parseInt(item.rejected) || 0,
        closed: parseInt(item.closed) || 0
      }));
    }
    return data;
  };

  // Load dashboard stats and ECR list
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      // Load stats and ECR list in parallel
      const [statsResponse, ecrsResponse] = await Promise.all([
        ecrService.getDashboardStats(filters),
        ecrService.getAllECRs()
      ]);

      if (statsResponse.success) {
        // Convert string values to numbers
        const data = statsResponse.data;
        setStats({
          ...data,
          trends: convertToNumbers(data.trends),
          byType: convertToNumbers(data.byType),
          byCategory: convertToNumbers(data.byCategory),
          byPriority: convertToNumbers(data.byPriority),
          byStatus: convertToNumbers(data.byStatus),
          topClients: convertToNumbers(data.topClients),
          topAreas: convertToNumbers(data.topAreas),
          topResponsibles: convertToNumbers(data.topResponsibles)
        });
      }
      if (ecrsResponse.success) {
        setEcrs(ecrsResponse.ecrs || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load user's dashboard config
  const loadConfig = useCallback(async () => {
    try {
      const response = await ecrService.getDashboardConfig();
      if (response.success && response.config?.config?.widgets) {
        setWidgets(response.config.config.widgets);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      // Use default widgets if no config
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadConfig();
  }, [loadStats, loadConfig]);

  // Delete ECR (admin only)
  const handleDeleteECR = async (ecrId) => {
    try {
      await ecrService.deleteECR(ecrId);
      // Reload data after deletion
      loadStats();
    } catch (error) {
      console.error('Error deleting ECR:', error);
      throw error;
    }
  };

  // Save configuration
  const saveConfig = async () => {
    try {
      await ecrService.saveDashboardConfig({ widgets });
      setHasChanges(false);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  // Reset to default
  const resetConfig = async () => {
    if (window.confirm('Esto restaurara el dashboard a su configuracion por defecto. Continuar?')) {
      setWidgets(DEFAULT_WIDGETS);
      setHasChanges(true);
    }
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Add widget
  const addWidget = (widgetType) => {
    const catalogItem = WIDGET_CATALOG.find(w => w.type === widgetType);
    if (catalogItem) {
      const newWidget = {
        id: `w${Date.now()}`,
        type: catalogItem.type,
        title: catalogItem.title,
        icon: catalogItem.icon
      };
      setWidgets([...widgets, newWidget]);
      setHasChanges(true);
      setShowWidgetCatalog(false);
    }
  };

  // Remove widget
  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    setHasChanges(true);
  };

  // Render widget content based on type
  const renderWidgetContent = (widget) => {
    if (!stats) return <div style={styles.loadingWidget}>Cargando...</div>;

    const { kpis, trends, byType, byCategory, byPriority, byStatus, adoption, riskMatrix, topClients, topAreas, topResponsibles } = stats;

    switch (widget.type) {
      // KPIs
      case 'kpi_total':
        return <KPICard value={kpis?.total || 0} label="Total ECRs" icon={<FileText size={24} color="#0072CE" />} color="#0072CE" />;
      case 'kpi_open':
        return <KPICard value={kpis?.open || 0} label="ECRs Abiertos" icon={<Clock size={24} color="#C77700" />} color="#C77700" />;
      case 'kpi_approved':
        return <KPICard value={kpis?.approved || 0} label="ECRs Aprobados" icon={<CheckCircle size={24} color="#2E7D32" />} color="#2E7D32" />;
      case 'kpi_rejected':
        return <KPICard value={kpis?.rejected || 0} label="ECRs Rechazados" icon={<XCircle size={24} color="#ef4444" />} color="#ef4444" />;
      case 'kpi_avg_time':
        return <KPICard value={kpis?.avgApprovalDays || 0} label="Tiempo Promedio" icon={<Clock size={24} color="#8b5cf6" />} color="#8b5cf6" format="days" decimals={1} />;
      case 'kpi_effectiveness':
        return <KPICard value={kpis?.effectivenessRate || 0} label="Tasa Efectividad" icon={<Target size={24} color="#ec4899" />} color="#ec4899" format="percentage" decimals={1} />;

      // Charts
      case 'chart_trend':
        return (
          <ChartWidget
            type="line"
            data={trends || []}
            xAxisKey="monthLabel"
            lines={[
              { key: 'created', color: '#0072CE', name: 'Creados' },
              { key: 'approved', color: '#2E7D32', name: 'Aprobados' },
              { key: 'rejected', color: '#ef4444', name: 'Rechazados' }
            ]}
            height={200}
          />
        );
      case 'chart_by_type':
        return (
          <ChartWidget
            type="donut"
            data={byType || []}
            height={200}
          />
        );
      case 'chart_by_category':
        return (
          <ChartWidget
            type="horizontalBar"
            data={byCategory || []}
            height={200}
          />
        );
      case 'chart_by_priority':
        return (
          <ChartWidget
            type="pie"
            data={byPriority || []}
            colorMap="priority"
            height={200}
          />
        );
      case 'chart_by_status':
        return (
          <ChartWidget
            type="bar"
            data={byStatus || []}
            colorMap="status"
            height={200}
            showLegend={false}
          />
        );
      case 'chart_adoption':
        return <AdoptionWidget adoption={adoption} />;

      // Heatmap
      case 'heatmap_risk':
        return <RiskHeatmapWidget riskMatrix={riskMatrix} />;

      // Financial
      case 'financial_impact':
        return <FinancialWidget data={stats?.financialImpact} />;

      // Rankings
      case 'ranking_clients':
        return <RankingWidget data={topClients} nameKey="name" valueKey="count" color="#0072CE" />;
      case 'ranking_areas':
        return <RankingWidget data={topAreas} nameKey="name" valueKey="count" color="#2E7D32" />;
      case 'ranking_responsibles':
        return <RankingWidget data={topResponsibles} nameKey="name" valueKey="count" color="#8b5cf6" />;

      // Table (handled separately below the grid)
      case 'table_detail':
        return null; // Table is rendered separately

      default:
        return <div style={styles.unknownWidget}>Widget no configurado: {widget.type}</div>;
    }
  };

  // Get widget size class
  const getWidgetSize = (type) => {
    if (type.startsWith('kpi_')) return 'small';
    if (type.startsWith('ranking_')) return 'medium';
    if (type === 'chart_adoption') return 'wide';
    if (type === 'chart_trend') return 'wide';
    if (type === 'financial_impact') return 'medium';
    return 'medium';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      padding: '24px'
    },
    header: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: t.accent,
      cursor: 'pointer',
      fontSize: '14px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: t.text,
      margin: 0
    },
    headerActions: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    primaryButton: {
      backgroundColor: t.accent,
      color: t.bgCard
    },
    secondaryButton: {
      backgroundColor: t.bg,
      color: t.textMuted,
      border: `1px solid ${t.border}`
    },
    successButton: {
      backgroundColor: '#2E7D32',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#fee2e2',
      color: '#ef4444'
    },
    filterBar: {
      backgroundColor: t.bgCard,
      borderRadius: '12px',
      padding: '16px 24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    filterLabel: {
      fontSize: '11px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase'
    },
    filterInput: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${t.border}`,
      fontSize: '13px',
      minWidth: '150px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    widgetGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '16px'
    },
    widgetSmall: {
      gridColumn: 'span 1'
    },
    widgetMedium: {
      gridColumn: 'span 1'
    },
    widgetWide: {
      gridColumn: 'span 2'
    },
    loadingWidget: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: t.textMuted
    },
    unknownWidget: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#ef4444',
      fontSize: '12px'
    },
    editModeBar: {
      backgroundColor: '#dbeafe',
      borderRadius: '12px',
      padding: '12px 24px',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: `2px dashed ${t.accent}`
    },
    editModeText: {
      color: t.primary,
      fontWeight: '600',
      fontSize: '14px'
    },
    catalogModal: {
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
    catalogContent: {
      backgroundColor: t.bgCard,
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    },
    catalogHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    catalogTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: t.text
    },
    catalogGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: '12px'
    },
    catalogItem: {
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s',
      backgroundColor: t.bgCard
    },
    catalogItemIcon: {
      fontSize: '24px',
      marginBottom: '8px'
    },
    catalogItemTitle: {
      fontSize: '12px',
      fontWeight: '500',
      color: t.textMuted
    },
    catalogCategory: {
      marginBottom: '16px'
    },
    catalogCategoryTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: t.textMuted,
      textTransform: 'uppercase',
      marginBottom: '8px'
    }
  };

  // Group catalog by category
  const catalogByCategory = WIDGET_CATALOG.reduce((acc, widget) => {
    if (!acc[widget.category]) acc[widget.category] = [];
    acc[widget.category].push(widget);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            ← Volver
          </button>
          <h1 style={styles.title}>ECR Dashboard</h1>
        </div>

        <div style={styles.headerActions}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
          </button>

          {!isEditMode ? (
            <>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => setIsEditMode(true)}
              >
                <Settings size={16} />
                Personalizar
              </button>
              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={() => navigate('/ecr-workflow')}
              >
                <Plus size={16} />
                Nuevo ECR
              </button>
            </>
          ) : (
            <>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => setShowWidgetCatalog(true)}
              >
                <Plus size={16} />
                Agregar Widget
              </button>
              <button
                style={{ ...styles.button, ...styles.dangerButton }}
                onClick={resetConfig}
              >
                <RotateCcw size={16} />
                Restaurar
              </button>
              {hasChanges && (
                <button
                  style={{ ...styles.button, ...styles.primaryButton }}
                  onClick={saveConfig}
                >
                  <Save size={16} />
                  Guardar
                </button>
              )}
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => {
                  setIsEditMode(false);
                  if (hasChanges) {
                    loadConfig(); // Reload original config
                    setHasChanges(false);
                  }
                }}
              >
                <X size={16} />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Desde</label>
            <input
              type="date"
              style={styles.filterInput}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Hasta</label>
            <input
              type="date"
              style={styles.filterInput}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Departamento</label>
            <select
              style={styles.filterInput}
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            >
              <option value="">Todos</option>
              {stats?.filters?.departments?.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <button
            style={{ ...styles.button, ...styles.primaryButton, alignSelf: 'flex-end' }}
            onClick={loadStats}
          >
            Aplicar Filtros
          </button>
          <button
            style={{ ...styles.button, ...styles.secondaryButton, alignSelf: 'flex-end' }}
            onClick={() => {
              setFilters({ startDate: '', endDate: '', clientId: '', department: '' });
            }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Edit Mode Bar */}
      {isEditMode && (
        <div style={styles.editModeBar}>
          <span style={styles.editModeText}>
            Modo Edicion: Arrastra los widgets para reorganizar, o usa los botones para agregar/eliminar
          </span>
        </div>
      )}

      {/* Widget Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Cargando dashboard...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div style={styles.widgetGrid}>
              {widgets.map((widget) => {
                const size = getWidgetSize(widget.type);
                const widgetStyle = size === 'wide' ? styles.widgetWide :
                                   size === 'small' ? styles.widgetSmall :
                                   styles.widgetMedium;

                return (
                  <div key={widget.id} style={widgetStyle}>
                    <DashboardWidget
                      id={widget.id}
                      title={widget.title}
                      icon={widget.icon}
                      isEditMode={isEditMode}
                      onRemove={removeWidget}
                      style={{ minHeight: size === 'small' ? '150px' : '280px' }}
                    >
                      {renderWidgetContent(widget)}
                    </DashboardWidget>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ECR Table Section */}
      {!loading && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px 24px',
          marginTop: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
               Lista de ECRs
            </h2>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {ecrs.length} registros
            </span>
          </div>
          <ECRTableWidget
            ecrs={ecrs}
            loading={loading}
            isAdmin={isAdmin}
            onDelete={handleDeleteECR}
          />
        </div>
      )}

      {/* Widget Catalog Modal */}
      {showWidgetCatalog && (
        <div style={styles.catalogModal} onClick={() => setShowWidgetCatalog(false)}>
          <div style={styles.catalogContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.catalogHeader}>
              <h2 style={styles.catalogTitle}>Agregar Widget</h2>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => setShowWidgetCatalog(false)}
              >
                <X size={16} />
              </button>
            </div>

            {Object.entries(catalogByCategory).map(([category, items]) => (
              <div key={category} style={styles.catalogCategory}>
                <div style={styles.catalogCategoryTitle}>{category}</div>
                <div style={styles.catalogGrid}>
                  {items.map((item) => (
                    <div
                      key={item.type}
                      style={styles.catalogItem}
                      onClick={() => addWidget(item.type)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F4F6F8';
                        e.currentTarget.style.borderColor = '#0072CE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E6EAEE';
                      }}
                    >
                      <div style={styles.catalogItemIcon}>{item.icon}</div>
                      <div style={styles.catalogItemTitle}>{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ECRDashboardPowerBI;
