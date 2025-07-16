/**
 * 環境変数ベースのプラットフォーム設定管理
 * SQLiteからの移行により、シンプルで確実な設定管理を実現
 */

// 環境変数の型定義
export interface PlatformConfig {
  // OpenAI設定
  openai: {
    apiKey: string | null
    isConfigured: boolean
  }
  
  // YouTube設定
  youtube: {
    clientId: string | null
    clientSecret: string | null
    apiKey: string | null
    redirectUri: string
    isConfigured: boolean
  }
  
  // Voicy設定
  voicy: {
    email: string | null
    password: string | null
    browserlessApiKey: string | null
    isConfigured: boolean
  }
  
  // Spotify設定
  spotify: {
    clientId: string | null
    clientSecret: string | null
    rssFeedUrl: string | null
    isConfigured: boolean
  }
  
  // 音声処理設定
  audio: {
    ffmpegPath: string
    quality: string
    format: string
    silenceThreshold: string
    silenceDuration: string
  }
  
  // アプリケーション設定
  app: {
    nodeEnv: string
    port: number
    baseUrl: string
    uploadDir: string
    maxFileSize: number
  }
}

/**
 * 環境変数からプラットフォーム設定を取得
 */
export function getPlatformConfig(): PlatformConfig {
  return {
    // OpenAI設定
    openai: {
      apiKey: process.env.OPENAI_API_KEY || null,
      isConfigured: !!process.env.OPENAI_API_KEY
    },
    
    // YouTube設定
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || null,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || null,
      apiKey: process.env.YOUTUBE_API_KEY || null,
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/youtube/callback`,
      isConfigured: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET)
    },
    
    // Voicy設定
    voicy: {
      email: process.env.VOICY_EMAIL || null,
      password: process.env.VOICY_PASSWORD || null,
      browserlessApiKey: process.env.BROWSERLESS_API_KEY || null,
      isConfigured: !!(process.env.VOICY_EMAIL && process.env.VOICY_PASSWORD)
    },
    
    // Spotify設定
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || null,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || null,
      rssFeedUrl: process.env.NEXT_PUBLIC_SPOTIFY_RSS_FEED_URL || null,
      isConfigured: !!(
        // Spotify API経由 または RSS Feed経由
        (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) ||
        process.env.NEXT_PUBLIC_SPOTIFY_RSS_FEED_URL
      )
    },
    
    // 音声処理設定
    audio: {
      ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
      quality: process.env.AUDIO_QUALITY || '128k',
      format: process.env.AUDIO_FORMAT || 'mp3',
      silenceThreshold: process.env.SILENCE_THRESHOLD || '-50dB',
      silenceDuration: process.env.SILENCE_DURATION || '2.0'
    },
    
    // アプリケーション設定
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3005'),
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005',
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '2147483648') // 2GB
    }
  }
}

/**
 * 特定プラットフォームの設定を取得
 */
export function getPlatformCredentials(platform: 'openai' | 'youtube' | 'voicy' | 'spotify') {
  const config = getPlatformConfig()
  
  switch (platform) {
    case 'openai':
      return config.openai
      
    case 'youtube':
      return config.youtube
      
    case 'voicy':
      return config.voicy
      
    case 'spotify':
      return config.spotify
      
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * プラットフォーム設定状況の確認
 */
export function checkPlatformStatus() {
  const config = getPlatformConfig()
  
  return {
    openai: {
      configured: config.openai.isConfigured,
      status: config.openai.isConfigured ? 'configured' : 'not_configured',
      message: config.openai.isConfigured 
        ? 'OpenAI API設定済み' 
        : 'OPENAI_API_KEY環境変数が設定されていません'
    },
    
    youtube: {
      configured: config.youtube.isConfigured,
      status: config.youtube.isConfigured ? 'configured' : 'not_configured',
      message: config.youtube.isConfigured 
        ? 'YouTube API設定済み' 
        : 'YOUTUBE_CLIENT_ID/CLIENT_SECRET環境変数が設定されていません'
    },
    
    voicy: {
      configured: config.voicy.isConfigured,
      status: config.voicy.isConfigured ? 'configured' : 'not_configured',
      message: config.voicy.isConfigured 
        ? 'Voicy設定済み' 
        : 'VOICY_EMAIL/PASSWORD環境変数が設定されていません'
    },
    
    spotify: {
      configured: config.spotify.isConfigured,
      status: config.spotify.isConfigured ? 'configured' : 'not_configured',
      message: config.spotify.isConfigured 
        ? (config.spotify.rssFeedUrl 
           ? `Spotify RSS Feed設定済み (${config.spotify.rssFeedUrl})` 
           : 'Spotify API設定済み')
        : 'SPOTIFY_CLIENT_ID/CLIENT_SECRET または SPOTIFY_RSS_FEED_URL 環境変数のいずれかを設定してください'
    }
  }
}

/**
 * 設定の妥当性チェック
 */
export function validatePlatformConfig(platform: 'openai' | 'youtube' | 'voicy' | 'spotify'): {
  valid: boolean
  errors: string[]
} {
  const config = getPlatformConfig()
  const errors: string[] = []
  
  switch (platform) {
    case 'openai':
      const openaiConfig = config.openai
      if (!openaiConfig.apiKey) {
        errors.push('OPENAI_API_KEY環境変数が設定されていません')
      } else if (!openaiConfig.apiKey.startsWith('sk-')) {
        errors.push('OPENAI_API_KEYの形式が正しくありません（sk-で始まる必要があります）')
      }
      break
      
    case 'youtube':
      const youtubeConfig = config.youtube
      if (!youtubeConfig.clientId) {
        errors.push('YOUTUBE_CLIENT_ID環境変数が設定されていません')
      }
      if (!youtubeConfig.clientSecret) {
        errors.push('YOUTUBE_CLIENT_SECRET環境変数が設定されていません')
      }
      break
      
    case 'voicy':
      const voicyConfig = config.voicy
      if (!voicyConfig.email) {
        errors.push('VOICY_EMAIL環境変数が設定されていません')
      }
      if (!voicyConfig.password) {
        errors.push('VOICY_PASSWORD環境変数が設定されていません')
      }
      if (voicyConfig.email && !voicyConfig.email.includes('@')) {
        errors.push('VOICY_EMAILの形式が正しくありません')
      }
      break
      
    case 'spotify':
      const spotifyConfig = config.spotify
      if (!spotifyConfig.clientId) {
        errors.push('SPOTIFY_CLIENT_ID環境変数が設定されていません')
      }
      if (!spotifyConfig.clientSecret) {
        errors.push('SPOTIFY_CLIENT_SECRET環境変数が設定されていません')
      }
      break
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * デバッグ情報の出力
 */
export function debugPlatformConfig() {
  const config = getPlatformConfig()
  const status = checkPlatformStatus()
  
  console.log('=== Platform Configuration Debug ===')
  console.log('Environment:', config.app.nodeEnv)
  
  Object.entries(status).forEach(([platform, info]) => {
    console.log(`${platform.toUpperCase()}:`, info.configured ? '✅ Configured' : '❌ Not Configured')
    if (!info.configured) {
      console.log(`  Reason: ${info.message}`)
    }
  })
  
  console.log('=====================================')
  
  return { config, status }
}

/**
 * 必要な環境変数のリスト生成
 */
export function getRequiredEnvVars(): { [platform: string]: string[] } {
  return {
    openai: ['OPENAI_API_KEY'],
    youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    voicy: ['VOICY_EMAIL', 'VOICY_PASSWORD', 'BROWSERLESS_API_KEY'],
    spotify: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    app: ['NEXT_PUBLIC_APP_URL', 'JWT_SECRET', 'ENCRYPTION_MASTER_KEY']
  }
} 