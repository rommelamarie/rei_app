import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env': JSON.stringify({}),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      port: 3000,
      host: true,
    },
  };
});
