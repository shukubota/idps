import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;
    
    const configuration = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/api/auth/authorize`,
      token_endpoint: `${baseUrl}/api/auth/token`,
      userinfo_endpoint: `${baseUrl}/api/auth/userinfo`,
      jwks_uri: `${baseUrl}/api/auth/.well-known/jwks.json`,
      scopes_supported: [
        'openid',
        'profile',
        'email'
      ],
      response_types_supported: [
        'code'
      ],
      response_modes_supported: [
        'query',
        'fragment'
      ],
      grant_types_supported: [
        'authorization_code'
      ],
      subject_types_supported: [
        'public'
      ],
      id_token_signing_alg_values_supported: [
        'RS256'
      ],
      token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'client_secret_basic'
      ],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'email',
        'email_verified',
        'name',
        'given_name',
        'family_name',
        'picture',
        'locale'
      ],
      code_challenge_methods_supported: [
        'S256'
      ],
      ui_locales_supported: [
        'en',
        'ja'
      ]
    };
    
    return NextResponse.json(configuration, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('OIDC discovery endpoint error:', error);
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 });
  }
}