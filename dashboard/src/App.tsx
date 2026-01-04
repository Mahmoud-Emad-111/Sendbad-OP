import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './layouts/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LiveMap from './pages/LiveMap';
import Users from './pages/Users';
import Technicians from './pages/Technicians';
import ServiceRequests from './pages/ServiceRequests';
import ServiceRequestDetails from './pages/ServiceRequestDetails';
import Home from './pages/Home';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="technicians" element={<Technicians />} />
            <Route path="users" element={<Users />} />
            <Route path="requests" element={<ServiceRequests />} />
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
