// Lightweight Firebase client initializer. Requires environment variables to be set.
// Install Firebase: `npm install firebase`
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, sendPasswordResetEmail as _sendPasswordResetEmail } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let auth = null
let enabled = true

function hasRequiredConfig(cfg) {
  return cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId
}

if (!hasRequiredConfig(firebaseConfig)) {
  console.warn('Firebase config missing. Firebase features disabled.')
  enabled = false
} else {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    auth = getAuth(app)
  } catch (e) {
    console.error('Failed to initialize Firebase:', e && e.message ? e.message : e)
    enabled = false
    app = null
    auth = null
  }
}

export { app as firebaseApp }
export { auth as firebaseAuth }

// Helper: safe wrapper to send password reset email
export async function sendPasswordReset(email) {
  if (!enabled || !auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env vars.')
  }
  try {
    // Build a continue URL for the action email. Prefer Vite env, fallback to current origin.
    const continueUrl = (import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' && window.location.origin) || '') + '/login'
    const actionCodeSettings = {}
    if (continueUrl) {
      actionCodeSettings.url = continueUrl
      actionCodeSettings.handleCodeInApp = false
    }
    return _sendPasswordResetEmail(auth, email, Object.keys(actionCodeSettings).length ? actionCodeSettings : undefined)
  } catch (err) {
    // Re-throw with clearer guidance for common issues
    const code = err && err.code ? err.code : null
    if (code === 'auth/invalid-api-key' || code === 'auth/network-request-failed') {
      throw new Error('Firebase network or API key error: ' + (err.message || code))
    }
    if (code === 'auth/user-not-found') {
      throw new Error('No Firebase user found with that email (auth/user-not-found).')
    }
    throw err
  }
}

export default { enabled }
