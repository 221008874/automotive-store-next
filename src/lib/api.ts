const BASE_URL =
  typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    ? 'http://localhost:8081'
    : '';

function extractErrorMessage(text: string): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.error === 'string') return parsed.error;
    if (parsed && Array.isArray(parsed.errors)) {
      const messages = parsed.errors
        .map((e: { field?: string; message?: string }) => e?.message)
        .filter((m: unknown): m is string => typeof m === 'string' && m.length > 0);
      if (messages.length > 0) return messages.join(' • ');
    }
  } catch { /* not JSON */ }
  return text;
}

function extractErrorCode(text: string): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.code === 'string') return parsed.code;
  } catch { /* not JSON */ }
  return '';
}

function markMustChangePassword() {
  try {
    const stored = localStorage.getItem('session');
    if (stored) {
      const session = JSON.parse(stored);
      session.mustChangePassword = true;
      localStorage.setItem('session', JSON.stringify(session));
    }
  } catch { /* ignore */ }
}

function clearLicenseCaches() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('license_cache')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

function safeJsonParse<T>(text: string): T | null {
  const t = text.trim();
  if (!t) return null;
  if (t.startsWith('{') || t.startsWith('[')) {
    try { return JSON.parse(t) as T; } catch { return null; }
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = (() => {
    try {
      const stored = localStorage.getItem('session');
      if (stored) return JSON.parse(stored).token;
    } catch { /* ignore */ }
    return null;
  })();

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers as Record<string, string>,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    const text = await res.text().catch(() => '');
    const code = extractErrorCode(text);
    // Business-level auth errors should be surfaced to the caller (inline form errors),
    // NOT treated as a logged-out session. Only a truly expired/invalid session (or an
    // explicit PASSWORD_CHANGE_REQUIRED) should clear auth + redirect.
    if (code === 'PASSWORD_CHANGE_REQUIRED') {
      markMustChangePassword();
      // Use history API to avoid full reload in SPA/Tauri
      if (window.location.pathname !== '/change-password') {
        window.history.pushState(null, '', '/change-password');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      throw new Error('يجب تغيير كلمة المرور قبل المتابعة');
    }
    if (code === 'INVALID_CREDENTIALS' || code === 'ACCOUNT_LOCKED') {
      throw new Error(extractErrorMessage(text) || 'Unauthorized');
    }
    localStorage.removeItem('session');
    clearLicenseCaches();
    // Clear React Query cache is handled by auth store; use SPA navigation
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      // Fallback for cases outside Router
      setTimeout(() => { if (window.location.pathname !== '/login') window.location.href = '/login'; }, 50);
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Clamp large HTML error bodies to avoid Alert overflow
    const msg = extractErrorMessage(text);
    const safeMsg = msg.length > 500 ? msg.slice(0, 500) + '…' : msg;
    throw new Error(safeMsg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text().catch(() => '');
  if (!text.trim()) return undefined as T;
  const parsed = safeJsonParse<T>(text);
  if (parsed !== null) return parsed;
  // Non-JSON success (e.g. plain text) – return raw text if T is string, else undefined
  if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    return (text as unknown) as T;
  }
  throw new Error('Invalid JSON response');
}

async function download(path: string): Promise<void> {
  const token = (() => {
    try {
      const stored = localStorage.getItem('session');
      if (stored) return JSON.parse(stored).token;
    } catch { /* ignore */ }
    return null;
  })();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (res.status === 401) {
    const text = await res.text().catch(() => '');
    const code = extractErrorCode(text);
    if (code === 'PASSWORD_CHANGE_REQUIRED') {
      markMustChangePassword();
      if (window.location.pathname !== '/change-password') {
        window.history.pushState(null, '', '/change-password');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      throw new Error('يجب تغيير كلمة المرور قبل المتابعة');
    }
    if (code === 'INVALID_CREDENTIALS' || code === 'ACCOUNT_LOCKED') {
      throw new Error(extractErrorMessage(text) || 'Unauthorized');
    }
    localStorage.removeItem('session');
    clearLicenseCaches();
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      setTimeout(() => { if (window.location.pathname !== '/login') window.location.href = '/login'; }, 50);
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(extractErrorMessage(text) || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  // Handle filename*=UTF-8'' and quoted filename
  let filename: string | null = null;
  const starMatch = /filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i.exec(disposition);
  if (starMatch) {
    try { filename = decodeURIComponent(starMatch[1].trim().replace(/^["']|["']$/g, '')); } catch { filename = starMatch[1].trim(); }
  }
  if (!filename) {
    const match = /filename=([^;]+)/.exec(disposition);
    filename = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  }
  const fallback = path.split('?')[0].split('/').filter(Boolean).pop() || 'download';
  if (!filename) filename = fallback;
  // Sanitize fallback
  if (filename === 'export') filename = 'report_export.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
  download,
};
