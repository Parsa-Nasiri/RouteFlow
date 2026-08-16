import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { routeflowApi } from './plugins/routeflow-api'

export default defineConfig({
  plugins: [react(), routeflowApi()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // bind all interfaces so localhost works for both IPv4 (127.0.0.1) and IPv6 (::1) browsers
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
