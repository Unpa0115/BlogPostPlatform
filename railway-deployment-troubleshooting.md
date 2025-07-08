# Railwayデプロイで遭遇した権限エラーの解決記録 🚀

## はじめに

Next.jsアプリケーションをRailwayにデプロイした際に、ファイルアップロード機能で権限エラーが発生しました。この記事では、問題の特定から解決までの過程を詳しく記録しています。

**TL;DR**: 環境変数の未設定、データベーステーブルの不足、暗号化キーの未設定など、複数の問題が重なっていましたが、一つずつ解決していくことで正常に動作するようになりました！

## 発生した問題

### 1. 新規登録エラー
```
Invalid email or password
Registration successful but login failed
```

### 2. ファイルアップロード権限エラー
```
EACCES: permission denied, open '/app/uploads/filename.mp4'
```

### 3. データベーステーブル不存在エラー
```
error: relation "uploads" does not exist
```

### 4. 暗号化マスターキー未設定エラー
```
ENCRYPTION_MASTER_KEY environment variable is required in production
```

### 5. PostgreSQL制約エラー
```
constraint: 'distribution_platforms_platform_type_check'
```

### 6. YouTube OAuth認証エラー
```
redirect_uri_mismatch
```

### 7. YouTube OAuth認証エラー「foreign key constraint violation」

**問題**: YouTube OAuth認証フローで外部キー制約違反エラーが発生

**エラーメッセージ**:
```
{"error":"Authentication failed","details":"insert or update on table \"youtube_tokens\" violates foreign key constraint \"youtube_tokens_user_id_fkey\""}
```

**原因**: 指定された`user_id`が`users`テーブルに存在しない

**解決策**:

#### 7.1 データベース初期化の実行
```bash
curl -X POST https://blogpostplatform-production.up.railway.app/api/init-db
```

#### 7.2 デフォルトユーザーの確認
```bash
curl -X GET https://blogpostplatform-production.up.railway.app/api/init-db
```

#### 7.3 手動でデフォルトユーザーを作成
データベースに直接接続して以下のSQLを実行：

```sql
-- PostgreSQLの場合
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  '10699750-312a-4f82-ada7-c8e5cf9b1fa8',
  'default@example.com',
  '$2a$12$hashedpasswordhere',
  NOW(),
  NOW()
);

-- SQLiteの場合
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  '10699750-312a-4f82-ada7-c8e5cf9b1fa8',
  'default@example.com',
  '$2a$12$hashedpasswordhere',
  datetime('now'),
  datetime('now')
);
```

#### 7.4 認証フローの再実行
1. YouTube認証ページで再度認証を実行
2. デバッグAPIで状態を確認：
   ```bash
   curl -X GET https://blogpostplatform-production.up.railway.app/api/platforms/youtube/debug
   ```

### 8. データベース関連の一般的な問題

#### 8.1 テーブルが存在しない
**解決策**: データベース初期化APIを実行
```bash
curl -X POST https://blogpostplatform-production.up.railway.app/api/init-db
```

#### 8.2 外部キー制約違反
**解決策**: 
1. 参照先のテーブルにデータが存在することを確認
2. 必要に応じてデフォルトデータを作成
3. 制約を一時的に無効化してデータを挿入後、制約を再有効化

#### 8.3 データベース接続エラー
**解決策**:
1. `DATABASE_URL`環境変数の確認
2. Railway PostgreSQLサービスの状態確認
3. 接続テストの実行：
   ```bash
   curl -X GET https://blogpostplatform-production.up.railway.app/api/init-db
   ```

## 問題の特定と調査

### 環境変数の未設定
最初に発見した問題は、`DATABASE_URL`環境変数が設定されていないことでした。

**確認方法：**
```bash
# Railway CLIでログを確認
railway logs
```

**解決策：**
Railwayダッシュボードで環境変数を設定：
- `DATABASE_URL`: PostgreSQL接続文字列
- `JWT_SECRET`: 認証用シークレットキー
- その他の必要な環境変数

### Railway Storageの権限問題

データベース接続は解決しましたが、今度はファイルアップロードで権限エラーが発生。

**エラーの詳細：**
```
Upload error: [Error: EACCES: permission denied, open '/app/uploads/filename.mp4'] {
  errno: -13,
  code: 'EACCES',
  syscall: 'open',
  path: '/app/uploads/filename.mp4'
}
```

## Railway CLIを使った調査

### ストレージボリュームの確認
```bash
# ボリューム一覧を確認
railway volume list
```

**結果：**
```
Volume: virtuous-volume
Attached to: BlogPostPlatform
Mount path: /app/uploads
Storage used: 0MB/500MB
```

ボリュームは正しく設定されていることが確認できました。

### ログでの詳細確認
```bash
# リアルタイムログを確認
railway logs
```

## 実装した解決策

### 1. 権限エラー対応のコード修正

**ディレクトリ作成と権限設定の改善：**
```typescript
// ディレクトリ作成と権限設定のヘルパー関数
async function ensureUploadDirectory() {
  try {
    // ディレクトリの存在確認
    await fs.access(UPLOAD_DIR)
    console.log(`✅ Upload directory exists: ${UPLOAD_DIR}`)
  } catch (error) {
    console.log(`📁 Creating upload directory: ${UPLOAD_DIR}`)
    try {
      // ディレクトリを作成
      await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o755 })
      console.log(`✅ Upload directory created: ${UPLOAD_DIR}`)
    } catch (mkdirError) {
      console.error(`❌ Failed to create upload directory: ${mkdirError}`)
      // 代替ディレクトリを試す
      const fallbackDir = '/tmp/uploads'
      console.log(`🔄 Trying fallback directory: ${fallbackDir}`)
      await fs.mkdir(fallbackDir, { recursive: true, mode: 0o755 })
      return fallbackDir
    }
  }
  return UPLOAD_DIR
}
```

**ファイル保存時の権限設定：**
```typescript
// ファイル保存
const buffer = Buffer.from(await file.arrayBuffer())
await fs.writeFile(filePath, buffer, { mode: 0o644 })
console.log(`✅ File saved successfully: ${fileName}`)

// メタデータ保存
await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 })
console.log(`✅ Metadata saved: ${fileName}.metadata.json`)
```

### 2. データベーステーブルの追加

PostgreSQLで`uploads`テーブルが存在しないエラーが発生。SQLite用のテーブル定義はあったものの、PostgreSQL用が不足していました。

**PostgreSQL用のuploadsテーブル定義を追加：**
```sql
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  processed_file_path TEXT,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 3. 暗号化マスターキーの設定

プラットフォームCredentialsの暗号化に必要な`ENCRYPTION_MASTER_KEY`が未設定でした。

**安全なマスターキーの生成：**
```bash
# 32バイトのランダムキーを生成
node -e "console.log('Generated ENCRYPTION_MASTER_KEY:', require('crypto').randomBytes(32).toString('base64'))"
```

**Railway環境変数への設定：**
```bash
railway variables --set "ENCRYPTION_MASTER_KEY=your-generated-encryption-master-key-here"
```

### 4. PostgreSQL制約の修正

`distribution_platforms`テーブルの`platform_type`制約に`openai`が含まれていませんでした。

**制約の更新：**
```sql
-- 既存の制約を削除
ALTER TABLE distribution_platforms 
DROP CONSTRAINT IF EXISTS distribution_platforms_platform_type_check

-- 新しい制約を追加（openaiを含む）
ALTER TABLE distribution_platforms 
ADD CONSTRAINT distribution_platforms_platform_type_check 
CHECK (platform_type IN ('voicy', 'youtube', 'spotify', 'openai'))
```

### 5. 外部ストレージ対応の準備

Railway Storageがうまく動作しない場合の代替案として、AWS S3やCloudflare R2の設定も準備しました。

**環境変数の追加：**
```bash
# Storage Configuration
STORAGE_TYPE=local
# Options: local, s3, r2

# AWS S3 (if using S3)
AWS_S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Cloudflare R2 (if using R2)
CLOUDFLARE_R2_BUCKET=your-r2-bucket-name
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-r2-secret-key
```

### 6. YouTube OAuth認証の問題と解決策

#### 6.1 環境変数の設定
Railwayダッシュボードで以下の環境変数を設定：

```bash
NEXT_PUBLIC_APP_URL=https://blogpostplatform-production.up.railway.app
```

#### 6.2 Google Cloud Consoleでの設定
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. YouTube Data API v3のOAuth 2.0クライアントIDを選択
5. 「承認済みのリダイレクトURI」に以下を追加：
   ```
   https://blogpostplatform-production.up.railway.app/api/platforms/youtube/callback
   ```

#### 6.3 デバッグ情報の確認
```bash
curl -X GET https://blogpostplatform-production.up.railway.app/api/platforms/youtube/debug
```

## デプロイサイズの最適化

### ファイルサイズ制限エラー
```
Failed to upload code. File too large (275581034 bytes): 413 Request Entity Too Large
```

**解決策：.gitignoreの更新**
```gitignore
# アップロードファイル（デプロイサイズ削減のため）
/uploads/
/datasource/

# データベースファイル
*.db
*.sqlite
*.sqlite3

# ログファイル
*.log

# 一時ファイル
*.tmp
*.temp
```

## 動作確認とテスト

### 1. データベース初期化の確認
```bash
curl -X POST https://blogpostplatform-production.up.railway.app/api/init-db
```

### 2. 暗号化機能のテスト
```bash
curl -X GET https://blogpostplatform-production.up.railway.app/api/test-encryption
```

**結果：**
```json
{
  "success": true,
  "message": "All encryption tests passed",
  "tests": [
    {"name": "YouTube", "success": true},
    {"name": "Voicy", "success": true},
    {"name": "Spotify", "success": true},
    {"name": "OpenAI", "success": true}
  ]
}
```

### 3. 制約更新の確認
```bash
curl -X POST https://blogpostplatform-production.up.railway.app/api/update-constraints
```

## プラットフォーム連携の設定

### Spotify RSS Feed URL
```
https://blogpostplatform-production.up.railway.app/rss/spotify-feed.xml
```

**特徴：**
- 最大50エピソードまで表示（Spotify制限対応）
- 古いエピソードは自動的にアーカイブされる
- 音声ファイルのみが対象
- 日本語対応

### YouTube OAuthリダイレクトURI
```
https://blogpostplatform-production.up.railway.app/api/platforms/youtube/callback
```

**特徴：**
- リフレッシュトークンの自動保存
- トークンの有効期限管理
- 複数ユーザー対応
- エラーハンドリング完備

## 学んだこと

### 1. Railway CLIの活用
Railway CLIを使うことで、デプロイ状況やストレージの状態を簡単に確認できます。

**便利なコマンド：**
- `railway status`: プロジェクトの状態確認
- `railway volume list`: ストレージボリュームの確認
- `railway logs`: リアルタイムログの確認
- `railway variables`: 環境変数の確認・設定

### 2. 権限設定の重要性
コンテナ環境では、ファイルシステムの権限設定が重要です。適切な権限（`0o755`、`0o644`）を設定することで、多くの問題を回避できます。

### 3. データベースマイグレーションの重要性
本番環境では、開発環境と異なるデータベーススキーマが必要になることがあります。適切なマイグレーション機能を実装することで、スムーズな移行が可能です。

### 4. 暗号化キーの管理
本番環境では、セキュリティのため暗号化キーを環境変数で管理する必要があります。適切なキー生成と管理方法を理解することが重要です。

### 5. フォールバック機能の実装
本番環境では予期しない問題が発生する可能性があります。代替手段を用意することで、サービスの可用性を向上させることができます。

### 6. デプロイサイズの最適化
大きなファイルが含まれているとデプロイが失敗することがあります。`.gitignore`を適切に設定し、不要なファイルを除外することが重要です。

## トラブルシューティングのベストプラクティス

### 1. 段階的な問題解決
一度に複数の問題を解決しようとすると混乱します。一つずつ問題を特定し、解決していくことが重要です。

### 2. ログの活用
エラーメッセージやログを詳しく確認することで、問題の原因を特定できます。

### 3. テスト環境での確認
本番環境にデプロイする前に、ローカル環境やテスト環境で動作確認を行うことが重要です。

### 4. 環境変数の管理
本番環境では、機密情報を環境変数で管理し、コードにハードコーディングしないことが重要です。

### 5. バックアップと復旧
問題が発生した場合に備えて、バックアップと復旧手順を準備しておくことが重要です。

## 今後の改善点

### 1. 監視とログの改善
本番環境での問題を早期発見するため、以下の改善を計画：

- エラーログの自動監視
- アラート機能の実装
- パフォーマンスメトリクスの収集

### 2. 外部ストレージの検討
Railway Storageが安定しない場合、以下の代替案を検討：

- **AWS S3**: 最も安定したクラウドストレージ
- **Cloudflare R2**: S3互換でコスト効率が良い
- **Google Cloud Storage**: 高パフォーマンス

### 3. 自動化の強化
デプロイプロセスを自動化し、人的ミスを減らす：

- CI/CDパイプラインの構築
- 自動テストの実装
- デプロイ前の自動チェック

## まとめ

Railwayへのデプロイで遭遇した問題は、環境変数の未設定、データベーステーブルの不足、暗号化キーの未設定、PostgreSQL制約の問題など、複数の要因が重なっていました。

しかし、一つずつ問題を特定し、適切な解決策を実装することで、最終的には正常に動作するアプリケーションを構築することができました。

**重要なポイント：**
1. **段階的な問題解決**: 一度に複数の問題を解決しようとしない
2. **ログの活用**: エラーメッセージを詳しく確認する
3. **環境変数の管理**: 機密情報は環境変数で管理する
4. **テストの重要性**: 本番環境にデプロイする前にテストする
5. **フォールバック機能**: 代替手段を用意する

本番環境でのデプロイでは、このような予期しない問題が発生する可能性があります。事前の準備と適切な対応策を用意することで、サービスの安定性を確保できます。

## 参考リンク

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/reference/cli)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Node.js File System Permissions](https://nodejs.org/api/fs.html#file-system-permissions)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Crypto Module Documentation](https://nodejs.org/api/crypto.html)
- [Google Cloud Console](https://console.cloud.google.com/)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)

---

*この記事は、実際のトラブルシューティング経験に基づいて作成されています。同じような問題に遭遇した際の参考になれば幸いです！* 🚀 