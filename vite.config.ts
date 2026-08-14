import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const getVendorChunk = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/')

  if (normalizedId.includes('/node_modules/@zxing/')) return 'scanner'
  if (normalizedId.includes('/node_modules/xlsx/')) return 'spreadsheet'
  if (normalizedId.includes('/node_modules/jspdf')) return 'pdf'
  if (normalizedId.includes('/node_modules/firebase/') || normalizedId.includes('/node_modules/@firebase/')) return 'firebase'
  if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase'
  if (normalizedId.includes('/node_modules/recharts/')) return 'charts'
  if (normalizedId.includes('/node_modules/date-fns/')) return 'dates'
  if (normalizedId.includes('/node_modules/idb/')) return 'storage'
  if (
    normalizedId.includes('/node_modules/react/') ||
    normalizedId.includes('/node_modules/react-dom/') ||
    normalizedId.includes('/node_modules/react-hook-form/') ||
    normalizedId.includes('/node_modules/@hookform/') ||
    normalizedId.includes('/node_modules/zod/')
  ) return 'react'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'inline',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PedidosYa - Control de Vencimientos',
        short_name: 'Vencimientos PY',
        description: 'Aplicación para control de vencimiento de productos en heladeras y freezers de PedidosYa',
        theme_color: '#FF1744',
        background_color: '#F8F9FA',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // Increase cache limit to 5MB for large offline libraries (xlsx, jspdf, zxing)
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks: getVendorChunk
      }
    }
  }
})
