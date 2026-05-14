import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://my-project-backend-production-cec6.up.railway.app',
        changeOrigin: true
      },
    },
  },
});