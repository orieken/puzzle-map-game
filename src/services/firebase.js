import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence, signInAnonymously } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !String(value).startsWith('your-'),
)

const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

if (db && import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

let authPromise = null

export async function ensureAnonymousUser() {
  if (!auth) throw new Error('Firebase is not configured.')
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser
  if (!authPromise) {
    authPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => signInAnonymously(auth))
      .then(({ user }) => user)
      .finally(() => { authPromise = null })
  }
  return authPromise
}
