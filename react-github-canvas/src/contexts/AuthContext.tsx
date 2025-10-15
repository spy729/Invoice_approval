import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config';

export type UserRole = 'admin' | 'manager';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole, companyName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token and get user data
  const validateToken = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const userData = await response.json();
      setUser({
        id: userData._id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
      });
      return true;
    } catch (err) {
      console.warn('Token validation failed:', err);
      localStorage.removeItem('workflow_token');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: userData._id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth check failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Login failed');
      }

      setUser({
        id: json.user.id,
        email: json.user.email,
        name: json.user.name,
        role: json.user.role as UserRole,
      });
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole = 'manager', companyName: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, companyName }),
      credentials: 'include',
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('Signup failed:', json);
      throw new Error(json.error || 'Failed to create account');
    }

    const token = json.token;
    if (!token) throw new Error('No token returned from server');
    
    // Save token and validate it immediately
    localStorage.setItem('workflow_token', token);
    
    // Get full user profile from /users/me endpoint
    const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    const userData = await profileRes.json();
    setUser({
      id: userData._id,
      email: userData.email,
      name: userData.name,
      role: userData.role as UserRole,
    });
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  // Helper: simple JWT payload parser (no external deps)
  function parseJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (err) {
      return null;
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        signup, 
        logout, 
        isAuthenticated: !!user,
        isLoading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
