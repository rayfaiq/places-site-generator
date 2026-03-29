import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import dotenvConfig from 'dotenv/config';

// Load environment variables for development
dotenv.config({ path: '.env.local' });

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  // Get API URL from environment or use Vercel production URL
  const apiBaseUrl = isProduction
    ? process.env.NEXT_PUBLIC_API_URL || 'https://generate-place-site.vercel.app'
    : 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api/generate': {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: false,
        },
      },
    },
  };
});