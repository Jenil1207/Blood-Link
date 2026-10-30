import React, { useEffect, useState } from 'react';
import { api, subscribeNotifications } from '../lib/api';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Award, LogOut, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  useEffect(() => {
    if (!user?._id) return;
    const controller = new AbortController();
    const connectedAt = Date.now();
    let closed = false, retry, lastId;
    api('/notifications?unread=true', { signal: controller.signal }).then(setNotifications).catch(() => {});
    const listen = async () => {
      try {
        await subscribeNotifications(notification => {
          lastId = notification._id;
          if (!notification.readAt) setNotifications(prev => [notification, ...prev.filter(n => n._id !== notification._id)].slice(0, 50));
          if (+new Date(notification.createdAt) >= connectedAt) window.dispatchEvent(new CustomEvent('bloodlink-notification', { detail: notification }));
        }, controller.signal, lastId);
      } catch (err) { if (!closed && err.status === 401) return; }
      if (!closed) retry = setTimeout(listen, 3000);
    };
    listen();
    return () => { closed = true; clearTimeout(retry); controller.abort(); };
  }, [user?._id]);

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
            {role === 'hospital' && <NavLink to="/hospital/sos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              SOS Management
            </NavLink>}
            <NavLink to="/camps" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Camps</NavLink>
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
        {role === 'admin' && <NavLink
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
        </NavLink>}

        {/* Bell Icon */}
        <div style={{ position: 'relative' }}>
          <button className="notification-bell" title="Alerts & Notifications" aria-label="Notifications" onClick={() => setShowNotifications(prev => !prev)}><Bell size={20} />{notifications.length > 0 && <span className="dot" />}</button>
          {showNotifications && <div className="card" style={{ position: 'absolute', right: 0, top: '2rem', width: 'min(340px, 85vw)', maxHeight: '400px', overflowY: 'auto', zIndex: 2500 }}>
            <h3>Notifications</h3>
            {!notifications.length && <p>No unread notifications.</p>}
            {notifications.map(notification => <button key={notification._id} style={{ display: 'block', textAlign: 'left', padding: '0.75rem', width: '100%', margin: '0.5rem 0' }} onClick={async () => {
              try { await api('/notifications/' + notification._id + '/read', { method: 'PUT' }); setNotifications(prev => prev.filter(n => n._id !== notification._id)); }
              catch { /* Keep unread until the acknowledgement reaches the server. */ }
            }}>{notification.message}</button>)}
          </div>}
        </div>

        {/* PTS Coin Badge (Only for Donors) */}
        {role === 'donor' && (
          <div className="pts-badge">
            <Award size={15} />
            <span>{user?.coins ?? 0} PTS</span>
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
