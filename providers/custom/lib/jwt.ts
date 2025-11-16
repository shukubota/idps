import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// JWT設定
const JWT_ISSUER = process.env.JWT_ISSUER || 'http://localhost:3001'
const JWT_ALGORITHM = 'RS256' as const

// キー取得関数（環境変数のみ）
function getPrivateKey(): crypto.KeyObject {
  const privateKeyPem = process.env.JWT_PRIVATE_KEY_PEM
  if (!privateKeyPem) {
    throw new Error('JWT_PRIVATE_KEY_PEM environment variable is required')
  }
  // 改行文字を実際の改行に変換
  const privateKey = privateKeyPem.replace(/\\n/g, '\n')
  return crypto.createPrivateKey(privateKey)
}

function getPublicKey(): crypto.KeyObject {
  const publicKeyPem = process.env.JWT_PUBLIC_KEY_PEM
  if (!publicKeyPem) {
    throw new Error('JWT_PUBLIC_KEY_PEM environment variable is required')
  }
  // 改行文字を実際の改行に変換
  const publicKey = publicKeyPem.replace(/\\n/g, '\n')
  return crypto.createPublicKey(publicKey)
}

function getKeyId(): string {
  const publicKey = getPublicKey()
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' })
  return crypto.createHash('sha256').update(publicKeyPem).digest('hex').substring(0, 16)
}

// アクセストークンペイロード
interface AccessTokenPayload {
  sub: string
  client_id: string
  scope: string
  iat?: number
  exp?: number
  iss?: string
  aud?: string
}

// IDトークンペイロード
interface IdTokenPayload {
  sub: string
  name?: string
  email?: string
  email_verified?: boolean
  iat?: number
  exp?: number
  iss?: string
  aud?: string
  nonce?: string
  auth_time?: number
}

// アクセストークン生成
export function signAccessToken(payload: {
  sub: string
  client_id: string
  scope: string
  audience?: string
  expiresIn?: string | number
}): string {
  const privateKey = getPrivateKey()
  const keyId = getKeyId()
  
  return jwt.sign(
    {
      sub: payload.sub,
      client_id: payload.client_id,
      scope: payload.scope
    },
    privateKey,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: payload.audience || payload.client_id,
      expiresIn: payload.expiresIn || '1h',
      header: {
        kid: keyId
      }
    } as jwt.SignOptions
  )
}

// IDトークン生成
export function generateIdToken(payload: {
  sub: string
  name?: string
  email?: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
  picture?: string
  phone_number?: string
  phone_number_verified?: boolean
  'given_name#ja-Kana-JP'?: string
  'given_name#ja-Hani-JP'?: string
  'family_name#ja-Kana-JP'?: string
  'family_name#ja-Hani-JP'?: string
  aud: string
  iss: string
  nonce?: string
}): string {
  const privateKey = getPrivateKey()
  const keyId = getKeyId()
  
  // Standard claims (sub, iss, aud, exp, iat) should be in options
  const { sub, aud, iss, nonce, ...userClaims } = payload
  
  return jwt.sign(
    { ...userClaims, nonce }, // Custom claims only
    privateKey,
    {
      algorithm: JWT_ALGORITHM,
      subject: sub,
      audience: aud,
      issuer: iss,
      expiresIn: '1h',
      header: {
        kid: keyId
      }
    } as jwt.SignOptions
  )
}

// アクセストークン生成
export function generateAccessToken(payload: {
  sub: string
  client_id: string
  scope: string
  aud: string
  iss: string
}): string {
  const privateKey = getPrivateKey()
  const keyId = getKeyId()
  
  // Standard claims (sub, iss, aud, exp, iat) should be in options
  const { sub, aud, iss, ...customClaims } = payload
  
  return jwt.sign(
    customClaims, // Custom claims only
    privateKey,
    {
      algorithm: JWT_ALGORITHM,
      subject: sub,
      audience: aud,
      issuer: iss,
      expiresIn: '1h',
      header: {
        kid: keyId
      }
    } as jwt.SignOptions
  )
}

// JWT検証
export function verifyJwt(token: string, audience?: string): AccessTokenPayload | IdTokenPayload {
  const publicKey = getPublicKey()
  
  try {
    return jwt.verify(token, publicKey, {
      issuer: JWT_ISSUER,
      audience: audience,
      algorithms: [JWT_ALGORITHM]
    }) as AccessTokenPayload | IdTokenPayload
  } catch (error) {
    throw new Error(`JWT verification failed: ${error}`)
  }
}

// アクセストークン検証（特化版）
export function verifyAccessToken(token: string, expectedClientId?: string): AccessTokenPayload {
  const payload = verifyJwt(token, expectedClientId) as AccessTokenPayload
  
  // 必要なクレームの存在確認
  if (!payload.sub || !payload.client_id || !payload.scope) {
    throw new Error('Invalid access token: missing required claims')
  }
  
  return payload
}

// IDトークン検証（特化版）
export function verifyIdToken(token: string, expectedAudience: string, expectedNonce?: string): IdTokenPayload {
  const payload = verifyJwt(token, expectedAudience) as IdTokenPayload
  
  // nonceの検証
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('Invalid ID token: nonce mismatch')
  }
  
  return payload
}

// JWKS取得
export function getJWKS(): object {
  const publicKey = getPublicKey()
  const keyId = getKeyId()
  
  // RSA公開鍵をJWK形式に変換
  const publicKeyJwk = publicKey.export({ format: 'jwk' }) as any
  
  return {
    keys: [
      {
        kty: publicKeyJwk.kty,
        use: 'sig',
        kid: keyId,
        alg: 'RS256',
        n: publicKeyJwk.n,
        e: publicKeyJwk.e
      }
    ]
  }
}

// JWTデバッグ用（開発環境のみ）
export function decodeJwtHeader(token: string): unknown {
  return jwt.decode(token, { complete: true })?.header
}

export function decodeJwtPayload(token: string): unknown {
  return jwt.decode(token)
}