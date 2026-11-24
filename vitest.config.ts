import { defineConfig } from 'vitest/config';

// Серверные тесты (server/) запускаются через Deno: deno test server/
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
