import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Rss, ExternalLink, RefreshCw, Copy, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RssFeedInfo {
  feedUrl: string;
  totalEpisodes: number;
  lastUpdated: string;
}

export function RssFeedManager() {
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: feedInfo, isLoading } = useQuery<RssFeedInfo>({
    queryKey: ['/api/rss/info'],
    queryFn: async () => {
      // Get feed URL from regenerate endpoint
      const response = await fetch('/api/rss/regenerate', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get RSS feed info');
      }
      
      return {
        feedUrl: data.feedUrl,
        totalEpisodes: 0, // Will be updated when feed is regenerated
        lastUpdated: new Date().toISOString()
      };
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rss/regenerate', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to regenerate RSS feed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rss/info'] });
      setFeedUrl(data.feedUrl);
      toast({
        title: "RSS フィード更新完了",
        description: "最新のエピソードでフィードが更新されました"
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "RSS フィードの更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const copyFeedUrl = async () => {
    if (!feedUrl && !feedInfo?.feedUrl) return;
    
    const urlToCopy = feedUrl || feedInfo?.feedUrl || '';
    
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "コピー完了",
        description: "RSS フィード URL がクリップボードにコピーされました"
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました",
        variant: "destructive"
      });
    }
  };

  const openFeedUrl = () => {
    const urlToOpen = feedUrl || feedInfo?.feedUrl;
    if (urlToOpen) {
      window.open(urlToOpen, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-5 w-5" />
          Spotify RSS フィード管理
        </CardTitle>
        <CardDescription>
          Spotify投稿時に自動更新されるRSSフィードの管理
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Rss className="h-4 w-4" />
          <AlertDescription>
            Spotifyトグルが有効な状態でアップロードすると、自動的にこのRSSフィードが更新されます。
            音声ファイルのみがフィードに追加されます。
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="feed-url">RSS フィード URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="feed-url"
                value={feedUrl || feedInfo?.feedUrl || ''}
                placeholder="RSS フィード URL を生成中..."
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyFeedUrl}
                disabled={!feedUrl && !feedInfo?.feedUrl}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openFeedUrl}
                disabled={!feedUrl && !feedInfo?.feedUrl}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">フィード状態</div>
              <div className="flex items-center gap-2">
                <Badge variant={feedInfo?.feedUrl ? "default" : "secondary"}>
                  {feedInfo?.feedUrl ? "利用可能" : "未生成"}
                </Badge>
                {feedInfo?.lastUpdated && (
                  <span className="text-xs text-gray-500">
                    最終更新: {new Date(feedInfo.lastUpdated).toLocaleString('ja-JP')}
                  </span>
                )}
              </div>
            </div>
            
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending || isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              {regenerateMutation.isPending ? '更新中...' : 'フィード更新'}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Spotify RSS フィード連携の仕組み</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Spotifyトグルが有効な状態でアップロードを実行</p>
            <p>• 音声ファイルが正常にSpotifyに投稿された場合</p>
            <p>• 自動的にRSSフィードBに新しいエピソードが追加</p>
            <p>• 処理済みファイル（フレーズ抽出版）が優先的に使用</p>
            <p>• 最新50エピソードまで保持</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">ホスティング設定</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• RSSフィードは自動的にReplit上でホスティング</p>
            <p>• 本番環境ではReplit Deploymentsを推奨</p>
            <p>• 他のサービスに移行する場合は下記URLをコピー</p>
          </div>
          
          {feedInfo?.feedUrl && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-xs break-all">{feedInfo.feedUrl}</code>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}