
// remote-auth-system/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remoteAuth',
      filename: 'remoteEntry.js',
      exposes: {
        './AuthApp': './src/AuthApp.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  server: {
    port: 5001,
       cors: {
       origin: 'https://host-ticket-system.chervicaon.com',
       credentials: true
     }
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
  },
});