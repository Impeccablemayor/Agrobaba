import { KEYS, getItem, setItem } from './storage';
import { showToast } from './toastBus';
import { api, setAuthToken } from './api';
import type { Role, SafeUser, User } from '../types';

export function getCurrentUser(): SafeUser | null {
  return getItem<SafeUser>(KEYS.user);
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function getUserRole(): Role | null {
  return getCurrentUser()?.role ?? null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  country?: string;
  city?: string;
  contact?: string;
  address?: string;
}

export async function registerUser(data: RegisterInput): Promise<boolean> {
  try {
    const response = await api.post<{ token: string; id: number; role: string; name: string; email: string }>('/api/auth/register', {
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'buyer',
    });

    setAuthToken(response.token);

    const safeUser = {
      id: String(response.id),
      name: response.name,
      email: response.email,
      role: response.role as Role,
      country: data.country || '',
      city: data.city || '',
      contact: data.contact || '',
      address: data.address || '',
      verified: false,
      joinedAt: new Date().toISOString(),
      avatar: null,
    } as SafeUser;

    setItem(KEYS.user, safeUser);
    showToast(`Welcome to Agrobaba, ${response.name}!`, 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account';
    showToast(message, 'error');
    return false;
  }
}

export async function loginUser(email: string, password: string): Promise<boolean> {
  try {
    const response = await api.post<{ token: string; id: number; role: string; name: string; email: string }>('/api/auth/login', { email, password });
    setAuthToken(response.token);

    const safeUser = {
      id: String(response.id),
      name: response.name,
      email: response.email,
      role: response.role as Role,
      country: '',
      city: '',
      contact: '',
      address: '',
      verified: false,
      joinedAt: new Date().toISOString(),
      avatar: null,
    } as SafeUser;

    setItem(KEYS.user, safeUser);
    showToast(`Welcome back, ${response.name}!`, 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign in';
    showToast(message, 'error');
    return false;
  }
}

export function logoutUser(): void {
  localStorage.removeItem(KEYS.user);
  localStorage.removeItem(KEYS.cart);
  setAuthToken(null);
}

interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string | null;
  city: string | null;
  contact: string | null;
  address: string | null;
  businessName: string | null;
  bio: string | null;
  verified: boolean;
  avatar: string | null;
}

function mapProfileToSafeUser(profile: ProfileResponse): SafeUser {
  return {
    id: String(profile.id),
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    country: profile.country || '',
    city: profile.city || '',
    contact: profile.contact || '',
    address: profile.address || '',
    businessName: profile.businessName || undefined,
    bio: profile.bio || undefined,
    verified: profile.verified,
    joinedAt: '',
    avatar: profile.avatar || null,
  };
}

export async function updateUser(updatedData: Partial<User>): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    const profile = await api.put<ProfileResponse>('/api/auth/profile', {
      name: updatedData.name,
      country: updatedData.country,
      city: updatedData.city,
      contact: updatedData.contact,
      address: updatedData.address,
      businessName: updatedData.businessName,
      bio: updatedData.bio,
    });

    const safeUser = mapProfileToSafeUser(profile);
    setItem(KEYS.user, safeUser);
    showToast('Profile updated successfully!', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile';
    showToast(message, 'error');
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    await api.put('/api/auth/password', { oldPassword, newPassword });
    showToast('Password updated successfully!', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to change password';
    showToast(message, 'error');
    return false;
  }
}

export async function forgotPassword(email: string): Promise<boolean> {
  try {
    await api.post('/api/auth/forgot-password', { email });
    showToast("If that email is registered, we've sent a reset link.", 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send reset email';
    showToast(message, 'error');
    return false;
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    await api.post('/api/auth/reset-password', { token, newPassword });
    showToast('Password reset. You can now log in with your new password.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reset password';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteAccount(password: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    await api.delete('/api/auth/account', { password });
    localStorage.removeItem(KEYS.user);
    localStorage.removeItem(KEYS.cart);
    localStorage.removeItem('agrobaba_token');
    showToast('Account deleted. Goodbye!', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete account';
    showToast(message, 'error');
    return false;
  }
}
