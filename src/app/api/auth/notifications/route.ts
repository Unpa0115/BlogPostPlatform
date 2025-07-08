import { NextRequest, NextResponse } from 'next/server'
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
    let notifications = []
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(`
        SELECT * FROM auth_notifications 
        WHERE user_id = $1 AND is_read = false
        ORDER BY created_at DESC
      `, [userId])
      notifications = result.rows
    } else {
      const sqliteDb = await db
      const result = await sqliteDb.all(`
        SELECT * FROM auth_notifications 
        WHERE user_id = ? AND is_read = 0
        ORDER BY created_at DESC
      `, [userId])
      notifications = result
    }

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
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const createdAt = new Date().toISOString()
    
    if (process.env.NODE_ENV === 'production') {
      await db.query(`
        INSERT INTO auth_notifications (id, user_id, platform_type, notification_type, message, action_url, is_read, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, userId, platformType, notificationType, message, actionUrl, false, createdAt, createdAt])
    } else {
      const sqliteDb = await db
      await sqliteDb.run(`
        INSERT INTO auth_notifications (id, user_id, platform_type, notification_type, message, action_url, is_read, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, userId, platformType, notificationType, message, actionUrl, 0, createdAt, createdAt])
    }

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
    const updatedAt = new Date().toISOString()
    
    if (process.env.NODE_ENV === 'production') {
      await db.query(`
        UPDATE auth_notifications 
        SET is_read = true, updated_at = $1
        WHERE id = $2
      `, [updatedAt, notificationId])
    } else {
      const sqliteDb = await db
      await sqliteDb.run(`
        UPDATE auth_notifications 
        SET is_read = 1, updated_at = ?
        WHERE id = ?
      `, [updatedAt, notificationId])
    }

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