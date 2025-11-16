import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/auth'
import { sessionManager } from '../../../../lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { email, password, redirectUrl } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const sessionData = await authService.authenticateUser({ email, password })
    
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const sessionId = await sessionManager.createSession(
      sessionData.memberId,
      sessionData.email,
      sessionData.name
    )

    const response = NextResponse.json({ 
      success: true,
      redirectUrl: redirectUrl || undefined
    })

    // Set session cookie
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}