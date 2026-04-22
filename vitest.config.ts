import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'html'],
      include: ['src/**'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/**/*.d.ts',
        'src/types/**',
        'src/**/index.ts',
        'src/**/*.css',
      ],
      // 100% gate per global CLAUDE.md §5 and §7. `/* v8 ignore */` pragmas
      // are used sparingly in source for genuinely unreachable defensive
      // branches (e.g., `split().pop() ?? ''` where pop() never returns
      // undefined). Any new code must land with tests that keep this gate.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
