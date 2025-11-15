# Custom IdP Provider

自前実装のIdentity Providerです。OAuth 2.0/OpenID Connectプロトコルを完全に自前で実装します。

## 特徴

- 完全なOAuth 2.0/OIDC実装
- カスタム認証ロジック
- ユーザー管理機能
- セッション管理
- JWT署名・検証

## 起動方法

```bash
cd providers/custom
npm install
npm run dev
```

## エンドポイント

- Authorization: `/auth/authorize`
- Token: `/auth/token`
- UserInfo: `/auth/userinfo`
- Health Check: `/api/health`