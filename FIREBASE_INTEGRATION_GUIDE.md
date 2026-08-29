# Firebase Integration Guide for Automotive Store

This guide provides specific code examples to replace the local license/auth system with Firebase.

## Step 1: Install Firebase
```bash
cd /d/projects/automotive-store-next
npm install firebase
```

## Step 2: Create Firebase Configuration
Create `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where } from 'firebase/firestore';

// 🔥 REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export commonly used functions
export const signUp = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
```

## Step 3: Replace Auth Store (`src/stores/auth.tsx`)

### Current Implementation (Local HTTP):
```typescript
// REPLACE THIS ENTIRE FILE WITH THE VERSION BELOW
```

### New Firebase Implementation:
```typescript
import { create } from 'zustand';
import React from 'react';
import { auth, onAuthStateChange, signIn } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restore: () => Promise<void>;
  markPasswordChanged: () => void;
  register: (email: string, password: string, username: string, role: string) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  loading: true,

  login: async (email, password) => {
    try {
      const userCredential = await signIn(auth, email, password);
      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData = {};
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
      
      // Get Firebase ID token for backend communication if needed
      const token = await user.getIdToken();
      
      const session: Session = {
        username: userData['username'] || email.split('@')[0],
        role: userData['role'] || 'USER',
        token,
        mustChangePassword: userData['mustChangePassword'] ?? false,
        uid: user.uid
      };
      
      localStorage.setItem('session', JSON.stringify(session));
      set({ session });
      return data.mustChangePassword ?? false;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  },

  logout: () => {
    localStorage.removeItem('session');
    set({ session: null });
  },

  restore: async () => {
    try {
      const stored = localStorage.getItem('session');
      if (stored) {
        const session = JSON.parse(stored) as Session;
        // Verify the session is still valid with Firebase
        const user = auth.currentUser;
        if (user && user.uid === session.uid) {
          set({ session, loading: false });
          return;
        }
      }
    } catch { /* ignore */ }
    set({ session: null, loading: false });
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

  register: async (email, password, username, role = 'USER') => {
    try {
      const userCredential = await signUp(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        role,
        createdAt: new Date(),
        mustChangePassword: true
      });
      
      // Sign in the new user
      await signIn(auth, email, password);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const restore = useAuth((s) => s.restore);
  const loading = useAuth((s) => s.loading);

  React.useEffect(() => { restore(); }, [restore]);

  if (loading) return null;
  return <>{children}</>;
}
```

## Step 4: Replace License Store (`src/stores/license.ts`)

### Current Implementation (Local HTTP):
```typescript
// REPLACE THIS ENTIRE FILE WITH THE VERSION BELOW
```

### New Firebase Implementation:
```typescript
import { create } from 'zustand';
import { useAuth, type Session } from './auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const API =
  typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    ? 'http://localhost:8081'
    : '';

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
  check: () => Promise<void>;
  activate: (licenseKey: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
}

export const useLicense = create<LicenseState>((set, get) => ({
  status: null,
  checking: true,
  activating: false,
  error: '',

  check: async () => {
    set({ checking: true });
    const { session } = useAuth.getState();
    
    if (!session) {
      set({ checking: false, error: 'غير مصدق' });
      return;
    }

    try {
      // Check license status from Firestore
      const licenseDoc = await getDoc(doc(db, 'licenses', session.uid));
      
      if (licenseDoc.exists()) {
        const licenseData = licenseDoc.data();
        const status: LicenseStatus = {
          activated: licenseData.activated ?? false,
          cloudAvailable: licenseData.cloudAvailable ?? true,
          hasLocalCache: licenseData.hasLocalCache ?? false,
          licenseKey: licenseData.licenseKey,
          expiresAt: licenseData.expiresAt,
          features: licenseData.features ?? []
        };
        
        set({ status, checking: false, error: '' });
        return;
      } else {
        // No license document found
        set({ 
          checking: false, 
          error: 'لم يتم العثور على ترخيص', 
          status: { 
            activated: false, 
            cloudAvailable: true, 
            features: [] 
          } 
        });
      }
    } catch (error) {
      console.error('License check error:', error);
      set({ checking: false, error: 'تعذر الوصول إلى الخادم' });
    }
  },

  activate: async (licenseKey) => {
    set({ activating: true, error: '' });
    const { session } = useAuth.getState();
    
    if (!session) {
      set({ activating: false, error: 'غير مصدق' });
      return false;
    }

    try {
      // Verify license key with your backend or validate format
      // For demo, we'll assume any non-empty key is valid for activation
      if (!licenseKey.trim()) {
        set({ activating: false, error: 'مفتاح الترخيص غير válido' });
        return false;
      }
      
      // Store license in Firestore
      await setDoc(doc(db, 'licenses', session.uid), {
        licenseKey: licenseKey.trim(),
        activated: true,
        cloudAvailable: true,
        hasLocalCache: false,
        activatedAt: new Date(),
        features: ['premium', 'updates', 'support'],
        updatedAt: new Date()
      }, { merge: true });
      
      // Refresh license status
      await get().check();
      set({ activating: false });
      return true;
    } catch (error) {
      console.error('License activation error:', error);
      set({ activating: false, error: 'فشل التفعيل: ' + (error as Error).message });
      return false;
    }
  },

  deactivate: async () => {
    const { session } = useAuth.getState();
    if (!session) return;
    
    try {
      await updateDoc(doc(db, 'licenses', session.uid), {
        activated: false,
        deactivatedAt: new Date()
      });
      await get().check();
    } catch (error) {
      console.error('License deactivation error:', error);
    }
  }
}));
```

## Step 5: Update Tauri Configuration (if needed)

Your existing `src-tauri/tauri.conf.json` should work fine with Firebase since it makes HTTPS requests. Ensure you have these permissions:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [ /* ... */ ],
    "resources": [
      "resources/automotive-store-server.jar",
      "resources/jre.zip"
    ]
  },
  // Add these permissions if making direct Firebase calls from Tauri
  "tauri": {
    "permissions": [
      "http:https://firestore.googleapis.com",
      "http:https://identitytoolkit.googleapis.com",
      "http:https://securetoken.google.com"
    ]
  }
}
```

## Step 6: Firestore Security Rules

Create appropriate security rules in Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Licenses collection - users can only read/write their own license
    match /licenses/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin can read all (optional)
    match /admin/{document=**} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
  }
}
```

## Step 7: Environment Variables (Recommended)

For better security, use environment variables for Firebase config:

1. Create `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. Update `src/lib/firebase.ts`:
   ```typescript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID
   };
   ```

## First-Time Setup Instructions

1. **Create Firebase project** and web app
2. **Copy config** to `src/lib/firebase.ts` (or use env vars)
3. **Run the app**: `npm run dev`
4. **Create first admin account**:
   - Go to `/register` page (or create one)
   - Use email: `admin@autostore.com`
   - Use password: `A!utoS3cure2026#Admin` (or your preferred secure password)
   - Fill in username and role (ADMIN)
5. **After first login**, immediately change password in profile settings
6. **Activate license** through the UI using your license key
7. **Deploy**: Use existing MSI or rebuild after resolving Windows SDK issue

## Troubleshooting

### If you encounter CORS issues:
1. Ensure your Firebase project allows requests from your domain
2. For local development, Firebase emulator suite can help
3. Check Firebase console → Project Settings → General → Your apps → [your web app]

### If authentication fails:
1. Verify email/password correctness
2. Check Firebase Authentication → Users in console
3. Ensure email/password provider is enabled (Authentication → Sign-in method)

### If Firestore permissions fail:
1. Check Firestore Rules in console
2. Use Rules Playground to test scenarios
3. Ensure user is authenticated before making Firestore calls

## Alternative: Backend-First Firebase Integration

If you prefer to keep your Java backend as the authority:

1. Keep `automotive-store-server.jar` running
2. Add Firebase Admin SDK to your Java backend
3. Modify backend to verify Firebase ID tokens
4. Have Tauri app get Firebase ID token and send to backend for validation
5. Backend then responds with license/auth data

This approach requires less frontend change but involves modifying your Java code.

## Files Modified Summary

**NEW FILE:**
- `src/lib/firebase.ts` - Firebase initialization and helpers

**MODIFIED FILES:**
- `src/stores/auth.tsx` - Complete replacement with Firebase Auth
- `src/stores/license.ts` - Complete replacement with Firestore license management

**OPTIONAL MODIFICATIONS:**
- `src/lib/api.ts` - If making direct HTTP calls to backend
- `src-tauri/tauri.conf.json` - If needing additional permissions for Firebase calls

## Security Checklist

Before deploying to production:
- [ ] Change default admin password
- [ ] Enable email/password provider in Firebase Auth
- [ ] Configure Firestore security rules appropriately
- [ ] Consider adding reCAPTCHA to registration/login
- [ ] Set up Firebase Authentication email verification
- [ ] Monitor Firebase usage and set up billing alerts
- [ ] Consider implementing rate limiting on auth endpoints
- [ ] Review Firebase App Check for abuse protection