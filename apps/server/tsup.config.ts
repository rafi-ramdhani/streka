import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Ship the migration SQL next to the built files so dist/migrate.js resolves
  // ./drizzle at runtime. `clean` wipes dist first, so this runs after.
  onSuccess: 'cp -R drizzle dist/drizzle',
});
