import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

export class CredentialEncryption {
  private static getKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
  }

  static encrypt(data: string, masterKey: string): string {
    try {
      console.log('Starting encryption with algorithm:', ALGORITHM)
      
      // ランダムなソルトとIVを生成
      const salt = crypto.randomBytes(SALT_LENGTH)
      const iv = crypto.randomBytes(IV_LENGTH)

      // マスターキーから暗号化キーを生成
      const key = this.getKey(masterKey, salt)
      console.log('Key generated successfully, length:', key.length)

      // 暗号化（createCipherivを使用）
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
      cipher.setAAD(Buffer.from('credentials', 'utf8'))
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // 認証タグを取得
      const tag = cipher.getAuthTag()

      // ソルト + IV + タグ + 暗号化データを結合
      const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')])
      
      console.log('Encryption completed successfully')
      return result.toString('base64')
    } catch (error) {
      console.error('Encryption error details:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        algorithm: ALGORITHM,
        keyLength: KEY_LENGTH,
        ivLength: IV_LENGTH
      })
      throw new Error(`Failed to encrypt credentials: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static decrypt(encryptedData: string, masterKey: string): string {
    try {
      // Base64デコード
      const data = Buffer.from(encryptedData, 'base64')

      // 各部分を抽出
      const salt = data.subarray(0, SALT_LENGTH)
      const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
      const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

      // マスターキーから暗号化キーを生成
      const key = this.getKey(masterKey, salt)

      // 復号化（createDecipherivを使用）
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      decipher.setAAD(Buffer.from('credentials', 'utf8'))
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt credentials')
    }
  }

  // 環境変数からマスターキーを取得
  static getMasterKey(): string {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY
    console.log('Master key check:', {
      hasEnvKey: !!masterKey,
      envKeyLength: masterKey ? masterKey.length : 0,
      nodeEnv: process.env.NODE_ENV
    })
    
    if (!masterKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_MASTER_KEY environment variable is required in production')
      } else {
        // 開発環境ではデフォルトキーを使用
        const devKey = 'dev-encryption-master-key-for-development-only-32-chars'
        console.log('Using development master key, length:', devKey.length)
        return devKey
      }
    }
    
    console.log('Using environment master key, length:', masterKey.length)
    return masterKey
  }
}

// プラットフォーム別のCredentials暗号化
export const PlatformCredentials = {
  // YouTube認証情報の暗号化
  encryptYouTube: (credentials: { 
    clientId: string; 
    clientSecret: string; 
    accessToken?: string; 
    refreshToken?: string; 
  }): string => {
    const data = JSON.stringify(credentials)
    return CredentialEncryption.encrypt(data, CredentialEncryption.getMasterKey())
  },

  // YouTube認証情報の復号化
  decryptYouTube: (encryptedData: string): { 
    clientId: string; 
    clientSecret: string; 
    accessToken?: string; 
    refreshToken?: string; 
  } => {
    const data = CredentialEncryption.decrypt(encryptedData, CredentialEncryption.getMasterKey())
    return JSON.parse(data)
  },

  // Voicy認証情報の暗号化
  encryptVoicy: (credentials: { email: string; password: string }): string => {
    const data = JSON.stringify(credentials)
    return CredentialEncryption.encrypt(data, CredentialEncryption.getMasterKey())
  },

  // Voicy認証情報の復号化
  decryptVoicy: (encryptedData: string): { email: string; password: string } => {
    const data = CredentialEncryption.decrypt(encryptedData, CredentialEncryption.getMasterKey())
    return JSON.parse(data)
  },

  // Spotify認証情報の暗号化
  encryptSpotify: (credentials: { rssFeedUrl: string }): string => {
    const data = JSON.stringify(credentials)
    return CredentialEncryption.encrypt(data, CredentialEncryption.getMasterKey())
  },

  // Spotify認証情報の復号化
  decryptSpotify: (encryptedData: string): { rssFeedUrl: string } => {
    const data = CredentialEncryption.decrypt(encryptedData, CredentialEncryption.getMasterKey())
    return JSON.parse(data)
  },

  // OpenAI APIキーの暗号化
  encryptOpenAI: (credentials: { apiKey: string }): string => {
    const data = JSON.stringify(credentials)
    return CredentialEncryption.encrypt(data, CredentialEncryption.getMasterKey())
  },

  // OpenAI APIキーの復号化
  decryptOpenAI: (encryptedData: string): { apiKey: string } => {
    const data = CredentialEncryption.decrypt(encryptedData, CredentialEncryption.getMasterKey())
    return JSON.parse(data)
  }
} 