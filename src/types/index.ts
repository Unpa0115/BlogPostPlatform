// 音声ファイルの型定義
export interface AudioFile {
  id: string
  user_id: string
  file_name: string
  file_url: string
  file_size: number
  duration: number | null
  status: 'uploading' | 'processing' | 'completed' | 'error'
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

// ジョブの型定義
export interface Job {
  id: string
  user_id: string
  audio_file_id: string
  job_type: 'trim' | 'distribute' | 'transcribe' | 'summarize' | 'upload_to_platform'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url: string | null
  error_message: string | null
  progress: number
  platform_type?: string
  created_at: Date
  updated_at: Date
}

// ユーザーの型定義
export interface User {
  id: string
  email: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

// プラグインの型定義
export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  enabled: boolean
}

// 配信プラットフォームの型定義
export interface DistributionPlatform {
  id: string
  user_id: string
  platform_type: 'voicy' | 'youtube' | 'spotify'
  platform_name: string
  credentials: Record<string, any>
  settings: Record<string, any>
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// RSSフィード関連
export interface RssFeed {
  id: string
  user_id: string
  feed_name: string
  feed_url: string
  platform_type: 'spotify' | 'apple' | 'google'
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// プラットフォーム設定関連
export interface PlatformSettings {
  id: string
  platform_type: string
  settings: Record<string, any>
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// 認証通知
export interface AuthNotification {
  id: string
  user_id: string
  platform_type: string
  notification_type: string
  message: string
  action_url?: string
  is_read: boolean
  expires_at?: Date
  created_at: Date
  updated_at: Date
}

// Voicy認証関連
export interface VoicyCredentials {
  email: string
  password: string
  sessionToken?: string
}

// YouTube認証関連
export interface YouTubeToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  status: 'active' | 'warning' | 'expired'
  expires_at: Date
  created_at: Date
  updated_at: Date
}

export interface YouTubeCredentials {
  clientId: string
  clientSecret: string
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
}

// Spotify認証関連
export interface SpotifyCredentials {
  clientId: string
  clientSecret: string
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
}

// アップロード関連
export interface UploadRequest {
  file: File
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
    category?: string
  }
}

export interface UploadResponse {
  id: string
  file_url: string
  status: string
}

// 音声処理関連
export interface AudioProcessingRequest {
  audio_file_id: string
  job_type: 'trim' | 'transcribe' | 'summarize'
  options?: {
    start_time?: number
    end_time?: number
    language?: string
    model?: string
  }
}

export interface AudioProcessingResponse {
  job_id: string
  status: string
  result_url?: string
}

// 配信関連
export interface DistributionRequest {
  audio_file_id: string
  platform_type: 'voicy' | 'youtube' | 'spotify'
  metadata: {
    title: string
    description: string
    tags?: string[]
    category?: string
    thumbnail_url?: string
  }
}

export interface DistributionResponse {
  job_id: string
  status: string
  platform_url?: string
}

// RSSエピソード関連
export interface RssEpisode {
  id: string
  title: string
  description: string
  audio_url: string
  duration: number
  published_at: Date
  feed_id: string
}

// API レスポンスの型定義
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 統計情報
export interface Stats {
  total_uploads: number
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  active_platforms: number
}

// ファイルアップロード進捗
export interface UploadProgress {
  file_id: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error_message?: string
}

// ファイルアップロードの型定義
export interface FileUpload {
  file: File
  progress: number
  status: 'idle' | 'uploading' | 'completed' | 'error'
  error?: string
}

// トリミング設定の型定義
export interface TrimSettings {
  startTime: number
  endTime: number
  removeSilence: boolean
  fadeIn: boolean
  fadeOut: boolean
}

// 認証関連の型定義
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Railway関連の型定義
export interface RailwayConfig {
  projectId: string
  token: string
  databaseUrl: string
  storageBucket: string
  storageEndpoint: string
} 