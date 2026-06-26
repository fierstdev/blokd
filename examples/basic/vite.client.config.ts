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
        'resume-test-controls': 'src/resume-test-controls.ts'
      },
      output: {
        entryFileNames: chunk => chunk.name === 'client' ? 'assets/client.js' : 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
