import { NextRequest, NextResponse } from 'next/server'
import { trimAudio, detectSilence, detectKeywordPosition, getAudioInfo } from '@/lib/audioUtils'
import path from 'path'
import fs from 'fs/promises'
import { storage } from '@/lib/storage'
import { safeDateToISOString } from '@/lib/utils'
import { PlatformCredentials } from '@/lib/encryption'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'  // Railway Storageのマウントパス
  : path.join(process.cwd(), 'uploads')

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileId, start, duration, outputFileName, trimSilence, keyword } = await request.json()
    
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
      try {
        const silence = await detectSilence(fullFilePath)
        trimStart = silence.start
        trimDuration = silence.duration
      } catch (error) {
        console.error('無音検出エラー:', error)
        // フォールバック: 最初と最後の1秒をトリミング
        trimStart = 1
        trimDuration = Math.max(1, (typeof duration === 'number' ? duration : 30) - 2)
      }
    }

    // キーワード位置検出
    if (keyword) {
      console.log(`🔍 Keyword detection requested for: "${keyword}"`)
      
      // 環境変数からOpenAI APIキーを取得
      const openaiApiKey = process.env.OPENAI_API_KEY
      
      if (!openaiApiKey) {
        console.error('❌ OpenAI API key not configured')
        return NextResponse.json({ 
          error: 'OpenAI API key not configured',
          message: 'OPENAI_API_KEY環境変数を設定してください。env.exampleを参考にしてください。',
          hint: 'プラットフォーム設定ページでの設定は不要になりました。.env.localファイルで環境変数を設定してください。'
        }, { status: 400 })
      }

      if (!openaiApiKey.startsWith('sk-')) {
        console.error('❌ Invalid OpenAI API key format')
        return NextResponse.json({ 
          error: 'Invalid OpenAI API key format',
          message: 'OPENAI_API_KEYの形式が正しくありません。sk-で始まる必要があります。'
        }, { status: 400 })
      }

      console.log('✅ OpenAI API key validated')
      console.log(`📁 Analyzing file: ${fullFilePath}`)
      
      try {
        // 音声ファイルの情報を取得
        const audioInfo = await getAudioInfo(fullFilePath)
        console.log(`🎵 Audio file info: duration=${audioInfo.duration.toFixed(2)}s, format=${audioInfo.format}`)
        
        const keywordPos = await detectKeywordPosition(fullFilePath, keyword, openaiApiKey)
        
        if (keywordPos !== null) {
          console.log(`✅ Keyword found at position: ${keywordPos}s`)
          trimStart = keywordPos
          
          // キーワード位置から音声ファイルの終端までトリミング
          trimDuration = Math.max(1, audioInfo.duration - keywordPos) // 最低1秒は残す
          
          console.log(`📏 Updated trim parameters: start=${trimStart}s, duration=${trimDuration}s (keyword to end)`)
          console.log(`💡 This will trim from "${keyword}" at ${keywordPos}s to the end of file at ${audioInfo.duration.toFixed(2)}s`)
        } else {
          console.log('❌ Keyword not found, using original trim parameters')
        }
      } catch (error) {
        console.error('❌ Keyword detection failed:', error)
        // キーワード検出に失敗した場合は元のパラメータを使用
        console.log('📋 Falling back to original trim parameters')
      }
    }

    // trimDurationが未定義の場合はデフォルト値を設定
    if (typeof trimDuration !== 'number') {
      trimDuration = 30 // デフォルト30秒
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
    
    // 処理後の詳細情報を取得
    let audioDetails = null
    try {
      if (keyword) {
        const originalAudioInfo = await getAudioInfo(fullFilePath)
        const trimmedAudioInfo = await getAudioInfo(outputPath)
        audioDetails = {
          original: {
            duration: originalAudioInfo.duration,
            format: originalAudioInfo.format,
            size: (await fs.stat(fullFilePath)).size
          },
          trimmed: {
            duration: trimmedAudioInfo.duration,
            format: trimmedAudioInfo.format,
            size: outputFileSize
          }
        }
      }
    } catch (error) {
      console.log('Audio details extraction failed:', error)
    }

    return NextResponse.json({ 
      success: true, 
      outputPath: outputFileName,
      trimStart,
      trimDuration,
      keyword: keyword || null,
      keywordDetected: keyword ? (trimStart > 0) : null,
      audioDetails,
      data: {
        processed_file_name: outputFileName,
        id: upload.id,
        file_name: outputFileName,
        file_size: outputFileSize,
        created_at: safeDateToISOString(upload.created_at) || new Date().toISOString()
      },
      processingInfo: {
        originalFile: actualFilePath,
        trimSilence: trimSilence || false,
        keywordSearch: keyword || null,
        finalTrimStart: trimStart,
        finalTrimDuration: trimDuration
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