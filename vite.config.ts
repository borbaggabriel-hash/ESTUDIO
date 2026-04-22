import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'copy-static-files',
        writeBundle() {
          // Copiar firebase-applet-config.json para dist
          const source = path.resolve(__dirname, 'firebase-applet-config.json');
          const dest = path.resolve(__dirname, 'dist', 'firebase-applet-config.json');
          if (existsSync(source)) {
            copyFileSync(source, dest);
            console.log('✓ Copied firebase-applet-config.json to dist');
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
