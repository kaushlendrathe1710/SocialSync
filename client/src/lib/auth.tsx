import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { apiRequest } from './queryClient';

/**
 * Authentication utility functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate OTP format (6 digits)
 */
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(user: User | null): string {
  if (!user?.name) return '?';
  const names = user.name.split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format user display name
 */
export function getDisplayName(user: User | null): string {
  return user?.name || 'Unknown User';
}

/**
 * Get user profile URL
 */
export function getUserProfileUrl(user: User): string {
  return `/profile/${user.id}`;
}

/**
 * Check if user is verified
 */
export function isVerifiedUser(user: User | null): boolean {
  return user?.isVerified || false;
}

/**
 * Format username with @ prefix
 */
export function formatUsername(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Get user's full name or fallback to username
 */
export function getUserFullName(user: User | null): string {
  if (!user) return 'Unknown User';
  return user.name || user.username || 'Unknown User';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, code: string, name?: string, username?: string) => Promise<any>;
  logout: () => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/me');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      // Not authenticated
      console.log('Not authenticated');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (email: string) => {
    await apiRequest('POST', '/api/auth/send-otp', { email });
  };

  const login = async (email: string, code: string, name?: string, username?: string) => {
    const response = await apiRequest('POST', '/api/auth/verify-otp', { 
      email, 
      code, 
      name, 
      username 
    });
    const data = await response.json();
    
    if (data.user) {
      setUser(data.user);
    }
    
    return data; // Return the full response for handling in components
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, sendOTP }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
