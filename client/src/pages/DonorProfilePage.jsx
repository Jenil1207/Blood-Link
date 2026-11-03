import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import LocationFields from '../components/LocationFields';
import { User, Heart, Award, ShieldCheck, CheckCircle, AlertCircle, Stethoscope, MapPin } from 'lucide-react';

export default function DonorProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const populate = data => {
    setProfile(data);
    setForm({
      name: data.name,
      address: data.address || '',
      phone: data.phone || '',
      healthProblems: data.healthProblems || '',
      latitude: data.location?.coordinates?.[1] ?? '',
      longitude: data.location?.coordinates?.[0] ?? '',
      knownAbnormalities: (data.knownAbnormalities || []).join(', '),
      shareMedicalHistory: data.shareMedicalHistory,
      availableForSOS: data.availableForSOS,
      ...Object.fromEntries(['conditions', 'medications', 'allergies', 'surgeries'].map(k => [k, (data.medicalHistory?.[k] || []).join(', ')])),
      notes: data.medicalHistory?.notes || ''
    });
  };

  useEffect(() => {
    api('/donors/' + user.donorId).then(populate).catch(err => setMessage({ text: err.message, type: 'error' }));
  }, [user.donorId]);

  const save = async e => {
    e.preventDefault();
    if (locating) return;
    setBusy(true); setMessage({ text: '', type: '' });
    try {
      const { conditions, medications, allergies, surgeries, notes, latitude, longitude, knownAbnormalities, ...fields } = form;
      if ((latitude === '') !== (longitude === '')) throw new Error('Enter both latitude and longitude');
      const split = value => value.split(',').map(s => s.trim()).filter(Boolean);
      const medicalHistory = { conditions: split(conditions), medications: split(medications), allergies: split(allergies), surgeries: split(surgeries), notes };
      const body = { ...fields, medicalHistory, knownAbnormalities: split(knownAbnormalities), ...(latitude !== '' ? { latitude: Number(latitude), longitude: Number(longitude) } : {}) };
      for (const field of ['medicalHistory', 'knownAbnormalities', 'healthProblems']) {
        if (JSON.stringify(body[field]) === JSON.stringify(profile[field])) delete body[field];
      }
      const result = await api('/donors/' + user._id, { method: 'PUT', body });
      setUser(result); populate(result); setMessage({ text: 'Profile saved successfully.', type: 'success' });
    } catch (err) { setMessage({ text: err.message, type: 'error' }); } finally { setBusy(false); }
  };

  const change = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const eligibilityColor = () => {
    const s = profile.eligibility?.statusText?.toLowerCase() || '';
    if (s.includes('eligible')) return { color: '#16a34a', bg: '#dcfce7' };
    if (s.includes('deferred') || s.includes('not')) return { color: '#dc2626', bg: '#fee2e2' };
    return { color: '#d97706', bg: '#fef3c7' };
  };

  const statCards = [
    { icon: <Heart size={20} color="#e63946" />, label: 'Total Donations', value: profile.totalDonations ?? 0, bg: '#fff1f2' },
    { icon: <Award size={20} color="#d97706" />, label: 'Blood Coins', value: profile.coins ?? 0, bg: '#fffbeb' },
    { icon: <ShieldCheck size={20} color="#2563eb" />, label: 'Endorsements', value: profile.badgesCount ?? 0, bg: '#eff6ff' },
    { icon: <Stethoscope size={20} color="#7c3aed" />, label: 'Screening', value: profile.screeningStatus || 'Pending', bg: '#f5f3ff' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Donor Profile</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage your personal information, medical history, and donation preferences.</p>
      </div>

      {/* Toast notification */}
      {message.text && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '0.85rem 1rem',
          borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.875rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Profile Summary Card */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #e63946, #9f1239)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(230,57,70,0.3)'
          }}>
            <User size={34} color="#ffffff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{profile.name}</h2>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#e63946' }}>
                {profile.bloodType}
              </span>
              <span style={{
                fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px',
                backgroundColor: eligibilityColor().bg, color: eligibilityColor().color
              }}>
                {profile.eligibility?.statusText || 'Checking eligibility...'}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginBottom: '8px' }}>
              <span>{profile.email}</span>
              <span>·</span>
              <span>ID: <strong style={{ color: '#334155' }}>{profile.donorId}</strong></span>
              {profile.dob && <><span>·</span><span>{new Date(profile.dob).toLocaleDateString()}</span></>}
            </div>
            {profile.verifyingInstitutions?.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} />
                Verified by: {profile.verifyingInstitutions.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
          {statCards.map((card, i) => (
            <div key={i} style={{ backgroundColor: card.bg, borderRadius: '10px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {card.icon}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.label}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Health metrics row */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap', padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Hemoglobin: </span>
            <strong style={{ color: '#0f172a' }}>{profile.hemoglobin ?? 'Not recorded'}</strong>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Blood Pressure: </span>
            <strong style={{ color: '#0f172a' }}>{profile.bloodPressure || 'Not recorded'}</strong>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {form && (
        <form className="card" onSubmit={save} style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
            Edit Profile
          </h2>

          {/* Basic Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e63946', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="name">FULL NAME</label>
                <input id="name" className="form-input" value={form.name} required onChange={e => change('name', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="phone">PHONE NUMBER</label>
                <input id="phone" className="form-input" value={form.phone} onChange={e => change('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <label className="form-label" htmlFor="address">RESIDENTIAL ADDRESS</label>
              <input id="address" className="form-input" value={form.address} onChange={e => change('address', e.target.value)} placeholder="e.g. Bandra West, Mumbai" />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 0 1.5rem' }} />

          {/* Health & Medical */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              Health &amp; Medical History
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="healthProblems">KNOWN HEALTH PROBLEMS</label>
              <input id="healthProblems" className="form-input" value={form.healthProblems} onChange={e => change('healthProblems', e.target.value)} placeholder="None or describe" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {['conditions', 'medications', 'allergies', 'surgeries'].map(field => (
                <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor={field}>{field.toUpperCase()} (comma separated)</label>
                  <input id={field} className="form-input" value={form[field]} onChange={e => change(field, e.target.value)} placeholder="None" />
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="knownAbnormalities">KNOWN ABNORMALITIES (comma separated)</label>
              <input id="knownAbnormalities" className="form-input" value={form.knownAbnormalities} onChange={e => change('knownAbnormalities', e.target.value)} placeholder="None" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="notes">ADDITIONAL NOTES</label>
              <textarea id="notes" className="form-input" value={form.notes} onChange={e => change('notes', e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Any other relevant health information" />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 0 1.5rem' }} />

          {/* Location */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> Location
            </h3>
            <LocationFields
              value={{ latitude: form.latitude, longitude: form.longitude }}
              onChange={location => setForm(prev => ({ ...prev, ...location }))}
              disabled={busy}
              onPendingChange={setLocating}
              hint="Use your current location or enter coordinates manually. Used for nearby camps and SOS alert matching."
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 0 1.5rem' }} />

          {/* Preferences */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              Preferences
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.shareMedicalHistory} onChange={e => change('shareMedicalHistory', e.target.checked)} style={{ marginTop: '2px', accentColor: '#e63946' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Share medical history</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Allow verified hospitals to review your medical history and donation records for screening.</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.availableForSOS} onChange={e => change('availableForSOS', e.target.checked)} style={{ marginTop: '2px', accentColor: '#e63946' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Available for SOS alerts</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Receive nearby emergency blood requests that match your blood type.</div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '1.5rem' }}>
            <strong>Note:</strong> Changes to medical disclosures trigger a fresh clinical screening review. Eligibility status shown here does not replace a clinician's assessment.
          </div>

          <button className="btn-primary" disabled={busy || locating} style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700 }}>
            {busy ? 'Saving...' : locating ? 'Finding location...' : 'Save Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
