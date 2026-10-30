import { api } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Gift, Award } from 'lucide-react';
export default function PatientRecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/records/donor/' + user.donorId).then(setRecords).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [user.donorId]);
  const donorId = user.donorId;
  const totalDonations = user.totalDonations ?? 0;
  const coinBalance = user.coins ?? 0;

  return (
    <div className="page-container" style={{ maxWidth: '1240px' }}>
      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error}</p>}
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800 }}>My Donation Records</h1>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              {donorId}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.925rem', marginTop: '6px' }}>
            Track your health impact history, download certifications, and manage your verified donation statistics.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            HEALTH STATUS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
            Active
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1 */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              TOTAL DONATIONS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              {totalDonations} Times
            </div>
          </div>
          <div style={{ color: '#dc2626' }}>
            <Heart size={20} fill="#dc2626" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              COIN BALANCE
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              {coinBalance} Coins
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Redeemable in Rewards Store</div>
          </div>
          <div style={{ color: '#d97706' }}>
            <Gift size={20} />
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              BLOOD TYPE
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              O+ Positive
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Primary universal compatibility</div>
          </div>
          <div style={{ color: '#dc2626' }}>
            <Heart size={20} />
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              LIFETIME VOLUME
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              3,500 mL
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estimated 24 lives saved</div>
          </div>
          <div style={{ color: '#dc2626' }}>
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Donation History Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
          Donation Log History
        </h2>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>HOSPITAL / CAMP</th>
                <th>TYPE</th>
                <th>QTY</th>
                <th>COINS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec._id}>
                  <td style={{ fontWeight: 600, color: '#334155' }}>
                    {rec.dateString || new Date(rec.date).toLocaleDateString()}
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    {rec.facilityName}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      {rec.bloodTypeCollected}
                    </span>
                  </td>
                  <td>{rec.quantityMl}ml</td>
                  <td style={{ fontWeight: 800, color: '#10b981' }}>
                    +{rec.coinsAwarded} PTS
                  </td>
                  <td>
                    <span className="badge-verified">
                      {rec.status || 'Verified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
