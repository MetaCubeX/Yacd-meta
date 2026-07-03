import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'assets',
  build: {
    // sourcemap: true,
    // the default value is 'dist'
    // which make more sense
    // but change this may break other people's tools
    outDir: 'public',
  },
  plugins: [
    react(),
    VitePWA({
      srcDir: 'src',
      outDir: 'public',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      base: './',
      manifest: {
        icons: [
          {
            src: 'apple-touch-icon-precomposed.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
}));
