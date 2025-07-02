# ビルドステージ
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 実行ステージ - Microsoft公式の軽量Playwrightイメージを使用
FROM mcr.microsoft.com/playwright:v1.50.0-jammy AS runner
WORKDIR /app

# ビルドステージから依存関係をコピー
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Chromiumのみインストール（Firefox、Safariは除外）
RUN npx playwright install chromium --with-deps

# アプリケーションコードをコピー
COPY . .

# Next.jsビルド
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 不要なファイルを削除してサイズ削減
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ポート設定
EXPOSE 3000

# 環境変数設定
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 起動コマンド
CMD ["npm", "start"] 