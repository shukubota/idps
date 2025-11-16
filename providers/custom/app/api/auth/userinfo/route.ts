import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/auth'
import { db } from '../../../../lib/db'
import { members } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'

// OPTIONS method for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3100',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'invalid_token' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer error="invalid_token"',
            'Access-Control-Allow-Origin': 'http://localhost:3100',
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      )
    }

    // Get session from access token (JWT validation only)
    const session = await authService.getSessionFromBearerToken(authHeader)
    
    if (!session) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'The Access Token expired' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer error="invalid_token", error_description="The Access Token expired"',
            'Access-Control-Allow-Origin': 'http://localhost:3100',
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      )
    }

    // IMPORTANT: Also verify that the user session still exists in Redis
    // This ensures that if Redis is flushed, even valid JWTs will be rejected
    const { sessionManager } = await import('../../../../lib/redis')
    
    // For JWT-based access, we need to check if any session exists for this user
    // Since we don't store the exact sessionId in JWT, we'll check if user has any valid session
    const redis = (await import('../../../../lib/redis')).getRedis()
    const sessionKeys = await redis.keys(`session:*`)
    
    let userHasValidSession = false
    for (const key of sessionKeys) {
      const sessionData = await sessionManager.getSession(key.replace('session:', ''))
      if (sessionData && sessionData.memberId === session.memberId) {
        userHasValidSession = true
        break
      }
    }
    
    if (!userHasValidSession) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'Session has been invalidated' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer error="invalid_token", error_description="Session has been invalidated"',
            'Access-Control-Allow-Origin': 'http://localhost:3100',
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      )
    }

    // Get member data
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, session.memberId))
      .limit(1)

    if (!member) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'User not found' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer error="invalid_token"',
            'Access-Control-Allow-Origin': 'http://localhost:3100',
            'Access-Control-Allow-Credentials': 'true'
          }
        }
      )
    }

    // Build userinfo response based on the scopes that were granted
    // Note: In a production system, you'd want to store the granted scopes
    // and only return claims for those scopes. For this implementation,
    // we'll return all available claims.
    
    const userInfo: any = {
      sub: member.id.toString(),
      name: member.name,
      email: member.email,
      email_verified: member.emailVerified
    }

    // Add profile claims if available
    if (member.givenName) {
      userInfo.given_name = member.givenName
    }
    
    if (member.familyName) {
      userInfo.family_name = member.familyName
    }
    
    if (member.picture) {
      userInfo.picture = member.picture
    }

    // Add Japanese name variants if available (following the CSV spec)
    if (member.givenNameKana) {
      userInfo['given_name#ja-Kana-JP'] = member.givenNameKana
    }
    
    if (member.givenNameKanji) {
      userInfo['given_name#ja-Hani-JP'] = member.givenNameKanji
    }
    
    if (member.familyNameKana) {
      userInfo['family_name#ja-Kana-JP'] = member.familyNameKana
    }
    
    if (member.familyNameKanji) {
      userInfo['family_name#ja-Hani-JP'] = member.familyNameKanji
    }

    // Add phone claims if available
    if (member.phoneNumber) {
      userInfo.phone_number = member.phoneNumber
      userInfo.phone_number_verified = member.phoneVerified
    }

    return NextResponse.json(userInfo, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': 'http://localhost:3100',
        'Access-Control-Allow-Credentials': 'true'
      }
    })

  } catch (error) {
    console.error('UserInfo endpoint error:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { 
        status: 500,
        headers: {
          'WWW-Authenticate': 'Bearer error="server_error"',
          'Access-Control-Allow-Origin': 'http://localhost:3100',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    )
  }
}