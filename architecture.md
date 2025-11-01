# IDP (Identity Provider) Architecture

## 概要

Firebase Authenticationを基盤とした最小限のIdentity Provider (IDP)システム。OIDC準拠で他システムとの認証統合を可能にします。

## アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │────│   OIDC Provider │────│ Firebase Auth   │
│                 │    │   (Next.js)     │    │                 │
│ - Web App       │    │                 │    │ - User Auth     │
│ - Mobile App    │    │ - /auth/*       │    │ - Token Mgmt    │
│ - Other Systems │    │ - /api/auth/*   │    │ - MFA Support   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**認証フロー:**
1. Client Apps → OIDC Authorization Request
2. IDP → Firebase Auth で認証
3. IDP → OIDC準拠トークン発行
4. Client Apps → アクセストークンでAPI利用

## 技術スタック

### コア
- **Framework**: Next.js 14 (App Router)
- **Authentication**: Firebase Authentication
- **Protocol**: OpenID Connect (OIDC) 1.0
- **Hosting**: Vercel

### 準拠標準
- **OpenID Connect Core 1.0**: [RFC](https://openid.net/specs/openid-connect-core-1_0.html)
- **OAuth 2.0**: [RFC 6749](https://tools.ietf.org/html/rfc6749)
- **JWT**: [RFC 7519](https://tools.ietf.org/html/rfc7519)
- **Well-Known URIs**: [RFC 5785](https://tools.ietf.org/html/rfc5785)

### UI (最小限)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (必要な部分のみ)
- **Forms**: React Hook Form + Zod

## コア機能 (最小限)

### 1. OIDC Provider
- **認可エンドポイント**: `/api/auth/authorize`
- **トークンエンドポイント**: `/api/auth/token`
- **JWKS エンドポイント**: `/api/auth/.well-known/jwks.json`
- **Discovery**: `/api/auth/.well-known/openid-configuration`

### 2. Firebase Auth 統合
- **ログイン/サインアップ UI**
- **Firebase ID Token → OIDC Token 変換**
- **ユーザー情報 API**: `/api/auth/userinfo`

### 3. サポート認証方式
- **Email/Password**
- **ソーシャルログイン** (Google, GitHub等)
- **MFA** (Firebase Auth機能を利用)

## プロジェクト構造 (最小限)

```
idps/
├── app/
│   ├── auth/                  # 認証UI (ログイン/サインアップ)
│   ├── api/auth/             # OIDC エンドポイント
│   │   ├── authorize/        # 認可エンドポイント
│   │   ├── token/           # トークンエンドポイント
│   │   ├── userinfo/        # ユーザー情報
│   │   └── .well-known/     # OIDC Discovery
│   └── page.tsx             # ホームページ
│
├── components/
│   ├── auth/                 # 認証関連コンポーネント
│   └── ui/                   # 基本UIコンポーネント
│
├── lib/
│   ├── firebase.ts           # Firebase設定
│   ├── oidc.ts              # OIDC utilities
│   └── jwt.ts               # JWT処理
│
└── types/
    └── auth.ts              # 認証関連型定義
```

## データストレージ

### Firebase Auth (メイン)
- **ユーザー管理**: Firebase Authがすべて処理
- **認証情報**: Email/Password, ソーシャルログイン
- **トークン**: Firebase ID Token

### 追加データ (必要に応じて)
- **OIDCクライアント設定**: 環境変数 or JSONファイル
- **セッション管理**: メモリ or Redis (本格運用時)

## 主要実装ポイント

### 1. OIDC Authorization Code Flow
```typescript
// /api/auth/authorize
1. クライアント認証情報検証
2. Firebase Auth へリダイレクト
3. 認証成功後 authorization_code 発行
4. クライアントへリダイレクト
```

### 2. Token Exchange
```typescript  
// /api/auth/token
1. authorization_code 検証
2. Firebase ID Token 取得
3. OIDC準拠 access_token 生成
4. JWT形式で返却
```

### 3. セキュリティ
- **HTTPS必須**: 本番環境
- **CSRF対策**: state parameter
- **JWT署名**: RS256アルゴリズム
- **トークン有効期限**: 1時間 (推奨)

## 開発ステップ (最小限)

### Step 1: セットアップ (1-2日)
1. Next.js プロジェクト作成
2. Firebase プロジェクト作成・設定
3. 基本UI設定 (Tailwind CSS)

### Step 2: Firebase Auth 統合 (2-3日)  
1. Firebase Auth SDK 統合
2. ログイン/サインアップ UI
3. 認証状態管理

### Step 3: OIDC Provider 実装 (3-5日)
1. `/api/auth/authorize` エンドポイント
2. `/api/auth/token` エンドポイント  
3. JWT生成・検証ロジック
4. Discovery エンドポイント

### Step 4: テスト・デプロイ (1-2日)
1. 他システムとの統合テスト
2. Vercel デプロイ
3. 本番環境設定

**総開発期間: 1-2週間**

## 次のステップ

1. **Next.js プロジェクト初期化**
2. **Firebase Console でプロジェクト作成**  
3. **OIDC エンドポイント実装**
4. **クライアントアプリとの統合テスト**

最小限の OIDC Provider として、他システムとの認証統合が可能になります。