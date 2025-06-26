import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/railway'
import { verifyAuth } from '@/lib/auth'
import { PlatformCredentials } from '@/lib/encryption'

// プラットフォーム一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await db.query(`
      SELECT id, platform_type, platform_name, is_active, created_at, updated_at
      FROM distribution_platforms
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [user.id])

    return NextResponse.json({
      success: true,
      data: result.rows
    })

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
        return NextResponse.json({ error: 'Failed to encrypt credentials' }, { status: 500 })
      }
    }

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
        SET platform_name = $1, credentials = $2, settings = $3, updated_at = NOW()
        WHERE user_id = $4 AND platform_type = $5
        RETURNING id, platform_type, platform_name, is_active
      `, [platform_name, encryptedCredentials, settings || {}, user.id, platform_type])
    } else {
      // 新規作成
      result = await db.query(`
        INSERT INTO distribution_platforms (user_id, platform_type, platform_name, credentials, settings)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, platform_type, platform_name, is_active
      `, [user.id, platform_type, platform_name, encryptedCredentials, settings || {}])
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Create/update platform error:', error)
    return NextResponse.json({ error: 'Failed to create/update platform' }, { status: 500 })
  }
} 