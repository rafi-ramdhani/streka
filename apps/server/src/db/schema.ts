import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Auth columns (sessions/tokens) are fleshed out in S2; S1 needs the table so
// log_entries.user_id has a foreign key to point at.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Opaque server-side sessions. Server-only: this table is NOT mirrored to the
// mobile SQLite schema. Only the SHA-256 hash of the token is stored.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_sessions_user').on(t.userId)],
);

// Server-assigned monotonic sync cursor source. Every accepted write in S3
// stamps a row's server_seq from nextval('sync_seq'); pull returns rows whose
// server_seq is greater than the client's stored cursor. Immune to clock skew.
export const syncSeq = pgSequence('sync_seq');

// Mirrors packages/core/src/schema.ts log_entries. Deltas from the SQLite table:
// per-user (user_id), jsonb payload, boolean deleted, no local-only synced_at,
// and the S3 server_seq sync cursor. Payload/tracker/source are stored opaquely
// (no domain brands): the server never enumerates trackers or validates payload
// shape, so new client types need no server deploy.
export const logEntries = pgTable(
  'log_entries',
  {
    id: text('id').notNull(), // client-generated UUID, stored verbatim
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ts: bigint('ts', { mode: 'number' }).notNull(),
    day: date('day').notNull(), // YYYY-MM-DD
    tracker: text('tracker').notNull(),
    source: text('source').notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    deleted: boolean('deleted').notNull().default(false),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(), // LWW key
    serverSeq: bigint('server_seq', { mode: 'number' })
      .notNull()
      .default(sql`nextval('sync_seq')`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('idx_log_entries_user_day').on(t.userId, t.day),
    index('idx_log_entries_user_seq').on(t.userId, t.serverSeq),
  ],
);

// Mirrors core kv (per-user settings, LWW on updated_at). server_seq shares the
// same sync_seq sequence as log_entries, so one cursor covers both streams.
export const settings = pgTable(
  'settings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    serverSeq: bigint('server_seq', { mode: 'number' })
      .notNull()
      .default(sql`nextval('sync_seq')`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.key] }),
    index('idx_settings_user_seq').on(t.userId, t.serverSeq),
  ],
);
