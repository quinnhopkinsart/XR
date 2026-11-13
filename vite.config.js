import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Writes /build.json with the commit this build came from. The dashboard at /admin
// polls it after publishing to tell when an edit is live. Amplify sets AWS_COMMIT_ID.
const buildStamp = () => ({
  name: 'build-stamp',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'build.json',
      source: JSON.stringify({
        commit: process.env.AWS_COMMIT_ID || null,
        builtAt: new Date().toISOString(),
      }),
    });
  },
});

export default defineConfig({
  plugins: [react(), buildStamp()],
  server: {
    // Phones on the same Wi-Fi can reach the dev server. Camera access still
    // needs HTTPS on a phone, so test AR on a deployed preview branch.
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
