# Custom IdP Provider - 自前実装

MySQL + Next.js による完全自前実装のOpenID Connect Identity Providerです。

## アーキテクチャ設計

### 実装スコープ - 実用的OIDC最小構成

**実装対象** ✅:
- 3つのコアエンドポイント（authorize, token, userinfo）
- PKCE対応（公開クライアント用）
- OpenID Connect Discovery（well-known）
- JWT Access Token & ID Token
- 基本認証フロー

**実装対象外** ❌:
- Dynamic Client Registration
- Token Introspection/Revocation  
- Device Flow
- Multi-tenant
- SAML Federation

### システム概要

```mermaid
graph TB
    Client1[Confidential Client] --> |Basic Auth Code Flow| IdP[Custom IdP Provider]
    Client2[Public Client] --> |PKCE Auth Code Flow| IdP
    IdP --> MySQL[(MySQL Database)]
    IdP --> Redis[(Redis Cache)]
    
    subgraph "Custom IdP Provider (5 Endpoints)"
        Auth["/authorize - 認可コード発行"]
        Token["/token - トークン交換"]
        UserInfo["/userinfo - ユーザー情報"]
        Discovery["/.well-known/openid-configuration"]
        JWKS["/.well-known/jwks.json"]
    end
    
    subgraph "MySQL Database (永続データ)"
        Members[members - ユーザー情報]
        Clients[oauth_clients - クライアント情報]
    end
    
    subgraph "Redis Cache (一時データ・TTL自動expire)"
        AuthCodes[認可コード - 10分TTL]
        Sessions[ユーザーセッション - 1時間TTL]
        RefreshTokens[リフレッシュトークン - 7日TTL]
    end
```

### データベース設計

#### MySQL（永続データのみ）

##### 1. members テーブル（ユーザー管理）
```sql
CREATE TABLE members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  given_name VARCHAR(50),
  family_name VARCHAR(50),
  given_name_kana VARCHAR(50),
  family_name_kana VARCHAR(50),
  given_name_kanji VARCHAR(50),
  family_name_kanji VARCHAR(50),
  picture VARCHAR(500),
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_email_verified (email_verified)
);
```

##### 2. oauth_clients テーブル（クライアント管理）
```sql
CREATE TABLE oauth_clients (
  client_id VARCHAR(255) PRIMARY KEY,
  client_secret VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  redirect_uri VARCHAR(500) NOT NULL,
  scope VARCHAR(500) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Redis（一時データ・TTL自動expire）

##### 3. セッション管理
```
キー: session:{sessionId}
値: JSON{"memberId":1,"email":"user@example.com","name":"太郎","createdAt":1640995200}
TTL: 3600秒（1時間）
```

##### 4. 認可コード管理
```
キー: auth_code:{code}
値: JSON{"memberId":1,"clientId":"web-app","scope":"openid profile","redirectUri":"...","codeChallenge":"..."}
TTL: 600秒（10分）
```

##### 5. リフレッシュトークン管理
```
キー: refresh_token:{token}
値: JSON{"memberId":1,"clientId":"web-app","scope":"openid profile","createdAt":1640995200}
TTL: 604800秒（7日）
```

## API エンドポイント仕様

### 1. Authorization Endpoint
```http
GET /api/auth/authorize
```

**目的**: 認可コード発行（OAuth 2.0 Authorization Code Flow）

**パラメータ:**
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `response_type` | ✅ | "code" (固定) | `code` |
| `client_id` | ✅ | クライアントID | `web-app`, `mobile-app` |
| `redirect_uri` | ✅ | コールバックURI | `https://client-app.example.com/auth/callback` |
| `scope` | ✅ | 要求スコープ | `openid profile email` |
| `state` | 🔸 | CSRF防止 | `af0ifjsldkj` |
| `nonce` | 🔸 | リプレイアタック対策 | `n6y5j6ift%` |
| `code_challenge` | 🔸 | PKCE チャレンジ（公開クライアント用） | `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM` |
| `code_challenge_method` | 🔸 | PKCE方式（S256固定） | `S256` |

**フロー:**
```mermaid
sequenceDiagram
    participant C as Client
    participant I as IdP  
    participant R as Redis
    participant D as MySQL Database

    C->>I: GET /authorize?client_id=...&redirect_uri=...
    I->>D: クライアント存在確認
    I->>R: セッション確認
    alt 未ログイン
        I->>C: Redirect to /login
    end
    I->>R: 認可コード生成・保存 (TTL:10分)
    I->>C: Redirect to callback?code=xxx&state=yyy
```

**レスポンス例:**
```http
HTTP/1.1 302 Found
Location: https://client-app.example.com/auth/callback?
  code=SplxlOBeZQQYbYS6WxSbIA&
  state=af0ifjsldkj
```

### 2. Token Endpoint
```http
POST /api/auth/token
```

**目的**: 認可コードをアクセストークンと交換

**パラメータ:**
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `grant_type` | ✅ | "authorization_code" | `authorization_code` |
| `code` | ✅ | 認可コード | `SplxlOBeZQQYbYS6WxSbIA` |
| `client_id` | ✅ | クライアントID | `web-app` |
| `client_secret` | 🔸 | クライアントシークレット | `client_secret` |
| `redirect_uri` | ✅ | 認可時と同じURI | `https://client-app.example.com/auth/callback` |
| `code_verifier` | 🔸 | PKCE検証子（公開クライアント用） | `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` |

**PKCE検証ロジック:**
```typescript
// 公開クライアントの場合：code_challenge存在 → code_verifier必須
if (authCode.codeChallenge && !body.code_verifier) {
  return { error: 'invalid_grant' }
}

// 機密クライアントの場合：code_challenge不存在 → code_verifier無視
if (!authCode.codeChallenge) {
  // PKCEスキップ
}
```

**レスポンス:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ...",
  "scope": "openid profile email"
}
```

### 3. UserInfo Endpoint
```http
GET /api/auth/userinfo
Authorization: Bearer <access_token>
```

**目的**: アクセストークンからユーザー情報取得

**認証**: Bearer Token必須

**レスポンス:**
```json
{
  "sub": "248289761001",
  "name": "TAROU YAMADA", 
  "given_name": "TAROU",
  "family_name": "YAMADA",
  "email": "yamada@example.com",
  "email_verified": true,
  "picture": "http://example.com/yamada/me.jpg"
}
```

### 4. Discovery Endpoint
```http
GET /.well-known/openid-configuration
```

**目的**: IdP設定情報の自動発見（OIDC Discovery）

**レスポンス:**
```json
{
  "issuer": "http://localhost:3001",
  "authorization_endpoint": "http://localhost:3001/api/auth/authorize",
  "token_endpoint": "http://localhost:3001/api/auth/token", 
  "userinfo_endpoint": "http://localhost:3001/api/auth/userinfo",
  "jwks_uri": "http://localhost:3001/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "code_challenge_methods_supported": ["S256"]
}
```

### 5. JWKS Endpoint
```http
GET /.well-known/jwks.json
```

**目的**: JWT検証用公開鍵の提供

**レスポンス:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "06dc10c93adaddc8",
      "use": "sig",
      "alg": "RS256", 
      "n": "tiC0ojqk2Nl9krIZVYC9lEBNyjLthfER72ZIFG...",
      "e": "AQAB"
    }
  ]
}
```

### ログイン補助エンドポイント

#### Login Page
```http
GET /login
```
**目的**: ログインフォーム表示

#### Login API
```http
POST /api/auth/login
```
**目的**: email/password認証

**パラメータ:**
```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス:** セッション作成後、元の認可エンドポイントにリダイレクト

## JWT トークン設計

### Access Token
```json
{
  "iss": "http://localhost:3001",
  "sub": "123456",
  "aud": "spa-client",
  "exp": 1640995200,
  "iat": 1640991600,
  "scope": "openid profile email",
  "client_id": "spa-client"
}
```

### ID Token
```json
{
  "iss": "http://localhost:3001",
  "sub": "123456",
  "aud": "spa-client",
  "exp": 1640995200,
  "iat": 1640991600,
  "auth_time": 1640991600,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "email_verified": true
}
```

## SPA クライアント設計（PKCE対応）

### 技術スタック
- Next.js 15 (App Router)
- TypeScript
- oidc-client-ts (PKCE対応)
- React Query (状態管理)
- Tailwind CSS

### PKCE フロー実装
```typescript
// 1. Code Verifier/Challenge生成
const codeVerifier = generateCodeVerifier()
const codeChallenge = await calculatePKCECodeChallenge(codeVerifier)

// 2. Authorization Request
const authUrl = buildAuthorizeUrl({
  client_id: 'spa-client',
  response_type: 'code',
  scope: 'openid profile email',
  redirect_uri: 'http://localhost:3100/auth/callback',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: generateState()
})

// 3. Token Exchange
const tokenResponse = await exchangeCodeForToken({
  code: authCode,
  client_id: 'spa-client',
  code_verifier: codeVerifier
})
```

### クライアント認証フロー
```mermaid
sequenceDiagram
    participant SPA as SPA Client
    participant IdP as Custom IdP
    participant Redis as Redis
    participant MySQL as MySQL
    
    Note over SPA: 1. PKCE準備
    SPA->>SPA: Generate code_verifier
    SPA->>SPA: Calculate code_challenge
    
    Note over SPA,IdP: 2. Authorization Request
    SPA->>IdP: /auth/authorize?code_challenge=...
    IdP->>MySQL: Validate client
    IdP->>Redis: Check session
    alt 未ログイン
        IdP->>SPA: Redirect to /login
        SPA->>IdP: POST /auth/login (email/password)
        IdP->>MySQL: Verify credentials
        IdP->>Redis: Create session (TTL: 1h)
    end
    IdP->>Redis: Store authorization_code (TTL: 10min)
    IdP->>SPA: Redirect with code
    
    Note over SPA,IdP: 3. Token Exchange
    SPA->>IdP: POST /auth/token (code + code_verifier)
    IdP->>Redis: Validate code & PKCE
    IdP->>Redis: Generate refresh_token (TTL: 7days)
    IdP->>SPA: Return tokens (access + id + refresh)
    
    Note over SPA,IdP: 4. API Access
    SPA->>IdP: GET /auth/userinfo (Bearer token)
    IdP->>Redis: Validate session
    IdP->>MySQL: Get user info
    IdP->>SPA: Return user info
```

## セキュリティ実装

### 1. パスワード管理
- bcryptjs による安全なハッシュ化（saltRounds: 12）
- パスワード強度チェック

### 2. セッション管理
- Redis を使用した高速セッション管理（TTL自動expire）
- セッションハイジャック対策
- 適切な有効期限設定

### 3. CSRF対策
- state パラメータによる検証
- SameSite Cookie設定

### 4. トークンセキュリティ
- RS256 JWT署名
- 適切な有効期限（Access: 1時間、Refresh: 7日）
- トークン取り消し機能

### 5. PKCE実装
- S256 による code_challenge
- 公開クライアント対応

## 開発・運用

### 環境変数設定

direnvを使用した環境変数管理：

```bash
# 1. .envrc設定
cp .envrc.example .envrc
# 必要に応じて.envrcを編集

# 2. direnv許可
direnv allow
```

`.envrc` の内容：
```bash
# Database Configuration
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=idp_user
export DB_PASSWORD=idp_password
export DB_NAME=custom_idp
export DATABASE_URL=mysql://idp_user:idp_password@localhost:3306/custom_idp

# Redis Configuration
export REDIS_URL=redis://localhost:6379

# JWT Configuration
export JWT_PRIVATE_KEY_PATH=./keys/private.pem
export JWT_PUBLIC_KEY_PATH=./keys/public.pem
export JWT_ISSUER=http://localhost:3001

# App Configuration
export NEXTAUTH_URL=http://localhost:3001
export NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Session Configuration
export SESSION_SECRET=your-session-secret-key-change-this
export SESSION_EXPIRES_IN=86400
```

## 技術スタック

- **フロントエンド**: Next.js 15 + TypeScript
- **バックエンド**: Next.js API Routes
- **データベース**: MySQL 8.0（永続データ）+ Redis 7（一時データ・TTL）
- **ORM**: Drizzle ORM
- **認証**: bcryptjs + jsonwebtoken
- **環境管理**: direnv + Docker Compose

## 起動方法
```bash
# 1. データベース＆Redis起動（プロジェクトルートから）
cd ../../
docker compose up -d mysql redis

# 2. Custom provider準備
cd providers/custom

# 3. 環境変数設定
cp .envrc.example .envrc
# 鍵を環境変数にセット
npm run keys:generate
npm run keys:load-env  # 出力をコピペして.envrcに追加
direnv allow

# 4. 依存関係インストール
npm install

# 5. マイグレーション実行  
npm run db:generate
npm run db:migrate

# 6. シードデータ投入
npm run db:seed

# 7. 開発サーバー起動
npm run dev
```

### 動作確認

**基本動作確認:**
```bash
# Discovery確認
curl http://localhost:3001/.well-known/openid-configuration

# JWKS確認  
curl http://localhost:3001/.well-known/jwks.json

# Authorization フロー確認（ブラウザで）
open "http://localhost:3001/api/auth/authorize?response_type=code&client_id=demo-app&redirect_uri=http://localhost:3000/auth/callback&scope=openid%20profile%20email&state=test123"
```

**パフォーマンステスト:**
```bash
# JWT処理テスト
npm run jwt:test

# 負荷テスト（別途ab/wrk等使用）
ab -n 1000 -c 10 http://localhost:3001/api/auth/userinfo
```

### API仕様
- OpenAPI 3.0 仕様準拠
- Swagger UI提供（`/api/docs`）
- レスポンス形式統一