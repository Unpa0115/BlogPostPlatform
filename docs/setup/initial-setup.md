# 初期セットアップガイド

## 前提条件

- Node.js 18.0.0以上
- npm または yarn
- Git
- Railwayアカウント（デプロイ用）
- OpenAI API キー
- Browserless.io API キー

## 1. リポジトリのクローン

```bash
git clone https://github.com/your-repo/BlogPostPlatform.git
cd BlogPostPlatform
```

## 2. 依存関係のインストール

```bash
npm install
# または
yarn install
```

## 3. 環境変数の設定

`.env.local`ファイルを作成し、必要な環境変数を設定します：

```bash
cp env.example .env.local
```

詳細な環境変数設定は[環境変数設定ガイド](./environment-variables.md)を参照してください。

## 4. データベースの初期化

```bash
npm run db:init
# または
yarn db:init
```

## 5. 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
```

ブラウザで `http://localhost:3000` にアクセスしてアプリケーションが正常に動作することを確認してください。

## 6. プラットフォーム設定

各プラットフォームの設定を行います：

- [YouTube設定](../platforms/youtube.md)
- [Voicy設定](../platforms/voicy.md)
- [Spotify設定](../platforms/spotify.md)

## 7. テストの実行

```bash
npm run test
# または
yarn test
```

## 8. ビルドテスト

```bash
npm run build
# または
yarn build
```

## トラブルシューティング

### Node.jsバージョンエラー

```bash
# Node.jsバージョンを確認
node --version

# 必要に応じてNode.jsをアップデート
nvm install 18
nvm use 18
```

### 依存関係エラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### 環境変数エラー

環境変数が正しく設定されているか確認：

```bash
# 環境変数を確認（開発時のみ）
npm run debug:env
```

### データベース接続エラー

```bash
# データベース接続をテスト
npm run db:test
```

## 次のステップ

1. [環境変数設定](./environment-variables.md)を完了
2. [プラットフォーム設定](../platforms/)を実行
3. [デプロイ方法](./deployment.md)を確認
4. [トラブルシューティング](../troubleshooting/)を参照

## 開発者向け情報

### 開発環境の推奨設定

- VS Code + 推奨拡張機能
- ESLint + Prettier
- TypeScript strict mode
- Git hooks (husky)

### デバッグ方法

```bash
# デバッグモードで起動
npm run dev:debug

# ログレベルを詳細に設定
DEBUG=* npm run dev
```

### コード品質チェック

```bash
# Lint実行
npm run lint

# 型チェック
npm run type-check

# フォーマット
npm run format
``` 