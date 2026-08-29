import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase config – env vars override hardcoded defaults (for Vite + Tauri)
// Hardcoded values are the production project (automotive-aswan-project) so the MSI works without .env
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || "AIzaSyBMD4u2wE7GEfoG4macWvaVBwBwkELZ85Q",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || "automotive-aswan-project.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || "automotive-aswan-project",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || "automotive-aswan-project.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || "482203558567",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || "1:482203558567:web:faa721c8227368f3f2b182",
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);