# AWS Cognito IdP Provider

AWS Cognitoを使用したIdentity Providerです。

## 特徴

- AWS Cognito User Poolsを使用
- マネージドな認証サービス
- スケーラブル
- MFA対応
- ソーシャルログイン対応

## セットアップ

1. AWS CLIの設定
2. Cognitoリソースのデプロイ
3. 環境変数の設定

## 起動方法

```bash
cd providers/cognito
npm install
npm run dev
```

## AWS設定

CloudFormationテンプレートでCognitoリソースを作成:

```bash
aws cloudformation deploy --template-file cloudformation/cognito.yml --stack-name idp-cognito
```

## エンドポイント

- Authorization: `/auth/authorize` (Cognitoへリダイレクト)
- Token: `/auth/token` (Cognitoトークン交換)
- UserInfo: `/auth/userinfo` (Cognito APIから取得)
- Health Check: `/api/health`