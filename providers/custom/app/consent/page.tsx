'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ConsentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [scopes, setScopes] = useState<string[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadConsentData = async () => {
      try {
        // 認可パラメータを取得
        const clientId = searchParams.get('client_id')
        const scope = searchParams.get('scope')
        const redirectUri = searchParams.get('redirect_uri')

        if (!clientId || !scope || !redirectUri) {
          setError('認可リクエストのパラメータが不正です')
          return
        }

        // スコープをパース
        const requestedScopes = scope.split(' ')
        setScopes(requestedScopes)

        // クライアント情報を設定（実際の実装では APIから取得）
        setClientInfo({
          name: clientId === 'demo-app' ? 'デモアプリケーション' : clientId,
          description: 'OIDC クライアントアプリケーション'
        })

        // ユーザー情報を設定
        setUserInfo({
          name: 'テスト ユーザー',
          email: 'test@example.com'
        })

      } catch (err) {
        setError('認可情報の取得に失敗しました')
      }
    }

    loadConsentData()
  }, [searchParams])

  const handleConsent = async (granted: boolean) => {
    setLoading(true)
    setError('')

    try {
      if (granted) {
        // 同意した場合：認可エンドポイントに POST で同意を送信
        const consentData = {
          client_id: searchParams.get('client_id'),
          scope: searchParams.get('scope'),
          consent: 'granted',
          // 重要：認可パラメータをすべて含める
          redirect_uri: searchParams.get('redirect_uri'),
          state: searchParams.get('state'),
          nonce: searchParams.get('nonce'),
          code_challenge: searchParams.get('code_challenge'),
          code_challenge_method: searchParams.get('code_challenge_method'),
          response_type: searchParams.get('response_type'),
        }

        const response = await fetch('/api/auth/authorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(consentData),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.redirectUrl) {
            window.location.href = result.redirectUrl
            return
          }
        }
        
        setError('認可処理に失敗しました')
      } else {
        // 拒否した場合：エラーでクライアントにリダイレクト
        const redirectUri = searchParams.get('redirect_uri')
        const state = searchParams.get('state')
        
        const errorUrl = new URL(redirectUri!)
        errorUrl.searchParams.set('error', 'access_denied')
        errorUrl.searchParams.set('error_description', 'User denied the request')
        if (state) {
          errorUrl.searchParams.set('state', state)
        }
        
        window.location.href = errorUrl.toString()
      }
    } catch (err) {
      setError('処理中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getScopeDescription = (scope: string) => {
    const descriptions: { [key: string]: string } = {
      'openid': 'あなたの基本的なプロフィール情報',
      'profile': 'あなたの名前と基本情報',
      'email': 'あなたのメールアドレス',
      'phone': 'あなたの電話番号',
    }
    return descriptions[scope] || scope
  }

  if (error && !clientInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">認可エラー</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-center">アプリケーション認可</h1>
            <p className="text-blue-100 text-center text-sm mt-2">
              アプリケーションがあなたの情報へのアクセスを要求しています
            </p>
          </div>

          <div className="p-6">
            {/* ユーザー情報 */}
            <div className="flex items-center mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{userInfo?.name}</p>
                <p className="text-sm text-gray-500">{userInfo?.email}</p>
              </div>
            </div>

            {/* クライアント情報 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {clientInfo?.name}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                {clientInfo?.description}
              </p>
              <p className="text-sm text-gray-700">
                以下の情報へのアクセスを要求しています：
              </p>
            </div>

            {/* 権限一覧 */}
            <div className="mb-6">
              <ul className="space-y-3">
                {scopes.map((scope) => (
                  <li key={scope} className="flex items-center">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">{getScopeDescription(scope)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ボタン */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleConsent(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                拒否
              </button>
              <button
                onClick={() => handleConsent(true)}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                許可
              </button>
            </div>

            {/* フッター */}
            <p className="text-xs text-gray-500 text-center mt-4">
              このアプリケーションは安全な接続を使用してあなたの情報を保護します
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}