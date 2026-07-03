import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LogData, LogSource, TrackerId } from '@streka/core';

// Auth columns (sessions/tokens) are fleshed out in S2; S1 needs the table so
// log_entries.user_id has a foreign key to point at.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors packages/core/src/schema.ts log_entries. Deltas from the SQLite table:
// per-user (user_id), jsonb payload, boolean deleted, and no local-only synced_at.
export const logEntries = pgTable(
  'log_entries',
  {
    id: text('id').primaryKey(), // client-generated UUID, stored verbatim
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ts: bigint('ts', { mode: 'number' }).notNull(),
    day: date('day').notNull(), // YYYY-MM-DD
    tracker: text('tracker').$type<TrackerId>().notNull(),
    source: text('source').$type<LogSource>().notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').$type<LogData>().notNull(),
    deleted: boolean('deleted').notNull().default(false),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(), // LWW in S3
  },
  (t) => [
    index('idx_log_entries_user_day').on(t.userId, t.day),
    index('idx_log_entries_user_updated').on(t.userId, t.updatedAt),
  ],
);

// Mirrors core kv (per-user settings, LWW on updated_at).
export const settings = pgTable(
  'settings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
