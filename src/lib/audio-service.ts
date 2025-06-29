import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

export interface AudioProcessingOptions {
  removeLeadingSilence?: boolean;
  silenceThreshold?: number;
  targetPhrases?: string[];
  outputFormat?: 'preserve' | 'audio' | 'video';
}

export interface AudioProcessingResult {
  success: boolean;
  title: string;
  inputFile: string;
  timestamp: string;
  outputFiles?: string[];
  output_files?: string[];
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
    outputFiles?: string[];
    output_files?: string[];
  };
  error?: string;
}

export class AudioService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Next.js環境ではPythonパスを調整
    this.pythonPath = process.env.NODE_ENV === 'production' ? 'python3' : 'python3';
    this.scriptPath = path.resolve('./voicy_automation.py');
  }

  async processAudio(
    filePath: string,
    title: string,
    options: AudioProcessingOptions = {}
  ): Promise<AudioProcessingResult> {
    return new Promise((resolve) => {
      console.log(`Starting audio processing: ${title}`);
      
      const args = [this.scriptPath, filePath, title];
      
      // Add options as JSON parameter
      const processingOptions = {
        removeLeadingSilence: options.removeLeadingSilence ?? true,
        silenceThreshold: options.silenceThreshold ?? -50,
        targetPhrases: options.targetPhrases || [],
        outputFormat: options.outputFormat || 'preserve'
      };
      args.push('--options', JSON.stringify(processingOptions));

      console.log(`Audio processing command: ${this.pythonPath} ${args.join(' ')}`);

      const pythonProcess = spawn(this.pythonPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`Audio processing progress: ${data.toString().trim()}`);
      });

      pythonProcess.on('close', async (code) => {
        console.log(`Audio processing completed with code: ${code}`);

        if (code === 0) {
          // Small delay to ensure file system has flushed all writes
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            // Extract JSON from stdout (may contain log messages)
            const lines = stdout.split('\n');
            let jsonString = '';
            
            // Look for the JSON result line
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('{') && trimmed.includes('"success"')) {
                jsonString = trimmed;
                break;
              }
            }
            
            // If not found in stdout, look in stderr (sometimes Python output goes there)
            if (!jsonString) {
              const stderrLines = stderr.split('\n');
              for (const line of stderrLines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') && trimmed.includes('"success"')) {
                  jsonString = trimmed;
                  break;
                }
              }
            }
            
            if (!jsonString) {
              throw new Error('No valid JSON result found in output');
            }
            
            const result: AudioProcessingResult = JSON.parse(jsonString);
            
            // Count actual output files from result (Python uses snake_case)
            let fileCount = 0;
            if (result.summary?.output_files) {
              fileCount = result.summary.output_files.length;
            } else if (result.summary?.outputFiles) {
              fileCount = result.summary.outputFiles.length;
            } else if (result.outputFiles) {
              fileCount = result.outputFiles.length;
            } else if (result.output_files) {
              fileCount = result.output_files.length;
            }
            
            console.log(`Audio processing successful: ${fileCount} files created`);
            resolve(result);
            
          } catch (parseError) {
            console.error(`Failed to parse audio processing result: ${parseError}`);
            console.error(`stdout content: ${stdout}`);
            resolve({
              success: false,
              title,
              inputFile: filePath,
              timestamp: new Date().toISOString(),
              steps: {},
              summary: {
                totalSteps: 0,
                success: false,
                outputFiles: []
              },
              error: `Result parsing failed: ${(parseError as Error).message}`
            });
          }
        } else {
          console.error(`Audio processing failed with code ${code}`);
          console.error(`stderr: ${stderr}`);
          
          resolve({
            success: false,
            title,
            inputFile: filePath,
            timestamp: new Date().toISOString(),
            steps: {},
            summary: {
              totalSteps: 0,
              success: false,
              outputFiles: []
            },
            error: stderr || `Process exited with code ${code}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error(`Audio processing process error: ${error}`);
        resolve({
          success: false,
          title,
          inputFile: filePath,
          timestamp: new Date().toISOString(),
          steps: {},
          summary: {
            totalSteps: 0,
            success: false,
            outputFiles: []
          },
          error: `Process error: ${error.message}`
        });
      });
    });
  }

  async getProcessingCapabilities(): Promise<{
    whisperAvailable: boolean;
    ffmpegAvailable: boolean;
    supportedFormats: string[];
  }> {
    try {
      // Test if required dependencies are available
      const testResult = await new Promise<boolean>((resolve) => {
        const testProcess = spawn(this.pythonPath, ['-c', 'import whisper, ffmpeg, pydub; print("OK")'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        testProcess.on('close', (code) => {
          resolve(code === 0);
        });

        testProcess.on('error', () => {
          resolve(false);
        });
      });

      return {
        whisperAvailable: testResult,
        ffmpegAvailable: testResult,
        supportedFormats: ['mp3', 'wav', 'mp4', 'avi', 'mov', 'flv', 'webm', 'm4a', 'aac', 'ogg']
      };
    } catch (error) {
      console.error('Failed to check audio processing capabilities:', error);
      return {
        whisperAvailable: false,
        ffmpegAvailable: false,
        supportedFormats: []
      };
    }
  }

  async analyzeAudio(filePath: string): Promise<{
    success: boolean;
    duration?: number;
    format?: string;
    sampleRate?: number;
    channels?: number;
    bitrate?: string;
    hasLeadingSilence?: boolean;
    leadingSilenceDuration?: number;
    error?: string;
  }> {
    try {
      // Use ffprobe to get audio information
      return new Promise((resolve) => {
        const ffprobeProcess = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          filePath
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        ffprobeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        ffprobeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffprobeProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const info = JSON.parse(stdout);
              const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');
              
              resolve({
                success: true,
                duration: parseFloat(info.format?.duration || '0'),
                format: info.format?.format_name,
                sampleRate: parseInt(audioStream?.sample_rate || '0'),
                channels: audioStream?.channels || 0,
                bitrate: info.format?.bit_rate,
                hasLeadingSilence: undefined, // Would need additional analysis
                leadingSilenceDuration: undefined
              });
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse audio info: ${(parseError as Error).message}`
              });
            }
          } else {
            resolve({
              success: false,
              error: stderr || `ffprobe failed with code ${code}`
            });
          }
        });

        ffprobeProcess.on('error', (error) => {
          resolve({
            success: false,
            error: `ffprobe error: ${error.message}`
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `Audio analysis failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // シンプルなトリミング機能（ffmpegを使用）
  async trimAudio(
    inputPath: string,
    outputPath: string,
    startTime: number = 0,
    endTime?: number
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = ['-i', inputPath];
      
      if (endTime) {
        args.push('-ss', startTime.toString(), '-to', endTime.toString());
      } else {
        args.push('-ss', startTime.toString());
      }
      
      args.push('-c', 'copy', outputPath);

      const ffmpegProcess = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || `ffmpeg failed with code ${code}`
          });
        }
      });

      ffmpegProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `ffmpeg error: ${error.message}`
        });
      });
    });
  }
}

export const audioService = new AudioService(); 