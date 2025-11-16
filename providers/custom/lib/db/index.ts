import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// データベース接続設定
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3309,
  user: process.env.DB_USER || 'idp_user',
  password: process.env.DB_PASSWORD || 'idp_password',
  database: process.env.DB_NAME || 'custom_idp',
}

// MySQL接続プール作成
const poolConnection = mysql.createPool(connectionConfig)

// Drizzle ORM インスタンス
export const db = drizzle(poolConnection, { schema, mode: 'default' })

// 型エクスポート
export * from './schema'