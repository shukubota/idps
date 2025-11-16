'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      // First check if session exists in Redis
      const sessionResponse = await fetch('/api/auth/validate-session', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!sessionResponse.ok) {
        // Session not found in Redis, redirect to login
        router.push('/login')
        return
      }

      // Session exists, get user info
      const response = await fetch('/api/auth/userinfo', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessionInfo(data)
      } else {
        // No valid session, redirect to login
        router.push('/login')
        return
      }
    } catch (error) {
      console.error('Session check failed:', error)
      router.push('/login')
      return
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const clearCookies = () => {
    // ブラウザの全Cookieをクリア
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Identity Provider Dashboard</h1>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">セッション情報</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ログアウト
              </button>
              
              <button
                onClick={clearCookies}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                全Cookieクリア
              </button>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">デバッグ情報</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">現在のCookie:</h3>
                <pre className="text-sm text-gray-600 overflow-auto">
                  {document.cookie || 'No cookies found'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}