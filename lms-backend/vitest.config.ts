import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      // 'lcov' là định dạng SonarQube đọc được để hiển thị % coverage trên dashboard
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        // Các file sau không chứa logic nghiệp vụ — loại ra để tránh kéo tụt coverage ảo
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.entity.ts',
        'src/**/*.d.ts',
        'src/**/migrations/**',
      ],
      // Vitest sẽ báo lỗi (exit code 1) nếu coverage dưới 70% — đúng yêu cầu rubric
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
