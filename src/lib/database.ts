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

    // 音声ファイルテーブル
    await db.query(`
      CREATE TABLE IF NOT EXISTS audio_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        duration INTEGER,
        status VARCHAR(20) DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // ジョブテーブル
    await db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        audio_file_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
        job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('trim', 'distribute', 'transcribe', 'summarize')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        result_url TEXT,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // 配信プラットフォームテーブル
    await db.query(`
      CREATE TABLE IF NOT EXISTS distribution_platforms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('voicy', 'youtube', 'spotify')),
        platform_name VARCHAR(255) NOT NULL,
        credentials JSONB NOT NULL DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, platform_type)
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