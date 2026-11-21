import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './' — относительные пути, чтобы сайт работал из подпапки GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
