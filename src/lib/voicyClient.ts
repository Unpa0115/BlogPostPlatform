import { spawn } from 'child_process'
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
    // Pythonスクリプトのパスを設定
    const scriptPath = path.join(process.cwd(), 'voicy_automation.py')
    
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
    
    // Pythonスクリプトを実行（引数を渡す）
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        options.title,
        options.description,
        options.hashtags
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: process.cwd(),
          VOICY_EMAIL: options.email,
          VOICY_PASSWORD: options.password
        }
      })
      
      let stdout = ''
      let stderr = ''
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
        console.log('Python stdout:', data.toString())
      })
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
        console.error('Python stderr:', data.toString())
      })
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Voicy予約投稿成功' })
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`))
        }
      })
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`))
      })
    })
    
  } catch (error) {
    console.error('Voicy upload error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Voicy自動化エラー' 
    }
  }
} 