import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // ✅ Ne pas cacher les chunks JS dans le Service Worker
        navigateFallbackDenylist: [/^\/.*\.js$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.js$/, // Chunks JS externes
            handler: 'NetworkFirst', // Toujours chercher en réseau d'abord
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 jour max
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});