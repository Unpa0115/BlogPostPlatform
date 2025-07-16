// @ts-ignore
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import OpenAI from 'openai'

/**
 * 音声ファイルの詳細情報を取得
 */
export async function getAudioInfo(audioPath: string): Promise<{
  duration: number;
  format: string;
  bitrate: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err: any, metadata: any) => {
      if (err) {
        reject(err)
        return
      }
      
      const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio')
      if (!audioStream) {
        reject(new Error('No audio stream found'))
        return
      }

      resolve({
        duration: parseFloat(metadata.format.duration) || 0,
        format: metadata.format.format_name || 'unknown',
        bitrate: parseInt(audioStream.bit_rate) || 0
      })
    })
  })
}

export async function trimAudio(inputPath: string, outputPath: string, start: number, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run()
  })
}

export async function transcribeAudioWhisper(audioPath: string, openaiApiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey: openaiApiKey })
  const audio = fs.createReadStream(audioPath)
  const resp = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    response_format: 'json',
    language: 'ja',
  })
  return resp.text
}

/**
 * 指定したキーフレーズが現れる最初の位置（秒）をWhisper APIで検出
 */
export async function detectKeywordPosition(audioPath: string, keyword: string, openaiApiKey: string): Promise<number | null> {
  try {
    console.log(`🔍 Starting keyword detection for: "${keyword}"`)
    console.log(`📁 Audio file path: ${audioPath}`)
    
    const openai = new OpenAI({ apiKey: openaiApiKey })
    const audio = fs.createReadStream(audioPath)
    
    // まずは基本的な文字起こしを実行
    console.log('📝 Requesting transcription from Whisper API...')
    const resp = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      response_format: 'verbose_json',
      language: 'ja'
    })
    
    console.log('✅ Transcription completed')
    console.log(`📄 Full transcript: "${resp.text}"`)
    
    // セグメント情報をチェック
    const segments = (resp as any).segments || []
    console.log(`📊 Found ${segments.length} segments`)
    
    if (segments.length === 0) {
      console.log('❌ No segments found in transcription')
      return null
    }
    
    // キーワードを正規化（空白除去、小文字変換）
    const normalizedKeyword = keyword.trim().toLowerCase()
    console.log(`🎯 Searching for keyword: "${normalizedKeyword}"`)
    
    // 各セグメントでキーワードを検索
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentText = (segment.text || '').toLowerCase()
      
      console.log(`📝 Segment ${i + 1}: "${segment.text}" (${segment.start}s - ${segment.end}s)`)
      
      // キーワードがセグメントに含まれているかチェック
      if (segmentText.includes(normalizedKeyword)) {
        console.log(`✅ Keyword found in segment ${i + 1} at ${segment.start}s`)
        return segment.start
      }
    }
    
    // 完全一致しない場合、部分一致をチェック
    console.log('🔍 Exact match not found, checking partial matches...')
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentText = (segment.text || '').toLowerCase()
      
      // キーワードの単語を分割して部分一致をチェック
      const keywordWords = normalizedKeyword.split(/\s+/)
      let matchScore = 0
      
      for (const word of keywordWords) {
        if (segmentText.includes(word)) {
          matchScore++
        }
      }
      
      // 50%以上マッチした場合を有効とする
      if (matchScore / keywordWords.length >= 0.5) {
        console.log(`✅ Partial keyword match (${matchScore}/${keywordWords.length}) found in segment ${i + 1} at ${segment.start}s`)
        return segment.start
      }
    }
    
    console.log('❌ Keyword not found in any segment')
    return null
    
  } catch (error) {
    console.error('❌ Error in keyword detection:', error)
    
    // OpenAI APIエラーの詳細を出力
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // APIエラーの場合の詳細情報
    if ((error as any).response) {
      console.error('API Response Status:', (error as any).response.status)
      console.error('API Response Data:', (error as any).response.data)
    }
    
    throw new Error(`Keyword detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * ffmpegで音声ファイルの先頭・末尾の無音区間（秒）を検出
 * @returns { start: number, duration: number }
 */
export async function detectSilence(inputPath: string): Promise<{ start: number, duration: number }> {
  return new Promise((resolve, reject) => {
    let silenceStart = 0
    let silenceEnd = 0
    let duration = 0
    const tempOutputPath = inputPath.replace(/\.[^/.]+$/, '_temp_silence.mp3')
    
    ffmpeg(inputPath)
      .audioFilters('silencedetect=n=-50dB:d=0.5')
      .output(tempOutputPath) // 出力パスを指定
      .on('stderr', (line: string) => {
        // ffmpegのstderrからsilence_start/silence_endを抽出
        const silenceStartMatch = line.match(/silence_start: (\d+\.?\d*)/)
        const silenceEndMatch = line.match(/silence_end: (\d+\.?\d*)/)
        const durationMatch = line.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/)
        if (silenceStartMatch) silenceStart = parseFloat(silenceStartMatch[1])
        if (silenceEndMatch) silenceEnd = parseFloat(silenceEndMatch[1])
        if (durationMatch) {
          duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3])
        }
      })
      .on('end', () => {
        // 一時ファイルを削除
        fs.unlink(tempOutputPath, () => {})
        // 無音区間を除いたstart/durationを返す
        resolve({ start: silenceEnd, duration: duration - silenceEnd })
      })
      .on('error', (err: Error) => {
        // 一時ファイルを削除
        fs.unlink(tempOutputPath, () => {})
        reject(err)
      })
      .run()
  })
}

// TODO: キーフレーズ検出や無音部分検出なども追加可能 