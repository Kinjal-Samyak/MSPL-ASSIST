import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mspl/conversation-workflow': path.resolve(
        __dirname,
        '../packages/conversation-workflow/src/index.ts'
      ),
      '@mspl/shared-constants': path.resolve(
        __dirname,
        '../packages/shared-constants/src/index.ts'
      ),
      '@mspl/shared-validation': path.resolve(
        __dirname,
        '../packages/shared-validation/src/index.ts'
      ),
      '@mspl/shared-utils': path.resolve(__dirname, '../packages/shared-utils/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/themes': path.resolve(__dirname, './src/themes'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/rental-booking': {
        target: 'http://localhost:5158',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/rental-booking/, ''),
      },
      '/live-api': {
        target: 'https://msplapi.ridenimbo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (requestPath) => requestPath.replace(/^\/live-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
          });
        },
      },
    },
  },
});
