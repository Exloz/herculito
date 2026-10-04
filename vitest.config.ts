import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    css: { include: [/src\/index\.css/] },
  },
});
