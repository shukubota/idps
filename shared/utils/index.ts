import { OAuthRequest, TokenRequest } from '../types'
import { ERROR_CODES } from '../constants'

// OAuth パラメータバリデーション
export function validateOAuthRequest(params: Record<string, string>): OAuthRequest | { error: string } {
  if (!params.response_type) {
    return { error: ERROR_CODES.INVALID_REQUEST }
  }
  
  if (!params.client_id) {
    return { error: ERROR_CODES.INVALID_REQUEST }
  }
  
  if (!params.redirect_uri) {
    return { error: ERROR_CODES.INVALID_REQUEST }
  }
  
  return {
    response_type: params.response_type,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    scope: params.scope,
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
  }
}

export function validateTokenRequest(body: Record<string, string>): TokenRequest | { error: string } {
  if (!body.grant_type) {
    return { error: ERROR_CODES.INVALID_REQUEST }
  }
  
  if (!body.client_id) {
    return { error: ERROR_CODES.INVALID_CLIENT }
  }
  
  return {
    grant_type: body.grant_type,
    code: body.code,
    redirect_uri: body.redirect_uri,
    client_id: body.client_id,
    client_secret: body.client_secret,
    code_verifier: body.code_verifier,
    refresh_token: body.refresh_token,
  }
}

// PKCE検証
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string, method: string = 'S256'): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge
  }
  
  if (method === 'S256') {
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return hash === codeChallenge
  }
  
  return false
}

// ランダム文字列生成
export function generateRandomString(length: number = 32): string {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('base64url')
}

// URLパラメータエンコード
export function buildQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value)
    }
  })
  
  return searchParams.toString()
}

// エラーレスポンス生成
export function createErrorResponse(error: string, description?: string, uri?: string) {
  return {
    error,
    ...(description && { error_description: description }),
    ...(uri && { error_uri: uri }),
  }
}