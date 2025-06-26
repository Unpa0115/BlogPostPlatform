import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Calendar, FileAudio, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RssEpisode {
  id: number;
  title: string;
  description?: string;
  enclosureUrl: string;
  enclosureType?: string;
  enclosureLength?: number;
  pubDate?: string;
  downloadStatus: string;
  localFilePath?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

interface RssEpisodeSelectorProps {
  onEpisodeSelect: (episode: RssEpisode, file: File) => void;
}

export function RssEpisodeSelector({ onEpisodeSelect }: RssEpisodeSelectorProps) {
  const { data: episodes = [], isLoading, refetch } = useQuery<RssEpisode[]>({
    queryKey: ['/api/rss/episodes'],
    refetchInterval: 30000, // Refresh every 30 seconds to show new downloads
  });

  const handleEpisodeSelect = async (episode: RssEpisode) => {
    if (!episode.localFilePath) {
      toast({
        title: "エラー",
        description: "エピソードファイルが見つかりません",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/rss/episodes/${episode.id}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const file = new File([blob], `${episode.title}.mp3`, { 
        type: episode.mimeType || 'audio/mpeg' 
      });

      onEpisodeSelect(episode, file);
      
      toast({
        title: "エピソード選択完了",
        description: `${episode.title} を選択しました`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "エピソードの読み込みに失敗しました",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "不明";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "不明";
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">ダウンロード完了</Badge>;
      case 'downloading':
        return <Badge variant="secondary">ダウンロード中</Badge>;
      case 'pending':
        return <Badge variant="outline">待機中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            RSSエピソード
          </CardTitle>
          <CardDescription>
            Substackフィードからのエピソードを読み込み中...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedEpisodes = episodes.filter(ep => ep.downloadStatus === 'completed');
  const otherEpisodes = episodes.filter(ep => ep.downloadStatus !== 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" />
          RSSエピソード選択
        </CardTitle>
        <CardDescription>
          Substackフィードから自動ダウンロードされたエピソードを選択してアップロード
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {completedEpisodes.length === 0 && otherEpisodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>まだエピソードがダウンロードされていません</p>
                <p className="text-sm">Substackフィードを監視中です...</p>
              </div>
            ) : (
              <>
                {completedEpisodes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-green-700">利用可能なエピソード</h4>
                    <div className="space-y-3">
                      {completedEpisodes.map((episode) => (
                        <div key={episode.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-sm line-clamp-2">{episode.title}</h5>
                            {getStatusBadge(episode.downloadStatus)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(episode.pubDate)}
                            </span>
                            <span>{formatFileSize(episode.fileSize)}</span>
                            {episode.enclosureType && (
                              <span>{episode.enclosureType}</span>
                            )}
                          </div>

                          {episode.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {episode.description}
                            </p>
                          )}

                          <div className="flex justify-between items-center">
                            <a 
                              href={episode.enclosureUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              元のファイル
                            </a>
                            <Button 
                              size="sm" 
                              onClick={() => handleEpisodeSelect(episode)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              選択
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherEpisodes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-gray-600">処理中のエピソード</h4>
                    <div className="space-y-3">
                      {otherEpisodes.map((episode) => (
                        <div key={episode.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-sm line-clamp-2">{episode.title}</h5>
                            {getStatusBadge(episode.downloadStatus)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(episode.pubDate)}
                            </span>
                            {episode.enclosureLength && (
                              <span>{formatFileSize(episode.enclosureLength)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}