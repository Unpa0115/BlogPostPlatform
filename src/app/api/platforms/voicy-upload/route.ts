import { uploadToVoicy } from '@/lib/voicyClient'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/mnt/volume/uploads'
  : path.join(process.cwd(), 'uploads')

async function getVoicyCredentials(userId: string): Promise<{ email: string; password: string }> {
  // データベースからVoicy認証情報を取得
  if (process.env.NODE_ENV === 'production') {
    // PostgreSQL
    const result = await db.query(`
      SELECT credentials
      FROM distribution_platforms
      WHERE user_id = $1 AND platform_type = 'voicy' AND is_active = true
      LIMIT 1
    `, [userId])

    if (result.rows.length === 0) {
      throw new Error("Voicyの認証情報が設定されていません。プラットフォーム設定ページで設定してください。");
    }

    const platform = result.rows[0]
    if (!platform.credentials || !platform.credentials.encrypted) {
      throw new Error("認証情報の形式が正しくありません。");
    }

    try {
      const decryptedCredentials = PlatformCredentials.decryptVoicy(platform.credentials.encrypted)
      return decryptedCredentials
    } catch (error) {
      console.error('Voicy credentials decryption error:', error)
      throw new Error("認証情報の復号化に失敗しました。");
    }
  } else {
    // SQLite
    const sqliteDb = await db
    const result = await sqliteDb.get(`
      SELECT credentials
      FROM distribution_platforms
      WHERE user_id = ? AND platform_type = 'voicy' AND is_active = 1
      LIMIT 1
    `, [userId])

    if (!result) {
      throw new Error("Voicyの認証情報が設定されていません。プラットフォーム設定ページで設定してください。");
    }

    if (!result.credentials) {
      throw new Error("認証情報の形式が正しくありません。");
    }

    try {
      const credentials = typeof result.credentials === 'string' 
        ? JSON.parse(result.credentials) 
        : result.credentials
      
      if (!credentials.encrypted) {
        throw new Error("認証情報の形式が正しくありません。");
      }

      const decryptedCredentials = PlatformCredentials.decryptVoicy(credentials.encrypted)
      return decryptedCredentials
    } catch (error) {
      console.error('Voicy credentials decryption error:', error)
      throw new Error("認証情報の復号化に失敗しました。");
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Voicy upload API called')
    
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2))
    
    // 必要なパラメータの検証
    const {
      title,
      description,
      hashtags,
      audioFiles,
      reservationDate,
      reservationTime,
      browserlessWSEndpoint,
      usePythonScript = false // Python版を使用するかどうか（デフォルト: false）
    } = body

    console.log('🔍 Validating parameters...')
    console.log('  - title:', title ? '✅ provided' : '❌ missing')
    console.log('  - audioFiles:', audioFiles ? `✅ provided (${audioFiles.length} files)` : '❌ missing')
    console.log('  - usePythonScript:', usePythonScript ? '✅ enabled' : '❌ disabled')

    if (!title || !audioFiles || !Array.isArray(audioFiles)) {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ 
        error: 'Missing required parameters',
        required: ['title', 'audioFiles'],
        received: Object.keys(body)
      }, { status: 400 })
    }

    // Voicy認証情報を取得
    console.log('🔐 Getting Voicy credentials...')
    const { email, password } = await getVoicyCredentials(user.id)
    console.log('✅ Voicy credentials retrieved successfully')

    // ファイルパスを実際のファイルシステムパスに変換
    console.log('🔍 Converting file paths...')
    const actualAudioFiles = audioFiles.map((filePath: string) => {
      const actualFilePath = path.join(UPLOAD_DIR, filePath)
      console.log(`  - ${filePath} -> ${actualFilePath}`)
      return actualFilePath
    })

    // ファイルの存在確認
    console.log('🔍 Checking file existence...')
    for (const filePath of actualAudioFiles) {
      try {
        await fs.access(filePath)
        console.log(`  ✅ File exists: ${filePath}`)
      } catch (error) {
        console.log(`  ❌ File not found: ${filePath}`)
        return NextResponse.json({ 
          error: 'File not found',
          filePath: filePath
        }, { status: 404 })
      }
    }

    console.log('🚀 Starting Voicy upload process...')
    const result = await uploadToVoicy({
      email,
      password,
      title,
      description: description || '',
      hashtags: hashtags || '',
      audioFiles: actualAudioFiles,
      reservationDate: reservationDate || new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      reservationTime: reservationTime || '06:00',
      browserlessWSEndpoint,
      usePythonScript
    })

    console.log('📤 Upload result:', result)

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Voicy upload error:', error)
    return NextResponse.json({ 
      error: 'Voicy upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 