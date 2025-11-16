# Custom IdP Provider - 自前実装

MySQL + Next.js による完全自前実装のOpenID Connect Identity Providerです。

## アーキテクチャ設計

### システム概要

```mermaid
graph TB
    Client[SPA Client] --> |PKCE Auth Code Flow| IdP[Custom IdP Provider]
    IdP --> MySQL[(MySQL Database)]
    IdP --> Redis[(Redis Cache)]
    
    subgraph "Custom IdP Provider"
        Auth[Auth Endpoints]
        JWT[JWT Handler]
        Session[Session Manager]
        User[User Manager]
    end
    
    subgraph "MySQL Database"
        Members[members table]
        Clients[oauth_clients table]
        Codes[authorization_codes table]
        Tokens[refresh_tokens table]
        Sessions[user_sessions table]
    end
```

### データベース設計

#### 1. members テーブル（ユーザー管理）
```sql
CREATE TABLE members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_email_verified (email_verified)
);
```

#### 2. oauth_clients テーブル（クライアント管理）
```sql
CREATE TABLE oauth_clients (
  client_id VARCHAR(255) PRIMARY KEY,
  client_secret VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  redirect_uris JSON NOT NULL,
  grant_types JSON NOT NULL,
  response_types JSON NOT NULL,
  scope VARCHAR(500) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. authorization_codes テーブル（認可コード管理）
```sql
CREATE TABLE authorization_codes (
  code VARCHAR(128) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  member_id BIGINT NOT NULL,
  redirect_uri VARCHAR(500) NOT NULL,
  scope VARCHAR(500) NOT NULL,
  code_challenge VARCHAR(128),
  code_challenge_method VARCHAR(10),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_used_at (used_at)
);
```

#### 4. refresh_tokens テーブル（リフレッシュトークン管理）
```sql
CREATE TABLE refresh_tokens (
  token VARCHAR(128) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  member_id BIGINT NOT NULL,
  scope VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  INDEX idx_member_id (member_id),
  INDEX idx_expires_at (expires_at)
);
```

#### 5. user_sessions テーブル（セッション管理）
```sql
CREATE TABLE user_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  member_id BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES members(id),
  INDEX idx_member_id (member_id),
  INDEX idx_expires_at (expires_at)
);
```

## OIDC エンドポイント設計

### 1. Authorization Endpoint
```
GET /api/auth/authorize
```
**パラメータ:**
- `response_type`: "code" (固定)
- `client_id`: クライアントID
- `redirect_uri`: リダイレクトURI
- `scope`: "openid profile email"
- `state`: CSRF防止用
- `code_challenge`: PKCE用チャレンジ
- `code_challenge_method`: "S256" (固定)

**フロー:**
1. パラメータバリデーション
2. クライアント存在確認
3. リダイレクトURI検証
4. セッション確認（未ログインなら `/login` へ）
5. 認可コード生成・保存
6. リダイレクト

### 2. Token Endpoint
```
POST /api/auth/token
```
**パラメータ:**
- `grant_type`: "authorization_code" | "refresh_token"
- `code`: 認可コード (grant_type=authorization_code時)
- `client_id`: クライアントID
- `code_verifier`: PKCE用検証子
- `refresh_token`: リフレッシュトークン (grant_type=refresh_token時)

**レスポンス:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_...",
  "id_token": "eyJ...",
  "scope": "openid profile email"
}
```

### 3. UserInfo Endpoint
```
GET /api/auth/userinfo
Authorization: Bearer <access_token>
```

**レスポンス:**
```json
{
  "sub": "123456",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "email_verified": true
}
```

### 4. Login Endpoint
```
GET /login
POST /api/auth/login
```
**ログインフォーム処理:**
- email/password認証
- bcryptによるパスワード検証
- セッション作成
- 元のauthorizeエンドポイントにリダイレクト

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
    participant DB as MySQL
    
    Note over SPA: 1. PKCE準備
    SPA->>SPA: Generate code_verifier
    SPA->>SPA: Calculate code_challenge
    
    Note over SPA,IdP: 2. Authorization Request
    SPA->>IdP: /auth/authorize?code_challenge=...
    IdP->>DB: Validate client
    IdP->>SPA: Redirect to /login (if not authenticated)
    SPA->>IdP: POST /auth/login (email/password)
    IdP->>DB: Verify credentials
    IdP->>DB: Create session
    IdP->>DB: Store authorization_code
    IdP->>SPA: Redirect with code
    
    Note over SPA,IdP: 3. Token Exchange
    SPA->>IdP: POST /auth/token (code + code_verifier)
    IdP->>DB: Validate code & PKCE
    IdP->>DB: Generate refresh_token
    IdP->>SPA: Return tokens (access + id + refresh)
    
    Note over SPA,IdP: 4. API Access
    SPA->>IdP: GET /auth/userinfo (Bearer token)
    IdP->>DB: Validate access_token
    IdP->>SPA: Return user info
```

## セキュリティ実装

### 1. パスワード管理
- bcryptjs による安全なハッシュ化（saltRounds: 12）
- パスワード強度チェック

### 2. セッション管理
- Redis を使用した高速セッション管理
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

### 起動方法
```bash
# 1. データベース起動（プロジェクトルートから）
cd ../../
docker compose up -d

# 2. Custom provider準備
cd providers/custom

# 3. 環境変数設定
cp .envrc.example .envrc
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

### API仕様
- OpenAPI 3.0 仕様準拠
- Swagger UI提供（`/api/docs`）
- レスポンス形式統一