import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev mode, Vite forwards any request to /api/* to the FastAPI backend.
    // This mirrors what Nginx does in the Docker setup, so the same BASE_URL
    // ("/api") works in both environments without any code changes.
    proxy: {
      // Forward /api/v1/* directly to FastAPI (no path rewriting needed).
      // The backend mounts all routes under /api/v1, so we proxy as-is.
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
