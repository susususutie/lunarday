import { defineConfig } from 'vite-plus';

export default defineConfig({
  base: '/lunarday/',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
  },
  server: {
    port: 3000,
  },
  pack: {
    entry: ['bin/cli.js'],
    format: ['esm'],
    platform: 'node',
    outDir: 'dist',
  },
});
