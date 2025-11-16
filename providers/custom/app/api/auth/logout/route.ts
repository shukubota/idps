import { NextRequest, NextResponse } from 'next/server'
import { sessionManager } from '../../../../lib/redis'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      // Redisからセッションを削除
      await sessionManager.deleteSession(sessionId)
    }

    // セッションCookieを削除
    const response = NextResponse.json({ success: true })
    response.cookies.set('session_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(0) // 即座に期限切れ
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    
    // エラーでも基本的には成功扱い（セキュリティ上）
    const response = NextResponse.json({ success: true })
    response.cookies.set('session_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      path: '/',
      expires: new Date(0)
    })

    return response
  }
}

// OPTIONS method for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}