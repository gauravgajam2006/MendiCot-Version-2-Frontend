import type { FirebaseOptions } from 'firebase/app';
export const FIREBASE_ENV_KEYS = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_VAPID_KEY'] as const;
type FirebaseEnvironment = Partial<Record<(typeof FIREBASE_ENV_KEYS)[number], string | undefined>>;
export interface FirebaseClientConfig { firebase: FirebaseOptions; vapidKey: string; }
export type FirebaseConfigResult = { status: 'configured'; config: FirebaseClientConfig } | { status: 'unavailable'; missing: string[] };
function clean(value: string | undefined): string { return value?.trim() ?? ''; }
export function readFirebaseConfig(environment: FirebaseEnvironment = import.meta.env): FirebaseConfigResult {
  const values = Object.fromEntries(FIREBASE_ENV_KEYS.map((key) => [key, clean(environment[key])]));
  const missing = FIREBASE_ENV_KEYS.filter((key) => !values[key]);
  if (missing.length) return { status: 'unavailable', missing: [...missing] };
  return { status: 'configured', config: { firebase: { apiKey: values.VITE_FIREBASE_API_KEY, authDomain: values.VITE_FIREBASE_AUTH_DOMAIN, projectId: values.VITE_FIREBASE_PROJECT_ID, storageBucket: values.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: values.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: values.VITE_FIREBASE_APP_ID }, vapidKey: values.VITE_FIREBASE_VAPID_KEY } };
}

