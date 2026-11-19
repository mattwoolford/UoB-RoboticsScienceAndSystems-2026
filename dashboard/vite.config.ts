import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep browser requests same-origin; the local bridge owns Python and WiFi I/O.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8765' },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8765' },
  },
});
