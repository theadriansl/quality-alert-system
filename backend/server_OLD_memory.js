const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database connection
const { query, pool } = require('./config/database');

// Import endpoints modules
const teamPresetsEndpoints = require('./endpoints/teamPresetsEndpoints');

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
  if (req.file) {
    console.log('File uploaded:', req.file.originalname, '-', req.file.size, 'bytes');
  }
  next();
});

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// ============================================================================
// USERS - 8D System Users
// ============================================================================
const users = [
  {
    id: 1,
    email: 'admin@8dsystem.com',
    password: 'password123',
    name: 'Quality Director',
    role: 'Champion',
    department: 'Quality Management',
    phone: '+52-442-123-4567',
    isTFTMember: false,
    teamPresets: [
      // Preset slots: user can save up to 3 team configurations
      // Each preset saves the entire team assignment for all 3 sections:
      // - issueUserIds: users for Issue Section
      // - countermeasureUserIds: users for Countermeasure Section
      // - confirmationUserIds: users for Confirmation Section
    ],
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
    isTFTMember: true,
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
    isTFTMember: true,
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
    isTFTMember: true,
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
    isTFTMember: false,
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
    isTFTMember: true,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
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
    isTFTMember: false,
    permissions: [
      'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
      'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
      'escalate_to_manager'
    ]
  }
];

// ============================================================================
// 8D REPORTS DATA
// ============================================================================
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

// ============================================================================
// CLIENTS DATA
// ============================================================================
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

// ============================================================================
// PROJECTS DATA (Proyectos con Partes)
// ============================================================================
const projects = [
  {
    id: 1,
    projectNumber: 'PROJ-2024-001',
    projectName: 'Instrument Panel Assembly Program',
    clientId: 1,
    clientName: 'Faurecia Sistemas Automotrices SA de CV',
    description: 'Complete instrument panel assembly for automotive interior',
    status: 'Active',
    startDate: '2024-01-15',
    targetEndDate: '2025-12-31',
    parts: [
      {
        id: 1,
        partNumber: 'FAU-IP-2024-001',
        clientPartNumber: 'CLI-FAU-001',
        partName: 'Instrument Panel Main Assembly',
        description: 'Main instrument panel structure',
        revision: 'Rev C',
        specifications: 'PPAP Level 3 required',
        weight: 2.5,
        snpQuantity: 100,
        snpVolume: 0.05,
        unitCost: 45.50,
        currency: 'USD'
      },
      {
        id: 2,
        partNumber: 'FAU-IP-2024-002',
        clientPartNumber: 'CLI-FAU-002',
        partName: 'Center Console Trim',
        description: 'Center console decorative trim piece',
        revision: 'Rev A',
        specifications: 'Surface finish critical',
        weight: 0.8,
        snpQuantity: 200,
        snpVolume: 0.02,
        unitCost: 12.75,
        currency: 'USD'
      },
      {
        id: 3,
        partNumber: 'FAU-IP-2024-003',
        clientPartNumber: 'CLI-FAU-003',
        partName: 'Glove Box Door',
        description: 'Glove box door with latch mechanism',
        revision: 'Rev B',
        specifications: 'Latch torque 5-7 Nm',
        weight: 1.2,
        snpQuantity: 150,
        snpVolume: 0.03,
        unitCost: 23.80,
        currency: 'USD'
      }
    ],
    createdAt: '2024-01-15',
    updatedAt: '2025-10-20'
  },
  {
    id: 2,
    projectNumber: 'PROJ-2024-002',
    projectName: 'Electric Vehicle Chassis Components',
    clientId: 3,
    clientName: 'Lucid Headquarters',
    description: 'Chassis structural components for EV platform',
    status: 'Active',
    startDate: '2024-06-20',
    targetEndDate: '2026-06-30',
    parts: [
      {
        id: 1,
        partNumber: 'LUC-CH-2024-001',
        clientPartNumber: 'CLI-LUC-001',
        partName: 'Front Subframe Assembly',
        description: 'Aluminum front subframe for EV',
        revision: 'Rev D',
        specifications: 'Crash test validated, PPAP Level 5',
        weight: 15.5,
        snpQuantity: 50,
        snpVolume: 0.35,
        unitCost: 285.00,
        currency: 'USD'
      },
      {
        id: 2,
        partNumber: 'LUC-CH-2024-002',
        clientPartNumber: 'CLI-LUC-002',
        partName: 'Battery Mounting Bracket',
        description: 'Structural bracket for battery pack mounting',
        revision: 'Rev C',
        specifications: 'Torque spec 180 Nm, Grade 10.9 bolts',
        weight: 8.3,
        snpQuantity: 75,
        snpVolume: 0.18,
        unitCost: 156.50,
        currency: 'USD'
      },
      {
        id: 3,
        partNumber: 'LUC-CH-2024-003',
        clientPartNumber: 'CLI-LUC-003',
        partName: 'Suspension Control Arm',
        description: 'Lower control arm - driver side',
        revision: 'Rev B',
        specifications: 'Fatigue test 200k cycles',
        weight: 3.2,
        snpQuantity: 120,
        snpVolume: 0.08,
        unitCost: 67.25,
        currency: 'USD'
      },
      {
        id: 4,
        partNumber: 'LUC-CH-2024-004',
        clientPartNumber: 'CLI-LUC-004',
        partName: 'Suspension Control Arm',
        description: 'Lower control arm - passenger side',
        revision: 'Rev B',
        specifications: 'Fatigue test 200k cycles',
        weight: 3.2,
        snpQuantity: 120,
        snpVolume: 0.08,
        unitCost: 67.25,
        currency: 'USD'
      }
    ],
    createdAt: '2024-06-20',
    updatedAt: '2025-10-28'
  },
  {
    id: 3,
    projectNumber: 'PROJ-2024-003',
    projectName: 'Engine Mount Production',
    clientId: 5,
    clientName: 'Mubea de México S de RL de CV',
    description: 'Rubber-metal engine mount components',
    status: 'Active',
    startDate: '2024-05-05',
    targetEndDate: '2027-05-05',
    parts: [
      {
        id: 1,
        partNumber: 'MUB-EM-2024-001',
        clientPartNumber: 'CLI-MUB-001',
        partName: 'Front Engine Mount',
        description: 'Hydraulic engine mount - front position',
        revision: 'Rev E',
        specifications: 'Dynamic stiffness 400-600 N/mm @ 20Hz',
        weight: 2.8,
        snpQuantity: 180,
        snpVolume: 0.06,
        unitCost: 34.90,
        currency: 'USD'
      },
      {
        id: 2,
        partNumber: 'MUB-EM-2024-002',
        clientPartNumber: 'CLI-MUB-002',
        partName: 'Rear Engine Mount',
        description: 'Solid engine mount - rear position',
        revision: 'Rev D',
        specifications: 'Static stiffness 800-1000 N/mm',
        weight: 3.5,
        snpQuantity: 160,
        snpVolume: 0.07,
        unitCost: 28.75,
        currency: 'USD'
      },
      {
        id: 3,
        partNumber: 'MUB-EM-2024-003',
        clientPartNumber: 'CLI-MUB-003',
        partName: 'Transmission Mount',
        description: 'Transmission support mount',
        revision: 'Rev C',
        specifications: 'Damping ratio 0.15-0.25',
        weight: 2.2,
        snpQuantity: 190,
        snpVolume: 0.05,
        unitCost: 31.20,
        currency: 'USD'
      }
    ],
    createdAt: '2024-05-05',
    updatedAt: '2025-10-15'
  },
  {
    id: 4,
    projectNumber: 'PROJ-2024-004',
    projectName: 'Interior Trim Components',
    clientId: 2,
    clientName: 'Gissing North America LLC',
    description: 'Various interior trim and fastener components',
    status: 'Active',
    startDate: '2024-03-10',
    targetEndDate: '2025-12-31',
    parts: [
      {
        id: 1,
        partNumber: 'GIS-IT-2024-001',
        clientPartNumber: 'CLI-GIS-001',
        partName: 'Door Panel Clip',
        description: 'Plastic retention clip for door panels',
        revision: 'Rev A',
        specifications: 'Pull force 80-120 N',
        weight: 0.05,
        snpQuantity: 500,
        snpVolume: 0.001,
        unitCost: 0.85,
        currency: 'USD'
      },
      {
        id: 2,
        partNumber: 'GIS-IT-2024-002',
        clientPartNumber: 'CLI-GIS-002',
        partName: 'Dashboard Screw Cover',
        description: 'Decorative screw cover caps',
        revision: 'Rev B',
        specifications: 'Color match to dashboard',
        weight: 0.02,
        snpQuantity: 1000,
        snpVolume: 0.0005,
        unitCost: 0.35,
        currency: 'USD'
      },
      {
        id: 3,
        partNumber: 'GIS-IT-2024-003',
        clientPartNumber: 'CLI-GIS-003',
        partName: 'Carpet Retainer',
        description: 'Floor carpet retention system',
        revision: 'Rev A',
        specifications: 'Twist-lock mechanism',
        weight: 0.08,
        snpQuantity: 300,
        snpVolume: 0.002,
        unitCost: 1.20,
        currency: 'USD'
      },
      {
        id: 4,
        partNumber: 'GIS-IT-2024-004',
        clientPartNumber: 'CLI-GIS-004',
        partName: 'Headliner Push Pin',
        description: 'Headliner attachment fastener',
        revision: 'Rev C',
        specifications: 'Insertion force 40-60 N',
        weight: 0.03,
        snpQuantity: 800,
        snpVolume: 0.0008,
        unitCost: 0.45,
        currency: 'USD'
      },
      {
        id: 5,
        partNumber: 'GIS-IT-2024-005',
        clientPartNumber: 'CLI-GIS-005',
        partName: 'Center Console Armrest',
        description: 'Center console padded armrest assembly',
        revision: 'Rev B',
        specifications: 'Durability 50k cycles',
        weight: 1.5,
        snpQuantity: 100,
        snpVolume: 0.04,
        unitCost: 18.50,
        currency: 'USD'
      }
    ],
    createdAt: '2024-03-10',
    updatedAt: '2025-09-15'
  }
];

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    user: userWithoutPassword,
    token: 'fake-jwt-token-' + user.id
  });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.substring(7);

  // Extract user ID from fake token
  const userId = parseInt(token.replace('fake-jwt-token-', ''));
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  req.user = user;
  next();
};

// Get current user info
app.get('/auth/me', verifyToken, (req, res) => {
  const { password, ...userWithoutPassword } = req.user;

  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    system: {
      name: '8D Problem Solving System',
      version: '1.0.0',
      activeUsers: users.length,
      active8Ds: sample8Ds.filter(d => d.status !== 'D8 - Closed').length,
      closed8Ds: sample8Ds.filter(d => d.status === 'D8 - Closed').length
    }
  });
});

// ============================================================================
// PROJECTS ENDPOINTS
// ============================================================================

// GET /projects/list - Get all projects
app.get('/projects/list', (req, res) => {
  let filteredProjects = projects;

  // Filter by client if specified
  if (req.query.clientId) {
    const clientId = parseInt(req.query.clientId);
    filteredProjects = projects.filter(p => p.clientId === clientId);
  }

  // Filter by status
  if (req.query.status) {
    filteredProjects = filteredProjects.filter(p => p.status === req.query.status);
  }

  res.json({
    success: true,
    projects: filteredProjects,
    count: filteredProjects.length
  });
});

// GET /projects/:id - Get single project with parts
app.get('/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  res.json({
    success: true,
    project: project
  });
});

// GET /projects/:id/parts - Get parts for a project
app.get('/projects/:id/parts', (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  res.json({
    success: true,
    parts: project.parts || [],
    count: (project.parts || []).length,
    projectInfo: {
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      clientName: project.clientName
    }
  });
});

// GET /clients/:clientId/projects - Get projects for a specific client
app.get('/clients/:clientId/projects', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  const clientProjects = projects.filter(p => p.clientId === clientId);

  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  res.json({
    success: true,
    client: {
      id: client.id,
      name: client.name,
      alias: client.alias
    },
    projects: clientProjects,
    count: clientProjects.length
  });
});

// ============================================================================
// 8D ENDPOINTS
// ============================================================================

// GET /8d/dashboard-data - Get 8D dashboard statistics
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

// Import 8D endpoints
const eightDEndpoints = require('./endpoints/eightDEndpoints');

// POST /8d/reports - Create new 8D report with parts
app.post('/8d/reports', verifyToken, eightDEndpoints.createEightDReport);

// GET /8d/reports/:reportId - Get 8D report by ID with parts
app.get('/8d/reports/:reportId', verifyToken, eightDEndpoints.getEightDReportById);

// ============================================================================
// USERS ENDPOINTS
// ============================================================================

// GET /users/list - Get all users (for escalation and team assignment)
app.get('/users/list', (req, res) => {
  // Retornar usuarios sin passwords
  const safeUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    phone: user.phone,
    isTFTMember: user.isTFTMember || false,
    permissions: user.permissions
  }));

  res.json({
    success: true,
    users: safeUsers
  });
});

// GET /users/tft-members - Get all TFT (Task Force Team) members
app.get('/users/tft-members', (req, res) => {
  const tftMembers = users
    .filter(user => user.isTFTMember === true)
    .map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isTFTMember: user.isTFTMember
    }));

  res.json({
    success: true,
    tftMembers: tftMembers,
    count: tftMembers.length
  });
});

// PUT /users/:id/tft-membership - Toggle TFT membership for a user
app.put('/users/:id/tft-membership', (req, res) => {
  const userId = parseInt(req.params.id);
  const { isTFTMember } = req.body;

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }

  if (typeof isTFTMember !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'El campo isTFTMember debe ser un valor booleano'
    });
  }

  user.isTFTMember = isTFTMember;

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    user: userWithoutPassword,
    message: isTFTMember
      ? `${user.name} fue agregado al Task Force Team`
      : `${user.name} fue removido del Task Force Team`
  });
});

// ============================================================================
// TEAM PRESETS ENDPOINTS - Now using PostgreSQL database
// ============================================================================

// GET /users/:id/team-presets - Get user's team presets
app.get('/users/:id/team-presets', teamPresetsEndpoints.getUserTeamPresets);

// POST /users/:id/team-presets - Create new team preset
app.post('/users/:id/team-presets', teamPresetsEndpoints.createTeamPreset);

// PUT /users/:userId/team-presets/:presetId - Update team preset
app.put('/users/:userId/team-presets/:presetId', teamPresetsEndpoints.updateTeamPreset);

// DELETE /users/:userId/team-presets/:presetId - Delete team preset
app.delete('/users/:userId/team-presets/:presetId', teamPresetsEndpoints.deleteTeamPreset);

// ============================================================================
// CLIENTS ENDPOINTS
// ============================================================================

// GET /clients/list - List all clients with optional filtering
app.get('/clients/list', (req, res) => {
  let filteredClients = clients;

  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredClients = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm) ||
      client.alias.toLowerCase().includes(searchTerm) ||
      (client.vendorNumber && client.vendorNumber.toLowerCase().includes(searchTerm))
    );
  }

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

// GET /clients/:id - Get single client
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

// POST /clients/create - Create new client
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

// PUT /clients/:id - Update client
app.put('/clients/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  const oldClient = clients[clientIndex];
  const newClient = {
    ...oldClient,
    ...req.body,
    id: clientId,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  // Detect what changed and log timeline events

  // Check if contacts changed
  if (JSON.stringify(oldClient.contacts) !== JSON.stringify(req.body.contacts)) {
    const oldContactsCount = (oldClient.contacts || []).length;
    const newContactsCount = (req.body.contacts || []).length;

    if (newContactsCount > oldContactsCount) {
      const addedCount = newContactsCount - oldContactsCount;
      addTimelineEvent(
        newClient,
        'created',
        'contact',
        `Se ${addedCount === 1 ? 'agregó' : 'agregaron'} ${addedCount} contacto${addedCount > 1 ? 's' : ''}`,
        { cantidad: addedCount }
      );
    } else if (newContactsCount < oldContactsCount) {
      const removedCount = oldContactsCount - newContactsCount;
      addTimelineEvent(
        newClient,
        'deleted',
        'contact',
        `Se ${removedCount === 1 ? 'eliminó' : 'eliminaron'} ${removedCount} contacto${removedCount > 1 ? 's' : ''}`,
        { cantidad: removedCount }
      );
    } else {
      // Same count but different content - updated
      addTimelineEvent(
        newClient,
        'updated',
        'contact',
        'Se actualizó información de contactos',
        {}
      );
    }
  }

  // Check if client info changed (name, address, email, phone, isActive)
  const infoFields = ['name', 'address', 'email', 'phone', 'isActive'];
  const changedFields = infoFields.filter(field =>
    oldClient[field] !== req.body[field] && req.body[field] !== undefined
  );

  if (changedFields.length > 0) {
    const details = {};
    changedFields.forEach(field => {
      details[`${field}_anterior`] = oldClient[field];
      details[`${field}_nuevo`] = req.body[field];
    });

    addTimelineEvent(
      newClient,
      'updated',
      'client',
      `Se actualizó información del cliente (${changedFields.join(', ')})`,
      details
    );
  }

  clients[clientIndex] = newClient;

  res.json({
    success: true,
    client: clients[clientIndex],
    message: 'Cliente actualizado exitosamente'
  });
});

// DELETE /clients/:id - Delete client
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
// PROJECTS ENDPOINTS
// ============================================================================

// GET /projects/list - List all projects with optional filtering
app.get('/projects/list', (req, res) => {
  let filteredProjects = projects;

  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    filteredProjects = projects.filter(project =>
      project.projectName.toLowerCase().includes(searchTerm) ||
      project.projectNumber.toLowerCase().includes(searchTerm) ||
      project.clientName.toLowerCase().includes(searchTerm) ||
      project.parts.some(part =>
        part.partNumber.toLowerCase().includes(searchTerm) ||
        part.partName.toLowerCase().includes(searchTerm)
      )
    );
  }

  if (req.query.clientId) {
    const clientId = parseInt(req.query.clientId);
    filteredProjects = filteredProjects.filter(project => project.clientId === clientId);
  }

  if (req.query.status) {
    filteredProjects = filteredProjects.filter(project =>
      project.status.toLowerCase() === req.query.status.toLowerCase()
    );
  }

  const totalParts = projects.reduce((acc, project) => acc + project.parts.length, 0);

  res.json({
    success: true,
    projects: filteredProjects,
    stats: {
      total: projects.length,
      active: projects.filter(p => p.status === 'Active').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      onHold: projects.filter(p => p.status === 'On Hold').length,
      totalParts: totalParts
    }
  });
});

// GET /projects/:id - Get single project with all parts
app.get('/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  res.json({
    success: true,
    project: project
  });
});

// GET /projects/:projectId/parts - Get all parts for a specific project (for 8D selection)
app.get('/projects/:projectId/parts', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  res.json({
    success: true,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    parts: project.parts,
    stats: {
      totalParts: project.parts.length
    }
  });
});

// POST /projects/create - Create new project
app.post('/projects/create', (req, res) => {
  const newProject = {
    id: projects.length + 1,
    projectNumber: req.body.projectNumber,
    projectName: req.body.projectName,
    clientId: req.body.clientId,
    clientName: req.body.clientName,
    description: req.body.description || '',
    status: req.body.status || 'Active',
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    targetEndDate: req.body.targetEndDate || '',
    parts: req.body.parts || [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  };

  projects.push(newProject);

  // Add timeline event to client
  const client = clients.find(c => c.id === req.body.clientId);
  if (client) {
    addTimelineEvent(
      client,
      'created',
      'project',
      `Se creó el proyecto "${newProject.projectName}"`,
      {
        'Número de proyecto': newProject.projectNumber,
        'Estado': newProject.status,
        'Fecha de inicio': newProject.startDate
      }
    );
  }

  res.json({
    success: true,
    project: newProject,
    message: 'Proyecto creado exitosamente'
  });
});

// PUT /projects/:id - Update project
app.put('/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const oldProject = projects[projectIndex];
  projects[projectIndex] = {
    ...oldProject,
    ...req.body,
    id: projectId,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  // Add timeline event to client if parts changed
  const client = clients.find(c => c.id === projects[projectIndex].clientId);
  if (client) {
    const oldPartsCount = (oldProject.parts || []).length;
    const newPartsCount = (req.body.parts || oldProject.parts || []).length;

    if (newPartsCount !== oldPartsCount) {
      const diff = newPartsCount - oldPartsCount;
      addTimelineEvent(
        client,
        diff > 0 ? 'created' : 'deleted',
        'part',
        `Se ${diff > 0 ? 'agregaron' : 'eliminaron'} ${Math.abs(diff)} parte${Math.abs(diff) > 1 ? 's' : ''} ${diff > 0 ? 'al' : 'del'} proyecto "${projects[projectIndex].projectName}"`,
        {
          'Proyecto': projects[projectIndex].projectName,
          'Número de proyecto': projects[projectIndex].projectNumber
        }
      );
    }

    // Check if other project fields changed
    const projectInfoFields = ['projectName', 'status', 'description'];
    const changedFields = projectInfoFields.filter(field =>
      oldProject[field] !== req.body[field] && req.body[field] !== undefined
    );

    if (changedFields.length > 0) {
      addTimelineEvent(
        client,
        'updated',
        'project',
        `Se actualizó el proyecto "${projects[projectIndex].projectName}"`,
        {
          'Número de proyecto': projects[projectIndex].projectNumber,
          'Campos actualizados': changedFields.join(', ')
        }
      );
    }
  }

  res.json({
    success: true,
    project: projects[projectIndex],
    message: 'Proyecto actualizado exitosamente'
  });
});

// DELETE /projects/:id - Delete project
app.delete('/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const deletedProject = projects.splice(projectIndex, 1)[0];

  res.json({
    success: true,
    project: deletedProject,
    message: 'Proyecto eliminado exitosamente'
  });
});

// POST /projects/:projectId/parts - Add a new part to a project
app.post('/projects/:projectId/parts', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const newPart = {
    id: project.parts.length + 1,
    partNumber: req.body.partNumber,
    partName: req.body.partName,
    description: req.body.description || '',
    revision: req.body.revision || 'Rev A',
    specifications: req.body.specifications || ''
  };

  project.parts.push(newPart);
  project.updatedAt = new Date().toISOString().split('T')[0];

  res.json({
    success: true,
    part: newPart,
    project: project,
    message: 'Parte agregada exitosamente al proyecto'
  });
});

// DELETE /projects/:projectId/parts/:partId - Remove a part from a project
app.delete('/projects/:projectId/parts/:partId', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const partId = parseInt(req.params.partId);

  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const partIndex = project.parts.findIndex(p => p.id === partId);

  if (partIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Parte no encontrada en el proyecto'
    });
  }

  const deletedPart = project.parts.splice(partIndex, 1)[0];
  project.updatedAt = new Date().toISOString().split('T')[0];

  res.json({
    success: true,
    part: deletedPart,
    message: 'Parte eliminada del proyecto exitosamente'
  });
});

// ============================================================================
// DOCUMENTS ENDPOINTS
// ============================================================================

// POST /clients/:clientId/documents/upload - Upload a document for a client
app.post('/clients/:clientId/documents/upload', upload.single('file'), (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      // Delete uploaded file if client not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    // Generate unique document ID
    const maxId = client.documents && client.documents.length > 0
      ? Math.max(...client.documents.map(d => d.id))
      : 0;

    // Create document object
    const document = {
      id: maxId + 1,
      fileName: req.file.originalname,
      title: req.body.title || req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      filePath: `/uploads/${req.file.filename}`,
      serverFileName: req.file.filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.body.uploadedBy || 'Unknown User',
      description: req.body.description || ''
    };

    // Initialize documents array if it doesn't exist
    if (!client.documents) {
      client.documents = [];
    }

    // Add document to client
    client.documents.push(document);
    client.updatedAt = new Date().toISOString().split('T')[0];

    // Add timeline event
    addTimelineEvent(
      client,
      'created',
      'document',
      `Se subió el documento "${document.title}"`,
      {
        'Nombre del archivo': document.fileName,
        'Tamaño': `${Math.round(document.fileSize / 1024)} KB`,
        'Tipo': document.fileType
      }
    );

    res.json({
      success: true,
      document: document,
      message: 'Documento subido exitosamente'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el documento: ' + error.message
    });
  }
});

// GET /clients/:clientId/documents - Get all documents for a client
app.get('/clients/:clientId/documents', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  res.json({
    success: true,
    documents: client.documents || [],
    count: client.documents ? client.documents.length : 0
  });
});

// DELETE /clients/:clientId/documents/:documentId - Delete a document
app.delete('/clients/:clientId/documents/:documentId', (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const documentId = parseInt(req.params.documentId);

    console.log(`🗑️ DELETE Request - ClientId: ${clientId}, DocumentId: ${documentId}`);

    const client = clients.find(c => c.id === clientId);

    if (!client) {
      console.log(`❌ Client not found: ${clientId}`);
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    console.log(`✅ Client found: ${client.name}`);
    console.log(`📄 Client has ${client.documents ? client.documents.length : 0} documents`);

    if (!client.documents || client.documents.length === 0) {
      console.log(`❌ No documents for this client`);
      return res.status(404).json({
        success: false,
        message: 'No hay documentos para este cliente'
      });
    }

    console.log(`🔍 Looking for document with ID: ${documentId}`);
    console.log(`📋 Available document IDs: ${client.documents.map(d => d.id).join(', ')}`);

    const documentIndex = client.documents.findIndex(d => d.id === documentId);

    if (documentIndex === -1) {
      console.log(`❌ Document not found in array. Looking for ID ${documentId} but have: ${JSON.stringify(client.documents.map(d => ({id: d.id, title: d.title})))}`);
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    console.log(`✅ Document found at index ${documentIndex}`);

    const deletedDocument = client.documents[documentIndex];

    // Delete the physical file
    const filePath = path.join(uploadsDir, deletedDocument.serverFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove document from array
    client.documents.splice(documentIndex, 1);
    client.updatedAt = new Date().toISOString().split('T')[0];

    // Add timeline event
    addTimelineEvent(
      client,
      'deleted',
      'document',
      `Se eliminó el documento "${deletedDocument.title}"`,
      {
        'Nombre del archivo': deletedDocument.fileName
      }
    );

    res.json({
      success: true,
      document: deletedDocument,
      message: 'Documento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el documento: ' + error.message
    });
  }
});

// GET /uploads/:filename - Download/view a document
// This is already handled by the static file middleware above
// app.use('/uploads', express.static(uploadsDir));

// ============================================================================
// TIMELINE/ACTIVITY LOG
// ============================================================================

// Helper function to add timeline event
const addTimelineEvent = (client, eventType, eventCategory, description, details = {}) => {
  if (!client.timeline) {
    client.timeline = [];
  }

  const event = {
    id: client.timeline.length > 0 ? Math.max(...client.timeline.map(e => e.id)) + 1 : 1,
    timestamp: new Date().toISOString(),
    eventType,        // 'created', 'updated', 'deleted'
    eventCategory,    // 'client', 'project', 'contact', 'document', 'part'
    description,
    details,
    user: 'System'    // Can be enhanced to track actual user
  };

  client.timeline.unshift(event); // Add to beginning (most recent first)
  return event;
};

// GET /clients/:clientId/timeline - Get timeline events for a client
app.get('/clients/:clientId/timeline', (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Get query parameters for filtering
    const { startDate, endDate, eventCategory, eventType, sortOrder } = req.query;

    let timeline = client.timeline || [];

    // Filter by date range
    if (startDate) {
      timeline = timeline.filter(event => new Date(event.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Include entire end date
      timeline = timeline.filter(event => new Date(event.timestamp) <= endDateTime);
    }

    // Filter by event category
    if (eventCategory && eventCategory !== 'all') {
      timeline = timeline.filter(event => event.eventCategory === eventCategory);
    }

    // Filter by event type
    if (eventType && eventType !== 'all') {
      timeline = timeline.filter(event => event.eventType === eventType);
    }

    // Sort timeline
    if (sortOrder === 'oldest') {
      timeline = [...timeline].reverse();
    }
    // Default is newest first (already in that order)

    res.json({
      success: true,
      timeline,
      count: timeline.length,
      totalEvents: client.timeline ? client.timeline.length : 0
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el timeline: ' + error.message
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log('\n');
  console.log('🔧 QUALITY ALERT SYSTEM - 8D MODULE');
  console.log('============================================');
  console.log(`📊 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/auth/login`);
  console.log(`🎯 8D Dashboard: http://localhost:${PORT}/8d/dashboard-data`);
  console.log('');
  console.log('👥 USUARIOS DEL SISTEMA 8D:');
  console.log('============================');
  users.forEach((user, index) => {
    console.log(`📧 ${user.email}`);
    console.log(`🔑 Contraseña: password123`);
    console.log(`👤 Rol: ${user.role} (${user.name})`);
    console.log(`🏢 Departamento: ${user.department}`);
    console.log(`⚡ Permisos 8D: ${user.permissions.length} permisos activos`);
    if (index < users.length - 1) {
      console.log('---');
    }
  });
  console.log('');
  console.log('📊 ESTADÍSTICAS DEL SISTEMA:');
  console.log('=============================');
  console.log(`📋 Total 8D Reports: ${sample8Ds.length}`);
  console.log(`🔴 8D Activos: ${sample8Ds.filter(d => d.status !== 'D8 - Closed').length}`);
  console.log(`✅ 8D Cerrados: ${sample8Ds.filter(d => d.status === 'D8 - Closed').length}`);
  console.log(`⚠️ Alta Severidad: ${sample8Ds.filter(d => d.severity === 'High').length}`);
  console.log(`💰 Costo Estimado Total: $${sample8Ds.reduce((sum, d) => sum + d.estimatedCost, 0).toLocaleString()}`);
  console.log('');
  console.log('✅ Quality Alert System listo para uso');
  console.log(`📱 Frontend URL: http://localhost:3000`);
  console.log('============================================\n');
});

module.exports = app;
