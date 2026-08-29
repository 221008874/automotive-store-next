import { create } from 'zustand';
import React from 'react';

export interface Session {
  username: string;
  role: string;
  token: string;
  mustChangePassword: boolean;
  uid: string; // Firebase UID
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  restore: () => Promise<void>;
  markPasswordChanged: () => void;
}

const API =
  typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    ? 'http://localhost:8081'
    : '';

export const useAuth = create<AuthState>((set) => ({
  session: null,
  loading: true,

  login: async (username, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    const data = await res.json();
    // sanitize uid for use as Firestore doc id (no /, #, [, ], *, and max 128 chars)
    const rawUid: string = (data.uid || data.username || username) as string;
    const safeUid = rawUid.replace(/[\/#\[\]*]/g, '_').slice(0, 128) || username.replace(/[\/#\[\]*]/g, '_');
    const session: Session = {
      username: data.username,
      role: data.role,
      token: data.token,
      mustChangePassword: data.mustChangePassword ?? false,
      uid: safeUid,
    };
    localStorage.setItem('session', JSON.stringify(session));
    set({ session });
    return data.mustChangePassword ?? false;
  },

  logout: () => {
    try {
      const stored = localStorage.getItem('session');
      if (stored) {
        const old = JSON.parse(stored) as Session;
        if (old?.uid) {
          localStorage.removeItem(`license_cache_${old.uid}`);
        }
      }
    } catch { /* ignore */ }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('license_cache')) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    // Defer license state reset to the license store subscription (avoids circular import).
    // Also set a global flag so license subscriber can detect logout even if auth store hasn't propagated yet.
    try { localStorage.setItem('__license_reset', String(Date.now())); } catch { /* ignore */ }
    try { localStorage.removeItem('session'); } catch { /* ignore */ }
    set({ session: null });
  },

  markPasswordChanged: () => {
    const stored = localStorage.getItem('session');
    if (stored) {
      const session = JSON.parse(stored) as Session;
      session.mustChangePassword = false;
      localStorage.setItem('session', JSON.stringify(session));
      set({ session });
    }
  },

  restore: async () => {
    try {
      const stored = localStorage.getItem('session');
      if (stored) {
        const session = JSON.parse(stored) as Session;
        // Ensure uid exists and is safe for Firestore (backward compat)
        if (!session.uid) {
          session.uid = (session.username || '').replace(/[\/#\[\]*]/g, '_').slice(0, 128);
        } else {
          session.uid = String(session.uid).replace(/[\/#\[\]*]/g, '_').slice(0, 128);
        }
        set({ session, loading: false });
        return;
      }
    } catch { /* ignore */ }
    set({ session: null, loading: false });
  },
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const restore = useAuth((s) => s.restore);
  const loading = useAuth((s) => s.loading);

  React.useEffect(() => { restore(); }, [restore]);

  if (loading) return null;
  return <>{children}</>;
}