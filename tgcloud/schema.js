import { table, integer, text, boolean, json, index, uniqueIndex, sql } from 'sdk/db';

export const chats = table('chats', {
  id: text('id').primaryKey(),
  legacyId: text('legacy_id').unique(),
  section: text('section').notNull(),
  photo: text('photo'),
  name: text('name').notNull(),
  description: text('description'),
  link: text('link').notNull(),
  infoLink: text('info_link'),
  clicks: integer('clicks').notNull().default(0),
  label: text('label'),
  tags: json('tags'),
  report: text('report'),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  isNew: boolean('is_new').notNull().default(false),
  requesterId: integer('requester_id'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (t) => ({
  sectionIdx: index('idx_chats_section').on(t.section),
  activeIdx: index('idx_chats_active').on(t.active),
  requesterIdx: index('idx_chats_requester').on(t.requesterId),
}));

export const adminUsers = table('admin_users', {
  telegramId: integer('telegram_id').primaryKey(),
  role: text('role').notNull().default('admin'),
  active: boolean('active').notNull().default(true),
  createdAt: text('created_at'),
});

export const users = table('users', {
  telegramId: integer('telegram_id').primaryKey(),
  firstName: text('first_name'),
  username: text('username'),
  languageCode: text('language_code'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at'),
  lastSeenAt: text('last_seen_at'),
});

export const botConfig = table('bot_config', {
  key: text('key').primaryKey(),
  value: json('value'),
  updatedAt: text('updated_at'),
});
