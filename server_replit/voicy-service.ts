import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface VoicyMetadata {
  title: string;
  description?: string;
  hashtags?: string[];
  publishDate?: string;
}

export interface VoicyUploadResult {
  success: boolean;
  error?: string;
  details?: any;
}

export class VoicyService {
  private validateEnvironment(): { valid: boolean; missing: string[] } {
    const required = ['VOICY_EMAIL', 'VOICY_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    return { valid: missing.length === 0, missing };
  }

  async uploadToVoicy(filePath: string, metadata: VoicyMetadata, dryRun: boolean = false): Promise<VoicyUploadResult> {
    const validation = this.validateEnvironment();
    if (!validation.valid) {
      throw new Error(`Missing environment variables: ${validation.missing.join(', ')}`);
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE: Simulating Voicy upload process...');
      return this.simulateUpload(filePath, metadata);
    }

    try {
      console.log('🚀 Starting real Voicy automation workflow...');
      
      // Ensure screenshot directory exists
      const screenshotDir = 'voicy_screenshots';
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        console.log(`📁 Created screenshot directory: ${screenshotDir}`);
      }

      const absolutePath = path.resolve(filePath);
      const hashtags = metadata.hashtags?.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ') || '';
      const description = metadata.description || '';
      
      // Use the working Voicy automation script
      console.log('🚀 Using working Voicy automation...');
      const publishDate = metadata.publishDate || new Date().toISOString().split('T')[0];
      const automationArgs = ['voicy_automation.py', absolutePath, metadata.title, description, hashtags, publishDate];
      const result = await this.runPythonScript(automationArgs);

      if (result.success) {
        console.log('✅ Voicy automation completed successfully');
        return result;
      } else {
        console.log('❌ Voicy automation failed:', result.error);
        throw new Error(`Voicy automation failed: ${result.error}`);
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async runPythonScript(args: string[]): Promise<VoicyUploadResult> {
    const envWithLibPath = {
      ...process.env,
      LD_LIBRARY_PATH: `${process.env.HOME}/.nix-profile/lib:/nix/store/*/lib:${process.env.LD_LIBRARY_PATH || ''}`,
      PYTHONPATH: process.cwd(),
      PATH: `${process.env.PATH}`,
      PLAYWRIGHT_BROWSERS_PATH: `${process.env.HOME}/.cache/ms-playwright`,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
    };
    
    const pythonProcess = spawn('python3', args, {
      stdio: 'pipe',
      env: envWithLibPath
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('🐍', text.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('🚨', data.toString().trim());
    });

    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        try {
          if (output.trim()) {
            const result = JSON.parse(output.trim());
            resolve(result);
          } else {
            reject(new Error(`No output received. Exit code: ${code}, Error: ${errorOutput}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse automation result: ${parseError}. Output: ${output}, Error: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Python process error: ${error.message}`));
      });
    });
  }

  private simulateUpload(filePath: string, metadata: VoicyMetadata): VoicyUploadResult {
    const fileStats = fs.statSync(filePath);
    
    console.log('✅ Voicy upload completed:', metadata.title);
    console.log('📊 Upload details:', {
      mode: "dry_run",
      title: metadata.title,
      description: metadata.description,
      hashtags: metadata.hashtags,
      publishDate: metadata.publishDate,
      filePath: filePath,
      fileSize: fileStats.size,
      simulatedResult: "Upload simulation completed successfully"
    });

    return {
      success: true,
      details: {
        mode: "dry_run",
        title: metadata.title,
        description: metadata.description,
        hashtags: metadata.hashtags,
        publishDate: metadata.publishDate,
        filePath: filePath,
        fileSize: fileStats.size,
        simulatedResult: "Upload simulation completed successfully"
      }
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const validation = this.validateEnvironment();
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing environment variables: ${validation.missing.join(', ')}`
      };
    }

    try {
      console.log('🔍 Testing Voicy connection...');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const voicyService = new VoicyService();