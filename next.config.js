/** @type {import('next').NextConfig} */
module.exports = {
  // ポート設定（環境変数から取得、デフォルトは3005）
  env: {
    PORT: process.env.PORT || '3005',
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  
  // 実験的機能
  experimental: {
    appDir: true,
  },
  
  // 画像最適化設定
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
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
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Webpack設定
  webpack: (config, { dev, isServer }) => {
    // ファイルシステムの polyfill を無効化（クライアントサイド）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // 出力設定
  output: 'standalone',
  
  // TypeScript設定
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint設定
  eslint: {
    ignoreDuringBuilds: false,
  },
}; 