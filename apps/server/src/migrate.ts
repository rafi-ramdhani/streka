import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Standalone migration runner. `start` runs `node dist/migrate.js` before the
// server so production applies pending migrations without the drizzle-kit CLI
// (which is a devDependency and not in the dist). The drizzle/ folder is copied
// next to this file at build time, so it resolves relative to the module.
async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    const migrationsFolder = fileURLToPath(new URL('./drizzle', import.meta.url));
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

runMigrations(url)
  .then(() => {
    console.log('migrations applied');
    process.exit(0);
  })
  .catch((err) => {
    console.error('migration failed', err);
    process.exit(1);
  });
