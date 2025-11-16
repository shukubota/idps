import { 
  bigint, 
  boolean, 
  index, 
  json, 
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
  redirectUris: json('redirect_uris').$type<string[]>().notNull(),
  grantTypes: json('grant_types').$type<string[]>().notNull(),
  responseTypes: json('response_types').$type<string[]>().notNull(),
  scope: varchar('scope', { length: 500 }).notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// NOTE: authorization_codes と refresh_tokens はRedisで管理
// - 有効期限付きデータの自動削除
// - 高速アクセス
// - 一時的なデータに適している


// Type exports
export type Member = typeof members.$inferSelect
export type NewMember = typeof members.$inferInsert

export type OAuthClient = typeof oauthClients.$inferSelect
export type NewOAuthClient = typeof oauthClients.$inferInsert