// 音声ファイルの型定義
export interface AudioFile {
  id: string
  userId: string
  fileName: string
  fileUrl: string
  fileSize: number
  duration: number | null
  status: 'uploading' | 'processing' | 'completed' | 'error'
  createdAt: Date
  updatedAt: Date
}

// ジョブの型定義
export interface Job {
  id: string
  userId: string
  audioFileId: string
  jobType: 'trim' | 'distribute' | 'transcribe' | 'summarize'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resultUrl: string | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

// ユーザーの型定義
export interface User {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
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
  userId: string
  platformType: 'voicy' | 'youtube' | 'spotify'
  platformName: string
  credentials: Record<string, any>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// API レスポンスの型定義
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
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