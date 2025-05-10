// DEPRECATED: This context is now replaced by Redux state management. Use Redux hooks for auth state.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      // You might want to fetch user data here
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await auth.login(email, password);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Login failed. Please try again.');
      throw error;
    }
  };

  const register = async (email: string, password: string, full_name?: string) => {
    try {
      setError(null);
      const response = await auth.register(email, password, full_name);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Registration failed. Please try again.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      // Get the token before clearing it
      const token = localStorage.getItem('access_token');
      if (token) {
        // Call the logout API with the token
        await auth.logout();
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Logout failed. Please try again.');
      console.error('Logout API call failed:', error);
    } finally {
      // Clear all auth-related data regardless of API call success
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 