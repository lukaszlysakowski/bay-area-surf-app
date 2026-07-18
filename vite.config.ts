import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env (incl. non-VITE_ vars) so the WorldTides key stays server-side.
  const env = loadEnv(mode, process.cwd(), '')
  const worldTidesKey = env.WORLDTIDES_API_KEY ?? ''

  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ndbc': {
        target: 'https://www.ndbc.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ndbc/, ''),
      },
      '/api/coops': {
        target: 'https://api.tidesandcurrents.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coops/, ''),
      },
      '/api/worldtides': {
        target: 'https://www.worldtides.info',
        changeOrigin: true,
        // Strip the proxy prefix and append the API key from the server-side
        // env var, so the key is never present in client code or requests.
        rewrite: (path) => {
          const stripped = path.replace(/^\/api\/worldtides/, '')
          const sep = stripped.includes('?') ? '&' : '?'
          return `${stripped}${sep}key=${worldTidesKey}`
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query'
            }
            if (id.includes('leaflet')) {
              return 'map'
            }
          }
        },
      },
    },
  },
  }
})
