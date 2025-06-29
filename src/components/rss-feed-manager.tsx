"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Archive, RefreshCw, BarChart3, Clock, Calendar } from 'lucide-react';

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
    </div>
  );
} 