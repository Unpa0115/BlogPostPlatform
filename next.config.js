/** @type {import('next').NextConfig} */
const nextConfig = {
  // アプリケーションの最適化
  experimental: {
    // メモリ使用量を削減
    optimizePackageImports: ['@radix-ui/react-icons'],
    // TypeScriptの型チェックを高速化
    typedRoutes: false,
    // 不要なフォント最適化を無効化
    fontLoaders: [],
  },
  
  // ビルド時の最適化
  compress: true,
  
  // 画像最適化の設定
  images: {
    // 軽量化のため、外部画像を制限
    domains: [],
    // 画像最適化を無効化してメモリ使用量を削減
    unoptimized: true,
  },
  
  // webpack設定の最適化
  webpack: (config, { isServer }) => {
    // メモリ使用量を削減するためのwebpack設定
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
    
    // 不要なpolyfillを削除
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  // 本番環境での最適化
  productionBrowserSourceMaps: false,
  
  // 不要なtelemetryを無効化
  telemetry: false,
  
  // ESLintの設定
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScriptの設定
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 静的ファイルの最適化
  trailingSlash: false,
  
  // APIルートの最適化
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  
  // 環境変数の設定
  env: {
    // メモリ制限を環境変数として設定
    NODE_OPTIONS: '--max-old-space-size=768',
  },
  
  // セキュリティヘッダーの設定（軽量化）
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // リダイレクトの最適化
  redirects: async () => {
    return [];
  },
  
  // リライトの最適化
  rewrites: async () => {
    return [];
  },
  
  // 出力設定
  output: 'standalone',
  
  // 実験的な機能（Railway最適化）
  experimental: {
    ...nextConfig.experimental,
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['playwright'],
    // 静的生成の最適化
    isrMemoryCacheSize: 0,
  },
};

module.exports = nextConfig; 