import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Upload, Download, AudioLines, Scissors, Volume2, FileAudio } from 'lucide-react';

interface AudioProcessingResult {
  success: boolean;
  title: string;
  inputFile: string;
  timestamp: string;
  steps: {
    silenceRemoval?: {
      success: boolean;
      outputFile?: string;
      thresholdDb?: number;
      error?: string;
    };
    silenceAnalysis?: {
      success: boolean;
      leadingSilenceMs?: number;
      leadingSilenceSeconds?: number;
      totalDurationSeconds?: number;
      error?: string;
    };
    transcription?: {
      success: boolean;
      text?: string;
      language?: string;
      segments?: any[];
      duration?: number;
      error?: string;
    };
    phraseCutting?: Array<{
      phrase: string;
      match: any;
      cutResult: {
        success: boolean;
        outputFile?: string;
        startTime?: number;
        endTime?: number;
        duration?: number;
        error?: string;
      };
    }>;
  };
  summary: {
    totalSteps: number;
    success: boolean;
    outputFiles: string[];
  };
  error?: string;
}

interface AudioCapabilities {
  whisperAvailable: boolean;
  ffmpegAvailable: boolean;
  supportedFormats: string[];
}

export function AudioProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [targetPhrases, setTargetPhrases] = useState('');
  const [removeLeadingSilence, setRemoveLeadingSilence] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState([-50]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const [capabilities, setCapabilities] = useState<AudioCapabilities | null>(null);
  const [progress, setProgress] = useState(0);

  const { toast } = useToast();

  // Load capabilities on component mount
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
    if (!file) {
      toast({
        title: "エラー",
        description: "音声ファイルを選択してください",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || 'Untitled');
      formData.append('targetPhrases', targetPhrases);
      formData.append('removeLeadingSilence', removeLeadingSilence.toString());
      formData.append('silenceThreshold', silenceThreshold[0].toString());

      // Simulate progress for better UX
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
      console.error('Audio processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = (filename: string) => {
    const downloadUrl = `/api/audio/download/${encodeURIComponent(filename)}`;
    window.open(downloadUrl, '_blank');
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="h-5 w-5" />
            音声データ加工
          </CardTitle>
          <CardDescription>
            無音区間の削除と特定フレーズの抽出を行います
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Capabilities Status */}
          {capabilities && (
            <div className="flex flex-wrap gap-2">
              <Badge variant={capabilities.whisperAvailable ? "default" : "secondary"}>
                Whisper: {capabilities.whisperAvailable ? "利用可能" : "利用不可"}
              </Badge>
              <Badge variant={capabilities.ffmpegAvailable ? "default" : "secondary"}>
                FFmpeg: {capabilities.ffmpegAvailable ? "利用可能" : "利用不可"}
              </Badge>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="audio-file">音声ファイル</Label>
            <div className="flex items-center gap-4">
              <Input
                id="audio-file"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {file && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileAudio className="h-3 w-3" />
                  {file.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="処理後のファイル名"
            />
          </div>

          <Separator />

          {/* Silence Removal Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  冒頭の無音区間を削除
                </Label>
                <p className="text-sm text-muted-foreground">
                  ファイル開始時の無音部分を自動的に削除します
                </p>
              </div>
              <Switch
                checked={removeLeadingSilence}
                onCheckedChange={setRemoveLeadingSilence}
              />
            </div>

            {removeLeadingSilence && (
              <div className="space-y-2 pl-6">
                <Label>無音判定の閾値: {silenceThreshold[0]}dB</Label>
                <Slider
                  value={silenceThreshold}
                  onValueChange={setSilenceThreshold}
                  min={-70}
                  max={-20}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  より低い値にするとより厳格に無音を判定します
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Phrase Cutting Options */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="phrases" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                抽出するフレーズ
              </Label>
              <p className="text-sm text-muted-foreground">
                特定のフレーズの前後を抽出します（カンマ区切りで複数指定可能）
              </p>
            </div>
            <Input
              id="phrases"
              value={targetPhrases}
              onChange={(e) => setTargetPhrases(e.target.value)}
              placeholder="例: こんにちは, ありがとう, さようなら"
            />
          </div>

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
              <p className="text-sm text-center text-muted-foreground">
                音声処理中... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              処理結果
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "成功" : "失敗"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">処理ステップ数</p>
                <p className="text-2xl font-bold">{result.summary.totalSteps}</p>
              </div>
              <div>
                <p className="text-sm font-medium">出力ファイル数</p>
                <p className="text-2xl font-bold">{result.summary.outputFiles.length}</p>
              </div>
            </div>

            {/* Processing Steps */}
            {Object.entries(result.steps).map(([stepName, stepData]) => (
              <div key={stepName} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 capitalize">{stepName}</h4>
                {stepName === 'silenceRemoval' && stepData.success && (
                  <div className="space-y-1">
                    <p className="text-sm">閾値: {stepData.thresholdDb}dB</p>
                    {stepData.outputFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(getFileName(stepData.outputFile!))}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        無音削除版をダウンロード
                      </Button>
                    )}
                  </div>
                )}
                {stepName === 'silenceAnalysis' && stepData.success && (
                  <div className="text-sm space-y-1">
                    <p>冒頭の無音: {stepData.leadingSilenceSeconds?.toFixed(2)}秒</p>
                    <p>総再生時間: {stepData.totalDurationSeconds?.toFixed(2)}秒</p>
                  </div>
                )}
                {stepName === 'transcription' && stepData.success && (
                  <div className="space-y-2">
                    <p className="text-sm">認識言語: {stepData.language}</p>
                    <p className="text-sm">再生時間: {stepData.duration?.toFixed(2)}秒</p>
                    {stepData.text && (
                      <div className="bg-muted p-2 rounded text-sm">
                        {stepData.text.substring(0, 200)}
                        {stepData.text.length > 200 && '...'}
                      </div>
                    )}
                  </div>
                )}
                {stepName === 'phraseCutting' && Array.isArray(stepData) && (
                  <div className="space-y-2">
                    {stepData.map((phrase, index) => (
                      <div key={index} className="border rounded p-2">
                        <p className="text-sm font-medium">フレーズ: {phrase.phrase}</p>
                        <p className="text-xs text-muted-foreground">
                          信頼度: {(phrase.match.confidence * 100).toFixed(1)}%
                        </p>
                        {phrase.cutResult.success && phrase.cutResult.outputFile && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => downloadFile(getFileName(phrase.cutResult.outputFile!))}
                          >
                            <Download className="mr-2 h-3 w-3" />
                            フレーズをダウンロード
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Download All */}
            {result.summary.outputFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.summary.outputFiles.map((file, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(getFileName(file))}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    {getFileName(file)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}