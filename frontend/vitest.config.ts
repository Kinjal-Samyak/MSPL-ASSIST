import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      css: false,
      // tests/conversation.workflow.test.mjs runs under Node's own `--test` runner (see the
      // separate "test:workflow" script) - it is not a Vitest spec and fails under Vitest's
      // module loader.
      exclude: ['**/node_modules/**', 'tests/**'],
    },
  })
);
