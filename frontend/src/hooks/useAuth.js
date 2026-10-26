import { useState, useEffect, useCallback } from 'react';
import { getToken, removeToken, getUsername } from '../utils/storage';
import { login, register, logout } from '../services/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      const storedName = await getUsername();
      if (token) {
        setIsAuthenticated(true);
        setCurrentUser(storedName || 'Recall');
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = useCallback(async (username, password) => {
    const result = await login(username, password);
    const resolvedName = result?.username || username;
    setCurrentUser(resolvedName);
    setIsAuthenticated(true);
  }, []);

  const handleRegister = useCallback(async (username, email, password) => {
    const result = await register(username, email, password);
    const resolvedName = result?.username || username;
    setCurrentUser(resolvedName);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, currentUser, loading, handleLogin, handleRegister, handleLogout };
};
