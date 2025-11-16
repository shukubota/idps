/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode
  reactStrictMode: true,
  
  // 開発時のログ設定
  logging: {
    fetches: {
      fullUrl: true
    }
  },

  // 本番時の最適化
  swcMinify: true,
  
  // 実験的機能
  experimental: {
    // App Router (Next.js 13+)
    appDir: true
  }
}

module.exports = nextConfig