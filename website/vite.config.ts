import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname),
  resolve: {
    alias: [
      {
        find: '@nipe-solutions/react-pull-to-refresh/core.css',
        replacement: resolve(import.meta.dirname, '../src/core.css'),
      },
      {
        find: /^@nipe-solutions\/react-pull-to-refresh$/,
        replacement: resolve(import.meta.dirname, '../src/index.ts'),
      },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
