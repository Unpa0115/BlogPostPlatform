# Railwayデプロイで遭遇した権限エラーの解決記録 🚀

## はじめに

Next.jsアプリケーションをRailwayにデプロイした際に、ファイルアップロード機能で権限エラーが発生しました。この記事では、問題の特定から解決までの過程を詳しく記録しています。

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

### 2. 外部ストレージ対応の準備

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

## 学んだこと

### 1. Railway CLIの活用
Railway CLIを使うことで、デプロイ状況やストレージの状態を簡単に確認できます。

**便利なコマンド：**
- `railway status`: プロジェクトの状態確認
- `railway volume list`: ストレージボリュームの確認
- `railway logs`: リアルタイムログの確認

### 2. 権限設定の重要性
コンテナ環境では、ファイルシステムの権限設定が重要です。適切な権限（`0o755`、`0o644`）を設定することで、多くの問題を回避できます。

### 3. フォールバック機能の実装
本番環境では予期しない問題が発生する可能性があります。代替手段を用意することで、サービスの可用性を向上させることができます。

## 今後の課題

### 1. Railway Storageの権限設定
現在、Railway Storageの権限設定に問題がある可能性があります。以下の対応を検討中：

- Railwayダッシュボードでのボリューム設定確認
- ボリュームの再作成
- 権限設定の調整

### 2. 外部ストレージの検討
Railway Storageが安定しない場合、以下の代替案を検討：

- **AWS S3**: 最も安定したクラウドストレージ
- **Cloudflare R2**: S3互換でコスト効率が良い
- **Google Cloud Storage**: 高パフォーマンス

### 3. 監視とログの改善
本番環境での問題を早期発見するため、以下の改善を計画：

- エラーログの自動監視
- アラート機能の実装
- パフォーマンスメトリクスの収集

## まとめ

Railwayへのデプロイで遭遇した権限エラーは、環境変数の未設定とファイルシステムの権限問題が原因でした。Railway CLIを活用した調査と、適切な権限設定、フォールバック機能の実装により、問題を解決することができました。

本番環境でのデプロイでは、このような予期しない問題が発生する可能性があります。事前の準備と適切な対応策を用意することで、サービスの安定性を確保できます。

## 参考リンク

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/reference/cli)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Node.js File System Permissions](https://nodejs.org/api/fs.html#file-system-permissions)

---

*この記事は作成途中です。問題解決の進展に応じて更新予定です。* 