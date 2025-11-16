import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.ISSUER_URL || 'http://localhost:3000'
  
  const configuration = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    userinfo_endpoint: `${baseUrl}/api/auth/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    
    // Supported response types
    response_types_supported: ['code'],
    
    // Supported grant types
    grant_types_supported: ['authorization_code'],
    
    // Supported subject identifier types
    subject_types_supported: ['public'],
    
    // Supported signing algorithms for ID tokens
    id_token_signing_alg_values_supported: ['RS256'],
    
    // Supported scopes
    scopes_supported: ['openid', 'profile', 'email', 'phone'],
    
    // Supported claims
    claims_supported: [
      'sub',
      'name',
      'given_name',
      'family_name',
      'email',
      'email_verified',
      'phone_number',
      'phone_number_verified',
      'picture',
      'given_name#ja-Kana-JP',
      'given_name#ja-Hani-JP',
      'family_name#ja-Kana-JP',
      'family_name#ja-Hani-JP'
    ],
    
    // PKCE support
    code_challenge_methods_supported: ['S256'],
    
    // Authentication methods
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    
    // Additional OIDC features
    request_uri_parameter_supported: false,
    request_parameter_supported: false,
    require_request_uri_registration: false
  }

  return NextResponse.json(configuration, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  })
}