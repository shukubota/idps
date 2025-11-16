'use client'

import { useState, useEffect } from 'react'

// OIDC設定
const OIDC_CONFIG = {
  authority: 'http://localhost:3001',
  client_id: 'demo-app', // 公開クライアント（PKCE使用）
  redirect_uri: 'http://localhost:3100/auth/callback',
  scope: 'openid profile email phone',
  response_type: 'code',
  // PKCEパラメータは動的に生成
}

// PKCE用ヘルパー関数
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export default function HomePage() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 認証状態の確認
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      fetchUserInfo(accessToken)
    }
  }, [])

  // OIDC認証開始
  const startLogin = async () => {
    try {
      // PKCE パラメータ生成
      const codeVerifier = generateRandomString(128)
      const codeChallenge = await sha256(codeVerifier)
      const state = generateRandomString(32)
      const nonce = generateRandomString(32)

      // セッションストレージに保存（callback時に使用）
      sessionStorage.setItem('code_verifier', codeVerifier)
      sessionStorage.setItem('state', state)
      sessionStorage.setItem('nonce', nonce)

      // 認可エンドポイントのURL生成
      const params = new URLSearchParams({
        response_type: OIDC_CONFIG.response_type,
        client_id: OIDC_CONFIG.client_id,
        redirect_uri: OIDC_CONFIG.redirect_uri,
        scope: OIDC_CONFIG.scope,
        state: state,
        nonce: nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        max_age: '3600' // 認証からの経過時間の最大許容値
      })

      const authUrl = `${OIDC_CONFIG.authority}/api/auth/authorize?${params}`
      
      // IdPにリダイレクト
      window.location.href = authUrl

    } catch (err) {
      setError('認証の開始に失敗しました: ' + (err as Error).message)
    }
  }

  // ユーザー情報取得
  const fetchUserInfo = async (accessToken: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${OIDC_CONFIG.authority}/api/auth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`UserInfo取得失敗: ${response.status}`)
      }

      const userInfo = await response.json()
      setUserInfo(userInfo)
    } catch (err) {
      setError('ユーザー情報の取得に失敗しました: ' + (err as Error).message)
      // アクセストークンが無効な場合は削除
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
    } finally {
      setLoading(false)
    }
  }

  // ログアウト
  const logout = async () => {
    try {
      // IdPのセッションも削除
      await fetch(`${OIDC_CONFIG.authority}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include' // Cookie送信のため
      }).catch(() => {
        // ネットワークエラーは無視（クライアント側は削除）
      })
    } catch (error) {
      console.warn('IdP logout failed:', error)
    }

    // クライアント側のトークン・状態をクリア
    localStorage.removeItem('access_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.clear()
    setUserInfo(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {!userInfo ? (
        // 未ログイン状態
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              飲食店予約システム
            </h2>
            <p className="text-gray-600 mb-8">
              OpenID Connect による統合認証デモ<br />
            </p>
            
            <button
              onClick={startLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
              ログインして予約を開始
            </button>

            <div className="mt-8 text-sm text-gray-500">
              <p>テストアカウント:</p>
              <p>Email: test@example.com</p>
              <p>Password: SecureTest2024!@</p>
            </div>
          </div>
        </div>
      ) : (
        // ログイン済み状態
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                ようこそ、{userInfo.name || userInfo.given_name}さん
              </h2>
              <button
                onClick={logout}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
              >
                ログアウト
              </button>
            </div>

            {/* ユーザー情報表示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">基本情報</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
                    <dd className="text-sm text-gray-900">{userInfo.sub}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">お名前</dt>
                    <dd className="text-sm text-gray-900">{userInfo.name}</dd>
                  </div>
                  {userInfo.given_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">名</dt>
                      <dd className="text-sm text-gray-900">{userInfo.given_name}</dd>
                    </div>
                  )}
                  {userInfo.family_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">姓</dt>
                      <dd className="text-sm text-gray-900">{userInfo.family_name}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">連絡先</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                    <dd className="text-sm text-gray-900">
                      {userInfo.email}
                      {userInfo.email_verified && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          確認済み
                        </span>
                      )}
                    </dd>
                  </div>
                  {userInfo.phone_number && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                      <dd className="text-sm text-gray-900">
                        {userInfo.phone_number}
                        {userInfo.phone_number_verified && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            確認済み
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* 日本語名情報 */}
            {(userInfo['given_name#ja-Kana-JP'] || userInfo['family_name#ja-Kana-JP']) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-3">日本語表記</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userInfo['given_name#ja-Kana-JP'] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">名（カナ）</dt>
                      <dd className="text-sm text-gray-900">{userInfo['given_name#ja-Kana-JP']}</dd>
                    </div>
                  )}
                  {userInfo['family_name#ja-Kana-JP'] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">姓（カナ）</dt>
                      <dd className="text-sm text-gray-900">{userInfo['family_name#ja-Kana-JP']}</dd>
                    </div>
                  )}
                  {userInfo['given_name#ja-Hani-JP'] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">名（漢字）</dt>
                      <dd className="text-sm text-gray-900">{userInfo['given_name#ja-Hani-JP']}</dd>
                    </div>
                  )}
                  {userInfo['family_name#ja-Hani-JP'] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">姓（漢字）</dt>
                      <dd className="text-sm text-gray-900">{userInfo['family_name#ja-Hani-JP']}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

        </div>
      )}

      <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}