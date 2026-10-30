import { api } from '../lib/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';
export default function HospitalUpdateDonorRecordsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isHospital = role === 'hospital';
  const paramDonorId = searchParams.get('donorId') || '';
  const [lookupId, setLookupId] = useState(paramDonorId);
  const [donorInfo, setDonorInfo] = useState(null);
  const [entryType, setEntryType] = useState(isHospital ? 'donation' : 'attendance');
  const [donationDate, setDonationDate] = useState(() => new Date().toLocaleDateString());
  const [bloodTypeCollected, setBloodTypeCollected] = useState('O+');
  const [quantityMl, setQuantityMl] = useState(450);
  const [donationType, setDonationType] = useState('Whole Blood');
  const [collectionCenter, setCollectionCenter] = useState(user.name);
  const [attendingStaff, setAttendingStaff] = useState('');
  const [screeningStatus, setScreeningStatus] = useState('Passed Screening');
  const [hemoglobin, setHemoglobin] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [campId, setCampId] = useState('');
  const [isDonationToggled, setIsDonationToggled] = useState(isHospital);
  const [isAttendanceToggled, setIsAttendanceToggled] = useState(!isHospital);
  const [isEndorsementToggled, setIsEndorsementToggled] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const pendingRequest = useRef(null);
  const handleLookup = useCallback(async id => {
    try {
      const data = await api('/donors/' + encodeURIComponent(id));
      setErrorMsg('');
      setDonorInfo({ ...data, lastDonation: data.lastDonationDate ? new Date(data.lastDonationDate).toLocaleDateString() : 'No donations yet',
        isEligible: data.eligibility.scheduleEligible, eligibilityText: data.eligibility.statusText });
      setBloodTypeCollected(data.bloodType);
    } catch (err) { setDonorInfo(null); setErrorMsg(err.message); }
  }, []);
  useEffect(() => { if (paramDonorId) handleLookup(paramDonorId); }, [paramDonorId, handleLookup]);
  const handleSubmitRecord = async e => {
    e.preventDefault();
    if (!donorInfo || !declarationChecked) { setErrorMsg('Look up a donor and confirm the declaration first'); return; }
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const donating = isHospital && isDonationToggled && entryType === 'donation';
      const attendance = isAttendanceToggled || entryType === 'attendance';
      const payload = {
        donorBLId: donorInfo.donorId, bloodTypeCollected, donationType: donating ? donationType : 'Event Attendance Only',
        ...(donating ? { quantityMl: Number(quantityMl) } : {}),
        collectionCenter, attendingStaff, screeningStatus: screeningStatus === 'Passed Screening' ? 'Passed' : 'Deferred',
        ...(isHospital && hemoglobin !== '' ? { hemoglobin: Number(hemoglobin) } : {}),
        ...(isHospital && bloodPressure ? { bloodPressure } : {}),
        isDonation: donating, isCampAttendance: attendance, isEndorsement: isHospital && isEndorsementToggled,
        ...(attendance ? { campId } : {})
      };
      const serialized = JSON.stringify(payload);
      if (pendingRequest.current?.serialized !== serialized) pendingRequest.current = { serialized, key: crypto.randomUUID() };
      await api('/records', { method: 'POST', headers: { 'Idempotency-Key': pendingRequest.current.key }, body: payload });
      setSuccessMsg('Record saved for ' + donorInfo.name); navigate('/hospital/donors');
    } catch (err) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
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
          Update Donor Records
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.925rem' }}>
          Log new physical donations, verify clinical hemoglobin levels, and issue localized SOS achievement reward points instantly.
        </p>
      </div>

      {successMsg && (
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
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontWeight: 600
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Donor Verification Lookup Box */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
          Donor Verification Lookup
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="form-input"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Search Donor BL-ID (e.g. BL-2024-78542)"
            style={{ maxWidth: '400px' }}
          />
          <button
            onClick={() => handleLookup(lookupId)}
            className="btn-primary"
            style={{ padding: '8px 24px', borderRadius: '8px' }}
          >
            Look Up
          </button>
        </div>

        {/* Live Donor Status Card */}
        {donorInfo && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                  {donorInfo.donorId}
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
                  {donorInfo.bloodType} POSITIVE
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Name: <strong>{donorInfo.name}</strong> &bull; Past Donations: <strong>{donorInfo.totalDonations} Times</strong> &bull; Last: <strong>{donorInfo.lastDonation}</strong>
              </div>
            </div>

            <div>
              <span
                style={{
                  backgroundColor: donorInfo.isEligible ? '#dcfce7' : '#fee2e2',
                  color: donorInfo.isEligible ? '#15803d' : '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '6px 14px',
                  borderRadius: '6px'
                }}
              >
                {donorInfo.eligibilityText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Entry Form */}
      <form onSubmit={handleSubmitRecord}>
        <div className="form-group"><label className="form-label" htmlFor="camp-id">CAMP ID (required for attendance)</label><input id="camp-id" className="form-input" value={campId} onChange={e => setCampId(e.target.value)} /></div>
        {isHospital && donorInfo?.medicalHistory && <div className="card"><h3>Donor medical disclosures</h3><p>{donorInfo.healthProblems}</p>{Object.entries(donorInfo.medicalHistory).map(([field, value]) => <p key={field}><strong>{field}: </strong>{Array.isArray(value) ? value.join(', ') || 'None disclosed' : value || 'None disclosed'}</p>)}<p><strong>Known abnormalities: </strong>{donorInfo.knownAbnormalities?.join(', ') || 'None disclosed'}</p></div>}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.75rem' }}>
          {/* Form Type Toggle (Donation vs Camp Attendance) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              {entryType === 'donation' ? 'New Donation Entry Form' : 'Camp Attendance Form'}
            </h2>

            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
              <button
                type="button"
                disabled={!isHospital}
                onClick={() => {
                  setEntryType('donation');
                  setIsDonationToggled(true);
                }}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  backgroundColor: entryType === 'donation' ? '#ffffff' : 'transparent',
                  color: entryType === 'donation' ? '#0f172a' : '#64748b',
                  boxShadow: entryType === 'donation' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Donation Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryType('attendance');
                  setIsDonationToggled(false);
                  setIsAttendanceToggled(true);
                }}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  backgroundColor: entryType === 'attendance' ? '#ffffff' : 'transparent',
                  color: entryType === 'attendance' ? '#0f172a' : '#64748b',
                  boxShadow: entryType === 'attendance' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Attendance Only
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Donation</label>
              <input
                type="text"
                className="form-input"
                value={donationDate}
                onChange={(e) => setDonationDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Type Collected</label>
              <select
                className="form-select"
                value={bloodTypeCollected}
                onChange={(e) => setBloodTypeCollected(e.target.value)}
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {entryType === 'donation' && (
              <>
                <div className="form-group">
                  <label className="form-label">Quantity (mL)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={quantityMl}
                    onChange={(e) => setQuantityMl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Donation Type</label>
                  <select
                    className="form-select"
                    value={donationType}
                    onChange={(e) => setDonationType(e.target.value)}
                  >
                    <option value="Whole Blood">Whole Blood</option>
                    <option value="Plasma">Plasma</option>
                    <option value="Platelets">Platelets</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Collection Center / Camp Name</label>
              <input
                type="text"
                className="form-input"
                value={collectionCenter}
                onChange={(e) => setCollectionCenter(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attending Staff Name</label>
              <input
                type="text"
                className="form-input"
                value={attendingStaff}
                onChange={(e) => setAttendingStaff(e.target.value)}
              />
            </div>
          </div>

          {/* Health Screening Section */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem' }}>
              Donor Health Screening Status
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setScreeningStatus('Passed Screening')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: screeningStatus === 'Passed Screening' ? '2px solid #10b981' : '1px solid #e2e8f0',
                  backgroundColor: screeningStatus === 'Passed Screening' ? '#f0fdf4' : '#ffffff',
                  color: screeningStatus === 'Passed Screening' ? '#15803d' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Passed Screening
              </button>

              <button
                type="button"
                onClick={() => setScreeningStatus('Failed / Deferred')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: screeningStatus === 'Failed / Deferred' ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  backgroundColor: screeningStatus === 'Failed / Deferred' ? '#fef2f2' : '#ffffff',
                  color: screeningStatus === 'Failed / Deferred' ? '#b91c1c' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Failed / Deferred
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Hemoglobin Level (g/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={hemoglobin}
                  onChange={(e) => setHemoglobin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  className="form-input"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coins & Endorsement Settings Box */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
            Coins & Endorsement Settings
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Row 1: Blood Donation & Camp Attendance Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Blood Donation</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>+100 PTS</div>
                </div>

                <input
                  type="checkbox"
                  checked={isDonationToggled}
                  onChange={(e) => setIsDonationToggled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#e63946', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Event Attendance</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>+50 PTS</div>
                </div>

                <input
                  type="checkbox"
                  checked={isAttendanceToggled}
                  onChange={(e) => setIsAttendanceToggled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#e63946', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Row 2: Hospital Endorsement Stamp (ONLY HOSPITALS CAN ENDORSE, NGOs CAN NOT) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: isHospital ? '#fff5f5' : '#f1f5f9',
                borderRadius: '10px',
                border: isHospital ? '1px solid #fecaca' : '1px solid #cbd5e1'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    Hospital Endorsement Stamp
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                    +75 PTS
                  </span>
                  {!isHospital && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                      Hospitals Only (NGOs cannot endorse)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Appends verified clinical validation stamp to the donor's global public registry.
                </div>
              </div>

              <input
                type="checkbox"
                disabled={!isHospital}
                checked={isHospital && isEndorsementToggled}
                onChange={(e) => setIsEndorsementToggled(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#dc2626',
                  cursor: isHospital ? 'pointer' : 'not-allowed'
                }}
              />
            </div>
          </div>

          {/* Verification Declaration Checkbox */}
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input
              type="checkbox"
              id="declaration"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#e63946', marginTop: '2px', cursor: 'pointer' }}
            />
            <label htmlFor="declaration" style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, cursor: 'pointer' }}>
              I hereby verify that the clinical details logged above are accurate, hemoglobin checks completed, and donation criteria satisfied.
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '10px' }}
        >
          {loading ? 'Submitting...' : 'Submit & Verify Record'}
        </button>
      </form>
    </div>
  );
}
