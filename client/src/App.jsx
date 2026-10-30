import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import NearbyCampsPage from './pages/NearbyCampsPage';
import RewardsStorePage from './pages/RewardsStorePage';
import DonorProfilePage from './pages/DonorProfilePage';
import PatientRecordsPage from './pages/PatientRecordsPage';
import HospitalSosPage from './pages/HospitalSosPage';
import HospitalDonorSearchPage from './pages/HospitalDonorSearchPage';
import HospitalUpdateDonorRecordsPage from './pages/HospitalUpdateDonorRecordsPage';

function MainRoutes() {
  const { user, role, loading } = useAuth();
  const guard = (element, allowed) => !user ? <Navigate to="/login" replace /> : allowed.includes(role) ? element : <Navigate to={role === 'admin' ? '/admin' : role === 'donor' ? '/dashboard' : '/hospital/donors'} replace />;
  if (loading) return <p className="page-container">Loading your session...</p>;

  return (
    <>
      <Navbar key={user?._id || 'anonymous'} />
      <Routes>
        {/* Auth & Admin routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/admin" element={guard(<AdminPage />, ['admin'])} />

        {/* Donor routes */}
        <Route path="/dashboard" element={guard(<DashboardPage />, ['donor'])} />
        <Route path="/camps" element={guard(<NearbyCampsPage />, ['donor', 'hospital', 'ngo'])} />
        <Route path="/rewards" element={guard(<RewardsStorePage />, ['donor'])} />
        <Route path="/profile" element={guard(<DonorProfilePage />, ['donor'])} />
        <Route path="/records" element={guard(<PatientRecordsPage />, ['donor'])} />

        {/* Hospital / NGO routes */}
        <Route path="/hospital/sos" element={guard(<HospitalSosPage />, ['hospital'])} />
        <Route path="/hospital/donors" element={guard(<HospitalDonorSearchPage />, ['hospital', 'ngo'])} />
        <Route path="/hospital/update-record" element={guard(<HospitalUpdateDonorRecordsPage />, ['hospital', 'ngo'])} />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
