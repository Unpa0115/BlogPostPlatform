import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'
import { PlatformCredentials } from '@/lib/encryption'

// UUID生成（SQLite用）
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// プラットフォーム一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      const result = await db.query(`
        SELECT id, platform_type, platform_name, is_active, credentials, created_at, updated_at
        FROM distribution_platforms
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id])

      // 認証情報を復号化
      const decryptedData = result.rows.map((platform: any) => {
        if (platform.credentials && platform.credentials.encrypted) {
          try {
            let decryptedCredentials = {}
            switch (platform.platform_type) {
              case 'youtube':
                decryptedCredentials = PlatformCredentials.decryptYouTube(platform.credentials.encrypted)
                break
              case 'voicy':
                decryptedCredentials = PlatformCredentials.decryptVoicy(platform.credentials.encrypted)
                break
              case 'spotify':
                decryptedCredentials = PlatformCredentials.decryptSpotify(platform.credentials.encrypted)
                break
            }
            return {
              ...platform,
              credentials: decryptedCredentials
            }
          } catch (error) {
            console.error('Decryption error for platform:', platform.platform_type, error)
            return platform
          }
        }
        return platform
      })

      return NextResponse.json({
        success: true,
        data: decryptedData
      })
    } else {
      // SQLite
      const sqliteDb = await db
      const result = await sqliteDb.all(`
        SELECT id, platform_type, platform_name, is_active, credentials, created_at, updated_at
        FROM distribution_platforms
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [user.id])

      // 認証情報を復号化
      const decryptedData = result.map((platform: any) => {
        if (platform.credentials) {
          try {
            const credentials = typeof platform.credentials === 'string' 
              ? JSON.parse(platform.credentials) 
              : platform.credentials
            
            if (credentials.encrypted) {
              let decryptedCredentials = {}
              switch (platform.platform_type) {
                case 'youtube':
                  decryptedCredentials = PlatformCredentials.decryptYouTube(credentials.encrypted)
                  break
                case 'voicy':
                  decryptedCredentials = PlatformCredentials.decryptVoicy(credentials.encrypted)
                  break
                case 'spotify':
                  decryptedCredentials = PlatformCredentials.decryptSpotify(credentials.encrypted)
                  break
              }
              return {
                ...platform,
                credentials: decryptedCredentials
              }
            }
          } catch (error) {
            console.error('Decryption error for platform:', platform.platform_type, error)
          }
        }
        return platform
      })

      return NextResponse.json({
        success: true,
        data: decryptedData
      })
    }

  } catch (error) {
    console.error('Get platforms error:', error)
    return NextResponse.json({ error: 'Failed to get platforms' }, { status: 500 })
  }
}

// プラットフォーム追加・更新
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform_type, platform_name, credentials, settings } = body

    if (!platform_type || !platform_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Credentialsを暗号化
    let encryptedCredentials = {}
    if (credentials) {
      try {
        switch (platform_type) {
          case 'youtube':
            encryptedCredentials = {
              encrypted: PlatformCredentials.encryptYouTube(credentials)
            }
            break
          case 'voicy':
            encryptedCredentials = {
              encrypted: PlatformCredentials.encryptVoicy(credentials)
            }
            break
          case 'spotify':
            encryptedCredentials = {
              encrypted: PlatformCredentials.encryptSpotify(credentials)
            }
            break
          default:
            return NextResponse.json({ error: 'Unsupported platform type' }, { status: 400 })
        }
      } catch (error) {
        console.error('Encryption error:', error)
        return NextResponse.json({ 
          error: 'Failed to encrypt credentials',
          details: error instanceof Error ? error.message : 'Unknown encryption error'
        }, { status: 500 })
      }
    }

    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      // 既存のプラットフォームをチェック
      const existingResult = await db.query(
        'SELECT id FROM distribution_platforms WHERE user_id = $1 AND platform_type = $2',
        [user.id, platform_type]
      )

      let result
      if (existingResult.rows.length > 0) {
        // 更新
        result = await db.query(`
          UPDATE distribution_platforms 
          SET platform_name = $1, credentials = $2, settings = $3, is_active = true, updated_at = NOW()
          WHERE user_id = $4 AND platform_type = $5
          RETURNING id, platform_type, platform_name, is_active
        `, [platform_name, encryptedCredentials, settings || {}, user.id, platform_type])
      } else {
        // 新規作成
        result = await db.query(`
          INSERT INTO distribution_platforms (user_id, platform_type, platform_name, credentials, settings, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING id, platform_type, platform_name, is_active
        `, [user.id, platform_type, platform_name, encryptedCredentials, settings || {}])
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      })
    } else {
      // SQLite
      const sqliteDb = await db
      
      // 既存のプラットフォームをチェック
      const existingResult = await sqliteDb.get(
        'SELECT id FROM distribution_platforms WHERE user_id = ? AND platform_type = ?',
        [user.id, platform_type]
      )

      let result
      if (existingResult) {
        // 更新
        const now = new Date().toISOString()
        await sqliteDb.run(`
          UPDATE distribution_platforms 
          SET platform_name = ?, credentials = ?, settings = ?, is_active = 1, updated_at = ?
          WHERE user_id = ? AND platform_type = ?
        `, [platform_name, JSON.stringify(encryptedCredentials), JSON.stringify(settings || {}), now, user.id, platform_type])
        
        result = await sqliteDb.get(
          'SELECT id, platform_type, platform_name, is_active FROM distribution_platforms WHERE user_id = ? AND platform_type = ?',
          [user.id, platform_type]
        )
      } else {
        // 新規作成
        const platformId = generateUUID()
        const now = new Date().toISOString()
        
        await sqliteDb.run(`
          INSERT INTO distribution_platforms (id, user_id, platform_type, platform_name, credentials, settings, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [platformId, user.id, platform_type, platform_name, JSON.stringify(encryptedCredentials), JSON.stringify(settings || {}), now, now])
        
        result = {
          id: platformId,
          platform_type,
          platform_name,
          is_active: 1
        }
      }

      return NextResponse.json({
        success: true,
        data: result
      })
    }

  } catch (error) {
    console.error('Create/update platform error:', error)
    return NextResponse.json({ error: 'Failed to create/update platform' }, { status: 500 })
  }
} 