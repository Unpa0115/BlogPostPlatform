# ビルドステージ
FROM node:18-alpine AS builder
WORKDIR /app

# package.jsonを先にコピー（キャッシュ効率化）
COPY package*.json ./

# 全依存関係をインストール（ビルド用）
RUN npm ci

# アプリケーションコードをコピー
COPY . .

# Next.jsビルド
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 実行ステージ - Microsoft公式の軽量Playwrightイメージを使用
FROM mcr.microsoft.com/playwright:v1.50.0-jammy AS runner
WORKDIR /app

# 本番用依存関係のみをインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルドステージから必要なファイルのみをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/types ./src/types

# 不要なブラウザを削除（Chromiumのみ残す）
RUN rm -rf /ms-playwright/firefox* /ms-playwright/webkit* \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && rm -rf /usr/share/doc /usr/share/man /usr/share/locale \
    && rm -rf /var/cache/apt /var/lib/apt \
    && rm -rf /root/.npm /root/.cache

# ポート設定
EXPOSE 3000

# 環境変数設定
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 起動コマンド
CMD ["npm", "start"] 