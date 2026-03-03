import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_API_URL || 'http://localhost:5000'

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'UrbanSlot',
          short_name: 'UrbanSlot',
          description: 'Premium P2P parking marketplace. Book verified parking spots near you instantly or earn money listing your space.',
          theme_color: '#2563EB',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
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
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
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

    server: {
      proxy: {
        '/api': {
          target: BACKEND,
          changeOrigin: true,
        },
        '/socket.io': {
          target: BACKEND,
          ws: true,
          changeOrigin: true,
        },
      },
    },

    build: {
      // Use Rollup's terser for better minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,   // strip all console.logs in production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
      },

      // Split into smaller cacheable chunks
      rollupOptions: {
        output: {
          manualChunks: {
            // React core — stable, cache forever
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Framer Motion — heavy, separate chunk
            'vendor-motion': ['framer-motion'],
            // Recharts — only needed on dashboard
            'vendor-charts': ['recharts'],
            // Lucide icons
            'vendor-icons': ['lucide-react'],
            // Socket.io client
            'vendor-socket': ['socket.io-client'],
            // Toast notifications
            'vendor-toast': ['react-hot-toast'],
            // Zustand state
            'vendor-store': ['zustand'],
          },
          // Content-hash filenames for long-term caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },

      // Inline small assets (< 4KB) as base64
      assetsInlineLimit: 4096,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Generate source maps only in staging, not prod
      sourcemap: mode === 'staging',
      // Warn on chunks over 500 KB
      chunkSizeWarningLimit: 500,
    },
  }
})
