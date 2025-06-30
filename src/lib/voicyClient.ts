import { runVoicyAutomation } from './voicyAutomation'
import path from 'path'
import fs from 'fs/promises'
import { spawn } from 'child_process'

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
  usePythonScript?: boolean // Python版を使用するかどうか
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
    
    // Python版を使用する場合
    if (options.usePythonScript) {
      return await runPythonVoicyAutomation(options)
    }
    
    // TypeScript版を使用する場合（デフォルト）
    return await runTypeScriptVoicyAutomation(options)
    
  } catch (error) {
    console.error('Voicy upload error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Voicy自動化エラー' 
    }
  }
}

async function runPythonVoicyAutomation(options: VoicyUploadOptions): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const pythonScriptPath = path.join(process.cwd(), 'python-scripts', 'voicy_automation.py')
    
    // 環境変数を設定
    const env = {
      ...process.env,
      VOICY_EMAIL: options.email,
      VOICY_PASSWORD: options.password,
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
      API_TOKEN: process.env.API_TOKEN
    }
    
    // Pythonスクリプトを実行
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      options.title,
      options.description,
      options.hashtags
    ], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
      console.log('Python stdout:', data.toString())
    })
    
    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
      console.error('Python stderr:', data.toString())
    })
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Voicy予約投稿成功（Python版）' })
      } else {
        resolve({ 
          success: false, 
          message: `Pythonスクリプトが失敗しました（終了コード: ${code}）\n${stderr}` 
        })
      }
    })
    
    pythonProcess.on('error', (error) => {
      resolve({ 
        success: false, 
        message: `Pythonスクリプト実行エラー: ${error.message}` 
      })
    })
  })
}

async function runTypeScriptVoicyAutomation(options: VoicyUploadOptions): Promise<{ success: boolean; message: string }> {
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
    return { success: true, message: 'Voicy予約投稿成功（TypeScript版）' }
  } else {
    return { success: false, message: 'Voicy自動化が失敗しました（TypeScript版）' }
  }
} 