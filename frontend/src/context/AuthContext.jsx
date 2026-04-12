import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  // null = not yet determined, true/false = determined
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        // Reject expired tokens
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
          setToken(storedToken);
          setUser(storedUser);
          setRole(decoded.role || storedUser?.role || 'user');
        }
      } catch {
        // Malformed token — clear storage silently
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * Call this after a successful login or registration response.
   * @param {object} data - The full response body: { token, _id, name, email, role, ... }
   */
  const login = useCallback((data) => {
    const { token: newToken, ...userData } = data;
    let decoded = {};
    try {
      decoded = jwtDecode(newToken);
    } catch {
      // ignore decode errors
    }
    const resolvedRole = userData.role || decoded.role || 'user';

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify({ ...userData, role: resolvedRole }));

    setToken(newToken);
    setUser({ ...userData, role: resolvedRole });
    setRole(resolvedRole);
  }, []);

  /**
   * Clear all auth state and send the user to /login.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  }, []);

  const isAuthenticated = Boolean(token);
  const isOrganizer = role === 'organizer' || role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated, isOrganizer, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
