import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../api/types';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../api/auth';
import { getAuthToken, setAuthToken, clearApiCache } from '../api/client';

export const CACHED_USER_KEY = 'cruisehunt_cached_user';

function getInitialUserState(): { user: User | null; loading: boolean } {
  try {
    const token = getAuthToken();
    if (!token) {
      // Guest visitor: immediate 0ms load, NO loading spinner
      return { user: null, loading: false };
    }
    const cached = localStorage.getItem(CACHED_USER_KEY) || localStorage.getItem('crosshunt_cached_user');
    if (cached) {
      // Logged-in user: immediately restore profile from cache! Zero spinner!
      return { user: JSON.parse(cached), loading: false };
    }
    // Token exists without cached user (rare edge case): brief check
    return { user: null, loading: true };
  } catch {
    return { user: null, loading: false };
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(() => getInitialUserState());
  const [user, setUser] = useState<User | null>(initial.user);
  const [loading, setLoading] = useState<boolean>(initial.loading);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(updatedUser));
    } catch {}
    clearApiCache();
  };

  const refreshUser = async (silent = false) => {
    if (!silent && !user) setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        try {
          localStorage.removeItem(CACHED_USER_KEY);
        } catch {}
        setLoading(false);
        return;
      }
      clearApiCache();
      const u = await getCurrentUser();
      setUser(u);
      if (u) {
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
        } catch {}
      } else {
        try {
          localStorage.removeItem(CACHED_USER_KEY);
        } catch {}
      }
    } catch {
      setUser(null);
      try {
        localStorage.removeItem(CACHED_USER_KEY);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If token exists, verify silently in background to keep data fresh without blocking UI
    const token = getAuthToken();
    if (token) {
      refreshUser(true);
    }
  }, []);

  const login = async (u: string, p: string) => {
    const loggedUser = await loginUser(u, p);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(loggedUser));
    } catch {}
    setUser(loggedUser);
    clearApiCache();
    return loggedUser;
  };

  const register = async (payload: any) => {
    const newUser = await registerUser(payload);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(newUser));
    } catch {}
    setUser(newUser);
    clearApiCache();
    return newUser;
  };

  const logout = async () => {
    // Instant optimistic client-side logout (0ms UI lag!)
    setAuthToken(null);
    try {
      localStorage.removeItem(CACHED_USER_KEY);
    } catch {}
    setUser(null);
    clearApiCache();

    // Fire backend cookie/session revocation asynchronously without blocking UI
    logoutUser().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
