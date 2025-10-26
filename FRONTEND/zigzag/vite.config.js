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
          theme_color: '#2d6a4f',
          background_color: '#2d6a4f',
          icons: [
            {
              src: '/icon-1024.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-1024.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon-1024.png',
              sizes: '1024x1024',
              type: 'image/png',
            },
          ],
        },
      }),
  ],
});
