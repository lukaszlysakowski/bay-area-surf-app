import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
    },
  },
})
