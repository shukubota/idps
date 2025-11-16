import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/auth'
import { sessionManager } from '../../../../lib/redis'
import { generateAccessToken, generateIdToken } from '../../../../lib/jwt'
import { db } from '../../../../lib/db'
import { oauthClients, members } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const grantType = formData.get('grant_type')?.toString()
    const code = formData.get('code')?.toString()
    const redirectUri = formData.get('redirect_uri')?.toString()
    const clientId = formData.get('client_id')?.toString()
    const clientSecret = formData.get('client_secret')?.toString()
    const codeVerifier = formData.get('code_verifier')?.toString()

    // Validate grant type
    if (grantType !== 'authorization_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type' },
        { status: 400 }
      )
    }

    // Validate required parameters
    if (!code || !redirectUri || !clientId) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get authorization code data
    const authCodeData = await sessionManager.getAuthCode(code)
    if (!authCodeData) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
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
      return NextResponse.json(
        { error: 'invalid_client' },
        { status: 401 }
      )
    }

    // Validate client credentials for confidential clients
    if (!client.isPublic) {
      if (!clientSecret || client.clientSecret !== clientSecret) {
        return NextResponse.json(
          { error: 'invalid_client' },
          { status: 401 }
        )
      }
    }

    // Validate redirect URI
    if (authCodeData.redirectUri !== redirectUri) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      )
    }

    // Validate client ID
    if (authCodeData.clientId !== clientId) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Client ID mismatch' },
        { status: 400 }
      )
    }

    // PKCE validation for public clients
    if (client.isPublic && authCodeData.codeChallenge) {
      if (!codeVerifier) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'code_verifier required for PKCE' },
          { status: 400 }
        )
      }

      const isValidChallenge = authService.validatePKCEChallenge(
        codeVerifier,
        authCodeData.codeChallenge
      )

      if (!isValidChallenge) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
          { status: 400 }
        )
      }
    }

    // Get member data
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, authCodeData.memberId))
      .limit(1)

    if (!member) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'User not found' },
        { status: 400 }
      )
    }

    // Delete the authorization code (one-time use)
    await sessionManager.deleteAuthCode(code)

    // Generate tokens
    const scopes = authCodeData.scope.split(' ')
    
    // Generate access token
    const accessToken = generateAccessToken({
      sub: member.id.toString(),
      client_id: clientId,
      scope: authCodeData.scope,
      aud: clientId,
      iss: process.env.ISSUER_URL || 'http://localhost:3001'
    })
    
    // Create session for userinfo endpoint
    const sessionId = await sessionManager.createSession(
      member.id,
      member.email,
      member.name
    )

    // Generate ID token if openid scope is present
    let idToken: string | undefined
    if (scopes.includes('openid')) {
      const idTokenPayload: any = {
        sub: member.id.toString(),
        name: member.name,
        email: member.email,
        email_verified: member.emailVerified,
        iss: process.env.ISSUER_URL || 'http://localhost:3001',
        aud: clientId,
        nonce: authCodeData.nonce
      }

      // Add profile scope claims
      if (scopes.includes('profile')) {
        Object.assign(idTokenPayload, {
          given_name: member.givenName,
          family_name: member.familyName,
          picture: member.picture
        })
      }

      // Add phone scope claims
      if (scopes.includes('phone')) {
        Object.assign(idTokenPayload, {
          phone_number: member.phoneNumber,
          phone_number_verified: member.phoneVerified
        })
      }

      idToken = generateIdToken(idTokenPayload)
    }

    // Prepare response
    const tokenResponse: any = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600 // 1 hour
    }

    if (idToken) {
      tokenResponse.id_token = idToken
    }

    // Add refresh token for confidential clients
    if (!client.isPublic) {
      tokenResponse.refresh_token = require('crypto').randomBytes(32).toString('hex')
    }

    const response = NextResponse.json(tokenResponse)
    
    // Set cache control headers
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Pragma', 'no-cache')

    return response

  } catch (error) {
    console.error('Token endpoint error:', error)
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    )
  }
}