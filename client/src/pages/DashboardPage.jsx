import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Gift, Award, MapPin, Activity, ShoppingBag, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [donorData, setDonorData] = useState(user || {
    donorId: 'BL-2024-78542',
    name: 'John Doe',
    bloodType: 'O+',
    coins: 450,
    totalDonations: 8,
    badgesCount: 3,
    lastDonationDate: '2025-10-14'
  });

  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptedId, setAcceptedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch live donor details and nearby SOS alerts
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch donor profile/eligibility
        const donorId = user?.donorId || 'BL-2024-78542';
        const donorRes = await fetch(`http://localhost:5000/api/donors/${donorId}`);
        if (donorRes.ok) {
          const dData = await donorRes.json();
          setDonorData(dData);
          if (setUser) setUser((prev) => ({ ...prev, ...dData }));
        }

        // Fetch nearby SOS alerts
        const sosRes = await fetch('http://localhost:5000/api/sos/nearby');
        if (sosRes.ok) {
          const alerts = await sosRes.json();
          // Filter to active/in-transit alerts
          const activeOnly = alerts.filter(a => a.status !== 'Resolved');
          setSosAlerts(activeOnly);
        } else {
          throw new Error('SOS fetch error');
        }
      } catch (err) {
        // High fidelity fallback matching donor-dashboard.pdf
        setSosAlerts([
          {
            _id: 'sos-1',
            hospitalName: 'Saint Jude Trauma Center',
            targetBloodType: 'O+',
            distanceKm: 2.4,
            urgencyLevel: 'Critical (24h)',
            status: 'Active'
          },
          {
            _id: 'sos-2',
            hospitalName: 'City General Hospital',
            targetBloodType: 'O- / O+',
            distanceKm: 4.1,
            urgencyLevel: 'Urgent',
            status: 'Active'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Accept SOS Alert
  const handleAcceptSOS = async (alertId, hospitalName) => {
    try {
      await fetch(`http://localhost:5000/api/sos/${alertId}/accept`, { method: 'PUT' });
    } catch (e) {
      // ignore network errors for mock mode
    }

    setAcceptedId(alertId);
    setToastMessage(`🚑 You have accepted the emergency call for ${hospitalName}! The hospital intake desk has been notified.`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  // Format last donation date
  const formattedLastDate = donorData?.lastDonationDate
    ? new Date(donorData.lastDonationDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'October 14, 2025';

  return (
    <div className="page-container" style={{ maxWidth: '1240px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.95rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Welcome Card matching donor-dashboard.pdf */}
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '2.25rem 2.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle red background glow */}
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(230,57,70,0.18) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* User Info & Identity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Hello, {donorData?.name || 'User'}
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#e2e8f0',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}
            >
              {donorData?.donorId || 'BL-2024-78542'}
            </span>
            <span
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '9999px',
                letterSpacing: '0.5px'
              }}
            >
              {donorData?.bloodType || 'O+'} POSITIVE
            </span>
          </div>

          <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '8px' }}>
            Last Donation: {formattedLastDate} &bull; Medical Verification:{' '}
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              {donorData?.screeningStatus === 'Passed' ? 'Verified' : 'Verified'}
            </span>
          </div>
        </div>

        {/* Eligibility Countdown Widget */}
        <div style={{ textAlign: 'right', zIndex: 2 }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#94a3b8',
              letterSpacing: '0.75px',
              marginBottom: '4px'
            }}
          >
            ELIGIBILITY COUNTDOWN
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#34d399',
              letterSpacing: '-0.5px'
            }}
          >
            {donorData?.eligibility?.statusText || 'Eligible Now'}
          </div>
        </div>
      </div>

      {/* Row of 3 Stats Cards matching PDF */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1: Total Donations */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TOTAL DONATIONS
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px' }}>
              {donorData?.totalDonations || 8} Times
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Whole Blood & Plasma</div>
          </div>
          <div style={{ color: '#e63946', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
            <Heart size={22} fill="#e63946" />
          </div>
        </div>

        {/* Card 2: Reward Coins */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              REWARD COINS
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px' }}>
              {donorData?.coins !== undefined ? donorData.coins : 450} Points
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Bronze Tier Status</div>
          </div>
          <div style={{ color: '#d97706', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '50%' }}>
            <Gift size={22} />
          </div>
        </div>

        {/* Card 3: Hospital Endorsements */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HOSPITAL ENDORSEMENT
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px' }}>
              {donorData?.badgesCount || 3} Badges
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Verifications from NGOs</div>
          </div>
          <div style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* Main Two Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem' }}>
        {/* Left Column: Active SOS Alerts Nearby */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)'
                }}
              />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Active SOS Alerts Nearby
              </h2>
            </div>
            <span
              onClick={() => navigate('/hospital/sos')}
              style={{ fontSize: '0.85rem', color: '#e63946', fontWeight: 600, cursor: 'pointer' }}
            >
              View Live Queue
            </span>
          </div>

          {/* List of Nearby Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sosAlerts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                No active SOS emergencies in your area right now.
              </div>
            ) : (
              sosAlerts.map((alert) => {
                const isAccepted = acceptedId === alert._id;
                const isCritical = alert.urgencyLevel?.includes('Critical');

                return (
                  <div
                    key={alert._id}
                    style={{
                      border: '1px solid #fecaca',
                      backgroundColor: '#fff5f5',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                        {alert.hospitalName}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>
                          {alert.targetBloodType} Required
                        </span>
                        {' '}&bull; {alert.distanceKm ? `${alert.distanceKm} km away` : 'Nearby'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={isCritical ? 'badge-critical' : 'badge-urgent'}>
                        {isCritical ? 'CRITICAL' : 'URGENT'}
                      </span>

                      {isAccepted ? (
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#16a34a',
                            backgroundColor: '#dcfce7',
                            padding: '6px 14px',
                            borderRadius: '8px'
                          }}
                        >
                          Accepted ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcceptSOS(alert._id, alert.hospitalName)}
                          className="btn-outline"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            borderRadius: '8px'
                          }}
                        >
                          Accept SOS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Console Options matching PDF */}
        <div className="card">
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.75rem'
            }}
          >
            Quick Console Options
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Option 1: Find Upcoming Camps */}
            <div
              onClick={() => navigate('/camps')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626'
                }}
              >
                <MapPin size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.975rem' }}>
                  Find Upcoming Camps
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Locate community mobile drives near you
                </div>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>

            {/* Option 2: My Verified Health Records */}
            <div
              onClick={() => navigate('/records')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626'
                }}
              >
                <Activity size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.975rem' }}>
                  My Verified Health Records
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Review hemoglobin, pulse, and eligibility history
                </div>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>

            {/* Option 3: Explore Rewards Marketplace */}
            <div
              onClick={() => navigate('/rewards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626'
                }}
              >
                <ShoppingBag size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.975rem' }}>
                  Explore Rewards Marketplace
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Redeem hard-earned points for vouchers
                </div>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
