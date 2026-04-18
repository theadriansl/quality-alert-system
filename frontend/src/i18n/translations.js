// =====================================================
// ARCHIVO: frontend/src/i18n/translations.js
// Sistema de traducciones Inglés/Español para 8D
// =====================================================

export const translations = {
  en: {
    // Header y navegación
    systemName: '8D Problem Solving System',
    dashboard: 'Dashboard',
    welcome: 'Welcome',
    logout: 'Logout',
    language: 'Language',
    
    // Roles y jerarquías
    roles: {
      Champion: 'Quality Director',
      Manager: 'Quality Manager', 
      Engineer: 'Quality Engineer',
      Technician: 'Quality Technician'
    },
    
    // Dashboard principal
    totalReports: 'Total 8D Reports',
    activeReports: 'Active Reports',
    closedReports: 'Closed Reports',
    overdueReports: 'Overdue Reports',
    highSeverity: 'High Severity',
    estimatedCost: 'Estimated Cost',
    
    // Estados y severidad
    severity: {
      High: 'High',
      Medium: 'Medium', 
      Low: 'Low'
    },
    
    // 8D Steps
    steps: {
      D1: 'D1 - Team Formation',
      D2: 'D2 - Problem Description',
      D3: 'D3 - Containment Actions',
      D4: 'D4 - Root Cause Analysis',
      D5: 'D5 - Corrective Actions',
      D6: 'D6 - Implementation',
      D7: 'D7 - Prevention',
      D8: 'D8 - Team Recognition'
    },
    
    // Status
    status: {
      'D1 - Team Formation': 'D1 - Team Formation',
      'D2 - Problem Description': 'D2 - Problem Description',
      'D3 - Containment': 'D3 - Containment Actions',
      'D4 - Root Cause Analysis': 'D4 - Root Cause Analysis',
      'D5 - Corrective Actions': 'D5 - Corrective Actions',
      'D6 - Implementation': 'D6 - Implementation',
      'D7 - Prevention': 'D7 - Prevention Actions',
      'D8 - Closed': 'D8 - Closed'
    },
    
    // Acciones y botones
    create: 'Create',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    approve: 'Approve',
    reject: 'Reject',
    assign: 'Assign',
    escalate: 'Escalate',
    view: 'View',
    download: 'Download',
    export: 'Export',
    
    // Formularios 8D
    reportId: 'Report ID',
    title: 'Title',
    customer: 'Customer',
    partNumber: 'Part Number',
    dateOpened: 'Date Opened',
    targetClose: 'Target Close Date',
    teamLeader: 'Team Leader',
    assignedTo: 'Assigned To',
    description: 'Description',
    
    // Métricas y reportes
    performance: 'Performance',
    metrics: 'Metrics',
    reports: 'Reports',
    analytics: 'Analytics',
    trends: 'Trends',
    
    // Permisos y acceso
    permissions: 'Permissions',
    accessLevel: 'Access Level',
    hierarchyLevel: 'Hierarchy Level',
    
    // Notificaciones
    notifications: {
      saved: 'Successfully saved',
      updated: 'Successfully updated',
      deleted: 'Successfully deleted',
      approved: 'Successfully approved',
      rejected: 'Successfully rejected',
      error: 'An error occurred',
      unauthorized: 'Unauthorized access'
    },
    
    // Tiempo
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    // Comercial
    commercial: {
      valueProposition: 'Professional 8D Management System',
      subtitle: 'Intelligent hierarchies for automotive quality',
      features: 'Key Features',
      pricing: 'Pricing',
      contact: 'Contact Sales'
    }
  },
  
  es: {
    // Header y navegación
    systemName: 'Sistema 8D de Solución de Problemas',
    dashboard: 'Tablero',
    welcome: 'Bienvenido',
    logout: 'Cerrar Sesión',
    language: 'Idioma',
    
    // Roles y jerarquías
    roles: {
      Champion: 'Director de Calidad',
      Manager: 'Gerente de Calidad',
      Engineer: 'Ingeniero de Calidad', 
      Technician: 'Técnico de Calidad'
    },
    
    // Dashboard principal
    totalReports: 'Total Reportes 8D',
    activeReports: 'Reportes Activos',
    closedReports: 'Reportes Cerrados',
    overdueReports: 'Reportes Vencidos',
    highSeverity: 'Severidad Alta',
    estimatedCost: 'Costo Estimado',
    
    // Estados y severidad
    severity: {
      High: 'Alta',
      Medium: 'Media',
      Low: 'Baja'
    },
    
    // 8D Steps
    steps: {
      D1: 'D1 - Formación del Equipo',
      D2: 'D2 - Descripción del Problema', 
      D3: 'D3 - Acciones de Contención',
      D4: 'D4 - Análisis de Causa Raíz',
      D5: 'D5 - Acciones Correctivas',
      D6: 'D6 - Implementación',
      D7: 'D7 - Prevención',
      D8: 'D8 - Reconocimiento del Equipo'
    },
    
    // Status
    status: {
      'D1 - Team Formation': 'D1 - Formación del Equipo',
      'D2 - Problem Description': 'D2 - Descripción del Problema',
      'D3 - Containment': 'D3 - Acciones de Contención',
      'D4 - Root Cause Analysis': 'D4 - Análisis de Causa Raíz',
      'D5 - Corrective Actions': 'D5 - Acciones Correctivas',
      'D6 - Implementation': 'D6 - Implementación',
      'D7 - Prevention': 'D7 - Acciones Preventivas',
      'D8 - Closed': 'D8 - Cerrado'
    },
    
    // Acciones y botones
    create: 'Crear',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    assign: 'Asignar',
    escalate: 'Escalar',
    view: 'Ver',
    download: 'Descargar',
    export: 'Exportar',
    
    // Formularios 8D
    reportId: 'ID del Reporte',
    title: 'Título',
    customer: 'Cliente',
    partNumber: 'Número de Parte',
    dateOpened: 'Fecha de Apertura',
    targetClose: 'Fecha Meta de Cierre',
    teamLeader: 'Líder del Equipo',
    assignedTo: 'Asignado A',
    description: 'Descripción',
    
    // Métricas y reportes
    performance: 'Rendimiento',
    metrics: 'Métricas',
    reports: 'Reportes',
    analytics: 'Análisis',
    trends: 'Tendencias',
    
    // Permisos y acceso
    permissions: 'Permisos',
    accessLevel: 'Nivel de Acceso',
    hierarchyLevel: 'Nivel Jerárquico',
    
    // Notificaciones
    notifications: {
      saved: 'Guardado exitosamente',
      updated: 'Actualizado exitosamente',
      deleted: 'Eliminado exitosamente',
      approved: 'Aprobado exitosamente',
      rejected: 'Rechazado exitosamente',
      error: 'Ocurrió un error',
      unauthorized: 'Acceso no autorizado'
    },
    
    // Tiempo
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    
    // Comercial
    commercial: {
      valueProposition: 'Sistema Profesional de Gestión 8D',
      subtitle: 'Jerarquías inteligentes para calidad automotriz',
      features: 'Características Principales',
      pricing: 'Precios',
      contact: 'Contactar Ventas'
    }
  }
};

// Hook personalizado para traducciones
export const useTranslation = (language = 'es') => {
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key; // Si no encuentra la traducción, devuelve la key
  };
  
  return { t };
};

// Función auxiliar para obtener traducción directa
export const translate = (key, language = 'es') => {
  const keys = key.split('.');
  let value = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};