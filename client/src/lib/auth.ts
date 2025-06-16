import { User } from '@shared/schema';

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
 * Sanitize user input for display
 */
export function sanitizeUserInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Generate a random avatar color based on user ID
 */
export function getAvatarColor(userId: number): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];
  return colors[userId % colors.length];
}

/**
 * Check if current user can edit profile
 */
export function canEditProfile(currentUser: User | null, profileUser: User | null): boolean {
  if (!currentUser || !profileUser) return false;
  return currentUser.id === profileUser.id;
}

/**
 * Get user's full name or fallback to username
 */
export function getUserFullName(user: User | null): string {
  if (!user) return 'Unknown User';
  return user.name || user.username || 'Unknown User';
}

/**
 * Check if user has profile photo
 */
export function hasProfilePhoto(user: User | null): boolean {
  return !!(user?.avatar);
}

/**
 * Get user's bio or default message
 */
export function getUserBio(user: User | null): string {
  return user?.bio || 'No bio available';
}

/**
 * Format user location
 */
export function formatLocation(location: string | null): string {
  return location || 'Location not specified';
}

/**
 * Check if user profiles are connected (following relationship)
 */
export function areUsersConnected(currentUserId: number | null, targetUserId: number, followers: User[]): boolean {
  if (!currentUserId) return false;
  return followers.some(follower => follower.id === currentUserId);
}

/**
 * Get user status (online/offline)
 * In a real app, this would check actual online status
 */
export function getUserStatus(user: User | null): 'online' | 'offline' {
  // For now, randomly show users as online (in real app, would use websockets)
  if (!user) return 'offline';
  return Math.random() > 0.3 ? 'online' : 'offline';
}

/**
 * Validate profile update data
 */
export function validateProfileUpdate(data: {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.push('Name is required');
    } else if (data.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (data.name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }
  }

  if (data.bio !== undefined && data.bio.length > 160) {
    errors.push('Bio must be less than 160 characters');
  }

  if (data.location !== undefined && data.location.length > 50) {
    errors.push('Location must be less than 50 characters');
  }

  if (data.website !== undefined && data.website) {
    try {
      new URL(data.website);
    } catch {
      errors.push('Please enter a valid website URL');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Constants for authentication
 */
export const AUTH_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MAX_BIO_LENGTH: 160,
  MAX_LOCATION_LENGTH: 50,
} as const;

/**
 * Session storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
