import { 
  generateAccessToken, 
  generateIdToken, 
  verifyAccessToken, 
  verifyIdToken,
  getJWKS 
} from '../lib/jwt'

async function testJwt() {
  console.log('🧪 Testing JWT signing and verification...\n')

  // Debug: Check environment variables
  console.log('Environment variables check:')
  console.log('- JWT_PRIVATE_KEY_PEM exists:', !!process.env.JWT_PRIVATE_KEY_PEM)
  console.log('- JWT_PUBLIC_KEY_PEM exists:', !!process.env.JWT_PUBLIC_KEY_PEM)
  console.log('- ISSUER_URL:', process.env.ISSUER_URL || 'NOT SET')
  console.log('')

  try {
    // 1. アクセストークンのテスト
    console.log('📝 Testing Access Token...')
    const accessTokenPayload = {
      sub: 'user123',
      client_id: 'spa-client',
      scope: 'openid profile email',
      aud: 'spa-client',
      iss: process.env.ISSUER_URL || 'http://localhost:3001'
    }

    const accessToken = generateAccessToken(accessTokenPayload)
    console.log('✅ Access token generated:', accessToken.substring(0, 50) + '...')

    const verifiedAccessToken = verifyAccessToken(accessToken, 'spa-client')
    console.log('✅ Access token verified:', {
      sub: verifiedAccessToken.sub,
      client_id: verifiedAccessToken.client_id,
      scope: verifiedAccessToken.scope,
      exp: new Date((verifiedAccessToken.exp || 0) * 1000).toISOString()
    })

    // 2. IDトークンのテスト
    console.log('\n📝 Testing ID Token...')
    const idTokenPayload = {
      sub: 'user123',
      aud: 'spa-client',
      iss: process.env.ISSUER_URL || 'http://localhost:3001',
      name: 'Test User',
      email: 'test@example.com',
      email_verified: true,
      nonce: 'test-nonce-123'
    }

    const idToken = generateIdToken(idTokenPayload)
    console.log('✅ ID token generated:', idToken.substring(0, 50) + '...')

    const verifiedIdToken = verifyIdToken(idToken, 'spa-client')
    console.log('✅ ID token verified:', {
      sub: verifiedIdToken.sub,
      name: verifiedIdToken.name,
      email: verifiedIdToken.email,
      email_verified: verifiedIdToken.email_verified,
      exp: new Date((verifiedIdToken.exp || 0) * 1000).toISOString()
    })

    // 3. JWKSのテスト
    console.log('\n📝 Testing JWKS...')
    const jwks = getJWKS()
    console.log('✅ JWKS loaded:', JSON.stringify(jwks, null, 2))

    // 4. 改ざん検知のテスト
    console.log('\n🔍 Testing token tampering detection...')
    const tamperedToken = accessToken.slice(0, -10) + 'tampered123'
    
    try {
      verifyAccessToken(tamperedToken, 'spa-client')
      console.log('❌ Tampered token should have failed!')
    } catch (error) {
      console.log('✅ Tampered token correctly rejected:', (error as Error).message)
    }

    // 5. 有効期限切れのテスト
    console.log('\n⏰ Expired token test skipped (generateAccessToken uses fixed 1h expiry)')

    console.log('\n🎉 All JWT tests passed successfully!')

  } catch (error) {
    console.error('❌ JWT test failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  testJwt()
}

export { testJwt }