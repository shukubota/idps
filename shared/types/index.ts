// OAuth 2.0 / OpenID Connect共通型定義

export interface OAuthRequest {
  response_type: string
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
  nonce?: string
  code_challenge?: string
  code_challenge_method?: string
}

export interface TokenRequest {
  grant_type: string
  code?: string
  redirect_uri?: string
  client_id: string
  client_secret?: string
  code_verifier?: string
  refresh_token?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  id_token?: string
  scope?: string
}

export interface UserInfo {
  sub: string
  name?: string
  email?: string
  email_verified?: boolean
  picture?: string
  given_name?: string
  family_name?: string
  locale?: string
}

export interface JWTHeader {
  alg: string
  typ: string
  kid?: string
}

export interface JWTPayload {
  iss: string
  sub: string
  aud: string | string[]
  exp: number
  iat: number
  auth_time?: number
  nonce?: string
  azp?: string
  scope?: string
}

export interface Client {
  client_id: string
  client_secret?: string
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  scope: string
  name: string
}