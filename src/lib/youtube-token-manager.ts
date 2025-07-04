import { db } from './database'
import { YouTubeToken, AuthNotification } from '../types'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class YouTubeTokenManager {
  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 6 // 7日間制限の1日前
  private static readonly WARNING_DAYS = 2 // 期限切れ2日前から警告

  /**
   * ユーザーのYouTube tokenを取得
   */
  static async getToken(userId: string): Promise<YouTubeToken | null> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(
          'SELECT * FROM youtube_tokens WHERE user_id = $1',
          [userId]
        )
        return result.rows[0] || null
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.get(
          'SELECT * FROM youtube_tokens WHERE user_id = ?',
          [userId]
        )
        return result || null
      }
    } catch (error) {
      console.error('Error getting YouTube token:', error)
      return null
    }
  }

  /**
   * YouTube tokenを保存・更新
   */
  static async saveToken(userId: string, refreshToken: string, accessToken?: string): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

      if (process.env.NODE_ENV === 'production') {
        await db.query(`
          INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at, status, failure_count)
          VALUES ($1, $2, $3, $4, 'active', 0)
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            access_token = $2,
            refresh_token = $3,
            expires_at = $4,
            status = 'active',
            failure_count = 0,
            updated_at = NOW()
        `, [userId, accessToken, refreshToken, expiresAt])
      } else {
        const sqliteDb = await db
        await sqliteDb.run(`
          INSERT OR REPLACE INTO youtube_tokens 
          (user_id, access_token, refresh_token, expires_at, status, failure_count, updated_at)
          VALUES (?, ?, ?, ?, 'active', 0, CURRENT_TIMESTAMP)
        `, [userId, accessToken, refreshToken, expiresAt.toISOString()])
      }
    } catch (error) {
      console.error('Error saving YouTube token:', error)
      throw error
    }
  }

  /**
   * tokenの使用を記録
   */
  static async recordTokenUsage(userId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        await db.query(
          'UPDATE youtube_tokens SET last_used_at = NOW() WHERE user_id = $1',
          [userId]
        )
      } else {
        const sqliteDb = await db
        await sqliteDb.run(
          'UPDATE youtube_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [userId]
        )
      }
    } catch (error) {
      console.error('Error recording token usage:', error)
    }
  }

  /**
   * tokenの失敗を記録
   */
  static async recordTokenFailure(userId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        await db.query(`
          UPDATE youtube_tokens 
          SET failure_count = failure_count + 1,
              status = CASE 
                WHEN failure_count >= 3 THEN 'expired'
                WHEN failure_count >= 1 THEN 'warning'
                ELSE status
              END,
              updated_at = NOW()
          WHERE user_id = $1
        `, [userId])
      } else {
        const sqliteDb = await db
        await sqliteDb.run(`
          UPDATE youtube_tokens 
          SET failure_count = failure_count + 1,
              status = CASE 
                WHEN failure_count >= 3 THEN 'expired'
                WHEN failure_count >= 1 THEN 'warning'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [userId])
      }
    } catch (error) {
      console.error('Error recording token failure:', error)
    }
  }

  /**
   * tokenの期限をチェック
   */
  static async checkTokenExpiry(userId: string): Promise<{
    isValid: boolean
    daysUntilExpiry: number
    status: 'active' | 'warning' | 'expired'
    needsReauth: boolean
  }> {
    try {
      const token = await this.getToken(userId)
      if (!token) {
        return {
          isValid: false,
          daysUntilExpiry: 0,
          status: 'expired',
          needsReauth: true
        }
      }

      const now = new Date()
      const expiryDate = new Date(token.expires_at || token.created_at)
      expiryDate.setDate(expiryDate.getDate() + 7) // 7日間有効

      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      let status: 'active' | 'warning' | 'expired' = 'active'
      if (daysUntilExpiry <= 0) {
        status = 'expired'
      } else if (daysUntilExpiry <= this.WARNING_DAYS) {
        status = 'warning'
      }

      return {
        isValid: daysUntilExpiry > 0 && token.status !== 'expired',
        daysUntilExpiry,
        status,
        needsReauth: daysUntilExpiry <= 0 || token.status === 'expired'
      }
    } catch (error) {
      console.error('Error checking token expiry:', error)
      return {
        isValid: false,
        daysUntilExpiry: 0,
        status: 'expired',
        needsReauth: true
      }
    }
  }

  /**
   * 期限切れ間近のtokenを検索
   */
  static async getExpiringTokens(): Promise<YouTubeToken[]> {
    try {
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() + this.WARNING_DAYS)

      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(`
          SELECT * FROM youtube_tokens 
          WHERE expires_at < $1 AND status = 'active'
          ORDER BY expires_at ASC
        `, [warningDate])
        return result.rows
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.all(`
          SELECT * FROM youtube_tokens 
          WHERE expires_at < ? AND status = 'active'
          ORDER BY expires_at ASC
        `, [warningDate.toISOString()])
        return result
      }
    } catch (error) {
      console.error('Error getting expiring tokens:', error)
      return []
    }
  }

  /**
   * 認証通知を作成
   */
  static async createAuthNotification(
    userId: string,
    platformType: string,
    notificationType: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

      if (process.env.NODE_ENV === 'production') {
        await db.query(`
          INSERT INTO auth_notifications 
          (user_id, platform_type, notification_type, message, action_url, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId, platformType, notificationType, message, actionUrl, expiresAt])
      } else {
        const sqliteDb = await db
        await sqliteDb.run(`
          INSERT INTO auth_notifications 
          (user_id, platform_type, notification_type, message, action_url, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, platformType, notificationType, message, actionUrl, expiresAt.toISOString()])
      }
    } catch (error) {
      console.error('Error creating auth notification:', error)
    }
  }

  /**
   * ユーザーの未読通知を取得
   */
  static async getUnreadNotifications(userId: string): Promise<AuthNotification[]> {
    try {
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(`
          SELECT * FROM auth_notifications 
          WHERE user_id = $1 AND is_read = false AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY created_at DESC
        `, [userId])
        return result.rows
      } else {
        const sqliteDb = await db
        const result = await sqliteDb.all(`
          SELECT * FROM auth_notifications 
          WHERE user_id = ? AND is_read = 0 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          ORDER BY created_at DESC
        `, [userId])
        return result
      }
    } catch (error) {
      console.error('Error getting unread notifications:', error)
      return []
    }
  }

  /**
   * 通知を既読にする
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        await db.query(
          'UPDATE auth_notifications SET is_read = true WHERE id = $1',
          [notificationId]
        )
      } else {
        const sqliteDb = await db
        await sqliteDb.run(
          'UPDATE auth_notifications SET is_read = 1 WHERE id = ?',
          [notificationId]
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  /**
   * 自動再認証が必要かチェック
   */
  static async checkAndNotifyReauth(userId: string): Promise<boolean> {
    try {
      const tokenCheck = await this.checkTokenExpiry(userId)
      
      if (tokenCheck.needsReauth) {
        // 既存の未読通知をチェック
        const existingNotifications = await this.getUnreadNotifications(userId)
        const hasExistingReauthNotification = existingNotifications.some(
          notification => 
            notification.platform_type === 'youtube' && 
            notification.notification_type === 'REAUTH_REQUIRED'
        )
        
        // 既存の通知がない場合のみ新しい通知を作成
        if (!hasExistingReauthNotification) {
          await this.createAuthNotification(
            userId,
            'youtube',
            'REAUTH_REQUIRED',
            'YouTubeへの投稿を継続するため、再度認証が必要です。',
            `/platforms?reauth=youtube`
          )
        }
        return true
      } else if (tokenCheck.status === 'warning') {
        // 既存の警告通知をチェック
        const existingNotifications = await this.getUnreadNotifications(userId)
        const hasExistingWarningNotification = existingNotifications.some(
          notification => 
            notification.platform_type === 'youtube' && 
            notification.notification_type === 'REAUTH_WARNING'
        )
        
        // 既存の警告通知がない場合のみ新しい通知を作成
        if (!hasExistingWarningNotification) {
          await this.createAuthNotification(
            userId,
            'youtube',
            'REAUTH_WARNING',
            `YouTube認証の期限が${tokenCheck.daysUntilExpiry}日後に切れます。事前に再認証をお勧めします。`,
            `/platforms?reauth=youtube`
          )
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking and notifying reauth:', error)
      return false
    }
  }

  /**
   * 堅牢なAPI呼び出し（自動再認証対応）
   */
  static async robustAPICall<T>(
    userId: string,
    apiCall: (accessToken: string, refreshToken: string) => Promise<T>
  ): Promise<T> {
    try {
      const token = await this.getToken(userId)
      if (!token) {
        throw new Error('No YouTube token found')
      }

      // tokenの期限をチェック
      const tokenCheck = await this.checkTokenExpiry(userId)
      if (tokenCheck.needsReauth) {
        await this.checkAndNotifyReauth(userId)
        throw new Error('AUTH_REQUIRED')
      }

      // API呼び出しを実行
      const result = await apiCall(token.access_token || '', token.refresh_token)
      
      // 成功した場合、使用を記録
      await this.recordTokenUsage(userId)
      
      return result
    } catch (error: any) {
      // 認証エラーの場合
      if (error.code === 401 || 
          error.message.includes('invalid_grant') ||
          error.message.includes('Token has been expired or revoked') ||
          error.message === 'AUTH_REQUIRED') {
        
        await this.recordTokenFailure(userId)
        await this.checkAndNotifyReauth(userId)
        throw new Error('AUTH_REQUIRED')
      }
      
      throw error
    }
  }
} 