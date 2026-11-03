import { api } from '../lib/api';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationFields from '../components/LocationFields';
import { Eye, EyeOff, Heart, Shield, Building2, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [accountType, setAccountType] = useState('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorBloodType, setDonorBloodType] = useState('O+');
  const [donorDob, setDonorDob] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [donorHealth, setDonorHealth] = useState('');
  const [medical, setMedical] = useState({ conditions: '', medications: '', allergies: '', surgeries: '', notes: '' });
  const [abnormalities, setAbnormalities] = useState('');
  const [shareMedicalHistory, setShareMedicalHistory] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locating, setLocating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgRole, setOrgRole] = useState('hospital');
  const [orgRegNo, setOrgRegNo] = useState('');
  const [orgLicense] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = role => role === 'admin' ? '/admin' : role === 'donor' ? '/dashboard' : role === 'ngo' ? '/hospital/donors' : '/hospital/sos';
  const handleLogin = async e => {
    e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); setLoading(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: { email, password, accountType } });
      loginUser(result.data, result.role, result.token); navigate(destination(result.role));
    } catch (err) { setErrorMsg(err.message); } finally { setLoading(false); }
  };
  const handleRegister = async e => {
    e.preventDefault();
    if (locating) return;
    setErrorMsg(''); setSuccessMsg(''); setLoading(true);
    try {
      const coordinates = latitude !== '' || longitude !== '' ? { latitude: Number(latitude), longitude: Number(longitude) } : {};
      if ((latitude === '') !== (longitude === '')) throw new Error('Enter both latitude and longitude');
      const list = value => value.split(',').map(v => v.trim()).filter(Boolean);
      if (accountType === 'donor') {
        const result = await api('/auth/register-donor', { method: 'POST', body: {
          name: donorName, email, password, bloodType: donorBloodType, dob: donorDob, address: donorAddress, healthProblems: donorHealth,
          medicalHistory: Object.fromEntries(Object.entries(medical).map(([key, value]) => [key, key === 'notes' ? value : list(value)])),
          knownAbnormalities: list(abnormalities), shareMedicalHistory, ...coordinates
        } });
        loginUser(result.user, 'donor', result.token); navigate('/dashboard');
      } else {
        const result = await api('/auth/register-hospital-ngo', { method: 'POST', body: {
          name: orgName, email, password, role: orgRole, registrationNumber: orgRegNo, licenseInfo: orgLicense, address: orgAddress, ...coordinates
        } });
        setSuccessMsg(result.message); setAuthMode('login');
      }
    } catch (err) { setErrorMsg(err.message); } finally { setLoading(false); }
  };
  const handleDemoLogin = type => {
    setAuthMode('login'); setAccountType(type === 'admin' ? 'admin' : type === 'donor' ? 'donor' : 'hospital-ngo');
    if (type === 'hospital' || type === 'ngo') setOrgRole(type);
    setEmail(type === 'admin' ? 'admin@bloodlink.local' : type + '@bloodlink.local');
    setPassword(''); setErrorMsg('Enter the demo account password provided by the project team.');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {/* Left Pane - Promotional Crimson Hero matching PDF */}
      <div
        style={{
          flex: '1.1',
          background: 'linear-gradient(135deg, #180306 0%, #2e080d 50%, #4a0d16 100%)',
          color: '#ffffff',
          padding: '4rem 4.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '2.5rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        {/* Glow overlay */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(230,57,70,0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              backgroundColor: '#e63946',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Heart size={18} color="#ffffff" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Blood<span style={{ color: '#e63946' }}>Link</span>
          </span>
        </div>

        {/* Hero Text */}
        <div style={{ zIndex: 2, maxWidth: '520px', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '1.5rem',
              letterSpacing: '-1px'
            }}
          >
            Your drop of blood is a <br />
            <span style={{ color: '#ff6b6b' }}>pool of life</span> for someone.
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              fontWeight: 400
            }}
          >
            Connect directly with localized SOS hospital demands, track your health metrics, and earn
            meaningful rewards while saving lives.
          </p>
        </div>

        {/* Quick Demo Login Access */}
        <div
          style={{
            zIndex: 2,
            backgroundColor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#ff8787',
              letterSpacing: '0.5px',
              marginBottom: '0.65rem'
            }}
          >
            Demo Shortcuts (Password Required)
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDemoLogin('donor')}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              John Doe (Donor)
            </button>
            <button
              onClick={() => handleDemoLogin('hospital')}
              style={{
                backgroundColor: '#e63946',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              XYZ Hospital
            </button>
            <button
              onClick={() => handleDemoLogin('ngo')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Red Cross (NGO)
            </button>
            <button
              onClick={() => handleDemoLogin('admin')}
              style={{
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Admin Portal
            </button>
          </div>
        </div>
      </div>

      {/* Right Pane - Login / Registration Card matching PDF */}
      <div
        style={{
          flex: '1',
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: authMode === 'login' ? '0 4rem' : '3rem 4rem',
          paddingTop: authMode === 'login' ? '10vh' : '3rem'
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '0.4rem',
              letterSpacing: '-0.5px'
            }}
          >
            {authMode === 'login' ? 'Welcome back' : 'Create an Account'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.925rem', marginBottom: '2rem' }}>
            {authMode === 'login'
              ? 'Please enter your credentials to access your console.'
              : 'Join the BloodLink emergency network to donate or coordinate.'}
          </p>

          {/* Account Type Toggle (Donor vs NGO/Hospital vs Admin) */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              padding: '4px',
              display: 'flex',
              marginBottom: '1.75rem',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={() => { setAccountType('donor'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: accountType === 'donor' ? '#ffffff' : 'transparent',
                color: accountType === 'donor' ? '#0f172a' : '#64748b',
                boxShadow: accountType === 'donor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <User size={15} /> Donor Account
            </button>
            <button
              type="button"
              onClick={() => { setAccountType('hospital-ngo'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: accountType === 'hospital-ngo' ? '#ffffff' : 'transparent',
                color: accountType === 'hospital-ngo' ? '#0f172a' : '#64748b',
                boxShadow: accountType === 'hospital-ngo' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Building2 size={15} /> NGO / Hospital
            </button>
            {authMode === 'login' && (
              <button
                type="button"
                onClick={() => { setAccountType('admin'); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  backgroundColor: accountType === 'admin' ? '#ffffff' : 'transparent',
                  color: accountType === 'admin' ? '#0f172a' : '#64748b',
                  boxShadow: accountType === 'admin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Shield size={15} /> Admin
              </button>
            )}
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem'
                }}
              >
                <span style={{ color: '#e63946', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot Password?
                </span>
                <span>
                  Don't have an account?{' '}
                  <span
                    onClick={() => {
                      setAuthMode('register');
                      if (accountType === 'admin') setAccountType('donor');
                      setErrorMsg('');
                    }}
                    style={{ color: '#e63946', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Register
                  </span>
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '8px' }}
              >
                {loading ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister}>
              {accountType === 'donor' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">FULL NAME</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. John Doe"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">BLOOD TYPE</label>
                      <select
                        className="form-select"
                        value={donorBloodType}
                        onChange={(e) => setDonorBloodType(e.target.value)}
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">DATE OF BIRTH</label>
                      <input
                        type="date"
                        className="form-input"
                        value={donorDob}
                        onChange={(e) => setDonorDob(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">RESIDENTIAL ADDRESS</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bandra West, Mumbai"
                      value={donorAddress}
                      onChange={(e) => setDonorAddress(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">KNOWN HEALTH PROBLEMS</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="None or specify"
                      value={donorHealth}
                      onChange={(e) => setDonorHealth(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                /* NGO / Hospital Registration */
                <>
                  <div className="form-group">
                    <label className="form-label">INSTITUTION NAME</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Saint Jude Trauma Center"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ORGANIZATION TYPE</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        <input
                          type="radio"
                          name="orgRole"
                          value="hospital"
                          checked={orgRole === 'hospital'}
                          onChange={() => setOrgRole('hospital')}
                        />
                        Hospital (Can endorse donors)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        <input
                          type="radio"
                          name="orgRole"
                          value="ngo"
                          checked={orgRole === 'ngo'}
                          onChange={() => setOrgRole('ngo')}
                        />
                        NGO (Camps & drives only)
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GOVT REGISTRATION NUMBER</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HOSP-MH-2024-99"
                      value={orgRegNo}
                      onChange={(e) => setOrgRegNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ADDRESS</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Street, District, City"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    <strong>Admin Verification:</strong> Organizations must be vetted by BloodLink admins
                    before access is granted.
                  </div>
                </>
              )}

              {accountType === 'donor' && <>
                {['conditions', 'medications', 'allergies', 'surgeries', 'notes'].map(field => (
                  <div className="form-group" key={field}>
                    <label className="form-label" htmlFor={'medical-' + field}>{field.toUpperCase()} {field !== 'notes' && '(comma separated)'}</label>
                    <textarea id={'medical-' + field} className="form-input" value={medical[field]} onChange={e => setMedical(prev => ({ ...prev, [field]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label" htmlFor="abnormalities">KNOWN ABNORMALITIES (comma separated)</label>
                  <textarea id="abnormalities" className="form-input" value={abnormalities} onChange={e => setAbnormalities(e.target.value)} />
                </div>
                <label style={{ display: 'block', marginBottom: '1rem' }}><input type="checkbox" checked={shareMedicalHistory} onChange={e => setShareMedicalHistory(e.target.checked)} /> Allow verified hospitals to review my medical history for donation screening.</label>
              </>}
              <LocationFields key={accountType} value={{ latitude, longitude }}
                onChange={location => { setLatitude(location.latitude); setLongitude(location.longitude); }}
                required={accountType !== 'donor'} disabled={loading} onPendingChange={setLocating}
                hint={accountType === 'donor'
                  ? 'Your location is saved when you create your account and used for nearby camps and SOS alerts. You can also enter it manually or add it later in My Profile.'
                  : 'Use your current location only if you are at the institution. Otherwise enter its coordinates manually. The institution location is saved on registration.'} />
              {/* Common Credentials */}
              <div className="form-group">
                <label className="form-label">EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="contact@institution.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">PASSWORD</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Already registered?{' '}
                <span
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                  style={{ color: '#e63946', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sign In
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || locating}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '8px' }}
              >
                {loading
                  ? 'Submitting...'
                  : accountType === 'donor'
                  ? 'Create Donor Account'
                  : 'Submit for Admin Verification'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
