"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Youtube, Music, Mic } from "lucide-react"

interface Platform {
  id: string
  platform_type: 'voicy' | 'youtube' | 'spotify'
  platform_name: string
  is_active: boolean
  created_at: string
  updated_at: string
  credentials?: {
    clientId?: string
    clientSecret?: string
    email?: string
    password?: string
    rssFeedUrl?: string
  }
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSpotify, setSavingSpotify] = useState(false)
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const [youtubeCredentials, setYouTubeCredentials] = useState({
    clientId: "",
    clientSecret: ""
  })
  const [voicyCredentials, setVoicyCredentials] = useState({
    email: "",
    password: ""
  })
  const [spotifyCredentials, setSpotifyCredentials] = useState({
    rssFeedUrl: ""
  })
  const { toast } = useToast()
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && token) {
      fetchPlatforms()
    }
  }, [user, token, authLoading, router])

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched platforms data:', data.data)
        setPlatforms(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch platforms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleYouTubeAuth = async () => {
    try {
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform_type: 'youtube',
          platform_name: 'YouTube',
          credentials: youtubeCredentials,
          settings: {}
        })
      })

      if (response.ok) {
        toast({
          title: "YouTube設定完了",
          description: "YouTubeの設定が保存されました。",
        })
        await fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "YouTube設定の保存に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const handleVoicyAuth = async () => {
    try {
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform_type: 'voicy',
          platform_name: 'Voicy',
          credentials: voicyCredentials,
          settings: {}
        })
      })

      if (response.ok) {
        toast({
          title: "Voicy設定完了",
          description: "Voicyの設定が保存されました。",
        })
        await fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "Voicy設定の保存に失敗しました。",
        variant: "destructive"
      })
    }
  }

  // RSS Feed URLの検証関数
  const validateRssFeedUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/validate-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.isValid
      }
      return false
    } catch (error) {
      console.error('RSS validation error:', error)
      return false
    }
  }

  const handleSpotifyAuth = async () => {
    if (!spotifyCredentials.rssFeedUrl.trim()) {
      toast({
        title: "エラー",
        description: "RSS Feed URLを入力してください。",
        variant: "destructive"
      })
      return
    }

    setSavingSpotify(true)
    try {
      // RSS Feed URLの検証
      const isValid = await validateRssFeedUrl(spotifyCredentials.rssFeedUrl)
      
      if (!isValid) {
        toast({
          title: "エラー",
          description: "有効なRSS Feed URLではありません。",
          variant: "destructive"
        })
        return
      }

      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform_type: 'spotify',
          platform_name: 'Spotify',
          credentials: spotifyCredentials,
          settings: {}
        })
      })

      if (response.ok) {
        toast({
          title: "Spotify設定完了",
          description: "SpotifyのRSS Feed設定が保存されました。",
        })
        // 保存完了後にプラットフォーム一覧を再取得
        await fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "Spotify設定の保存に失敗しました。",
        variant: "destructive"
      })
    } finally {
      setSavingSpotify(false)
    }
  }

  const getPlatformStatus = (platformType: string) => {
    const platform = platforms.find(p => p.platform_type === platformType)
    const isConnected = platform && (platform.is_active || platform.id)
    
    if (isConnected) {
      switch (platformType) {
        case 'youtube':
          return <Badge className="bg-red-100 text-red-800 border-red-200">接続済み</Badge>
        case 'voicy':
          return <Badge className="bg-blue-100 text-blue-800 border-blue-200">接続済み</Badge>
        case 'spotify':
          return <Badge className="bg-green-100 text-green-800 border-green-200">接続済み</Badge>
        default:
          return <Badge className="bg-green-100 text-green-800 border-green-200">接続済み</Badge>
      }
    } else {
      return <Badge variant="outline">未接続</Badge>
    }
  }

  const getPlatformColors = (platformType: string) => {
    switch (platformType) {
      case 'youtube':
        return {
          tab: 'data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border-red-200',
          card: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          icon: 'text-red-600'
        }
      case 'voicy':
        return {
          tab: 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200',
          card: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          icon: 'text-blue-600'
        }
      case 'spotify':
        return {
          tab: 'data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200',
          card: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700 text-white',
          icon: 'text-green-600'
        }
      default:
        return {
          tab: '',
          card: '',
          button: '',
          icon: ''
        }
    }
  }

  // 機密情報をマスクする関数
  const maskSensitiveData = (data: string, show: boolean = false): string => {
    if (!data) return ''
    if (show) return data
    return '*'.repeat(Math.min(data.length, 8))
  }

  // 接続済みプラットフォームのデータを取得
  const getConnectedPlatformData = (platformType: string) => {
    return platforms.find(p => p.platform_type === platformType)
  }

  // パスワード表示/非表示を切り替え
  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プラットフォーム設定</h1>
          <p className="text-gray-600 mt-2">
            配信プラットフォームの認証情報を設定してください
          </p>
        </div>

        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className={`flex items-center gap-2 ${getPlatformColors('youtube').tab}`}>
              <Youtube className={`h-4 w-4 ${getPlatformColors('youtube').icon}`} />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="voicy" className={`flex items-center gap-2 ${getPlatformColors('voicy').tab}`}>
              <Mic className={`h-4 w-4 ${getPlatformColors('voicy').icon}`} />
              Voicy
            </TabsTrigger>
            <TabsTrigger value="spotify" className={`flex items-center gap-2 ${getPlatformColors('spotify').tab}`}>
              <Music className={`h-4 w-4 ${getPlatformColors('spotify').icon}`} />
              Spotify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="mt-6">
            <Card className={getPlatformColors('youtube').card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Youtube className={`h-5 w-5 ${getPlatformColors('youtube').icon}`} />
                      YouTube設定
                    </CardTitle>
                    <CardDescription>
                      YouTube Data API v3の認証情報を設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('youtube')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const connectedPlatform = getConnectedPlatformData('youtube')
                  if (connectedPlatform) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">現在の設定</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Client ID:</span>
                              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                {connectedPlatform.credentials?.clientId || '設定されていません'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Client Secret:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                  {maskSensitiveData(connectedPlatform.credentials?.clientSecret || '', showPasswords['youtube-client-secret'])}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('youtube-client-secret')}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {showPasswords['youtube-client-secret'] ? '隠す' : '表示'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">設定を更新</h4>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="space-y-2">
                  <Label htmlFor="youtube-client-id">Client ID</Label>
                  <Input
                    id="youtube-client-id"
                    type="text"
                    value={youtubeCredentials.clientId}
                    onChange={(e) => setYouTubeCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="YouTube Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube-client-secret">Client Secret</Label>
                  <Input
                    id="youtube-client-secret"
                    type="password"
                    value={youtubeCredentials.clientSecret}
                    onChange={(e) => setYouTubeCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="YouTube Client Secret"
                  />
                </div>
                <Button onClick={handleYouTubeAuth} className={`w-full ${getPlatformColors('youtube').button}`}>
                  YouTube設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voicy" className="mt-6">
            <Card className={getPlatformColors('voicy').card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className={`h-5 w-5 ${getPlatformColors('voicy').icon}`} />
                      Voicy設定
                    </CardTitle>
                    <CardDescription>
                      Voicyアカウントのログイン情報を設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('voicy')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const connectedPlatform = getConnectedPlatformData('voicy')
                  if (connectedPlatform) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">現在の設定</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">ログインEmail:</span>
                              <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                {connectedPlatform.credentials?.email || '設定されていません'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">ログインパスワード:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                  {maskSensitiveData(connectedPlatform.credentials?.password || '', showPasswords['voicy-password'])}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('voicy-password')}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {showPasswords['voicy-password'] ? '隠す' : '表示'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">設定を更新</h4>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="space-y-2">
                  <Label htmlFor="voicy-email">ログインEmail</Label>
                  <Input
                    id="voicy-email"
                    type="email"
                    value={voicyCredentials.email}
                    onChange={(e) => setVoicyCredentials(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="VoicyログインEmail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voicy-password">ログインパスワード</Label>
                  <Input
                    id="voicy-password"
                    type="password"
                    value={voicyCredentials.password}
                    onChange={(e) => setVoicyCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Voicyログインパスワード"
                  />
                </div>
                <Button onClick={handleVoicyAuth} className={`w-full ${getPlatformColors('voicy').button}`}>
                  Voicy設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spotify" className="mt-6">
            <Card className={getPlatformColors('spotify').card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className={`h-5 w-5 ${getPlatformColors('spotify').icon}`} />
                      Spotify設定
                    </CardTitle>
                    <CardDescription>
                      SpotifyのRSS Feed URLを設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('spotify')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const connectedPlatform = getConnectedPlatformData('spotify')
                  if (connectedPlatform) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">現在の設定</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">RSS Feed URL:</span>
                              <span className="text-sm font-mono bg-white px-2 py-1 rounded border max-w-xs truncate">
                                {connectedPlatform.credentials?.rssFeedUrl || '設定されていません'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">設定を更新</h4>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="space-y-2">
                  <Label htmlFor="spotify-rss-feed-url">RSS Feed URL</Label>
                  <Input
                    id="spotify-rss-feed-url"
                    type="text"
                    value={spotifyCredentials.rssFeedUrl}
                    onChange={(e) => setSpotifyCredentials(prev => ({ ...prev, rssFeedUrl: e.target.value }))}
                    placeholder="Spotify RSS Feed URL"
                  />
                </div>
                <Button 
                  onClick={handleSpotifyAuth} 
                  className={`w-full ${getPlatformColors('spotify').button}`}
                  disabled={savingSpotify}
                >
                  {savingSpotify ? '検証中...' : 'Spotify設定を保存'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 