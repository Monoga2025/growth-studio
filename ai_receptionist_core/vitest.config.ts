import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      sqlite: 'node:sqlite',
      'node:sqlite': 'node:sqlite',
    },
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    server: {
      deps: {
        external: ['node:sqlite', 'sqlite'],
      },
    },
    ssr: {
      external: ['node:sqlite', 'sqlite'],
    },
  },
});
