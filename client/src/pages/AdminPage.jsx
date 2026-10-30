import { api } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
export default function AdminPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionMsg, setActionMsg] = useState('');
  const fetchOrganizations = async () => {
    try { setOrganizations((await api('/admin/organizations')).filter(org => org.isActive)); }
    catch (err) { setActionMsg(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchOrganizations(); }, []);
  const handleVerify = async (id, name) => {
    try { await api('/admin/verify/' + id, { method: 'PUT' }); await fetchOrganizations(); setActionMsg('Verified ' + name); }
    catch (err) { setActionMsg(err.message); }
  };
  const handleDelete = async (id, name) => {
    if (!window.confirm('Disable ' + name + '? Donation and audit history will be retained.')) return;
    try { await api('/admin/org/' + id, { method: 'DELETE' }); await fetchOrganizations(); setActionMsg('Disabled ' + name); }
    catch (err) { setActionMsg(err.message); }
  };
  const pendingOrgs = organizations.filter(o => !o.isVerified);
  const scamOrgs = organizations.filter(o => o.isScamReported);
  const displayedList = activeTab === 'pending' ? pendingOrgs : activeTab === 'scams' ? scamOrgs : organizations;

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* Admin Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '2.5rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '6px' }}>
              <ShieldCheck size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                System Administration Console
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Hospital & NGO Verification Portal</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '4px' }}>
              Verify newly registered institutions before they go live, and moderate reported scam entities.
            </p>
          </div>

          <button
            onClick={fetchOrganizations}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Refresh List
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
            marginTop: '2rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '1.5rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
              {pendingOrgs.length} Institutions
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
              Scam Flagged Accounts
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
              {scamOrgs.length} Flagged
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
              Total Registered
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
              {organizations.length} Total
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMsg && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontWeight: 600,
            fontSize: '0.925rem'
          }}
        >
          {actionMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.5rem'
        }}
      >
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: activeTab === 'pending' ? '#e63946' : 'transparent',
            color: activeTab === 'pending' ? '#ffffff' : '#64748b',
            cursor: 'pointer'
          }}
        >
          Pending Verification ({pendingOrgs.length})
        </button>
        <button
          onClick={() => setActiveTab('scams')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: activeTab === 'scams' ? '#dc2626' : 'transparent',
            color: activeTab === 'scams' ? '#ffffff' : '#64748b',
            cursor: 'pointer'
          }}
        >
          Scam Reports ({scamOrgs.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: activeTab === 'all' ? '#1e293b' : 'transparent',
            color: activeTab === 'all' ? '#ffffff' : '#64748b',
            cursor: 'pointer'
          }}
        >
          All Organizations ({organizations.length})
        </button>
      </div>

      {/* List Card Content */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading organizations...
          </div>
        ) : displayedList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No records found</h3>
            <p>Everything in this queue has been processed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedList.map((org) => (
              <div
                key={org._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: org.isScamReported ? '#fff1f2' : !org.isVerified ? '#fffbeb' : '#ffffff'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{org.name}</h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: org.role === 'hospital' ? '#dbeafe' : '#f3e8ff',
                        color: org.role === 'hospital' ? '#1d4ed8' : '#7e22ce'
                      }}
                    >
                      {org.role}
                    </span>

                    {/* Status badge */}
                    {org.isScamReported ? (
                      <span className="badge-critical">Reported Scam</span>
                    ) : org.isVerified ? (
                      <span className="badge-verified">Verified</span>
                    ) : (
                      <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        Pending Approval
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                    <span><strong>Reg No:</strong> {org.registrationNumber}</span>
                    <span><strong>Email:</strong> {org.email}</span>
                    <span><strong>Address:</strong> {org.address}</span>
                  </div>

                  {org.licenseInfo && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      <strong>License Details:</strong> {org.licenseInfo}
                    </div>
                  )}

                  {org.isScamReported && (
                    <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} />
                      <strong>Scam Complaint Reason:</strong> {org.scamReportReason}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!org.isVerified && (
                    <button
                      onClick={() => handleVerify(org._id, org.name)}
                      className="btn-success"
                      style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckCircle2 size={16} /> Approve & Activate
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(org._id, org.name)}
                    className="btn-danger"
                    style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Delete Account"
                  >
                    <Trash2 size={15} /> Delete Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
