import { NextRequest, NextResponse } from 'next/server'
import { YouTube } from '@/lib/youtube'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { CredentialEncryption } from '@/lib/encryption'
import path from 'path'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'
  : path.join(process.cwd(), 'uploads')

export async function POST(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please login to upload to YouTube'
      }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, tags, categoryId, privacyStatus, filePath, mimeType } = body

    console.log('=== YouTube Upload Request ===')
    console.log('User ID:', user.id)
    console.log('Title:', title)
    console.log('File path:', filePath)

    // 必須パラメータのチェック
    if (!title || !filePath) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        message: 'Title and file path are required'
      }, { status: 400 })
    }

    // ファイルパスの解決
    const actualFilePath = path.join(UPLOAD_DIR, filePath)
    console.log('Actual file path:', actualFilePath)

    // YouTube認証情報を取得
    let credentials
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(
          'SELECT client_id, client_secret, access_token, refresh_token, expires_at FROM platform_credentials WHERE platform_type = $1',
          ['youtube']
        )
        if (!result.rows[0]) {
          throw new Error('YouTube credentials not found')
        }
        const row = result.rows[0]
        credentials = {
          clientId: row.client_id,
          clientSecret: row.client_secret,
          accessToken: row.access_token,
          refreshToken: row.refresh_token,
          expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined
        }
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.get(
          'SELECT client_id, client_secret, access_token, refresh_token, expires_at FROM platform_credentials WHERE platform_type = ?',
          ['youtube']
        )
        if (!result) {
          throw new Error('YouTube credentials not found')
        }
        credentials = {
          clientId: result.client_id,
          clientSecret: result.client_secret,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: result.expires_at ? new Date(result.expires_at).getTime() : undefined
        }
      }

      // トークンの有効性をチェック
      if (!credentials.refreshToken) {
        throw new Error('Refresh token not found')
      }

      // アクセストークンが期限切れの場合は更新
      if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
        console.log('Access token expired, refreshing...')
        const refreshedCredentials = await YouTube.refreshAccessToken(credentials.refreshToken)
        credentials = refreshedCredentials
        
        // 更新されたトークンを保存
        if (process.env.NODE_ENV === 'production') {
          await db.query(
            `UPDATE platform_credentials 
             SET access_token = $1, expires_at = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE platform_type = $3`,
            [credentials.accessToken, credentials.expiresAt ? new Date(credentials.expiresAt) : null, 'youtube']
          )
        } else {
          const sqliteDb = await db
          await sqliteDb.run(
            `UPDATE platform_credentials 
             SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE platform_type = ?`,
            [credentials.accessToken, credentials.expiresAt ? new Date(credentials.expiresAt) : null, 'youtube']
          )
        }
        console.log('Access token refreshed and saved')
      }
    } catch (error) {
      console.error('Error retrieving YouTube credentials:', error)
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'YouTube authentication is required. Please authenticate first.'
      }, { status: 401 })
    }

    // YouTube動画をアップロード
    try {
      const uploadResult = await YouTube.uploadVideo({
        title,
        description,
        tags,
        categoryId,
        privacyStatus,
        filePath: actualFilePath,
        mimeType,
        credentials
      })

      console.log('YouTube upload successful:', uploadResult.id)

      return NextResponse.json({
        success: true,
        video: uploadResult,
        videoId: uploadResult.id,
        message: 'Video uploaded successfully to YouTube'
      })

    } catch (uploadError) {
      console.error('YouTube upload failed:', uploadError)
      return NextResponse.json({ 
        error: 'Upload failed',
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('YouTube upload API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 