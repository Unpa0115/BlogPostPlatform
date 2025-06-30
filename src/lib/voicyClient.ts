import { runVoicyAutomation } from './voicyAutomation'
import path from 'path'
import fs from 'fs/promises'

export interface VoicyUploadOptions {
  email: string
  password: string
  title: string
  description: string
  hashtags: string
  audioFiles: string[]
  reservationDate: string // 'YYYY/MM/DD'
  reservationTime: string // 'HH:mm'
  browserlessWSEndpoint?: string
}

export async function uploadToVoicy(options: VoicyUploadOptions): Promise<{ success: boolean; message: string }> {
  try {
    // データソースフォルダを作成
    const datasourceFolder = path.join(process.cwd(), 'datasource', options.title)
    await fs.mkdir(datasourceFolder, { recursive: true })
    
    // スクリーンショットフォルダを作成
    const screenshotsFolder = path.join(process.cwd(), 'screenshots', 'voicy')
    await fs.mkdir(screenshotsFolder, { recursive: true })
    
    // 音声ファイルをデータソースフォルダにコピー
    for (const audioFile of options.audioFiles) {
      const fileName = path.basename(audioFile)
      const destinationPath = path.join(datasourceFolder, fileName)
      await fs.copyFile(audioFile, destinationPath)
    }
    
    // 環境変数を設定
    process.env.VOICY_EMAIL = options.email
    process.env.VOICY_PASSWORD = options.password
    
    // TypeScript版のVoicy自動化を実行
    const success = await runVoicyAutomation({
      title: options.title,
      description: options.description,
      hashtags: options.hashtags
    })
    
    if (success) {
      return { success: true, message: 'Voicy予約投稿成功' }
    } else {
      return { success: false, message: 'Voicy自動化が失敗しました' }
    }
    
  } catch (error) {
    console.error('Voicy upload error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Voicy自動化エラー' 
    }
  }
} 