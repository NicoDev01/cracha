import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Server modules import the `server-only` marker, which throws outside a
    // React Server Component. The package ships an empty build for exactly this.
    server: { deps: { inline: ['server-only'] } },
    // The Worker in workers/rag-api ships its own vitest project.
    // Component tests (*.test.tsx) opt into jsdom per file.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
})
