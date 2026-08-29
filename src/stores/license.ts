import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { api } from '../lib/api';

/**
 * Keep the embedded server's license cache in sync so the server-side
 * LicenseEnforcementFilter stops returning 402 on data endpoints. The server has its OWN
 * license cache (AES-encrypted, populated only by POST /api/license/activate against the
 * Firestore `licenses` collection by activationCode) — separate from the frontend's
 * machine-level Firestore gate. A reinstall/factory-reset can wipe the server cache while
 * leaving the frontend's localStorage (machine_key + license_cache) intact, so `check()`
 * can pass from cache without ever re-calling `activate()`. This helper ensures the server
 * is warm whenever the machine reports a valid key. `/api/license/**` is excluded from the
 * enforcement filter, so it works without an auth token and is non-fatal on failure.
 */
async function ensureServerLicensed(key: string): Promise<void> {
  if (!key) return;
  try {
    const status = await api.get<{ activated: boolean }>('/api/license/status');
    if (status && status.activated === true) return;
  } catch { /* status unreachable — fall through to activate anyway */ }
  try {
    await api.post('/api/license/activate', key);
  } catch (e) {
    // Best-effort. The frontend machine gate is the authority for showing the app; if the
    // server can't be reached now, the next check/focus/activation will retry it.
    console.warn('Warm server license cache failed:', e);
  }
}

export interface LicenseStatus {
  activated: boolean;
  cloudAvailable: boolean;
  hasLocalCache?: boolean;
  licenseKey?: string;
  expiresAt?: string;
  features: string[];
}

interface LicenseState {
  status: LicenseStatus | null;
  checking: boolean;
  activating: boolean;
  error: string;
  machineKey: string;
  check: () => Promise<void>;
  activate: (licenseKey: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
}

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days offline grace

/**
 * Machine-level license identity.
 *
 * The license is bound to the whole install/device, NOT to a logged-in user, so it
 * can be validated before the login screen. The key is a stable per-install UUID
 * persisted in localStorage; it survives app restarts. Clearing local app data
 * (factory reset) regenerates it, which is expected.
 */
function getMachineKey(): string {
  try {
    let k = localStorage.getItem('machine_key');
    if (!k) {
      k = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'machine-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('machine_key', k);
    }
    return k;
  } catch {
    return 'machine-default';
  }
}

function parseExpiresAt(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>;
    if (typeof r['toDate'] === 'function') {
      try { return ((r as unknown as { toDate(): Date }).toDate()).getTime(); } catch { /* fallback */ }
    }
    if (typeof r['seconds'] === 'number') return (r['seconds'] as number) * 1000;
    if (typeof r['_seconds'] === 'number') return (r['_seconds'] as number) * 1000;
    if (typeof r['seconds'] === 'string') {
      const n = Number(r['seconds']); if (!Number.isNaN(n)) return n * 1000;
    }
  }
  if (typeof raw === 'string') {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof raw === 'number') {
    return raw > 1e12 ? raw : raw * 1000;
  }
  return null;
}

const CACHE_KEY = 'license_cache';

function readCached(): { status: LicenseStatus; checkedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function writeCache(status: LicenseStatus, checkedAt: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ status, checkedAt }));
  } catch { /* ignore */ }
}

function clearCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('license_cache')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

/**
 * Reflect the pool license (licenses/{key}) state. Returns null if the pool cannot be
 * read (offline/permission) so we can fall back to the machine mirror + local cache.
 */
async function fetchPool(key: string): Promise<{ active: boolean; expiresAt: number | null; features: string[] } | null> {
  try {
    const ref = doc(db, 'licenses', key);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data() as Record<string, unknown>;
    return {
      active: d['active'] === true,
      expiresAt: parseExpiresAt(d['expiresAt']),
      features: Array.isArray(d['features']) ? (d['features'] as string[]) : [],
    };
  } catch {
    return null;
  }
}

export const useLicense = create<LicenseState>((set, get) => ({
  status: null,
  checking: true,
  activating: false,
  error: '',
  machineKey: typeof window !== 'undefined' ? getMachineKey() : 'machine-default',

  check: async () => {
    set({ checking: true, error: '' });
    const machineKey = get().machineKey || getMachineKey();
    const now = Date.now();

    try {
      // 1) Machine mirror: userLicenses/{machineKey} – authoritative record of activation
      let mirror: Record<string, unknown> | null = null;
      try {
        const ref = doc(db, 'userLicenses', machineKey);
        const snap = await getDoc(ref);
        if (snap.exists()) mirror = snap.data() as Record<string, unknown>;
      } catch {
        // Firestore unreachable – fall through to cache/grace below
      }

      if (mirror && mirror['activated'] === true) {
        const licenseKey = typeof mirror['licenseKey'] === 'string' ? (mirror['licenseKey'] as string) : undefined;
        const mirrorFeatures = Array.isArray(mirror['features']) ? (mirror['features'] as string[]) : [];
        const mirrorExpires = parseExpiresAt(mirror['expiresAt']);

        if (mirrorExpires && mirrorExpires < now) {
          set({
            status: { activated: false, cloudAvailable: true, hasLocalCache: !!readCached(), licenseKey, expiresAt: new Date(mirrorExpires).toISOString(), features: [] },
            checking: false, error: 'انتهت صلاحية الترخيص',
          });
          return;
        }

        // Refresh the license pool doc to confirm the key is still active/not revoked
        if (licenseKey) {
          const pool = await fetchPool(licenseKey);
          if (pool) {
            if (!pool.active) {
              set({
                status: { activated: false, cloudAvailable: true, hasLocalCache: !!readCached(), licenseKey, expiresAt: undefined, features: [] },
                checking: false, error: 'تم تعطيل الترخيص',
              });
              return;
            }
            if (pool.expiresAt && pool.expiresAt < now) {
              set({
                status: { activated: false, cloudAvailable: true, hasLocalCache: !!readCached(), licenseKey, expiresAt: new Date(pool.expiresAt).toISOString(), features: [] },
                checking: false, error: 'انتهت صلاحية الترخيص',
              });
              return;
            }
            if (pool.features.length) mirrorFeatures.length = 0; // prefer mirror unless empty
            const finalFeatures = pool.features.length ? pool.features : mirrorFeatures;
            const finalExpires = pool.expiresAt ?? mirrorExpires;
            const status: LicenseStatus = {
              activated: true, cloudAvailable: true, hasLocalCache: true,
              licenseKey,
              expiresAt: finalExpires ? new Date(finalExpires).toISOString() : undefined,
              features: finalFeatures,
            };
            writeCache(status, now);
            // Sync the embedded server's license so it stops returning 402, even when the
            // machine was already licensed from cache (server cache may have been wiped).
            await ensureServerLicensed(licenseKey);
            set({ status, checking: false, error: '' });
            return;
          }
        }

        // Mirror exists and is valid; pool unavailable → trust mirror (offline grace)
        const status: LicenseStatus = {
          activated: true, cloudAvailable: false, hasLocalCache: true, licenseKey,
          expiresAt: mirrorExpires ? new Date(mirrorExpires).toISOString() : undefined,
          features: mirrorFeatures,
        };
        writeCache(status, now);
        await ensureServerLicensed(licenseKey || '');
        set({ status, checking: false, error: '' });
        return;
      }

      // Mirror exists but explicitly not activated
      if (mirror && mirror['activated'] !== true) {
        set({
          status: { activated: false, cloudAvailable: true, hasLocalCache: !!readCached(), features: [] },
          checking: false, error: 'الترخيص غير مفعّل',
        });
        return;
      }

      // 2) Legacy: previous per-user licenses/{uid} where uid was the (old) login username.
      //    Not used for machine-level; skip to cache.

      // 3) Local cache offline grace (covered above only when mirror valid; also allow cached activation)
      const cached = readCached();
      if (cached && now - cached.checkedAt < GRACE_PERIOD_MS && cached.status.activated) {
        await ensureServerLicensed(cached.status.licenseKey || '');
        set({ status: { ...cached.status, cloudAvailable: false }, checking: false, error: '' });
        return;
      }

      // 4) No valid machine license anywhere
      set({
        checking: false,
        error: 'لم يتم العثور على ترخيص صالح',
        status: { activated: false, cloudAvailable: true, hasLocalCache: !!cached, features: [] },
      });
    } catch (err) {
      console.error('License check error:', err);

      const cached = readCached();
      if (cached && now - cached.checkedAt < GRACE_PERIOD_MS && cached.status.activated) {
        set({ status: { ...cached.status, cloudAvailable: false }, checking: false, error: '' });
        return;
      }

      const msg = err instanceof Error ? err.message : '';
      const isPermission = msg.includes('permission') || msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient');
      if (isPermission) {
        set({ checking: false, error: 'خطأ صلاحيات Firestore – تأكد من قواعد Firestore أو أن التطبيق يملك صلاحية القراءة' });
      } else {
        set({ checking: false, error: 'تعذر الاتصال بخدمة الترخيص' });
      }
    }
  },

  activate: async (licenseKey) => {
    set({ activating: true, error: '' });
    const machineKey = get().machineKey || getMachineKey();
    const key = licenseKey.trim();
    if (!key) {
      set({ activating: false, error: 'مفتاح الترخيص مطلوب' });
      return false;
    }
    if (key.includes('/') || key.includes('#') || key.includes('[') || key.includes(']')) {
      set({ activating: false, error: 'مفتاح الترخيص يحتوي على أحرف غير صالحة' });
      return false;
    }

    try {
      const licenseDocRef = doc(db, 'licenses', key);
      const licenseDoc = await getDoc(licenseDocRef);
      if (!licenseDoc.exists()) {
        set({ activating: false, error: 'مفتاح الترخيص غير موجود' });
        return false;
      }

      const data = licenseDoc.data() as Record<string, unknown>;
      const now = Date.now();
      const expiresAt = parseExpiresAt(data['expiresAt']);

      if (data['active'] !== true) {
        set({ activating: false, error: 'هذا الترخيص غير نشط' });
        return false;
      }
      if (expiresAt && expiresAt < now) {
        set({ activating: false, error: 'انتهت صلاحية هذا الترخيص' });
        return false;
      }

      // Bind this machine to the license pool (best-effort; mirrors may still succeed)
      try {
        await updateDoc(licenseDocRef, {
          deviceId: machineKey,
          lastActivatedAt: Timestamp.now(),
        });
      } catch { /* rules may block anonymous updateDoc – continued below */ }

      // Machine mirror – authoritative for machine-level licensing
      await setDoc(
        doc(db, 'userLicenses', machineKey),
        {
          licenseKey: key,
          activated: true,
          cloudAvailable: true,
          hasLocalCache: true,
          activatedAt: Timestamp.now(),
          expiresAt: data['expiresAt'] ?? null,
          features: Array.isArray(data['features']) ? data['features'] : [],
          deviceId: machineKey,
        },
        { merge: true },
      );

      // ALSO ensure the embedded server's LicenseEnforcementFilter stops returning 402.
      // Best-effort; non-fatal if the server can't be reached right now.
      await ensureServerLicensed(key);

      const status: LicenseStatus = {
        activated: true,
        cloudAvailable: true,
        hasLocalCache: true,
        licenseKey: key,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        features: Array.isArray(data['features']) ? (data['features'] as string[]) : [],
      };
      writeCache(status, now);
      set({ status, activating: false, error: '' });
      return true;
    } catch (err) {
      console.error('License activation error:', err);
      const msg = (err as Error).message || '';
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        set({ activating: false, error: 'فشل التفعيل: ليس لديك صلاحية – تأكد من قواعد Firestore (allow read/write)' });
      } else {
        set({ activating: false, error: 'فشل التفعيل: ' + msg });
      }
      return false;
    }
  },

  deactivate: async () => {
    const machineKey = get().machineKey || getMachineKey();
    try {
      await updateDoc(doc(db, 'userLicenses', machineKey), {
        activated: false,
        deactivatedAt: Timestamp.now(),
      });
    } catch { /* ignore */ }
    clearCache();
    await get().check();
  },
}));
