import { db } from './railway'

// データベーステーブル作成スクリプト
export const createTables = async () => {
  try {
    // ユーザーテーブル
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // 音声ファイルテーブル（アップロード管理）
    await db.query(`
      CREATE TABLE IF NOT EXISTS audio_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        duration INTEGER,
        status VARCHAR(20) DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // ジョブテーブル（処理管理）
    await db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        audio_file_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
        job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('trim', 'distribute', 'transcribe', 'summarize', 'upload_to_platform')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        result_url TEXT,
        error_message TEXT,
        progress INTEGER DEFAULT 0,
        platform_type VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // 配信プラットフォームテーブル（認証情報管理）
    await db.query(`
      CREATE TABLE IF NOT EXISTS distribution_platforms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('voicy', 'youtube', 'spotify')),
        platform_name VARCHAR(255) NOT NULL,
        credentials JSONB NOT NULL DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, platform_type)
      )
    `)

    // RSSフィードテーブル
    await db.query(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feed_name VARCHAR(255) NOT NULL,
        feed_url TEXT NOT NULL,
        platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('spotify', 'apple', 'google')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // プラットフォーム設定テーブル（グローバル設定）
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform_type VARCHAR(20) NOT NULL UNIQUE,
        settings JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // インデックス作成
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id)
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_audio_file_id ON jobs(audio_file_id)
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_platforms_user_id ON distribution_platforms(user_id)
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id)
    `)

    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating database tables:', error)
    throw error
  }
}

// データベース接続テスト
export const testConnection = async () => {
  try {
    const result = await db.query('SELECT NOW()')
    console.log('Database connection successful:', result.rows[0])
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// データベース初期化
export const initializeDatabase = async () => {
  const isConnected = await testConnection()
  if (isConnected) {
    await createTables()
  }
} 