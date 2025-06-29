import { uploadToVoicy } from '@/lib/voicyClient'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/mnt/volume/uploads'
  : path.join(process.cwd(), 'uploads')

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Voicy upload API called')
    
    const body = await request.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2))
    
    // 必要なパラメータの検証
    const {
      email,
      password,
      title,
      description,
      hashtags,
      audioFiles,
      reservationDate,
      reservationTime,
      browserlessWSEndpoint
    } = body

    console.log('🔍 Validating parameters...')
    console.log('  - email:', email ? '✅ provided' : '❌ missing')
    console.log('  - password:', password ? '✅ provided' : '❌ missing')
    console.log('  - title:', title ? '✅ provided' : '❌ missing')
    console.log('  - audioFiles:', audioFiles ? `✅ provided (${audioFiles.length} files)` : '❌ missing')

    if (!email || !password || !title || !audioFiles || !Array.isArray(audioFiles)) {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ 
        error: 'Missing required parameters',
        required: ['email', 'password', 'title', 'audioFiles'],
        received: Object.keys(body)
      }, { status: 400 })
    }

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

    // 環境変数を設定
    console.log('🔍 Setting environment variables...')
    process.env.VOICY_EMAIL = email
    process.env.VOICY_PASSWORD = password

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
      browserlessWSEndpoint
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