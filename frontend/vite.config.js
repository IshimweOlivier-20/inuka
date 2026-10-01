import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Send /api calls to the Express server so cookies and CORS just work in development.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
