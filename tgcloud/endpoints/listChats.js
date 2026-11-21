import { db } from 'sdk';
import { and, desc, eq } from 'sdk/db';
import { chats } from '../schema.js';

export default async function (input = {}) {
  const conditions = [eq(chats.active, true)];
  if (input.section) conditions.push(eq(chats.section, String(input.section)));
  const rows = await db.select().from(chats)
    .where(and(...conditions))
    .orderBy(desc(chats.createdAt))
    .limit(Math.min(Math.max(Number(input.limit) || 100, 1), 200))
    .all();

  return rows.map(row => ({
    id: row.id,
    seccion: row.section,
    foto: row.photo || '',
    nombre: row.name,
    desc: row.description || '',
    link: row.link,
    info: row.infoLink || '',
    clicks: row.clicks || 0,
    etiqueta: row.label || '',
    tags: row.tags || [],
    destacado: row.featured === true,
    activo: row.active !== false,
    nuevo: row.isNew === true,
  }));
}
