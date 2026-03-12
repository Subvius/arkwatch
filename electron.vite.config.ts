import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, 'src/renderer/src')
      }
    }
  }
});
