/** @type {import('next').NextConfig} */
const nextConfig = {
  // ポート設定（環境変数から取得、デフォルトは3005）
  env: {
    PORT: process.env.PORT || 3005,
  },
  // その他の設定
  experimental: {
    appDir: true,
  },
  // 画像最適化設定
  images: {
    domains: ['localhost'],
  },
  // セキュリティヘッダー
  async headers() {
    return [
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