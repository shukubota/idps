import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

async function generateKeys() {
  console.log('🔐 Generating RSA key pair for JWT signing...')

  try {
    // RSA鍵ペア生成（2048bit）
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    // keysディレクトリを作成
    const keysDir = path.join(process.cwd(), 'keys')
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true })
    }

    // 秘密鍵を保存
    const privateKeyPath = path.join(keysDir, 'private.pem')
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }) // 所有者のみ読み取り可能

    // 公開鍵を保存
    const publicKeyPath = path.join(keysDir, 'public.pem')
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 }) // 一般的な読み取り権限

    // JWK (JSON Web Key) 形式での公開鍵も生成
    const publicKeyObject = crypto.createPublicKey(publicKey)
    const jwk = publicKeyObject.export({ format: 'jwk' })
    
    // kid (key ID) を生成
    const kid = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16)
    
    const publicJwk = {
      ...jwk,
      kid,
      alg: 'RS256',
      use: 'sig',
      key_ops: ['verify']
    }

    // JWK形式で保存
    const jwkPath = path.join(keysDir, 'public.jwk.json')
    fs.writeFileSync(jwkPath, JSON.stringify(publicJwk, null, 2))

    // JWKS (JSON Web Key Set) 形式も生成
    const jwks = {
      keys: [publicJwk]
    }
    
    const jwksPath = path.join(keysDir, 'jwks.json')
    fs.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2))

    console.log('✅ RSA key pair generated successfully!')
    console.log(`📁 Private key: ${privateKeyPath}`)
    console.log(`📁 Public key: ${publicKeyPath}`)
    console.log(`📁 JWK: ${jwkPath}`)
    console.log(`📁 JWKS: ${jwksPath}`)
    console.log(`🔑 Key ID: ${kid}`)
    
    console.log('\n⚠️  Security Notes:')
    console.log('- Private key is restricted to owner read-only (600)')
    console.log('- Never commit private keys to version control')
    console.log('- Use environment variables in production')

  } catch (error) {
    console.error('❌ Failed to generate keys:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  generateKeys()
}

export { generateKeys }