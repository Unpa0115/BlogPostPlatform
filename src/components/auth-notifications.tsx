"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { AuthNotification } from '@/types'

interface AuthNotificationsProps {
  userId: string
}

export function AuthNotifications({ userId }: AuthNotificationsProps) {
  const [notifications, setNotifications] = useState<AuthNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auth/notifications?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setError('通知の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/auth/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // 通知リストから該当の通知を削除
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REAUTH_REQUIRED':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'REAUTH_WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'TOKEN_EXPIRING':
        return <Bell className="h-4 w-4 text-orange-500" />
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'REAUTH_REQUIRED':
        return 'border-red-200 bg-red-50'
      case 'REAUTH_WARNING':
        return 'border-yellow-200 bg-yellow-50'
      case 'TOKEN_EXPIRING':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'REAUTH_REQUIRED':
        return <Badge variant="destructive">緊急</Badge>
      case 'REAUTH_WARNING':
        return <Badge variant="secondary">警告</Badge>
      case 'TOKEN_EXPIRING':
        return <Badge variant="outline">注意</Badge>
      default:
        return <Badge variant="default">情報</Badge>
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // 定期的に通知を更新（5分ごと）
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            認証通知
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            認証通知
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 border border-red-200 bg-red-50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            認証通知
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            新しい通知はありません
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          認証通知
          <Badge variant="secondary">{notifications.length}</Badge>
        </CardTitle>
        <CardDescription>
          プラットフォーム認証に関する重要な通知
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${getNotificationColor(notification.notification_type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getNotificationIcon(notification.notification_type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getNotificationBadge(notification.notification_type)}
                    <span className="text-sm font-medium">
                      {notification.platform_type === 'youtube' ? 'YouTube' : notification.platform_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  {notification.action_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = notification.action_url!}
                    >
                      認証ページへ
                    </Button>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAsRead(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 