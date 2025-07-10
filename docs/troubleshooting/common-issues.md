# よくある問題と解決方法

BlogPostPlatformで発生する可能性のある問題とその解決方法について説明します。

## 🔧 セットアップ関連

### 1. 環境変数が読み込まれない

**症状**: `process.env.VARIABLE_NAME is undefined` エラー

**原因**: 環境変数が正しく設定されていない

**解決方法**:

```bash
# 1. .env.localファイルの確認
cat .env.local

# 2. 環境変数の再読み込み
npm run dev

# 3. 環境変数の確認
node -e "console.log(process.env.OPENAI_API_KEY)"
```

**予防策**:
- `.env.local`ファイルがプロジェクトルートにあることを確認
- 環境変数名にタイポがないことを確認
- アプリケーションを再起動

### 2. データベース接続エラー

**症状**: `Database connection failed` エラー

**原因**: データベースURLが無効または接続できない

**解決方法**:

```bash
# 1. DATABASE_URLの確認
echo $DATABASE_URL

# 2. データベース接続テスト
npx prisma db push

# 3. マイグレーションの実行
npx prisma migrate dev
```

**予防策**:
- RailwayでPostgreSQLが正常に動作していることを確認
- DATABASE_URLが正しい形式であることを確認
- SSL設定が適切であることを確認

### 3. 依存関係のインストールエラー

**症状**: `npm install` でエラーが発生

**原因**: Node.jsバージョンが不適切またはパッケージの競合

**解決方法**:

```bash
# 1. Node.jsバージョンの確認
node --version  # 18.0.0以上であることを確認

# 2. キャッシュのクリア
npm cache clean --force

# 3. node_modulesの削除と再インストール
rm -rf node_modules package-lock.json
npm install

# 4. 特定のパッケージの再インストール
npm install @prisma/client
npm install next
```

## 🎵 音声処理関連

### 1. ファイルアップロードエラー

**症状**: "File too large" または "Invalid file type" エラー

**原因**: ファイルサイズ制限または対応していないファイル形式

**解決方法**:

```typescript
// ファイルサイズ制限の確認
const maxFileSize = 50 * 1024 * 1024; // 50MB
const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4'];

// ファイル検証
const validateFile = (file: File) => {
  if (file.size > maxFileSize) {
    throw new Error('File size exceeds 50MB limit');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type');
  }
  
  return true;
};
```

**予防策**:
- アップロード前にファイルサイズを確認
- 対応ファイル形式（MP3、WAV、M4A）を使用
- 音声ファイルを圧縮してからアップロード

### 2. 文字起こしエラー

**症状**: "Transcription failed" エラー

**原因**: OpenAI APIキーが無効または音声ファイルの問題

**解決方法**:

```bash
# 1. OpenAI APIキーの確認
echo $OPENAI_API_KEY

# 2. APIキーの有効性テスト
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**予防策**:
- OpenAI APIキーが正しく設定されていることを確認
- 音声ファイルの品質を確認（ノイズが少ない、明確な音声）
- ファイルサイズが25MB以下であることを確認

### 3. 音声トリミングエラー

**症状**: "Trimming failed" エラー

**原因**: 音声ファイルの破損またはメモリ不足

**解決方法**:

```typescript
// 音声ファイルの検証
const validateAudioFile = async (file: File) => {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return {
      isValid: true,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid audio file',
    };
  }
};
```

## 🔐 認証関連

### 1. YouTube認証エラー

**症状**: "Invalid credentials" エラー

**原因**: OAuth 2.0クライアントの設定が不適切

**解決方法**:

1. [Google Cloud Console](https://console.cloud.google.com/)で設定を確認
2. OAuth 2.0クライアントIDとシークレットを再生成
3. 承認済みリダイレクトURIを確認

```bash
# 環境変数の確認
echo $YOUTUBE_CLIENT_ID
echo $YOUTUBE_CLIENT_SECRET
```

### 2. Voicy認証エラー

**症状**: "Login failed" エラー

**原因**: Voicyのログイン情報が無効またはUI変更

**解決方法**:

```typescript
// 認証情報の暗号化確認
const checkVoicyCredentials = async () => {
  try {
    const credentials = await getEncryptedCredentials('voicy');
    const decrypted = decrypt(credentials.encryptedData);
    
    return {
      hasCredentials: true,
      email: decrypted.email,
    };
  } catch (error) {
    return {
      hasCredentials: false,
      error: error.message,
    };
  }
};
```

### 3. Browserless.io接続エラー

**症状**: "Browserless connection failed" エラー

**原因**: APIキーが無効または使用量制限

**解決方法**:

```bash
# APIキーの確認
echo $BROWSERLESS_API_KEY

# 接続テスト
curl -H "Authorization: Bearer $BROWSERLESS_API_KEY" \
  https://chrome.browserless.io/json
```

## 📡 RSS Feed関連

### 1. RSS Feedが更新されない

**症状**: Spotifyでエピソードが表示されない

**原因**: RSS FeedのXML形式が無効またはファイルアクセスエラー

**解決方法**:

```typescript
// RSS Feedの検証
const validateRSSFeed = (rssContent: string) => {
  try {
    // XML形式の検証
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssContent, "text/xml");
    
    const errors = xmlDoc.getElementsByTagName("parsererror");
    if (errors.length > 0) {
      throw new Error("Invalid XML format");
    }
    
    return true;
  } catch (error) {
    console.error('RSS validation error:', error);
    return false;
  }
};
```

### 2. 音声ファイルにアクセスできない

**症状**: "Audio file not found" エラー

**原因**: ファイルURLが無効またはCORS設定の問題

**解決方法**:

```typescript
// ファイルアクセステスト
const testFileAccess = async (fileUrl: string) => {
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    return {
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message,
    };
  }
};
```

## 🚀 デプロイメント関連

### 1. Railwayデプロイエラー

**症状**: デプロイが失敗する

**原因**: ビルドエラーまたは環境変数の問題

**解決方法**:

```bash
# 1. ローカルビルドテスト
npm run build

# 2. 環境変数の確認
railway variables list

# 3. ログの確認
railway logs
```

### 2. 本番環境での動作エラー

**症状**: 開発環境では動作するが本番環境でエラー

**原因**: 環境変数の違いまたは依存関係の問題

**解決方法**:

```typescript
// 環境別の設定確認
const checkEnvironment = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    openaiKey: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    browserlessKey: process.env.BROWSERLESS_API_KEY ? 'SET' : 'NOT SET',
  };
};
```

## 📊 パフォーマンス関連

### 1. 処理が遅い

**症状**: 音声処理や配信に時間がかかる

**原因**: ファイルサイズが大きいまたはAPI制限

**解決方法**:

```typescript
// 処理時間の監視
const measureProcessingTime = async (operation: () => Promise<any>) => {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const endTime = Date.now();
    
    console.log(`Processing time: ${endTime - startTime}ms`);
    return result;
  } catch (error) {
    console.error(`Processing failed after ${Date.now() - startTime}ms`);
    throw error;
  }
};
```

### 2. メモリ不足エラー

**症状**: "JavaScript heap out of memory" エラー

**原因**: 大きなファイルの処理でメモリ不足

**解決方法**:

```bash
# Node.jsのメモリ制限を増加
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# またはpackage.jsonで設定
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
  }
}
```

## 🔍 デバッグ方法

### 1. ログの確認

```typescript
// 詳細なログ出力
const debugLog = (message: string, data?: any) => {
  console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, data);
};

// エラーログの保存
const logError = (error: Error, context?: any) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, {
    message: error.message,
    stack: error.stack,
    context,
  });
};
```

### 2. ネットワーク接続の確認

```bash
# API接続テスト
curl -I https://api.openai.com/v1/models
curl -I https://chrome.browserless.io/json
curl -I https://www.googleapis.com/youtube/v3/channels
```

### 3. データベース接続の確認

```bash
# Prisma接続テスト
npx prisma db pull
npx prisma generate
```

## 📞 サポート

問題が解決しない場合は、以下の情報とともに[GitHub Issues](https://github.com/yujiyamanaka/BlogPostPlatform/issues)で報告してください：

1. **エラーメッセージ**: 完全なエラーメッセージ
2. **環境情報**: OS、Node.jsバージョン、ブラウザ
3. **再現手順**: 問題を再現する手順
4. **ログ**: 関連するログファイル
5. **設定**: 環境変数や設定ファイル（機密情報は除く） 