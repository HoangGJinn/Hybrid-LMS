import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/router.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.types.ts',
      ],
      // Target threshold ≥ 70% for core modules (uncomment for CI check):
      // thresholds: {
      //   lines: 70,
      //   functions: 70,
      //   branches: 70,
      //   statements: 70,
      // },
    },
  },
})
