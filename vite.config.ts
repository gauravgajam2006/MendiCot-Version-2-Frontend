import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createFirebaseWorkerConfigArtifact, FIREBASE_WORKER_CONFIG_PATH } from './src/firebase/workerConfigArtifact.ts';

function firebaseMessagingWorkerConfig(): Plugin {
  let source = '';
  return {
    name: 'mendicot-firebase-messaging-worker-config',
    configResolved(config) {
      source = createFirebaseWorkerConfigArtifact(loadEnv(config.mode, config.envDir, 'VITE_FIREBASE_'), config.command === 'serve');
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (pathname !== FIREBASE_WORKER_CONFIG_PATH) return next();
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: FIREBASE_WORKER_CONFIG_PATH.slice(1), source });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), firebaseMessagingWorkerConfig()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
