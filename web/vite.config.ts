import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` makes the built asset paths relative, so the bundle works when
// GitHub Pages serves it from a subpath (e.g. /projection-follower/).
export default defineConfig({
  plugins: [react()],
  base: './',
  // A human-readable build stamp shown in Settings, so you can confirm an update
  // actually took effect after "Check for update".
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  server: {
    // In local dev with the real backend running, proxy /api to it so the app
    // hits your Express server. (Ignored on the static Pages build.)
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
