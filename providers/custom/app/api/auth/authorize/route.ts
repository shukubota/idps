import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/auth'
import { sessionManager } from '../../../../lib/redis'
import { db } from '../../../../lib/db'
import { oauthClients } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const params = url.searchParams

    // Required parameters
    const responseType = params.get('response_type')
    const clientId = params.get('client_id')
    const redirectUri = params.get('redirect_uri')
    const scope = params.get('scope')

    // Optional parameters
    const state = params.get('state')
    const nonce = params.get('nonce')
    const codeChallenge = params.get('code_challenge')
    const codeChallengeMethod = params.get('code_challenge_method')
    const prompt = params.get('prompt')
    const maxAge = params.get('max_age')

    // Validate required parameters
    if (responseType !== 'code') {
      return redirectWithError(redirectUri, 'unsupported_response_type', state)
    }

    if (!clientId || !redirectUri || !scope) {
      return NextResponse.json(
        { error: 'missing_required_parameters' },
        { status: 400 }
      )
    }

    // Validate client
    const [client] = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1)

    if (!client) {
      return redirectWithError(redirectUri, 'invalid_client', state)
    }

    // Validate redirect URI
    if (client.redirectUri !== redirectUri) {
      return NextResponse.json(
        { error: 'invalid_redirect_uri' },
        { status: 400 }
      )
    }

    // Validate scope
    const validatedScopes = authService.validateScope(scope)
    if (validatedScopes.length === 0) {
      return redirectWithError(redirectUri, 'invalid_scope', state)
    }

    // PKCE validation (required for public clients)
    if (client.isPublic && (!codeChallenge || !codeChallengeMethod)) {
      return redirectWithError(redirectUri, 'invalid_request', state, 'PKCE required for public clients')
    }

    if (codeChallenge && codeChallengeMethod && codeChallengeMethod !== 'S256') {
      return redirectWithError(redirectUri, 'invalid_request', state, 'Only S256 code_challenge_method is supported')
    }

    // Check if user is authenticated
    const session = await authService.getSessionFromRequest(request)

    if (!session) {
      // Redirect to login with current request preserved
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect_url', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Check max_age if provided
    if (maxAge) {
      const maxAgeSeconds = parseInt(maxAge)
      const sessionAgeSeconds = (Date.now() - session.createdAt) / 1000
      if (sessionAgeSeconds > maxAgeSeconds) {
        // Session is too old, require re-authentication
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect_url', request.url)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Handle prompt parameter
    if (prompt === 'none') {
      // Return error if authentication is required
      if (!session) {
        return redirectWithError(redirectUri, 'login_required', state)
      }
    } else if (prompt === 'login') {
      // Force re-authentication
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect_url', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Generate authorization code
    const authCode = await sessionManager.createAuthCode({
      memberId: session.memberId,
      clientId,
      scope: validatedScopes.join(' '),
      redirectUri,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod || undefined,
      nonce: nonce || undefined,
      state: state || undefined
    })

    // Redirect back to client with authorization code
    const callbackUrl = new URL(redirectUri)
    callbackUrl.searchParams.set('code', authCode)
    if (state) {
      callbackUrl.searchParams.set('state', state)
    }

    return NextResponse.redirect(callbackUrl)

  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    )
  }
}

function redirectWithError(
  redirectUri: string | null, 
  error: string, 
  state?: string | null,
  description?: string
): NextResponse {
  if (!redirectUri) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const errorUrl = new URL(redirectUri)
  errorUrl.searchParams.set('error', error)
  
  if (description) {
    errorUrl.searchParams.set('error_description', description)
  }
  
  if (state) {
    errorUrl.searchParams.set('state', state)
  }

  return NextResponse.redirect(errorUrl)
}