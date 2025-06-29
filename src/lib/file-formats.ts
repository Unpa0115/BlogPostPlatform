// サービスごとの対応ファイル形式
export const PLATFORM_FILE_FORMATS = {
  youtube: {
    supported: ['.mp4', '.mpeg4', '.mov', '.avi', '.wmv', '.webm', '.3gpp', '.flv'] as string[],
    unsupported: ['.mp3', '.wav', '.m4a', '.flac', '.aac'] as string[],
    message: '動画ファイルのみ対応（音声ファイルは動画に変換が必要）'
  },
  voicy: {
    supported: ['.mp3', '.wav', '.m4a', '.aac', '.flac'] as string[],
    unsupported: ['.mp4', '.mov', '.avi', '.wmv', '.webm', '.3gpp', '.flv'] as string[],
    message: '音声ファイルのみ対応（動画ファイルは非対応）'
  },
  spotify: {
    supported: ['.mp3', '.m4a', '.wav', '.flac', '.mov', '.mpg', '.mp4'] as string[],
    unsupported: [] as string[],
    message: '音声・動画ファイル両方に対応（12時間制限あり）'
  }
}

// MIMEタイプから拡張子を推測するマッピング
const MIME_TO_EXTENSION: { [key: string]: string } = {
  'audio/mp3': '.mp3',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'video/mp4': '.mp4',
  'video/mpeg4': '.mp4',
  'video/mov': '.mov',
  'video/quicktime': '.mov',
  'video/avi': '.avi',
  'video/wmv': '.wmv',
  'video/webm': '.webm',
  'video/3gpp': '.3gpp',
  'video/flv': '.flv'
}

// ファイル形式をチェックする関数
export function checkFileFormat(fileName: string, platform: keyof typeof PLATFORM_FILE_FORMATS, mimeType?: string): {
  isSupported: boolean
  message: string
} {
  console.log('=== File Format Check ===')
  console.log('Input fileName:', fileName)
  console.log('Input mimeType:', mimeType)
  
  // ファイル名から拡張子を抽出
  let extension = ''
  if (fileName.includes('.')) {
    extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  }
  
  // MIMEタイプから拡張子を推測（ファイル名に拡張子がない場合）
  if (!extension && mimeType && MIME_TO_EXTENSION[mimeType]) {
    extension = MIME_TO_EXTENSION[mimeType]
    console.log('Using MIME type extension:', extension)
  }
  
  console.log('Final extension:', extension)
  
  const platformFormats = PLATFORM_FILE_FORMATS[platform]
  console.log('Platform formats:', platformFormats)
  
  if (platformFormats.supported.includes(extension)) {
    console.log(`✅ ${platform}: Supported`)
    return {
      isSupported: true,
      message: '対応ファイル形式です'
    }
  } else if (platformFormats.unsupported.includes(extension)) {
    console.log(`❌ ${platform}: Unsupported`)
    return {
      isSupported: false,
      message: platformFormats.message
    }
  } else {
    console.log(`❓ ${platform}: Unknown format`)
    return {
      isSupported: false,
      message: '未対応のファイル形式です'
    }
  }
}

// 全プラットフォームでファイル形式をチェック
export function checkAllPlatforms(fileName: string, mimeType?: string): {
  [key: string]: { isSupported: boolean; message: string }
} {
  const results: { [key: string]: { isSupported: boolean; message: string } } = {}
  
  Object.keys(PLATFORM_FILE_FORMATS).forEach(platform => {
    results[platform] = checkFileFormat(fileName, platform as keyof typeof PLATFORM_FILE_FORMATS, mimeType)
  })
  
  return results
} 