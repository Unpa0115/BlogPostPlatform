"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Youtube, Music, Mic } from "lucide-react"

interface Platform {
  id: string
  platform_type: 'voicy' | 'youtube' | 'spotify'
  platform_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeCredentials, setYouTubeCredentials] = useState({
    clientId: "",
    clientSecret: ""
  })
  const [voicyCredentials, setVoicyCredentials] = useState({
    email: "",
    password: ""
  })
  const [spotifyCredentials, setSpotifyCredentials] = useState({
    clientId: "",
    clientSecret: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        fetchPlatforms()
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "Voicy設定の保存に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const handleSpotifyAuth = async () => {
    try {
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          description: "Spotifyの設定が保存されました。",
        })
        fetchPlatforms()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "Spotify設定の保存に失敗しました。",
        variant: "destructive"
      })
    }
  }

  const getPlatformStatus = (platformType: string) => {
    const platform = platforms.find(p => p.platform_type === platformType)
    return platform?.is_active ? (
      <Badge variant="default" className="bg-green-100 text-green-800">接続済み</Badge>
    ) : (
      <Badge variant="outline">未接続</Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
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
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="voicy" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voicy
            </TabsTrigger>
            <TabsTrigger value="spotify" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Spotify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>YouTube設定</CardTitle>
                    <CardDescription>
                      YouTube Data API v3の認証情報を設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('youtube')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <Button onClick={handleYouTubeAuth} className="w-full">
                  YouTube設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voicy" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Voicy設定</CardTitle>
                    <CardDescription>
                      Voicyアカウントの認証情報を設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('voicy')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voicy-email">メールアドレス</Label>
                  <Input
                    id="voicy-email"
                    type="email"
                    value={voicyCredentials.email}
                    onChange={(e) => setVoicyCredentials(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Voicyメールアドレス"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voicy-password">パスワード</Label>
                  <Input
                    id="voicy-password"
                    type="password"
                    value={voicyCredentials.password}
                    onChange={(e) => setVoicyCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Voicyパスワード"
                  />
                </div>
                <Button onClick={handleVoicyAuth} className="w-full">
                  Voicy設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spotify" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Spotify設定</CardTitle>
                    <CardDescription>
                      Spotify APIの認証情報を設定してください
                    </CardDescription>
                  </div>
                  {getPlatformStatus('spotify')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spotify-client-id">Client ID</Label>
                  <Input
                    id="spotify-client-id"
                    type="text"
                    value={spotifyCredentials.clientId}
                    onChange={(e) => setSpotifyCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="Spotify Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spotify-client-secret">Client Secret</Label>
                  <Input
                    id="spotify-client-secret"
                    type="password"
                    value={spotifyCredentials.clientSecret}
                    onChange={(e) => setSpotifyCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="Spotify Client Secret"
                  />
                </div>
                <Button onClick={handleSpotifyAuth} className="w-full">
                  Spotify設定を保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 