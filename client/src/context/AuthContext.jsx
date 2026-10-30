import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('donor');
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  useEffect(() => {
    let active = true;
    // Medical profiles stay in memory; only the access token lives in session storage.
    localStorage.removeItem('bloodlink_user'); localStorage.removeItem('bloodlink_role');
    const clear = () => { setUser(null); setRole('donor'); };
    window.addEventListener('bloodlink-session-expired', clear);
    if (getToken()) api('/auth/me').then(data => {
      if (active) { setUser(data.data); setRole(data.role); }
    }).catch(() => { if (active) { setToken(null); clear(); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('bloodlink-session-expired', clear); };
  }, []);
  const loginUser = (userData, userRole, token) => {
    setToken(token); setUser(userData); setRole(userRole);
  };
  const logout = async () => {
    try { if (getToken()) await api('/auth/logout', { method: 'POST' }); }
    catch { /* Clear the local session even when the network is unavailable. */ }
    finally { setToken(null); setUser(null); setRole('donor'); }
  };
  return <AuthContext.Provider value={{ user, setUser, role, loginUser, logout, loading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
