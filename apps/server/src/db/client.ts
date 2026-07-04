import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

// The app injects a db typed at this common base so the same code runs against
// postgres.js (dev/prod) and pglite (tests). Fixing the schema generic to
// `typeof schema` (not `any`) keeps `db.query` relational inference working.
export type AppDb = PgDatabase<any, typeof schema>;

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}
