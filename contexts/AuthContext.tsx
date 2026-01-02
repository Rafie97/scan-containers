import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, AuthUser, setAuthToken, getAuthToken } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (user: AuthUser, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved token on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          setAuthToken(savedToken);
          const { user } = await authApi.me();
          setUser(user);
        }
      } catch (error) {
        // Token invalid or expired
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user, token } = await authApi.login(username, password);
    setAuthToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors on logout
    }
    setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const setSession = useCallback(async (user: AuthUser, token: string) => {
    setAuthToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(user);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    setSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
