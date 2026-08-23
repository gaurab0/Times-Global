
import React, { useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import DashboardPage from './components/DashboardPage';
import DeviceStorageForm from './components/forms/DeviceStorageForm';
import GatePassForm from './components/forms/GatePassForm';

import VMSDashboardLayout from './components/vms/VMSDashboardLayout';
import VMSHomePage from './components/vms/VMSHomePage';
import VMSAddRecordPage from './components/vms/VMSAddRecordPage';
import VMSVisitorListPage from './components/vms/VMSVisitorListPage';
import VMSReportsPage from './components/vms/VMSReportsPage';
import VMSUserRegistrationPage from './components/vms/VMSUserRegistrationPage'; 
import VMSAddDocumentPage from './components/vms/VMSAddDocumentPage';

import TaskManagementDashboardLayout from './components/task-management/TaskManagementDashboardLayout';
import TaskManagementHomePage from './components/task-management/TaskManagementHomePage';
import TaskManagementAddPage from './components/task-management/TaskManagementAddPage';
import TaskManagementListPage from './components/task-management/TaskManagementListPage';
import TaskManagementReportsPage from './components/task-management/TaskManagementReportsPage';

import { LocationContext } from './components/LocationContext';
import LocationSelectionPage from './components/auth/LocationSelectionPage';
import PendingApprovalPage from './components/auth/PendingApprovalPage';
import NoLocationsPage from './components/auth/NoLocationsPage';


const App: React.FC = () => {
  const { 
    isAuthenticated, 
    isApprovedByAdmin, 
    authorizedLocations, 
    selectedLocation, 
    isLoadingAuth,
    logout 
  } = useContext(LocationContext);

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Authentication...</div>;
  }

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (!isApprovedByAdmin) {
      return <Navigate to="/pending-approval" replace />;
    }
    if (!authorizedLocations || authorizedLocations.length === 0) {
      return <Navigate to="/no-locations-assigned" replace />;
    }
    if (!selectedLocation) {
       // If multiple locations and none selected, or only one and not auto-selected yet by context logic
      if (authorizedLocations.length > 1) {
        return <Navigate to="/select-location" replace />;
      }
      // If only one location, context should auto-select it. If still no selectedLocation, something is wrong.
      // For safety, redirect to selection or an error page. Here, selection page.
      return <Navigate to="/select-location" replace />;
    }
    return children;
  };
  
  const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isAuthenticated) {
       if (!isApprovedByAdmin) return <Navigate to="/pending-approval" replace />;
       if (!authorizedLocations || authorizedLocations.length === 0) return <Navigate to="/no-locations-assigned" replace />;
       if (!selectedLocation && authorizedLocations.length > 1) return <Navigate to="/select-location" replace/>;
       // If selectedLocation is set OR only one authorized location (which should be auto-selected by context)
       return <Navigate to="/dashboard" replace />;
    }
    return children;
  }


  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
        
        <Route 
          path="/pending-approval" 
          element={isAuthenticated && !isApprovedByAdmin ? <PendingApprovalPage onLogout={logout} /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/no-locations-assigned" 
          element={isAuthenticated && isApprovedByAdmin && (!authorizedLocations || authorizedLocations.length === 0) ? <NoLocationsPage onLogout={logout} /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/select-location" 
          element={isAuthenticated && isApprovedByAdmin && authorizedLocations && authorizedLocations.length > 1 && !selectedLocation ? <LocationSelectionPage /> : <Navigate to="/dashboard" replace /> }
        />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage onLogout={logout} /></ProtectedRoute>} />
        <Route path="/dashboard/device-storage" element={<ProtectedRoute><DeviceStorageForm onLogout={logout} /></ProtectedRoute>} />
        <Route path="/dashboard/gate-pass" element={<ProtectedRoute><GatePassForm onLogout={logout} /></ProtectedRoute>} />

        {/* VMS Routes */}
        <Route path="/vms" element={<ProtectedRoute><VMSDashboardLayout onLogout={logout} /></ProtectedRoute>}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<VMSHomePage />} />
          <Route path="add-record" element={<VMSAddRecordPage />} />
          <Route path="visitor-list" element={<VMSVisitorListPage />} />
          <Route path="reports" element={<VMSReportsPage />} />
          <Route path="add-image" element={<VMSUserRegistrationPage />} /> 
          <Route path="add-document" element={<VMSAddDocumentPage />} />
        </Route>

        {/* Task Management Routes */}
        <Route path="/task-management" element={<ProtectedRoute><TaskManagementDashboardLayout onLogout={logout} /></ProtectedRoute>}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<TaskManagementHomePage />} />
          <Route path="add-task" element={<TaskManagementAddPage />} />
          <Route path="task-list" element={<TaskManagementListPage />} />
          <Route path="reports" element={<TaskManagementReportsPage />} />
        </Route>

        <Route 
          path="/" 
          element={
            isLoadingAuth ? <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div> :
            !isAuthenticated ? <Navigate to="/login" replace /> :
            !isApprovedByAdmin ? <Navigate to="/pending-approval" replace /> :
            (!authorizedLocations || authorizedLocations.length === 0) ? <Navigate to="/no-locations-assigned" replace /> :
            !selectedLocation && authorizedLocations.length > 1 ? <Navigate to="/select-location" replace /> :
            <Navigate to="/dashboard" replace />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
