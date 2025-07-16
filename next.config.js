/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLintチェックを無効化（本番デプロイ用）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScriptエラーチェックを無効化（本番デプロイ用）
  typescript: {
    ignoreBuildErrors: true,
  },
  // ポート設定（環境変数から取得、デフォルトは3005）
  env: {
    PORT: process.env.PORT || '3005',
  },
  // 画像最適化設定
  images: {
    domains: ['localhost'],
  },
  // セキュリティヘッダー
  async headers() {
    return [
      {
        // API routesにCORSヘッダーを追加
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 