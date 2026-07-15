const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database connection
const { query, pool } = require('./config/database');

// Import endpoints modules
const authEndpoints = require('./endpoints/authEndpoints');
const usersEndpoints = require('./endpoints/usersEndpoints');
const clientsEndpoints = require('./endpoints/clients');
const clientPartsEndpoints = require('./endpoints/clientPartsEndpoints');
const projectsEndpoints = require('./endpoints/projectsEndpoints');
const teamPresetsEndpoints = require('./endpoints/teamPresetsEndpoints');
const eightDEndpoints = require('./endpoints/eightDEndpoints');
const approvalsEndpoints = require('./endpoints/approvalsEndpoints');
const sequentialApprovalEndpoints = require('./endpoints/sequentialApprovalEndpoints');
const approvalEndpoints = require('./endpoints/approvalEndpoints');
const auditLogEndpoints = require('./endpoints/auditLogEndpoints');
const eightDAttachmentsEndpoints = require('./endpoints/eightDAttachmentsEndpoints');
const clientDocumentsEndpoints = require('./endpoints/clientDocumentsEndpoints');
const clientContactsEndpoints = require('./endpoints/clientContactsEndpoints');
const clientTimelineEndpoints = require('./endpoints/clientTimelineEndpoints');
const uploadEvidenceEndpoints = require('./endpoints/uploadEvidenceEndpoints');
const distributionListsEndpoints = require('./endpoints/distributionListsEndpoints');
const d7ValidationEndpoints = require('./endpoints/d7ValidationEndpoints');
const d7AuditIntegrationEndpoints = require('./endpoints/d7AuditIntegrationEndpoints');
const lessonsLearnedEndpoints = require('./endpoints/lessonsLearnedEndpoints');
const ecrRoutes = require('./routes/ecrRoutes');
const riskMatrixRoutes = require('./routes/riskMatrixRoutes');
const impactAreasRoutes = require('./routes/impactAreasRoutes');
const teamTemplateEndpoints = require('./endpoints/teamTemplateEndpoints');
const workloadEndpoints = require('./endpoints/workloadEndpoints');
const defectEndpoints = require('./endpoints/defectEndpoints');
const defectAdminEndpoints = require('./endpoints/defectAdminEndpoints');
const qarEndpoints = require('./endpoints/qarEndpoints');
const mrbEndpoints = require('./endpoints/mrbEndpoints');
const auditEndpoints = require('./endpoints/auditEndpoints');
const inspectionCatalogEndpoints = require('./endpoints/inspectionCatalogEndpoints');
const { setupBomFieldConfigEndpoints } = require('./endpoints/bomFieldConfigEndpoints');
const rolesEndpoints = require('./endpoints/rolesEndpoints');
const departmentsEndpoints = require('./endpoints/departmentsEndpoints');
const workInstructionsEndpoints = require('./endpoints/workInstructionsEndpoints');
const wiPlantConfigEndpoints = require('./endpoints/wiPlantConfigEndpoints');
const managementReviewEndpoints = require('./endpoints/managementReviewEndpoints');
const stationConfigEndpoints = require('./endpoints/stationConfigEndpoints');
const specCatalogEndpoints = require('./endpoints/specCatalogEndpoints');
const unitRegistryEndpoints = require('./endpoints/unitRegistryEndpoints');
const specInspectionEndpoints = require('./endpoints/specInspectionEndpoints');
const locationCodesEndpoints = require('./endpoints/locationCodesEndpoints');
const hospitalDashboardEndpoints = require('./endpoints/hospitalDashboardEndpoints');
const hospitalRolesEndpoints = require('./endpoints/hospitalRolesEndpoints');
const deviationEndpoints = require('./endpoints/deviationEndpoints');
const skillsEndpoints = require('./endpoints/skillsEndpoints');
const productionEndpoints = require('./endpoints/productionEndpoints');
const webhookEndpoints = require('./endpoints/webhookEndpoints');
const { auditEightDChanges } = require('./middleware/auditMiddleware');
const authenticateToken = require('./middleware/auth');
const { checkWritePermission, attachUserPermissions } = require('./middleware/permissionMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Force UTF-8 charset for all responses (Spanish characters)
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

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

// Serve uploaded files statically (with CORS for html2canvas PDF export)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
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
// HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(result.rows[0].count);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      system: {
        name: '8D Problem Solving System',
        version: '2.0.0',
        activeUsers: userCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
app.post('/auth/login', authEndpoints.login);
app.get('/auth/me', authEndpoints.verifyToken, authEndpoints.getCurrentUser);

// ============================================================================
// USERS ENDPOINTS
// ============================================================================
app.get('/users/list', usersEndpoints.getUsersList);
app.get('/users/qar-validators', authEndpoints.verifyToken, usersEndpoints.getQarValidators);
app.get('/users/mrb-validators', authEndpoints.verifyToken, usersEndpoints.getMrbValidators);
app.post('/users', authEndpoints.verifyToken, usersEndpoints.requireAdmin, usersEndpoints.createUser);
app.get('/users/:id', usersEndpoints.getUserById);
app.put('/users/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, usersEndpoints.updateUser);
app.put('/users/:id/qar-validator', authEndpoints.verifyToken, usersEndpoints.requireAdmin, usersEndpoints.toggleQarValidator);
app.put('/users/:id/mrb-validator', authEndpoints.verifyToken, usersEndpoints.requireAdmin, usersEndpoints.toggleMrbValidator);

// ============================================================================
// ROLES & PERMISSIONS ENDPOINTS
// ============================================================================
// Roles CRUD
app.get('/roles', authEndpoints.verifyToken, rolesEndpoints.getRoles);
app.get('/roles/:id', authEndpoints.verifyToken, rolesEndpoints.getRoleById);
app.post('/roles', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.createRole);
app.put('/roles/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.updateRole);
app.delete('/roles/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.deleteRole);

// User-Role management
app.get('/users/:userId/roles', authEndpoints.verifyToken, rolesEndpoints.getUserRoles);
app.post('/users/:userId/roles', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.assignRoleToUser);
app.delete('/users/:userId/roles/:roleId', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.revokeRoleFromUser);
app.get('/users/:userId/permissions', authEndpoints.verifyToken, rolesEndpoints.getUserEffectivePermissions);

// Utilities
app.get('/modules', authEndpoints.verifyToken, rolesEndpoints.getAvailableModules);
app.get('/permission-audit-log', authEndpoints.verifyToken, usersEndpoints.requireAdmin, rolesEndpoints.getPermissionAuditLog);

console.log('✅ Roles & Permissions endpoints registered');

// ============================================================================
// DEPARTMENTS & ORGANIZATIONS ENDPOINTS
// ============================================================================
// Departments CRUD
app.get('/departments', authEndpoints.verifyToken, departmentsEndpoints.getDepartments);
app.get('/departments/:id', authEndpoints.verifyToken, departmentsEndpoints.getDepartmentById);
app.post('/departments', authEndpoints.verifyToken, usersEndpoints.requireAdmin, departmentsEndpoints.createDepartment);
app.put('/departments/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, departmentsEndpoints.updateDepartment);
app.delete('/departments/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, departmentsEndpoints.deleteDepartment);

// Organizations (Super Admin only)
app.get('/organizations', authEndpoints.verifyToken, usersEndpoints.requireAdmin, departmentsEndpoints.getOrganizations);
app.put('/organizations/:id/modules', authEndpoints.verifyToken, usersEndpoints.requireAdmin, departmentsEndpoints.updateOrganizationModules);

console.log('✅ Departments & Organizations endpoints registered');

// ============================================================================
// TEAM PRESETS ENDPOINTS
// ============================================================================
app.get('/users/:id/team-presets', authEndpoints.verifyToken, teamPresetsEndpoints.getUserTeamPresets);
app.post('/users/:id/team-presets', authEndpoints.verifyToken, teamPresetsEndpoints.createTeamPreset);
app.put('/users/:userId/team-presets/:presetId', authEndpoints.verifyToken, teamPresetsEndpoints.updateTeamPreset);
app.delete('/users/:userId/team-presets/:presetId', authEndpoints.verifyToken, teamPresetsEndpoints.deleteTeamPreset);

// ============================================================================
// DISTRIBUTION LISTS ENDPOINTS
// ============================================================================
app.get('/distribution-lists', authEndpoints.verifyToken, distributionListsEndpoints.getDistributionLists);
app.get('/distribution-lists/:id', authEndpoints.verifyToken, distributionListsEndpoints.getDistributionListById);
app.post('/distribution-lists', authEndpoints.verifyToken, distributionListsEndpoints.createDistributionList);
app.put('/distribution-lists/:id', authEndpoints.verifyToken, distributionListsEndpoints.updateDistributionList);
app.delete('/distribution-lists/:id', authEndpoints.verifyToken, distributionListsEndpoints.deleteDistributionList);

// ============================================================================
// CLIENTS ENDPOINTS
// ============================================================================
app.get('/clients/list', authEndpoints.verifyToken, clientsEndpoints.getClientsList);
app.get('/clients/:id', authEndpoints.verifyToken, clientsEndpoints.getClientById);
app.post('/clients/create', authEndpoints.verifyToken, clientsEndpoints.createClient);
app.put('/clients/:id', authEndpoints.verifyToken, clientsEndpoints.updateClient);
app.delete('/clients/:id', authEndpoints.verifyToken, clientsEndpoints.deleteClient);

// Client Parts (BOM) Endpoints
app.get('/clients/parts/all', authEndpoints.verifyToken, clientPartsEndpoints.getAllClientsParts); // Global BOM - Must be before :clientId routes
app.get('/parts/defects', authEndpoints.verifyToken, clientPartsEndpoints.getPartsDefects); // Get defects for multiple parts
app.get('/clients/:clientId/parts', authEndpoints.verifyToken, clientPartsEndpoints.getClientParts);
app.post('/clients/:clientId/parts', authEndpoints.verifyToken, clientPartsEndpoints.createClientPart);
app.put('/clients/:clientId/parts/:partId', authEndpoints.verifyToken, clientPartsEndpoints.updateClientPart);
app.delete('/clients/:clientId/parts/:partId', authEndpoints.verifyToken, clientPartsEndpoints.deleteClientPart);
app.patch('/clients/:clientId/parts/:partId/toggle-active', authEndpoints.verifyToken, clientPartsEndpoints.togglePartActive);

// Initialize client-related sub-modules
clientDocumentsEndpoints(app);
clientContactsEndpoints(app);
clientTimelineEndpoints(app);

// ============================================================================
// BOM FIELD CONFIGURATION ENDPOINTS (Admin Only)
// ============================================================================
setupBomFieldConfigEndpoints(app, authEndpoints.verifyToken);

// Initialize evidence upload endpoints (for D3-MFG)
uploadEvidenceEndpoints(app);

// ============================================================================
// PROJECTS ENDPOINTS
// ============================================================================
// Initialize all project endpoints (includes CRUD for projects and parts)
projectsEndpoints(app);

// ============================================================================
// 8D REPORTS ENDPOINTS
// ============================================================================
app.post('/8d/reports', authEndpoints.verifyToken, eightDEndpoints.createEightDReport);
app.get('/8d/reports/my-assigned', authEndpoints.verifyToken, eightDEndpoints.getMyAssignedReports);
app.get('/8d/reports/:reportId', authEndpoints.verifyToken, eightDEndpoints.getEightDReportById);
app.put('/8d/reports/:reportId', authEndpoints.verifyToken, auditEightDChanges, eightDEndpoints.updateEightDReport);
app.delete('/8d/reports/:reportId', authEndpoints.verifyToken, eightDEndpoints.deleteEightDReport);

// Partial updates for approved sections
app.put('/8d/reports/:reportId/update-parts', authEndpoints.verifyToken, auditEightDChanges, eightDEndpoints.updatePartsOnly);
app.put('/8d/reports/:reportId/update-d3', authEndpoints.verifyToken, auditEightDChanges, eightDEndpoints.updateD3Only);

// ============================================================================
// 8D APPROVAL ROUTES
// ============================================================================

// POST /8d/reports/:id/submit - Submit 8D report for approval
app.post('/8d/reports/:id/submit', authEndpoints.verifyToken, approvalsEndpoints.submitForApproval);

// POST /8d/reports/:id/approve - Approve a section
app.post('/8d/reports/:id/approve', authEndpoints.verifyToken, approvalsEndpoints.approveSection);

// POST /8d/reports/:id/reject - Reject a section
app.post('/8d/reports/:id/reject', authEndpoints.verifyToken, approvalsEndpoints.rejectSection);

// GET /8d/reports/:id/approval-status - Get approval status
app.get('/8d/reports/:id/approval-status', authEndpoints.verifyToken, approvalsEndpoints.getApprovalStatus);

// POST /8d/reports/:id/d3-mfg/approve - Approve or Reject D3-MFG
app.post('/8d/reports/:id/d3-mfg/approve', authEndpoints.verifyToken, approvalEndpoints.approveD3MFG);

// PUT /8d/reports/:id/d3-mfg/send-to-approval - Send D3-MFG to approval
app.put('/8d/reports/:id/d3-mfg/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD3MfgToApproval);

// POST /8d/reports/:id/d4/approve - Approve or Reject D4
app.post('/8d/reports/:id/d4/approve', authEndpoints.verifyToken, approvalEndpoints.approveD4);

// PUT /8d/reports/:id/d4/send-to-approval - Send D4 to approval
app.put('/8d/reports/:id/d4/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD4ToApproval);

// POST /8d/reports/:id/d5/approve - Approve or Reject D5
app.post('/8d/reports/:id/d5/approve', authEndpoints.verifyToken, approvalEndpoints.approveD5);

// PUT /8d/reports/:id/d5/send-to-approval - Send D5 to approval
app.put('/8d/reports/:id/d5/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD5ToApproval);

// POST /8d/reports/:id/d6/approve - Approve or Reject D6
app.post('/8d/reports/:id/d6/approve', authEndpoints.verifyToken, approvalEndpoints.approveD6);

// PUT /8d/reports/:id/d6/send-to-approval - Send D6 to approval
app.put('/8d/reports/:id/d6/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD6ToApproval);

// POST /8d/reports/:id/d7/approve - Approve or Reject D7
app.post('/8d/reports/:id/d7/approve', authEndpoints.verifyToken, approvalEndpoints.approveD7);

// PUT /8d/reports/:id/d7/send-to-approval - Send D7 to approval
app.put('/8d/reports/:id/d7/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD7ToApproval);

// POST /8d/reports/:id/d8/approve - Approve or Reject D8
app.post('/8d/reports/:id/d8/approve', authEndpoints.verifyToken, approvalEndpoints.approveD8);

// PUT /8d/reports/:id/d8/send-to-approval - Send D8 to approval
app.put('/8d/reports/:id/d8/send-to-approval', authEndpoints.verifyToken, approvalEndpoints.sendD8ToApproval);

// PUT /8d/reports/:id/revert-to-draft - Revert entire 8D to draft with versioning (Admin only)
// Creates archived copy and new revision (ISO compliant)
app.put('/8d/reports/:id/revert-to-draft', authEndpoints.verifyToken, approvalEndpoints.revertToDraft);

// ============================================================================
// 8D SEQUENTIAL APPROVAL ROUTES (D1-D2-D3)
// ============================================================================

// POST /8d/reports/:reportId/approve-step-1 - Approver 1 approves
app.post('/8d/reports/:reportId/approve-step-1', authEndpoints.verifyToken, sequentialApprovalEndpoints.approveStep1);

// POST /8d/reports/:reportId/approve-step-2 - Approver 2 approves
app.post('/8d/reports/:reportId/approve-step-2', authEndpoints.verifyToken, sequentialApprovalEndpoints.approveStep2);

// POST /8d/reports/:reportId/approve-step-3 - Approver 3 approves (FINAL)
app.post('/8d/reports/:reportId/approve-step-3', authEndpoints.verifyToken, sequentialApprovalEndpoints.approveStep3);

// POST /8d/reports/:reportId/reject-step-1 - Approver 1 rejects (back to Emisor)
app.post('/8d/reports/:reportId/reject-step-1', authEndpoints.verifyToken, sequentialApprovalEndpoints.rejectStep1);

// POST /8d/reports/:reportId/reject-step-2 - Approver 2 rejects (back to A1)
app.post('/8d/reports/:reportId/reject-step-2', authEndpoints.verifyToken, sequentialApprovalEndpoints.rejectStep2);

// POST /8d/reports/:reportId/reject-step-3 - Approver 3 rejects (back to A2)
app.post('/8d/reports/:reportId/reject-step-3', authEndpoints.verifyToken, sequentialApprovalEndpoints.rejectStep3);

// ============================================================================
// 8D AUDIT LOG ROUTES
// ============================================================================

// GET /8d/reports/:reportId/audit-log - Get complete audit trail for a report
app.get('/8d/reports/:reportId/audit-log', authEndpoints.verifyToken, auditLogEndpoints.getReportAuditLog);
// POST /8d/reports/:reportId/audit-log - Log an action from frontend
app.post('/8d/reports/:reportId/audit-log', authEndpoints.verifyToken, auditLogEndpoints.postReportAuditLog);
// GET /8d/reports/:reportId/revisions - Get all revisions in the same family
app.get('/8d/reports/:reportId/revisions', authEndpoints.verifyToken, auditLogEndpoints.getReportRevisions);

// ============================================================================
// 8D D6 APPROVAL ROUTES (Definitive Countermeasure)
// ============================================================================

// POST /8d/reports/:reportId/d6/approve - Quality approves D6
app.post('/8d/reports/:reportId/d6/approve', authEndpoints.verifyToken, eightDEndpoints.approveD6);

// POST /8d/reports/:reportId/d6/reject - Quality rejects D6
app.post('/8d/reports/:reportId/d6/reject', authEndpoints.verifyToken, eightDEndpoints.rejectD6);

// POST /8d/reports/:reportId/d6-evidence/upload - Upload D6 evidence files
app.post('/8d/reports/:reportId/d6-evidence/upload',
  authEndpoints.verifyToken,
  upload.array('files', 10), // Allow up to 10 files
  eightDEndpoints.uploadD6Evidence
);

// DELETE /8d/reports/:reportId/d6-evidence/:filename - Delete D6 evidence file
app.delete('/8d/reports/:reportId/d6-evidence/:filename',
  authEndpoints.verifyToken,
  eightDEndpoints.deleteD6Evidence
);

// ============================================================================
// D7 VALIDATION ROUTES (Complete validation structure)
// ============================================================================
app.use('/api/8d', authEndpoints.verifyToken, d7ValidationEndpoints);

// ============================================================================
// D7 AUDIT INTEGRATION ROUTES (Audit system integration with leader evaluation)
// ============================================================================
app.use('/api/8d', authEndpoints.verifyToken, d7AuditIntegrationEndpoints);

// ============================================================================
// 8D ATTACHMENTS ROUTES (Photos & Documents)
// ============================================================================

// POST /8d/reports/:reportId/attachments - Upload file (photo or document)
app.post('/8d/reports/:reportId/attachments',
  authEndpoints.verifyToken,
  upload.single('file'),
  eightDAttachmentsEndpoints.uploadAttachment
);

// GET /8d/reports/:reportId/attachments - Get all attachments
app.get('/8d/reports/:reportId/attachments',
  authEndpoints.verifyToken,
  eightDAttachmentsEndpoints.getAttachments
);

// PUT /8d/reports/:reportId/attachments/:attachmentId - Update attachment metadata
app.put('/8d/reports/:reportId/attachments/:attachmentId',
  authEndpoints.verifyToken,
  eightDAttachmentsEndpoints.updateAttachment
);

// DELETE /8d/reports/:reportId/attachments/:attachmentId - Delete attachment
app.delete('/8d/reports/:reportId/attachments/:attachmentId',
  authEndpoints.verifyToken,
  eightDAttachmentsEndpoints.deleteAttachment
);

// ============================================================================
// LESSONS LEARNED ROUTES
// ============================================================================

// GET /lessons-learned - Get all lessons learned with 8D report data
app.get('/lessons-learned',
  authEndpoints.verifyToken,
  lessonsLearnedEndpoints.getAllLessonsLearned
);

// GET /lessons-learned/report/:reportId - Get lessons learned for a specific report
app.get('/lessons-learned/report/:reportId',
  authEndpoints.verifyToken,
  lessonsLearnedEndpoints.getLessonsLearnedByReport
);

// POST /lessons-learned - Create a new lesson learned
app.post('/lessons-learned',
  authEndpoints.verifyToken,
  lessonsLearnedEndpoints.createLessonLearned
);

// PUT /lessons-learned/:id - Update a lesson learned
app.put('/lessons-learned/:id',
  authEndpoints.verifyToken,
  lessonsLearnedEndpoints.updateLessonLearned
);

// DELETE /lessons-learned/:id - Delete a lesson learned
app.delete('/lessons-learned/:id',
  authEndpoints.verifyToken,
  lessonsLearnedEndpoints.deleteLessonLearned
);

// ============================================================================
// 8D DASHBOARD ROUTES
// ============================================================================

// GET /8d/dashboard-data - Get 8D dashboard statistics (Executive Dashboard)
app.get('/8d/dashboard-data', async (req, res) => {
  try {
    const { transformToCamelCase } = require('./utils/caseTransform');

    // Basic counts
    const totalResult = await query('SELECT COUNT(*) FROM eightd_reports');
    const activeResult = await query('SELECT COUNT(*) FROM eightd_reports WHERE LOWER(status) != \'closed\'');
    const closedResult = await query('SELECT COUNT(*) FROM eightd_reports WHERE LOWER(status) = \'closed\'');
    const highSevResult = await query('SELECT COUNT(*) FROM eightd_reports WHERE severity = \'High\'');
    const mediumSevResult = await query('SELECT COUNT(*) FROM eightd_reports WHERE severity = \'Medium\'');
    const lowSevResult = await query('SELECT COUNT(*) FROM eightd_reports WHERE severity = \'Low\'');
    const costResult = await query('SELECT SUM(estimated_cost) as total FROM eightd_reports');

    // Average days to close (for closed reports)
    const avgCloseResult = await query(`
      SELECT AVG(EXTRACT(DAY FROM d8_closed_at - created_at)) as avg_days
      FROM eightd_reports
      WHERE LOWER(status) = 'closed' AND d8_closed_at IS NOT NULL
    `);

    // SLA Compliance - Get reports with client SLA data
    // Uses d4_approval_X_at timestamps (same logic as D4 frontend timer)
    const slaResult = await query(`
      WITH report_sla AS (
        SELECT DISTINCT ON (r.id)
          r.id,
          r.created_at,
          r.d4_status,
          COALESCE(r.d4_approval_3_at, r.d4_approval_2_at, r.d4_approval_1_at) as d4_completed_at,
          c.d4_response_time_hours
        FROM eightd_reports r
        JOIN eightd_parts ep ON ep.report_id = r.id
        JOIN clients c ON ep.client_id = c.id
        WHERE c.d4_response_time_hours IS NOT NULL
        ORDER BY r.id
      )
      SELECT
        COUNT(*) as total_with_sla,
        COUNT(CASE
          WHEN d4_status = 'approved'
            AND d4_completed_at IS NOT NULL
            AND EXTRACT(EPOCH FROM (d4_completed_at - created_at))/3600 <= d4_response_time_hours
          THEN 1
        END) as within_sla
      FROM report_sla
    `);

    // Cost by Department (prefer department_id FK, fallback to created_by user)
    const costByDeptResult = await query(`
      SELECT
        COALESCE(d.name, u.department, 'Sin Asignar') as department,
        SUM(r.estimated_cost) as total_cost,
        COUNT(*) as count
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      GROUP BY COALESCE(d.name, u.department, 'Sin Asignar')
      ORDER BY total_cost DESC NULLS LAST
    `);

    // Average days open by Department
    const avgDaysByDeptResult = await query(`
      SELECT
        COALESCE(d.name, u.department, 'Sin Asignar') as department,
        AVG(EXTRACT(DAY FROM NOW() - r.created_at)) as avg_days,
        COUNT(*) as count
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE LOWER(r.status) != 'closed'
      GROUP BY COALESCE(d.name, u.department, 'Sin Asignar')
      ORDER BY avg_days DESC NULLS LAST
    `);

    // Monthly trend (last 12 months)
    const monthlyTrendResult = await query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(estimated_cost) as total_cost
      FROM eightd_reports
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `);

    // Top Root Causes
    const rootCausesResult = await query(`
      SELECT
        d4_root_cause as root_cause,
        COUNT(*) as count
      FROM eightd_reports
      WHERE d4_root_cause IS NOT NULL AND d4_root_cause != ''
      GROUP BY d4_root_cause
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top Suppliers
    const topSuppliersResult = await query(`
      SELECT
        supplier_name,
        COUNT(*) as count,
        SUM(estimated_cost) as total_cost
      FROM eightd_reports
      WHERE supplier_name IS NOT NULL
      GROUP BY supplier_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // All reports with days open and department
    const reportsResult = await query(`
      SELECT
        r.id, r.report_id, r.title, r.supplier_name, r.severity, r.status, r.current_step,
        r.issue_date, r.target_closure_date, r.estimated_cost, r.created_at, r.progress_percentage,
        r.d4_root_cause, r.department_id,
        EXTRACT(DAY FROM NOW() - r.created_at)::integer as days_open,
        COALESCE(d.name, u.department, 'Sin Asignar') as created_by_department,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
    `);

    // INSIGHTS DATA - Cost by severity
    const costBySeverityResult = await query(`
      SELECT severity, SUM(estimated_cost) as cost, COUNT(*) as count
      FROM eightd_reports
      GROUP BY severity
    `);

    // Throughput: closed reports per month (last 12 months)
    const throughputResult = await query(`
      SELECT TO_CHAR(d8_closed_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM eightd_reports
      WHERE d8_closed_at IS NOT NULL AND d8_closed_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `);

    // Reverted: unique base reports that have been sent back to draft (have -R1, -R2, etc.)
    const revertedResult = await query(`
      SELECT
        COUNT(DISTINCT SPLIT_PART(report_id, '-R', 1)) as families_reverted,
        COUNT(*) as total_revisions
      FROM eightd_reports
      WHERE report_id ~ '-R[0-9]+$'
    `);

    // Avg progress by department (active reports)
    const avgProgressByDeptResult = await query(`
      SELECT
        COALESCE(d.name, u.department, 'Sin Asignar') as department,
        ROUND(AVG(r.progress_percentage)::numeric, 1) as avg_progress,
        COUNT(*) as count
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE LOWER(r.status) != 'closed'
      GROUP BY COALESCE(d.name, u.department, 'Sin Asignar')
      ORDER BY avg_progress DESC NULLS LAST
    `);

    // Incidents by department (for Pareto)
    const incidentsByDeptResult = await query(`
      SELECT
        COALESCE(d.name, u.department, 'Sin Asignar') as department,
        COUNT(*) as count
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      GROUP BY COALESCE(d.name, u.department, 'Sin Asignar')
      ORDER BY count DESC
    `);

    // Step distribution by department (for stacked bar)
    const stepsByDeptResult = await query(`
      SELECT
        COALESCE(d.name, u.department, 'Sin Asignar') as department,
        r.current_step,
        COUNT(*) as count
      FROM eightd_reports r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE LOWER(r.status) != 'closed'
      GROUP BY COALESCE(d.name, u.department, 'Sin Asignar'), r.current_step
      ORDER BY COALESCE(d.name, u.department, 'Sin Asignar'), r.current_step
    `);

    // Calculate SLA percentage
    const slaData = slaResult.rows[0];
    const slaCompliance = slaData.total_with_sla > 0
      ? Math.round((parseInt(slaData.within_sla) / parseInt(slaData.total_with_sla)) * 100)
      : 0;

    // Calculate insights
    const totalCost = parseFloat(costResult.rows[0].total || 0);
    const total8Ds = parseInt(totalResult.rows[0].count);

    // High severity cost percentage
    const highSevCost = costBySeverityResult.rows.find(r => r.severity === 'High');
    const highSevCostPct = totalCost > 0 && highSevCost
      ? Math.round((parseFloat(highSevCost.cost) / totalCost) * 100)
      : 0;

    // Top root cause
    const topRootCause = rootCausesResult.rows[0]?.root_cause || 'Sin definir';

    // Top 2 suppliers percentage
    const top2Suppliers = topSuppliersResult.rows.slice(0, 2);
    const top2SuppliersCount = top2Suppliers.reduce((sum, s) => sum + parseInt(s.count), 0);
    const top2SuppliersPct = total8Ds > 0 ? Math.round((top2SuppliersCount / total8Ds) * 100) : 0;
    const top2SuppliersNames = top2Suppliers.map(s => s.supplier_name).join(' y ');

    // Top department
    const topDept = incidentsByDeptResult.rows[0];
    const topDeptPct = total8Ds > 0 && topDept ? Math.round((parseInt(topDept.count) / total8Ds) * 100) : 0;
    const topDeptName = topDept?.department || 'Sin Asignar';

    // Build Pareto data for departments
    let cumulative = 0;
    const paretoByDept = incidentsByDeptResult.rows.map(r => {
      cumulative += parseInt(r.count);
      return {
        department: r.department,
        count: parseInt(r.count),
        cumulative: cumulative,
        cumulativePct: Math.round((cumulative / total8Ds) * 100)
      };
    });

    // Build step distribution by department (for stacked bar chart)
    const deptStepMap = {};
    stepsByDeptResult.rows.forEach(r => {
      if (!deptStepMap[r.department]) {
        deptStepMap[r.department] = { department: r.department, D1: 0, D2: 0, D3: 0, 'D3-MFG': 0, D4: 0, D5: 0, D6: 0, D7: 0, D8: 0, total: 0 };
      }
      const step = r.current_step || 'D1';
      deptStepMap[r.department][step] = parseInt(r.count);
      deptStepMap[r.department].total += parseInt(r.count);
    });
    const stepsByDepartment = Object.values(deptStepMap).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        // Basic KPIs
        total8Ds: parseInt(totalResult.rows[0].count),
        active8Ds: parseInt(activeResult.rows[0].count),
        closed8Ds: parseInt(closedResult.rows[0].count),
        highSeverity: parseInt(highSevResult.rows[0].count),
        mediumSeverity: parseInt(mediumSevResult.rows[0].count),
        lowSeverity: parseInt(lowSevResult.rows[0].count),
        totalEstimatedCost: parseFloat(costResult.rows[0].total || 0),

        // New KPIs
        avgDaysToClose: parseFloat(avgCloseResult.rows[0].avg_days || 0).toFixed(1),
        slaCompliance: slaCompliance,

        // Charts data
        costByDepartment: costByDeptResult.rows.map(r => ({
          department: r.department,
          cost: parseFloat(r.total_cost || 0),
          count: parseInt(r.count)
        })),
        avgDaysByDepartment: avgDaysByDeptResult.rows.map(r => ({
          department: r.department,
          avgDays: parseFloat(r.avg_days || 0).toFixed(1),
          count: parseInt(r.count)
        })),
        monthlyTrend: monthlyTrendResult.rows.map(r => ({
          month: r.month,
          count: parseInt(r.count),
          cost: parseFloat(r.total_cost || 0)
        })),
        topRootCauses: rootCausesResult.rows.map(r => ({
          cause: r.root_cause,
          count: parseInt(r.count)
        })),
        topSuppliers: topSuppliersResult.rows.map(r => ({
          supplier: r.supplier_name,
          count: parseInt(r.count),
          cost: parseFloat(r.total_cost || 0)
        })),

        // Pareto by department
        paretoByDepartment: paretoByDept,

        // Steps by department (stacked bar)
        stepsByDepartment: stepsByDepartment,

        // Dynamic Insights
        insights: {
          highSevCostPct,
          topRootCause,
          top2SuppliersPct,
          top2SuppliersNames,
          topDeptPct,
          topDeptName
        },

        // Cost by severity
        costBySeverity: costBySeverityResult.rows.map(r => ({
          severity: r.severity,
          cost: parseFloat(r.cost || 0),
          count: parseInt(r.count)
        })),

        // Throughput (closed per month)
        throughputByMonth: throughputResult.rows.map(r => ({
          month: r.month,
          count: parseInt(r.count)
        })),

        // Reverted reports
        revertedFamilies: parseInt(revertedResult.rows[0]?.families_reverted || 0),
        totalRevisions: parseInt(revertedResult.rows[0]?.total_revisions || 0),

        // Avg progress by department
        avgProgressByDept: avgProgressByDeptResult.rows.map(r => ({
          department: r.department,
          avgProgress: parseFloat(r.avg_progress || 0),
          count: parseInt(r.count)
        })),

        // All reports with extra fields
        recent8Ds: transformToCamelCase(reportsResult.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// ============================================================================
// ECR/ECO ROUTES (Engineering Change Request/Order)
// ============================================================================
app.use('/ecr', ecrRoutes);

// ============================================================================
// WORKLOAD MANAGEMENT ROUTES
// ============================================================================
app.use('/workload', workloadEndpoints);

// ============================================================================
// DEFECT / INITIAL CONCERNS ROUTES
// ============================================================================
app.use('/defects', defectEndpoints);
app.use('/defects-v2', defectAdminEndpoints);
app.use('/location-codes', locationCodesEndpoints);
app.use('/hospital-dashboard', hospitalDashboardEndpoints);

// Hospital User Roles - CRUD para roles secundarios de Hospital
app.get('/hospital-roles', authEndpoints.verifyToken, hospitalRolesEndpoints.getHospitalUsers);
app.get('/hospital-roles/user/:userId', authEndpoints.verifyToken, hospitalRolesEndpoints.getUserHospitalRoles);
app.get('/hospital-roles/check/:userId', authEndpoints.verifyToken, hospitalRolesEndpoints.checkUserHospitalPermissions);
app.post('/hospital-roles', authEndpoints.verifyToken, usersEndpoints.requireAdmin, hospitalRolesEndpoints.assignHospitalRole);
app.put('/hospital-roles/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, hospitalRolesEndpoints.updateHospitalRole);
app.delete('/hospital-roles/:id', authEndpoints.verifyToken, usersEndpoints.requireAdmin, hospitalRolesEndpoints.deleteHospitalRole);
app.delete('/hospital-roles/user/:userId/role/:role', authEndpoints.verifyToken, usersEndpoints.requireAdmin, hospitalRolesEndpoints.removeUserHospitalRole);

app.use('/skills', skillsEndpoints);
app.use('/deviations', deviationEndpoints);
console.log('✅ Deviations endpoints registered');
app.use('/qar', qarEndpoints);
app.use('/mrb', mrbEndpoints);

// ============================================================================
// AUDIT ISO MODULE ROUTES
// ============================================================================
app.use('/audit', auditEndpoints);

// ============================================================================
// INSPECTION CATALOG ROUTES (per-client configuration)
// ============================================================================
app.use('/inspection-catalogs', inspectionCatalogEndpoints(pool));

// ============================================================================
// STATION CONFIGURATION ROUTES (specs/defects per station)
// ============================================================================
app.use('/station-config', stationConfigEndpoints);
console.log('✅ Station Configuration endpoints registered');

// ============================================================================
// SPEC CATALOG ROUTES (part specifications)
// ============================================================================
app.use('/spec-catalog', specCatalogEndpoints);
console.log('✅ Spec Catalog endpoints registered');

// ============================================================================
// UNIT REGISTRY ROUTES (serial/lot traceability)
// ============================================================================
app.use('/unit-registry', unitRegistryEndpoints);
console.log('✅ Unit Registry endpoints registered');

// ============================================================================
// PRODUCTION ENTRIES ROUTES (production data from external systems)
// ============================================================================
app.use('/production', authEndpoints.verifyToken, productionEndpoints);
console.log('✅ Production Entries endpoints registered');

// ============================================================================
// WEBHOOK ROUTES (external systems integration - SAP, MES, EPICOR, etc.)
// ============================================================================
app.use('/webhook', webhookEndpoints);  // Auth manejada internamente por API key
console.log('✅ Webhook endpoints registered');

// ============================================================================
// SPEC INSPECTION ROUTES (spec inspection capture)
// ============================================================================
app.use('/spec-inspection', specInspectionEndpoints);
console.log('✅ Spec Inspection endpoints registered');

// ============================================================================
// TEAM TEMPLATES ROUTES
// ============================================================================
app.get('/team-templates', authenticateToken, teamTemplateEndpoints.getTeamTemplates);
app.get('/team-templates/:id', authenticateToken, teamTemplateEndpoints.getTeamTemplateById);
app.post('/team-templates', authenticateToken, teamTemplateEndpoints.createTeamTemplate);
app.put('/team-templates/:id', authenticateToken, teamTemplateEndpoints.updateTeamTemplate);
app.delete('/team-templates/:id', authenticateToken, teamTemplateEndpoints.deleteTeamTemplate);

// ============================================================================
// RISK MATRIX ROUTES
// ============================================================================
app.use('/risk-matrix', riskMatrixRoutes);

// ============================================================================
// IMPACT AREAS CONFIGURATION ROUTES
// ============================================================================
app.use('/impact-areas', impactAreasRoutes);

// ============================================================================
// WORK INSTRUCTIONS MODULE
// ============================================================================
workInstructionsEndpoints(app);
wiPlantConfigEndpoints(app);
console.log('✅ Work Instructions endpoints registered');
console.log('✅ WI Plant Configuration endpoints registered');

// ============================================================================
// MANAGEMENT REVIEW MODULE
// ============================================================================
managementReviewEndpoints(app);


// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, async () => {
  try {
    // Test database connection
    const result = await query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(result.rows[0].count);

    console.log('\n');
    console.log('🔧 QUALITY ALERT SYSTEM - 8D MODULE v2.0 (PostgreSQL)');
    console.log('============================================');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Login endpoint: http://localhost:${PORT}/auth/login`);
    console.log(`🎯 8D Dashboard: http://localhost:${PORT}/8d/dashboard-data`);
    console.log('');
    console.log('✅ PostgreSQL Database Connected');
    console.log(`👥 Total Users: ${userCount}`);
    console.log('');
    console.log('✅ Quality Alert System ready for use');
    console.log(`📱 Frontend URL: http://localhost:3000`);
    console.log('============================================\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
});

module.exports = app;
