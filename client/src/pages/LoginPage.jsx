import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Heart, Shield, Building2, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState('login');
  // Account Type: 'donor' or 'hospital-ngo'
  const [accountType, setAccountType] = useState('donor');

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form States (Donor)
  const [donorName, setDonorName] = useState('');
  const [donorBloodType, setDonorBloodType] = useState('O+');
  const [donorDob, setDonorDob] = useState('1998-05-15');
  const [donorAddress, setDonorAddress] = useState('Mumbai, Maharashtra');
  const [donorHealth, setDonorHealth] = useState('None');

  // Register Form States (Hospital / NGO)
  const [orgName, setOrgName] = useState('');
  const [orgRole, setOrgRole] = useState('hospital');
  const [orgRegNo, setOrgRegNo] = useState('');
  const [orgLicense, setOrgLicense] = useState('');
  const [orgAddress, setOrgAddress] = useState('');

  // Status & Error Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Login Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountType })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Save user in context
      loginUser(data.data, data.role);

      if (data.role === 'donor') {
        navigate('/dashboard');
      } else {
        navigate('/hospital/sos');
      }
    } catch (err) {
      // In case server is offline or mock login during dev
      if (err.message.includes('Failed to fetch')) {
        handleDemoLogin(accountType === 'donor' ? 'donor' : orgRole);
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (accountType === 'donor') {
        const res = await fetch('http://localhost:5000/api/auth/register-donor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: donorName,
            email,
            password,
            bloodType: donorBloodType,
            dob: donorDob,
            address: donorAddress,
            healthProblems: donorHealth
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          loginUser(data.user, 'donor');
          navigate('/dashboard');
        }, 1200);
      } else {
        const res = await fetch('http://localhost:5000/api/auth/register-hospital-ngo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: orgName,
            email,
            password,
            role: orgRole,
            registrationNumber: orgRegNo,
            licenseInfo: orgLicense,
            address: orgAddress
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setSuccessMsg(data.message || 'Submitted successfully! Waiting for Admin verification.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login helper for examiner / quick testing
  const handleDemoLogin = (type) => {
    if (type === 'donor') {
      loginUser(
        {
          _id: 'mock-donor-id',
          donorId: 'BL-2024-78542',
          name: 'John Doe',
          email: 'useremail@gmail.com',
          bloodType: 'O+',
          coins: 450,
          totalDonations: 8,
          badgesCount: 3,
          lastDonationDate: '2025-10-14',
          screeningStatus: 'Passed',
          hemoglobin: 14.2,
          bloodPressure: '118/78'
        },
        'donor'
      );
      navigate('/dashboard');
    } else if (type === 'hospital') {
      loginUser(
        {
          _id: 'mock-hospital-id',
          name: 'XYZ Hospital',
          email: 'xyzhospital@gmail.com',
          role: 'hospital',
          isVerified: true,
          inventory: {
            'O+': 24, 'O-': 3, 'A+': 14, 'A-': 6, 'B+': 18, 'B-': 4, 'AB+': 9, 'AB-': 1
          }
        },
        'hospital'
      );
      navigate('/hospital/sos');
    } else if (type === 'ngo') {
      loginUser(
        {
          _id: 'mock-ngo-id',
          name: 'Red Cross Chapter 4',
          email: 'redcross.mumbai@gmail.com',
          role: 'ngo',
          isVerified: true
        },
        'ngo'
      );
      navigate('/hospital/sos');
    } else if (type === 'admin') {
      loginUser({ name: 'System Admin', email: 'admin@bloodlink.org' }, 'admin');
      navigate('/admin');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#ffffff' }}>
      {/* Left Pane - Promotional Crimson Hero matching PDF */}
      <div
        style={{
          flex: '1.1',
          background: 'linear-gradient(135deg, #180306 0%, #2e080d 50%, #4a0d16 100%)',
          color: '#ffffff',
          padding: '4rem 4.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
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
            Quick 1-Click Demo Login
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 4rem'
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

          {/* Account Type Toggle (Donor vs NGO/Hospital) */}
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
              onClick={() => setAccountType('donor')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.875rem',
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
              onClick={() => setAccountType('hospital-ngo')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.875rem',
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
                disabled={loading}
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
