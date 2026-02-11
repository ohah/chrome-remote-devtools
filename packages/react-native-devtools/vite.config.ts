import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/mainview',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/mainview'),
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    port: 2420,
    strictPort: true,
    // Allow clipboard in document and iframes (Metro DevTools Copy object) / 이 문서·iframe에서 클립보드 허용
    headers: {
      'Permissions-Policy': 'clipboard-read=(*), clipboard-write=(*)',
    },
  },
  preview: {
    headers: {
      'Permissions-Policy': 'clipboard-read=(*), clipboard-write=(*)',
    },
  },
});
