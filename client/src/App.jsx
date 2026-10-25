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
  const { role } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Auth & Admin routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />

        {/* Donor routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/camps" element={<NearbyCampsPage />} />
        <Route path="/rewards" element={<RewardsStorePage />} />
        <Route path="/profile" element={<DonorProfilePage />} />
        <Route path="/records" element={<PatientRecordsPage />} />

        {/* Hospital / NGO routes */}
        <Route path="/hospital/sos" element={<HospitalSosPage />} />
        <Route path="/hospital/donors" element={<HospitalDonorSearchPage />} />
        <Route path="/hospital/update-record" element={<HospitalUpdateDonorRecordsPage />} />

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
