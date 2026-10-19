import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'DEATHLINE_');
  const proxy = {
    '/api': {
      target: env.DEATHLINE_API_TARGET || 'http://127.0.0.1:8000',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };
  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { proxy },
  };
});
