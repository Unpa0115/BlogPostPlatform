import { NextRequest, NextResponse } from 'next/server'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // 未読通知を取得
    const notifications = await YouTubeTokenManager.getUnreadNotifications(userId)

    return NextResponse.json({
      success: true,
      notifications
    })

  } catch (error: any) {
    console.error('Error getting notifications:', error)
    return NextResponse.json({ 
      error: 'Failed to get notifications',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, platformType, notificationType, message, actionUrl } = body

    if (!userId || !platformType || !notificationType || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // 通知を作成
    await YouTubeTokenManager.createAuthNotification(
      userId,
      platformType,
      notificationType,
      message,
      actionUrl
    )

    return NextResponse.json({
      success: true,
      message: 'Notification created successfully'
    })

  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ 
      error: 'Failed to create notification',
      details: error.message
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json({ 
        error: 'Notification ID is required' 
      }, { status: 400 })
    }

    // 通知を既読にする
    await YouTubeTokenManager.markNotificationAsRead(notificationId)

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ 
      error: 'Failed to mark notification as read',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const platformType = searchParams.get('platformType')
    const notificationType = searchParams.get('notificationType')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // 重複通知を削除
    if (process.env.NODE_ENV === 'production') {
      if (platformType && notificationType) {
        await db.query(`
          DELETE FROM auth_notifications 
          WHERE user_id = $1 AND platform_type = $2 AND notification_type = $3
        `, [userId, platformType, notificationType])
      } else {
        await db.query(`
          DELETE FROM auth_notifications 
          WHERE user_id = $1
        `, [userId])
      }
    } else {
      const sqliteDb = await db
      if (platformType && notificationType) {
        await sqliteDb.run(`
          DELETE FROM auth_notifications 
          WHERE user_id = ? AND platform_type = ? AND notification_type = ?
        `, [userId, platformType, notificationType])
      } else {
        await sqliteDb.run(`
          DELETE FROM auth_notifications 
          WHERE user_id = ?
        `, [userId])
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json({ 
      error: 'Failed to delete notifications',
      details: error.message
    }, { status: 500 })
  }
} 