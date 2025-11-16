import { NextResponse } from 'next/server'
import { getJWKS } from '../../../lib/jwt'

export async function GET() {
  try {
    const jwks = getJWKS()
    
    return NextResponse.json(jwks, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error('JWKS endpoint error:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    )
  }
}