import fs from 'fs'
import path from 'path'

/**
 * 開発環境用: 生成された鍵ファイルを環境変数形式で表示
 * 本番環境では直接環境変数に設定すること
 */
async function loadKeysToEnv() {
  console.log('📋 Loading keys for environment variables...\n')

  try {
    // 鍵ファイルを読み込み
    const privateKeyPath = path.resolve('./keys/private.pem')
    const publicKeyPath = path.resolve('./keys/public.pem')
    const jwksPath = path.resolve('./keys/jwks.json')

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8')
    const jwks = fs.readFileSync(jwksPath, 'utf8')

    // 環境変数形式で出力
    console.log('Copy these to your .envrc file:\n')
    console.log('# JWT Keys (generated)')
    console.log(`export JWT_PRIVATE_KEY_PEM='${privateKey.replace(/\n/g, '\\n')}'`)
    console.log(`export JWT_PUBLIC_KEY_PEM='${publicKey.replace(/\n/g, '\\n')}'`)
    console.log(`export JWT_JWKS='${jwks.replace(/\n/g, '').replace(/\s+/g, ' ')}'`)

    console.log('\n📝 To apply these variables:')
    console.log('1. Copy the above export statements to your .envrc file')
    console.log('2. Run: direnv allow')
    console.log('3. Test: npm run jwt:test')

    console.log('\n⚠️  Security Notes:')
    console.log('- Never commit .envrc to version control')
    console.log('- Use secure environment variable management in production')
    console.log('- Consider using secrets management services (AWS Secrets Manager, etc.)')

  } catch (error) {
    console.error('❌ Failed to load keys:', error)
    console.log('\n💡 Make sure to generate keys first:')
    console.log('npm run keys:generate')
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  loadKeysToEnv()
}

export { loadKeysToEnv }