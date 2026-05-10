import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// `base: './'` keeps asset URLs relative so the same build works whether the
// app is served from the domain root, a GitHub Pages project subpath
// (`/<repo>/`), or `vite preview`. No need to know the repo name at build time.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy / rarely-changing deps into their own chunks so the
        // browser can fetch them in parallel and cache them across app
        // releases. Keeps app-code releases from busting vendor caches.
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          if (id.includes('/src/layouts/') && id.endsWith('.json')) return 'layouts';
        },
      },
    },
  },
});
