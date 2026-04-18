import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import Login from './components/Auth/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import EightDWorkflow from './pages/8DWorkflow';
import EightDConsultation from './pages/8DConsultation';
import UserManagement from './pages/UserManagement';
import ClientsList from './pages/ClientsList';
import ClientDetail from './pages/ClientDetail';
import CreateClient from './pages/CreateClient';
import LessonsLearned from './pages/LessonsLearned';
import ECRWorkflow from './pages/ECRWorkflow';
import ECRDashboard from './pages/ECRDashboard';
import ECRDashboardPowerBI from './pages/ECRDashboardPowerBI';
import RiskMatrixConfig from './pages/RiskMatrixConfig';
import ImpactAnalysisConfig from './pages/ImpactAnalysisConfig';
import WorkloadManager from './pages/WorkloadManager';
import DefectAdmin from './pages/DefectAdmin';
import DefectAdminV2 from './pages/DefectAdminV2';
import DefectCapture from './pages/DefectCapture';
import DefectConfig from './pages/DefectConfig';
import DefectQuery from './pages/DefectQuery';
import QARCreate from './pages/QARCreate';
import QARList from './pages/QARList';
import QARDetail from './pages/QARDetail';
import QARDashboard from './pages/QARDashboard';
// MRB Module
import MRBCreate from './pages/MRBCreate';
import MRBCampaigns from './pages/MRBCampaigns';
import MRBCampaignDetail from './pages/MRBCampaignDetail';
import MRBDashboard from './pages/MRBDashboard';
import MRBDefectCapture from './pages/MRBDefectCapture';
// Audit Module
import AuditDashboard from './pages/AuditDashboard';
import AuditPrograms from './pages/AuditPrograms';
import AuditProgramDetail from './pages/AuditProgramDetail';
import AuditCalendar from './pages/AuditCalendar';
import AuditScheduleCreate from './pages/AuditScheduleCreate';
import AuditChecklists from './pages/AuditChecklists';
import AuditChecklistDetail from './pages/AuditChecklistDetail';
import AuditExecute from './pages/AuditExecute';
import AuditDetail from './pages/AuditDetail';
import AuditNCList from './pages/AuditNCList';
import AuditNCDetail from './pages/AuditNCDetail';
import AuditAuditors from './pages/AuditAuditors';
import AuditRequests from './pages/AuditRequests';
// Roles & Permissions
import RolesManagement from './pages/RolesManagement';
import DepartmentsManagement from './pages/DepartmentsManagement';
// Unified Configuration
import ConfigurationPage from './pages/ConfigurationPage';
// Work Instructions Module
import { WorkInstructionsList, WorkInstructionDetail, WIPlantConfig, WIDashboard } from './components/WorkInstructions';
// Management Review
import ManagementReview from './pages/ManagementReview';
// Statistical Tools
import StatisticalTools from './pages/StatisticalTools';


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#FAFBFC'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #E6EAEE',
            borderTop: '4px solid #0072CE',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Cargando...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <ConfirmationProvider>
          <AuthProvider>
            <Router>
              <div className="App">
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }

                  * {
                    box-sizing: border-box;
                  }

                  body {
                    margin: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  }
                `}
              </style>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Home - Apps Launcher */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />

              {/* 8D App - Dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* New unified 8D Workflow */}
              <Route path="/8d-workflow" element={
                <ProtectedRoute>
                  <EightDWorkflow />
                </ProtectedRoute>
              } />

              {/* 8D Consultation page */}
              <Route path="/8d-consultation" element={
                <ProtectedRoute>
                  <EightDConsultation />
                </ProtectedRoute>
              } />

              {/* User Management page */}
              <Route path="/user-management" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />

              {/* Roles Management page */}
              <Route path="/roles-management" element={
                <ProtectedRoute>
                  <RolesManagement />
                </ProtectedRoute>
              } />

              {/* Departments Management page */}
              <Route path="/departments-management" element={
                <ProtectedRoute>
                  <DepartmentsManagement />
                </ProtectedRoute>
              } />

              {/* Unified Configuration Page */}
              <Route path="/configuration" element={
                <ProtectedRoute>
                  <ConfigurationPage />
                </ProtectedRoute>
              } />

              {/* Clients Management */}
              <Route path="/clients" element={
                <ProtectedRoute>
                  <ClientsList />
                </ProtectedRoute>
              } />
              <Route path="/clients/new" element={
                <ProtectedRoute>
                  <CreateClient />
                </ProtectedRoute>
              } />
              <Route path="/clients/:clientId/edit" element={
                <ProtectedRoute>
                  <CreateClient />
                </ProtectedRoute>
              } />
              <Route path="/clients/:clientId" element={
                <ProtectedRoute>
                  <ClientDetail />
                </ProtectedRoute>
              } />

              {/* Lessons Learned Database */}
              <Route path="/lessons-learned" element={
                <ProtectedRoute>
                  <LessonsLearned />
                </ProtectedRoute>
              } />

              {/* ECR/ECO Module - Dashboard con Widgets Configurables */}
              <Route path="/ecr-dashboard" element={
                <ProtectedRoute>
                  <ECRDashboardPowerBI />
                </ProtectedRoute>
              } />

              {/* ECR Dashboard Simple (sin drag & drop) */}
              <Route path="/ecr-dashboard-simple" element={
                <ProtectedRoute>
                  <ECRDashboard />
                </ProtectedRoute>
              } />

              {/* New ECR Workflow */}
              <Route path="/ecr-workflow" element={
                <ProtectedRoute>
                  <ECRWorkflow />
                </ProtectedRoute>
              } />

              {/* Edit existing ECR */}
              <Route path="/ecr-workflow/:id" element={
                <ProtectedRoute>
                  <ECRWorkflow />
                </ProtectedRoute>
              } />

              {/* Risk Matrix Configuration (Admin) */}
              <Route path="/risk-matrix-config" element={
                <ProtectedRoute>
                  <RiskMatrixConfig />
                </ProtectedRoute>
              } />

              {/* Impact Analysis Configuration (Admin) */}
              <Route path="/impact-analysis-config" element={
                <ProtectedRoute>
                  <ImpactAnalysisConfig />
                </ProtectedRoute>
              } />

              {/* Workload Manager */}
              <Route path="/workload" element={
                <ProtectedRoute>
                  <WorkloadManager />
                </ProtectedRoute>
              } />

              {/* Defect Module - Admin Catalogs (V2 Simplified) */}
              <Route path="/defect-admin" element={
                <ProtectedRoute>
                  <DefectAdminV2 />
                </ProtectedRoute>
              } />

              {/* Defect Module - Admin Catalogs (Old - Legacy) */}
              <Route path="/defect-admin-legacy" element={
                <ProtectedRoute>
                  <DefectAdmin />
                </ProtectedRoute>
              } />

              {/* Defect Module - Capture Form */}
              <Route path="/defect-capture" element={
                <ProtectedRoute>
                  <DefectCapture />
                </ProtectedRoute>
              } />

              {/* Defect Module - Configuration */}
              <Route path="/defect-config" element={
                <ProtectedRoute>
                  <DefectConfig />
                </ProtectedRoute>
              } />

              {/* QAR Executive Dashboard */}
              <Route path="/defect-dashboard" element={
                <ProtectedRoute>
                  <QARDashboard />
                </ProtectedRoute>
              } />

              {/* Defect Module - Query / Consulta */}
              <Route path="/defect-query" element={
                <ProtectedRoute>
                  <DefectQuery />
                </ProtectedRoute>
              } />

              {/* QAR - Quality Alert Report */}
              <Route path="/qar-create" element={
                <ProtectedRoute>
                  <QARCreate />
                </ProtectedRoute>
              } />

              <Route path="/qar-list" element={
                <ProtectedRoute>
                  <QARList />
                </ProtectedRoute>
              } />

              <Route path="/qar-detail/:id" element={
                <ProtectedRoute>
                  <QARDetail />
                </ProtectedRoute>
              } />

              {/* MRB Module Routes */}
              <Route path="/mrb-dashboard" element={
                <ProtectedRoute>
                  <MRBDashboard />
                </ProtectedRoute>
              } />

              <Route path="/mrb-create" element={
                <ProtectedRoute>
                  <MRBCreate />
                </ProtectedRoute>
              } />

              <Route path="/mrb-campaigns" element={
                <ProtectedRoute>
                  <MRBCampaigns />
                </ProtectedRoute>
              } />

              <Route path="/mrb-campaign/:id" element={
                <ProtectedRoute>
                  <MRBCampaignDetail />
                </ProtectedRoute>
              } />

              <Route path="/mrb-capture" element={
                <ProtectedRoute>
                  <MRBDefectCapture />
                </ProtectedRoute>
              } />

              {/* Audit Module Routes */}
              <Route path="/audit-dashboard" element={
                <ProtectedRoute>
                  <AuditDashboard />
                </ProtectedRoute>
              } />

              <Route path="/audit-programs" element={
                <ProtectedRoute>
                  <AuditPrograms />
                </ProtectedRoute>
              } />

              <Route path="/audit-program/:id" element={
                <ProtectedRoute>
                  <AuditProgramDetail />
                </ProtectedRoute>
              } />

              <Route path="/audit-calendar" element={
                <ProtectedRoute>
                  <AuditCalendar />
                </ProtectedRoute>
              } />

              <Route path="/audit-schedule-create" element={
                <ProtectedRoute>
                  <AuditScheduleCreate />
                </ProtectedRoute>
              } />

              <Route path="/audit-checklists" element={
                <ProtectedRoute>
                  <AuditChecklists />
                </ProtectedRoute>
              } />

              <Route path="/audit-checklist/:id" element={
                <ProtectedRoute>
                  <AuditChecklistDetail />
                </ProtectedRoute>
              } />

              <Route path="/audit-execute/:scheduleId" element={
                <ProtectedRoute>
                  <AuditExecute />
                </ProtectedRoute>
              } />

              <Route path="/audit/:id" element={
                <ProtectedRoute>
                  <AuditDetail />
                </ProtectedRoute>
              } />

              <Route path="/audit-ncs" element={
                <ProtectedRoute>
                  <AuditNCList />
                </ProtectedRoute>
              } />

              <Route path="/audit-nc/:id" element={
                <ProtectedRoute>
                  <AuditNCDetail />
                </ProtectedRoute>
              } />

              <Route path="/audit-auditors" element={
                <ProtectedRoute>
                  <AuditAuditors />
                </ProtectedRoute>
              } />

              <Route path="/audit-requests" element={
                <ProtectedRoute>
                  <AuditRequests />
                </ProtectedRoute>
              } />

              {/* Work Instructions Module */}
              <Route path="/work-instructions" element={
                <ProtectedRoute>
                  <WorkInstructionsList />
                </ProtectedRoute>
              } />

              <Route path="/work-instructions/:id" element={
                <ProtectedRoute>
                  <WorkInstructionDetail />
                </ProtectedRoute>
              } />

              <Route path="/work-instructions-config" element={
                <ProtectedRoute>
                  <WIPlantConfig />
                </ProtectedRoute>
              } />

              <Route path="/work-instructions-dashboard" element={
                <ProtectedRoute>
                  <WIDashboard />
                </ProtectedRoute>
              } />

              {/* Management Review */}
              <Route path="/management-review" element={
                <ProtectedRoute>
                  <ManagementReview />
                </ProtectedRoute>
              } />

              <Route path="/management-review/:id" element={
                <ProtectedRoute>
                  <ManagementReview />
                </ProtectedRoute>
              } />

              {/* Statistical Tools */}
              <Route path="/statistical-tools" element={
                <ProtectedRoute>
                  <StatisticalTools />
                </ProtectedRoute>
              } />

              </Routes>
            </div>
            </Router>
          </AuthProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;