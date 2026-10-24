import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Default to Donor John Doe from seed data for immediate testing
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bloodlink_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return {
      _id: 'mock-user-id',
      donorId: 'BL-2024-78542',
      name: 'John Doe',
      email: 'useremail@gmail.com',
      bloodType: 'O+',
      coins: 450,
      totalDonations: 8,
      badgesCount: 3,
      userType: 'donor',
      role: 'donor',
      lastDonationDate: '2025-10-14'
    };
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem('bloodlink_role') || 'donor';
  });

  const loginUser = (userData, userRole) => {
    setUser(userData);
    setRole(userRole);
    localStorage.setItem('bloodlink_user', JSON.stringify(userData));
    localStorage.setItem('bloodlink_role', userRole);
  };

  const logout = () => {
    setUser(null);
    setRole('donor');
    localStorage.removeItem('bloodlink_user');
    localStorage.removeItem('bloodlink_role');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
