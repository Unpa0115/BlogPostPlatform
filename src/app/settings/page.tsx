"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { RssFeedManager } from "@/components/rss-feed-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsLoading(true)
    
    // 設定保存のロジック（後で実装）
    setTimeout(() => {
      toast({
        title: "設定保存",
        description: "設定が正常に保存されました。",
      })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="text-gray-600 mt-2">
            アプリケーションの設定を管理します
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">一般設定</TabsTrigger>
            <TabsTrigger value="security">セキュリティ</TabsTrigger>
            <TabsTrigger value="platforms">プラットフォーム</TabsTrigger>
            <TabsTrigger value="rss">RSS Feed管理</TabsTrigger>
          </TabsList>

          {/* 一般設定タブ */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>一般設定</CardTitle>
                  <CardDescription>
                    基本的なアプリケーション設定
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@example.com"
                      defaultValue="user@example.com"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>通知</Label>
                      <p className="text-sm text-gray-500">
                        処理完了時の通知を受け取る
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>自動保存</Label>
                      <p className="text-sm text-gray-500">
                        設定を自動的に保存する
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>データ管理</CardTitle>
                  <CardDescription>
                    データの管理とエクスポート
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full">
                    データをエクスポート
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    データをインポート
                  </Button>

                  <Button variant="destructive" className="w-full">
                    アカウントを削除
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* セキュリティタブ */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>セキュリティ</CardTitle>
                <CardDescription>
                  セキュリティ関連の設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">現在のパスワード</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="現在のパスワード"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">新しいパスワード</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="新しいパスワード"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>二要素認証</Label>
                    <p className="text-sm text-gray-500">
                      セキュリティを強化する
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* プラットフォームタブ */}
          <TabsContent value="platforms">
            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム設定</CardTitle>
                <CardDescription>
                  配信プラットフォームの設定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>YouTube</Label>
                    <p className="text-sm text-gray-500">
                      YouTube配信の設定
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Voicy</Label>
                    <p className="text-sm text-gray-500">
                      Voicy配信の設定
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Spotify</Label>
                    <p className="text-sm text-gray-500">
                      Spotify配信の設定
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RSS Feed管理タブ */}
          <TabsContent value="rss">
            <RssFeedManager />
          </TabsContent>
        </Tabs>

        {/* 保存ボタン */}
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </div>
    </div>
  )
} 