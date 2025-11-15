import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token from Authorization header
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'invalid_token',
        error_description: 'Missing or invalid authorization header'
      }, { status: 401 });
    }
    
    const accessToken = authorization.replace('Bearer ', '');
    
    // Validate access token
    const userInfo = await validateTokenAndGetUserInfo(accessToken);
    if (!userInfo) {
      return NextResponse.json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token'
      }, { status: 401 });
    }
    
    return NextResponse.json(userInfo);
    
  } catch (error) {
    console.error('UserInfo endpoint error:', error);
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Some OIDC clients send POST requests to userinfo endpoint
  return GET(request);
}

async function validateTokenAndGetUserInfo(accessToken: string) {
  try {
    // In production, validate JWT signature and extract claims
    // For demo purposes, decode base64 token
    const payload = JSON.parse(Buffer.from(accessToken, 'base64').toString());
    
    // Check token expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // In production, fetch user info from Firebase or database
    // For demo purposes, return mock user data
    return {
      sub: payload.sub || 'demo-user-id',
      email: 'user@example.com',
      email_verified: true,
      name: 'Demo User',
      given_name: 'Demo',
      family_name: 'User',
      picture: 'https://via.placeholder.com/150',
      locale: 'ja-JP',
      updated_at: Math.floor(Date.now() / 1000)
    };
    
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}