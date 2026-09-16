import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon-196.png', 'apple-icon-180.png'],
      manifest: {
        name: 'Herculito - Workout Tracker',
        short_name: 'Herculito',
        description: 'Track your workouts and exercise routines',
        id: '/',
        theme_color: '#111827',
        background_color: '#1f2937',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['health', 'fitness', 'sports'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: [
          'index.html',
          'bootstrap.css',
          'assets/**/*.{js,css}',
          'fonts/*.woff2',
          '*.{svg,webmanifest}',
          'favicon-196.png',
          'apple-icon-180.png',
          'manifest-icon-*.png'
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  }
});
