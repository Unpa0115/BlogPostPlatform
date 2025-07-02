# Microsoft公式の軽量Playwrightイメージを使用
FROM mcr.microsoft.com/playwright:v1.50.0-jammy AS base

# 作業ディレクトリ設定
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

# 本番用依存関係のみに変更（devDependenciesを削除）
RUN npm ci --only=production

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