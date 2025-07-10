import { NextRequest, NextResponse } from 'next/server'
import { trimAudio, detectSilence, detectKeywordPosition } from '@/lib/audioUtils'
import path from 'path'
import fs from 'fs/promises'
import { storage } from '@/lib/storage'
import { safeDateToISOString } from '@/lib/utils'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'  // Railway Storageのマウントパス
  : path.join(process.cwd(), 'uploads')

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileId, start, duration, outputFileName, trimSilence, keyword, openaiApiKey } = await request.json()
    
    // fileIdが送信された場合はfilePathとして扱う
    const actualFilePath = fileId || filePath
    
    if (!actualFilePath || !outputFileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // ファイルパスを実際のファイルシステムパスに変換
    const fullFilePath = path.join(UPLOAD_DIR, actualFilePath)
    
    // ファイルの存在確認
    try {
      await fs.access(fullFilePath)
    } catch (error) {
      return NextResponse.json({ 
        error: 'File not found',
        filePath: fullFilePath
      }, { status: 404 })
    }

    let trimStart = typeof start === 'number' ? start : 0
    let trimDuration = typeof duration === 'number' ? duration : undefined

    // 無音トリミング
    if (trimSilence) {
      const silence = await detectSilence(fullFilePath)
      trimStart = silence.start
      trimDuration = silence.duration
    }

    // キーワード位置検出
    if (keyword && openaiApiKey) {
      const keywordPos = await detectKeywordPosition(fullFilePath, keyword, openaiApiKey)
      if (keywordPos !== null) {
        trimStart = keywordPos
        // durationはファイル全体長-キーワード位置（暫定）
        if (typeof trimDuration === 'number') {
          trimDuration = trimDuration - trimStart
        }
      }
    }

    if (typeof trimStart !== 'number' || typeof trimDuration !== 'number') {
      return NextResponse.json({ error: 'トリミング範囲が決定できませんでした' }, { status: 400 })
    }
    
    const outputPath = path.join(UPLOAD_DIR, outputFileName)
    await trimAudio(fullFilePath, outputPath, trimStart, trimDuration)
    
    // トリミング後のファイルサイズを取得
    const outputStats = await fs.stat(outputPath)
    const outputFileSize = outputStats.size
    
    // 元のファイルのメタデータを取得
    const originalMetadataPath = fullFilePath + '.metadata.json'
    let originalMetadata: Record<string, any> = {}
    try {
      const metadataContent = await fs.readFile(originalMetadataPath, 'utf-8')
      originalMetadata = JSON.parse(metadataContent)
    } catch (error) {
      console.log('Original metadata not found, using empty object')
    }
    
    // トリミング後のファイルをデータベースに登録
    let upload;
    try {
      console.log(`💾 Saving trimmed file to database: ${outputFileName}`)
      
      upload = await storage.createUpload({
        user_id: LOCALHOST_USER_ID,
        title: `Trimmed: ${originalMetadata.title || outputFileName}`,
        description: originalMetadata.description || '',
        file_path: outputPath,
        file_size: outputFileSize,
        mime_type: 'audio/mpeg', // トリミング後は通常MP3
        status: 'completed',
        metadata: {
          ...originalMetadata,
          trimmed: true,
          original_file: actualFilePath,
          trim_start: trimStart,
          trim_duration: trimDuration
        }
      })
      
      console.log(`✅ Trimmed file saved to database:`, upload)
    } catch (dbError) {
      console.error('❌ DB保存エラー:', dbError)
      return NextResponse.json({ 
        error: 'DB保存に失敗しました', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      outputPath: outputFileName,
      trimStart,
      trimDuration,
      data: {
        processed_file_name: outputFileName,
        id: upload.id,
        file_name: outputFileName,
        file_size: outputFileSize,
        created_at: safeDateToISOString(upload.created_at) || new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Trim error:', error)
    return NextResponse.json({ 
      error: 'Trim failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 