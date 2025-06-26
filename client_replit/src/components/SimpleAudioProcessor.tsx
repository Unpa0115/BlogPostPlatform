import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AudioLines, Scissors, Volume2, FileAudio } from 'lucide-react';

interface AudioCapabilities {
  whisperAvailable: boolean;
  ffmpegAvailable: boolean;
  supportedFormats: string[];
}

interface AudioProcessingResult {
  success: boolean;
  title: string;
  inputFile: string;
  timestamp: string;
  steps: {
    silenceRemoval?: any;
    silenceAnalysis?: any;
    transcription?: any;
    phraseCutting?: any[];
  };
  summary: {
    totalSteps: number;
    success: boolean;
    outputFiles: string[];
  };
  error?: string;
}

export function SimpleAudioProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [targetPhrases, setTargetPhrases] = useState('');
  const [removeLeadingSilence, setRemoveLeadingSilence] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState([-50]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const [capabilities, setCapabilities] = useState<AudioCapabilities | null>(null);

  const { toast } = useToast();



  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const response = await fetch('/api/audio/capabilities');
        const caps = await response.json();
        setCapabilities(caps);
      } catch (error) {
        console.error('Failed to load audio capabilities:', error);
      }
    };
    loadCapabilities();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const processAudio = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('targetPhrases', targetPhrases);
      formData.append('removeLeadingSilence', removeLeadingSilence.toString());
      formData.append('silenceThreshold', silenceThreshold[0].toString());

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      const response = await fetch('/api/audio/process', {
        method: 'POST',
        body: formData
      });
      const processingResult = await response.json();

      clearInterval(progressInterval);
      setProgress(100);
      setResult(processingResult);

      if (processingResult.success) {
        toast({
          title: "処理完了",
          description: `音声処理が完了しました。${processingResult.summary.outputFiles.length}個のファイルが作成されました。`
        });
      } else {
        toast({
          title: "処理エラー",
          description: processingResult.error || "音声処理に失敗しました",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "音声処理中にエラーが発生しました",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="h-5 w-5" />
            音声・動画データ加工
          </CardTitle>
          <CardDescription>
            無音区間の削除と、フレーズを起点とした後半部分の抽出を行います（元の形式を保持）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Capabilities */}
          {capabilities && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">システム機能</Label>
              <div className="flex gap-2">
                <Badge variant={capabilities.whisperAvailable ? "default" : "secondary"}>
                  Whisper AI: {capabilities.whisperAvailable ? '利用可能' : '利用不可'}
                </Badge>
                <Badge variant={capabilities.ffmpegAvailable ? "default" : "secondary"}>
                  FFmpeg: {capabilities.ffmpegAvailable ? '利用可能' : '利用不可'}
                </Badge>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">音声ファイル</Label>
            <Input
              id="file-upload"
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              disabled={processing}
            />
            {file && (
              <p className="text-sm text-gray-600">
                選択済み: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="処理後のファイル名"
              disabled={processing}
            />
          </div>

          {/* Target Phrases */}
          <div className="space-y-2">
            <Label htmlFor="phrases">起点フレーズ (オプション)</Label>
            <Input
              id="phrases"
              value={targetPhrases}
              onChange={(e) => setTargetPhrases(e.target.value)}
              placeholder="例: こんにちは,ありがとう"
              disabled={processing}
            />
            <p className="text-xs text-gray-500">
              カンマ区切りで複数指定可能。指定したフレーズから終端までを抽出します。
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remove-silence"
                checked={removeLeadingSilence}
                onCheckedChange={(checked) => setRemoveLeadingSilence(checked as boolean)}
                disabled={processing}
              />
              <Label htmlFor="remove-silence">先頭の無音区間を削除</Label>
            </div>

            <div className="space-y-2">
              <Label>無音判定閾値: {silenceThreshold[0]} dB</Label>
              <Slider
                value={silenceThreshold}
                onValueChange={setSilenceThreshold}
                max={-10}
                min={-60}
                step={5}
                disabled={processing}
                className="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Process Button */}
          <Button
            onClick={processAudio}
            disabled={!file || processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <AudioLines className="mr-2 h-4 w-4 animate-pulse" />
                処理中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                音声を処理
              </>
            )}
          </Button>

          {/* Progress */}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-gray-600">
                処理中... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              処理結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">ステータス</Label>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? '成功' : '失敗'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">処理時刻</Label>
                <p className="text-sm">{new Date(result.timestamp).toLocaleString()}</p>
              </div>
            </div>

            {result.success && result.summary.outputFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">ダウンロード</Label>
                <div className="space-y-2">
                  {result.summary.outputFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{file}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}