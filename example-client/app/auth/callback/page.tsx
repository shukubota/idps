'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const OIDC_CONFIG = {
  authority: 'http://localhost:3001',
  client_id: 'demo-app',
  redirect_uri: 'http://localhost:3100/auth/callback',
  token_endpoint: 'http://localhost:3001/api/auth/token'
}

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLパラメータから認可コードとstateを取得
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // エラーレスポンスの処理
        if (error) {
          throw new Error(`認証エラー: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`)
        }

        // 必須パラメータの確認
        if (!code) {
          throw new Error('認可コードが取得できませんでした')
        }

        // セッションストレージからPKCEパラメータを取得
        const codeVerifier = sessionStorage.getItem('code_verifier')
        const storedState = sessionStorage.getItem('state')
        const nonce = sessionStorage.getItem('nonce')

        if (!codeVerifier || !storedState) {
          throw new Error('認証パラメータが見つかりません。認証を最初からやり直してください。')
        }

        // state パラメータの検証（CSRF対策）
        if (state !== storedState) {
          throw new Error('state パラメータが一致しません。セキュリティ上の理由により認証を中止します。')
        }

        // トークンエンドポイントへのリクエスト準備
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: OIDC_CONFIG.client_id,
          redirect_uri: OIDC_CONFIG.redirect_uri,
          code_verifier: codeVerifier // PKCE検証
        })

        // トークン交換リクエスト
        const tokenResponse = await fetch(OIDC_CONFIG.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: tokenParams.toString()
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}))
          throw new Error(`トークン交換失敗: ${errorData.error || tokenResponse.status}${errorData.error_description ? ` - ${errorData.error_description}` : ''}`)
        }

        const tokens = await tokenResponse.json()

        // トークンの検証
        if (!tokens.access_token) {
          throw new Error('アクセストークンが取得できませんでした')
        }

        // IDトークンの基本検証（nonceのチェック）
        if (tokens.id_token && nonce) {
          try {
            // JWT payloadをデコード（署名検証は簡略化）
            const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]))
            
            if (idTokenPayload.nonce !== nonce) {
              console.warn('ID Token nonce mismatch - リプレイアタック対策')
            }

            // その他のID Tokenクレームログ出力（デバッグ用）
            console.log('ID Token Claims:', idTokenPayload)
          } catch (e) {
            console.warn('ID Token decode error:', e)
          }
        }

        // トークンをローカルストレージに保存
        localStorage.setItem('access_token', tokens.access_token)
        if (tokens.id_token) {
          localStorage.setItem('id_token', tokens.id_token)
        }
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token)
        }

        // セッションストレージのクリーンアップ
        sessionStorage.removeItem('code_verifier')
        sessionStorage.removeItem('state')
        sessionStorage.removeItem('nonce')

        setStatus('success')
        
        // 1秒後にホームページにリダイレクト
        setTimeout(() => {
          router.push('/')
        }, 1000)

      } catch (err) {
        console.error('Callback processing error:', err)
        setError((err as Error).message)
        setStatus('error')
        
        // セッションストレージのクリーンアップ
        sessionStorage.removeItem('code_verifier')
        sessionStorage.removeItem('state')
        sessionStorage.removeItem('nonce')
      }
    }

    // URLパラメータが利用可能になったらコールバック処理を実行
    if (searchParams) {
      handleCallback()
    }
  }, [searchParams, router])

  const retryAuth = () => {
    // ローカルストレージをクリアしてホームページに戻る
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              認証処理中...
            </h2>
            <p className="mt-2 text-gray-600">
              Identity Provider からの応答を処理しています
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              認証完了
            </h2>
            <p className="mt-2 text-gray-600">
              ログインに成功しました。ホームページにリダイレクトしています...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // エラー状態
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            認証エラー
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>
          <div className="mt-6">
            <button
              onClick={retryAuth}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              もう一度ログインする
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}