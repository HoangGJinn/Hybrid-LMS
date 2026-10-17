import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
      '@core': `${import.meta.dirname}/src/core`,
      '@shared': `${import.meta.dirname}/src/shared`,
      '@features': `${import.meta.dirname}/src/features`,
    },
  },
  server: {
    port: 3000,
  },
})
