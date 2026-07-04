import { z } from 'zod';

// A single JSON value (never undefined). Settings values are arbitrary JSON,
// stored opaquely as jsonb; requiring one of these variants rejects a missing
// value while accepting null, primitives, objects, and arrays.
const jsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

// Structural envelope only. payload is required to be an object but is not
// deep-validated; tracker/source/kind are non-empty strings, never enumerated.
const pushEntrySchema = z.object({
  id: z.uuid(),
  ts: z.number().int(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tracker: z.string().min(1),
  source: z.string().min(1),
  kind: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  deleted: z.boolean(),
  updatedAt: z.number().int(),
});

const pushSettingSchema = z.object({
  key: z.string().min(1),
  value: jsonValueSchema,
  updatedAt: z.number().int(),
});

// cursor is a non-negative integer (0 on first sync). Batches are capped at 500
// per stream so a client bug is loud (400) rather than a giant transaction.
export const syncRequestSchema = z.object({
  cursor: z.number().int().nonnegative(),
  entries: z.array(pushEntrySchema).max(500).default([]),
  settings: z.array(pushSettingSchema).max(500).default([]),
});

export type PushEntry = z.infer<typeof pushEntrySchema>;
export type PushSetting = z.infer<typeof pushSettingSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
