import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformToggle } from "@/components/ui/platform-toggle";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FaYoutube, FaSpotify } from "react-icons/fa";
import { Mic, Scissors, Volume2, FileAudio, AudioLines, Download } from "lucide-react";

// Voicy status component that properly uses hooks
const VoicyStatusComponent = () => {
  const { data: voicyStatus } = useQuery<any>({
    queryKey: ['/api/voicy/test'],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  if (voicyStatus?.success) {
    return (
      <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
        認証情報は正常に設定されています
      </div>
    );
  }

  return (
    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
      Voicyの認証情報を設定してください
    </div>
  );
};

interface MetadataFormProps {
  selectedFile: File | null;
  onUploadComplete: () => void;
}

export function MetadataForm({ selectedFile, onUploadComplete }: MetadataFormProps) {
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    tags: "",
    category: "",
  });

  const [platforms, setPlatforms] = useState({
    youtube: { enabled: true, visibility: "public", status: "connected" as const },
    spotify: { enabled: true, episodeNumber: "", status: "connected" as const },
    voicy: { enabled: true, status: "connected" as const },
  });

  // Audio processing states
  const [audioProcessing, setAudioProcessing] = useState({
    enabled: false,
    targetPhrase: "",
    removeLeadingSilence: true,
    silenceThreshold: [-50],
    outputFormat: "preserve", // "preserve", "audio", "video"
    processing: false,
    progress: 0,
    result: null as any,
    selectedOutput: null as string | null // Which processed file to use for upload
  });

  // Scheduled posting states
  const [scheduledPosting, setScheduledPosting] = useState({
    enabled: false,
    date: "",
    time: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current file extension
  const currentFileExtension = selectedFile?.name.split('.').pop()?.toLowerCase();

  // Audio file extensions that should disable YouTube
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'];
  
  // Platform-specific supported extensions
  const platformExtensions = {
    youtube: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    spotify: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'mp4', 'avi', 'mov', 'wmv'],
    voicy: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma']
  };
  
  // Get warning messages for unsupported extensions
  const getWarningMessage = (platform: string, fileExtension: string | undefined) => {
    if (!fileExtension) return undefined;
    
    const supportedExts = platformExtensions[platform as keyof typeof platformExtensions];
    if (supportedExts && !supportedExts.includes(fileExtension)) {
      return `"${fileExtension}"の拡張子は、こちらのプラットフォームでは対象外です`;
    }
    return undefined;
  };

  // Check if file is audio and auto-disable YouTube
  useEffect(() => {
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      const isAudioFile = audioExtensions.includes(fileExtension || '');
      
      if (isAudioFile && platforms.youtube.enabled) {
        // Auto-disable YouTube
        setPlatforms(prev => ({
          ...prev,
          youtube: { ...prev.youtube, enabled: false }
        }));
      } else if (!isAudioFile && !platforms.youtube.enabled) {
        // Re-enable YouTube for video files
        setPlatforms(prev => ({
          ...prev,
          youtube: { ...prev.youtube, enabled: true }
        }));
      }
    }
  }, [selectedFile]);

  // Check if any platform is enabled
  const hasEnabledPlatform = platforms.youtube.enabled || platforms.spotify.enabled || platforms.voicy.enabled;

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: any }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('metadata', JSON.stringify(data.metadata));

      const response = await apiRequest('POST', '/api/uploads', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "アップロード完了",
        description: "ファイルのアップロードが完了しました。投稿処理を開始します。",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      onUploadComplete();
      setMetadata({ title: "", description: "", tags: "", category: "" });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "アップロードに失敗しました。",
        variant: "destructive",
      });
    },
  });

  // Audio processing function
  const processAudio = async () => {
    if (!selectedFile) return;

    setAudioProcessing(prev => ({ ...prev, processing: true, progress: 0, result: null }));

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', metadata.title || selectedFile.name);
      formData.append('targetPhrases', audioProcessing.targetPhrase);
      formData.append('removeLeadingSilence', audioProcessing.removeLeadingSilence.toString());
      formData.append('silenceThreshold', audioProcessing.silenceThreshold[0].toString());
      formData.append('outputFormat', audioProcessing.outputFormat);

      const progressInterval = setInterval(() => {
        setAudioProcessing(prev => ({ ...prev, progress: Math.min(prev.progress + 10, 90) }));
      }, 1000);

      const response = await fetch('/api/audio/process', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      clearInterval(progressInterval);
      setAudioProcessing(prev => ({ ...prev, progress: 100, result, processing: false }));

      if (result.success) {
        const outputCount = result.summary?.outputFiles?.length || result.summary?.output_files?.length || 0;
        
        // Auto-select the best output file (phrase cut > silence removal)
        // Check both camelCase and snake_case for compatibility
        const outputFiles = result.summary?.outputFiles || result.summary?.output_files || [];
        if (outputFiles.length > 0) {
          const phraseFile = outputFiles.find((f: string) => f.includes('_from_phrase'));
          const silenceFile = outputFiles.find((f: string) => f.includes('_no_silence'));
          const preferredFile = phraseFile || silenceFile || outputFiles[0];
          
          setAudioProcessing(prev => ({ 
            ...prev, 
            selectedOutput: preferredFile 
          }));
        }
        
        toast({
          title: "処理完了",
          description: `音声処理が完了しました。${outputCount}個のファイルが作成されました。`
        });
      } else {
        toast({
          title: "処理エラー",
          description: result.error || "音声処理に失敗しました",
          variant: "destructive"
        });
      }
    } catch (error) {
      setAudioProcessing(prev => ({ ...prev, processing: false }));
      toast({
        title: "エラー",
        description: "音声処理中にエラーが発生しました",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const filename = filePath.split('/').pop() || 'processed_audio.wav';
      const response = await fetch(`/api/audio/download/${filename}`);
      
      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "ダウンロード完了",
        description: `${filename} をダウンロードしました`
      });
    } catch (error) {
      toast({
        title: "ダウンロードエラー",
        description: "ファイルのダウンロードに失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください。",
        variant: "destructive",
      });
      return;
    }

    if (!metadata.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive",
      });
      return;
    }

    // Determine which file to upload
    let fileToUpload = selectedFile;
    
    // If audio processing is enabled and a processed file is selected, use that instead
    if (audioProcessing.enabled && audioProcessing.selectedOutput) {
      try {
        const filename = audioProcessing.selectedOutput.split('/').pop();
        const response = await fetch(`/api/audio/download/${filename}`);
        if (response.ok) {
          const blob = await response.blob();
          fileToUpload = new File([blob], filename || 'processed_file', { type: blob.type });
        }
      } catch (error) {
        toast({
          title: "エラー",
          description: "処理済みファイルの取得に失敗しました。元のファイルを使用します。",
          variant: "destructive"
        });
      }
    }

    const uploadData = {
      ...metadata,
      tags: metadata.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      platforms: Object.fromEntries(
        Object.entries(platforms).map(([key, value]) => [
          key,
          { ...value, status: "pending" }
        ])
      ),
      processedFile: audioProcessing.enabled && audioProcessing.selectedOutput ? audioProcessing.selectedOutput : null,
    };

    uploadMutation.mutate({ file: fileToUpload, metadata: uploadData });
  };

  const updatePlatform = (platform: keyof typeof platforms, updates: Partial<typeof platforms[keyof typeof platforms]>) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>メタデータ設定</CardTitle>
        <CardDescription>
          投稿に使用する情報を入力してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              placeholder="投稿のタイトルを入力"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              placeholder="投稿の説明を入力"
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="tags">タグ</Label>
            <Input
              id="tags"
              value={metadata.tags}
              onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="タグをカンマ区切りで入力"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="category">カテゴリ</Label>
            <Select value={metadata.category} onValueChange={(value) => setMetadata(prev => ({ ...prev, category: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="music">音楽</SelectItem>
                <SelectItem value="education">教育</SelectItem>
                <SelectItem value="entertainment">エンターテイメント</SelectItem>
                <SelectItem value="news">ニュース</SelectItem>
                <SelectItem value="technology">技術</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audio Processing Section - Hidden, moved to upload form */}
        {false && selectedFile && (
          <div className="space-y-4">
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-processing"
                checked={audioProcessing.enabled}
                onCheckedChange={(checked) => setAudioProcessing(prev => ({ ...prev, enabled: checked as boolean }))}
              />
              <Label htmlFor="enable-processing" className="text-sm font-medium">
                音声・動画データ加工を有効にする
              </Label>
            </div>

            {audioProcessing.enabled && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AudioLines className="h-4 w-4" />
                    データ加工設定
                  </CardTitle>
                  <CardDescription className="text-sm">
                    無音区間削除と、フレーズを起点とした後半部分の抽出
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target Phrase */}
                  <div className="space-y-2">
                    <Label htmlFor="target-phrase">起点フレーズ (オプション)</Label>
                    <Input
                      id="target-phrase"
                      value={audioProcessing.targetPhrase}
                      onChange={(e) => setAudioProcessing(prev => ({ ...prev, targetPhrase: e.target.value }))}
                      placeholder="例: こんにちは"
                      disabled={audioProcessing.processing}
                    />
                    <p className="text-xs text-gray-600">
                      指定したフレーズから終端までを抽出します
                    </p>
                  </div>

                  {/* Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-silence"
                        checked={audioProcessing.removeLeadingSilence}
                        onCheckedChange={(checked) => setAudioProcessing(prev => ({ ...prev, removeLeadingSilence: checked as boolean }))}
                        disabled={audioProcessing.processing}
                      />
                      <Label htmlFor="remove-silence" className="text-sm">無音区間を削除</Label>
                    </div>

                    {audioProcessing.removeLeadingSilence && (
                      <div className="space-y-2 ml-6">
                        <Label className="text-xs">無音判定閾値: {audioProcessing.silenceThreshold[0]}dB</Label>
                        <Slider
                          value={audioProcessing.silenceThreshold}
                          onValueChange={(value) => setAudioProcessing(prev => ({ ...prev, silenceThreshold: value }))}
                          min={-60}
                          max={-20}
                          step={5}
                          className="w-full"
                          disabled={audioProcessing.processing}
                        />
                      </div>
                    )}

                    {/* Output Format Selection */}
                    {selectedFile && selectedFile.name.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i) && (
                      <div className="space-y-2">
                        <Label className="text-sm">動画ファイルの出力形式</Label>
                        <RadioGroup
                          value={audioProcessing.outputFormat}
                          onValueChange={(value) => setAudioProcessing(prev => ({ ...prev, outputFormat: value }))}
                          disabled={audioProcessing.processing}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="audio" id="audio" />
                            <Label htmlFor="audio" className="text-sm">音声のみ抽出（WAV）</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="video" id="video" />
                            <Label htmlFor="video" className="text-sm">動画として出力（MP4）</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="preserve" id="preserve" />
                            <Label htmlFor="preserve" className="text-sm">元の動画形式を保持</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>

                  {/* Process Button */}
                  <Button
                    onClick={processAudio}
                    disabled={audioProcessing.processing}
                    className="w-full"
                    size="sm"
                  >
                    {audioProcessing.processing ? (
                      <>
                        <AudioLines className="mr-2 h-4 w-4 animate-pulse" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <Scissors className="mr-2 h-4 w-4" />
                        動画・音声を処理
                      </>
                    )}
                  </Button>

                  {/* Progress */}
                  {audioProcessing.processing && (
                    <div className="space-y-2">
                      <Progress value={audioProcessing.progress} className="w-full" />
                      <p className="text-xs text-center text-gray-600">
                        処理中... {audioProcessing.progress}%
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {audioProcessing.result && audioProcessing.result.success && (
                    <div className="space-y-3 p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">処理完了</span>
                      </div>
                      
                      <div className="space-y-2">
                        {(audioProcessing.result.summary?.outputFiles || []).map((file: string, index: number) => {
                          const isSelected = audioProcessing.selectedOutput === file;
                          const isOriginal = file.includes('_no_silence');
                          const isPhrase = file.includes('_from_phrase');
                          
                          return (
                            <div key={index} className={`flex items-center justify-between p-2 border rounded ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                              <div className="flex items-center space-x-2">
                                <Badge variant={isOriginal ? "secondary" : "default"} className="text-xs">
                                  {isOriginal ? '無音削除版' : isPhrase ? 'フレーズ抽出版' : '加工版'}
                                </Badge>
                                <span className="text-xs font-mono">{file.split('/').pop()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={() => setAudioProcessing(prev => ({ ...prev, selectedOutput: file }))}
                                  className="text-xs px-2 py-1"
                                >
                                  {isSelected ? '使用中' : '使用'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownload(file)}
                                  className="text-xs px-2 py-1"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {audioProcessing.selectedOutput && (
                        <div className="p-2 bg-blue-100 rounded text-xs text-blue-800">
                          <strong>選択中:</strong> このファイルがプラットフォームへのアップロードに使用されます
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">プラットフォーム別設定</h3>

          <PlatformToggle
            platform={{
              name: "YouTube",
              icon: <FaYoutube className="text-red-600" />,
              enabled: platforms.youtube.enabled,
              status: platforms.youtube.status,
            }}
            onToggle={(enabled) => updatePlatform('youtube', { enabled })}
            warningMessage={getWarningMessage('youtube', currentFileExtension)}
          >
            <RadioGroup
              value={platforms.youtube.visibility}
              onValueChange={(value) => updatePlatform('youtube', { visibility: value })}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="text-sm">公開</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unlisted" id="unlisted" />
                <Label htmlFor="unlisted" className="text-sm">限定公開</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="text-sm">非公開</Label>
              </div>
            </RadioGroup>
          </PlatformToggle>

          <PlatformToggle
            platform={{
              name: "Spotify",
              icon: <FaSpotify className="text-green-600" />,
              enabled: platforms.spotify.enabled,
              status: platforms.spotify.status,
            }}
            onToggle={(enabled) => updatePlatform('spotify', { enabled })}
            warningMessage={getWarningMessage('spotify', currentFileExtension)}
          >
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              音声・動画ファイル対応。ポッドキャスト配信用のRSSフィード経由でアップロード
            </div>
            <Input
              value={platforms.spotify.episodeNumber}
              onChange={(e) => updatePlatform('spotify', { episodeNumber: e.target.value })}
              placeholder="エピソード番号 (任意)"
              className="text-sm"
            />
          </PlatformToggle>

          <PlatformToggle
            platform={{
              name: "Voicy",
              icon: <Mic className="text-orange-600" />,
              enabled: platforms.voicy.enabled,
              status: platforms.voicy.status,
            }}
            onToggle={(enabled) => updatePlatform('voicy', { enabled })}
            warningMessage={getWarningMessage('voicy', currentFileExtension)}
          >
            <VoicyStatusComponent />
          </PlatformToggle>
        </div>

        {/* Audio Processing Section */}
        {selectedFile && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <AudioLines className="h-4 w-4" />
              <h3 className="font-medium">音声・動画データ加工</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="audio-processing" 
                  checked={audioProcessing.enabled}
                  onCheckedChange={(checked) => 
                    setAudioProcessing(prev => ({ ...prev, enabled: !!checked }))
                  }
                />
                <Label htmlFor="audio-processing">音声・動画データ加工を有効にする</Label>
              </div>
              
              {audioProcessing.enabled && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      選択されたファイル: {selectedFile.name}
                    </div>
                    <div className="text-xs text-blue-600">
                      加工オプションを設定してください
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remove-silence" 
                        checked={audioProcessing.removeLeadingSilence}
                        onCheckedChange={(checked) => 
                          setAudioProcessing(prev => ({ ...prev, removeLeadingSilence: !!checked }))
                        }
                      />
                      <Label htmlFor="remove-silence">無音部分の削除</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="target-phrase">抽出するフレーズ（任意）</Label>
                      <Input
                        id="target-phrase"
                        value={audioProcessing.targetPhrase}
                        onChange={(e) => 
                          setAudioProcessing(prev => ({ ...prev, targetPhrase: e.target.value }))
                        }
                        placeholder="特定のフレーズから最後まで抽出"
                      />
                    </div>
                    
                    <div>
                      <Label>出力形式</Label>
                      <RadioGroup
                        value={audioProcessing.outputFormat}
                        onValueChange={(value) => 
                          setAudioProcessing(prev => ({ ...prev, outputFormat: value }))
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="preserve" id="preserve" />
                          <Label htmlFor="preserve">元の形式を保持</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="audio" id="audio" />
                          <Label htmlFor="audio">音声のみ</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="video" id="video" />
                          <Label htmlFor="video">動画形式</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scheduled Posting Section */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <h3 className="font-medium">予約投稿</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="scheduled-posting" 
                checked={scheduledPosting.enabled}
                onCheckedChange={(checked) => 
                  setScheduledPosting(prev => ({ ...prev, enabled: !!checked }))
                }
              />
              <Label htmlFor="scheduled-posting">予約投稿を有効にする</Label>
            </div>
            
            {scheduledPosting.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled-date">投稿日</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={scheduledPosting.date}
                    onChange={(e) => 
                      setScheduledPosting(prev => ({ ...prev, date: e.target.value }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled-time">投稿時間</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledPosting.time}
                    onChange={(e) => 
                      setScheduledPosting(prev => ({ ...prev, time: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={uploadMutation.isPending || !selectedFile || !hasEnabledPlatform}
          className="w-full"
        >
          {uploadMutation.isPending ? "投稿中..." : 
           !hasEnabledPlatform ? "プラットフォームを選択してください" : 
           scheduledPosting.enabled ? "予約投稿を設定" : "投稿を開始"}
        </Button>
      </CardContent>
    </Card>
  );
}