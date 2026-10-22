import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// BASE_PATH is set by the GitHub Pages workflow (e.g. /cv-portfolio-msd/).
// Locally the site runs at the root.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [vue()],
  // three.js is one big chunk; that's expected
  build: { chunkSizeWarningLimit: 800 },
})
