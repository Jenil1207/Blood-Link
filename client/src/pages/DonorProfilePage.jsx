import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Heart, Award } from 'lucide-react';

export default function DonorProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // default donor info if not logged in
  const donor = user || {
    name: 'John Doe',
    donorId: 'BL-2024-78542',
    bloodType: 'O+',
    dob: 'March 18, 1994',
    email: 'useremail@gmail.com',
    address: 'Bandra West, Mumbai',
    hemoglobin: 14.2,
    bloodPressure: '118 / 78',
    screeningStatus: 'Passed (Dec 2025)'
  };

  return (
    <div className="page-container" style={{ maxWidth: '1140px' }}>
      {/* 2 columns layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left card: User identity and basic details */}
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.75rem' }}>
          {/* Avatar circle */}
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              margin: '0 auto 1.25rem',
              overflow: 'hidden',
              backgroundColor: '#e2e8f0',
              border: '3px solid #fecaca'
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="Donor Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
            {donor.name || 'User'}
          </h2>

          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            {donor.donorId || 'BL-2024-78542'}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <span
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontWeight: 800,
                fontSize: '0.8rem',
                padding: '4px 14px',
                borderRadius: '9999px'
              }}
            >
              {donor.bloodType || 'O+'} POSITIVE
            </span>
          </div>

          {/* Button to donation history */}
          <button
            onClick={() => navigate('/records')}
            className="btn-primary"
            style={{ width: '100%', padding: '10px', marginBottom: '2rem', borderRadius: '8px' }}
          >
            View Donation History
          </button>

          {/* User profile fields */}
          <div style={{ textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DATE OF BIRTH
              </div>
              <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {donor.dob ? (typeof donor.dob === 'string' && donor.dob.includes('T') ? new Date(donor.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : donor.dob) : 'March 18, 1994'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CONTACT EMAIL
              </div>
              <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {donor.email || 'useremail@gmail.com'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                REGISTERED RESIDENCE
              </div>
              <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {donor.address || 'Address Area'}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Health credentials and verifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Health stats card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Verified Health Credentials
              </h3>
              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px'
                }}
              >
                Endorsed Health
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  HEMOGLOBIN LEVEL
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {donor.hemoglobin || 14.2} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>g/dL</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  BLOOD PRESSURE
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {donor.bloodPressure || '118 / 78'} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>mmHg</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  SCREENING STATUS
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                  Passed (Dec 2025)
                </div>
              </div>
            </div>
          </div>

          {/* Verifying hospitals card */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
              Verifying Institutions
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '50%' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    XYZ Hospital
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Clinical Validation Partner
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '50%' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    XYZ Blood Bank & Clinics
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Certified Testing Center
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ backgroundColor: '#fef3c7', padding: '6px', borderRadius: '8px', color: '#d97706' }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e', marginBottom: '3px' }}>
                Medical Privacy Protection
              </div>
              <div style={{ fontSize: '0.825rem', color: '#b45309', lineHeight: 1.5 }}>
                Detailed health statistics are visible strictly to verified hospital systems. NGOs and community camps only see verification endorsement checkmarks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
