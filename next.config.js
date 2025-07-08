/** @type {import('next').NextConfig} */
const nextConfig = {
  // アプリケーションの最適化
  experimental: {
    // メモリ使用量を削減
    optimizePackageImports: ['@radix-ui/react-icons'],
    // TypeScriptの型チェックを高速化
    typedRoutes: false,
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['playwright'],
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
};

module.exports = nextConfig; 