import { createContext, useContext, useState, type ReactNode } from 'react';
import * as authLib from '../lib/auth';
import type { RegisterInput } from '../lib/auth';
import type { SafeUser, User } from '../types';

interface AuthContextValue {
  user: SafeUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(() => authLib.getCurrentUser());

  async function login(email: string, password: string): Promise<boolean> {
    const ok = await authLib.loginUser(email, password);
    if (ok) setUser(authLib.getCurrentUser());
    return ok;
  }

  async function register(data: RegisterInput): Promise<boolean> {
    const ok = await authLib.registerUser(data);
    if (ok) setUser(authLib.getCurrentUser());
    return ok;
  }

  function logout(): void {
    authLib.logoutUser();
    setUser(null);
  }

  async function updateUser(data: Partial<User>): Promise<boolean> {
    const ok = await authLib.updateUser(data);
    if (ok) setUser(authLib.getCurrentUser());
    return ok;
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    return await authLib.changePassword(oldPassword, newPassword);
  }

  async function deleteAccount(password: string): Promise<boolean> {
    const ok = await authLib.deleteAccount(password);
    if (ok) setUser(null);
    return ok;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, changePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
