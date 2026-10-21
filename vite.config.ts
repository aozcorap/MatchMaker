import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Dateien der Texterkennung für Screenshots; sie werden mit der Seite ausgeliefert, damit keine fremden Server nötig sind. */
const OCR_DATEIEN: [string, string][] = [
  ['ocr/worker.min.js', 'node_modules/tesseract.js/dist/worker.min.js'],
  ['ocr/tesseract-core-simd-lstm.wasm.js', 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'],
  ['ocr/deu.traineddata.gz', 'node_modules/@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz'],
];

function ocrDateien(): Plugin {
  return {
    name: 'ocr-dateien',
    generateBundle() {
      for (const [name, pfad] of OCR_DATEIEN) {
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(pfad) });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const treffer = OCR_DATEIEN.find(([name]) => req.url?.split('?')[0].endsWith(`/${name}`));
        if (!treffer) return next();
        res.setHeader('Content-Type', treffer[0].endsWith('.js') ? 'text/javascript' : 'application/gzip');
        res.end(readFileSync(treffer[1]));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react(), ocrDateien()],
  base: './',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
  test: { include: ['src/**/*.test.ts'] },
}));
