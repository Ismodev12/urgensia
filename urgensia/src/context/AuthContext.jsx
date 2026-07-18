import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../services/authService';
import { getAccessToken, clearTokens } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);   // vrai pendant la vérification initiale
  const [authError,     setAuthError]     = useState(null);

  // ── Vérification initiale : token encore valide en localStorage ? ────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Si token présent, récupérer le profil
    getMe()
      .then((me) => {
        setUser(me);
        connectSocket(me.role, me.id);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const { user: loggedUser } = await apiLogin(email, password);
    setUser(loggedUser);
    connectSocket(loggedUser.role, loggedUser.id);
    return loggedUser;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout();
    disconnectSocket();
    setUser(null);
  }, []);

  // ── Mise à jour locale du profil (après édition dans les paramètres) ──────
  // Fusionne les champs modifiés pour rafraîchir l'avatar/les infos partout.
  const updateUser = useCallback((partial) => {
    setUser(prev => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const isAuthenticated = !!user && !!getAccessToken();

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    setAuthError,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
