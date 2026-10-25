import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Send, ArrowRightLeft, ShieldAlert } from 'lucide-react';

export default function HospitalSosPage() {
  const { user } = useAuth();

  // default hospital inventory matching pdf
  const [inventory, setInventory] = useState({
    'O+': 24,
    'O-': 3,
    'A+': 14,
    'A-': 6,
    'B+': 18,
    'B-': 4,
    'AB+': 9,
    'AB-': 1
  });

  // form states for creating sos
  const [targetBloodType, setTargetBloodType] = useState('O-');
  const [requiredQuantity, setRequiredQuantity] = useState(5);
  const [urgencyLevel, setUrgencyLevel] = useState('Critical (24h)');

  // alerts & transfer logs
  const [recentSos, setRecentSos] = useState([
    {
      id: 'sos-in-transit',
      type: 'O- Emergency',
      time: 'Jan 28, 14:00',
      units: 5,
      status: 'In Transit',
      hospitalName: 'XYZ Hospital'
    },
    {
      id: 'sos-resolved',
      type: 'AB- Call',
      time: 'Jan 14, 08:30',
      units: 2,
      status: 'Resolved',
      resolvedBy: 'Hospital X',
      hospitalName: 'XYZ Hospital'
    },
    {
      id: 'sos-active-other',
      type: 'O+ Emergency Demand',
      time: 'Today, 11:15',
      units: 4,
      status: 'Active',
      hospitalName: 'Saint Jude Trauma Center'
    }
  ]);

  // nearby hospitals with surplus blood
  const [stockMatches, setStockMatches] = useState([
    {
      id: 'm-1',
      name: 'City General Hospital',
      distance: '3.2 km away',
      surplus: '4 Units O- surplus',
      requested: false
    },
    {
      id: 'm-2',
      name: 'Mercy Trauma Center',
      distance: '7.5 km away',
      surplus: '2 Units O- surplus',
      requested: false
    }
  ]);

  // donation history logs
  const [donationLogs, setDonationLogs] = useState([
    {
      id: 'log-1',
      date: 'Oct 14, 2025',
      facility: 'XYZ Hospital',
      type: 'O+',
      qty: '450ml',
      resolvedBy: 'NA',
      status: 'Urgent'
    },
    {
      id: 'log-2',
      date: 'Jul 08, 2025',
      facility: 'Hospital City',
      type: 'Plasma',
      qty: '450ml',
      resolvedBy: 'X Hospital',
      status: 'Resolved'
    }
  ]);

  const [notification, setNotification] = useState('');

  // fetch inventory from server if available
  useEffect(() => {
    async function loadHospitalData() {
      if (user?._id && user?._id !== 'mock-hospital-id') {
        try {
          const res = await fetch(`http://localhost:5000/api/hospitals/${user._id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.inventory) setInventory(data.inventory);
          }
        } catch (e) {
          // use default state
        }
      }
    }
    loadHospitalData();
  }, [user]);

  // trigger new sos alert
  const handlePublishSos = async (e) => {
    e.preventDefault();

    const newAlert = {
      id: 'sos-' + Date.now(),
      type: `${targetBloodType} Emergency Call`,
      time: 'Just now',
      units: parseInt(requiredQuantity),
      status: 'Active',
      hospitalName: user?.name || 'XYZ Hospital'
    };

    try {
      await fetch('http://localhost:5000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: user?._id || 'mock-hospital-id',
          hospitalName: user?.name || 'XYZ Hospital',
          targetBloodType,
          requiredQuantity,
          urgencyLevel
        })
      });
    } catch (err) {
      // offline
    }

    setRecentSos([newAlert, ...recentSos]);
    setNotification(`Broadcast triggered for ${requiredQuantity} Bags of ${targetBloodType}! Donors and nearby hospitals alerted.`);
    setTimeout(() => setNotification(''), 5000);
  };

  // request transfer from nearby hospital
  const handleRequestTransfer = (matchId, hospName) => {
    setStockMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, requested: true } : m))
    );
    setNotification(`Transfer request dispatched to ${hospName}! Dispatch rider notified.`);
    setTimeout(() => setNotification(''), 5000);
  };

  // fulfill another hospital's sos
  const handleFulfillSos = (alertId, hospName) => {
    setRecentSos((prev) =>
      prev.map((item) =>
        item.id === alertId
          ? { ...item, status: 'Resolved', resolvedBy: user?.name || 'XYZ Hospital' }
          : item
      )
    );
    setNotification(`You fulfilled the emergency blood request for ${hospName}!`);
    setTimeout(() => setNotification(''), 5000);
  };

  // helper to get progress bar color based on stock count
  const getStockStatus = (count) => {
    if (count <= 3) return { text: 'CRITICAL', color: '#dc2626', bg: '#dc2626' };
    if (count <= 6) return { text: 'LOW', color: '#ea580c', bg: '#ea580c' };
    return { text: 'Adequate', color: '#16a34a', bg: '#10b981' };
  };

  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  return (
    <div className="page-container" style={{ maxWidth: '1260px' }}>
      {/* Hospital Portal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            {user?.name || 'XYZ Hospital'} Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Emergency blood management and real-time community supply coordination.
          </p>
        </div>

        <button
          onClick={() => {
            const formElem = document.getElementById('sos-form-section');
            if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
          }}
          className="btn-primary"
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem' }}
        >
          <ShieldAlert size={16} /> Broadcast Emergency SOS
        </button>
      </div>

      {notification && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600
          }}
        >
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Grid: Depot Stock on Left, Publish SOS Form on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Left: Current Depot Stock Levels */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Current Depot Stock Levels
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '2rem', rowGap: '1.25rem' }}>
            {bloodGroups.map((type) => {
              const count = inventory[type] || 0;
              const status = getStockStatus(count);
              const maxScale = 30;
              const pct = Math.min(Math.round((count / maxScale) * 100), 100);

              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{type}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: status.color }}>
                      {status.text} ({count} Bags)
                    </span>
                  </div>

                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: status.bg,
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Publish SOS Call Form */}
        <div className="card" id="sos-form-section">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Publish SOS Call
          </h2>

          <form onSubmit={handlePublishSos}>
            <div className="form-group">
              <label className="form-label">TARGET BLOOD TYPE</label>
              <select
                value={targetBloodType}
                onChange={(e) => setTargetBloodType(e.target.value)}
                className="form-select"
              >
                <option value="O-">O- Negative (Critical Shortage)</option>
                <option value="O+">O+ Positive</option>
                <option value="A-">A- Negative</option>
                <option value="A+">A+ Positive</option>
                <option value="B-">B- Negative</option>
                <option value="B+">B+ Positive</option>
                <option value="AB-">AB- Negative</option>
                <option value="AB+">AB+ Positive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">REQUIRED QUANTITY (BAGS)</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={requiredQuantity}
                onChange={(e) => setRequiredQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">URGENCY LEVEL</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUrgencyLevel('Critical (24h)')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: urgencyLevel === 'Critical (24h)' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                    backgroundColor: urgencyLevel === 'Critical (24h)' ? '#fff5f5' : '#ffffff',
                    color: urgencyLevel === 'Critical (24h)' ? '#dc2626' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Critical (24h)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyLevel('Standard')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: urgencyLevel === 'Standard' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    backgroundColor: urgencyLevel === 'Standard' ? '#f8fafc' : '#ffffff',
                    color: urgencyLevel === 'Standard' ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Standard
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', marginTop: '0.5rem' }}
            >
              Trigger Direct SOS & Alert
            </button>
          </form>
        </div>
      </div>

      {/* Middle Grid: Nearby Stock Matches & Recent SOS Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Nearby Stock Matches */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Nearby Hospital Stock Matches
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stockMatches.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: '#0f172a' }}>
                    {m.name}
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                    {m.distance} &bull;{' '}
                    <span style={{ fontWeight: 600, color: '#059669' }}>{m.surplus}</span>
                  </div>
                </div>

                {m.requested ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '5px 12px', borderRadius: '6px' }}>
                    Requested ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequestTransfer(m.id, m.name)}
                    className="btn-outline"
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                  >
                    Request Transfer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent SOS Logs */}
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Recent SOS Logs
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentSos.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a' }}>
                    {item.type}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    {item.time} &bull; {item.units} Units
                  </div>
                </div>

                <div>
                  {item.status === 'In Transit' && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '9999px' }}>
                      In Transit
                    </span>
                  )}
                  {item.status === 'Resolved' && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '9999px' }}>
                      Resolved ({item.resolvedBy})
                    </span>
                  )}
                  {item.status === 'Active' && (
                    <button
                      onClick={() => handleFulfillSos(item.id, item.hospitalName)}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: '6px' }}
                    >
                      Fulfill Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Donation Log History (full-width, coin earning summary removed as instructed) */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
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
                <th>RESOLVED BY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {donationLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: '#475569' }}>{log.date}</td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{log.facility}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>{log.type}</span>
                  </td>
                  <td>{log.qty}</td>
                  <td style={{ color: '#64748b' }}>{log.resolvedBy}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: log.status === 'Urgent' ? '#fee2e2' : '#dcfce7',
                        color: log.status === 'Urgent' ? '#dc2626' : '#15803d'
                      }}
                    >
                      {log.status}
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
