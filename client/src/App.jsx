import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import NearbyCampsPage from './pages/NearbyCampsPage';

// Placeholder view for next phases
function ComingSoonPage({ title, phaseNumber }) {
  return (
    <div className="page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>
          {title}
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This page is scheduled for the next development phase ({phaseNumber}) of the mini-project.
        </p>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.85rem'
          }}
        >
          Phase Ready to Build Next
        </div>
      </div>
    </div>
  );
}

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
        <Route path="/rewards" element={<ComingSoonPage title="Rewards Store Marketplace" phaseNumber="Next Phase" />} />
        <Route path="/profile" element={<ComingSoonPage title="Donor Health Profile" phaseNumber="Next Phase" />} />
        <Route path="/records" element={<ComingSoonPage title="Patient Donation History Records" phaseNumber="Next Phase" />} />

        {/* Hospital / NGO routes */}
        <Route path="/hospital/sos" element={<ComingSoonPage title="Hospital SOS Management & Depot Stock" phaseNumber="Next Phase" />} />
        <Route path="/hospital/donors" element={<ComingSoonPage title="Hospital Donor Search" phaseNumber="Next Phase" />} />
        <Route path="/hospital/update-record" element={<ComingSoonPage title="Hospital Update Donor Records" phaseNumber="Next Phase" />} />

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
