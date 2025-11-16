import { NextRequest } from 'next/server'
import { sessionManager, SessionData } from './redis'
import { compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { members } from './db/schema'
import crypto from 'crypto'

export interface LoginCredentials {
  email: string
  password: string
}

export interface PKCEChallenge {
  codeChallenge: string
  codeChallengeMethod: 'S256'
}

export class AuthService {
  async authenticateUser(credentials: LoginCredentials): Promise<SessionData | null> {
    const { email, password } = credentials
    
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.email, email))
      .limit(1)
    
    if (!member) {
      return null
    }
    
    const isValidPassword = await compare(password, member.passwordHash)
    if (!isValidPassword) {
      return null
    }
    
    return {
      memberId: member.id,
      email: member.email,
      name: member.name,
      createdAt: Date.now()
    }
  }

  async getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
    const sessionId = request.cookies.get('session_id')?.value
    if (!sessionId) {
      return null
    }
    
    return await sessionManager.getSession(sessionId)
  }

  async getSessionFromBearerToken(authHeader: string | null): Promise<SessionData | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const accessToken = authHeader.substring(7)
    
    try {
      // Verify JWT access token
      const { verifyAccessToken } = await import('./jwt')
      const payload = verifyAccessToken(accessToken)
      
      // Create session data from JWT payload
      return {
        sessionId: accessToken,
        memberId: parseInt(payload.sub),
        email: '', // Not stored in access token for privacy
        name: '', // Not stored in access token for privacy
        createdAt: (payload.iat || 0) * 1000,
        expiresAt: (payload.exp || 0) * 1000
      }
    } catch (error) {
      console.error('JWT access token verification failed:', error)
      return null
    }
  }

  validatePKCEChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    
    return hash === codeChallenge
  }

  generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    
    return {
      codeChallenge,
      codeChallengeMethod: 'S256'
    }
  }

  validateScope(requestedScope: string): string[] {
    const validScopes = ['openid', 'profile', 'email', 'phone']
    const scopes = requestedScope.split(' ').filter(scope => 
      validScopes.includes(scope)
    )
    
    // Always include 'openid' if not present
    if (!scopes.includes('openid')) {
      scopes.unshift('openid')
    }
    
    return scopes
  }
}

export const authService = new AuthService()