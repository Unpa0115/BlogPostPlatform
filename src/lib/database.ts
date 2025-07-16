import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// localhost環境ではSQLiteのみを使用
// 遅延初期化に変更
let dbPromise: Promise<any> | null = null

const getDb = () => {
  if (!dbPromise) {
    dbPromise = open({
      filename: './blogpostplatform.db',
      driver: sqlite3.Database
    })
  }
  return dbPromise
}

// 後方互換性のため
const db = getDb()

// データベーステーブル作成スクリプト
export const createTables = async () => {
  try {
    console.log('=== CREATE TABLES START ===')
    console.log('Environment: localhost (SQLite only)')
    
    console.log('Creating SQLite tables...')
    // SQLite用のテーブル作成
    const sqliteDb = await getDb()
    
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

// 簡易版データベース接続テスト
export const testConnectionSimple = async () => {
  try {
    console.log('=== SIMPLE DATABASE CONNECTION TEST ===')
    console.log('Environment: localhost (SQLite only)')
    
    console.log('Testing SQLite simple connection...')
    const sqliteDb = await getDb()
    const result = await sqliteDb.get('SELECT 1 as test')
    
    if (result && result.test === 1) {
      console.log('✅ SQLite connection test PASSED')
      return {
        success: true,
        message: 'SQLite connection successful',
        environment: 'localhost',
        database: 'SQLite'
      }
    } else {
      throw new Error('Unexpected test result')
    }
  } catch (error) {
    console.error('❌ SQLite connection test FAILED')
    console.error('Test connection error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: 'localhost',
      database: 'SQLite'
    }
  }
}

// データベース接続テスト
export const testConnection = async () => {
  try {
    console.log('=== DATABASE CONNECTION TEST ===')
    console.log('Environment: localhost (SQLite only)')
    
    console.log('Testing SQLite connection...')
    const sqliteDb = await getDb()
    
    // 基本的な接続テスト
    const basicTest = await sqliteDb.get('SELECT 1 as test')
    console.log('Basic connection test:', basicTest)
    
    // テーブル存在確認
    const tables = await sqliteDb.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    console.log('Available tables:', tables.map((t: any) => t.name))
    
    // ユーザーテーブルの構造確認
    const userTableInfo = await sqliteDb.all('PRAGMA table_info(users)')
    console.log('Users table structure:', userTableInfo)
    
    console.log('✅ SQLite connection test PASSED')
    return {
      success: true,
      message: 'SQLite connection and structure verification successful',
      environment: 'localhost',
      database: 'SQLite',
      tables: tables.map((t: any) => t.name),
      userTableColumns: userTableInfo.map((col: any) => col.name)
    }
  } catch (error) {
    console.error('❌ SQLite connection test FAILED')
    console.error('Test connection error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: 'localhost',
      database: 'SQLite'
    }
  }
}

// 制約更新（SQLiteでは不要だが互換性のため）
export const updateConstraints = async () => {
  try {
    console.log('=== UPDATE CONSTRAINTS ===')
    console.log('Environment: localhost (SQLite only)')
    console.log('SQLite does not require constraint updates')
    
    return {
      success: true,
      message: 'SQLite constraints are automatically enforced',
      environment: 'localhost',
      database: 'SQLite'
    }
  } catch (error) {
    console.error('Update constraints error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: 'localhost',
      database: 'SQLite'
    }
  }
}

// データベース初期化
export const initializeDatabase = async () => {
  try {
    console.log('=== DATABASE INITIALIZATION ===')
    console.log('Environment: localhost (SQLite only)')
    
    // テーブル作成
    await createTables()
    
    // 接続テスト
    const connectionTest = await testConnection()
    
    if (connectionTest.success) {
      console.log('✅ Database initialization completed successfully')
      return {
        success: true,
        message: 'Database initialized successfully',
        environment: 'localhost',
        database: 'SQLite',
        connectionTest
      }
    } else {
      throw new Error('Connection test failed after table creation')
    }
  } catch (error) {
    console.error('❌ Database initialization failed')
    console.error('Initialization error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: 'localhost',
      database: 'SQLite'
    }
  }
}

// データベースエクスポート
export { getDb, db }

// アプリケーション起動時のデータベース初期化を一時的に無効化
// if (typeof window === 'undefined') {
//   // サーバーサイドでのみ実行
//   console.log('=== DATABASE INITIALIZATION START ===')
//   initializeDatabase()
//     .then(() => {
//       console.log('=== DATABASE INITIALIZATION SUCCESS ===')
//     })
//     .catch((error) => {
//       console.error('=== DATABASE INITIALIZATION FAILED ===')
//       console.error('Initialization error:', error)
//     })
// } 