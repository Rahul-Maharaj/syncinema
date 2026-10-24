import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
});
