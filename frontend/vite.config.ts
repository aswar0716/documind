import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev mode, Vite forwards any request to /api/* to the FastAPI backend.
    // This mirrors what Nginx does in the Docker setup, so the same BASE_URL
    // ("/api") works in both environments without any code changes.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
