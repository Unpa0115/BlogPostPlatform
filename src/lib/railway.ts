import { Pool } from 'pg'
import axios from 'axios'

// Railway PostgreSQL接続
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Railway API クライアント
export const railwayApi = axios.create({
  baseURL: 'https://backboard.railway.app/graphql/v2',
  headers: {
    'Authorization': `Bearer ${process.env.RAILWAY_TOKEN}`,
    'Content-Type': 'application/json',
  },
})

// Railway Storage クライアント
export const railwayStorage = {
  upload: async (file: Buffer, fileName: string, contentType: string) => {
    const response = await axios.post(
      `${process.env.RAILWAY_STORAGE_ENDPOINT}/upload`,
      {
        bucket: process.env.RAILWAY_STORAGE_BUCKET,
        key: fileName,
        body: file.toString('base64'),
        contentType,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RAILWAY_TOKEN}`,
        },
      }
    )
    return response.data
  },

  getSignedUrl: async (fileName: string, expiresIn: number = 3600) => {
    const response = await axios.post(
      `${process.env.RAILWAY_STORAGE_ENDPOINT}/presigned-url`,
      {
        bucket: process.env.RAILWAY_STORAGE_BUCKET,
        key: fileName,
        expiresIn,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RAILWAY_TOKEN}`,
        },
      }
    )
    return response.data.url
  },

  delete: async (fileName: string) => {
    const response = await axios.delete(
      `${process.env.RAILWAY_STORAGE_ENDPOINT}/delete`,
      {
        data: {
          bucket: process.env.RAILWAY_STORAGE_BUCKET,
          key: fileName,
        },
        headers: {
          'Authorization': `Bearer ${process.env.RAILWAY_TOKEN}`,
        },
      }
    )
    return response.data
  },
}

// データベース型定義
export interface Database {
  users: {
    id: string
    email: string
    password_hash: string
    created_at: Date
    updated_at: Date
  }
  audio_files: {
    id: string
    user_id: string
    file_name: string
    file_url: string
    file_size: number
    duration: number | null
    status: 'uploading' | 'processing' | 'completed' | 'error'
    created_at: Date
    updated_at: Date
  }
  jobs: {
    id: string
    user_id: string
    audio_file_id: string
    job_type: 'trim' | 'distribute' | 'transcribe' | 'summarize'
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result_url: string | null
    error_message: string | null
    created_at: Date
    updated_at: Date
  }
  distribution_platforms: {
    id: string
    user_id: string
    platform_type: 'voicy' | 'youtube' | 'spotify'
    platform_name: string
    credentials: Record<string, any>
    enabled: boolean
    created_at: Date
    updated_at: Date
  }
} 