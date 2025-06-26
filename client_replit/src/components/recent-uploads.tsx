import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, RotateCcw, Trash2, FileVideo, FileAudio, StopCircle, ExternalLink } from "lucide-react";
import { FaYoutube, FaSpotify } from "react-icons/fa";
import { Mic } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Upload } from "@shared/schema";

export function RecentUploads() {
  const { data: uploads, isLoading } = useQuery<Upload[]>({
    queryKey: ['/api/uploads/recent'],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/uploads/${id}/retry`),
    onSuccess: () => {
      toast({
        title: "再試行開始",
        description: "投稿の再試行を開始しました。",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "再試行に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/uploads/${id}`),
    onSuccess: () => {
      toast({
        title: "削除完了",
        description: "アップロードを削除しました。",
      });
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/uploads/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast({
        title: "エラー",
        description: "削除に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getYouTubeVideoUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

  const UploadDetailsDialog = ({ upload }: { upload: Upload }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{upload.title || upload.originalName}</DialogTitle>
          <DialogDescription>アップロード詳細情報</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">ファイル名</label>
              <p className="text-sm text-gray-600">{upload.originalName}</p>
            </div>
            <div>
              <label className="text-sm font-medium">ファイルサイズ</label>
              <p className="text-sm text-gray-600">{formatFileSize(upload.fileSize)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">ファイル形式</label>
              <p className="text-sm text-gray-600">{upload.mimeType}</p>
            </div>
            <div>
              <label className="text-sm font-medium">アップロード日時</label>
              <p className="text-sm text-gray-600">{formatDate(typeof upload.createdAt === 'string' ? upload.createdAt : upload.createdAt.toISOString())}</p>
            </div>
          </div>
          
          {upload.description && (
            <div>
              <label className="text-sm font-medium">説明</label>
              <p className="text-sm text-gray-600">{upload.description}</p>
            </div>
          )}
          
          {upload.tags && upload.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium">タグ</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {upload.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">プラットフォーム状況</label>
            <div className="space-y-2 mt-2">
              {/* YouTube Status */}
              {upload.platforms?.youtube && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-2">
                    <FaYoutube className="text-red-600" />
                    <span>YouTube</span>
                    {getStatusBadge(upload.platforms.youtube.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {upload.platforms?.youtube?.videoId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getYouTubeVideoUrl(upload.platforms!.youtube!.videoId!), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        動画を見る
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Spotify Status */}
              {upload.platforms?.spotify && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-2">
                    <FaSpotify className="text-green-600" />
                    <span>Spotify</span>
                    {getStatusBadge(upload.platforms.spotify.status)}
                  </div>
                </div>
              )}
              
              {/* Voicy Status */}
              {upload.platforms?.voicy && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-2">
                    <Mic className="text-orange-600" />
                    <span>Voicy</span>
                    {getStatusBadge(upload.platforms.voicy.status)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Details */}
          {upload.platforms && Object.values(upload.platforms).some((p: any) => p?.error) && (
            <div>
              <label className="text-sm font-medium text-red-600">エラー詳細</label>
              <div className="space-y-1 mt-1">
                {Object.entries(upload.platforms).map(([platform, config]: [string, any]) => 
                  config?.error && (
                    <div key={platform} className="text-sm text-red-600">
                      <strong>{platform}:</strong> {config.error}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">処理中</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">エラー</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">待機中</Badge>;
    }
  };

  const getPlatformBadges = (platforms: any) => {
    const badges = [];
    if (platforms?.youtube?.enabled) {
      badges.push(
        <Badge key="youtube" variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <FaYoutube className="mr-1 h-3 w-3" />
          YouTube
        </Badge>
      );
    }
    if (platforms?.spotify?.enabled) {
      badges.push(
        <Badge key="spotify" variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <FaSpotify className="mr-1 h-3 w-3" />
          Spotify
        </Badge>
      );
    }
    if (platforms?.voicy?.enabled) {
      badges.push(
        <Badge key="voicy" variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Mic className="mr-1 h-3 w-3" />
          Voicy
        </Badge>
      );
    }
    return badges;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) {
      return <FileVideo className="text-blue-600 mr-3 h-5 w-5" />;
    }
    return <FileAudio className="text-blue-600 mr-3 h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>最近のアップロード</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>最近のアップロード</CardTitle>
            <CardDescription>最近アップロードされたファイルの一覧</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            すべて表示
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!uploads || uploads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            アップロードされたファイルがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">ファイル</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">ステータス</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">プラットフォーム</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">アップロード日時</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {getFileIcon(upload.mimeType)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{upload.title || upload.originalName}</div>
                          <div className="text-sm text-gray-500">{upload.originalName} • {formatFileSize(upload.fileSize)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(upload.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {getPlatformBadges(upload.platforms)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatDate(typeof upload.createdAt === 'string' ? upload.createdAt : upload.createdAt.toISOString())}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <UploadDetailsDialog upload={upload} />
                        {upload.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => retryMutation.mutate(upload.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {upload.status === 'processing' && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>アップロードを削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{upload.title || upload.originalName}」を削除します。この操作は取り消せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(upload.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                削除する
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
