import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/accounts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/model': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/inspections': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/audit': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/simulate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})