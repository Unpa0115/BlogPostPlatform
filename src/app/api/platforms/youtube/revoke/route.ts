import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // YouTubeプラットフォームの認証情報を取得
    let youtubePlatform = null
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'SELECT id, credentials FROM distribution_platforms WHERE user_id = $1 AND platform_type = $2',
        [user.id, 'youtube']
      )
      
      if (result.rows.length > 0) {
        youtubePlatform = result.rows[0]
      }
    } else {
      const sqliteDb = await db
      youtubePlatform = await sqliteDb.get(
        'SELECT id, credentials FROM distribution_platforms WHERE user_id = ? AND platform_type = ?',
        [user.id, 'youtube']
      )
    }

    if (youtubePlatform) {
      // 既存の認証情報を取得
      let existingCredentials = { clientId: '', clientSecret: '' }
      if (youtubePlatform.credentials) {
        try {
          const storedCredentials = typeof youtubePlatform.credentials === 'string' 
            ? JSON.parse(youtubePlatform.credentials) 
            : youtubePlatform.credentials
          
          if (storedCredentials.encrypted) {
            existingCredentials = PlatformCredentials.decryptYouTube(storedCredentials.encrypted)
          }
        } catch (error) {
          console.error('Error decrypting existing credentials:', error)
        }
      }

      // accessTokenとrefreshTokenを削除し、clientIdとclientSecretのみ保持
      const resetCredentials = {
        clientId: existingCredentials.clientId,
        clientSecret: existingCredentials.clientSecret
        // accessTokenとrefreshTokenを削除
      }

      // 認証情報を暗号化
      const encryptedCredentials = {
        encrypted: PlatformCredentials.encryptYouTube(resetCredentials)
      }

      // データベースを更新
      if (process.env.NODE_ENV === 'production') {
        await db.query(`
          UPDATE distribution_platforms 
          SET credentials = $1, updated_at = NOW()
          WHERE id = $2
        `, [encryptedCredentials, youtubePlatform.id])
      } else {
        const sqliteDb = await db
        const now = new Date().toISOString()
        await sqliteDb.run(`
          UPDATE distribution_platforms 
          SET credentials = ?, updated_at = ?
          WHERE id = ?
        `, [JSON.stringify(encryptedCredentials), now, youtubePlatform.id])
      }

      return NextResponse.json({
        success: true,
        message: 'YouTube credentials reset successfully. Please re-authenticate.'
      })
    } else {
      return NextResponse.json({
        error: 'YouTube platform not found'
      }, { status: 404 })
    }

  } catch (error) {
    console.error('YouTube revoke error:', error)
    return NextResponse.json({ 
      error: 'Failed to reset YouTube credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 