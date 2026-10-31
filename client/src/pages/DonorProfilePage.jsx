import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import LocationFields from '../components/LocationFields';
export default function DonorProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const populate = data => {
    setProfile(data);
    setForm({
      name: data.name, address: data.address || '', phone: data.phone || '', healthProblems: data.healthProblems || '',
      latitude: data.location?.coordinates?.[1] ?? '', longitude: data.location?.coordinates?.[0] ?? '',
      knownAbnormalities: (data.knownAbnormalities || []).join(', '),
      shareMedicalHistory: data.shareMedicalHistory, availableForSOS: data.availableForSOS,
      ...Object.fromEntries(['conditions', 'medications', 'allergies', 'surgeries'].map(k => [k, (data.medicalHistory?.[k] || []).join(', ')])),
      notes: data.medicalHistory?.notes || ''
    });
  };
  useEffect(() => { api('/donors/' + user.donorId).then(populate).catch(err => setMessage(err.message)); }, [user.donorId]);
  const save = async e => {
    e.preventDefault();
    if (locating) return;
    setBusy(true); setMessage('');
    try {
      const { conditions, medications, allergies, surgeries, notes, latitude, longitude, knownAbnormalities, ...fields } = form;
      if ((latitude === '') !== (longitude === '')) throw new Error('Enter both latitude and longitude');
      const split = value => value.split(',').map(s => s.trim()).filter(Boolean);
      const medicalHistory = { conditions: split(conditions), medications: split(medications), allergies: split(allergies), surgeries: split(surgeries), notes };
      const body = { ...fields, medicalHistory, knownAbnormalities: split(knownAbnormalities), ...(latitude !== '' ? { latitude: Number(latitude), longitude: Number(longitude) } : {}) };
      // Send disclosures only when changed, so unrelated edits do not reset screening.
      for (const field of ['medicalHistory', 'knownAbnormalities', 'healthProblems']) {
        if (JSON.stringify(body[field]) === JSON.stringify(profile[field])) delete body[field];
      }
      const result = await api('/donors/' + user._id, { method: 'PUT', body });
      setUser(result); populate(result); setMessage('Profile saved');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  };
  const change = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  return <div className="page-container" style={{ maxWidth: '1000px' }}>
    <h1>My Donor Profile</h1>
    {message && <p role="status">{message}</p>}
    <div className="card" style={{ margin: '1.5rem 0' }}>
      <h2>{profile.name} · {profile.donorId} · {profile.bloodType}</h2>
      <p>{profile.email} · {profile.dob ? new Date(profile.dob).toLocaleDateString() : ''}</p>
      <p>Donations: {profile.totalDonations ?? 0} · Blood Coins: {profile.coins ?? 0} · Endorsements: {profile.badgesCount ?? 0}</p>
      <p>Screening: {profile.screeningStatus || 'Pending'} · Hemoglobin: {profile.hemoglobin ?? 'Not recorded'} · Blood pressure: {profile.bloodPressure || 'Not recorded'}</p>
      <p>{profile.eligibility?.statusText}</p>
      <p>Verifying institutions: {profile.verifyingInstitutions?.join(', ') || 'None yet'}</p>
    </div>
    {form && <form className="card" onSubmit={save}>
      <h2>Contact and Medical History</h2>
      {['name', 'address', 'phone', 'healthProblems', 'conditions', 'medications', 'allergies', 'surgeries', 'knownAbnormalities', 'notes'].map(field => <div className="form-group" key={field}>
        <label className="form-label" htmlFor={field}>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}{['conditions', 'medications', 'allergies', 'surgeries', 'knownAbnormalities'].includes(field) ? ' (comma separated)' : ''}</label>
        <input id={field} className="form-input" value={form[field]} required={field === 'name'} onChange={e => change(field, e.target.value)} />
      </div>)}
      <LocationFields value={{ latitude: form.latitude, longitude: form.longitude }}
        onChange={location => setForm(prev => ({ ...prev, ...location }))}
        disabled={busy} onPendingChange={setLocating}
        hint="Use your current location or enter coordinates manually. Click Save profile to store it for nearby camps and matching SOS alerts." />
      <label style={{ display: 'block', margin: '1rem 0' }}><input type="checkbox" checked={form.shareMedicalHistory} onChange={e => change('shareMedicalHistory', e.target.checked)} /> Allow verified hospitals to review my medical history and donation records.</label>
      <label style={{ display: 'block', margin: '1rem 0' }}><input type="checkbox" checked={form.availableForSOS} onChange={e => change('availableForSOS', e.target.checked)} /> Receive nearby SOS requests.</label>
      <p>Changes to medical disclosures require fresh clinical screening. Scheduling eligibility does not replace a clinician's assessment.</p>
      <button className="btn-primary" disabled={busy || locating}>{busy ? 'Saving...' : locating ? 'Finding location...' : 'Save profile'}</button>
    </form>}
  </div>;
}
