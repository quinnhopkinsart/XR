import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
