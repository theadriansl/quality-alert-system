const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// ============= DATA ARRAYS =============
const problemTypes = ['Dimensional', 'Visual', 'Functional', 'Material', 'Assembly', 'Packaging', 'Documentation', 'Contamination'];
const severities = ['High', 'Medium', 'Low']; // Fixed to match dashboard expectations
const tipoIssue = ['Customer Complaint', 'Internal Detection', 'Supplier Issue', 'Process Deviation', 'Audit Finding'];
const tipoResp = ['Production', 'Quality', 'Engineering', 'Supplier', 'Logistics'];
const timingOccurrence = ['Pre-production', 'Production', 'Post-production', 'Field Return', 'Customer Site'];
const currentSteps = ['D1', 'D2', 'D3', 'D3-MFG', 'D4', 'D5', 'D6', 'D7', 'D8'];

const defectDescriptions = [
  'Surface scratches visible on painted surface',
  'Dimensional deviation exceeds tolerance by 0.5mm',
  'Clip retention force below specification',
  'Color mismatch between components',
  'Weld porosity detected in structural joint',
  'Missing fastener during assembly',
  'Incorrect material hardness',
  'Gap and flush misalignment',
  'Surface contamination with oil residue',
  'Incomplete thread engagement',
  'Burr present on machined edge',
  'Warpage exceeding flatness tolerance',
  'Incorrect label placement',
  'Moisture contamination in packaging',
  'Incorrect revision documentation supplied'
];

const rootCauses = [
  'Worn tooling causing dimensional variation',
  'Incorrect machine parameter settings',
  'Operator training gap identified',
  'Supplier material lot variation',
  'Environmental conditions outside specification',
  'Preventive maintenance overdue',
  'Design tolerance too tight for process capability',
  'Inspection method inadequate',
  'Material handling damage during transport',
  'Fixture misalignment detected'
];

const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const clients = [
  { id: 1, name: 'Faurecia Sistemas Automotrices SA de CV' },
  { id: 2, name: 'Gissing North America LLC' },
  { id: 3, name: 'Lucid Headquarters' },
  { id: 4, name: 'ElringKlinger Canada Inc' },
  { id: 5, name: 'Mubea de México S de RL de CV' },
  { id: 6, name: 'TechFlow Manufacturing Inc' }
];

const projects = [
  { id: 1, number: 'PROJ-2024-001', name: 'Instrument Panel Assembly Program', clientId: 1 },
  { id: 2, number: 'PROJ-2024-002', name: 'Electric Vehicle Chassis Components', clientId: 3 },
  { id: 4, number: 'PROJ-2024-003', name: 'Seat Belt Buckle Assembly', clientId: 2 },
  { id: 5, number: 'PROJ-2024-007', name: 'Electric Motor Housing Components', clientId: 3 },
  { id: 6, number: 'PROJ-2024-004', name: 'Engine Gasket System', clientId: 4 }
];

const suppliers = ['ABC Suppliers', 'XYZ Manufacturing', 'Quality Components Inc', 'Precision Parts Ltd', 'Global Materials Co'];

const partNumbers = [
  { number: 'FAU-IP-001', name: 'Instrument Panel Main Frame', cost: 125.50, clientId: 1 },
  { number: 'FAU-IP-002', name: 'Center Console Trim', cost: 45.00, clientId: 1 },
  { number: 'FAU-IP-003', name: 'Air Vent Bezel', cost: 12.75, clientId: 1 },
  { number: 'GIS-SB-001', name: 'Seat Belt Buckle Assembly', cost: 28.50, clientId: 2 },
  { number: 'GIS-SB-002', name: 'Belt Retractor Mechanism', cost: 65.00, clientId: 2 },
  { number: 'LUC-CH-001', name: 'Battery Housing Frame', cost: 450.00, clientId: 3 },
  { number: 'LUC-CH-002', name: 'Motor Mount Bracket', cost: 89.00, clientId: 3 },
  { number: 'ELK-GK-001', name: 'Cylinder Head Gasket', cost: 35.00, clientId: 4 },
  { number: 'ELK-GK-002', name: 'Oil Pan Seal', cost: 18.50, clientId: 4 },
  { number: 'MUB-SP-001', name: 'Suspension Spring', cost: 42.00, clientId: 5 },
  { number: 'MUB-SP-002', name: 'Stabilizer Bar', cost: 78.00, clientId: 5 },
  { number: 'TF-MF-001', name: 'Precision Shaft', cost: 156.00, clientId: 6 },
  { number: 'TF-MF-002', name: 'Bearing Housing', cost: 89.00, clientId: 6 }
];

// ============= HELPER FUNCTIONS =============
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function formatDate(d) { return d.toISOString().split('T')[0]; }
function formatTimestamp(d) { return d.toISOString(); }

function generateTeamMembers() {
  const roles = ['Team Leader', 'Quality Rep', 'Engineering Rep', 'Production Rep', 'Supplier Rep', 'Logistics Rep'];
  const count = randomInt(4, 7);
  const members = [];
  const usedIds = new Set();
  for (let i = 0; i < count && i < roles.length; i++) {
    let userId;
    do { userId = randomItem(userIds); } while (usedIds.has(userId));
    usedIds.add(userId);
    members.push({ userId, role: roles[i], assignedAt: formatTimestamp(new Date()) });
  }
  return members;
}

function generateContainmentActions(completed) {
  const baseDate = new Date();
  return [
    { id: 1, action: 'Quarantine all affected inventory in warehouse', responsible: randomItem(userIds), status: completed ? 'completed' : 'in_progress', dueDate: formatDate(new Date(baseDate.getTime() + 2*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null },
    { id: 2, action: '100% inspection of WIP and finished goods', responsible: randomItem(userIds), status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 3*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null },
    { id: 3, action: 'Sort and segregate suspect material by lot number', responsible: randomItem(userIds), status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 4*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null },
    { id: 4, action: 'Notify customer quality representative of containment status', responsible: randomItem(userIds), status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 1*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null },
    { id: 5, action: 'Implement temporary inspection station at end of line', responsible: randomItem(userIds), status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 5*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null }
  ];
}

function generateDetectionPoints() {
  return [
    { id: 1, point: 'Incoming Material Inspection', method: 'Visual and dimensional check per IQC-001', frequency: 'Each lot', effectiveness: 'High' },
    { id: 2, point: 'In-Process Inspection Station 3', method: 'Go/No-Go gauge verification', frequency: 'Every 50 pieces', effectiveness: 'Medium' },
    { id: 3, point: 'Final Assembly Verification', method: 'CMM measurement per QCP-123', frequency: '100% inspection', effectiveness: 'High' },
    { id: 4, point: 'Shipping Audit', method: 'Random sampling AQL 1.0', frequency: 'Each shipment', effectiveness: 'Low' }
  ];
}

function generateNonDetectionReasons() {
  return [
    { id: 1, reason: 'Sampling plan frequency insufficient to detect intermittent defect', improvement: 'Increase sample size from n=5 to n=13 per AQL tables', responsibleId: randomItem(userIds), dueDate: formatDate(new Date(Date.now() + 7*24*60*60*1000)) },
    { id: 2, reason: 'Inspection method does not cover the specific defect characteristic', improvement: 'Add measurement point for affected dimension to control plan', responsibleId: randomItem(userIds), dueDate: formatDate(new Date(Date.now() + 14*24*60*60*1000)) },
    { id: 3, reason: 'Operator training on defect identification was incomplete', improvement: 'Conduct refresher training with visual aids and limit samples', responsibleId: randomItem(userIds), dueDate: formatDate(new Date(Date.now() + 10*24*60*60*1000)) }
  ];
}

function generateFiveWhys(rootCause) {
  return {
    problem: rootCause,
    why1: { question: 'Why did the defect occur?', answer: 'Machine parameter was out of specification during production run' },
    why2: { question: 'Why was the parameter out of spec?', answer: 'Adjustment was not verified after scheduled maintenance activity' },
    why3: { question: 'Why was verification not performed?', answer: 'No checklist exists for post-maintenance parameter verification' },
    why4: { question: 'Why is there no verification checklist?', answer: 'Process documentation was not updated when new equipment was installed' },
    why5: { question: 'Why was documentation not updated?', answer: 'Management of change procedure was not followed during installation' },
    rootCause: 'Management of Change (MOC) procedure not followed during equipment installation',
    verifiedBy: randomItem(userIds),
    verifiedDate: formatDate(new Date())
  };
}

function generate4MEvaluation() {
  return {
    man: {
      evaluated: true,
      findings: 'Operator training records reviewed. Gap identified in procedure X-123 for new equipment operation.',
      isRootCause: false,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    },
    machine: {
      evaluated: true,
      findings: 'Equipment PM records indicate overdue preventive maintenance on spindle bearing. Vibration analysis shows degradation.',
      isRootCause: true,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    },
    method: {
      evaluated: true,
      findings: 'Work instruction WI-456 reviewed. Process sequence is correct but verification step was missing.',
      isRootCause: false,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    },
    material: {
      evaluated: true,
      findings: 'Material certification and COA reviewed. All properties within specification. No lot-to-lot variation detected.',
      isRootCause: false,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    },
    measurement: {
      evaluated: true,
      findings: 'Gage R&R study shows acceptable repeatability. Measurement system is adequate.',
      isRootCause: false,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    },
    environment: {
      evaluated: true,
      findings: 'Temperature and humidity logs reviewed. All readings within control limits.',
      isRootCause: false,
      evaluatedBy: randomItem(userIds),
      evaluatedDate: formatDate(new Date())
    }
  };
}

function generateFishbone() {
  return {
    man: [
      { cause: 'Training gap on new equipment', likelihood: 'Medium', investigated: true },
      { cause: 'Operator fatigue during extended shift', likelihood: 'Low', investigated: true },
      { cause: 'New operator unfamiliar with process', likelihood: 'Low', investigated: true }
    ],
    machine: [
      { cause: 'Worn tooling exceeding life cycle', likelihood: 'High', investigated: true },
      { cause: 'Calibration drift on measurement device', likelihood: 'Medium', investigated: true },
      { cause: 'Preventive maintenance overdue', likelihood: 'High', investigated: true }
    ],
    method: [
      { cause: 'Unclear work instruction step 5.3', likelihood: 'Medium', investigated: true },
      { cause: 'Process sequence error', likelihood: 'Low', investigated: true },
      { cause: 'Missing verification step in procedure', likelihood: 'High', investigated: true }
    ],
    material: [
      { cause: 'Supplier lot-to-lot variation', likelihood: 'Medium', investigated: true },
      { cause: 'Material storage conditions', likelihood: 'Low', investigated: true },
      { cause: 'Incoming material defect', likelihood: 'Low', investigated: true }
    ],
    measurement: [
      { cause: 'Gage R&R inadequate', likelihood: 'Low', investigated: true },
      { cause: 'Wrong measurement point used', likelihood: 'Medium', investigated: true },
      { cause: 'Sampling frequency insufficient', likelihood: 'High', investigated: true }
    ],
    environment: [
      { cause: 'Temperature variation in process area', likelihood: 'Low', investigated: true },
      { cause: 'Humidity affecting material', likelihood: 'Low', investigated: true },
      { cause: 'Contamination from adjacent process', likelihood: 'Medium', investigated: true }
    ]
  };
}

function generateCorrectiveActions(completed) {
  const baseDate = new Date();
  return [
    { id: 1, action: 'Replace worn tooling with new precision insert set', responsible: randomItem(userIds), department: 'Maintenance', status: completed ? 'completed' : 'in_progress', dueDate: formatDate(new Date(baseDate.getTime() + 7*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null, effectivenessVerified: completed },
    { id: 2, action: 'Update process parameters per engineering specification ES-2024-001', responsible: randomItem(userIds), department: 'Engineering', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 10*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null, effectivenessVerified: completed },
    { id: 3, action: 'Conduct operator retraining on updated procedure WI-456 Rev C', responsible: randomItem(userIds), department: 'Training', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 14*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null, effectivenessVerified: completed },
    { id: 4, action: 'Install poka-yoke device to prevent incorrect assembly orientation', responsible: randomItem(userIds), department: 'Engineering', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(baseDate.getTime() + 21*24*60*60*1000)), completedDate: completed ? formatDate(baseDate) : null, effectivenessVerified: completed }
  ];
}

function generateDefinitiveActions(completed) {
  return [
    { id: 1, action: 'Install new precision tooling with improved tolerance capability', responsible: randomItem(userIds), department: 'Engineering', dueDate: formatDate(new Date(Date.now() + 15*24*60*60*1000)), status: completed ? 'completed' : 'in_progress', effectiveness: completed ? 'verified' : 'pending', verificationMethod: 'Process capability study Cpk > 1.33' },
    { id: 2, action: 'Update control plan to include SPC monitoring on critical dimension', responsible: randomItem(userIds), department: 'Quality', dueDate: formatDate(new Date(Date.now() + 20*24*60*60*1000)), status: completed ? 'completed' : 'pending', effectiveness: completed ? 'verified' : 'pending', verificationMethod: 'Control chart analysis' },
    { id: 3, action: 'Modify fixture design for improved repeatability and reduced variation', responsible: randomItem(userIds), department: 'Engineering', dueDate: formatDate(new Date(Date.now() + 30*24*60*60*1000)), status: completed ? 'completed' : 'in_progress', effectiveness: completed ? 'verified' : 'pending', verificationMethod: 'Gage R&R study < 10%' }
  ];
}

function generateImplementationPlan(completed) {
  return {
    startDate: formatDate(new Date(Date.now() - 15*24*60*60*1000)),
    endDate: formatDate(new Date(Date.now() + 30*24*60*60*1000)),
    projectManager: randomItem(userIds),
    budget: randomInt(5000, 50000),
    milestones: [
      { id: 1, milestone: 'Tooling modification design complete', date: formatDate(new Date(Date.now() - 10*24*60*60*1000)), status: 'completed', owner: randomItem(userIds) },
      { id: 2, milestone: 'New tooling fabrication and delivery', date: formatDate(new Date(Date.now() - 5*24*60*60*1000)), status: 'completed', owner: randomItem(userIds) },
      { id: 3, milestone: 'Process validation run (30 pieces)', date: formatDate(new Date(Date.now() + 5*24*60*60*1000)), status: completed ? 'completed' : 'in_progress', owner: randomItem(userIds) },
      { id: 4, milestone: 'PPAP submission to customer', date: formatDate(new Date(Date.now() + 15*24*60*60*1000)), status: completed ? 'completed' : 'pending', owner: randomItem(userIds) },
      { id: 5, milestone: 'Full production release', date: formatDate(new Date(Date.now() + 25*24*60*60*1000)), status: completed ? 'completed' : 'pending', owner: randomItem(userIds) }
    ]
  };
}

function generateValidationPlan(completed) {
  return {
    method: 'Process Capability Study with Statistical Analysis',
    sampleSize: 50,
    samplingMethod: 'Consecutive production parts from validated process',
    acceptanceCriteria: 'Cpk >= 1.33 for all critical characteristics',
    measurementSystem: 'CMM calibrated per IATF 16949 requirements',
    results: completed ? {
      cpk: 1.67,
      cpkLower: 1.45,
      cpkUpper: 1.89,
      passed: true,
      validatedBy: randomItem(userIds),
      validatedDate: formatDate(new Date())
    } : null,
    signoffRequired: ['Quality Manager', 'Engineering Manager', 'Customer Quality Rep']
  };
}

function generatePreventiveActions(completed) {
  return [
    { id: 1, action: 'Add new inspection point to Control Plan CP-2024-001 Rev D', responsible: randomItem(userIds), department: 'Quality', status: completed ? 'completed' : 'in_progress', dueDate: formatDate(new Date(Date.now() + 7*24*60*60*1000)), documentRef: 'CP-2024-001 Rev D' },
    { id: 2, action: 'Update PFMEA to include new failure mode with RPN calculation', responsible: randomItem(userIds), department: 'Engineering', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(Date.now() + 10*24*60*60*1000)), documentRef: 'PFMEA-2024-001 Rev C' },
    { id: 3, action: 'Horizontal deployment review for similar processes in plant', responsible: randomItem(userIds), department: 'Quality', status: completed ? 'completed' : 'in_progress', dueDate: formatDate(new Date(Date.now() + 14*24*60*60*1000)), affectedProcesses: ['Line 2', 'Line 3', 'Line 5'] },
    { id: 4, action: 'Add failure mode to operator training curriculum', responsible: randomItem(userIds), department: 'Training', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(Date.now() + 21*24*60*60*1000)), documentRef: 'TRN-OP-2024-015' },
    { id: 5, action: 'Update incoming inspection procedure for supplier material', responsible: randomItem(userIds), department: 'Quality', status: completed ? 'completed' : 'pending', dueDate: formatDate(new Date(Date.now() + 14*24*60*60*1000)), documentRef: 'IQC-2024-001 Rev B' }
  ];
}

function generateConfirmationEvidence(completed) {
  return {
    documentsUpdated: [
      { document: 'Control Plan', reference: 'CP-2024-001', revision: 'Rev D', updatedDate: formatDate(new Date()), approvedBy: randomItem(userIds) },
      { document: 'PFMEA', reference: 'PFMEA-2024-001', revision: 'Rev C', updatedDate: formatDate(new Date()), approvedBy: randomItem(userIds) },
      { document: 'Work Instruction', reference: 'WI-456', revision: 'Rev B', updatedDate: formatDate(new Date()), approvedBy: randomItem(userIds) },
      { document: 'Inspection Procedure', reference: 'IP-123', revision: 'Rev C', updatedDate: formatDate(new Date()), approvedBy: randomItem(userIds) }
    ],
    auditPerformed: completed,
    auditDate: completed ? formatDate(new Date()) : null,
    auditResult: completed ? 'Satisfactory - All corrective actions verified effective' : null,
    auditorId: completed ? randomItem(userIds) : null,
    recurrenceMonitoring: {
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date(Date.now() + 90*24*60*60*1000)),
      frequency: 'Weekly review of defect data',
      responsibleId: randomItem(userIds)
    }
  };
}

function generateD3MfgData(completed) {
  return {
    temporaryControls: [
      { id: 1, control: 'Additional visual inspection point after operation 20', location: 'Station 5', implementedBy: randomItem(userIds), implementedDate: formatDate(new Date()) },
      { id: 2, control: 'Red tag system for suspect containers', location: 'Warehouse Zone B', implementedBy: randomItem(userIds), implementedDate: formatDate(new Date()) },
      { id: 3, control: 'Hourly process parameter verification', location: 'CNC Cell 3', implementedBy: randomItem(userIds), implementedDate: formatDate(new Date()) }
    ],
    inspectionPoints: [
      { id: 1, point: 'Pre-operation dimensional check', frequency: 'First piece and every 2 hours', method: 'Go/No-Go gauge', responsibleRole: 'Operator' },
      { id: 2, point: 'In-process visual inspection', frequency: 'Every 25 pieces', method: 'Visual per limit sample', responsibleRole: 'Quality Tech' },
      { id: 3, point: 'End of shift audit', frequency: 'Once per shift', method: 'Full dimensional check', responsibleRole: 'Quality Engineer' }
    ],
    parametersAdjusted: [
      { parameter: 'Spindle Speed', previousValue: '2500 RPM', newValue: '2200 RPM', reason: 'Reduce tool wear rate', approvedBy: randomItem(userIds) },
      { parameter: 'Feed Rate', previousValue: '0.15 mm/rev', newValue: '0.12 mm/rev', reason: 'Improve surface finish', approvedBy: randomItem(userIds) }
    ],
    pokaYokeDevices: [
      { id: 1, device: 'Orientation sensor on fixture', location: 'Assembly Station 3', type: 'Prevention', installedDate: formatDate(new Date()), verifiedBy: randomItem(userIds) }
    ],
    lineModifications: [
      { modification: 'Added lighting at inspection station', reason: 'Improve defect visibility', completedBy: randomItem(userIds), completedDate: formatDate(new Date()) }
    ],
    operatorTraining: [
      { topic: 'Defect identification refresher', trainedCount: 12, trainer: randomItem(userIds), trainingDate: formatDate(new Date()), documentRef: 'TRN-2024-045' }
    ],
    effectivenessValidation: completed ? {
      validated: true,
      defectRateBefore: '2.5%',
      defectRateAfter: '0.1%',
      improvement: '96%',
      validatedBy: randomItem(userIds),
      validatedDate: formatDate(new Date())
    } : null
  };
}

function generateLessonsLearned(rootCause, part) {
  return {
    summary: `Key learning from ${part.name} quality issue: ${rootCause}`,
    technicalLearning: 'Importance of following Management of Change procedures when installing new equipment. All process parameters must be validated and documented before production release.',
    processImprovement: 'Updated MOC procedure to include mandatory process capability study before production release.',
    trainingImprovement: 'Added equipment-specific training module to operator onboarding program.',
    horizontalDeployment: {
      applied: true,
      areas: ['Production Line 2', 'Production Line 3', 'Assembly Cell 5'],
      completedDate: formatDate(new Date()),
      verifiedBy: randomItem(userIds)
    },
    customerCommunication: 'Customer informed of root cause and corrective actions. PPAP update submitted and approved.',
    recommendations: [
      'Implement similar poka-yoke devices on all assembly stations',
      'Add MOC compliance check to internal audit schedule',
      'Consider predictive maintenance program for critical equipment'
    ]
  };
}

function generateTeamRecognition() {
  return {
    recognitionType: 'Team Excellence Award',
    teamName: '8D Problem Solving Team',
    achievement: 'Outstanding cross-functional collaboration and rapid root cause identification',
    awardedBy: randomItem(userIds),
    awardDate: formatDate(new Date()),
    ceremonyDate: formatDate(new Date(Date.now() + 7*24*60*60*1000)),
    teamMembers: userIds.slice(0, 5).map(id => ({ userId: id, contribution: 'Active participant' }))
  };
}

// ============= MAIN GENERATOR =============
async function generateReports() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Cleaning existing 8D data...');
    await client.query('DELETE FROM eightd_attachments');
    await client.query('DELETE FROM eightd_parts');
    await client.query('DELETE FROM eightd_status_history');
    await client.query('DELETE FROM eightd_reports');
    await client.query("SELECT setval('eightd_reports_id_seq', 1, false)");

    console.log('Generating 50 complete 8D reports...\n');

    for (let i = 1; i <= 50; i++) {
      // Distribute reports across steps more evenly
      const stepIndex = Math.floor((i - 1) / 6);
      const currentStep = currentSteps[Math.min(stepIndex, currentSteps.length - 1)];

      const clientData = randomItem(clients);
      const project = projects.find(p => p.clientId === clientData.id) || randomItem(projects);
      const part = partNumbers.find(p => p.clientId === clientData.id) || randomItem(partNumbers);
      const severity = randomItem(severities);
      const rootCause = randomItem(rootCauses);

      const progressMap = { 'D1': 12, 'D2': 25, 'D3': 37, 'D3-MFG': 45, 'D4': 55, 'D5': 68, 'D6': 80, 'D7': 92, 'D8': 100 };
      const progress = progressMap[currentStep];

      const issueDate = randomDate(new Date('2025-10-01'), new Date('2026-01-31'));
      const targetDate = randomDate(new Date('2026-02-01'), new Date('2026-05-30'));
      const createdAt = new Date(issueDate.getTime() + randomInt(1, 3) * 24*60*60*1000);

      // Determine completion status based on step
      const idx = currentSteps.indexOf(currentStep);
      const d1Done = idx >= 1, d2Done = idx >= 2, d3Done = idx >= 3, d3MfgDone = idx >= 4;
      const d4Done = idx >= 5, d5Done = idx >= 6, d6Done = idx >= 7, d7Done = idx >= 8, d8Done = idx >= 8;

      const status = d8Done ? 'Closed' : (idx >= 2 ? 'In Progress' : 'Open');
      const estimatedCost = randomInt(2000, 75000);
      const realCost = d3Done ? Math.round(estimatedCost * (0.7 + Math.random() * 0.5)) : null;

      // Generate all D-step data based on progress
      const teamMembers = generateTeamMembers();
      const containmentActions = d3Done ? generateContainmentActions(d3Done) : null;
      const detectionPoints = d3Done ? generateDetectionPoints() : null;
      const nonDetectionReasons = d3Done ? generateNonDetectionReasons() : null;
      const d3MfgData = d3MfgDone ? generateD3MfgData(d3MfgDone) : null;
      const fiveWhysAnalysis = d4Done ? generateFiveWhys(rootCause) : null;
      const fourMEval = d4Done ? generate4MEvaluation() : null;
      const fishboneAnalysis = d4Done ? generateFishbone() : null;
      const correctiveActions = d5Done ? generateCorrectiveActions(d5Done) : null;
      const definitiveActions = d6Done ? generateDefinitiveActions(d6Done) : null;
      const implementationPlan = d6Done ? generateImplementationPlan(d6Done) : null;
      const validationPlan = d6Done ? generateValidationPlan(d6Done) : null;
      const preventiveActions = d7Done ? generatePreventiveActions(d7Done) : null;
      const confirmationEvidence = d7Done ? generateConfirmationEvidence(d7Done) : null;
      const lessonsLearned = d8Done ? generateLessonsLearned(rootCause, part) : null;
      const teamRecognition = d8Done ? generateTeamRecognition() : null;

      const championId = randomItem(userIds);
      const createdBy = randomItem(userIds);

      const insertQuery = `
        INSERT INTO eightd_reports (
          report_id, title, description, supplier_name, supplier_account,
          part_number, part_name, problem_type, severity, tipo_issue, tipo_resp,
          timing_occurrence, estimated_cost, issue_date, target_closure_date,
          customer_impact, status, current_step, progress_percentage,
          issue_assigned_to, countermeasure_assigned_to, confirmation_assigned_to,
          created_by, created_at, updated_at,

          d1_team_members, d1_champion_id, d1_completed, d1_completed_at,

          d2_problem_description, d2_is_or_is_not, d2_completed, d2_completed_at,

          d3_containment_actions, d3_detection_points, d3_non_detection_reasons,
          d3_suspect_material_disposal, d3_conformance_guarantee, d3_requires_rework,
          d3_rework_unit_cost, d3_real_impact_cost, d3_completed, d3_completed_at,

          d3_mfg_status, d3_mfg_temporary_controls, d3_mfg_inspection_points,
          d3_mfg_parameters_adjusted, d3_mfg_poka_yoke_devices, d3_mfg_line_modifications,
          d3_mfg_operator_training, d3_mfg_effectiveness_validation,
          d3_mfg_responsible_user_id, d3_mfg_implementation_date, d3_mfg_completed, d3_mfg_completed_at,
          d3_mfg_current_approval_step, d3_mfg_approval_1_status, d3_mfg_approval_1_by, d3_mfg_approval_1_at,

          d4_analysis_technique, d4_root_causes, d4_five_whys_analysis, d4_fishbone_analysis,
          d4_potential_causes, d4_root_cause, d4_verification_method, d4_verification_evidence,
          d4_4m_evaluation, d4_5whys_analysis, d4_status, d4_completed, d4_completed_at,
          d4_temporary_countermeasure, d4_responsible_user_id, d4_implementation_date, d4_effectiveness_evaluation,
          d4_current_approval_step, d4_approval_1_status, d4_approval_1_by, d4_approval_1_at,

          d5_corrective_actions, d5_final_root_cause, d5_analysis_responsible_user_id,
          d5_status, d5_completed, d5_completed_at,
          d5_current_approval_step, d5_approval_1_status, d5_approval_1_by, d5_approval_1_at,

          d6_implementation_plan, d6_validation_plan, d6_definitive_actions,
          d6_status, d6_completed, d6_completed_at,
          d6_quality_approval_status, d6_quality_approved_by, d6_quality_approved_at,
          d6_current_approval_step, d6_approval_1_status, d6_approval_1_by, d6_approval_1_at,

          d7_preventive_actions, d7_confirmation_evidence, d7_status, d7_completed, d7_completed_at,
          d7_approved_by, d7_approved_at,
          d7_current_approval_step, d7_approval_1_status, d7_approval_1_by, d7_approval_1_at,

          d8_lessons_learned, d8_team_recognition, d8_followup_actions, d8_closure_notes,
          d8_status, d8_completed, d8_completed_at, d8_closed_at, d8_closed_by,
          d8_current_approval_step, d8_approval_1_status, d8_approval_1_by, d8_approval_1_at,

          current_approval_step, approval_1_status, approval_1_by, approval_1_at, approval_1_comments,
          approval_2_status, approval_2_by, approval_2_at, approval_2_comments,
          approval_3_status, approval_3_by, approval_3_at, approval_3_comments
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29,
          $30, $31, $32, $33,
          $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
          $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59,
          $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80,
          $81, $82, $83, $84, $85, $86, $87, $88, $89, $90,
          $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103,
          $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115,
          $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128,
          $129, $130, $131, $132, $133, $134, $135, $136, $137, $138, $139, $140
        ) RETURNING id
      `;

      const approver1 = randomItem(userIds);
      const approver2 = randomItem(userIds);
      const approver3 = randomItem(userIds);
      const approvalDate = new Date();

      const values = [
        // Basic info (1-25)
        `8D-2026-${String(i).padStart(4, '0')}`,
        `${randomItem(defectDescriptions)} - ${part.name}`,
        `Defect detected on ${part.name} (${part.number}) during ${randomItem(timingOccurrence)} phase for ${clientData.name}. Problem type: ${randomItem(problemTypes)}. Severity: ${severity}. Immediate containment actions initiated.`,
        randomItem(suppliers),
        `SUP-${randomInt(1000, 9999)}`,
        part.number, part.name, randomItem(problemTypes), severity, randomItem(tipoIssue), randomItem(tipoResp),
        randomItem(timingOccurrence), estimatedCost, formatDate(issueDate), formatDate(targetDate),
        `${severity} severity impact on ${clientData.name}. ${randomInt(100, 5000)} units potentially affected. ${severity === 'High' ? 'Line stoppage risk.' : 'Production continues with containment.'}`,
        status, currentStep, progress,
        randomItem(userIds), randomItem(userIds), randomItem(userIds),
        createdBy, createdAt, new Date(),

        // D1 (26-29)
        JSON.stringify(teamMembers), championId, d1Done, d1Done ? formatTimestamp(new Date(createdAt.getTime() + 1*24*60*60*1000)) : null,

        // D2 (30-33)
        d2Done ? `Detailed analysis: ${randomItem(defectDescriptions)}. Defect discovered during ${randomItem(timingOccurrence)} inspection at ${randomItem(['Station 3', 'Final Assembly', 'Incoming Inspection', 'Customer Site'])}. Affected lot: LOT-${randomInt(10000, 99999)}. Quantity affected: ${randomInt(50, 500)} units.` : null,
        d2Done ? JSON.stringify({
          isWhat: `${randomItem(problemTypes)} defect on ${part.name}`,
          isNotWhat: 'Other defect types or products not affected',
          isWhere: `Production Line ${randomInt(1, 5)}, ${randomItem(['Assembly', 'Machining', 'Molding'])} area`,
          isNotWhere: 'Other production lines and areas not affected',
          isWhen: `${randomItem(['First shift', 'Second shift', 'Third shift'])} operations, week ${randomInt(1, 52)}`,
          isNotWhen: 'Other shifts and time periods not affected',
          isExtent: `${randomInt(2, 15)}% of production lot, ${randomInt(50, 500)} units`,
          isNotExtent: 'Isolated to specific lot and date code'
        }) : null,
        d2Done, d2Done ? formatTimestamp(new Date(createdAt.getTime() + 2*24*60*60*1000)) : null,

        // D3 (34-43)
        d3Done ? JSON.stringify(containmentActions) : null,
        d3Done ? JSON.stringify(detectionPoints) : null,
        d3Done ? JSON.stringify(nonDetectionReasons) : null,
        d3Done ? 'Quarantined material to be scrapped or reworked per customer disposition. Scrap cost: $' + randomInt(1000, 10000) : null,
        d3Done ? '100% inspection implemented for all WIP and finished goods. Only conforming material will be shipped.' : null,
        d3Done ? randomInt(0, 1) === 1 : false,
        d3Done ? randomInt(5, 50) : null,
        d3Done ? realCost : null,
        d3Done, d3Done ? formatTimestamp(new Date(createdAt.getTime() + 4*24*60*60*1000)) : null,

        // D3-MFG (44-59)
        d3MfgDone ? 'approved' : 'draft',
        d3MfgDone ? JSON.stringify(d3MfgData?.temporaryControls) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.inspectionPoints) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.parametersAdjusted) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.pokaYokeDevices) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.lineModifications) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.operatorTraining) : null,
        d3MfgDone ? JSON.stringify(d3MfgData?.effectivenessValidation) : null,
        d3MfgDone ? randomItem(userIds) : null,
        d3MfgDone ? formatDate(new Date()) : null,
        d3MfgDone, d3MfgDone ? formatTimestamp(new Date()) : null,
        d3MfgDone ? 3 : 0,
        d3MfgDone ? 'approved' : 'pending',
        d3MfgDone ? approver1 : null,
        d3MfgDone ? formatTimestamp(approvalDate) : null,

        // D4 (60-80)
        d4Done ? randomItem(['5-Why', 'Fishbone', 'Is/Is Not', '4M', 'Fault Tree']) : null,
        d4Done ? JSON.stringify([rootCause]) : null,
        d4Done ? JSON.stringify(fiveWhysAnalysis) : null,
        d4Done ? JSON.stringify(fishboneAnalysis) : null,
        d4Done ? JSON.stringify(rootCauses.slice(0, 5)) : null,
        d4Done ? rootCause : null,
        d4Done ? 'Process capability study and designed experiment to verify root cause correlation' : null,
        d4Done ? `Cpk improved from ${(0.7 + Math.random() * 0.3).toFixed(2)} to ${(1.4 + Math.random() * 0.5).toFixed(2)} after implementing corrective action on identified root cause` : null,
        d4Done ? JSON.stringify(fourMEval) : null,
        d4Done ? JSON.stringify(fiveWhysAnalysis) : null,
        d4Done ? 'approved' : 'draft',
        d4Done, d4Done ? formatTimestamp(new Date(createdAt.getTime() + 7*24*60*60*1000)) : null,
        d4Done ? 'Temporary 100% inspection and quarantine of suspect lots' : null,
        d4Done ? randomItem(userIds) : null,
        d4Done ? formatDate(new Date(createdAt.getTime() + 5*24*60*60*1000)) : null,
        d4Done ? 'Defect rate reduced from 2.5% to 0.2% with temporary measures' : null,
        d4Done ? 3 : 0,
        d4Done ? 'approved' : 'pending',
        d4Done ? approver1 : null,
        d4Done ? formatTimestamp(approvalDate) : null,

        // D5 (81-90)
        d5Done ? JSON.stringify(correctiveActions) : null,
        d5Done ? rootCause : null,
        d5Done ? randomItem(userIds) : null,
        d5Done ? 'approved' : 'draft',
        d5Done, d5Done ? formatTimestamp(new Date(createdAt.getTime() + 10*24*60*60*1000)) : null,
        d5Done ? 3 : 0,
        d5Done ? 'approved' : 'pending',
        d5Done ? approver1 : null,
        d5Done ? formatTimestamp(approvalDate) : null,

        // D6 (91-103)
        d6Done ? JSON.stringify(implementationPlan) : null,
        d6Done ? JSON.stringify(validationPlan) : null,
        d6Done ? JSON.stringify(definitiveActions) : null,
        d6Done ? 'approved' : 'draft',
        d6Done, d6Done ? formatTimestamp(new Date(createdAt.getTime() + 21*24*60*60*1000)) : null,
        d6Done ? 'approved' : 'pending',
        d6Done ? approver2 : null,
        d6Done ? formatTimestamp(approvalDate) : null,
        d6Done ? 3 : 0,
        d6Done ? 'approved' : 'pending',
        d6Done ? approver1 : null,
        d6Done ? formatTimestamp(approvalDate) : null,

        // D7 (104-115)
        d7Done ? JSON.stringify(preventiveActions) : null,
        d7Done ? JSON.stringify(confirmationEvidence) : null,
        d7Done ? 'approved' : 'draft',
        d7Done, d7Done ? formatTimestamp(new Date(createdAt.getTime() + 30*24*60*60*1000)) : null,
        d7Done ? approver2 : null,
        d7Done ? formatTimestamp(approvalDate) : null,
        d7Done ? 3 : 0,
        d7Done ? 'approved' : 'pending',
        d7Done ? approver1 : null,
        d7Done ? formatTimestamp(approvalDate) : null,

        // D8 (116-128)
        d8Done ? JSON.stringify(lessonsLearned) : null,
        d8Done ? JSON.stringify(teamRecognition) : null,
        d8Done ? JSON.stringify([
          { action: 'Monitor defect rate weekly for 90 days', responsible: randomItem(userIds), dueDate: formatDate(new Date(Date.now() + 90*24*60*60*1000)) },
          { action: 'Conduct follow-up audit in 60 days', responsible: randomItem(userIds), dueDate: formatDate(new Date(Date.now() + 60*24*60*60*1000)) }
        ]) : null,
        d8Done ? 'All corrective and preventive actions verified effective. No recurrence detected in 90-day monitoring period. Customer accepted closure.' : null,
        d8Done ? 'approved' : 'draft',
        d8Done, d8Done ? formatTimestamp(new Date(createdAt.getTime() + 45*24*60*60*1000)) : null,
        d8Done ? formatTimestamp(new Date(createdAt.getTime() + 45*24*60*60*1000)) : null,
        d8Done ? approver3 : null,
        d8Done ? 3 : 0,
        d8Done ? 'approved' : 'pending',
        d8Done ? approver1 : null,
        d8Done ? formatTimestamp(approvalDate) : null,

        // General approval (129-140)
        d3Done ? 3 : (d2Done ? 2 : (d1Done ? 1 : 0)),
        d1Done ? 'approved' : 'pending',
        d1Done ? approver1 : null,
        d1Done ? formatTimestamp(approvalDate) : null,
        d1Done ? 'Team formation approved. All required functions represented.' : null,
        d2Done ? 'approved' : 'pending',
        d2Done ? approver2 : null,
        d2Done ? formatTimestamp(approvalDate) : null,
        d2Done ? 'Problem description complete and verified with customer.' : null,
        d3Done ? 'approved' : 'pending',
        d3Done ? approver3 : null,
        d3Done ? formatTimestamp(approvalDate) : null,
        d3Done ? 'Containment actions verified effective. Customer notified.' : null
      ];

      const result = await client.query(insertQuery, values);
      const reportId = result.rows[0].id;

      // Add parts with full project data
      const partsCount = randomInt(1, 4);
      for (let p = 0; p < partsCount; p++) {
        const partData = partNumbers.find(pn => pn.clientId === clientData.id) || randomItem(partNumbers);
        const partProject = projects.find(pr => pr.clientId === clientData.id) || project;

        const qtyWarehouse = randomInt(100, 1000);
        const qtyInProcess = randomInt(50, 300);
        const qtyInTransit = randomInt(20, 150);
        const qtyWithCustomer = randomInt(200, 2000);
        const totalQty = qtyWarehouse + qtyInProcess + qtyInTransit + qtyWithCustomer;

        await client.query(`
          INSERT INTO eightd_parts (
            report_id, client_id, client_name, project_id, project_number, project_name,
            part_id, part_number, part_name, client_part_number, revision, description,
            unit_cost, currency, specifications,
            qty_warehouse, qty_in_process, qty_in_transit, qty_with_customer,
            total_affected_qty, total_cost_impact
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `, [
          reportId, clientData.id, clientData.name,
          partProject.id, partProject.number, partProject.name,
          randomInt(1, 100), partData.number, partData.name,
          `CLI-${partData.number}`, `Rev ${String.fromCharCode(65 + randomInt(0, 3))}`,
          `${partData.name} - Affected by quality issue. Customer: ${clientData.name}. Project: ${partProject.name}`,
          partData.cost, 'USD',
          JSON.stringify({ material: randomItem(['Steel', 'Aluminum', 'Plastic', 'Composite']), weight: `${randomInt(1, 50) / 10} kg`, criticalDimensions: randomInt(3, 8) }),
          qtyWarehouse, qtyInProcess, qtyInTransit, qtyWithCustomer,
          totalQty, (partData.cost * totalQty).toFixed(2)
        ]);
      }

      // Add status history entries
      const historyEntries = [
        { prevStatus: null, newStatus: 'Open', prevStep: null, newStep: 'D1', reason: 'Report created and team assignment initiated', daysAfter: 0 }
      ];
      if (d1Done) historyEntries.push({ prevStatus: 'Open', newStatus: 'Open', prevStep: 'D1', newStep: 'D2', reason: 'Team formation complete, advancing to problem description', daysAfter: 1 });
      if (d2Done) historyEntries.push({ prevStatus: 'Open', newStatus: 'In Progress', prevStep: 'D2', newStep: 'D3', reason: 'Problem described, initiating containment actions', daysAfter: 2 });
      if (d3Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D3', newStep: 'D3-MFG', reason: 'Containment verified, manufacturing controls in place', daysAfter: 4 });
      if (d3MfgDone) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D3-MFG', newStep: 'D4', reason: 'MFG controls validated, proceeding to root cause analysis', daysAfter: 5 });
      if (d4Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D4', newStep: 'D5', reason: 'Root cause identified and verified, selecting corrective actions', daysAfter: 7 });
      if (d5Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D5', newStep: 'D6', reason: 'Corrective actions selected, proceeding to implementation', daysAfter: 10 });
      if (d6Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D6', newStep: 'D7', reason: 'Implementation complete, validating preventive actions', daysAfter: 21 });
      if (d7Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'In Progress', prevStep: 'D7', newStep: 'D8', reason: 'Preventive actions verified, preparing for closure', daysAfter: 30 });
      if (d8Done) historyEntries.push({ prevStatus: 'In Progress', newStatus: 'Closed', prevStep: 'D8', newStep: 'D8', reason: 'All actions complete, report closed successfully', daysAfter: 45 });

      for (const entry of historyEntries) {
        const historyDate = new Date(createdAt.getTime() + entry.daysAfter * 24*60*60*1000);
        await client.query(`
          INSERT INTO eightd_status_history (report_id, previous_status, new_status, previous_step, new_step, changed_by, change_reason, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [reportId, entry.prevStatus, entry.newStatus, entry.prevStep, entry.newStep, randomItem(userIds), entry.reason, historyDate]);
      }

      console.log(`✓ Report ${i}/50: ${`8D-2026-${String(i).padStart(4, '0')}`} | Step: ${currentStep.padEnd(6)} | Severity: ${severity.padEnd(6)} | ${clientData.name.substring(0, 25)}`);
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Successfully created 50 complete 8D reports!');
    console.log('='.repeat(80));

    // Summary
    const summaryStep = await pool.query(`SELECT current_step, COUNT(*) as count FROM eightd_reports GROUP BY current_step ORDER BY current_step`);
    const summarySev = await pool.query(`SELECT severity, COUNT(*) as count FROM eightd_reports GROUP BY severity ORDER BY severity`);
    const summaryStatus = await pool.query(`SELECT status, COUNT(*) as count FROM eightd_reports GROUP BY status`);
    const summaryParts = await pool.query(`SELECT COUNT(*) as count FROM eightd_parts`);
    const summaryCost = await pool.query(`SELECT SUM(estimated_cost) as total, AVG(estimated_cost) as avg FROM eightd_reports`);

    console.log('\n📊 Distribution by Step:');
    summaryStep.rows.forEach(r => console.log(`   ${r.current_step.padEnd(8)}: ${r.count} reports`));

    console.log('\n🎯 Distribution by Severity:');
    summarySev.rows.forEach(r => console.log(`   ${r.severity.padEnd(8)}: ${r.count} reports`));

    console.log('\n📋 Distribution by Status:');
    summaryStatus.rows.forEach(r => console.log(`   ${r.status.padEnd(12)}: ${r.count} reports`));

    console.log(`\n📦 Total Parts Created: ${summaryParts.rows[0].count}`);
    console.log(`💰 Total Estimated Cost: $${parseInt(summaryCost.rows[0].total).toLocaleString()}`);
    console.log(`💵 Average Cost per Report: $${parseInt(summaryCost.rows[0].avg).toLocaleString()}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateReports().catch(console.error);
