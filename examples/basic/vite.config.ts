import { defineConfig } from 'vite';
import { blokd } from 'blokd/vite';

export default defineConfig({
  plugins: [blokd()],
  build: {
    outDir: 'dist/server',
    ssr: 'src/server.ts',
    rollupOptions: {
      output: { entryFileNames: 'entry-server.js' }
    }
  },
  ssr: {
    noExternal: ['blokd']
  }
});
