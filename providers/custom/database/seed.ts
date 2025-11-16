import { db } from '@/lib/db'
import { oauthClients, members } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Starting database seeding...')

  try {
    // OAuth クライアント登録（公開クライアント - SPA/モバイルアプリ用）
    await db.insert(oauthClients).values({
      clientId: 'demo-app',
      clientSecret: null, // 公開クライアント
      name: 'Demo Public Client',
      redirectUri: 'http://localhost:3000/auth/callback',
      scope: 'openid profile email',
      isPublic: true,
    })

    // OAuth クライアント登録（機密クライアント - サーバーサイドアプリ用）
    await db.insert(oauthClients).values({
      clientId: 'web-app',
      clientSecret: await bcrypt.hash('client-secret-123', 12),
      name: 'Web Application Client',
      redirectUri: 'https://client-app.example.com/auth/callback',
      scope: 'openid profile email',
      isPublic: false,
    })

    // テストユーザー作成
    await db.insert(members).values([
      {
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'テストユーザー',
        emailVerified: true,
      },
      {
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        name: '管理者',
        emailVerified: true,
      },
      {
        email: 'demo@example.com',
        passwordHash: await bcrypt.hash('demo123', 12),
        name: 'デモユーザー',
        emailVerified: false,
      }
    ])

    console.log('✅ Database seeding completed successfully!')
    console.log('\n📋 Created test data:')
    console.log('   OAuth Clients:')
    console.log('   - demo-app (public client for SPA/mobile)')
    console.log('   - web-app (confidential client for server-side)')
    console.log('\n   Test Users:')
    console.log('   - test@example.com / password123')
    console.log('   - admin@example.com / admin123')
    console.log('   - demo@example.com / demo123')

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  seed().then(() => process.exit(0))
}

export { seed }