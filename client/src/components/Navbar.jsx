import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Award, LogOut, ShieldCheck, Heart } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If on login/register page, hide standard nav or keep minimal
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="navbar">
      {/* Brand Logo */}
      <NavLink to={role === 'donor' ? '/dashboard' : role === 'admin' ? '/admin' : '/hospital/sos'} className="nav-brand">
        <span className="brand-dot"></span>
        <span>Blood<span className="brand-red">Link</span></span>
      </NavLink>

      {/* Navigation Links based on role */}
      <nav className="nav-links">
        {role === 'donor' && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/camps" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Find Camps
            </NavLink>
            <NavLink to="/rewards" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Rewards Store
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              My Profile
            </NavLink>
          </>
        )}

        {(role === 'hospital' || role === 'ngo') && (
          <>
            <NavLink to="/hospital/sos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              SOS Management
            </NavLink>
            <NavLink to="/hospital/donors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Donor Search
            </NavLink>
          </>
        )}

        {role === 'admin' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Verification & Moderation Console
            </NavLink>
          </>
        )}
      </nav>

      {/* Right Side Actions */}
      <div className="nav-actions">
        {/* Quick Link to Admin Console */}
        <NavLink
          to="/admin"
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px 8px',
            borderRadius: '6px'
          }}
          title="Admin Verification Portal"
        >
          <ShieldCheck size={14} /> Admin
        </NavLink>

        {/* Bell Icon */}
        <div className="notification-bell" title="Alerts & Notifications">
          <Bell size={20} />
          <span className="dot"></span>
        </div>

        {/* PTS Coin Badge (Only for Donors) */}
        {role === 'donor' && (
          <div className="pts-badge">
            <Award size={15} />
            <span>{user?.coins !== undefined ? user.coins : 450} PTS</span>
          </div>
        )}

        {/* Role Tag */}
        {role !== 'donor' && (
          <span className="user-tag-pill" style={{ textTransform: 'capitalize' }}>
            {user?.name || role} ({role})
          </span>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            cursor: 'pointer'
          }}
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
