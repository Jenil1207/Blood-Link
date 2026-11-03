import { api } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, ShieldAlert } from 'lucide-react';
export default function HospitalSosPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState({});
  const [targetBloodType, setTargetBloodType] = useState('O-');
  const [requiredQuantity, setRequiredQuantity] = useState(5);
  const [urgencyLevel, setUrgencyLevel] = useState('Critical (24h)');
  const [recentSos, setRecentSos] = useState([]);
  const [stockMatches, setStockMatches] = useState([]);
  // Only last 5, active/in-transit on top, then resolved
  const sortedRecentSos = [...recentSos]
    .sort((a, b) => {
      const activeOrder = s => (s === 'Active' ? 0 : s === 'In Transit' ? 1 : 2);
      const diff = activeOrder(a.status) - activeOrder(b.status);
      if (diff !== 0) return diff;
      return new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time);
    })
    .slice(0, 5);
  const donationLogs = recentSos.filter(a => a.status === 'Resolved').map(a => ({ id: a.id, date: a.time, facility: a.hospitalName, type: a.type, qty: a.units + ' units', resolvedBy: a.resolvedBy, status: a.status }));
  const [notification, setNotification] = useState('');
  const [stockType, setStockType] = useState('O+');
  const [stockAmount, setStockAmount] = useState(1);
  const refresh = useCallback(async () => {
    const [profile, mine, nearby, matches] = await Promise.all([
      api('/hospitals/' + user._id), api('/sos/mine'), api('/sos/nearby'),
      api('/sos/stock-matches/' + user._id + '?bloodType=' + encodeURIComponent(targetBloodType))
    ]);
    setInventory(profile.inventory);
    setRecentSos([...new Map([...mine, ...nearby].map(a => [a._id, a])).values()].map(a => ({
      ...a, id: a._id, type: a.targetBloodType + ' Emergency', time: new Date(a.createdAt).toLocaleString(), units: a.requiredQuantity, own: a.hospitalId === user._id
    })));
    setStockMatches(matches.map(m => ({ ...m, id: m.hospitalId, distance: m.distanceKm + ' km away', surplus: (m.inventory[targetBloodType] || 0) + ' units ' + targetBloodType })));
  }, [user._id, targetBloodType]);
  useEffect(() => { refresh().catch(err => setNotification(err.message)); }, [refresh]);
  useEffect(() => {
    const handler = () => refresh().catch(err => setNotification(err.message));
    window.addEventListener('bloodlink-notification', handler);
    return () => window.removeEventListener('bloodlink-notification', handler);
  }, [refresh]);
  const handlePublishSos = async e => {
    e.preventDefault();
    try {
      const result = await api('/sos', { method: 'POST', body: { targetBloodType, requiredQuantity: Number(requiredQuantity), urgencyLevel } });
      await refresh(); setNotification('SOS published. ' + result.notifiedDonors + ' matching donors notified.');
    } catch (err) { setNotification(err.message); }
  };
  const handleRequestTransfer = async (hospitalId, name) => {
    try {
      await api('/sos', { method: 'POST', body: { targetBloodType, requiredQuantity: Number(requiredQuantity), urgencyLevel, targetHospitalId: hospitalId } });
      await refresh(); setNotification('Transfer request sent to ' + name + '. They will see it in their notifications.');
    } catch (err) { setNotification(err.message); }
  };
  const handleStockChange = async direction => {
    const current = inventory[stockType] || 0;
    const amount = Number(stockAmount);
    if (!Number.isInteger(amount) || amount < 1) return setNotification('Enter a whole number of bags');
    const next = current + direction * amount;
    if (next < 0) return setNotification('Only ' + current + ' bags of ' + stockType + ' in stock');
    try {
      const org = await api('/hospitals/' + user._id + '/inventory', { method: 'PUT', body: { inventory: { [stockType]: next } } });
      setInventory(org.inventory);
      setNotification(stockType + ' stock updated to ' + next + ' bags');
    } catch (err) { setNotification(err.message); }
  };
  const handleFulfillSos = async alertId => {
    const alert = recentSos.find(a => a.id === alertId);
    if (!alert) return;
    // A hospital cannot fulfill its own SOS request (it can only resolve it if it created it)
    if (!alert.own && String(alert.hospitalId) === String(user._id)) {
      return setNotification('You cannot fulfill your own SOS request.');
    }
    try {
      await api('/sos/' + alertId + (alert.own ? '/resolve' : '/fulfill'), { method: 'PUT' });
      await refresh();
      setNotification(alert.own ? 'SOS resolved' : 'Stock transferred and SOS resolved');
    } catch (err) { setNotification(err.message); }
  };
  const getStockStatus = count => count <= 3 ? { text: 'CRITICAL', color: '#dc2626', bg: '#dc2626' } : count <= 6 ? { text: 'LOW', color: '#ea580c', bg: '#ea580c' } : { text: 'Adequate', color: '#16a34a', bg: '#10b981' };
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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">BLOOD TYPE</label>
              <select value={stockType} onChange={e => setStockType(e.target.value)} className="form-select">
                {bloodGroups.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, width: '110px' }}>
              <label className="form-label">BAGS</label>
              <input type="number" min="1" className="form-input" value={stockAmount} onChange={e => setStockAmount(e.target.value)} />
            </div>
            <button type="button" className="btn-primary" style={{ padding: '10px 16px', borderRadius: '8px' }} onClick={() => handleStockChange(1)}>Add Stock</button>
            <button type="button" className="btn-outline" style={{ padding: '10px 16px', borderRadius: '8px' }} onClick={() => handleStockChange(-1)}>Remove Stock</button>
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

                {recentSos.some(a => a.own && a.status !== 'Resolved' && a.targetHospitalId === m.id && a.targetBloodType === targetBloodType) ? (
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Recent SOS Logs
            </h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Last 5</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedRecentSos.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No recent SOS activity</p>
            )}
            {sortedRecentSos.map((item) => {
              const isLive = item.status === 'Active' || item.status === 'In Transit';
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    border: isLive ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    backgroundColor: isLive ? '#fff5f5' : '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {item.type}
                        </h3>
                        {isLive && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.7rem', fontWeight: 800, color: '#dc2626',
                            backgroundColor: '#fee2e2', padding: '2px 7px', borderRadius: '9999px',
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                            Live
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.hospitalName}</span>
                        {' · '}{item.time}{' · '}{item.units} Units
                        {item.targetHospitalId ? (item.own ? ' · Transfer request' : ' · Transfer requested from you') : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
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
                      {isLive && (
                        <button
                          onClick={() => handleFulfillSos(item.id)}
                          className="btn-primary"
                          style={{ fontSize: '0.78rem', padding: '5px 12px', borderRadius: '6px' }}
                        >
                          {item.own ? 'Resolve Request' : 'Fulfill Request'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
