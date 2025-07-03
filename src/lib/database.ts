import { Pool } from 'pg'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// ビルド時にはデータベース接続を避ける
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL

// 開発環境ではSQLite、本番環境ではPostgreSQLを使用
let db: any

if (isBuildTime) {
  // ビルド時: ダミーオブジェクト
  db = {
    query: async () => ({ rows: [] }),
    get: async () => null,
    all: async () => [],
    run: async () => ({ lastID: 0, changes: 0 }),
    exec: async () => {},
  }
} else if (process.env.NODE_ENV === 'production') {
  // 本番環境: Railway PostgreSQL
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in production environment')
    console.error('Please set DATABASE_URL in Railway environment variables')
    
    // 一時的な対処: エラーを投げる代わりにダミーオブジェクトを返す
    db = {
      query: async () => {
        throw new Error('DATABASE_URL is not configured. Please set it in Railway environment variables.')
      },
      get: async () => {
        throw new Error('DATABASE_URL is not configured. Please set it in Railway environment variables.')
      },
      all: async () => {
        throw new Error('DATABASE_URL is not configured. Please set it in Railway environment variables.')
      },
      run: async () => {
        throw new Error('DATABASE_URL is not configured. Please set it in Railway environment variables.')
      },
      exec: async () => {
        throw new Error('DATABASE_URL is not configured. Please set it in Railway environment variables.')
      },
    }
  } else {
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
    
    // 接続テスト
    db.on('error', (err: any) => {
      console.error('Unexpected error on idle client', err)
    })
  }
} else {
  // 開発環境: SQLite
  db = open({
    filename: './blogpostplatform.db',
    driver: sqlite3.Database
  })
}

// データベーステーブル作成スクリプト
export const createTables = async () => {
  try {
    console.log('=== CREATE TABLES START ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    if (process.env.NODE_ENV === 'production') {
      console.log('Creating PostgreSQL tables...')
      console.log('Database pool type:', typeof db)
      
      // PostgreSQL用のテーブル作成
      console.log('Creating users table...')
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      console.log('Users table created/verified')

      console.log('Creating audio_files table...')
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
      console.log('Audio files table created/verified')

      console.log('Creating jobs table...')
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
      console.log('Jobs table created/verified')

      console.log('Creating distribution_platforms table...')
      await db.query(`
        CREATE TABLE IF NOT EXISTS distribution_platforms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('voicy', 'youtube', 'spotify', 'openai')),
          platform_name VARCHAR(255) NOT NULL,
          credentials JSONB NOT NULL DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, platform_type)
        )
      `)
      console.log('Distribution platforms table created/verified')

      console.log('Creating rss_feeds table...')
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
      console.log('RSS feeds table created/verified')

      console.log('Creating platform_settings table...')
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
      console.log('Platform settings table created/verified')

      console.log('Creating platform_credentials table...')
      await db.query(`
        CREATE TABLE IF NOT EXISTS platform_credentials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          platform_type VARCHAR(20) NOT NULL UNIQUE,
          client_id TEXT,
          client_secret TEXT,
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      console.log('Platform credentials table created/verified')

      console.log('Creating youtube_tokens table...')
      await db.query(`
        CREATE TABLE IF NOT EXISTS youtube_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          access_token TEXT,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'warning', 'expired')),
          failure_count INTEGER DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(user_id)
        )
      `)
      console.log('YouTube tokens table created/verified')

      console.log('Creating auth_notifications table...')
      await db.query(`
        CREATE TABLE IF NOT EXISTS auth_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform_type VARCHAR(20) NOT NULL,
          notification_type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          action_url TEXT,
          is_read BOOLEAN DEFAULT false,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      console.log('Auth notifications table created/verified')

      console.log('Creating uploads table...')
      await db.query(`
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
      `)
      console.log('Uploads table created/verified')

      // インデックス作成
      console.log('Creating indexes...')
      await db.query(`CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_audio_file_id ON jobs(audio_file_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_distribution_platforms_user_id ON distribution_platforms(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at)`)
      console.log('Indexes created/verified')

    } else {
      console.log('Creating SQLite tables...')
      // SQLite用のテーブル作成
      const sqliteDb = await db
      
      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('Users table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS audio_files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          duration INTEGER,
          status TEXT DEFAULT 'uploading',
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('Audio files table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          audio_file_id TEXT NOT NULL,
          job_type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          result_url TEXT,
          error_message TEXT,
          progress INTEGER DEFAULT 0,
          platform_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
        )
      `)
      console.log('Jobs table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS distribution_platforms (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          platform_type TEXT NOT NULL,
          platform_name TEXT NOT NULL,
          credentials TEXT DEFAULT '{}',
          settings TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, platform_type)
        )
      `)
      console.log('Distribution platforms table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS rss_feeds (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          feed_name TEXT NOT NULL,
          feed_url TEXT NOT NULL,
          platform_type TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('RSS feeds table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS platform_settings (
          id TEXT PRIMARY KEY,
          platform_type TEXT NOT NULL UNIQUE,
          settings TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('Platform settings table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS platform_credentials (
          id TEXT PRIMARY KEY,
          platform_type TEXT NOT NULL UNIQUE,
          client_id TEXT,
          client_secret TEXT,
          access_token TEXT,
          refresh_token TEXT,
          expires_at DATETIME,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('Platform credentials table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS youtube_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT NOT NULL,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'active',
          failure_count INTEGER DEFAULT 0,
          last_used_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id)
        )
      `)
      console.log('YouTube tokens table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS auth_notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          platform_type TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          message TEXT NOT NULL,
          action_url TEXT,
          is_read INTEGER DEFAULT 0,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('Auth notifications table created/verified')

      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS uploads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          file_path TEXT NOT NULL,
          processed_file_path TEXT,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          status TEXT DEFAULT 'uploading',
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log('Uploads table created/verified')

      // インデックス作成
      await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id)`)
      await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status)`)
      await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at)`)
      console.log('Uploads indexes created/verified')
    }
    
    console.log('=== CREATE TABLES SUCCESS ===')
  } catch (error) {
    console.error('=== CREATE TABLES ERROR ===')
    console.error('Create tables error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: (error as any)?.code,
      detail: (error as any)?.detail
    })
    throw error
  }
}

// 簡易版データベース接続テスト（API互換性のため）
export const testConnectionSimple = async () => {
  try {
    console.log('=== SIMPLE DATABASE CONNECTION TEST ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    if (process.env.NODE_ENV === 'production') {
      console.log('Testing PostgreSQL simple connection...')
      console.log('Database pool:', typeof db)
      
      const result = await db.query('SELECT 1 as test')
      console.log('PostgreSQL simple test result:', result)
      console.log('PostgreSQL rows:', result.rows)
      console.log('PostgreSQL rowCount:', result.rowCount)
      
      const hasRows = result.rows && result.rows.length > 0
      console.log('Has rows:', hasRows)
      return hasRows
    } else {
      console.log('Testing SQLite simple connection...')
      const sqliteDb = await db
      const result = await sqliteDb.get('SELECT 1 as test')
      console.log('SQLite simple test result:', result)
      return !!result
    }
  } catch (error) {
    console.error('Simple database connection test failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: (error as any)?.code,
      detail: (error as any)?.detail
    })
    return false
  }
}

export const testConnection = async () => {
  try {
    console.log('=== DATABASE CONNECTION TEST START ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL接続テスト
      console.log('Testing PostgreSQL connection...')
      const result = await db.query('SELECT NOW() as current_time, version() as db_version')
      console.log('PostgreSQL query result:', result)
      console.log('PostgreSQL rows:', result.rows)
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('No data returned from PostgreSQL query')
      }
      
      console.log('PostgreSQL connection successful:', result.rows[0])
      
      // テーブル存在確認
      const tablesResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `)
      console.log('Users table exists:', tablesResult.rows.length > 0)
      
      return {
        status: 'connected',
        database: 'postgresql',
        currentTime: result.rows[0].current_time,
        version: result.rows[0].db_version,
        usersTableExists: tablesResult.rows.length > 0
      }
    } else {
      // SQLite接続テスト
      console.log('Testing SQLite connection...')
      const sqliteDb = await db
      const result = await sqliteDb.get('SELECT datetime("now") as current_time, sqlite_version() as db_version')
      console.log('SQLite connection successful:', result)
      
      // テーブル存在確認
      const tablesResult = await sqliteDb.get(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' AND name='users'
      `)
      console.log('Users table exists:', !!tablesResult)
      
      return {
        status: 'connected',
        database: 'sqlite',
        currentTime: result.current_time,
        version: result.db_version,
        usersTableExists: !!tablesResult
      }
    }
  } catch (error) {
    console.error('=== DATABASE CONNECTION TEST FAILED ===')
    console.error('Database connection test error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }
  }
}

// 制約更新関数
export const updateConstraints = async () => {
  try {
    console.log('=== UPDATE CONSTRAINTS START ===')
    
    if (process.env.NODE_ENV === 'production') {
      console.log('Updating PostgreSQL constraints...')
      
      // 既存の制約を削除して新しい制約を追加
      await db.query(`
        ALTER TABLE distribution_platforms 
        DROP CONSTRAINT IF EXISTS distribution_platforms_platform_type_check
      `)
      
      await db.query(`
        ALTER TABLE distribution_platforms 
        ADD CONSTRAINT distribution_platforms_platform_type_check 
        CHECK (platform_type IN ('voicy', 'youtube', 'spotify', 'openai'))
      `)
      
      console.log('Constraints updated successfully')
    } else {
      console.log('SQLite does not support constraint updates, skipping...')
    }
    
    console.log('=== UPDATE CONSTRAINTS SUCCESS ===')
  } catch (error) {
    console.error('=== UPDATE CONSTRAINTS ERROR ===')
    console.error('Update constraints error:', error)
    throw error
  }
}

// データベース初期化
export const initializeDatabase = async () => {
  try {
    console.log('=== INITIALIZE DATABASE START ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    // 接続テスト
    const connectionTest = await testConnection()
    console.log('Connection test result:', connectionTest)
    
    if (connectionTest && connectionTest.status === 'connected') {
      console.log('Database connection successful, creating tables...')
      await createTables()
      
      // 制約の更新
      await updateConstraints()
      
      console.log('=== INITIALIZE DATABASE SUCCESS ===')
    } else {
      console.error('Database connection failed:', connectionTest)
      throw new Error('Database connection failed')
    }
  } catch (error) {
    console.error('=== INITIALIZE DATABASE ERROR ===')
    console.error('Initialize database error:', error)
    throw error
  }
}

// データベースインスタンスをエクスポート
export { db }

// アプリケーション起動時にデータベースを初期化
if (typeof window === 'undefined') {
  // サーバーサイドでのみ実行
  console.log('=== DATABASE INITIALIZATION START ===')
  initializeDatabase()
    .then(() => {
      console.log('=== DATABASE INITIALIZATION SUCCESS ===')
    })
    .catch((error) => {
      console.error('=== DATABASE INITIALIZATION FAILED ===')
      console.error('Initialization error:', error)
    })
} 