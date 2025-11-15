// OAuth 2.0 / OpenID Connect共通定数

export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
  CLIENT_CREDENTIALS: 'client_credentials',
} as const

export const RESPONSE_TYPES = {
  CODE: 'code',
  TOKEN: 'token',
  ID_TOKEN: 'id_token',
} as const

export const SCOPES = {
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',
  OFFLINE_ACCESS: 'offline_access',
} as const

export const ERROR_CODES = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  ACCESS_DENIED: 'access_denied',
  UNSUPPORTED_RESPONSE_TYPE: 'unsupported_response_type',
  INVALID_SCOPE: 'invalid_scope',
  SERVER_ERROR: 'server_error',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
} as const

export const TOKEN_TYPE = 'Bearer'

export const JWT_ALGORITHMS = {
  RS256: 'RS256',
  HS256: 'HS256',
} as const

// デフォルトのトークン有効期限（秒）
export const DEFAULT_TOKEN_EXPIRES_IN = {
  ACCESS_TOKEN: 3600, // 1時間
  REFRESH_TOKEN: 604800, // 7日
  ID_TOKEN: 3600, // 1時間
  AUTHORIZATION_CODE: 600, // 10分
} as const