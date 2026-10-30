import { api } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
export default function HospitalDonorSearchPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try { setDonors(await api('/hospitals/donors/search?donorId=' + encodeURIComponent(searchTerm), { signal: controller.signal })); }
      catch (err) { if (!controller.signal.aborted) { setDonors([]); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchTerm]);
  const handleAddRecord = donorBLId => navigate('/hospital/update-record?donorId=' + encodeURIComponent(donorBLId));

  return (
    <div className="page-container" style={{ maxWidth: '1240px' }}>
      {error && <p role="alert">{error}</p>}
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>
          Donor Search Portal
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
          Search and request direct SOS donors in your municipal radius. Verified health records are restricted to official partner hospital portals.
        </p>
      </div>

      {/* Search Input Box (Filters removed as per instructions) */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            color="#94a3b8"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search Donor ID (e.g. BL-2024-78542) or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '44px',
              fontSize: '0.95rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1'
            }}
          />
        </div>
      </div>

      {/* Search Results Count */}
      <div style={{ marginBottom: '1rem', fontWeight: 700, color: '#334155', fontSize: '1rem' }}>
        Search Results ({donors.length} Donors Found)
      </div>

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Searching donors...
          </div>
        ) : donors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No donors found matching "{searchTerm}".
          </div>
        ) : (
          donors.map((donor) => (
            <div
              key={donor._id || donor.donorId}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.4rem',
                border: '1px solid #e2e8f0',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                    {donor.donorId}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    {donor.bloodType} POSITIVE
                  </span>
                  <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    {donor.distanceKm != null ? `${donor.distanceKm} km away` : 'Distance unavailable'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <span>Donated: <strong>{donor.totalDonations ?? 0} times</strong></span>
                  {' '}&bull;{' '}
                  <span>Eligibility: <strong style={{ color: '#16a34a' }}>{donor.eligibilityStatus || 'Clinical screening required'}</strong></span>
                  {' '}&bull;{' '}
                  <span>Endorsements: <strong>{donor.badgesCount ?? 0} Hospital Stamps</strong></span>
                </div>
              </div>

              {/* Add Record button (switched from Add Donation) */}
              <button
                onClick={() => handleAddRecord(donor.donorId)}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626'
                }}
              >
                Add Record
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
