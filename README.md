# OIDC Identity Provider - Multiple Implementation Patterns

3つの異なるIdentity Providerパターンの実装例（自前実装、Firebase、AWS Cognito）

## 概要

このリポジトリは、OpenID Connect (OIDC) Identity Providerの3つの異なる実装パターンを提供します：
- **自前実装**: 完全なOIDCプロトコル自前実装
- **Firebase Authentication**: Firebaseを基盤とした実装
- **AWS Cognito**: Cognitoを基盤とした実装

## プロジェクト構成

```
idps/
├── providers/                   # 3つのIdPパターン
│   ├── custom/                 # 自前実装パターン
│   │   ├── app/
│   │   │   ├── login/          # ログインUI
│   │   │   ├── api/auth/       # OIDC エンドポイント
│   │   │   │   ├── authorize/  # 認可エンドポイント
│   │   │   │   ├── token/      # トークンエンドポイント
│   │   │   │   └── userinfo/   # ユーザー情報エンドポイント
│   │   │   └── api/health/     # ヘルスチェック
│   │   ├── lib/                # カスタム認証ロジック
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── firebase/               # Firebase実装パターン
│   │   ├── app/
│   │   │   ├── login/          # ログインUI
│   │   │   ├── api/auth/       # OIDC エンドポイント
│   │   │   │   ├── authorize/  # 認可エンドポイント
│   │   │   │   ├── token/      # トークンエンドポイント
│   │   │   │   └── userinfo/   # ユーザー情報エンドポイント
│   │   │   └── api/health/     # ヘルスチェック
│   │   ├── lib/
│   │   │   └── firebase.ts     # Firebase Auth設定
│   │   ├── firebase.json       # Firebase Emulator設定
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── cognito/                # AWS Cognito実装パターン
│       ├── app/
│       │   ├── login/          # ログインUI
│       │   ├── api/auth/       # OIDC エンドポイント
│       │   │   ├── authorize/  # 認可エンドポイント
│       │   │   ├── token/      # トークンエンドポイント
│       │   │   └── userinfo/   # ユーザー情報エンドポイント
│       │   └── api/health/     # ヘルスチェック
│       ├── lib/                # Cognito設定
│       ├── cloudformation/     # AWS設定
│       ├── package.json
│       └── README.md
│
├── example-client/             # 統合テスト用クライアント
│   ├── app/
│   │   ├── csr-demo/           # Client-Side Rendering例
│   │   ├── ssr-demo/           # Server-Side Rendering例
│   │   └── auth/
│   │       └── callback/
│   ├── components/
│   │   ├── client/             # Client Components
│   │   └── server/             # Server Components
│   ├── lib/                    # 認証ライブラリ設定
│   └── package.json
│
├── shared/                     # 共通ライブラリ・ユーティリティ
│   ├── types/                  # TypeScript型定義
│   ├── constants/              # 定数
│   └── utils/                  # ユーティリティ関数
│
├── README.md
└── architecture.md
```

## 実装パターン比較

### 1. 自前実装 (`/providers/custom`)
- **特徴**: 完全なOIDCプロトコル自前実装
- **技術**: Next.js + カスタムJWT + bcryptjs
- **適用場面**: 高度なカスタマイズが必要、既存システムとの密結合
- **メリット**: 完全制御、カスタマイズ自由度最大
- **デメリット**: 実装・保守コスト高、セキュリティリスク

### 2. Firebase Authentication (`/providers/firebase`)  
- **特徴**: Firebaseを基盤とした実装
- **技術**: Next.js + Firebase Auth + カスタムトークン
- **適用場面**: 迅速な開発、スタートアップ、中小規模
- **メリット**: 実装容易、豊富な認証方式、リアルタイム機能
- **デメリット**: Googleエコシステム依存、カスタマイズ制限

### 3. AWS Cognito (`/providers/cognito`)
- **特徴**: AWS Cognitoを基盤とした実装  
- **技術**: Next.js + AWS SDK + Cognito User Pools
- **適用場面**: エンタープライズ、AWSエコシステム、高スケーラビリティ
- **メリット**: エンタープライズ機能豊富、AWS統合、コンプライアンス対応
- **デメリット**: AWS依存、設定複雑、コスト

### 4. 統合テストクライアント (`/example-client`)
- **役割**: 3つのIdPパターンをテストするクライアント
- **技術**: Next.js + next-auth + oidc-client-ts
- **機能**:
  - ✅ SSR/CSR両対応
  - ✅ 複数IdP切り替え
  - ✅ PKCEサポート
  - ✅ セキュアなトークン管理

## 認証フロー図

```mermaid
sequenceDiagram
    participant Client as Client App
    participant IDP as OIDC Provider
    participant Firebase as Firebase Auth
    participant User as User

    User->>Client: アクセス
    Client->>IDP: Authorization Request
    IDP->>Firebase: 認証リダイレクト
    Firebase->>User: ログイン画面表示
    User->>Firebase: 認証情報入力
    Firebase->>IDP: 認証完了 (ID Token)
    IDP->>Client: Authorization Code
    Client->>IDP: Token Request (Code)
    IDP->>Client: Access Token + ID Token
    Client->>IDP: UserInfo Request
    IDP->>Client: User Information
```

詳細な技術仕様は [architecture.md](./architecture.md) を参照してください。

## セットアップガイド

### 前提条件

- Node.js 20.x以上
- Docker & Docker Compose
- Firebase CLI
- direnv (推奨)

### クイックスタート

3つのIdPパターンを起動する手順：

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd idps

# 2. 依存関係インストール (各provider)
cd providers/custom && npm install && cd ../..
cd providers/firebase && npm install && cd ../..  
cd providers/cognito && npm install && cd ../..
cd example-client && npm install && cd ..

# 3. 各IdPパターン起動
# 自前実装 (ポート3001)
cd providers/custom && npm run dev &

# Firebase実装 (ポート3000)  
cd providers/firebase && npm run dev &

# Cognito実装 (ポート3002)
cd providers/cognito && npm run dev &

# 4. テストクライアント起動
cd example-client && npm run dev
```

起動後のURL：
- **自前実装IdP**: http://localhost:3001
- **Firebase IdP**: http://localhost:3000  
- **Cognito IdP**: http://localhost:3002
- **テストクライアント**: http://localhost:3100
  - SSR Demo: http://localhost:3100/ssr-demo
  - CSR Demo: http://localhost:3100/csr-demo

## 詳細セットアップ

### 1. Firebase Emulator設定
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
cp .envrc.example .envrc
```

`.envrc` を編集:
```bash
# Firebase Configuration (Emulator用)
export NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
export NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Firebase Emulator
export NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# OIDC Configuration
export OIDC_ISSUER=http://localhost:3000
export JWT_PRIVATE_KEY_PATH=./keys/private.pem
export JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Redis (ローカル開発用)
export REDIS_URL=redis://localhost:6379

# Database (将来用)
export DATABASE_URL=postgresql://idps:password@localhost:5432/idps_dev
```

direnv を有効化:
```bash
direnv allow
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

## OIDC統合例

このリポジトリには、以下の統合パターンの実装例が含まれています：

### 1. Server-Side Rendering (SSR)
**場所**: `/example-client/app/ssr-demo`

- **ユースケース**: 従来のWebアプリケーション、SEO重要なページ
- **セキュリティ**: Authorization Code Flow + Server-side Session
- **ライブラリ**: `next-auth`

```typescript
// SSR例: app/ssr-demo/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export default async function SSRDemoPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  return <Dashboard user={session.user} />;
}
```

### 2. Client-Side Rendering (CSR)  
**場所**: `/example-client/app/csr-demo`

- **ユースケース**: インタラクティブなSPA、リアルタイムアプリ
- **セキュリティ**: Authorization Code Flow + PKCE
- **ライブラリ**: `oidc-client-ts`

```typescript
// CSR例: app/csr-demo/page.tsx
'use client';
import { useOidcAuth } from '@/components/client/OidcProvider';

export default function CSRDemoPage() {
  const { user, isAuthenticated, signIn } = useOidcAuth();
  
  if (!isAuthenticated) {
    return <button onClick={signIn}>Login</button>;
  }
  
  return <UserProfile user={user} />;
}
```

### 3. カスタム統合
任意の言語・フレームワークでの統合：

```bash
# Discovery エンドポイントで設定取得
curl http://localhost:3000/.well-known/openid-configuration

# 認証フロー開始
GET http://localhost:3000/api/auth/authorize
  ?response_type=code
  &client_id=your-client
  &redirect_uri=http://your-app/callback
  &scope=openid%20profile%20email
  &state=random-state
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