"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { usePlatforms } from '@/hooks/use-platforms'
import { useAuth } from '@/contexts/auth-context'
import { Youtube, Music, Mic, Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface DistributionManagerProps {
  uploadId?: string
  title?: string
  description?: string
  filePath?: string
  mimeType?: string
  disabled?: boolean
}

interface DistributionStatus {
  platform: 'youtube' | 'voicy' | 'spotify'
  status: 'idle' | 'uploading' | 'success' | 'error' | 'auth_required'
  progress: number
  message?: string
}

export function DistributionManager({ uploadId, title, description, filePath, mimeType, disabled }: DistributionManagerProps) {
  const [distributionTargets, setDistributionTargets] = useState({
    youtube: false,
    voicy: false,
    spotify: false
  })
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus[]>([])
  const [isDistributing, setIsDistributing] = useState(false)
  const [youtubeAuthUrl, setYoutubeAuthUrl] = useState<string | null>(null)
  
  const { toast } = useToast()
  const { isPlatformConfigured, getPlatformCredentials } = usePlatforms()
  const { token } = useAuth()

  // URLパラメータからYouTube認証結果を確認
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const youtubeAuth = urlParams.get('youtube_auth')
    
    if (youtubeAuth === 'success') {
      toast({
        title: "YouTube認証完了",
        description: "YouTubeアカウントの認証が完了しました。",
      })
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname)
      // プラットフォーム情報を再取得
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } else if (youtubeAuth === 'error') {
      toast({
        title: "YouTube認証エラー",
        description: "YouTubeアカウントの認証に失敗しました。",
        variant: "destructive"
      })
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [toast])

  const platforms = [
    {
      key: 'youtube' as const,
      name: 'YouTube',
      icon: Youtube,
      description: '動画プラットフォーム',
      color: 'bg-red-500'
    },
    {
      key: 'voicy' as const,
      name: 'Voicy',
      icon: Mic,
      description: '音声プラットフォーム',
      color: 'bg-blue-500'
    },
    {
      key: 'spotify' as const,
      name: 'Spotify',
      icon: Music,
      description: 'ポッドキャストプラットフォーム',
      color: 'bg-green-500'
    }
  ]

  const handleTogglePlatform = (platform: 'youtube' | 'voicy' | 'spotify') => {
    if (!isPlatformConfigured(platform)) {
      toast({
        title: "設定が必要",
        description: `${platforms.find(p => p.key === platform)?.name}の設定が完了していません。設定ページで設定してください。`,
        variant: "destructive"
      })
      return
    }

    setDistributionTargets(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }))
  }

  const getStatusIcon = (status: DistributionStatus['status']) => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'auth_required':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const initiateYouTubeAuth = async () => {
    try {
      console.log('=== YouTube Auth Initiation Debug ===')
      const credentials = getPlatformCredentials('youtube')
      console.log('Platform credentials:', {
        hasCredentials: !!credentials,
        hasClientId: !!credentials?.clientId,
        hasClientSecret: !!credentials?.clientSecret
      })
      
      if (!credentials?.clientId || !credentials?.clientSecret) {
        console.log('Missing YouTube credentials')
        toast({
          title: "設定エラー",
          description: "YouTubeのClient IDとClient Secretが設定されていません。",
          variant: "destructive"
        })
        return
      }

      console.log('Fetching auth URL...')
      const response = await fetch(`/api/platforms/youtube/auth?clientId=${credentials.clientId}&clientSecret=${credentials.clientSecret}`)
      console.log('Auth URL response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to get auth URL:', errorText)
        throw new Error('Failed to get auth URL')
      }

      const data = await response.json()
      console.log('Auth URL received:', data.authUrl ? 'URL received' : 'No URL')
      setYoutubeAuthUrl(data.authUrl)
      
      // 認証URLを新しいタブで開く
      console.log('Opening auth URL in new tab...')
      window.open(data.authUrl, '_blank')
      
      toast({
        title: "YouTube認証",
        description: "新しいタブでYouTube認証を完了してください。",
      })
    } catch (error) {
      console.error('YouTube auth initiation error:', error)
      toast({
        title: "認証エラー",
        description: "YouTube認証の開始に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const uploadToYouTube = async (credentials: any) => {
    try {
      console.log('=== YouTube Upload Debug ===')
      console.log('Credentials received:', {
        hasClientId: !!credentials.clientId,
        hasClientSecret: !!credentials.clientSecret,
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken
      })

      // refreshTokenが不足している場合は認証を要求
      if (!credentials.refreshToken) {
        console.log('Refresh token missing, initiating auth flow')
        setDistributionStatus(prev => 
          prev.map(status => 
            status.platform === 'youtube' 
              ? { ...status, status: 'auth_required', message: '認証が必要です' }
              : status
          )
        )
        
        await initiateYouTubeAuth()
        return { error: 'Authentication required' }
      }

      console.log('Proceeding with YouTube upload')
      const response = await fetch('/api/platforms/youtube-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          title,
          description,
          tags: '',
          categoryId: '22', // People & Blogs
          privacyStatus: 'private',
          filePath,
          mimeType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('YouTube upload failed:', errorData)
        
        if (errorData.error === 'Missing required parameters' && errorData.missing?.refreshToken) {
          // refreshTokenが不足している場合
          console.log('Refresh token still missing after upload attempt')
          setDistributionStatus(prev => 
            prev.map(status => 
              status.platform === 'youtube' 
                ? { ...status, status: 'auth_required', message: '認証が必要です' }
                : status
            )
          )
          
          await initiateYouTubeAuth()
          return { error: 'Authentication required' }
        }
        throw new Error('YouTube upload failed')
      }

      const result = await response.json()
      console.log('YouTube upload successful:', result)
      return result
    } catch (error) {
      console.error('YouTube upload error:', error)
      throw error
    }
  }

  const uploadToVoicy = async (credentials: any) => {
    try {
      const response = await fetch('/api/platforms/voicy-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          title,
          description,
          audioFiles: [filePath],
          hashtags: '',
          reservationDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
          reservationTime: '06:00'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('Voicy upload failed:', errorData)
        throw new Error(errorData.error || 'Voicy upload failed')
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const uploadToSpotify = async (credentials: any) => {
    try {
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          siteUrl: credentials.rssFeedUrl,
          feedUrl: credentials.rssFeedUrl,
          author: 'Your Name',
          items: [{
            title,
            description,
            url: filePath,
            pubDate: new Date().toISOString()
          }],
          outputPath: `./public/rss/${uploadId}.xml`
        })
      })

      if (!response.ok) {
        throw new Error('Spotify RSS generation failed')
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const handleDistribution = async () => {
    const selectedPlatforms = Object.entries(distributionTargets)
      .filter(([_, enabled]) => enabled)
      .map(([platform]) => platform as 'youtube' | 'voicy' | 'spotify')

    if (selectedPlatforms.length === 0) {
      toast({
        title: "エラー",
        description: "配信先を選択してください。",
        variant: "destructive"
      })
      return
    }

    setIsDistributing(true)
    
    // 初期状態を設定
    const initialStatus: DistributionStatus[] = selectedPlatforms.map(platform => ({
      platform,
      status: 'idle',
      progress: 0
    }))
    setDistributionStatus(initialStatus)

    // 各プラットフォームに並行してアップロード
    const uploadPromises = selectedPlatforms.map(async (platform, index) => {
      try {
        // アップロード開始
        setDistributionStatus(prev => 
          prev.map((status, i) => 
            i === index ? { ...status, status: 'uploading', progress: 10 } : status
          )
        )

        const credentials = getPlatformCredentials(platform)
        if (!credentials) {
          throw new Error('Credentials not found')
        }

        let result
        switch (platform) {
          case 'youtube':
            result = await uploadToYouTube(credentials)
            break
          case 'voicy':
            result = await uploadToVoicy(credentials)
            break
          case 'spotify':
            result = await uploadToSpotify(credentials)
            break
        }

        // 成功
        setDistributionStatus(prev => 
          prev.map((status, i) => 
            i === index ? { ...status, status: 'success', progress: 100 } : status
          )
        )

        return { platform, success: true, result }
      } catch (error) {
        // エラー
        setDistributionStatus(prev => 
          prev.map((status, i) => 
            i === index ? { 
              ...status, 
              status: 'error', 
              progress: 0,
              message: error instanceof Error ? error.message : 'Unknown error'
            } : status
          )
        )

        return { platform, success: false, error }
      }
    })

    try {
      const results = await Promise.all(uploadPromises)
      const successCount = results.filter(r => r.success).length
      const totalCount = results.length

      if (successCount === totalCount) {
        toast({
          title: "配信完了",
          description: `全てのプラットフォームへの配信が完了しました。`,
        })
      } else if (successCount > 0) {
        toast({
          title: "部分配信完了",
          description: `${successCount}/${totalCount}のプラットフォームへの配信が完了しました。`,
        })
      } else {
        toast({
          title: "配信失敗",
          description: "全てのプラットフォームへの配信に失敗しました。",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "配信処理中にエラーが発生しました。",
        variant: "destructive"
      })
    } finally {
      setIsDistributing(false)
    }
  }

  // 認証状態を確認する関数
  const checkAuthStatus = () => {
    const credentials = getPlatformCredentials('youtube')
    console.log('=== Current YouTube Auth Status ===')
    console.log('Credentials:', {
      hasClientId: !!credentials?.clientId,
      hasClientSecret: !!credentials?.clientSecret,
      hasAccessToken: !!credentials?.accessToken,
      hasRefreshToken: !!credentials?.refreshToken
    })
    
    if (credentials?.refreshToken) {
      toast({
        title: "認証状態",
        description: "YouTube認証は完了しています。",
      })
    } else {
      toast({
        title: "認証状態",
        description: "YouTube認証が必要です。",
        variant: "destructive"
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          配信プラットフォーム
        </CardTitle>
        <CardDescription>
          選択したプラットフォームに一括で配信できます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* プラットフォーム選択 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const isConfigured = isPlatformConfigured(platform.key)
            const isEnabled = distributionTargets[platform.key]
            const Icon = platform.icon

            return (
              <div
                key={platform.key}
                className={`relative p-4 border rounded-lg transition-all ${
                  isEnabled 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isConfigured || disabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${platform.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                      <p className="text-sm text-gray-500">{platform.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleTogglePlatform(platform.key)}
                    disabled={!isConfigured || disabled}
                  />
                </div>
                
                {!isConfigured && (
                  <Badge variant="secondary" className="text-xs">
                    設定が必要
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* 配信ボタン */}
        <Button
          onClick={handleDistribution}
          disabled={isDistributing || Object.values(distributionTargets).every(v => !v) || disabled}
          className="w-full"
        >
          {isDistributing ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
              配信中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              選択したプラットフォームに配信
            </>
          )}
        </Button>

        {/* 配信状況 */}
        {distributionStatus.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">配信状況</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={checkAuthStatus}
                className="text-xs"
              >
                認証状態確認
              </Button>
            </div>
            {distributionStatus.map((status, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(status.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {platforms.find(p => p.key === status.platform)?.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {status.progress}%
                    </span>
                  </div>
                  <Progress value={status.progress} className="h-2" />
                  {status.message && (
                    <p className="text-sm text-red-500 mt-1">{status.message}</p>
                  )}
                  {status.status === 'auth_required' && status.platform === 'youtube' && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={initiateYouTubeAuth}
                        className="text-xs"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        YouTube認証を実行
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 