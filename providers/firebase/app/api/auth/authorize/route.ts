import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // OIDC required parameters
  const responseType = searchParams.get('response_type');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  
  // Validate required parameters
  if (!responseType || !clientId || !redirectUri || !scope) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'Missing required parameters'
    }, { status: 400 });
  }
  
  if (responseType !== 'code') {
    return NextResponse.json({
      error: 'unsupported_response_type',
      error_description: 'Only authorization code flow is supported'
    }, { status: 400 });
  }
  
  // Store authorization request in session
  const authRequest = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    timestamp: Date.now()
  };
  
  // For now, redirect to Firebase Auth UI
  // In production, you'd validate client_id and redirect_uri against registered clients
  const firebaseAuthUrl = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' 
    ? 'http://localhost:9099' 
    : 'https://identitytoolkit.googleapis.com';
  
  // Store auth request in session (you'd typically use Redis or database)
  const sessionId = generateSessionId();
  
  // For demo purposes, redirect to a login page that will handle Firebase auth
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('session_id', sessionId);
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('scope', scope);
  if (state) loginUrl.searchParams.set('state', state);
  
  return NextResponse.redirect(loginUrl);
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}