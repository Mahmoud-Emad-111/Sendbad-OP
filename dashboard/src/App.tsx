import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './layouts/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LiveMap from './pages/LiveMap';
import Users from './pages/Users';
import Technicians from './pages/Technicians';
import TechnicianHistory from './pages/TechnicianHistory';
import ServiceRequests from './pages/ServiceRequests';
import ServiceRequestDetails from './pages/ServiceRequestDetails';
import UserDetails from './pages/UserDetails';
import Inventory from './pages/Inventory';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import NewInstallationRequest from './pages/NewInstallationRequest';
import InstallationRequests from './pages/InstallationRequests';
import InstallationRequestDetails from './pages/InstallationRequestDetails';
import NewServiceRequest from './pages/NewServiceRequest';
import NewAdminInstallationRequest from './pages/NewAdminInstallationRequest';
import NewCustomer from './pages/NewCustomer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="technicians" element={<Technicians />} />
            <Route path="technicians/:id/history" element={<TechnicianHistory />} />
            <Route path="users" element={<Users />} />
            <Route path="users/new" element={<NewCustomer />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="requests" element={<ServiceRequests />} />
            <Route path="requests/new-service" element={<NewServiceRequest />} />
            <Route path="requests/new-installation" element={<NewAdminInstallationRequest />} />
            <Route path="requests/new" element={<NewInstallationRequest />} />
            <Route path="requests/installation" element={<InstallationRequests />} />
            <Route path="requests/installation/:id" element={<InstallationRequestDetails />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="requests/:id" element={<ServiceRequestDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
