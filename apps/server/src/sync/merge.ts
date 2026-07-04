import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { logEntries, settings } from '../db/schema';
import type { PushEntry, PushSetting } from './validation';

export const PULL_LIMIT = 500;

export interface PullEntry {
  id: string;
  ts: number;
  day: string;
  tracker: string;
  source: string;
  kind: string;
  payload: unknown;
  deleted: boolean;
  updatedAt: number;
}

export interface PullSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface SyncResult {
  cursor: number;
  entries: PullEntry[];
  settings: PullSetting[];
  hasMore: boolean;
}

// Upsert each entry LWW: insert with a fresh server_seq (column default
// nextval('sync_seq')); on (user_id, id) conflict, overwrite and bump server_seq
// only when the incoming updated_at is strictly greater. A stale push does not
// change the stored row or its cursor position.
export async function pushEntries(
  db: PgDatabase<any, any>,
  userId: string,
  entries: PushEntry[],
): Promise<void> {
  for (const e of entries) {
    await db
      .insert(logEntries)
      .values({
        id: e.id,
        userId,
        ts: e.ts,
        day: e.day,
        tracker: e.tracker,
        source: e.source,
        kind: e.kind,
        payload: e.payload,
        deleted: e.deleted,
        updatedAt: e.updatedAt,
        // server_seq omitted: the column default nextval('sync_seq') assigns it
      })
      .onConflictDoUpdate({
        target: [logEntries.userId, logEntries.id],
        set: {
          ts: sql`excluded.ts`,
          day: sql`excluded.day`,
          tracker: sql`excluded.tracker`,
          source: sql`excluded.source`,
          kind: sql`excluded.kind`,
          payload: sql`excluded.payload`,
          deleted: sql`excluded.deleted`,
          updatedAt: sql`excluded.updated_at`,
          serverSeq: sql`nextval('sync_seq')`,
        },
        setWhere: sql`excluded.updated_at > ${logEntries.updatedAt}`,
      });
  }
}

export async function pushSettings(
  db: PgDatabase<any, any>,
  userId: string,
  items: PushSetting[],
): Promise<void> {
  for (const s of items) {
    await db
      .insert(settings)
      .values({
        userId,
        key: s.key,
        value: s.value,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: {
          value: sql`excluded.value`,
          updatedAt: sql`excluded.updated_at`,
          serverSeq: sql`nextval('sync_seq')`,
        },
        setWhere: sql`excluded.updated_at > ${settings.updatedAt}`,
      });
  }
}

// Pull rows with server_seq > cursor from both streams, ordered by seq, capped
// at `limit` each. The new cursor never advances past an unreturned row: if
// neither stream truncated, it is the max returned seq (or the input cursor when
// nothing was returned); if a stream truncated, it is the minimum over truncated
// streams of that stream's greatest returned seq, and hasMore is true.
export async function pullChanges(
  db: PgDatabase<any, any>,
  userId: string,
  cursor: number,
  limit = PULL_LIMIT,
): Promise<SyncResult> {
  const entryRows = await db
    .select()
    .from(logEntries)
    .where(and(eq(logEntries.userId, userId), gt(logEntries.serverSeq, cursor)))
    .orderBy(asc(logEntries.serverSeq))
    .limit(limit);

  const settingRows = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), gt(settings.serverSeq, cursor)))
    .orderBy(asc(settings.serverSeq))
    .limit(limit);

  const truncatedGreatest: number[] = [];
  if (entryRows.length === limit) truncatedGreatest.push(entryRows[entryRows.length - 1]!.serverSeq);
  if (settingRows.length === limit)
    truncatedGreatest.push(settingRows[settingRows.length - 1]!.serverSeq);

  let newCursor: number;
  let hasMore: boolean;
  if (truncatedGreatest.length === 0) {
    const seqs = [
      ...entryRows.map((r) => r.serverSeq),
      ...settingRows.map((r) => r.serverSeq),
    ];
    newCursor = seqs.length > 0 ? Math.max(...seqs) : cursor;
    hasMore = false;
  } else {
    newCursor = Math.min(...truncatedGreatest);
    hasMore = true;
  }

  return {
    cursor: newCursor,
    entries: entryRows.map((r) => ({
      id: r.id,
      ts: r.ts,
      day: r.day,
      tracker: r.tracker,
      source: r.source,
      kind: r.kind,
      payload: r.payload,
      deleted: r.deleted,
      updatedAt: r.updatedAt,
    })),
    settings: settingRows.map((r) => ({
      key: r.key,
      value: r.value,
      updatedAt: r.updatedAt,
    })),
    hasMore,
  };
}
