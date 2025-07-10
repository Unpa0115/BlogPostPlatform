import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import crypto from 'crypto'
import { AudioFile, DistributionPlatform } from '../types';

// SQLiteデータベース接続
let db: any

// SQLiteデータベースを初期化
db = open({
  filename: './blogpostplatform.db',
  driver: sqlite3.Database
})

// データベーステーブル作成スクリプト
export const createTables = async () => {
  try {
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

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        upload_id TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        result_url TEXT,
        error_message TEXT,
        progress INTEGER DEFAULT 0,
        platform_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
      )
    `)

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id TEXT PRIMARY KEY,
        platform_type TEXT NOT NULL UNIQUE,
        settings TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_checked DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS rss_episodes (
        id TEXT PRIMARY KEY,
        feed_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        enclosure_url TEXT,
        enclosure_type TEXT,
        enclosure_length INTEGER,
        guid TEXT NOT NULL,
        pub_date DATETIME,
        download_status TEXT DEFAULT 'pending',
        local_file_path TEXT,
        file_size INTEGER,
        mime_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
      )
    `)

    // インデックス作成
    await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id)`)
    await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`)
    await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id)`)
    await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_rss_episodes_feed_id ON rss_episodes(feed_id)`)
    await sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_rss_episodes_guid ON rss_episodes(guid)`)

    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating database tables:', error)
    throw error
  }
}

// 型定義
export interface Upload {
  id: string
  user_id: string
  title: string
  description?: string
  file_path: string
  processed_file_path?: string
  file_size: number
  mime_type: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface Job {
  id: string
  user_id: string
  upload_id: string
  job_type: 'trim' | 'distribute' | 'transcribe' | 'summarize' | 'upload_to_platform'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url?: string
  error_message?: string
  progress: number
  platform_type?: string
  created_at: Date
  updated_at: Date
}

export interface PlatformSettings {
  id: string
  platform_type: string
  settings: Record<string, any>
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface RssFeed {
  id: string
  user_id: string
  feed_name: string
  feed_url: string
  platform_type: string
  is_active: boolean
  last_checked?: Date
  created_at: Date
  updated_at: Date
}

export interface RssEpisode {
  id: string
  feed_id: string
  title: string
  description?: string
  enclosure_url?: string
  enclosure_type?: string
  enclosure_length?: number
  guid: string
  pub_date?: Date
  download_status: 'pending' | 'downloading' | 'completed' | 'failed'
  local_file_path?: string
  file_size?: number
  mime_type?: string
  created_at: Date
  updated_at: Date
}

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

// ストレージクラス
export class DatabaseStorage {
  // Audio file operations
  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    const result = await db.get('SELECT * FROM audio_files WHERE id = ?', [id]);
    return result;
  }

  async getAllAudioFiles(): Promise<AudioFile[]> {
    const result = await db.all('SELECT * FROM audio_files ORDER BY created_at DESC');
    return result;
  }

  async getRecentAudioFiles(limit: number = 10): Promise<AudioFile[]> {
    const result = await db.all('SELECT * FROM audio_files ORDER BY created_at DESC LIMIT ?', [limit]);
    return result;
  }

  async createAudioFile(audioFile: Omit<AudioFile, 'id' | 'created_at' | 'updated_at'>): Promise<AudioFile> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const result = await db.run(
      'INSERT INTO audio_files (id, user_id, file_name, file_url, file_size, duration, status, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, audioFile.user_id, audioFile.file_name, audioFile.file_url, audioFile.file_size, audioFile.duration, audioFile.status, JSON.stringify(audioFile.metadata), now, now]
    );
    return { ...audioFile, id, created_at: now, updated_at: now };
  }

  async updateAudioFile(id: string, updates: Partial<AudioFile>): Promise<AudioFile | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    const result = await db.run(
      `UPDATE audio_files SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
      [...values, now, id]
    );
    if (result.changes > 0) {
      return this.getAudioFile(id);
    }
    return undefined;
  }

  async deleteAudioFile(id: string): Promise<boolean> {
    const result = await db.run('DELETE FROM audio_files WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Job operations
  async getJob(id: string): Promise<Job | undefined> {
    const result = await db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    return result;
  }

  async getAllJobs(): Promise<Job[]> {
    const result = await db.all('SELECT * FROM jobs ORDER BY created_at DESC');
    return result;
  }

  async getJobsByAudioFile(audioFileId: string): Promise<Job[]> {
    const result = await db.all('SELECT * FROM jobs WHERE audio_file_id = ? ORDER BY created_at DESC', [audioFileId]);
    return result;
  }

  async createJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await db.run(
      'INSERT INTO jobs (id, user_id, upload_id, job_type, status, result_url, error_message, progress, platform_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, job.user_id, job.upload_id, job.job_type, job.status, job.result_url, job.error_message, job.progress, job.platform_type, now, now]
    );
    return { ...job, id, created_at: now, updated_at: now };
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    const result = await db.run(
      `UPDATE jobs SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
      [...values, now, id]
    );
    if (result.changes > 0) {
      return this.getJob(id);
    }
    return undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.run('DELETE FROM jobs WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Platform settings operations
  async getPlatformSettings(platform: string): Promise<PlatformSettings | undefined> {
    const result = await db.get('SELECT * FROM platform_settings WHERE platform_type = ?', [platform]);
    return result;
  }

  async getAllPlatformSettings(): Promise<PlatformSettings[]> {
    const result = await db.all('SELECT * FROM platform_settings');
    return result;
  }

  async createPlatformSettings(settings: Omit<PlatformSettings, 'id' | 'created_at' | 'updated_at'>): Promise<PlatformSettings> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await db.run(
      'INSERT INTO platform_settings (id, platform_type, settings, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, settings.platform_type, JSON.stringify(settings.settings), settings.is_active ? 1 : 0, now, now]
    );
    return { ...settings, id, created_at: now, updated_at: now };
  }

  async updatePlatformSettings(platform: string, updates: Partial<PlatformSettings>): Promise<PlatformSettings | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    const result = await db.run(
      `UPDATE platform_settings SET ${updateFields}, updated_at = $${values.length + 2} WHERE platform_type = ?`,
      [...values, now, platform]
    );
    if (result.changes > 0) {
      return this.getPlatformSettings(platform);
    }
    return undefined;
  }

  // Distribution platform operations
  async getDistributionPlatform(id: string): Promise<DistributionPlatform | undefined> {
    const result = await db.get('SELECT * FROM distribution_platforms WHERE id = ?', [id]);
    return result;
  }

  async getAllDistributionPlatforms(): Promise<DistributionPlatform[]> {
    const result = await db.all('SELECT * FROM distribution_platforms ORDER BY created_at DESC');
    return result;
  }

  async createDistributionPlatform(platform: Omit<DistributionPlatform, 'id' | 'created_at' | 'updated_at'>): Promise<DistributionPlatform> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await db.run(
      'INSERT INTO distribution_platforms (id, user_id, platform_type, platform_name, credentials, settings, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, platform.user_id, platform.platform_type, platform.platform_name, JSON.stringify(platform.credentials), JSON.stringify(platform.settings), platform.is_active ? 1 : 0, now, now]
    );
    return { ...platform, id, created_at: now, updated_at: now };
  }

  async updateDistributionPlatform(id: string, updates: Partial<DistributionPlatform>): Promise<DistributionPlatform | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    const result = await db.run(
      `UPDATE distribution_platforms SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
      [...values, now, id]
    );
    if (result.changes > 0) {
      return this.getDistributionPlatform(id);
    }
    return undefined;
  }

  async deleteDistributionPlatform(id: string): Promise<boolean> {
    const result = await db.run('DELETE FROM distribution_platforms WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // RSS Feed operations
  async getRssFeed(id: string): Promise<RssFeed | undefined> {
    const result = await db.get('SELECT * FROM rss_feeds WHERE id = ?', [id]);
    return result;
  }

  async getAllRssFeeds(): Promise<RssFeed[]> {
    const result = await db.all('SELECT * FROM rss_feeds ORDER BY created_at DESC');
    return result;
  }

  async createRssFeed(feed: Omit<RssFeed, 'id' | 'created_at' | 'updated_at'>): Promise<RssFeed> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await db.run(
      'INSERT INTO rss_feeds (id, user_id, feed_name, feed_url, platform_type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, feed.user_id, feed.feed_name, feed.feed_url, feed.platform_type, feed.is_active ? 1 : 0, now, now]
    );
    return { ...feed, id, created_at: now, updated_at: now };
  }

  async updateRssFeed(id: string, updates: Partial<RssFeed>): Promise<RssFeed | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    const result = await db.run(
      `UPDATE rss_feeds SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
      [...values, now, id]
    );
    if (result.changes > 0) {
      return this.getRssFeed(id);
    }
    return undefined;
  }

  async deleteRssFeed(id: string): Promise<boolean> {
    const result = await db.run('DELETE FROM rss_feeds WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // RSS Episode operations
  async getRssEpisodeGuids(feedId: string): Promise<string[]> {
    try {
      const result = await db.all('SELECT guid FROM rss_episodes WHERE feed_id = ?', [feedId]);
      return result.map((row: any) => row.guid);
    } catch (error) {
      console.error('Error getting RSS episode GUIDs:', error);
      return [];
    }
  }

  async createRssEpisode(episode: Omit<RssEpisode, 'id' | 'created_at' | 'updated_at'>): Promise<RssEpisode> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      await db.run(
        'INSERT INTO rss_episodes (id, feed_id, title, description, enclosure_url, enclosure_type, enclosure_length, guid, pub_date, download_status, local_file_path, file_size, mime_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, episode.feed_id, episode.title, episode.description, episode.enclosure_url, episode.enclosure_type, episode.enclosure_length, episode.guid, episode.pub_date, episode.download_status, episode.local_file_path, episode.file_size, episode.mime_type, now, now]
      );
      return { ...episode, id, created_at: now, updated_at: now };
    } catch (error) {
      console.error('Error creating RSS episode:', error);
      throw error;
    }
  }

  async updateRssEpisode(id: string, updates: Partial<RssEpisode>): Promise<RssEpisode | undefined> {
    try {
      const now = new Date();
      const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = Object.values(updates);
      await db.run(
        `UPDATE rss_episodes SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
        [...values, now, id]
      );
      return undefined;
    } catch (error) {
      console.error('Error updating RSS episode:', error);
      return undefined;
    }
  }

  async deleteRssEpisode(id: string): Promise<boolean> {
    try {
      const sqliteDb = await db
      const result = await sqliteDb.run('DELETE FROM rss_episodes WHERE id = ?', [id])
      return result.changes > 0
    } catch (error) {
      console.error('Error deleting RSS episode:', error)
      return false
    }
  }

  // Upload operations
  async getUpload(id: string): Promise<Upload | undefined> {
    try {
      console.log(`🔍 Getting upload with ID: ${id}`)
      console.log(`🔍 ID type: ${typeof id}`)
      
      const sqliteDb = await db
      const result = await sqliteDb.get('SELECT * FROM uploads WHERE id = ?', [id])
      console.log(`📊 SQLite query result:`, result)
      
      if (!result) {
        console.log(`❌ No upload found with ID: ${id}`)
        return undefined
      }
      
      // SQLiteの場合は数値タイムスタンプをDateオブジェクトに変換
      if (result.created_at) {
        result.created_at = new Date(result.created_at)
      }
      if (result.updated_at) {
        result.updated_at = new Date(result.updated_at)
      }
      
      console.log(`✅ Upload found:`, result)
      return result
    } catch (error) {
      console.error('❌ Error getting upload:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        id: id
      })
      return undefined
    }
  }

  async getAllUploads(): Promise<Upload[]> {
    try {
      const sqliteDb = await db
      const result = await sqliteDb.all('SELECT * FROM uploads ORDER BY created_at DESC')
      return result
    } catch (error) {
      console.error('Error getting all uploads:', error)
      return []
    }
  }

  async createUpload(upload: Omit<Upload, 'id' | 'created_at' | 'updated_at'>): Promise<Upload> {
    try {
      const id = crypto.randomUUID()
      const now = new Date()
      
      const sqliteDb = await db
      await sqliteDb.run(`
        INSERT INTO uploads (id, user_id, title, description, file_path, processed_file_path, file_size, mime_type, status, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, upload.user_id, upload.title, upload.description, upload.file_path, upload.processed_file_path, upload.file_size, upload.mime_type, upload.status, JSON.stringify(upload.metadata), now, now])
      
      // 生成したIDで作成されたレコードを取得
      return await this.getUpload(id) as Upload
    } catch (error) {
      console.error('Error creating upload:', error)
      throw error
    }
  }

  async updateUpload(id: string, updates: Partial<Upload>): Promise<Upload | undefined> {
    try {
      const sqliteDb = await db
      const result = await sqliteDb.run(`
        UPDATE uploads 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            processed_file_path = COALESCE(?, processed_file_path),
            status = COALESCE(?, status),
            metadata = COALESCE(?, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [updates.title, updates.description, updates.processed_file_path, updates.status, updates.metadata ? JSON.stringify(updates.metadata) : null, id])
      
      return await this.getUpload(id)
    } catch (error) {
      console.error('Error updating upload:', error)
      return undefined
    }
  }

  // ファイルパスでアップロードレコードを削除
  async deleteUploadByFilePath(filePath: string): Promise<boolean> {
    try {
      const sqliteDb = await db
      const result = await sqliteDb.run('DELETE FROM uploads WHERE file_path = ?', [filePath])
      return result.changes > 0
    } catch (error) {
      console.error('Error deleting upload by file path:', error)
      return false
    }
  }

  async getStats(userId: string): Promise<{
    total_uploads: number
    total_jobs: number
    completed_jobs: number
    failed_jobs: number
    active_platforms: number
  }> {
    try {
      const sqliteDb = await db
      
      const [
        uploadsResult,
        jobsResult,
        completedJobsResult,
        failedJobsResult,
        activePlatformsResult
      ] = await Promise.all([
        // 総アップロード数
        sqliteDb.get(
          'SELECT COUNT(*) as count FROM uploads WHERE user_id = ?',
          [userId]
        ),
        // 総ジョブ数
        sqliteDb.get(
          'SELECT COUNT(*) as count FROM jobs WHERE user_id = ?',
          [userId]
        ),
        // 完了ジョブ数
        sqliteDb.get(
          'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status = ?',
          [userId, 'completed']
        ),
        // 失敗ジョブ数
        sqliteDb.get(
          'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status = ?',
          [userId, 'failed']
        ),
        // アクティブプラットフォーム数
        sqliteDb.get(
          'SELECT COUNT(*) as count FROM distribution_platforms WHERE user_id = ? AND is_active = ?',
          [userId, 1]
        )
      ])

      return {
        total_uploads: uploadsResult?.count || 0,
        total_jobs: jobsResult?.count || 0,
        completed_jobs: completedJobsResult?.count || 0,
        failed_jobs: failedJobsResult?.count || 0,
        active_platforms: activePlatformsResult?.count || 0
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      return {
        total_uploads: 0,
        total_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        active_platforms: 0
      }
    }
  }
}

export const storage = new DatabaseStorage();

// データベース接続テスト
export const testConnection = async () => {
  try {
    const result = await db.get('SELECT datetime("now") as now')
    console.log('SQLite connection successful:', result)
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

// データベース初期化
export const initializeDatabase = async () => {
  try {
    await createTables()
    await testConnection()
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
} 