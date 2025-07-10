# 音声処理機能ガイド

## 概要

BlogPostPlatformでは、OpenAI Whisper APIを活用した高度な音声処理機能を提供します。音声ファイルの前処理、自動トリミング、文字起こし、要約生成まで一連のワークフローを自動化します。

## 音声処理パイプライン

### 1. 音声前処理

#### ファイル形式変換

```typescript
// src/lib/audioUtils.ts
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export class AudioProcessor {
  private ffmpeg: any;

  constructor() {
    this.ffmpeg = createFFmpeg({ log: true });
  }

  async convertAudioFormat(
    inputBuffer: Buffer,
    inputFormat: string,
    outputFormat: 'mp3' | 'wav' | 'm4a'
  ): Promise<Buffer> {
    await this.ffmpeg.load();

    const inputFileName = `input.${inputFormat}`;
    const outputFileName = `output.${outputFormat}`;

    this.ffmpeg.FS('writeFile', inputFileName, inputBuffer);

    await this.ffmpeg.run(
      '-i', inputFileName,
      '-acodec', 'libmp3lame',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',
      outputFileName
    );

    const outputBuffer = this.ffmpeg.FS('readFile', outputFileName);
    
    // 一時ファイルの削除
    this.ffmpeg.FS('unlink', inputFileName);
    this.ffmpeg.FS('unlink', outputFileName);

    return Buffer.from(outputBuffer);
  }
}
```

#### ノイズ除去

```typescript
// src/lib/audioUtils.ts
export async function removeNoise(audioBuffer: Buffer): Promise<Buffer> {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();

  ffmpeg.FS('writeFile', 'input.mp3', audioBuffer);

  // ノイズ除去フィルターの適用
  await ffmpeg.run(
    '-i', 'input.mp3',
    '-af', 'anlmdn=s=7:p=0.002:r=0.01',
    'output.mp3'
  );

  const outputBuffer = ffmpeg.FS('readFile', 'output.mp3');
  
  // クリーンアップ
  ffmpeg.FS('unlink', 'input.mp3');
  ffmpeg.FS('unlink', 'output.mp3');

  return Buffer.from(outputBuffer);
}
```

#### 音量正規化

```typescript
// src/lib/audioUtils.ts
export async function normalizeVolume(audioBuffer: Buffer): Promise<Buffer> {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();

  ffmpeg.FS('writeFile', 'input.mp3', audioBuffer);

  // 音量正規化
  await ffmpeg.run(
    '-i', 'input.mp3',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    'output.mp3'
  );

  const outputBuffer = ffmpeg.FS('readFile', 'output.mp3');
  
  // クリーンアップ
  ffmpeg.FS('unlink', 'input.mp3');
  ffmpeg.FS('unlink', 'output.mp3');

  return Buffer.from(outputBuffer);
}
```

### 2. 自動トリミング機能

#### 無音部分の検出

```typescript
// src/lib/audioUtils.ts
export async function detectSilence(audioBuffer: Buffer): Promise<{
  silenceStart: number;
  silenceEnd: number;
  silenceDuration: number;
}[]> {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();

  ffmpeg.FS('writeFile', 'input.mp3', audioBuffer);

  // 無音検出の実行
  await ffmpeg.run(
    '-i', 'input.mp3',
    '-af', 'silencedetect=noise=-50dB:d=0.5',
    '-f', 'null',
    '-'
  );

  const logs = ffmpeg.FS('readFile', 'log.txt');
  const logText = new TextDecoder().decode(logs);

  // ログから無音期間を解析
  const silenceMatches = logText.match(/silence_start: (\d+\.?\d*)/g);
  const silenceEndMatches = logText.match(/silence_end: (\d+\.?\d*)/g);

  const silences = [];
  for (let i = 0; i < silenceMatches.length; i++) {
    const start = parseFloat(silenceMatches[i].split(': ')[1]);
    const end = parseFloat(silenceEndMatches[i].split(': ')[1]);
    
    silences.push({
      silenceStart: start,
      silenceEnd: end,
      silenceDuration: end - start
    });
  }

  return silences;
}
```

#### キーフレーズ検出によるトリミング

```typescript
// src/lib/audioUtils.ts
export async function trimByKeyPhrases(
  audioBuffer: Buffer,
  transcript: string
): Promise<{
  trimmedBuffer: Buffer;
  startTime: number;
  endTime: number;
}> {
  // Whisper APIでタイムスタンプ付き文字起こしを取得
  const timestampedTranscript = await getTimestampedTranscript(audioBuffer);
  
  // キーフレーズの検出
  const keyPhrases = await detectKeyPhrases(transcript);
  
  // キーフレーズの位置を特定
  const keyPhraseTimestamps = findKeyPhraseTimestamps(
    timestampedTranscript,
    keyPhrases
  );
  
  // 最適なトリミング位置を決定
  const trimPoints = calculateOptimalTrimPoints(keyPhraseTimestamps);
  
  // 音声ファイルをトリミング
  return await trimAudio(audioBuffer, trimPoints.start, trimPoints.end);
}

async function getTimestampedTranscript(audioBuffer: Buffer): Promise<any[]> {
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'multipart/form-data',
    },
    body: createFormData(audioBuffer, {
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    })
  });

  const result = await response.json();
  return result.segments || [];
}

async function detectKeyPhrases(text: string): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: '音声コンテンツから重要なキーフレーズを抽出してください。'
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.3
    })
  });

  const result = await response.json();
  return result.choices[0].message.content.split(',').map(phrase => phrase.trim());
}
```

### 3. 文字起こし機能

#### Whisper API統合

```typescript
// src/lib/whisperClient.ts
export class WhisperClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json';
    } = {}
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
      formData.append('model', 'whisper-1');
      
      if (options.language) {
        formData.append('language', options.language);
      }
      
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      
      if (options.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseTranscriptionResult(result);
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  private parseTranscriptionResult(result: any): TranscriptionResult {
    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments || [],
      words: result.words || []
    };
  }
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
  words: TranscriptionWord[];
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}
```

#### 文字起こしAPIエンドポイント

```typescript
// src/app/api/audio/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WhisperClient } from '@/lib/whisperClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;
    const prompt = formData.get('prompt') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // 音声ファイルをバッファに変換
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Whisper APIで文字起こし
    const whisperClient = new WhisperClient();
    const result = await whisperClient.transcribeAudio(audioBuffer, {
      language,
      prompt,
      responseFormat: 'verbose_json'
    });

    return NextResponse.json({
      success: true,
      transcription: result
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
}
```

### 4. 要約生成機能

#### GPT-4o-mini統合

```typescript
// src/lib/summarizer.ts
export class ContentSummarizer {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
  }

  async generateSummary(
    text: string,
    options: {
      maxLength?: number;
      style?: 'concise' | 'detailed' | 'bullet_points';
      language?: string;
    } = {}
  ): Promise<SummaryResult> {
    try {
      const prompt = this.buildSummaryPrompt(text, options);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'あなたは音声コンテンツの要約専門家です。'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.3,
          max_tokens: options.maxLength || 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      const summary = result.choices[0].message.content;

      return {
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / text.length
      };
    } catch (error) {
      console.error('Summary generation error:', error);
      throw error;
    }
  }

  private buildSummaryPrompt(text: string, options: any): string {
    const style = options.style || 'concise';
    const language = options.language || 'ja';
    
    let prompt = `以下の音声コンテンツを要約してください。\n\n`;
    prompt += `言語: ${language}\n`;
    prompt += `スタイル: ${style}\n\n`;
    prompt += `音声内容:\n${text}\n\n`;
    
    switch (style) {
      case 'concise':
        prompt += '簡潔で要点を押さえた要約を作成してください。';
        break;
      case 'detailed':
        prompt += '詳細で包括的な要約を作成してください。';
        break;
      case 'bullet_points':
        prompt += '箇条書きで要点を整理した要約を作成してください。';
        break;
    }

    return prompt;
  }
}

export interface SummaryResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
}
```

### 5. 音声処理パイプライン

#### 統合処理フロー

```typescript
// src/lib/audio-service.ts
export class AudioProcessingService {
  private audioProcessor: AudioProcessor;
  private whisperClient: WhisperClient;
  private summarizer: ContentSummarizer;

  constructor() {
    this.audioProcessor = new AudioProcessor();
    this.whisperClient = new WhisperClient();
    this.summarizer = new ContentSummarizer();
  }

  async processAudio(
    audioBuffer: Buffer,
    options: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    try {
      console.log('Starting audio processing...');

      // 1. 前処理
      let processedBuffer = audioBuffer;
      
      if (options.normalizeVolume) {
        processedBuffer = await this.audioProcessor.normalizeVolume(processedBuffer);
      }
      
      if (options.removeNoise) {
        processedBuffer = await this.audioProcessor.removeNoise(processedBuffer);
      }

      // 2. 自動トリミング
      let trimmedBuffer = processedBuffer;
      let trimInfo = null;
      
      if (options.autoTrim) {
        const trimResult = await this.autoTrim(processedBuffer);
        trimmedBuffer = trimResult.buffer;
        trimInfo = trimResult.info;
      }

      // 3. 文字起こし
      const transcription = await this.whisperClient.transcribeAudio(
        trimmedBuffer,
        {
          language: options.language,
          prompt: options.transcriptionPrompt,
          responseFormat: 'verbose_json'
        }
      );

      // 4. 要約生成
      let summary = null;
      if (options.generateSummary) {
        summary = await this.summarizer.generateSummary(
          transcription.text,
          {
            maxLength: options.summaryMaxLength,
            style: options.summaryStyle,
            language: options.language
          }
        );
      }

      // 5. キーフレーズ抽出
      let keyPhrases = null;
      if (options.extractKeyPhrases) {
        keyPhrases = await this.extractKeyPhrases(transcription.text);
      }

      return {
        success: true,
        originalBuffer: audioBuffer,
        processedBuffer: trimmedBuffer,
        transcription,
        summary,
        keyPhrases,
        trimInfo,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  private async autoTrim(audioBuffer: Buffer): Promise<{
    buffer: Buffer;
    info: TrimInfo;
  }> {
    // 無音検出
    const silences = await this.audioProcessor.detectSilence(audioBuffer);
    
    // 文字起こしでキーフレーズ検出
    const transcription = await this.whisperClient.transcribeAudio(audioBuffer);
    const keyPhrases = await this.extractKeyPhrases(transcription.text);
    
    // 最適なトリミング位置を計算
    const trimPoints = this.calculateTrimPoints(silences, transcription.segments);
    
    // 音声をトリミング
    const trimmedBuffer = await this.audioProcessor.trimAudio(
      audioBuffer,
      trimPoints.start,
      trimPoints.end
    );

    return {
      buffer: trimmedBuffer,
      info: {
        originalDuration: transcription.duration,
        trimmedDuration: trimPoints.end - trimPoints.start,
        trimStart: trimPoints.start,
        trimEnd: trimPoints.end,
        removedSilence: silences.filter(s => 
          s.silenceStart >= trimPoints.start && s.silenceEnd <= trimPoints.end
        )
      }
    };
  }

  private async extractKeyPhrases(text: string): Promise<string[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: '音声コンテンツから重要なキーフレーズを5-10個抽出してください。'
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.3
      })
    });

    const result = await response.json();
    return result.choices[0].message.content.split(',').map(phrase => phrase.trim());
  }
}

export interface AudioProcessingOptions {
  normalizeVolume?: boolean;
  removeNoise?: boolean;
  autoTrim?: boolean;
  generateSummary?: boolean;
  extractKeyPhrases?: boolean;
  language?: string;
  transcriptionPrompt?: string;
  summaryMaxLength?: number;
  summaryStyle?: 'concise' | 'detailed' | 'bullet_points';
}

export interface AudioProcessingResult {
  success: boolean;
  originalBuffer: Buffer;
  processedBuffer: Buffer;
  transcription: TranscriptionResult;
  summary?: SummaryResult;
  keyPhrases?: string[];
  trimInfo?: TrimInfo;
  processingTime: number;
}

export interface TrimInfo {
  originalDuration: number;
  trimmedDuration: number;
  trimStart: number;
  trimEnd: number;
  removedSilence: any[];
}
```

## エラーハンドリング

### よくある問題と対処法

```typescript
// src/lib/audio-error-handler.ts
export class AudioErrorHandler {
  static handleProcessingError(error: any, context: string): AudioProcessingError {
    console.error(`Audio processing error in ${context}:`, error);

    if (error.message.includes('Whisper API')) {
      return {
        type: 'TRANSCRIPTION_ERROR',
        message: '文字起こしに失敗しました',
        details: error.message,
        retryable: true
      };
    }

    if (error.message.includes('FFmpeg')) {
      return {
        type: 'AUDIO_PROCESSING_ERROR',
        message: '音声処理に失敗しました',
        details: error.message,
        retryable: true
      };
    }

    if (error.message.includes('OpenAI API')) {
      return {
        type: 'API_ERROR',
        message: 'API呼び出しに失敗しました',
        details: error.message,
        retryable: true
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: '予期しないエラーが発生しました',
      details: error.message,
      retryable: false
    };
  }
}

export interface AudioProcessingError {
  type: 'TRANSCRIPTION_ERROR' | 'AUDIO_PROCESSING_ERROR' | 'API_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details: string;
  retryable: boolean;
}
```

## パフォーマンス最適化

### 並列処理

```typescript
// 複数の音声ファイルを並列処理
export async function batchProcessAudio(
  audioFiles: Array<{ buffer: Buffer; options: AudioProcessingOptions }>
): Promise<AudioProcessingResult[]> {
  const results = await Promise.allSettled(
    audioFiles.map(async ({ buffer, options }) => {
      const service = new AudioProcessingService();
      return service.processAudio(buffer, options);
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
```

### キャッシュ設定

```typescript
// 文字起こし結果のキャッシュ
export class TranscriptionCache {
  private static cache = new Map<string, TranscriptionResult>();
  private static cacheTimeout = 24 * 60 * 60 * 1000; // 24時間

  static async getCachedTranscription(
    audioHash: string
  ): Promise<TranscriptionResult | null> {
    const cached = this.cache.get(audioHash);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  static setCachedTranscription(
    audioHash: string,
    result: TranscriptionResult
  ): void {
    this.cache.set(audioHash, {
      result,
      timestamp: Date.now()
    });
  }
}
```

## 次のステップ

1. [配信機能](./distribution.md)を確認
2. [RSS Feed](./rss-feed.md)を確認
3. [トラブルシューティング](../troubleshooting/)を参照 