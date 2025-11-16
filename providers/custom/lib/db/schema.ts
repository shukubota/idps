import { 
  bigint, 
  boolean, 
  index, 
  mysqlTable, 
  timestamp, 
  varchar 
} from 'drizzle-orm/mysql-core'

// Members table - ユーザー管理
export const members = mysqlTable('members', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  givenName: varchar('given_name', { length: 50 }),
  familyName: varchar('family_name', { length: 50 }),
  givenNameKana: varchar('given_name_kana', { length: 50 }),
  familyNameKana: varchar('family_name_kana', { length: 50 }),
  givenNameKanji: varchar('given_name_kanji', { length: 50 }),
  familyNameKanji: varchar('family_name_kanji', { length: 50 }),
  picture: varchar('picture', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  phoneVerified: boolean('phone_verified').default(false),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: index('idx_email').on(table.email),
  emailVerifiedIdx: index('idx_email_verified').on(table.emailVerified),
}))

// OAuth Clients table - クライアント管理
export const oauthClients = mysqlTable('oauth_clients', {
  clientId: varchar('client_id', { length: 255 }).primaryKey(),
  clientSecret: varchar('client_secret', { length: 255 }),
  name: varchar('name', { length: 100 }).notNull(),
  redirectUri: varchar('redirect_uri', { length: 500 }).notNull(),
  scope: varchar('scope', { length: 500 }).notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// NOTE: authorization_codes, refresh_tokens, user_sessions はRedisで管理
// - TTL自動expire機能
// - 高速アクセス
// - 一時的なデータに最適

// Type exports
export type Member = typeof members.$inferSelect
export type NewMember = typeof members.$inferInsert

export type OAuthClient = typeof oauthClients.$inferSelect
export type NewOAuthClient = typeof oauthClients.$inferInsert