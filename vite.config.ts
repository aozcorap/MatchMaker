import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  base: './',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
  test: { include: ['src/**/*.test.ts'] },
}));
