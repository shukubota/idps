import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    const grantType = params.get('grant_type');
    const code = params.get('code');
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    
    // Validate required parameters
    if (!grantType || !code || !clientId || !redirectUri) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400 });
    }
    
    if (grantType !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400 });
    }
    
    // Validate authorization code
    // In production, you'd verify the code against stored session data
    if (!isValidAuthorizationCode(code)) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      }, { status: 400 });
    }
    
    // Generate tokens
    const accessToken = await generateAccessToken(code, clientId);
    const idToken = await generateIdToken(code, clientId);
    
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: idToken,
      scope: 'openid profile email'
    });
    
  } catch (error) {
    console.error('Token endpoint error:', error);
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 });
  }
}

function isValidAuthorizationCode(code: string): boolean {
  // In production, validate against Redis/database stored codes
  // For demo purposes, accept any non-empty code
  return code.length > 0;
}

async function generateAccessToken(code: string, clientId: string): Promise<string> {
  // In production, use proper JWT signing with private key
  // This is a simplified implementation
  const payload = {
    iss: process.env.OIDC_ISSUER || 'http://localhost:3000',
    sub: extractUserIdFromCode(code),
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    scope: 'openid profile email'
  };
  
  // Simple base64 encoding for demo - use proper JWT in production
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

async function generateIdToken(code: string, clientId: string): Promise<string> {
  // In production, use proper JWT signing with private key
  const payload = {
    iss: process.env.OIDC_ISSUER || 'http://localhost:3000',
    sub: extractUserIdFromCode(code),
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: 'user@example.com',
    email_verified: true,
    name: 'Demo User',
    given_name: 'Demo',
    family_name: 'User'
  };
  
  // Simple base64 encoding for demo - use proper JWT in production
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function extractUserIdFromCode(code: string): string {
  // In production, look up user ID from stored authorization code
  return 'demo-user-id';
}