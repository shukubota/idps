import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Use existing auth service to validate session
    const session = await authService.getSessionFromRequest(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      valid: true,
      sessionData: {
        memberId: session.memberId,
        email: session.email,
        name: session.name
      }
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}