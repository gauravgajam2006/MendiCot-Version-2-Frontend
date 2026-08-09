export const FIREBASE_WORKER_CONFIG_PATH = '/firebase-messaging-sw-config.js';

const WORKER_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type WorkerFirebaseEnvironment = Partial<Record<(typeof WORKER_FIREBASE_ENV_KEYS)[number], string | undefined>>;

export function createFirebaseWorkerConfigArtifact(environment: WorkerFirebaseEnvironment, development: boolean): string {
  const values = Object.fromEntries(WORKER_FIREBASE_ENV_KEYS.map((key) => [key, environment[key]?.trim() ?? '']));
  const config = {
    apiKey: values.VITE_FIREBASE_API_KEY,
    projectId: values.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: values.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: values.VITE_FIREBASE_APP_ID,
  };
  return `self.__MENDICOT_FIREBASE_CONFIG__ = Object.freeze(${JSON.stringify(config)});\nself.__MENDICOT_DEV__ = ${JSON.stringify(development)};\n`;
}
