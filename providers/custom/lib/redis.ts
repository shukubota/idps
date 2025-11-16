import { Redis } from 'ioredis'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    })
  }
  return redis
}

export interface SessionData {
  memberId: number
  email: string
  name: string
  createdAt: number
}

export interface AuthCodeData {
  memberId: number
  clientId: string
  scope: string
  redirectUri: string
  codeChallenge?: string
  codeChallengeMethod?: string
  nonce?: string
  state?: string
}

export class SessionManager {
  private redis: Redis

  constructor() {
    this.redis = getRedis()
  }

  async createSession(memberId: number, email: string, name: string): Promise<string> {
    const sessionId = this.generateSecureToken()
    const sessionData: SessionData = {
      memberId,
      email,
      name,
      createdAt: Date.now()
    }
    
    // 自動expire: 1時間
    await this.redis.setex(
      `session:${sessionId}`,
      3600,
      JSON.stringify(sessionData)
    )
    
    return sessionId
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`session:${sessionId}`)
    if (!data) return null
    
    try {
      return JSON.parse(data) as SessionData
    } catch {
      return null
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`)
  }

  async createAuthCode(data: AuthCodeData): Promise<string> {
    const authCode = this.generateSecureToken()
    
    // 自動expire: 10分
    await this.redis.setex(
      `auth_code:${authCode}`,
      600,
      JSON.stringify(data)
    )
    
    return authCode
  }

  async getAuthCode(code: string): Promise<AuthCodeData | null> {
    const data = await this.redis.get(`auth_code:${code}`)
    if (!data) return null
    
    try {
      return JSON.parse(data) as AuthCodeData
    } catch {
      return null
    }
  }

  async deleteAuthCode(code: string): Promise<void> {
    await this.redis.del(`auth_code:${code}`)
  }

  async createRefreshToken(memberId: number, clientId: string, scope: string): Promise<string> {
    const refreshToken = this.generateSecureToken()
    
    const tokenData = {
      memberId,
      clientId,
      scope,
      createdAt: Date.now()
    }
    
    // 自動expire: 7日
    await this.redis.setex(
      `refresh_token:${refreshToken}`,
      7 * 24 * 3600,
      JSON.stringify(tokenData)
    )
    
    return refreshToken
  }

  async getRefreshToken(token: string): Promise<{ memberId: number; clientId: string; scope: string } | null> {
    const data = await this.redis.get(`refresh_token:${token}`)
    if (!data) return null
    
    try {
      const tokenData = JSON.parse(data)
      return {
        memberId: tokenData.memberId,
        clientId: tokenData.clientId,
        scope: tokenData.scope
      }
    } catch {
      return null
    }
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.redis.del(`refresh_token:${token}`)
  }

  private generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex')
  }
}

export const sessionManager = new SessionManager()