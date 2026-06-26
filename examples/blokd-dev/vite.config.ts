import { defineConfig } from 'vite';
import { blokd } from 'blokd/vite';

export default defineConfig({
  plugins: [blokd()],
  build: {
    outDir: 'dist/worker',
    ssr: 'src/worker.ts',
    rollupOptions: {
      output: {
        entryFileNames: 'entry-worker.js',
        codeSplitting: false
      }
    }
  },
  ssr: {
    noExternal: ['blokd', 'hono']
  }
});
