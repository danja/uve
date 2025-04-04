import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  root: './', // Use project root
  publicDir: 'public'
});