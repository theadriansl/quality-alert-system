const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Usuarios con roles específicos para 8D
const users = [
  {
    id: 1,
    email: 'admin@8dsystem.com',
    password: 'password123',
    name: 'Quality Director',
    role: 'Champion',
    department: 'Quality Management',
    phone: '+52-442-123-4567',
    permissions: [
      'view_all_8d', 'approve_costly_actions', 'manage_users', 
      'view_executive_reports', 'escalate_to_customer', 'override_decisions',
      'close_8d_reports', 'assign_teams'
    ]
  },
  {
    id: 2,
    email: 'manager@8dsystem.com',
    password: 'password123',
    name: 'Quality Manager',
    role: 'Manager',
    department: 'Quality Engineering',
    phone: '+52-442-234-5678',
    permissions: [
      'view_team_8d', 'assign_team_members', 'approve_actions',
      'coordinate_8d_meetings', 'manage_team_8d', 'escalate_to_director',
      'validate_implementations'
    ]
  },
  {
    id: 3,
    email: 'engineer@8dsystem.com',
    password: 'password123',
    name: 'Quality Engineer',
    role: 'Engineer',
    department: 'Product Engineering',
    phone: '+52-442-345-6789',
    permissions: [
      'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
      'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
      'escalate_to_manager'
    ]
  },
  {
    id: 4,
    email: 'technician@8dsystem.com',
    password: 'password123',
    name: 'Quality Technician',
    role: 'Technician',
    department: 'Quality Control',
    phone: '+52-442-456-7890',
    permissions: [
      'collect_data', 'implement_containment', 'document_evidence',
      'report_findings', 'execute_actions', 'request_support'
    ]
  },
  {
    id: 5,
    email: 'supervisor@8dsystem.com',
    password: 'password123',
    name: 'Production Supervisor',
    role: 'Supervisor',
    department: 'Production',
    phone: '+52-442-567-8901',
    permissions: [
      'supervise_production', 'implement_containment', 'coordinate_teams',
      'escalate_issues', 'approve_process_changes'
    ]
  },
  {
    id: 6,
    email: 'analyst@8dsystem.com',
    password: 'password123',
    name: 'Quality Analyst',
    role: 'Analyst',
    department: 'Quality Engineering',
    phone: '+52-442-678-9012',
    permissions: [
      'analyze_data', 'perform_investigations', 'create_reports',
      'validate_findings', 'support_root_cause'
    ]
  },
  {
    id: 7,
    email: 'john.doe@company.com',
    password: 'password123',
    name: 'John Doe',
    role: 'Champion',
    department: 'Quality Management',
    phone: '+52-555-0001',
    permissions: [
      'view_all_8d', 'approve_costly_actions', 'manage_users',
      'view_executive_reports', 'escalate_to_customer', 'override_decisions',
      'close_8d_reports', 'assign_teams'
    ]
  },
  {
    id: 8,
    email: 'maria.garcia@company.com',
    password: 'password123',
    name: 'María García',
    role: 'Manager',
    department: 'Quality Engineering',
    phone: '+52-555-0002',
    permissions: [
      'view_team_8d', 'assign_team_members', 'approve_actions',
      'coordinate_8d_meetings', 'manage_team_8d', 'escalate_to_director',
      'validate_implementations'
    ]
  },
  {
    id: 9,
    email: 'carlos.lopez@company.com',
    password: 'password123',
    name: 'Carlos López',
    role: 'Engineer',
    department: 'Quality Engineering',
    phone: '+52-555-0003',
    permissions: [
      'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
      'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
      'escalate_to_manager'
    ]
  },
  {
    id: 10,
    email: 'ana.martinez@company.com',
    password: 'password123',
    name: 'Ana Martínez',
    role: 'Technician',
    department: 'Quality Control',
    phone: '+52-555-0004',
    permissions: [
      'collect_data', 'implement_containment', 'document_evidence',
      'report_findings', 'execute_actions', 'request_support'
    ]
  },
  {
    id: 11,
    email: 'luis.rodriguez@company.com',
    password: 'password123',
    name: 'Luis Rodríguez',
    role: 'Engineer',
    department: 'Quality Engineering',
    phone: '+52-555-0005',
    permissions: [
      'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
      'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
      'escalate_to_manager'
    ]
  },
  {
    id: 12,
    email: 'sofia.hernandez@company.com',
    password: 'password123',
    name: 'Sofía Hernández',
    role: 'Manager',
    department: 'Quality Control',
    phone: '+52-555-0006',
    permissions: [
      'view_team_8d', 'assign_team_members', 'approve_actions',
      'coordinate_8d_meetings', 'manage_team_8d', 'escalate_to_director',
      'validate_implementations'
    ]
  },
  {
    id: 13,
    email: 'pedro.sanchez@company.com',
    password: 'password123',
    name: 'Pedro Sánchez',
    role: 'Technician',
    department: 'Production',
    phone: '+52-555-0007',
    permissions: [
      'collect_data', 'implement_containment', 'document_evidence',
      'report_findings', 'execute_actions', 'request_support'
    ]
  },
  {
    id: 14,
    email: 'carmen.flores@company.com',
    password: 'password123',
    name: 'Carmen Flores',
    role: 'Engineer',
    department: 'Engineering',
    phone: '+52-555-0008',
    permissions: [
      'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
      'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
      'escalate_to_manager'
    ]
  }
];

// Datos simulados de 8Ds para demonstración
const sample8Ds = [
  // REPORTES ABIERTOS (12)
  {
    id: '8D-2025-001',
    title: 'Engine Block Porosity Issue',
    customer: 'Ford Motor Company',
    partNumber: 'FB-ENG-001',
    severity: 'High',
    status: 'D4 - Root Cause Analysis',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-09-01',
    targetClose: '2025-09-30',
    currentStep: 4,
    assignedTo: ['engineer@8dsystem.com', 'technician@8dsystem.com', 'manager@8dsystem.com'],
    escalationPath: {
      issueAnalyst: 'engineer@8dsystem.com',
      issueApprover: 'manager@8dsystem.com',
      countermeasureResponsible: 'engineer@8dsystem.com',
      countermeasureAnalyst: 'analyst@8dsystem.com',
      confirmationReviewer: 'technician@8dsystem.com',
      finalApprover: 'admin@8dsystem.com'
    },
    estimatedCost: 25000
  },
  {
    id: '8D-2025-002',
    title: 'Paint Adhesion Failure',
    customer: 'GM',
    partNumber: 'GM-BODY-045',
    severity: 'Medium',
    status: 'D6 - Implementation',
    teamLeader: 'manager@8dsystem.com',
    dateOpened: '2025-08-15',
    targetClose: '2025-09-15',
    currentStep: 6,
    assignedTo: ['manager@8dsystem.com', 'engineer@8dsystem.com', 'analyst@8dsystem.com'],
    escalationPath: {
      issueAnalyst: 'analyst@8dsystem.com',
      issueApprover: 'manager@8dsystem.com',
      countermeasureResponsible: 'manager@8dsystem.com',
      countermeasureAnalyst: 'engineer@8dsystem.com',
      confirmationReviewer: 'technician@8dsystem.com',
      finalApprover: 'admin@8dsystem.com'
    },
    estimatedCost: 8500
  },
  {
    id: '8D-2025-004',
    title: 'Brake Pad Material Contamination',
    customer: 'Toyota Motor Manufacturing',
    partNumber: 'TM-BRK-234',
    severity: 'High',
    status: 'D3 - Interim Containment Action',
    teamLeader: 'manager@8dsystem.com',
    dateOpened: '2025-08-20',
    targetClose: '2025-10-15',
    currentStep: 3,
    assignedTo: ['manager@8dsystem.com', 'technician@8dsystem.com', 'supervisor@8dsystem.com'],
    escalationPath: {
      issueAnalyst: 'technician@8dsystem.com',
      issueApprover: 'manager@8dsystem.com',
      countermeasureResponsible: 'supervisor@8dsystem.com',
      countermeasureAnalyst: 'engineer@8dsystem.com',
      confirmationReviewer: 'analyst@8dsystem.com',
      finalApprover: 'admin@8dsystem.com'
    },
    estimatedCost: 35000
  },
  {
    id: '8D-2025-005',
    title: 'Transmission Gear Noise',
    customer: 'Honda Manufacturing',
    partNumber: 'HM-TRN-567',
    severity: 'Medium',
    status: 'D5 - Corrective Actions',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-08-25',
    targetClose: '2025-11-01',
    currentStep: 5,
    assignedTo: ['engineer@8dsystem.com', 'technician@8dsystem.com'],
    estimatedCost: 18500
  },
  {
    id: '8D-2025-006',
    title: 'ECU Software Bug - Airbag System',
    customer: 'BMW Group',
    partNumber: 'BMW-ECU-890',
    severity: 'High',
    status: 'D2 - Define Problem',
    teamLeader: 'admin@8dsystem.com',
    dateOpened: '2025-09-05',
    targetClose: '2025-10-20',
    currentStep: 2,
    assignedTo: ['admin@8dsystem.com', 'engineer@8dsystem.com'],
    estimatedCost: 45000
  },
  {
    id: '8D-2025-007',
    title: 'Plastic Housing Crack Under Heat',
    customer: 'Volkswagen Group',
    partNumber: 'VW-PLT-445',
    severity: 'Low',
    status: 'D4 - Root Cause Analysis',
    teamLeader: 'technician@8dsystem.com',
    dateOpened: '2025-08-30',
    targetClose: '2025-10-30',
    currentStep: 4,
    assignedTo: ['technician@8dsystem.com', 'engineer@8dsystem.com'],
    estimatedCost: 12000
  },
  {
    id: '8D-2025-008',
    title: 'Seat Belt Buckle Malfunction',
    customer: 'Nissan Motor Company',
    partNumber: 'NM-SBT-678',
    severity: 'High',
    status: 'D1 - Team Formation',
    teamLeader: 'manager@8dsystem.com',
    dateOpened: '2025-09-10',
    targetClose: '2025-11-05',
    currentStep: 1,
    assignedTo: ['manager@8dsystem.com'],
    estimatedCost: 28000
  },
  {
    id: '8D-2025-009',
    title: 'Dashboard Display Flickering',
    customer: 'Audi AG',
    partNumber: 'AD-DSP-123',
    severity: 'Medium',
    status: 'D3 - Interim Containment Action',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-09-08',
    targetClose: '2025-10-25',
    currentStep: 3,
    assignedTo: ['engineer@8dsystem.com', 'technician@8dsystem.com'],
    estimatedCost: 15500
  },
  {
    id: '8D-2025-010',
    title: 'Fuel Injector Clogging',
    customer: 'Hyundai Motor Group',
    partNumber: 'HG-FI-789',
    severity: 'Medium',
    status: 'D5 - Corrective Actions',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-08-28',
    targetClose: '2025-10-15',
    currentStep: 5,
    assignedTo: ['engineer@8dsystem.com', 'manager@8dsystem.com'],
    estimatedCost: 22000
  },
  {
    id: '8D-2025-011',
    title: 'Door Handle Spring Tension Issue',
    customer: 'Kia Corporation',
    partNumber: 'KIA-DH-345',
    severity: 'Low',
    status: 'D6 - Implementation',
    teamLeader: 'technician@8dsystem.com',
    dateOpened: '2025-08-22',
    targetClose: '2025-11-10',
    currentStep: 6,
    assignedTo: ['technician@8dsystem.com', 'engineer@8dsystem.com'],
    estimatedCost: 9500
  },
  {
    id: '8D-2025-012',
    title: 'Air Conditioning Compressor Noise',
    customer: 'Mazda Motor Corporation',
    partNumber: 'MZ-AC-567',
    severity: 'Medium',
    status: 'D4 - Root Cause Analysis',
    teamLeader: 'manager@8dsystem.com',
    dateOpened: '2025-09-03',
    targetClose: '2025-10-28',
    currentStep: 4,
    assignedTo: ['manager@8dsystem.com', 'technician@8dsystem.com'],
    estimatedCost: 16800
  },
  {
    id: '8D-2025-013',
    title: 'Mirror Housing Vibration',
    customer: 'Subaru Corporation',
    partNumber: 'SB-MH-890',
    severity: 'Low',
    status: 'D7 - Preventive Actions',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-08-18',
    targetClose: '2025-10-20',
    currentStep: 7,
    assignedTo: ['engineer@8dsystem.com', 'technician@8dsystem.com'],
    estimatedCost: 11200
  },

  // REPORTES CERRADOS (6)
  {
    id: '8D-2025-003',
    title: 'Dimensional Out of Spec',
    customer: 'Stellantis',
    partNumber: 'ST-GEAR-089',
    severity: 'Low',
    status: 'D8 - Closed',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-07-10',
    targetClose: '2025-08-10',
    currentStep: 8,
    assignedTo: ['technician@8dsystem.com'],
    estimatedCost: 3200
  },
  {
    id: '8D-2025-014',
    title: 'Window Regulator Failure',
    customer: 'Tesla Inc',
    partNumber: 'TS-WR-123',
    severity: 'Medium',
    status: 'D8 - Closed',
    teamLeader: 'manager@8dsystem.com',
    dateOpened: '2025-07-05',
    targetClose: '2025-08-15',
    currentStep: 8,
    assignedTo: ['manager@8dsystem.com', 'engineer@8dsystem.com'],
    estimatedCost: 14500
  },
  {
    id: '8D-2025-015',
    title: 'Headlight Condensation',
    customer: 'Mercedes-Benz AG',
    partNumber: 'MB-HL-456',
    severity: 'Low',
    status: 'D8 - Closed',
    teamLeader: 'technician@8dsystem.com',
    dateOpened: '2025-06-20',
    targetClose: '2025-07-25',
    currentStep: 8,
    assignedTo: ['technician@8dsystem.com'],
    estimatedCost: 8200
  },
  {
    id: '8D-2025-016',
    title: 'Steering Wheel Vibration',
    customer: 'Volvo Cars',
    partNumber: 'VC-SW-789',
    severity: 'Medium',
    status: 'D8 - Closed',
    teamLeader: 'engineer@8dsystem.com',
    dateOpened: '2025-06-15',
    targetClose: '2025-07-20',
    currentStep: 8,
    assignedTo: ['engineer@8dsystem.com', 'manager@8dsystem.com'],
    estimatedCost: 19800
  },
  {
    id: '8D-2025-017',
    title: 'USB Port Connection Issue',
    customer: 'Jaguar Land Rover',
    partNumber: 'JLR-USB-234',
    severity: 'Low',
    status: 'D8 - Closed',
    teamLeader: 'technician@8dsystem.com',
    dateOpened: '2025-06-10',
    targetClose: '2025-07-15',
    currentStep: 8,
    assignedTo: ['technician@8dsystem.com'],
    estimatedCost: 5600
  },
  {
    id: '8D-2025-018',
    title: 'Battery Drainage Issue',
    customer: 'Porsche AG',
    partNumber: 'POR-BAT-567',
    severity: 'High',
    status: 'D8 - Closed',
    teamLeader: 'admin@8dsystem.com',
    dateOpened: '2025-05-25',
    targetClose: '2025-07-10',
    currentStep: 8,
    assignedTo: ['admin@8dsystem.com', 'engineer@8dsystem.com'],
    estimatedCost: 32000
  }
];

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const hierarchyRoutes = require('./routes/hierarchy');

// Nuevas rutas específicas para 8D
// const eightDRoutes = require('./routes/8d'); // Crearemos esto después

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      authentication: 'active',
      hierarchySystem: 'active',
      eightDSystem: 'active'
    },
    system: {
      name: '8D Problem Solving System',
      version: '1.0.0',
      activeUsers: users.length,
      active8Ds: sample8Ds.filter(d => d.status !== 'D8 - Closed').length,
      closed8Ds: sample8Ds.filter(d => d.status === 'D8 - Closed').length
    },
    hierarchy: {
      levels: ['Champion', 'Manager', 'Engineer', 'Technician'],
      rolesActive: users.length,
      permissionSystemActive: true
    }
  };
  
  console.log('🏥 Health check requested:', healthData);
  res.json(healthData);
});

// Endpoint temporal para obtener 8Ds (mientras creamos la ruta completa)
app.get('/8d/dashboard-data', (req, res) => {
  res.json({
    success: true,
    data: {
      total8Ds: sample8Ds.length,
      active8Ds: sample8Ds.filter(d => d.status !== 'D8 - Closed').length,
      closed8Ds: sample8Ds.filter(d => d.status === 'D8 - Closed').length,
      highSeverity: sample8Ds.filter(d => d.severity === 'High').length,
      mediumSeverity: sample8Ds.filter(d => d.severity === 'Medium').length,
      lowSeverity: sample8Ds.filter(d => d.severity === 'Low').length,
      overdue: sample8Ds.filter(d => new Date(d.targetClose) < new Date()).length,
      recent8Ds: sample8Ds,
      totalEstimatedCost: sample8Ds.reduce((sum, d) => sum + d.estimatedCost, 0),
      avgProgress: Math.round(sample8Ds.reduce((sum, d) => sum + (d.currentStep / 8 * 100), 0) / sample8Ds.length)
    }
  });
});

// Endpoint para obtener usuarios para escalation
app.get('/users/list', (req, res) => {
  // Retornar usuarios sin passwords
  const safeUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    phone: user.phone,
    permissions: user.permissions
  }));

  res.json({
    success: true,
    users: safeUsers
  });
});

// ============================================
// NUEVOS MÓDULOS - QUALITY ALERT SYSTEM
// ============================================

// Datos de ejemplo para Auditorías
const audits = [
  {
    id: 1,
    type: 'Interna',
    title: 'Auditoría ISO 9001 - Producción',
    auditDate: '2025-11-15',
    status: 'Programada',
    auditor: 'Quality Manager',
    auditee: 'Production Supervisor',
    area: 'Producción',
    findings: [],
    score: null
  },
  {
    id: 2,
    type: 'Externa',
    title: 'Auditoría Cliente - Proceso de Soldadura',
    auditDate: '2025-11-01',
    status: 'Completada',
    auditor: 'Quality Director',
    auditee: 'Quality Engineer',
    area: 'Soldadura',
    findings: [
      { severity: 'Mayor', description: 'Falta calibración de equipo de medición' },
      { severity: 'Menor', description: 'Documentación incompleta en hoja de proceso' }
    ],
    score: 85
  }
];

// Datos de ejemplo para Hojas de Operación
const operationSheets = [
  {
    id: 1,
    title: 'Hoja de Operación - Ensamble Motor',
    process: 'Ensamble',
    version: '1.2',
    status: 'Aprobada',
    createdBy: 'Quality Engineer',
    approvedBy: 'Quality Manager',
    createdDate: '2025-10-15',
    approvedDate: '2025-10-20',
    steps: [
      { step: 1, description: 'Verificar componentes', time: '5 min', tools: ['Calibrador'] },
      { step: 2, description: 'Ensamblar base', time: '10 min', tools: ['Torquímetro'] }
    ]
  }
];

// Datos de ejemplo para Evaluaciones de Seguridad
const safetyEvaluations = [
  {
    id: 1,
    type: 'Equipo',
    title: 'Evaluación Prensa Hidráulica #3',
    evaluationDate: '2025-10-30',
    status: 'Aprobada',
    evaluator: 'Quality Engineer',
    area: 'Estampado',
    riskLevel: 'Medio',
    findings: [
      { type: 'Observación', description: 'Guardas en buen estado' },
      { type: 'Recomendación', description: 'Actualizar señalización de seguridad' }
    ],
    nextEvaluation: '2026-01-30'
  },
  {
    id: 2,
    type: 'Instalación',
    title: 'Evaluación Área de Químicos',
    evaluationDate: '2025-10-25',
    status: 'Requiere Acción',
    evaluator: 'Quality Director',
    area: 'Planta Baja - Químicos',
    riskLevel: 'Alto',
    findings: [
      { type: 'No Conformidad', description: 'Regadera de emergencia sin mantenimiento' },
      { type: 'No Conformidad', description: 'Falta kit de derrames' }
    ],
    nextEvaluation: '2025-11-25'
  }
];

// Datos de ejemplo para Clients (Clientes/Proveedores)
const clients = [
  {
    id: 1,
    name: 'Faurecia Sistemas Automotrices SA de CV',
    alias: 'FAUMX',
    vendorNumber: 'AN01274677429',
    corporateAddress: '4006 S 23rd Street, Phoenix, AZ',
    corporatePhone: '+1 (937) 492-2708',
    corporateFax: '(000) 000-0000 ext',
    billingAddress: '(FAUMX) Faurecia Sistemas Automotrices SA de CV',
    billingFrequency: 'Weekly',
    billingPeriod: 'Monday to Sunday',
    website: 'http://www.faurecia.com',
    isActive: true,
    requiresSignature: false,
    contacts: [
      { name: 'Juan Perez', title: 'Quality Manager', email: 'juan.perez@faurecia.com', phone: '+52-442-123-4567' },
      { name: 'Maria Rodriguez', title: 'Plant Manager', email: 'maria.rodriguez@faurecia.com', phone: '+52-442-234-5678' }
    ],
    documents: [],
    createdAt: '2024-01-15',
    updatedAt: '2025-10-20'
  },
  {
    id: 2,
    name: 'Gissing North America LLC',
    alias: 'GISSNA',
    vendorNumber: '',
    corporateAddress: '1234 Industrial Blvd, Detroit, MI',
    corporatePhone: '+1 (313) 555-0100',
    corporateFax: '',
    billingAddress: '(GISSNA) Gissing North America LLC',
    billingFrequency: 'Weekly',
    billingPeriod: 'Monday to Sunday',
    website: 'http://www.gissing.com',
    isActive: true,
    requiresSignature: true,
    contacts: [
      { name: 'John Smith', title: 'Quality Director', email: 'john.smith@gissing.com', phone: '+1-313-555-0101' }
    ],
    documents: [],
    createdAt: '2024-03-10',
    updatedAt: '2025-09-15'
  },
  {
    id: 3,
    name: 'Lucid Headquarters',
    alias: 'LCDHQ',
    vendorNumber: '110581',
    corporateAddress: '7373 Gateway Blvd, Newark, CA 94560',
    corporatePhone: '+1 (510) 648-3553',
    corporateFax: '',
    billingAddress: 'Lucid Headquarters',
    billingFrequency: 'Bi-weekly',
    billingPeriod: 'Monday to Sunday',
    website: 'http://www.lucidmotors.com',
    isActive: true,
    requiresSignature: true,
    contacts: [
      { name: 'Sarah Johnson', title: 'VP of Quality', email: 'sarah.johnson@lucidmotors.com', phone: '+1-510-648-3560' },
      { name: 'Michael Chen', title: 'Quality Engineer', email: 'michael.chen@lucidmotors.com', phone: '+1-510-648-3561' }
    ],
    documents: [],
    createdAt: '2024-06-20',
    updatedAt: '2025-10-28'
  },
  {
    id: 4,
    name: 'ElringKlinger Canada Inc',
    alias: 'ELRKLION',
    vendorNumber: '',
    corporateAddress: '123 Auto Parts Way, Windsor, ON',
    corporatePhone: '+1 (519) 255-1234',
    corporateFax: '',
    billingAddress: 'ElringKlinger Canada Inc',
    billingFrequency: 'Monthly',
    billingPeriod: 'First to Last day of month',
    website: 'http://www.elringklinger.ca',
    isActive: true,
    requiresSignature: false,
    contacts: [
      { name: 'David Brown', title: 'Operations Manager', email: 'david.brown@elringklinger.ca', phone: '+1-519-255-1235' }
    ],
    documents: [],
    createdAt: '2024-02-28',
    updatedAt: '2025-08-10'
  },
  {
    id: 5,
    name: 'Mubea de México S de RL de CV',
    alias: 'MUBEACL',
    vendorNumber: '',
    corporateAddress: 'Parque Industrial Queretaro, QRO',
    corporatePhone: '+52-442-345-6789',
    corporateFax: '',
    billingAddress: 'Mubea de México S de RL de CV',
    billingFrequency: 'Weekly',
    billingPeriod: 'Monday to Sunday',
    website: 'http://www.mubea.com',
    isActive: true,
    requiresSignature: false,
    contacts: [
      { name: 'Carlos Martinez', title: 'Plant Manager', email: 'carlos.martinez@mubea.com', phone: '+52-442-345-6790' }
    ],
    documents: [],
    createdAt: '2024-05-05',
    updatedAt: '2025-10-15'
  }
];

// ENDPOINTS - AUDITORÍAS
app.get('/audits/list', (req, res) => {
  res.json({
    success: true,
    audits: audits,
    stats: {
      total: audits.length,
      programadas: audits.filter(a => a.status === 'Programada').length,
      completadas: audits.filter(a => a.status === 'Completada').length,
      avgScore: audits.filter(a => a.score).reduce((sum, a) => sum + a.score, 0) / audits.filter(a => a.score).length || 0
    }
  });
});

app.post('/audits/create', (req, res) => {
  const newAudit = {
    id: audits.length + 1,
    ...req.body,
    findings: [],
    score: null
  };
  audits.push(newAudit);
  res.json({
    success: true,
    audit: newAudit,
    message: 'Auditoría creada exitosamente'
  });
});

// ENDPOINTS - HOJAS DE OPERACIÓN
app.get('/operation-sheets/list', (req, res) => {
  res.json({
    success: true,
    sheets: operationSheets,
    stats: {
      total: operationSheets.length,
      aprobadas: operationSheets.filter(s => s.status === 'Aprobada').length,
      enRevision: operationSheets.filter(s => s.status === 'En Revisión').length
    }
  });
});

app.post('/operation-sheets/create', (req, res) => {
  const newSheet = {
    id: operationSheets.length + 1,
    ...req.body,
    status: 'En Revisión',
    createdDate: new Date().toISOString().split('T')[0]
  };
  operationSheets.push(newSheet);
  res.json({
    success: true,
    sheet: newSheet,
    message: 'Hoja de operación creada exitosamente'
  });
});

// ENDPOINTS - EVALUACIONES DE SEGURIDAD
app.get('/safety/evaluations/list', (req, res) => {
  res.json({
    success: true,
    evaluations: safetyEvaluations,
    stats: {
      total: safetyEvaluations.length,
      aprobadas: safetyEvaluations.filter(e => e.status === 'Aprobada').length,
      requierenAccion: safetyEvaluations.filter(e => e.status === 'Requiere Acción').length,
      riesgoAlto: safetyEvaluations.filter(e => e.riskLevel === 'Alto').length,
      riesgoMedio: safetyEvaluations.filter(e => e.riskLevel === 'Medio').length
    }
  });
});

app.post('/safety/evaluations/create', (req, res) => {
  const newEvaluation = {
    id: safetyEvaluations.length + 1,
    ...req.body,
    evaluationDate: new Date().toISOString().split('T')[0]
  };
  safetyEvaluations.push(newEvaluation);
  res.json({
    success: true,
    evaluation: newEvaluation,
    message: 'Evaluación de seguridad creada exitosamente'
  });
});

// ENDPOINTS - CLIENTS (CLIENTES/PROVEEDORES)
app.get('/clients/list', (req, res) => {
  // Filtrado opcional por búsqueda
  let filteredClients = clients;

  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredClients = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm) ||
      client.alias.toLowerCase().includes(searchTerm) ||
      (client.vendorNumber && client.vendorNumber.toLowerCase().includes(searchTerm))
    );
  }

  // Filtrado por estado activo
  if (req.query.isActive !== undefined) {
    filteredClients = filteredClients.filter(client =>
      client.isActive === (req.query.isActive === 'true')
    );
  }

  res.json({
    success: true,
    clients: filteredClients,
    stats: {
      total: clients.length,
      active: clients.filter(c => c.isActive).length,
      inactive: clients.filter(c => !c.isActive).length,
      withVendorNumber: clients.filter(c => c.vendorNumber).length
    }
  });
});

app.get('/clients/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  res.json({
    success: true,
    client: client
  });
});

app.post('/clients/create', (req, res) => {
  const newClient = {
    id: clients.length + 1,
    ...req.body,
    contacts: req.body.contacts || [],
    documents: req.body.documents || [],
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  };

  clients.push(newClient);

  res.json({
    success: true,
    client: newClient,
    message: 'Cliente creado exitosamente'
  });
});

app.put('/clients/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  clients[clientIndex] = {
    ...clients[clientIndex],
    ...req.body,
    id: clientId, // Mantener el ID original
    updatedAt: new Date().toISOString().split('T')[0]
  };

  res.json({
    success: true,
    client: clients[clientIndex],
    message: 'Cliente actualizado exitosamente'
  });
});

app.delete('/clients/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  const deletedClient = clients.splice(clientIndex, 1)[0];

  res.json({
    success: true,
    client: deletedClient,
    message: 'Cliente eliminado exitosamente'
  });
});

// ============================================================================
// DATA - JOBS (PROYECTOS/TRABAJOS PARA CLIENTES)
// ============================================================================
const jobs = [
  {
    id: 1,
    clientId: 1, // Faurecia
    jobNumber: 'JOB-2024-001',
    jobName: 'Instrument Panel Assembly - Model Y',
    description: 'Assembly and validation of instrument panel for new vehicle platform',
    status: 'Active',
    priority: 'High',
    startDate: '2024-01-15',
    targetEndDate: '2024-12-31',
    actualEndDate: null,
    projectManager: 'John Smith',
    estimatedCost: 450000,
    actualCost: 125000,
    progress: 35,
    location: 'Phoenix Plant',
    scope: 'Full assembly line setup, validation, and production ramp-up',
    deliverables: ['Assembly Line', 'Quality Documentation', 'Training Materials', 'Production Launch'],
    partNumbers: [
      { partNumber: 'IP-ASSY-2024-Y', description: 'Main Instrument Panel Assembly', quantity: 1200 },
      { partNumber: 'IP-BEZEL-001', description: 'Center Console Bezel', quantity: 1200 },
      { partNumber: 'IP-CLUSTER-DIG', description: 'Digital Cluster Display', quantity: 1200 },
      { partNumber: 'IP-AIRBAG-PASS', description: 'Passenger Airbag Module', quantity: 1200 }
    ],
    productionLog: [
      { id: 1, timestamp: '2025-10-30T08:15:00Z', event: 'Production Started', user: 'John Smith', shift: '1st Shift', details: 'Morning shift production started' },
      { id: 2, timestamp: '2025-10-30T10:30:00Z', event: 'Quality Inspection', user: 'Sarah Johnson', shift: '1st Shift', details: 'Routine quality check completed - All OK' },
      { id: 3, timestamp: '2025-10-30T12:45:00Z', event: 'Material Replenishment', user: 'Mike Chen', shift: '1st Shift', details: 'Bezel components restocked' },
      { id: 4, timestamp: '2025-10-30T14:20:00Z', event: 'Minor Issue Resolved', user: 'Sarah Johnson', shift: '2nd Shift', details: 'Adjustment made to fixture alignment' }
    ],
    dailyProduction: {
      date: '2025-10-30',
      shifts: [
        {
          shift: '1st Shift',
          startTime: '06:00',
          endTime: '14:00',
          target: 150,
          actual: 145,
          defects: 3,
          efficiency: 96.7,
          operator: 'Team A'
        },
        {
          shift: '2nd Shift',
          startTime: '14:00',
          endTime: '22:00',
          target: 150,
          actual: 89,
          defects: 1,
          efficiency: 59.3,
          operator: 'Team B'
        },
        {
          shift: '3rd Shift',
          startTime: '22:00',
          endTime: '06:00',
          target: 150,
          actual: 0,
          defects: 0,
          efficiency: 0,
          operator: 'Team C'
        }
      ],
      totalTarget: 450,
      totalActual: 234,
      totalDefects: 4,
      overallEfficiency: 52.0
    },
    risks: [
      { id: 1, description: 'Supplier delay on components', severity: 'Medium', mitigation: 'Alternative supplier identified' },
      { id: 2, description: 'Equipment installation delay', severity: 'High', mitigation: 'Expedited shipping arranged' }
    ],
    milestones: [
      { id: 1, name: 'Design Approval', targetDate: '2024-02-28', status: 'Completed', completedDate: '2024-02-25' },
      { id: 2, name: 'Equipment Installation', targetDate: '2024-05-15', status: 'Completed', completedDate: '2024-05-10' },
      { id: 3, name: 'Production Trial', targetDate: '2024-08-30', status: 'In Progress', completedDate: null },
      { id: 4, name: 'Full Production Launch', targetDate: '2024-12-15', status: 'Pending', completedDate: null }
    ],
    team: [
      { id: 1, name: 'John Smith', role: 'Project Manager', email: 'john.smith@company.com' },
      { id: 2, name: 'Sarah Johnson', role: 'Quality Engineer', email: 'sarah.j@company.com' },
      { id: 3, name: 'Mike Chen', role: 'Production Engineer', email: 'mike.c@company.com' }
    ],
    qualityMetrics: {
      defectRate: 2.3,
      yieldRate: 97.7,
      customerComplaints: 0,
      reworkRate: 1.2
    }
  },
  {
    id: 2,
    clientId: 2, // Nissan
    jobNumber: 'JOB-2024-002',
    jobName: 'Door Panel Manufacturing - Sentra',
    description: 'Manufacturing setup for door panel components',
    status: 'Active',
    priority: 'Medium',
    startDate: '2024-03-01',
    targetEndDate: '2024-11-30',
    actualEndDate: null,
    projectManager: 'Maria Rodriguez',
    estimatedCost: 280000,
    actualCost: 95000,
    progress: 50,
    location: 'Aguascalientes Plant',
    scope: 'Door panel tooling, process validation, and initial production',
    deliverables: ['Tooling Setup', 'Process Documentation', 'First Article Inspection', 'PPAP Package'],
    risks: [
      { id: 1, description: 'Tooling modification required', severity: 'Low', mitigation: 'Budget allocated for changes' }
    ],
    milestones: [
      { id: 1, name: 'Tooling Design', targetDate: '2024-03-30', status: 'Completed', completedDate: '2024-03-28' },
      { id: 2, name: 'PPAP Submission', targetDate: '2024-07-15', status: 'In Progress', completedDate: null },
      { id: 3, name: 'Production Approval', targetDate: '2024-10-30', status: 'Pending', completedDate: null }
    ],
    team: [
      { id: 4, name: 'Maria Rodriguez', role: 'Project Manager', email: 'maria.r@company.com' },
      { id: 5, name: 'Carlos Martinez', role: 'Manufacturing Engineer', email: 'carlos.m@company.com' }
    ],
    qualityMetrics: {
      defectRate: 1.8,
      yieldRate: 98.2,
      customerComplaints: 0,
      reworkRate: 0.9
    }
  },
  {
    id: 3,
    clientId: 1, // Faurecia
    jobNumber: 'JOB-2024-003',
    jobName: 'Seat Assembly Line Upgrade',
    description: 'Modernization of existing seat assembly line with automation',
    status: 'Planning',
    priority: 'Medium',
    startDate: '2024-06-01',
    targetEndDate: '2025-03-31',
    actualEndDate: null,
    projectManager: 'David Lee',
    estimatedCost: 650000,
    actualCost: 0,
    progress: 10,
    location: 'Phoenix Plant',
    scope: 'Automation integration, line balancing, and productivity improvement',
    deliverables: ['Automation System', 'Line Layout', 'Training Program', 'Performance Metrics'],
    risks: [
      { id: 1, description: 'Integration with legacy systems', severity: 'High', mitigation: 'Dedicated IT support team' },
      { id: 2, description: 'Production downtime during upgrade', severity: 'Medium', mitigation: 'Phased implementation plan' }
    ],
    milestones: [
      { id: 1, name: 'Requirements Definition', targetDate: '2024-06-30', status: 'In Progress', completedDate: null },
      { id: 2, name: 'System Design', targetDate: '2024-09-30', status: 'Pending', completedDate: null },
      { id: 3, name: 'Equipment Procurement', targetDate: '2024-12-15', status: 'Pending', completedDate: null },
      { id: 4, name: 'Go-Live', targetDate: '2025-03-15', status: 'Pending', completedDate: null }
    ],
    team: [
      { id: 6, name: 'David Lee', role: 'Project Manager', email: 'david.l@company.com' },
      { id: 7, name: 'Lisa Wang', role: 'Automation Engineer', email: 'lisa.w@company.com' }
    ],
    qualityMetrics: null
  },
  {
    id: 4,
    clientId: 3, // LCD
    jobNumber: 'JOB-2023-045',
    jobName: 'Component Packaging System',
    description: 'Custom packaging solution for electronic components',
    status: 'Completed',
    priority: 'Low',
    startDate: '2023-08-01',
    targetEndDate: '2024-02-28',
    actualEndDate: '2024-02-20',
    projectManager: 'Robert Taylor',
    estimatedCost: 125000,
    actualCost: 118000,
    progress: 100,
    location: 'Querétaro Facility',
    scope: 'Design and implement automated packaging system',
    deliverables: ['Packaging Equipment', 'Operating Procedures', 'Quality Standards', 'Operator Training'],
    risks: [],
    milestones: [
      { id: 1, name: 'Design Review', targetDate: '2023-09-15', status: 'Completed', completedDate: '2023-09-12' },
      { id: 2, name: 'Equipment Installation', targetDate: '2023-12-15', status: 'Completed', completedDate: '2023-12-10' },
      { id: 3, name: 'System Validation', targetDate: '2024-02-15', status: 'Completed', completedDate: '2024-02-15' },
      { id: 4, name: 'Project Closure', targetDate: '2024-02-28', status: 'Completed', completedDate: '2024-02-20' }
    ],
    team: [
      { id: 8, name: 'Robert Taylor', role: 'Project Manager', email: 'robert.t@company.com' },
      { id: 9, name: 'Emily White', role: 'Process Engineer', email: 'emily.w@company.com' }
    ],
    qualityMetrics: {
      defectRate: 0.5,
      yieldRate: 99.5,
      customerComplaints: 0,
      reworkRate: 0.3
    }
  },
  {
    id: 5,
    clientId: 4, // Elring Klinger
    jobNumber: 'JOB-2024-010',
    jobName: 'Gasket Production Line Setup',
    description: 'New production line for high-performance engine gaskets',
    status: 'On Hold',
    priority: 'Low',
    startDate: '2024-02-01',
    targetEndDate: '2024-09-30',
    actualEndDate: null,
    projectManager: 'Thomas Schmidt',
    estimatedCost: 320000,
    actualCost: 45000,
    progress: 15,
    location: 'Toluca Plant',
    scope: 'Production line installation, material qualification, and process validation',
    deliverables: ['Production Equipment', 'Material Specs', 'Process Control Plan', 'FMEA Documentation'],
    risks: [
      { id: 1, description: 'Customer budget freeze', severity: 'High', mitigation: 'Project on hold pending approval' }
    ],
    milestones: [
      { id: 1, name: 'Equipment Selection', targetDate: '2024-03-15', status: 'Completed', completedDate: '2024-03-10' },
      { id: 2, name: 'Site Preparation', targetDate: '2024-05-30', status: 'On Hold', completedDate: null },
      { id: 3, name: 'Installation', targetDate: '2024-08-15', status: 'Pending', completedDate: null }
    ],
    team: [
      { id: 10, name: 'Thomas Schmidt', role: 'Project Manager', email: 'thomas.s@company.com' }
    ],
    qualityMetrics: null
  }
];

// ENDPOINTS - JOBS (PROYECTOS)
app.get('/jobs/list', (req, res) => {
  let filteredJobs = jobs;

  // Filtrar por cliente
  if (req.query.clientId) {
    const clientId = parseInt(req.query.clientId);
    filteredJobs = filteredJobs.filter(job => job.clientId === clientId);
  }

  // Filtrar por estado
  if (req.query.status) {
    filteredJobs = filteredJobs.filter(job => job.status === req.query.status);
  }

  // Búsqueda por texto
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredJobs = filteredJobs.filter(job =>
      job.jobNumber.toLowerCase().includes(searchTerm) ||
      job.jobName.toLowerCase().includes(searchTerm) ||
      job.description.toLowerCase().includes(searchTerm)
    );
  }

  res.json({
    success: true,
    jobs: filteredJobs,
    stats: {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'Active').length,
      completed: jobs.filter(j => j.status === 'Completed').length,
      onHold: jobs.filter(j => j.status === 'On Hold').length,
      planning: jobs.filter(j => j.status === 'Planning').length,
      highPriority: jobs.filter(j => j.priority === 'High').length
    }
  });
});

app.get('/jobs/:id', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  // Buscar información del cliente
  const client = clients.find(c => c.id === job.clientId);
  const jobWithClient = {
    ...job,
    clientName: client ? client.name : 'Unknown Client',
    clientAlias: client ? client.alias : ''
  };

  res.json({
    success: true,
    job: jobWithClient
  });
});

app.post('/jobs/create', (req, res) => {
  const newJob = {
    id: jobs.length + 1,
    ...req.body,
    progress: 0,
    actualCost: 0,
    risks: [],
    team: [],
    qualityMetrics: null
  };

  jobs.push(newJob);

  // Si el job tiene documentos, agregarlos también al cliente con referencia al job
  if (newJob.documents && newJob.documents.length > 0) {
    const client = clients.find(c => c.id === newJob.clientId);
    if (client) {
      // Agregar jobId y jobNumber a cada documento
      const documentsWithJobRef = newJob.documents.map(doc => ({
        ...doc,
        jobId: newJob.id,
        jobNumber: newJob.jobNumber,
        jobName: newJob.jobName
      }));

      // Agregar documentos al cliente
      if (!client.documents) {
        client.documents = [];
      }
      client.documents.push(...documentsWithJobRef);
    }
  }

  res.json({
    success: true,
    job: newJob,
    message: 'Job creado exitosamente'
  });
});

app.put('/jobs/:id', (req, res) => {
  const jobId = parseInt(req.params.id);
  const jobIndex = jobs.findIndex(j => j.id === jobId);

  if (jobIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  jobs[jobIndex] = {
    ...jobs[jobIndex],
    ...req.body,
    id: jobId
  };

  res.json({
    success: true,
    job: jobs[jobIndex],
    message: 'Job actualizado exitosamente'
  });
});

app.delete('/jobs/:id', (req, res) => {
  const jobId = parseInt(req.params.id);
  const jobIndex = jobs.findIndex(j => j.id === jobId);

  if (jobIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  const deletedJob = jobs.splice(jobIndex, 1)[0];

  res.json({
    success: true,
    job: deletedJob,
    message: 'Job eliminado exitosamente'
  });
});

// ENDPOINTS - PRODUCTION & SCANNING
// Registrar un escaneo y actualizar contador en tiempo real
app.post('/jobs/:id/scan', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  const {
    partNumber,
    shift,
    operator,
    scanType = 'production',
    qualityEvaluation = null  // { apariencia: 'OK', juicio: 'OK' } o null
  } = req.body;

  // Determinar qué turno actualizar
  const currentShift = job.dailyProduction.shifts.find(s => s.shift === shift);
  if (currentShift) {
    currentShift.actual += 1;

    // Si hay evaluación de calidad, actualizar defectos
    if (qualityEvaluation && (qualityEvaluation.apariencia === 'NG' || qualityEvaluation.juicio === 'NG')) {
      currentShift.defects += 1;
      job.dailyProduction.totalDefects += 1;
    }

    currentShift.efficiency = ((currentShift.actual / currentShift.target) * 100).toFixed(1);
  }

  // Actualizar totales
  job.dailyProduction.totalActual += 1;
  job.dailyProduction.overallEfficiency =
    ((job.dailyProduction.totalActual / job.dailyProduction.totalTarget) * 100).toFixed(1);

  // Determinar el tipo de evento basado en la evaluación
  let eventType = 'Part Scanned - Production';
  let eventDetails = `Part ${partNumber} scanned`;

  if (qualityEvaluation) {
    const aparienciaStatus = qualityEvaluation.apariencia || 'N/A';
    const juicioStatus = qualityEvaluation.juicio || 'N/A';

    if (aparienciaStatus === 'NG' || juicioStatus === 'NG') {
      eventType = 'Quality Inspection - NG';
      eventDetails = `Part ${partNumber} - DEFECT: Apariencia: ${aparienciaStatus}, Juicio: ${juicioStatus}`;
    } else if (aparienciaStatus === 'Reworked' || juicioStatus === 'Reworked') {
      eventType = 'Quality Inspection - Reworked';
      eventDetails = `Part ${partNumber} - REWORK: Apariencia: ${aparienciaStatus}, Juicio: ${juicioStatus}`;
    } else {
      eventType = 'Quality Inspection - OK';
      eventDetails = `Part ${partNumber} - OK: Apariencia: ${aparienciaStatus}, Juicio: ${juicioStatus}`;
    }
  }

  // Agregar evento al log
  const logEvent = {
    id: job.productionLog.length + 1,
    timestamp: new Date().toISOString(),
    event: eventType,
    user: operator || 'System',
    shift: shift,
    details: eventDetails,
    qualityEvaluation: qualityEvaluation
  };
  job.productionLog.push(logEvent);

  res.json({
    success: true,
    message: 'Scan registered successfully',
    currentCount: job.dailyProduction.totalActual,
    shiftCount: currentShift ? currentShift.actual : 0,
    defects: currentShift ? currentShift.defects : 0,
    efficiency: currentShift ? currentShift.efficiency : 0,
    logEvent: logEvent
  });
});

// Obtener log de eventos de producción
app.get('/jobs/:id/production-log', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  // Filtros opcionales
  const { shift, limit = 50 } = req.query;
  let log = job.productionLog || [];

  if (shift) {
    log = log.filter(event => event.shift === shift);
  }

  // Ordenar por timestamp descendente (más reciente primero)
  log = log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Limitar resultados
  log = log.slice(0, parseInt(limit));

  res.json({
    success: true,
    log: log,
    totalEvents: (job.productionLog || []).length
  });
});

// Obtener reporte diario de producción
app.get('/jobs/:id/daily-report', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  res.json({
    success: true,
    report: job.dailyProduction,
    partNumbers: job.partNumbers
  });
});

// Registrar evento de producción manual
app.post('/jobs/:id/production-event', (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job no encontrado'
    });
  }

  const { event, user, shift, details } = req.body;

  if (!event || !user || !shift) {
    return res.status(400).json({
      success: false,
      message: 'Event, user, and shift are required'
    });
  }

  const logEvent = {
    id: job.productionLog.length + 1,
    timestamp: new Date().toISOString(),
    event: event,
    user: user,
    shift: shift,
    details: details || ''
  };

  job.productionLog.push(logEvent);

  res.json({
    success: true,
    message: 'Event registered successfully',
    logEvent: logEvent
  });
});

// ============================================================================
// WORK INSTRUCTIONS ENDPOINTS
// ============================================================================
const workInstructions = require('./data/workInstructions');
const setupWorkInstructionsEndpoints = require('./endpoints/workInstructionsEndpoints');
setupWorkInstructionsEndpoints(app, workInstructions);

// ============================================================================
// QUOTES ENDPOINTS
// ============================================================================
const quotes = require('./data/quotes');
const setupQuotesEndpoints = require('./endpoints/quotesEndpoints');
setupQuotesEndpoints(app, quotes);

// ============================================================================
// DOCUMENTS ENDPOINTS
// ============================================================================
const documents = require('./data/documents');
const setupDocumentsEndpoints = require('./endpoints/documentsEndpoints');
setupDocumentsEndpoints(app, documents);

// ============================================================================
// SERVICES ENDPOINTS (Team Members & Timesheets)
// ============================================================================
const { teamMembers, timesheets } = require('./data/services');
const setupServicesEndpoints = require('./endpoints/servicesEndpoints');
setupServicesEndpoints(app, teamMembers, timesheets);

// Rutas
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/teams', teamRoutes);
app.use('/hierarchy', hierarchyRoutes);
const eightdRoutes = require('./routes/eightdRoutes');
app.use('/8d', eightdRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'POST /auth/login',
      'POST /auth/register',
      'GET /auth/me',
      'GET /hierarchy/roles',
      'GET /hierarchy/dashboard-config',
      'GET /8d/dashboard-data',
      'GET /users/list',
      'GET /clients/list',
      'GET /clients/:id',
      'POST /clients/create',
      'PUT /clients/:id',
      'DELETE /clients/:id',
      'GET /audits/list',
      'POST /audits/create',
      'GET /operation-sheets/list',
      'POST /operation-sheets/create',
      'GET /safety/evaluations/list',
      'POST /safety/evaluations/create',
      'GET /work-instructions',
      'GET /work-instructions/:id',
      'POST /work-instructions',
      'PUT /work-instructions/:id',
      'DELETE /work-instructions/:id',
      'POST /work-instructions/:id/approve',
      'POST /work-instructions/:id/risk-assessment',
      'POST /work-instructions/:id/process-audit'
    ]
  });
});

// Función para mostrar información de startup
function showStartupInfo() {
  console.log('\n🔧 QUALITY ALERT SYSTEM - STARTING UP');
  console.log('============================================');
  console.log(`📊 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/auth/login`);
  console.log(`🎯 8D Dashboard: http://localhost:${PORT}/8d/dashboard-data`);
  console.log(`👥 Clients: http://localhost:${PORT}/clients/list`);
  console.log(`📋 Audits: http://localhost:${PORT}/audits/list`);
  console.log(`📄 Operation Sheets: http://localhost:${PORT}/operation-sheets/list`);
  console.log(`🛡️  Safety Evaluations: http://localhost:${PORT}/safety/evaluations/list`);
  console.log('\n👥 USUARIOS DEL SISTEMA 8D:');
  console.log('============================');
  
  users.forEach(user => {
    console.log(`📧 ${user.email}`);
    console.log(`🔑 Contraseña: ${user.password}`);
    console.log(`👤 Rol: ${user.role} (${user.name})`);
    console.log(`🏢 Departamento: ${user.department}`);
    console.log(`⚡ Permisos 8D: ${user.permissions.length} permisos activos`);
    console.log('---');
  });
  
  console.log('\n🔧 JERARQUÍAS 8D IMPLEMENTADAS:');
  console.log('================================');
  console.log('👑 Champion - Quality Director: Aprobaciones ejecutivas y reportes');
  console.log('👔 Manager - Quality Manager: Coordinación de equipos 8D');
  console.log('🔧 Engineer - Quality Engineer: Investigación y análisis técnico');
  console.log('⚙️ Technician - Quality Technician: Recolección de datos y contención');
  
  console.log('\n📊 ESTADÍSTICAS DEL SISTEMA:');
  console.log('=============================');
  console.log(`👥 Clientes: ${clients.length} (${clients.filter(c => c.isActive).length} activos)`);
  console.log(`📋 Total 8D Reports: ${sample8Ds.length}`);
  console.log(`🔴 8D Activos: ${sample8Ds.filter(d => d.status !== 'D8 - Closed').length}`);
  console.log(`✅ 8D Cerrados: ${sample8Ds.filter(d => d.status === 'D8 - Closed').length}`);
  console.log(`⚠️ Alta Severidad: ${sample8Ds.filter(d => d.severity === 'High').length}`);
  console.log(`💰 Costo Estimado Total: $${sample8Ds.reduce((sum, d) => sum + d.estimatedCost, 0).toLocaleString()}`);
  console.log(`📋 Auditorías: ${audits.length} (${audits.filter(a => a.status === 'Programada').length} programadas)`);
  console.log(`📄 Hojas de Operación: ${operationSheets.length} (${operationSheets.filter(s => s.status === 'Aprobada').length} aprobadas)`);
  console.log(`🛡️  Evaluaciones de Seguridad: ${safetyEvaluations.length} (${safetyEvaluations.filter(e => e.riskLevel === 'Alto').length} riesgo alto)`);

  console.log('\n🎯 VALOR COMERCIAL:');
  console.log('===================');
  console.log('💼 Mercado Objetivo: Manufactura, Automotriz, Aeroespacial');
  console.log('💰 Precio Objetivo: $10,000 - $30,000 por licencia');
  console.log('🚀 Diferenciador: Sistema integral (Clients + 8D + Auditorías + Seguridad)');
  console.log('⭐ ROI Cliente: 400-600% en el primer año');

  console.log('\n✅ Quality Alert System listo para uso');
  console.log('📱 Frontend URL: http://localhost:3000');
  console.log('============================================\n');
}

app.listen(PORT, () => {
  showStartupInfo();
});

// Hacer usuarios y datos disponibles para otros módulos
app.locals.users = users;
app.locals.sample8Ds = sample8Ds;

module.exports = app;// Force reload
