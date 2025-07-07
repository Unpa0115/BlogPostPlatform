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
import { checkAllPlatforms } from '@/lib/file-formats'

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

interface PlatformSupport {
  isSupported: boolean
  message: string
  disabled: boolean
}

export function DistributionManager({ uploadId, title, description, filePath, mimeType, disabled }: DistributionManagerProps) {
  const [distributionTargets, setDistributionTargets] = useState({
    youtube: false,
    voicy: false,
    spotify: false
  })
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus[]>([])
  const [isDistributing, setIsDistributing] = useState(false)
  const [platformSupport, setPlatformSupport] = useState<{ [key: string]: PlatformSupport }>({
    youtube: { isSupported: true, message: '', disabled: false },
    voicy: { isSupported: true, message: '', disabled: false },
    spotify: { isSupported: true, message: '', disabled: false }
  })
  
  const { toast } = useToast()
  const { isPlatformConfigured, getPlatformCredentials } = usePlatforms()
  const { token, user } = useAuth()

  // ファイル形式に基づいてプラットフォームの対応状況をチェック
  useEffect(() => {
    // filePathまたはtitleからファイル名を取得
    let fileName = ''
    
    if (filePath) {
      // filePathからファイル名を抽出（パスの最後の部分）
      fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath
    } else if (title) {
      fileName = title
    }
    
    // ファイル名が空の場合は処理をスキップ
    if (!fileName || fileName === 'Untitled') {
      return
    }
    
    console.log('=== File Format Check Debug ===')
    console.log('fileName:', fileName)
    console.log('filePath:', filePath)
    console.log('title:', title)
    console.log('mimeType:', mimeType)
    
    const supportResults = checkAllPlatforms(fileName, mimeType)
    console.log('Support results:', supportResults)
    
    const newPlatformSupport: { [key: string]: PlatformSupport } = {}
    
    Object.keys(supportResults).forEach(platform => {
      const result = supportResults[platform]
      newPlatformSupport[platform] = {
        isSupported: result.isSupported,
        message: result.message,
        disabled: !result.isSupported
      }
    })
    
    console.log('New platform support:', newPlatformSupport)
    setPlatformSupport(newPlatformSupport)
    
    // 対応していないプラットフォームは自動的にオフにし、対応しているプラットフォームは自動的にオンにする
    setDistributionTargets(prev => {
      const newTargets = { ...prev }
      Object.keys(newPlatformSupport).forEach(platform => {
        if (!newPlatformSupport[platform].isSupported) {
          newTargets[platform as keyof typeof prev] = false
        } else {
          // 対応しているプラットフォームで、かつ設定済みの場合は自動的にオンにする
          const isConfigured = isPlatformConfigured(platform as 'youtube' | 'voicy' | 'spotify')
          if (isConfigured) {
            newTargets[platform as keyof typeof prev] = true
          } else {
            // 設定されていない場合はオフのままにする
            newTargets[platform as keyof typeof prev] = false
          }
        }
      })
      return newTargets
    })
  }, [filePath, title, mimeType])

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

  const uploadToYouTube = async (credentials: any) => {
    try {
      console.log('=== YouTube Upload ===')
      
      // まず認証状態を確認
      const authResponse = await fetch('/api/youtube/auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!authResponse.ok) {
        // 認証が必要な場合
        throw new Error('YouTube authentication required')
      }

      // アップロードを実行
      const response = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          tags: [],
          categoryId: '22', // People & Blogs
          privacyStatus: 'private',
          filePath,
          mimeType: mimeType || 'video/mp4'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'Authentication required') {
          // 認証が必要な場合は認証URLを取得
          const authData = await authResponse.json()
          window.open(authData.authUrl, '_blank')
          throw new Error('YouTube authentication required')
        }
        throw new Error(errorData.message || 'YouTube upload failed')
      }

      const result = await response.json()
      console.log('YouTube upload successful:', result)
      
      toast({
        title: "YouTube配信完了",
        description: `動画が正常にアップロードされました。`,
      })
      
      return result
    } catch (error) {
      console.error('YouTube upload error:', error)
      if (error instanceof Error && error.message === 'YouTube authentication required') {
        toast({
          title: "YouTube認証が必要",
          description: "新しいタブでYouTube認証を完了してください。",
          variant: "destructive"
        })
      }
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
      console.log('=== Spotify RSS Generation Debug ===')
      console.log('Upload ID:', uploadId)
      console.log('Title:', title)
      console.log('Description:', description)
      console.log('File path:', filePath)
      
      if (!uploadId) {
        throw new Error('Upload ID is required for Spotify RSS generation')
      }

      // ユーザーIDを取得
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user information')
      }
      
      const userData = await userResponse.json()
      const userId = userData.user?.id
      
      if (!userId) {
        throw new Error('User ID not found')
      }
      
      console.log('User ID:', userId)

      // ファイル名からUUIDを取得
      let actualUploadId = uploadId
      if (filePath && (filePath.includes('.mp3') || filePath.includes('.wav') || filePath.includes('.m4a'))) {
        try {
          // ファイル名を抽出（パスから最後の部分）
          const fileName = filePath.split('/').pop()
          console.log('Looking up UUID for file name:', fileName)
          
          const uploadResponse = await fetch(`/api/uploads/lookup?fileName=${encodeURIComponent(fileName || '')}&userId=${encodeURIComponent(userId)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            if (uploadData.success && uploadData.upload) {
              actualUploadId = uploadData.upload.id
              console.log('Found UUID from file name:', actualUploadId)
            }
          } else {
            console.log('Failed to get UUID from file name, response not ok:', uploadResponse.status)
          }
        } catch (error) {
          console.log('Failed to get UUID from file name, using original uploadId:', error)
        }
      }

      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uploadId: actualUploadId,
          userId,
          title,
          description,
          audioFile: filePath,
          mimeType,
          action: 'add'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('Spotify RSS generation failed:', errorData)
        throw new Error(errorData.error || 'Spotify RSS generation failed')
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const handleDistribution = async () => {
    const selectedPlatforms = Object.entries(distributionTargets)
      .filter(([_, isSelected]) => isSelected)
      .map(([platform, _]) => platform as 'youtube' | 'voicy' | 'spotify')

    if (selectedPlatforms.length === 0) {
      toast({
        title: "プラットフォームを選択してください",
        description: "配信先のプラットフォームを選択してください。",
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
            const support = platformSupport[platform.key]

            return (
              <div
                key={platform.key}
                className={`relative p-4 border rounded-lg transition-all ${
                  isEnabled 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isConfigured || disabled || support.disabled ? 'opacity-50' : ''}`}
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
                    disabled={!isConfigured || disabled || support.disabled}
                  />
                </div>
                
                {!isConfigured && (
                  <Badge variant="secondary" className="text-xs">
                    設定が必要
                  </Badge>
                )}
                
                {support.disabled && (
                  <div className="mt-2">
                    <Badge variant="destructive" className="text-xs mb-1">
                      対象外の拡張子
                    </Badge>
                    <p className="text-xs text-red-600">{support.message}</p>
                  </div>
                )}
                
                {support.isSupported && !support.disabled && (
                  <Badge variant="default" className="text-xs">
                    対応ファイル形式
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 