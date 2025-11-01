# IDPS - Identity Provider Service

Firebase Authenticationを基盤とした最小限のOpenID Connect (OIDC) Identity Provider

## 概要

他システムとの認証統合を可能にするOIDC準拠のIdentity Providerです。Firebase Authenticationをバックエンドとして使用し、標準的なOIDCフローを提供します。

## 機能

- ✅ OpenID Connect 1.0 準拠
- ✅ Firebase Authentication統合
- ✅ Email/Password + ソーシャルログイン
- ✅ Multi-Factor Authentication (MFA)
- ✅ JWT Access Token発行
- ✅ OIDC Discovery エンドポイント

## アーキテクチャ

詳細は [architecture.md](./architecture.md) を参照してください。

## 開発環境セットアップ

### 前提条件

- Node.js 20.x以上
- Docker & Docker Compose
- Firebase CLI

### 1. リポジトリクローン

```bash
git clone <repository-url>
cd idps
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. ローカル開発サービス起動

#### Firebase Emulator Suite
```bash
# Firebase CLI インストール (初回のみ)
npm install -g firebase-tools

# Firebase プロジェクト設定 (初回のみ)
firebase login
firebase init

# Emulator Suite 起動
npm run firebase:emulator
```

**利用可能サービス:**
- Authentication: http://localhost:9099
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Firebase UI: http://localhost:4000

#### Redis (セッション管理用)
```bash
# Docker Compose で Redis 起動
npm run redis:start

# 停止
npm run redis:stop
```

#### PostgreSQL (将来の拡張用)
```bash
# Docker Compose で PostgreSQL 起動
npm run db:start

# マイグレーション実行
npm run db:migrate

# 停止
npm run db:stop
```

### 4. 環境変数設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:
```env
# Firebase Configuration (Emulator用)
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Firebase Emulator
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# OIDC Configuration
OIDC_ISSUER=http://localhost:3000
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Redis (ローカル開発用)
REDIS_URL=redis://localhost:6379

# Database (将来用)
DATABASE_URL=postgresql://idps:password@localhost:5432/idps_dev
```

### 5. JWT署名キー生成

```bash
npm run keys:generate
```

### 6. 開発サーバー起動

```bash
npm run dev
```

アプリケーション: http://localhost:3000

## 利用可能なスクリプト

### 開発用
```bash
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npm run start            # プロダクションサーバー起動
npm run lint             # ESLint実行
npm run type-check       # TypeScript型チェック
```

### Firebase
```bash
npm run firebase:emulator    # Firebase Emulator Suite起動
npm run firebase:deploy      # Firebase にデプロイ
npm run firebase:logs        # Firebase ログ表示
```

### インフラ
```bash
npm run redis:start      # Redis起動
npm run redis:stop       # Redis停止
npm run redis:cli        # Redis CLI

npm run db:start         # PostgreSQL起動
npm run db:stop          # PostgreSQL停止
npm run db:migrate       # データベースマイグレーション
npm run db:reset         # データベースリセット
```

### ユーティリティ
```bash
npm run keys:generate    # JWT署名キー生成
npm run test             # テスト実行
npm run test:watch       # テスト監視モード
```

## Docker Compose設定

### 全サービス起動
```bash
docker-compose up -d
```

### 個別サービス起動
```bash
# Redis のみ
docker-compose up -d redis

# PostgreSQL のみ  
docker-compose up -d postgres

# 全て停止
docker-compose down
```

## エンドポイント

### OIDC エンドポイント
- **Discovery**: `/.well-known/openid-configuration`
- **Authorization**: `/api/auth/authorize`
- **Token**: `/api/auth/token`
- **UserInfo**: `/api/auth/userinfo`
- **JWKS**: `/api/auth/.well-known/jwks.json`

### 管理用
- **Health Check**: `/api/health`
- **Metrics**: `/api/metrics` (将来実装)

## クライアント統合例

### JavaScript/TypeScript
```typescript
const config = {
  issuer: 'http://localhost:3000',
  client_id: 'your-client-id',
  redirect_uri: 'http://localhost:3001/callback',
  scope: 'openid profile email'
};

// 認証URL生成
const authUrl = `${config.issuer}/api/auth/authorize?` +
  `response_type=code&` +
  `client_id=${config.client_id}&` +
  `redirect_uri=${encodeURIComponent(config.redirect_uri)}&` +
  `scope=${encodeURIComponent(config.scope)}&` +
  `state=${generateState()}`;

// トークン取得
const tokenResponse = await fetch(`${config.issuer}/api/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: config.client_id,
    redirect_uri: config.redirect_uri
  })
});
```

### Python
```python
from authlib.integrations.requests_client import OAuth2Session

client = OAuth2Session(
    client_id='your-client-id',
    redirect_uri='http://localhost:3001/callback',
    scope='openid profile email'
)

# 認証URL生成
authorization_url, state = client.create_authorization_url(
    'http://localhost:3000/api/auth/authorize'
)

# トークン取得
token = client.fetch_token(
    'http://localhost:3000/api/auth/token',
    authorization_response=request.url
)
```

## テスト

### 単体テスト
```bash
npm run test
```

### 統合テスト
```bash
npm run test:integration
```

### E2Eテスト
```bash
npm run test:e2e
```

## デプロイ

### Vercel
```bash
npm run deploy:vercel
```

### Docker
```bash
docker build -t idps .
docker run -p 3000:3000 idps
```

## トラブルシューティング

### Firebase Emulator接続エラー
```bash
# Emulator が起動しているか確認
firebase emulators:start --only auth

# ポートが使用中の場合
lsof -ti:9099 | xargs kill -9
```

### Redis接続エラー
```bash
# Redis コンテナ確認
docker ps | grep redis

# ログ確認
docker logs idps-redis
```

### JWT キーエラー
```bash
# キー再生成
npm run keys:generate

# 権限確認
chmod 600 keys/private.pem
chmod 644 keys/public.pem
```

## 参考リンク

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Next.js Documentation](https://nextjs.org/docs)

## ライセンス

MIT License