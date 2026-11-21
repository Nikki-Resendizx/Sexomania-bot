import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { chats } from '../schema.js';

export default async function (input = {}) {
  const id = String(input.id || '').trim();
  if (!id) return { ok: false };
  await db.update(chats)
    .set({ clicks: sql`${chats.clicks} + 1` })
    .where(eq(chats.id, id))
    .run();
  return { ok: true };
}
