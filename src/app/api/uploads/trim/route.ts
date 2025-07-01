import { NextRequest, NextResponse } from 'next/server'
import { trimAudio, detectSilence, detectKeywordPosition } from '@/lib/audioUtils'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'  // Railway Storageのマウントパス
  : path.join(process.cwd(), 'uploads')

export async function POST(request: NextRequest) {
  try {
    const { filePath, start, duration, outputFileName, trimSilence, keyword, openaiApiKey } = await request.json()
    if (!filePath || !outputFileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // ファイルパスを実際のファイルシステムパスに変換
    const actualFilePath = path.join(UPLOAD_DIR, filePath)
    
    // ファイルの存在確認
    try {
      await fs.access(actualFilePath)
    } catch (error) {
      return NextResponse.json({ 
        error: 'File not found',
        filePath: actualFilePath
      }, { status: 404 })
    }

    let trimStart = typeof start === 'number' ? start : 0
    let trimDuration = typeof duration === 'number' ? duration : undefined

    // 無音トリミング
    if (trimSilence) {
      const silence = await detectSilence(actualFilePath)
      trimStart = silence.start
      trimDuration = silence.duration
    }

    // キーワード位置検出
    if (keyword && openaiApiKey) {
      const keywordPos = await detectKeywordPosition(actualFilePath, keyword, openaiApiKey)
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
    await trimAudio(actualFilePath, outputPath, trimStart, trimDuration)
    
    return NextResponse.json({ 
      success: true, 
      outputPath: outputFileName,
      trimStart,
      trimDuration
    })
  } catch (error) {
    console.error('Trim error:', error)
    return NextResponse.json({ 
      error: 'Trim failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 