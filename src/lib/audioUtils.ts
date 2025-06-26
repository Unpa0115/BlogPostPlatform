import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { OpenAIApi, Configuration } from 'openai'

export async function trimAudio(inputPath: string, outputPath: string, start: number, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}

export async function transcribeAudioWhisper(audioPath: string, openaiApiKey: string): Promise<string> {
  const configuration = new Configuration({ apiKey: openaiApiKey })
  const openai = new OpenAIApi(configuration)
  const audio = fs.createReadStream(audioPath)
  const resp = await openai.createTranscription(
    audio as any,
    'whisper-1',
    undefined,
    'json',
    0,
    'ja'
  )
  return resp.data.text
}

// TODO: キーフレーズ検出や無音部分検出なども追加可能 