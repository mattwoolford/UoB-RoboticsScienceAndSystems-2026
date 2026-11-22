import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Keep browser requests same-origin; the local bridge owns Python and WiFi I/O.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${loadEnv(mode, '.', 'DASHBOARD_API_PORT').DASHBOARD_API_PORT || 8765}`,
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8765' },
  },
}));
