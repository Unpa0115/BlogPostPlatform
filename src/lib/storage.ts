import { Pool } from 'pg'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { AudioFile, DistributionPlatform } from '../types';

// 開発環境ではSQLite、本番環境ではPostgreSQLを使用
let db: any

if (process.env.NODE_ENV === 'production') {
  // 本番環境: Railway PostgreSQL
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
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
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL用のテーブル作成
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

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

      await db.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
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

      await db.query(`
        CREATE TABLE IF NOT EXISTS rss_feeds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          last_checked TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await db.query(`
        CREATE TABLE IF NOT EXISTS rss_episodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          enclosure_url TEXT,
          enclosure_type VARCHAR(100),
          enclosure_length BIGINT,
          guid VARCHAR(255) NOT NULL,
          pub_date TIMESTAMP WITH TIME ZONE,
          download_status VARCHAR(20) DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
          local_file_path TEXT,
          file_size BIGINT,
          mime_type VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // インデックス作成
      await db.query(`CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rss_episodes_feed_id ON rss_episodes(feed_id)`)
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rss_episodes_guid ON rss_episodes(guid)`)

    } else {
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
    }

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
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM audio_files WHERE id = $1', [id]);
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.get('SELECT * FROM audio_files WHERE id = ?', [id]);
      return result;
    }
  }

  async getAllAudioFiles(): Promise<AudioFile[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM audio_files ORDER BY created_at DESC');
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM audio_files ORDER BY created_at DESC');
      return result;
    }
  }

  async getRecentAudioFiles(limit: number = 10): Promise<AudioFile[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM audio_files ORDER BY created_at DESC LIMIT $1', [limit]);
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM audio_files ORDER BY created_at DESC LIMIT ?', [limit]);
      return result;
    }
  }

  async createAudioFile(audioFile: Omit<AudioFile, 'id' | 'created_at' | 'updated_at'>): Promise<AudioFile> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'INSERT INTO audio_files (id, user_id, file_name, file_url, file_size, duration, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [id, audioFile.user_id, audioFile.file_name, audioFile.file_url, audioFile.file_size, audioFile.duration, audioFile.status, JSON.stringify(audioFile.metadata), now, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run(
        'INSERT INTO audio_files (id, user_id, file_name, file_url, file_size, duration, status, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, audioFile.user_id, audioFile.file_name, audioFile.file_url, audioFile.file_size, audioFile.duration, audioFile.status, JSON.stringify(audioFile.metadata), now, now]
      );
      return { ...audioFile, id, created_at: now, updated_at: now };
    }
  }

  async updateAudioFile(id: string, updates: Partial<AudioFile>): Promise<AudioFile | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `UPDATE audio_files SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
        [id, ...values, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const placeholders = Object.keys(updates).map((_, index) => `$${index + 2}`).join(', ');
      const result = await sqliteDb.run(
        `UPDATE audio_files SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1`,
        [id, ...values, now]
      );
      if (result.changes > 0) {
        return this.getAudioFile(id);
      }
      return undefined;
    }
  }

  async deleteAudioFile(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('DELETE FROM audio_files WHERE id = $1', [id]);
      return result.rowCount > 0;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run('DELETE FROM audio_files WHERE id = ?', [id]);
      return result.changes > 0;
    }
  }

  // Job operations
  async getJob(id: string): Promise<Job | undefined> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.get('SELECT * FROM jobs WHERE id = ?', [id]);
      return result;
    }
  }

  async getAllJobs(): Promise<Job[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM jobs ORDER BY created_at DESC');
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM jobs ORDER BY created_at DESC');
      return result;
    }
  }

  async getJobsByAudioFile(audioFileId: string): Promise<Job[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM jobs WHERE audio_file_id = $1 ORDER BY created_at DESC', [audioFileId]);
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM jobs WHERE audio_file_id = ? ORDER BY created_at DESC', [audioFileId]);
      return result;
    }
  }

  async createJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'INSERT INTO jobs (id, user_id, upload_id, job_type, status, result_url, error_message, progress, platform_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [id, job.user_id, job.upload_id, job.job_type, job.status, job.result_url, job.error_message, job.progress, job.platform_type, now, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      await sqliteDb.run(
        'INSERT INTO jobs (id, user_id, upload_id, job_type, status, result_url, error_message, progress, platform_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, job.user_id, job.upload_id, job.job_type, job.status, job.result_url, job.error_message, job.progress, job.platform_type, now, now]
      );
      return { ...job, id, created_at: now, updated_at: now };
    }
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `UPDATE jobs SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
        [id, ...values, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run(
        `UPDATE jobs SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1`,
        [id, ...values, now]
      );
      if (result.changes > 0) {
        return this.getJob(id);
      }
      return undefined;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('DELETE FROM jobs WHERE id = $1', [id]);
      return result.rowCount > 0;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run('DELETE FROM jobs WHERE id = ?', [id]);
      return result.changes > 0;
    }
  }

  // Platform settings operations
  async getPlatformSettings(platform: string): Promise<PlatformSettings | undefined> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM platform_settings WHERE platform_type = $1', [platform]);
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.get('SELECT * FROM platform_settings WHERE platform_type = ?', [platform]);
      return result;
    }
  }

  async getAllPlatformSettings(): Promise<PlatformSettings[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM platform_settings');
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM platform_settings');
      return result;
    }
  }

  async createPlatformSettings(settings: Omit<PlatformSettings, 'id' | 'created_at' | 'updated_at'>): Promise<PlatformSettings> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'INSERT INTO platform_settings (id, platform_type, settings, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, settings.platform_type, JSON.stringify(settings.settings), settings.is_active, now, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      await sqliteDb.run(
        'INSERT INTO platform_settings (id, platform_type, settings, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, settings.platform_type, JSON.stringify(settings.settings), settings.is_active ? 1 : 0, now, now]
      );
      return { ...settings, id, created_at: now, updated_at: now };
    }
  }

  async updatePlatformSettings(platform: string, updates: Partial<PlatformSettings>): Promise<PlatformSettings | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `UPDATE platform_settings SET ${updateFields}, updated_at = $${values.length + 2} WHERE platform_type = $1 RETURNING *`,
        [platform, ...values, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run(
        `UPDATE platform_settings SET ${updateFields}, updated_at = $${values.length + 2} WHERE platform_type = $1`,
        [platform, ...values, now]
      );
      if (result.changes > 0) {
        return this.getPlatformSettings(platform);
      }
      return undefined;
    }
  }

  // Distribution platform operations
  async getDistributionPlatform(id: string): Promise<DistributionPlatform | undefined> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM distribution_platforms WHERE id = $1', [id]);
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.get('SELECT * FROM distribution_platforms WHERE id = ?', [id]);
      return result;
    }
  }

  async getAllDistributionPlatforms(): Promise<DistributionPlatform[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM distribution_platforms ORDER BY created_at DESC');
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM distribution_platforms ORDER BY created_at DESC');
      return result;
    }
  }

  async createDistributionPlatform(platform: Omit<DistributionPlatform, 'id' | 'created_at' | 'updated_at'>): Promise<DistributionPlatform> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'INSERT INTO distribution_platforms (id, user_id, platform_type, platform_name, credentials, settings, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [id, platform.user_id, platform.platform_type, platform.platform_name, JSON.stringify(platform.credentials), JSON.stringify(platform.settings), platform.is_active, now, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      await sqliteDb.run(
        'INSERT INTO distribution_platforms (id, user_id, platform_type, platform_name, credentials, settings, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, platform.user_id, platform.platform_type, platform.platform_name, JSON.stringify(platform.credentials), JSON.stringify(platform.settings), platform.is_active ? 1 : 0, now, now]
      );
      return { ...platform, id, created_at: now, updated_at: now };
    }
  }

  async updateDistributionPlatform(id: string, updates: Partial<DistributionPlatform>): Promise<DistributionPlatform | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `UPDATE distribution_platforms SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
        [id, ...values, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run(
        `UPDATE distribution_platforms SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1`,
        [id, ...values, now]
      );
      if (result.changes > 0) {
        return this.getDistributionPlatform(id);
      }
      return undefined;
    }
  }

  async deleteDistributionPlatform(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('DELETE FROM distribution_platforms WHERE id = $1', [id]);
      return result.rowCount > 0;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run('DELETE FROM distribution_platforms WHERE id = ?', [id]);
      return result.changes > 0;
    }
  }

  // RSS Feed operations
  async getRssFeed(id: string): Promise<RssFeed | undefined> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM rss_feeds WHERE id = $1', [id]);
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.get('SELECT * FROM rss_feeds WHERE id = ?', [id]);
      return result;
    }
  }

  async getAllRssFeeds(): Promise<RssFeed[]> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT * FROM rss_feeds ORDER BY created_at DESC');
      return result.rows;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.all('SELECT * FROM rss_feeds ORDER BY created_at DESC');
      return result;
    }
  }

  async createRssFeed(feed: Omit<RssFeed, 'id' | 'created_at' | 'updated_at'>): Promise<RssFeed> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'INSERT INTO rss_feeds (id, user_id, feed_name, feed_url, platform_type, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [id, feed.user_id, feed.feed_name, feed.feed_url, feed.platform_type, feed.is_active, now, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      await sqliteDb.run(
        'INSERT INTO rss_feeds (id, user_id, feed_name, feed_url, platform_type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, feed.user_id, feed.feed_name, feed.feed_url, feed.platform_type, feed.is_active ? 1 : 0, now, now]
      );
      return { ...feed, id, created_at: now, updated_at: now };
    }
  }

  async updateRssFeed(id: string, updates: Partial<RssFeed>): Promise<RssFeed | undefined> {
    const now = new Date();
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `UPDATE rss_feeds SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
        [id, ...values, now]
      );
      return result.rows[0];
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run(
        `UPDATE rss_feeds SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1`,
        [id, ...values, now]
      );
      if (result.changes > 0) {
        return this.getRssFeed(id);
      }
      return undefined;
    }
  }

  async deleteRssFeed(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('DELETE FROM rss_feeds WHERE id = $1', [id]);
      return result.rowCount > 0;
    } else {
      const sqliteDb = await db;
      const result = await sqliteDb.run('DELETE FROM rss_feeds WHERE id = ?', [id]);
      return result.changes > 0;
    }
  }

  // Statistics
  async getUploadStats(): Promise<{
    monthlyUploads: number;
    successRate: number;
    processing: number;
    errors: number;
  }> {
    const allAudioFiles = await this.getAllAudioFiles();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyUploads = allAudioFiles.filter(audioFile => 
      new Date(audioFile.created_at) >= monthStart
    ).length;

    const completed = allAudioFiles.filter(audioFile => audioFile.status === "completed").length;
    const failed = allAudioFiles.filter(audioFile => audioFile.status === "error").length;
    const processing = allAudioFiles.filter(audioFile => audioFile.status === "processing").length;
    
    const successRate = allAudioFiles.length > 0 ? (completed / allAudioFiles.length) * 100 : 0;

    return {
      monthlyUploads,
      successRate: Number(successRate.toFixed(1)),
      processing,
      errors: failed,
    };
  }

  // Upload operations
  async getUpload(id: string): Promise<Upload | undefined> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query('SELECT * FROM uploads WHERE id = $1', [id])
        if (result.rows[0]) {
          result.rows[0].created_at = new Date(result.rows[0].created_at)
          result.rows[0].updated_at = new Date(result.rows[0].updated_at)
        }
        return result.rows[0]
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.get('SELECT * FROM uploads WHERE id = ?', [id])
        if (result) {
          result.created_at = new Date(result.created_at)
          result.updated_at = new Date(result.updated_at)
        }
        return result
      }
    } catch (error) {
      console.error('Error getting upload:', error)
      return undefined
    }
  }

  async getAllUploads(): Promise<Upload[]> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query('SELECT * FROM uploads ORDER BY created_at DESC')
        return result.rows
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.all('SELECT * FROM uploads ORDER BY created_at DESC')
        return result
      }
    } catch (error) {
      console.error('Error getting all uploads:', error)
      return []
    }
  }

  async createUpload(upload: Omit<Upload, 'id' | 'created_at' | 'updated_at'>): Promise<Upload> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(`
          INSERT INTO uploads (user_id, title, description, file_path, processed_file_path, file_size, mime_type, status, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [upload.user_id, upload.title, upload.description, upload.file_path, upload.processed_file_path, upload.file_size, upload.mime_type, upload.status, JSON.stringify(upload.metadata)])
        return result.rows[0]
      } else {
        const sqliteDb = await db
        const id = crypto.randomUUID()
        const now = new Date()
        
        await sqliteDb.run(`
          INSERT INTO uploads (id, user_id, title, description, file_path, processed_file_path, file_size, mime_type, status, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, upload.user_id, upload.title, upload.description, upload.file_path, upload.processed_file_path, upload.file_size, upload.mime_type, upload.status, JSON.stringify(upload.metadata), now, now])
        
        // 生成したIDで作成されたレコードを取得
        return await this.getUpload(id) as Upload
      }
    } catch (error) {
      console.error('Error creating upload:', error)
      throw error
    }
  }

  async updateUpload(id: string, updates: Partial<Upload>): Promise<Upload | undefined> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(`
          UPDATE uploads 
          SET title = COALESCE($2, title),
              description = COALESCE($3, description),
              processed_file_path = COALESCE($4, processed_file_path),
              status = COALESCE($5, status),
              metadata = COALESCE($6, metadata),
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [id, updates.title, updates.description, updates.processed_file_path, updates.status, updates.metadata ? JSON.stringify(updates.metadata) : null])
        return result.rows[0]
      } else {
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
      }
    } catch (error) {
      console.error('Error updating upload:', error)
      return undefined
    }
  }

  // RSS Episode operations
  async getRssEpisodeGuids(feedId: string): Promise<string[]> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query('SELECT guid FROM rss_episodes WHERE feed_id = $1', [feedId]);
        return result.rows.map((row: any) => row.guid);
      } else {
        const sqliteDb = await db;
        const result = await sqliteDb.all('SELECT guid FROM rss_episodes WHERE feed_id = ?', [feedId]);
        return result.map((row: any) => row.guid);
      }
    } catch (error) {
      console.error('Error getting RSS episode GUIDs:', error);
      return [];
    }
  }

  async createRssEpisode(episode: Omit<RssEpisode, 'id' | 'created_at' | 'updated_at'>): Promise<RssEpisode> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(
          'INSERT INTO rss_episodes (id, feed_id, title, description, enclosure_url, enclosure_type, enclosure_length, guid, pub_date, download_status, local_file_path, file_size, mime_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
          [id, episode.feed_id, episode.title, episode.description, episode.enclosure_url, episode.enclosure_type, episode.enclosure_length, episode.guid, episode.pub_date, episode.download_status, episode.local_file_path, episode.file_size, episode.mime_type, now, now]
        );
        return result.rows[0];
      } else {
        const sqliteDb = await db;
        await sqliteDb.run(
          'INSERT INTO rss_episodes (id, feed_id, title, description, enclosure_url, enclosure_type, enclosure_length, guid, pub_date, download_status, local_file_path, file_size, mime_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, episode.feed_id, episode.title, episode.description, episode.enclosure_url, episode.enclosure_type, episode.enclosure_length, episode.guid, episode.pub_date, episode.download_status, episode.local_file_path, episode.file_size, episode.mime_type, now, now]
        );
        return { ...episode, id, created_at: now, updated_at: now };
      }
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
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(
          `UPDATE rss_episodes SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = $1 RETURNING *`,
          [id, ...values, now]
        );
        return result.rows[0];
      } else {
        const sqliteDb = await db;
        await sqliteDb.run(
          `UPDATE rss_episodes SET ${updateFields}, updated_at = $${values.length + 2} WHERE id = ?`,
          [id, ...values, now]
        );
        return undefined;
      }
    } catch (error) {
      console.error('Error updating RSS episode:', error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();

// データベース接続テスト
export const testConnection = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query('SELECT NOW() as now')
      console.log('SQLite connection successful:', result.rows[0])
    } else {
      const sqliteDb = await db
      const result = await sqliteDb.get('SELECT datetime("now") as now')
      console.log('SQLite connection successful:', result)
    }
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