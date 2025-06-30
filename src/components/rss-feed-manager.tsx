"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Archive, RefreshCw, BarChart3, Clock, Calendar, Rss } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RssFeedStats {
  totalEpisodes: number;
  activeEpisodes: number;
  archivedEpisodes: number;
  oldestActiveEpisode: Date | null;
  newestActiveEpisode: Date | null;
}

interface ArchivedEpisode {
  id: number;
  title: string;
  description?: string | null;
  pubDate: Date;
  guid: string;
}

export function RssFeedManager() {
  const [stats, setStats] = useState<RssFeedStats | null>(null);
  const [archivedEpisodes, setArchivedEpisodes] = useState<ArchivedEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [rssUrl, setRssUrl] = useState<string>("");
  const [rssEpisodes, setRssEpisodes] = useState<any[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [selectedRssEpisode, setSelectedRssEpisode] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedStats();
    loadArchivedEpisodes();
  }, []);

  const loadFeedStats = async () => {
    try {
      const response = await fetch('/api/rss/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load feed stats:', error);
    }
  };

  const loadArchivedEpisodes = async () => {
    try {
      const response = await fetch('/api/rss/archive');
      if (response.ok) {
        const data = await response.json();
        setArchivedEpisodes(data.data);
      }
    } catch (error) {
      console.error('Failed to load archived episodes:', error);
    }
  };

  const restoreEpisode = async (episodeId: number) => {
    setRestoring(episodeId);
    try {
      const response = await fetch('/api/rss/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ episodeId }),
      });

      if (response.ok) {
        toast({
          title: "復元完了",
          description: "エピソードがアーカイブから復元されました。",
        });
        // 統計情報とアーカイブ一覧を再読み込み
        await loadFeedStats();
        await loadArchivedEpisodes();
      } else {
        const error = await response.json();
        toast({
          title: "復元失敗",
          description: error.error || "エピソードの復元に失敗しました。",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "エピソードの復元中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadFeedStats(), loadArchivedEpisodes()]);
      toast({
        title: "更新完了",
        description: "RSS Feed情報を更新しました。",
      });
    } catch (error) {
      toast({
        title: "更新失敗",
        description: "データの更新に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'なし';
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUsagePercentage = () => {
    if (!stats) return 0;
    return (stats.activeEpisodes / 50) * 100;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  // RSSエピソード取得
  const fetchRssEpisodes = async (url: string) => {
    setRssLoading(true);
    setRssError(null);
    try {
      const res = await fetch(`/api/rss/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("RSS取得失敗");
      const data = await res.json();
      setRssEpisodes(data.episodes || []);
    } catch (e: any) {
      setRssError(e.message || "RSS取得エラー");
      setRssEpisodes([]);
    } finally {
      setRssLoading(false);
    }
  };

  // RSS URL保存
  const handleSaveRssUrl = () => {
    localStorage.setItem("input_rss_url", rssUrl);
    fetchRssEpisodes(rssUrl);
    toast({ title: "RSS URLを保存", description: "エピソードを取得しました。" });
  };

  // RSSエピソード配信
  const handleRssDistribute = async () => {
    if (!selectedRssEpisode) return;
    try {
      // TODO: 実際の配信API呼び出し実装
      toast({ title: '配信リクエスト送信', description: 'RSSエピソードの配信処理を開始しました。' });
    } catch (e) {
      toast({ title: '配信エラー', description: '配信に失敗しました。', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 統計情報カード */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                RSS Feed統計
              </CardTitle>
              <CardDescription>
                Spotify RSS Feedの現在の状況と制限管理
              </CardDescription>
            </div>
            <Button
              onClick={refreshData}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats ? (
            <>
              {/* 使用量プログレスバー */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>アクティブエピソード</span>
                  <span className={getUsageColor(getUsagePercentage())}>
                    {stats.activeEpisodes} / 50
                  </span>
                </div>
                <Progress value={getUsagePercentage()} className="h-2" />
                <p className="text-xs text-gray-500">
                  Spotify制限: 最大50エピソード
                </p>
              </div>

              {/* 統計情報グリッド */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalEpisodes}
                  </div>
                  <div className="text-sm text-gray-600">総エピソード数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.activeEpisodes}
                  </div>
                  <div className="text-sm text-gray-600">アクティブ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.archivedEpisodes}
                  </div>
                  <div className="text-sm text-gray-600">アーカイブ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(getUsagePercentage())}%
                  </div>
                  <div className="text-sm text-gray-600">使用率</div>
                </div>
              </div>

              {/* 日付情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">最新エピソード</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(stats.newestActiveEpisode)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">最古エピソード</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(stats.oldestActiveEpisode)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              統計情報を読み込み中...
            </div>
          )}
        </CardContent>
      </Card>

      {/* アーカイブエピソード一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            アーカイブされたエピソード
          </CardTitle>
          <CardDescription>
            50件制限によりアーカイブされたエピソード一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archivedEpisodes.length > 0 ? (
            <div className="space-y-3">
              {archivedEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{episode.title}</h4>
                      <Badge variant="secondary">アーカイブ</Badge>
                    </div>
                    {episode.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {episode.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(episode.pubDate)}
                    </p>
                  </div>
                  <Button
                    onClick={() => restoreEpisode(episode.id)}
                    disabled={restoring === episode.id}
                    variant="outline"
                    size="sm"
                  >
                    {restoring === episode.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      '復元'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              アーカイブされたエピソードはありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSS Feed管理・配信カード */}
      <Card>
        <CardHeader>
          <CardTitle>RSS Feed管理・配信</CardTitle>
          <CardDescription>RSS Feedのエピソードを取得し、配信できます</CardDescription>
        </CardHeader>
        <CardContent>
          {!rssUrl ? (
            <div className="flex flex-col items-center gap-4">
              <Label htmlFor="rss-url">RSS FeedのURLを入力</Label>
              <Input id="rss-url" value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="https://..." className="w-full max-w-lg" />
              <Button onClick={handleSaveRssUrl} className="w-48">URLを保存</Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-medium">RSS Feed: </span>
                <span className="truncate max-w-xs">{rssUrl}</span>
                <Button size="sm" variant="outline" onClick={() => { setRssUrl(""); setRssEpisodes([]); localStorage.removeItem("input_rss_url"); }}>変更</Button>
              </div>
              <Button onClick={() => fetchRssEpisodes(rssUrl)} size="sm" variant="outline" className="mb-4">エピソード再取得</Button>
              {rssLoading ? (
                <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : rssError ? (
                <div className="text-center py-8 text-red-500">{rssError}</div>
              ) : rssEpisodes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">エピソードが見つかりません</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rssEpisodes.map(ep => (
                    <div
                      key={ep.id || ep.guid || ep.title}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedRssEpisode && (selectedRssEpisode.id === ep.id || selectedRssEpisode.guid === ep.guid) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => setSelectedRssEpisode(ep)}
                    >
                      <div className="flex items-center gap-3">
                        <Rss className="h-5 w-5 text-orange-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{ep.title}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <span>{ep.pubDate ? new Date(ep.pubDate).toLocaleDateString('ja-JP') : ''}</span>
                            {ep.duration && <span>• {ep.duration}秒</span>}
                          </div>
                        </div>
                        <Badge variant={selectedRssEpisode && (selectedRssEpisode.id === ep.id || selectedRssEpisode.guid === ep.guid) ? "default" : "secondary"}>
                          {selectedRssEpisode && (selectedRssEpisode.id === ep.id || selectedRssEpisode.guid === ep.guid) ? "選択中" : "未選択"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedRssEpisode && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <Button onClick={handleRssDistribute} className="w-48">配信する</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 