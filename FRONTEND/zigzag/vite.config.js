// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
      },
      manifest: {
        name: 'ZigZag',
        short_name: 'ZigZag',
        description: 'A map-based application',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/metallic_zigzag_logo_simple.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/metallic_zigzag_logo_simple.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});
