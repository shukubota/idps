import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3309,
    user: process.env.DB_USER || 'idp_user',
    password: process.env.DB_PASSWORD || 'idp_password',
    database: process.env.DB_NAME || 'custom_idp',
  },
} satisfies Config