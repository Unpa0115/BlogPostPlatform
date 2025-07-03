# ビルドステージ
FROM node:18-alpine AS builder
WORKDIR /app

# パッケージマネージャーとキャッシュ設定
RUN npm config set cache /tmp/.npm-cache --global

# package.jsonを先にコピー（キャッシュ効率化）
COPY package*.json ./

# 本番用依存関係のみインストール
RUN npm ci --only=production --no-audit --no-fund

# アプリケーションコードをコピー
COPY . .

# Next.jsビルド
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build

# 実行ステージ - 軽量なNode.js Alpine
FROM node:18-alpine AS runner
WORKDIR /app

# 必要なシステム依存関係のみインストール
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    && rm -rf /var/cache/apk/*

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# package.jsonをコピー
COPY --from=builder /app/package*.json ./

# 本番用依存関係のみインストール
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# ビルド成果物をコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/types ./src/types

# アップロードディレクトリの作成
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# 権限設定
RUN chown -R nextjs:nodejs /app

# 不要なファイルを削除
RUN rm -rf /tmp/* /var/tmp/* /root/.npm /root/.cache

# ポート設定
EXPOSE 3000

# 環境変数設定
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-old-space-size=768"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# ユーザー切り替え
USER nextjs

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 起動コマンド
CMD ["npm", "start"] 