import { defineConfig } from 'vite';
import { blokd } from 'blokd/vite';

export default defineConfig({
  plugins: [blokd()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        client: 'src/client.ts',
        'resume-test-controls': 'src/resume-test-controls.ts',
        'hydration-test-controls': 'src/hydration-test-controls.tsx'
      },
      output: {
        entryFileNames: chunk => chunk.name === 'client' ? 'assets/client.js' : 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
