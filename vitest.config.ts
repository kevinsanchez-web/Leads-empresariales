import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Las reglas se prueban contra el emulador, que no admite pruebas en paralelo sobre la misma base.
    fileParallelism: false,
  },
});
