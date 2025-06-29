// @ts-ignore
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import OpenAI from 'openai'

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
  const openai = new OpenAI({ apiKey: openaiApiKey })
  const audio = fs.createReadStream(audioPath)
  // Whisper APIのword-level timestampsを利用（仮実装: 実際はAPIのバージョンやレスポンス仕様に応じて調整）
  const resp = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    response_format: 'verbose_json',
    language: 'ja',
    timestamp_granularities: ['word']
  } as any)
  const segments = (resp as any).segments || []
  for (const segment of segments) {
    for (const word of (segment.words || [])) {
      if (word.word && word.word.includes(keyword)) {
        return word.start || segment.start
      }
    }
  }
  return null
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