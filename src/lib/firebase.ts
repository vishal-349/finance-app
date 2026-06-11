import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const rawConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True only when every required Firebase env var is present. */
export const isFirebaseConfigured = Object.values(rawConfig).every(
  (v) => typeof v === "string" && v.length > 0,
);

// Fall back to non-empty placeholders when unconfigured so that getAuth() and
// initializeFirestore() don't throw synchronously at import time. The UI checks
// `isFirebaseConfigured` and never makes a real call until env vars are set.
const firebaseConfig = isFirebaseConfigured
  ? rawConfig
  : {
      apiKey: "placeholder-api-key",
      authDomain: "placeholder.firebaseapp.com",
      projectId: "placeholder",
      storageBucket: "placeholder.appspot.com",
      messagingSenderId: "0",
      appId: "1:0:web:placeholder",
    };

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore with offline persistence (multi-tab safe). This also makes derived
// totals fast — reads are served from the local cache and kept in sync live.
// `ignoreUndefinedProperties` means optional fields left `undefined` (e.g. a
// note that wasn't filled in) are dropped on write instead of throwing
// "Unsupported field value: undefined".
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
