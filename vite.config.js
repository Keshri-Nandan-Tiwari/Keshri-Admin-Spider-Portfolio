import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Production builds never ship source maps (they would expose your original source code).
  build: { sourcemap: false },
})
