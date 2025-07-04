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
import { Youtube, Music, Mic, Brain, Github } from "lucide-react"

interface Platform {
  id: string
  platform_type: 'voicy' | 'youtube' | 'spotify' | 'openai'
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
    apiKey?: string
  }
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSpotify, setSavingSpotify] = useState(false)
  const [savingOpenAI, setSavingOpenAI] = useState(false)
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
  const [openaiCredentials, setOpenAICredentials] = useState({
    apiKey: ""
  })
  const [youtubeDebugInfo, setYoutubeDebugInfo] = useState<any>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [githubRepo, setGithubRepo] = useState({
    username: "",
    repoName: ""
  })
  const [currentGithubPagesUrl, setCurrentGithubPagesUrl] = useState("")
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

  // localhost環境の検知
  useEffect(() => {
    const checkLocalhost = () => {
      const hostname = window.location.hostname
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')
      setIsLocalhost(isLocal)
    }
    
    checkLocalhost()
  }, [])

  // GitHub Pages URLの生成
  useEffect(() => {
    if (githubRepo.username && githubRepo.repoName) {
      const githubPagesUrl = `https://${githubRepo.username}.github.io/${githubRepo.repoName}`
      setCurrentGithubPagesUrl(githubPagesUrl)
    } else {
      setCurrentGithubPagesUrl("")
    }
  }, [githubRepo.username, githubRepo.repoName])

  // YouTube認証結果の確認
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const youtubeAuth = urlParams.get('youtube_auth')
    
    if (youtubeAuth === 'success') {
      toast({
        title: "YouTube認証成功",
        description: "YouTubeアカウントの認証が完了しました。",
      })
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname)
      // プラットフォーム一覧を再取得
      fetchPlatforms()
    } else if (youtubeAuth === 'error') {
      toast({
        title: "YouTube認証失敗",
        description: "YouTubeアカウントの認証に失敗しました。",
        variant: "destructive"
      })
      // URLパラメータをクリア
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

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
      // まず、クライアントIDとシークレットを保存
      const saveResponse = await fetch('/api/platforms', {
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

      if (saveResponse.ok) {
        toast({
          title: "YouTube設定保存完了",
          description: "クライアントIDとシークレットが保存されました。認証フローを開始します。",
        })

        // OAuth認証URLを取得（ユーザーIDを含む）
        console.log('Sending YouTube auth request with user ID:', user?.id)
        const authResponse = await fetch(`/api/platforms/youtube/auth?clientId=${encodeURIComponent(youtubeCredentials.clientId)}&clientSecret=${encodeURIComponent(youtubeCredentials.clientSecret)}&userId=${encodeURIComponent(user?.id || '')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (authResponse.ok) {
          const authData = await authResponse.json()
          console.log('YouTube auth URL generated:', authData.authUrl)
          
          // ブラウザで認証URLを開く
          const newWindow = window.open(authData.authUrl, '_blank', 'width=600,height=700')
          
          // 新しいウィンドウが開いたかチェック
          if (newWindow) {
            toast({
              title: "認証フロー開始",
              description: "新しいウィンドウでGoogle認証を完了してください。認証が完了すると自動的にこのページに戻ります。",
            })
          } else {
            // ポップアップブロッカーが有効な場合
            toast({
              title: "ポップアップがブロックされました",
              description: "以下のURLを新しいタブで開いて認証を完了してください。",
              variant: "destructive"
            })
            
            // 認証URLをクリップボードにコピー
            try {
              await navigator.clipboard.writeText(authData.authUrl)
              toast({
                title: "URLをコピーしました",
                description: "認証URLがクリップボードにコピーされました。新しいタブで貼り付けてください。",
              })
            } catch (error) {
              console.error('Clipboard copy failed:', error)
            }
          }
          
          // 認証URLをコンソールにも出力（デバッグ用）
          console.log('YouTube Auth URL:', authData.authUrl)
        } else {
          const errorData = await authResponse.json()
          console.error('YouTube auth URL generation failed:', errorData)
          toast({
            title: "認証エラー",
            description: `認証URLの生成に失敗しました: ${errorData.error || 'Unknown error'}`,
            variant: "destructive"
          })
        }

        await fetchPlatforms()
      } else {
        const errorData = await saveResponse.json()
        toast({
          title: "エラー",
          description: `YouTube設定の保存に失敗しました: ${errorData.error || 'Unknown error'}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('YouTube auth error:', error)
      toast({
        title: "エラー",
        description: "YouTube認証フローに失敗しました。",
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

  const handleOpenAIAuth = async () => {
    try {
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform_type: 'openai',
          platform_name: 'OpenAI',
          credentials: openaiCredentials,
          settings: {}
        })
      })

      if (response.ok) {
        toast({
          title: "OpenAI設定完了",
          description: "OpenAIの設定が保存されました。",
        })
        await fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "OpenAI設定の保存に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const handleGithubRepoSave = async () => {
    if (!githubRepo.username || !githubRepo.repoName) {
      toast({
        title: "入力エラー",
        description: "GitHubユーザー名とリポジトリ名を入力してください。",
        variant: "destructive"
      })
      return
    }

    try {
      // ローカルストレージに保存（開発用）
      localStorage.setItem('github_pages_url', currentGithubPagesUrl)
      localStorage.setItem('github_username', githubRepo.username)
      localStorage.setItem('github_repo_name', githubRepo.repoName)
      
      toast({
        title: "GitHub Pages設定保存完了",
        description: `GitHub Pages URL: ${currentGithubPagesUrl}`,
      })
      
      // 環境変数を更新するAPIを呼び出す（実際の実装では適切なAPIエンドポイントを作成）
      console.log('GitHub Pages URL saved:', currentGithubPagesUrl)
      
    } catch (error) {
      console.error('GitHub Pages save error:', error)
      toast({
        title: "エラー",
        description: "GitHub Pages設定の保存中にエラーが発生しました。",
        variant: "destructive"
      })
    }
  }

  const checkYouTubeAuthStatus = async () => {
    try {
      const response = await fetch('/api/platforms/youtube/debug', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setYoutubeDebugInfo(data)
        console.log('YouTube debug info:', data)
        
        toast({
          title: "認証状態確認",
          description: `ClientID: ${data.debug.hasClientId ? '✓' : '✗'}, RefreshToken: ${data.debug.hasRefreshToken ? '✓' : '✗'}`,
        })
      } else {
        toast({
          title: "エラー",
          description: "認証状態の確認に失敗しました。",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('YouTube debug error:', error)
      toast({
        title: "エラー",
        description: "認証状態の確認に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const resetYouTubeAuth = async () => {
    try {
      const response = await fetch('/api/platforms/youtube/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        toast({
          title: "認証情報リセット完了",
          description: "YouTube認証情報がリセットされました。再認証が必要です。",
        })
        await fetchPlatforms()
        setYoutubeDebugInfo(null)
      } else {
        toast({
          title: "エラー",
          description: "認証情報のリセットに失敗しました。",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('YouTube reset error:', error)
      toast({
        title: "エラー",
        description: "認証情報のリセットに失敗しました。",
        variant: "destructive"
      })
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
        case 'openai':
          return <Badge className="bg-purple-100 text-purple-800 border-purple-200">設定済み</Badge>
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
      case 'openai':
        return {
          tab: 'data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200',
          card: 'border-purple-200',
          button: 'bg-purple-600 hover:bg-purple-700 text-white',
          icon: 'text-purple-600'
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="openai" className={`flex items-center gap-2 ${getPlatformColors('openai').tab}`}>
              <Brain className={`h-4 w-4 ${getPlatformColors('openai').icon}`} />
              前処理設定
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
                <Button 
                  onClick={checkYouTubeAuthStatus} 
                  variant="outline" 
                  className="w-full"
                >
                  認証状態を確認
                </Button>
                <Button 
                  onClick={resetYouTubeAuth} 
                  variant="outline" 
                  className="w-full"
                >
                  認証情報をリセット
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const authResponse = await fetch(`/api/platforms/youtube/auth?clientId=${encodeURIComponent(youtubeCredentials.clientId)}&clientSecret=${encodeURIComponent(youtubeCredentials.clientSecret)}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      })
                      
                      if (authResponse.ok) {
                        const authData = await authResponse.json()
                        window.open(authData.authUrl, '_blank')
                        toast({
                          title: "認証URLを開きました",
                          description: "新しいタブでGoogle認証を完了してください。",
                        })
                      }
                    } catch (error) {
                      toast({
                        title: "エラー",
                        description: "認証URLの取得に失敗しました。",
                        variant: "destructive"
                      })
                    }
                  }}
                  variant="outline" 
                  className="w-full"
                  disabled={!youtubeCredentials.clientId || !youtubeCredentials.clientSecret}
                >
                  認証URLを手動で開く
                </Button>
                {youtubeDebugInfo && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">認証状態</h4>
                    <div className="text-sm space-y-1">
                      <div>Client ID: {youtubeDebugInfo.debug.hasClientId ? '✓' : '✗'}</div>
                      <div>Client Secret: {youtubeDebugInfo.debug.hasClientSecret ? '✓' : '✗'}</div>
                      <div>Access Token: {youtubeDebugInfo.debug.hasAccessToken ? '✓' : '✗'}</div>
                      <div>Refresh Token: {youtubeDebugInfo.debug.hasRefreshToken ? '✓' : '✗'}</div>
                    </div>
                    {!youtubeDebugInfo.debug.hasRefreshToken && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <strong>注意:</strong> Refresh Tokenが取得できていません。Google認証を完了してください。
                      </div>
                    )}
                    {youtubeDebugInfo.debug.hasRefreshToken && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <strong>情報:</strong> テスト中のGoogle Cloudプロジェクトでは、Refresh Tokenは7日間で期限切れになります。期限切れの場合は再認証が必要です。
                      </div>
                    )}
                  </div>
                )}
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

                {/* localhost環境でのみ表示されるGitHubリポジトリ選択UI */}
                {isLocalhost && (
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">localhost実行用</Badge>
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        GitHub Pages設定
                      </h4>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-4">
                        localhost環境では、GitHub PagesのRSS Feedを使用できます。任意のGitHubリポジトリを選択してください。
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="github-username">GitHubユーザー名</Label>
                          <Input
                            id="github-username"
                            type="text"
                            value={githubRepo.username}
                            onChange={(e) => setGithubRepo(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="your-username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="github-repo-name">リポジトリ名</Label>
                          <Input
                            id="github-repo-name"
                            type="text"
                            value={githubRepo.repoName}
                            onChange={(e) => setGithubRepo(prev => ({ ...prev, repoName: e.target.value }))}
                            placeholder="your-repo-name"
                          />
                        </div>
                      </div>
                      {currentGithubPagesUrl && (
                        <div className="mt-4 p-3 bg-white rounded border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">生成されるURL:</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(currentGithubPagesUrl)}
                            >
                              コピー
                            </Button>
                          </div>
                          <p className="text-sm font-mono text-gray-600 mt-1 break-all">
                            {currentGithubPagesUrl}
                          </p>
                        </div>
                      )}
                      <Button 
                        onClick={handleGithubRepoSave}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!githubRepo.username || !githubRepo.repoName}
                      >
                        GitHub Pages設定を保存
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="openai" className="mt-6">
            <Card className={getPlatformColors('openai').card}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className={`h-5 w-5 ${getPlatformColors('openai').icon}`} />
                      OpenAI設定
                    </CardTitle>
                    <CardDescription>
                      OpenAI APIキーを設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('openai')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const connectedPlatform = getConnectedPlatformData('openai')
                  if (connectedPlatform) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">現在の設定</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">APIキー:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono bg-white px-2 py-1 rounded border max-w-xs truncate">
                                  {maskSensitiveData(connectedPlatform.credentials?.apiKey || '', showPasswords['openai-api-key'])}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('openai-api-key')}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {showPasswords['openai-api-key'] ? '隠す' : '表示'}
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
                  <Label htmlFor="openai-api-key">APIキー</Label>
                  <Input
                    id="openai-api-key"
                    type="text"
                    value={openaiCredentials.apiKey}
                    onChange={(e) => setOpenAICredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="OpenAI APIキー"
                  />
                </div>
                <Button onClick={handleOpenAIAuth} className={`w-full ${getPlatformColors('openai').button}`}>
                  OpenAI設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 