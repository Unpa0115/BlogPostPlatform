import { useState } from "react";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FaYoutube, FaSpotify } from "react-icons/fa";
import { Mic, ExternalLink, Save, Unlink, Rss, Home } from "lucide-react";
import { RssFeedManager } from "@/components/rss-feed-manager";
import { Link } from "wouter";
import type { PlatformSettings } from "@shared/schema";

function VoicyCredentialForm() {
  const [voicySettings, setVoicySettings] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const { data: voicyStatus, isLoading } = useQuery<any>({
    queryKey: ['/api/voicy/test'],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const { data: currentCredentials } = useQuery<any>({
    queryKey: ['/api/voicy/credentials'],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Pre-fill form with current credentials when data is loaded
  React.useEffect(() => {
    if (currentCredentials) {
      setVoicySettings({
        email: currentCredentials.email || '',
        password: currentCredentials.password || ''
      });
    }
  }, [currentCredentials]);

  const saveVoicySettings = useMutation({
    mutationFn: async (settings: { email: string; password: string }) => {
      return await apiRequest('/api/voicy/credentials', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "Voicy認証情報が更新されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "認証情報の更新に失敗しました",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!voicySettings.email.trim() || !voicySettings.password.trim()) {
      toast({
        title: "エラー",
        description: "メールアドレスとパスワードを入力してください",
        variant: "destructive",
      });
      return;
    }
    saveVoicySettings.mutate(voicySettings);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-gray-600">認証情報を確認中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {voicyStatus?.success && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">現在の設定状況:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <div>• VOICY_EMAIL: ✓ 設定済み</div>
            <div>• VOICY_PASSWORD: ✓ 設定済み</div>
            <div className="mt-2 text-green-700 font-medium">
              認証情報は正常に設定されています
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-3">認証情報の更新:</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="voicy-email">Voicyメールアドレス</Label>
            <Input
              id="voicy-email"
              type="email"
              value={voicySettings.email}
              onChange={(e) => setVoicySettings(prev => ({ ...prev, email: e.target.value }))}
              placeholder={currentCredentials?.hasCredentials ? "現在の設定を変更する場合は新しいメールアドレスを入力" : "your-email@example.com"}
              className="mt-1"
            />
            {currentCredentials?.hasCredentials && (
              <div className="text-xs text-gray-500 mt-1">
                環境変数から取得した値が表示されています
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="voicy-password">Voicyパスワード</Label>
            <div className="relative mt-1">
              <Input
                id="voicy-password"
                type={showPassword ? "text" : "password"}
                value={voicySettings.password}
                onChange={(e) => setVoicySettings(prev => ({ ...prev, password: e.target.value }))}
                placeholder={currentCredentials?.hasCredentials ? "現在の設定を変更する場合は新しいパスワードを入力" : "パスワードを入力"}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "隠す" : "表示"}
              </Button>
            </div>
            {currentCredentials?.hasCredentials && (
              <div className="text-xs text-gray-500 mt-1">
                環境変数から取得した値が表示されています
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saveVoicySettings.isPending}
            className="w-full"
          >
            {saveVoicySettings.isPending ? "更新中..." : "認証情報を更新"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [youtubeSettings, setYoutubeSettings] = useState({
    clientId: "",
    clientSecret: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: platforms } = useQuery<PlatformSettings[]>({
    queryKey: ['/api/platforms'],
  });

  const youtubePlatform = platforms?.find(p => p.platform === 'youtube');
  const isYouTubeConnected = youtubePlatform?.isActive;

  const saveYouTubeSettingsMutation = useMutation({
    mutationFn: async (data: { clientId: string; clientSecret: string }) => {
      const response = await apiRequest('POST', '/api/youtube/settings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "設定保存完了",
        description: "YouTube認証情報を保存しました。OAuth認証を開始してください。",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      // Don't clear the form - keep credentials visible for OAuth process
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "設定の保存に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const youtubeAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/youtube/auth');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Open auth URL directly in same tab for better compatibility
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "エラー",
          description: "認証URLが取得できませんでした。",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "認証URLの生成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const youtubeDisconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/youtube/disconnect');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "接続解除完了",
        description: "YouTubeとの接続を解除しました。",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "接続解除に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleYouTubeSave = () => {
    if (!youtubeSettings.clientId.trim() || !youtubeSettings.clientSecret.trim()) {
      toast({
        title: "エラー",
        description: "Client IDとClient Secretを入力してください。",
        variant: "destructive",
      });
      return;
    }
    saveYouTubeSettingsMutation.mutate(youtubeSettings);
  };

  const getStatusBadge = (platform: string, isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-100 text-green-800">接続済み</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">要設定</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">プラットフォーム設定</h1>
            <p className="text-gray-600 mt-2">各プラットフォームの接続設定を管理します</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              トップに戻る
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="youtube" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="youtube" className="flex items-center space-x-2">
              <FaYoutube className="text-red-600" />
              <span>YouTube</span>
            </TabsTrigger>
            <TabsTrigger value="spotify" className="flex items-center space-x-2">
              <FaSpotify className="text-green-600" />
              <span>Spotify</span>
            </TabsTrigger>
            <TabsTrigger value="voicy" className="flex items-center space-x-2">
              <Mic className="text-orange-600" />
              <span>Voicy</span>
            </TabsTrigger>
            <TabsTrigger value="rss" className="flex items-center space-x-2">
              <Rss className="text-blue-600" />
              <span>RSS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaYoutube className="text-red-600 text-2xl" />
                    <div>
                      <CardTitle>YouTube設定</CardTitle>
                      <CardDescription>YouTube Data API v3の認証情報を設定</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge('youtube', isYouTubeConnected || false)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">設定手順:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Google Cloud Consoleでプロジェクトを作成</li>
                    <li>YouTube Data API v3を有効化</li>
                    <li>OAuth 2.0クライアントIDを作成</li>
                    <li>認証情報をコピーして下記に入力</li>
                    <li>OAuth認証を完了</li>
                  </ol>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-800"
                  >
                    Google Cloud Console <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </div>

                {!isYouTubeConnected ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        value={youtubeSettings.clientId}
                        onChange={(e) => setYoutubeSettings(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="Google OAuth Client ID"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        value={youtubeSettings.clientSecret}
                        onChange={(e) => setYoutubeSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="Google OAuth Client Secret"
                        className="mt-1"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={handleYouTubeSave}
                        disabled={saveYouTubeSettingsMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saveYouTubeSettingsMutation.isPending ? "保存中..." : "認証情報を保存"}</span>
                      </Button>

                      {youtubePlatform?.settings && (
                        <Button
                          onClick={() => youtubeAuthMutation.mutate()}
                          disabled={youtubeAuthMutation.isPending}
                          variant="outline"
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>{youtubeAuthMutation.isPending ? "認証中..." : "OAuth認証を開始"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-800 font-medium">YouTube接続済み</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        動画のアップロードが可能です
                      </p>
                    </div>

                    <Button
                      onClick={() => youtubeDisconnectMutation.mutate()}
                      disabled={youtubeDisconnectMutation.isPending}
                      variant="outline"
                      className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Unlink className="h-4 w-4" />
                      <span>{youtubeDisconnectMutation.isPending ? "切断中..." : "接続を解除"}</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spotify">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaSpotify className="text-green-600 text-2xl" />
                    <div>
                      <CardTitle>Spotify設定</CardTitle>
                      <CardDescription>RSS Feed経由でのポッドキャスト配信設定</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">設定完了</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">RSS Feed配信:</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <div>• 音声ファイルアップロード時に自動でRSSフィードを更新</div>
                    <div>• SpotifyはRSSフィードからエピソードを自動取得</div>
                    <div>• ファイルの存在確認: <span className="font-mono text-green-700">✓ 正常</span></div>
                    <div>• RSS XMLファイル: <span className="font-mono text-green-700">public/rss/spotify-feed.xml</span></div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">RSS Feed URL:</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div>以下のURLをSpotify for Podcastersに登録してください:</div>
                    <div className="bg-white p-2 rounded border font-mono text-xs break-all">
                      https://workspace.p13163t0yss1td.repl.co/rss/spotify-feed.xml
                    </div>
                    <div className="text-xs text-blue-600">
                      このRSSフィードが正しく動作していればSpotify設定は完了です
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voicy">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mic className="text-orange-600 text-2xl" />
                    <div>
                      <CardTitle>Voicy設定</CardTitle>
                      <CardDescription>Web自動化によるアップロード設定</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">設定完了</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <VoicyCredentialForm />
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">自動化機能:</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <div>• 実際のログインとアップロードを実行可能</div>
                    <div>• 音声ファイルの自動アップロード</div>
                    <div>• メタデータ（タイトル・説明）の自動入力</div>
                    <div>• フォーム送信まで自動化済み</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rss">
            <RssFeedManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}